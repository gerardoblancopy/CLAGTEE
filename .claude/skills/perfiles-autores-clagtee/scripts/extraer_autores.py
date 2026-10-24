#!/usr/bin/env python3
"""Arma la lista de autores de CLAGTEE 2026 y la divide en lotes para buscar
sus perfiles académicos (Google Scholar).

Pasos:
  1. Lee el programa publicado (data/programa2026.json): cada paper con su
     sesión, día, hora, sala, track y autores (y quién presenta).
  2. Si se pasa el export del CMS (--papers), agrega a cada paper el abstract
     (en inglés para IEEE y el original) y a cada autor su afiliación y país.
     El email solo se usa para deducir el país: no se escribe en la salida.
  3. Une a cada persona con todos sus papers, sus coautores, las sesiones que
     modera (chair) y los paneles donde participa.
  4. Agrupa a los autores por componentes de coautoría (un mismo grupo suele
     ser un mismo laboratorio) y los reparte en lotes de tamaño parecido.

Salida en scratch/perfiles-autores/: autores.json, lotes/lote-NN.json y
reporte-autores.md (papers sin abstract, nombres que podrían ser la misma
persona).

Uso (desde la raíz del repo):
  python3 .claude/skills/perfiles-autores-clagtee/scripts/extraer_autores.py \\
      --papers ~/Downloads/clagtee2026_papers_todos-completo_20261024_1200.xlsx
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = SKILL_DIR.parents[2]
sys.path.insert(0, str(REPO_ROOT / ".claude" / "skills" / "libro-actas-clagtee" / "scripts"))

from generar_libro import (  # noqa: E402
    PARTICULAS,
    autores_de,
    campo,
    clave_norm,
    espacios,
    leer_papers,
    limpiar_resumen,
    limpiar_titulo,
    pais_de,
)

DEFAULT_PROGRAMA = REPO_ROOT / "data" / "programa2026.json"
DEFAULT_OUT = REPO_ROOT / "scratch" / "perfiles-autores"
TITULOS_PERSONA = re.compile(r"^(dr|dra|prof|profa|ing)\.?\s+", re.I)


def slug(nombre: str) -> str:
    return clave_norm(nombre).replace(" ", "-")


def persona(nombre: str) -> str:
    return espacios(TITULOS_PERSONA.sub("", espacios(nombre)))


def leer_programa(ruta: Path) -> tuple[list[dict], dict, dict, dict]:
    prog = json.loads(ruta.read_text(encoding="utf-8"))
    tracks = {t["numero"]: t["titulo"] for t in prog.get("tracks", [])}
    papers, chairs = [], defaultdict(list)
    for s in prog["sesiones"].values():
        if s.get("chair"):
            chairs[clave_norm(persona(s["chair"]))].append(s["id"])
        for p in s["papers"]:
            if not p.get("codigo"):
                continue
            papers.append({
                "codigo": p["codigo"],
                "titulo": limpiar_titulo(p["titulo"]),
                "idioma": p.get("idioma", ""),
                "track": p.get("track"),
                "track_titulo": tracks.get(p.get("track"), ""),
                "sesion": s["id"],
                "dia": s["dia"],
                "inicio": p.get("inicio", ""),
                "fin": p.get("fin", ""),
                "sala": s.get("sala_nombre", ""),
                "autores": [{"nombre": persona(a["nombre"]), "presenta": bool(a.get("presenta"))} for a in p["autores"]],
                "presentadores_extra": [persona(n) for n in p.get("presentadores_extra", [])],
            })
    paneles = defaultdict(list)
    for e in prog.get("plenarias", []):
        for n in e.get("personas", []):
            paneles[clave_norm(persona(n))].append({"evento": e["nombre"], "titulo": e.get("titulo", ""), "dia": e.get("dia", ""),
                                                    "inicio": e.get("inicio", ""), "fin": e.get("fin", ""),
                                                    "lugar": e.get("lugar", "")})
    return papers, dict(chairs), dict(paneles), tracks


def agregar_cms(papers: list[dict], ruta: Path) -> tuple[dict, list[str]]:
    """Abstracts por código de paper y afiliación/país por autor (clave normalizada)."""
    filas = leer_papers(ruta)
    por_id = {}
    for f in filas:
        pid = espacios(campo(f, "id"))
        if pid:
            por_id[pid] = f
    afiliaciones, avisos = {}, []
    for p in papers:
        f = por_id.get(p["codigo"])
        if not f:
            avisos.append(f"{p['codigo']}: no está en el export del CMS.")
            continue
        p["titulo_en"] = limpiar_titulo(campo(f, "titulo_en") or "") or None
        p["abstract_en"] = " ".join(limpiar_resumen(campo(f, "resumen_en") or "")) or None
        p["abstract"] = " ".join(limpiar_resumen(campo(f, "resumen") or "")) or None
        for a in autores_de(f):
            k = clave_norm(persona(a["nombre"]))
            afil = espacios(a.get("afiliacion", ""))
            if k and (afil or a.get("email")) and k not in afiliaciones:
                afiliaciones[k] = {"afiliacion": afil, "pais": pais_de(a.get("email", ""), afil)}
    return afiliaciones, avisos


def construir_autores(papers: list[dict], chairs: dict, paneles: dict, afiliaciones: dict) -> dict:
    autores: dict[str, dict] = {}

    def ficha(nombre: str) -> dict:
        k = clave_norm(nombre)
        if k not in autores:
            autores[k] = {"id": slug(nombre), "nombre": nombre, "variantes": [], "papers": [], "coautores": set()}
        elif nombre != autores[k]["nombre"] and nombre not in autores[k]["variantes"]:
            autores[k]["variantes"].append(nombre)
        return autores[k]

    for p in papers:
        nombres = [a["nombre"] for a in p["autores"]]
        for a in p["autores"]:
            f = ficha(a["nombre"])
            f["papers"].append({"codigo": p["codigo"], "presenta": a["presenta"]})
            f["coautores"].update(n for n in nombres if clave_norm(n) != clave_norm(a["nombre"]))
        for n in p["presentadores_extra"]:
            f = ficha(n)
            f["papers"].append({"codigo": p["codigo"], "presenta": True, "no_figura_como_autor": True})
            f["coautores"].update(nombres)

    for k, f in autores.items():
        unicos = {}
        for n in sorted(f["coautores"]):
            unicos.setdefault(clave_norm(n), autores.get(clave_norm(n), {}).get("nombre", n))
        f["coautores"] = sorted(unicos.values())
        f["chair"] = chairs.get(k, [])
        f["paneles"] = paneles.get(k, [])
        f.update(afiliaciones.get(k, {}))
    return autores


def posibles_duplicados(autores: dict) -> list[tuple[str, str]]:
    """Nombres distintos que nunca firman juntos y donde uno está contenido en
    el otro, aceptando iniciales ('Juan A. Tapia' / 'Juan Tapia', 'Leonardo H.
    Macedo' / 'Leonardo Henrique Faria Macedo Possagnolo')."""
    def partes(nombre: str) -> list[str]:
        return [p for p in clave_norm(nombre).split() if p not in PARTICULAS]

    def contenido(chico: list[str], grande: list[str]) -> bool:
        return all(t in grande or (len(t) == 1 and any(g.startswith(t) for g in grande)) for t in chico)

    fichas = sorted(autores.values(), key=lambda f: f["nombre"])
    pares = []
    for i, a in enumerate(fichas):
        pa = partes(a["nombre"])
        for b in fichas[i + 1:]:
            pb = partes(b["nombre"])
            if not pa or not pb or pa[0][0] != pb[0][0]:
                continue
            chico, grande = sorted((pa, pb), key=len)
            juntos = {p["codigo"] for p in a["papers"]} & {p["codigo"] for p in b["papers"]}
            if len(chico) >= 2 and contenido(chico, grande) and not juntos:
                pares.append((a["nombre"], b["nombre"]))
    return pares


def lotes_por_coautoria(autores: dict, tamano: int) -> list[list[str]]:
    """Componentes conexas del grafo de coautoría, repartidas en lotes."""
    padre = {k: k for k in autores}

    def raiz(k):
        while padre[k] != k:
            padre[k] = padre[padre[k]]
            k = padre[k]
        return k

    for k, f in autores.items():
        for c in f["coautores"]:
            kc = clave_norm(c)
            if kc in padre:
                padre[raiz(kc)] = raiz(k)
    grupos = defaultdict(list)
    for k in autores:
        grupos[raiz(k)].append(k)
    n_lotes = max(1, round(len(autores) / tamano))
    lotes = [[] for _ in range(n_lotes)]
    # Los grupos grandes primero, cada uno al lote más liviano.
    for g in sorted(grupos.values(), key=len, reverse=True):
        min(lotes, key=len).extend(sorted(g, key=lambda k: autores[k]["nombre"]))
    return [l for l in lotes if l]


def escribir_reporte(salida: Path, papers: list[dict], autores: dict, duplicados, avisos, con_cms: bool) -> Path:
    lin = ["# Autores CLAGTEE 2026", "",
           f"- Papers en el programa: {len(papers)}",
           f"- Personas (autores y presentadores): {len(autores)}",
           f"- Presentan: {sum(1 for f in autores.values() if any(p['presenta'] for p in f['papers']))}", ""]
    if not con_cms:
        lin += ["**Sin export del CMS:** los perfiles se arman con títulos y Google Scholar, sin abstracts ni "
                "afiliaciones. Exportar desde el CMS (Exportar a Excel, todos los papers) y volver a correr con "
                "`--papers`.", ""]
    else:
        sin = [p["codigo"] for p in papers if not (p.get("abstract_en") or p.get("abstract"))]
        lin += [f"- Papers sin abstract en el export: {len(sin)}" + (f" ({', '.join(sin)})" if sin else ""), ""]
    if duplicados:
        lin += ["## Nombres que podrían ser la misma persona", "",
                "Revisar y, si corresponde, unir en `[alias]` de `config/perfiles.toml`.", ""]
        lin += [f"- {a} / {b}" for a, b in duplicados] + [""]
    if avisos:
        lin += ["## Avisos", ""] + [f"- {a}" for a in avisos] + [""]
    ruta = salida / "reporte-autores.md"
    ruta.write_text("\n".join(lin), encoding="utf-8")
    return ruta


def aplicar_alias(papers: list[dict], alias: dict) -> None:
    """Reemplaza variantes de nombre por el nombre canónico antes de agrupar."""
    canon = {clave_norm(k): v for k, v in alias.items()}
    for p in papers:
        for a in p["autores"]:
            a["nombre"] = canon.get(clave_norm(a["nombre"]), a["nombre"])
        p["presentadores_extra"] = [canon.get(clave_norm(n), n) for n in p["presentadores_extra"]]


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--programa", default=str(DEFAULT_PROGRAMA), help="Programa publicado (data/programa2026.json)")
    ap.add_argument("--papers", default="", help="Export del CMS (.xlsx), JSON de /api/papers o CSV, para abstracts y afiliaciones")
    ap.add_argument("--config", default=str(SKILL_DIR / "config" / "perfiles.toml"), help="Alias de nombres")
    ap.add_argument("--salida", default=str(DEFAULT_OUT), help="Carpeta de salida")
    ap.add_argument("--tamano-lote", type=int, default=27, help="Autores por lote de búsqueda")
    args = ap.parse_args()

    import tomllib
    cfg_path = Path(args.config)
    cfg = tomllib.loads(cfg_path.read_text(encoding="utf-8")) if cfg_path.exists() else {}

    salida = Path(args.salida).resolve()
    (salida / "lotes").mkdir(parents=True, exist_ok=True)
    papers, chairs, paneles, tracks = leer_programa(Path(args.programa))
    aplicar_alias(papers, cfg.get("alias", {}))
    afiliaciones, avisos = ({}, [])
    if args.papers:
        afiliaciones, avisos = agregar_cms(papers, Path(args.papers).expanduser())
    autores = construir_autores(papers, chairs, paneles, afiliaciones)
    duplicados = posibles_duplicados(autores)

    por_codigo = {p["codigo"]: p for p in papers}
    datos = {"fuente_programa": str(Path(args.programa).resolve().relative_to(REPO_ROOT)),
             "con_cms": bool(args.papers), "tracks": tracks,
             "papers": por_codigo, "autores": sorted(autores.values(), key=lambda f: f["id"])}
    (salida / "autores.json").write_text(json.dumps(datos, ensure_ascii=False, indent=1), encoding="utf-8")

    for i, lote in enumerate(lotes_por_coautoria(autores, args.tamano_lote), 1):
        contenido = []
        for k in lote:
            f = autores[k]
            contenido.append({
                "id": f["id"], "nombre": f["nombre"], "variantes": f["variantes"],
                "afiliacion": f.get("afiliacion", ""), "pais": f.get("pais", ""),
                "coautores": f["coautores"], "chair": f["chair"], "paneles": [p["evento"] for p in f["paneles"]],
                "papers": [{
                    "codigo": r["codigo"], "presenta": r["presenta"],
                    "titulo": por_codigo[r["codigo"]]["titulo"],
                    "titulo_en": por_codigo[r["codigo"]].get("titulo_en"),
                    "track": por_codigo[r["codigo"]]["track_titulo"],
                    "abstract": por_codigo[r["codigo"]].get("abstract_en") or por_codigo[r["codigo"]].get("abstract"),
                } for r in f["papers"]],
            })
        (salida / "lotes" / f"lote-{i:02d}.json").write_text(json.dumps(contenido, ensure_ascii=False, indent=1), encoding="utf-8")
        print(f"lote-{i:02d}: {len(contenido)} autores")

    reporte = escribir_reporte(salida, papers, autores, duplicados, avisos, bool(args.papers))
    print(f"{len(autores)} personas, {len(papers)} papers. Reporte: {reporte}")


if __name__ == "__main__":
    main()
