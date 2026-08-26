#!/usr/bin/env bash
# Descarga todos los papers sometidos a una carpeta local.
#
# Usa curl en vez del SDK de Node: en algunas máquinas el cliente de
# Firestore/GCS de Node queda colgado, mientras que curl responde normal.
# La metadata sale de la API pública y cada PDF de una URL firmada.
#
# Uso:  ./scripts/download-papers.sh [carpeta-destino]
# Por defecto: ~/Desktop/papers-clagtee2026

set -euo pipefail

BASE_URL="${BASE_URL:-https://clagtee2026.org}"
OUT_DIR="${1:-$HOME/Desktop/papers-clagtee2026}"

mkdir -p "$OUT_DIR"
echo "Destino: $OUT_DIR"
echo "Obteniendo listado de papers..."

# id<TAB>fileKey<TAB>fileName  (solo papers con archivo)
META=$(curl -sS "$BASE_URL/api/papers" | python3 -c '
import json, sys
data = json.load(sys.stdin)
for p in data["papers"]:
    if p.get("fileKey"):
        name = (p.get("fileName") or (p["id"] + ".pdf")).replace("/", "-").replace("\t", " ").strip()
        print("\t".join([p["id"], p["fileKey"], name]))
')

TOTAL=$(printf '%s\n' "$META" | grep -c . || true)
echo "Papers con archivo: $TOTAL"
echo

ok=0
fail=0
i=0

while IFS=$'\t' read -r id fileKey fileName; do
  [ -z "$id" ] && continue
  i=$((i + 1))
  dest="$OUT_DIR/${id}__${fileName}"

  if [ -s "$dest" ]; then
    echo "[$i/$TOTAL] (ya existe) ${id}__${fileName}"
    ok=$((ok + 1))
    continue
  fi

  enc=$(python3 -c 'import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=""))' "$fileKey")
  url=$(curl -sS "$BASE_URL/api/gcs-sign?object=$enc" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("url",""))')

  if [ -z "$url" ]; then
    echo "[$i/$TOTAL] ERROR firma: $id"
    fail=$((fail + 1))
    continue
  fi

  if curl -sS -f -o "$dest" "$url"; then
    echo "[$i/$TOTAL] ${id}__${fileName}"
    ok=$((ok + 1))
  else
    echo "[$i/$TOTAL] ERROR descarga: $id"
    rm -f "$dest"
    fail=$((fail + 1))
  fi
done <<< "$META"

echo
echo "Descargados: $ok / $TOTAL"
[ "$fail" -gt 0 ] && echo "Fallidos: $fail"
echo "Carpeta: $OUT_DIR"
