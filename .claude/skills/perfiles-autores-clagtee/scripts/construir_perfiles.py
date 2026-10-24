#!/usr/bin/env python3
"""Une los datos del programa con el análisis de perfiles académicos y escribe
el perfil de intereses de cada autor de CLAGTEE 2026.

Entradas:
  - scratch/perfiles-autores/autores.json (de extraer_autores.py): papers,
    sesiones, coautores, chairs, paneles y, con el export del CMS, abstracts,
    afiliación y país.
  - datos/scholar/lote-*.json: perfil de Google Scholar (verificado, con su
    confianza) y análisis de intereses de cada autor (ver
    instrucciones-busqueda.md).

Salida en datos/:
  - perfiles-autores.json: un perfil por persona, listo para que una IA
    proponga un programa personalizado. Incluye los compromisos fijos de cada
    uno en el congreso (cuándo presenta, modera o participa en un panel) para
    no proponerle sesiones que choquen.
  - perfiles-autores.md: los mismos perfiles en texto, para revisarlos.
  - reporte-perfiles.md: cobertura (Scholar por confianza, sin perfil,
    ambiguos), autores sin análisis y casos a revisar a mano.

Uso (desde la raíz del repo):
  python3 .claude/skills/perfiles-autores-clagtee/scripts/construir_perfiles.py
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import Counter
from datetime import date
from pathlib import Path

SKILL_DIR = Path(__file__).resolve().parents[1]
REPO_ROOT = SKILL_DIR.parents[2]
DATOS = SKILL_DIR / "datos"
DEFAULT_AUTORES = REPO_ROOT / "scratch" / "perfiles-autores" / "autores.json"

CONFIANZA_USABLE = {"alta", "media"}
ETAPAS = {"estudiante", "investigador_inicial", "investigador_consolidado", "investigador_senior", "industria", "desconocida"}
DIAS = {"Wednesday, October 28": "2026-10-28", "Thursday, October 29": "2026-10-29", "Friday, October 30": "2026-10-30"}


def leer_analisis(carpeta: Path) -> tuple[dict, list[str]]:
    analisis, avisos = {}, []
    for ruta in sorted(carpeta.glob("lote-*.json")):
        try:
            datos = json.loads(ruta.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            avisos.append(f"{ruta.name}: JSON inválido ({e}).")
            continue
        for a in datos:
            if a.get("id") in analisis:
                avisos.append(f"{a['id']}: aparece en más de un lote; se usa {ruta.name}.")
            analisis[a.get("id")] = a
    return analisis, avisos


def hora(h: str) -> str:
    return h if len(h) == 5 else f"0{h}"


def compromisos(autor: dict, papers: dict, sesiones: dict) -> list[dict]:
    """Bloques en que la persona ya está ocupada: presenta, modera o es panelista."""
    out = []
    for r in autor["papers"]:
        if r["presenta"]:
            p = papers[r["codigo"]]
            out.append({"fecha": DIAS.get(p["dia"], p["dia"]), "inicio": hora(p["inicio"]), "fin": hora(p["fin"]),
                        "sesion": p["sesion"], "sala": p["sala"], "motivo": f"presenta {r['codigo']}"})
    for sid in autor["chair"]:
        s = sesiones.get(sid)
        if s:
            out.append({"fecha": DIAS.get(s["dia"], s["dia"]), "inicio": hora(s["inicio"]), "fin": hora(s["fin"]),
                        "sesion": sid, "sala": s.get("sala_nombre", ""), "motivo": f"chair de {sid}"})
    for e in autor["paneles"]:
        out.append({"fecha": DIAS.get(e["dia"], e["dia"]), "inicio": hora(e.get("inicio", "")), "fin": hora(e.get("fin", "")),
                    "sesion": "", "sala": e.get("lugar", ""), "motivo": e["evento"]})
    return sorted(out, key=lambda c: (c["fecha"], c["inicio"]))


def normalizar_intereses(intereses: dict | None, tracks_propios: set[int], avisos: list[str], aid: str) -> dict | None:
    if not intereses:
        return None
    afin = {}
    for k, v in (intereses.get("afinidad_tracks") or {}).items():
        try:
            n, x = int(k), round(float(v), 1)
        except (TypeError, ValueError):
            avisos.append(f"{aid}: afinidad_tracks con valor inválido ({k}: {v}).")
            continue
        if 1 <= n <= 13 and x >= 0.2:
            afin[str(n)] = min(x, 1.0)
    for t in tracks_propios:
        if t and str(t) not in afin:
            afin[str(t)] = 0.8
            avisos.append(f"{aid}: el track {t} de su paper no estaba en afinidad_tracks; se agregó con 0.8.")
    etapa = intereses.get("etapa") or "desconocida"
    if etapa not in ETAPAS:
        avisos.append(f"{aid}: etapa desconocida '{etapa}'.")
        etapa = "desconocida"
    return {
        "temas": intereses.get("temas") or [],
        "palabras_clave": intereses.get("palabras_clave") or [],
        "metodos": intereses.get("metodos") or [],
        "aplicaciones": intereses.get("aplicaciones") or [],
        "afinidad_tracks": dict(sorted(afin.items(), key=lambda kv: -kv[1])),
        "etapa": etapa,
        "resumen": intereses.get("resumen") or "",
        "base": intereses.get("base") or [],
    }


def construir(datos: dict, analisis: dict, sesiones: dict) -> tuple[list[dict], list[str]]:
    papers, perfiles, avisos = datos["papers"], [], []
    for autor in datos["autores"]:
        a = analisis.get(autor["id"], {})
        scholar = a.get("scholar")
        if scholar and scholar.get("confianza") not in {"alta", "media", "baja"}:
            avisos.append(f"{autor['id']}: confianza de Scholar inválida ({scholar.get('confianza')}).")
        tracks_propios = {papers[r["codigo"]]["track"] for r in autor["papers"]}
        usable = scholar if scholar and scholar.get("confianza") in CONFIANZA_USABLE else {}
        perfiles.append({
            "id": autor["id"],
            "nombre": autor["nombre"],
            "variantes": autor["variantes"],
            "afiliacion": autor.get("afiliacion") or a.get("afiliacion_inferida") or usable.get("afiliacion", ""),
            "pais": autor.get("pais") or a.get("pais_inferido", ""),
            "rol": {
                "presenta": [r["codigo"] for r in autor["papers"] if r["presenta"]],
                "autor_de": [r["codigo"] for r in autor["papers"] if not r.get("no_figura_como_autor")],
                "chair": autor["chair"],
                "paneles": [e["evento"] for e in autor["paneles"]],
            },
            "papers": [{
                "codigo": r["codigo"],
                "titulo": papers[r["codigo"]]["titulo"],
                "titulo_en": papers[r["codigo"]].get("titulo_en"),
                "idioma": papers[r["codigo"]]["idioma"],
                "track": papers[r["codigo"]]["track"],
                "track_titulo": papers[r["codigo"]]["track_titulo"],
                "sesion": papers[r["codigo"]]["sesion"],
                "presenta": r["presenta"],
                "abstract": papers[r["codigo"]].get("abstract_en") or papers[r["codigo"]].get("abstract"),
            } for r in autor["papers"]],
            "idiomas_papers": sorted({papers[r["codigo"]]["idioma"] for r in autor["papers"]} - {""}),
            "coautores": autor["coautores"],
            "compromisos": compromisos(autor, papers, sesiones),
            "scholar": scholar,
            "busqueda_scholar": a.get("busqueda", "pendiente"),
            "otras_fuentes": a.get("otras_fuentes") or [],
            "intereses": normalizar_intereses(a.get("intereses"), tracks_propios, avisos, autor["id"]),
        })
    return perfiles, avisos


def escribir_md(perfiles: list[dict], tracks: dict, ruta: Path) -> None:
    lin = ["# Perfiles de intereses · autores CLAGTEE 2026", "",
           f"{len(perfiles)} personas. Generado el {date.today().isoformat()} con "
           "`construir_perfiles.py`; los datos completos están en `perfiles-autores.json`.", ""]
    for p in sorted(perfiles, key=lambda p: p["nombre"]):
        s, i = p["scholar"], p["intereses"] or {}
        lin.append(f"## {p['nombre']}")
        lin.append("")
        datos = [x for x in (p["afiliacion"], p["pais"]) if x]
        if datos:
            lin.append(f"*{' · '.join(datos)}*")
            lin.append("")
        if s:
            met = ", ".join(x for x in (f"{s['citas']} citas" if s.get("citas") is not None else "",
                                        f"h={s['h_index']}" if s.get("h_index") is not None else "") if x)
            lin.append(f"- **Scholar** ({s.get('confianza')}): [{s.get('nombre_perfil') or p['nombre']}]({s.get('url')})"
                       + (f" · {met}" if met else "")
                       + (f" · {', '.join(s.get('intereses_scholar') or [])}" if s.get("intereses_scholar") else ""))
        else:
            lin.append(f"- **Scholar**: {p['busqueda_scholar'].replace('_', ' ')}")
        if i.get("resumen"):
            lin.append(f"- **Perfil**: {i['resumen']}")
        if i.get("temas"):
            lin.append(f"- **Temas**: {'; '.join(i['temas'])}")
        if i.get("palabras_clave"):
            lin.append(f"- **Palabras clave**: {', '.join(i['palabras_clave'])}")
        if i.get("afinidad_tracks"):
            lin.append("- **Tracks**: " + ", ".join(f"{tracks.get(k, k)} ({v})" for k, v in i["afinidad_tracks"].items()))
        if i.get("etapa"):
            lin.append(f"- **Etapa**: {i['etapa'].replace('_', ' ')}")
        lin.append("- **En CLAGTEE**: " + "; ".join(
            f"{x['codigo']} {x['titulo']}" + (" (presenta)" if x["presenta"] else "") for x in p["papers"]))
        if p["compromisos"]:
            lin.append("- **Compromisos**: " + "; ".join(
                f"{c['fecha'][5:]} {c['inicio']}-{c['fin']} {c['motivo']}" for c in p["compromisos"]))
        lin.append("")
    ruta.write_text("\n".join(lin), encoding="utf-8")


def escribir_reporte(perfiles: list[dict], avisos: list[str], con_cms: bool, ruta: Path) -> None:
    busq = Counter(p["busqueda_scholar"] for p in perfiles)
    conf = Counter((p["scholar"] or {}).get("confianza") for p in perfiles if p["scholar"])
    sin_int = [p["nombre"] for p in perfiles if not p["intereses"]]
    con_abs = sum(1 for p in perfiles if any(x["abstract"] for x in p["papers"]))
    lin = ["# Reporte de perfiles de autores", "",
           f"- Personas: {len(perfiles)}",
           f"- Scholar encontrado: {busq.get('encontrado', 0)} (alta {conf.get('alta', 0)}, media {conf.get('media', 0)}, "
           f"baja {conf.get('baja', 0)})",
           f"- Sin perfil Scholar: {busq.get('sin_perfil', 0)} · ambiguos: {busq.get('ambiguo', 0)} · "
           f"pendientes: {busq.get('pendiente', 0)}",
           f"- Con abstract de algún paper: {con_abs}",
           f"- Sin análisis de intereses: {len(sin_int)}", ""]
    if not con_cms:
        lin += ["**Sin abstracts:** el análisis usó títulos y Google Scholar. Para sumar los abstracts, exportar el "
                "Excel del CMS y volver a correr `extraer_autores.py --papers ...` y el análisis de los lotes.", ""]
    revisar = [p for p in perfiles if p["busqueda_scholar"] == "ambiguo" or (p["scholar"] or {}).get("confianza") == "baja"]
    if revisar:
        lin += ["## Revisar a mano (ambiguos o confianza baja)", ""]
        for p in revisar:
            s = p["scholar"] or {}
            lin.append(f"- **{p['nombre']}** ({p['busqueda_scholar']}"
                       + (f", {s.get('confianza')}" if s else "") + f"): {s.get('evidencia', '')}"
                       + (f" [{s.get('url')}]({s.get('url')})" if s.get("url") else ""))
        lin.append("")
    if sin_int:
        lin += ["## Sin análisis de intereses", ""] + [f"- {n}" for n in sin_int] + [""]
    if avisos:
        lin += ["## Avisos", ""] + [f"- {a}" for a in avisos] + [""]
    ruta.write_text("\n".join(lin), encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--autores", default=str(DEFAULT_AUTORES), help="autores.json de extraer_autores.py")
    ap.add_argument("--analisis", default=str(DATOS / "scholar"), help="Carpeta con los lote-*.json analizados")
    ap.add_argument("--salida", default=str(DATOS), help="Carpeta de salida")
    args = ap.parse_args()

    ruta_autores = Path(args.autores)
    if not ruta_autores.exists():
        sys.exit(f"No existe {ruta_autores}: correr primero extraer_autores.py.")
    datos = json.loads(ruta_autores.read_text(encoding="utf-8"))
    programa = json.loads((REPO_ROOT / datos["fuente_programa"]).read_text(encoding="utf-8"))
    analisis, avisos = leer_analisis(Path(args.analisis))
    perfiles, avisos_p = construir(datos, analisis, programa["sesiones"])
    avisos += avisos_p

    salida = Path(args.salida)
    salida.mkdir(parents=True, exist_ok=True)
    tracks = {str(k): v for k, v in datos["tracks"].items()}
    resultado = {
        "congreso": "CLAGTEE 2026",
        "generado": date.today().isoformat(),
        "fuentes": {"programa": datos["fuente_programa"], "abstracts_cms": datos["con_cms"], "google_scholar": True},
        "tracks": tracks,
        "perfiles": perfiles,
    }
    (salida / "perfiles-autores.json").write_text(json.dumps(resultado, ensure_ascii=False, indent=1), encoding="utf-8")
    escribir_md(perfiles, tracks, salida / "perfiles-autores.md")
    escribir_reporte(perfiles, avisos, datos["con_cms"], salida / "reporte-perfiles.md")
    print(f"{len(perfiles)} perfiles; {len(analisis)} con análisis; {len(avisos)} avisos.")
    print(f"Salida: {salida / 'perfiles-autores.json'}")


if __name__ == "__main__":
    main()
