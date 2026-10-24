#!/usr/bin/env python3
"""Genera el Libro del Programa (Conference Program) de CLAGTEE con la misma
identidad gráfica del Libro de Resúmenes.

Pasos:
  1. Lee la planilla del programa (CLAGTEE2026_Programa_vN.xlsx): las hojas por
     día (una tabla por sala con eventos, sesiones, chair, papers y
     presentador) y "Ponencias (interno)" para los autores de cada paper.
  2. Arma los días, bloques, sesiones, plenarias, tracks y el índice de autores
     (con las sesiones de cada uno; en negrita, donde presenta).
  3. Escribe programa.json y reporte-programa.md (diferencias entre salas,
     presentaciones por confirmar, presentadores que no figuran como autores).
  4. Compila plantilla/programa.typ con Typst.

Uso típico (desde la raíz del repo):
  python3 .claude/skills/libro-actas-clagtee/scripts/generar_programa.py \\
      --programa ~/Downloads/CLAGTEE2026_Programa_v7.xlsx --pliegos
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import tomllib
from collections import Counter, defaultdict
from pathlib import Path

from generar_libro import (
    DEFAULT_CONFIG,
    FONTS_DIR,
    FONTS_LOCAL,
    REPO_ROOT,
    SKILL_DIR,
    clave_norm,
    compilar,
    detectar_idioma,
    entrada_indice,
    espacios,
    pliegos,
    sin_tildes,
    vistas_previas,
)

TEMPLATE = SKILL_DIR / "plantilla" / "programa.typ"
DEFAULT_OUT = REPO_ROOT / "scratch" / "libro-actas" / "programa"

HORA = re.compile(r"^(\d{1,2}:\d{2})(?:\s*(?:to|-|–)\s*(\d{1,2}:\d{2}))?$")
CODIGO = re.compile(r"^[A-Z]{2,4}-\d+$")
DIA = re.compile(r"^(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY),\s*(.+)$", re.I)
# KEYNOTE LECTURE [ "Título" – Speaker: Dr. X ] – ROOM D (PRINCIPAL ROOM)
EVENTO = re.compile(
    r"^(?P<nombre>.*?)\s*\[\s*[\"“](?P<titulo>.*?)[\"”]\s*[–-]\s*(?P<rol>[^:\]]+):\s*(?P<personas>.*?)\s*\]"
    r"\s*(?:[–-]\s*(?P<lugar>.*))?$"
)
EVENTO_LUGAR = re.compile(r"^(?P<nombre>.*?)\s+[–-]\s+(?P<lugar>ROOM .*)$")
CLASES = [
    ("keynote", "KEYNOTE"), ("plenaria", "PLENARY"), ("cafe", "COFFEE"), ("registro", "REGISTRATION"),
    ("apertura", "OPENING"), ("cierre", "CLOSING"), ("cena", "DINNER"), ("receso", "BREAK"),
]
MINUSCULAS = {"of", "and", "the", "in", "on", "for", "to", "a", "an", "with"}
PARTICULAS = {"de", "da", "do", "dos", "das", "del", "di", "e", "y"}
IDIOMAS = {"portugués": "pt", "español": "es", "inglés": "en"}
MESES = r"(january|february|march|april|may|june|july|august|september|october|november|december)"


def texto(v) -> str:
    return espacios(v) if v is not None else ""


def titulo_propio(s: str) -> str:
    """'PLENARY 1 – EXPERT PANEL' -> 'Plenary 1 – Expert Panel'; 'ROOM D (PRINCIPAL ROOM)' -> 'Room D (Principal Room)'."""
    def palabra(m: re.Match) -> str:
        w = m.group(0).lower()
        return w if (m.start() and w in MINUSCULAS) else w[:1].upper() + w[1:]
    return re.sub(r"[^\W\d_]+", palabra, s)


def lugar_propio(s: str) -> str:
    """'ROOM D (PRINCIPAL ROOM)' -> 'Room D (Principal Room)'."""
    return titulo_propio(s.strip()) if s else ""


def hora(v) -> tuple[str, str] | None:
    m = HORA.match(texto(v))
    return (m.group(1), m.group(2) or "") if m else None


def minutos(h: str) -> int:
    a, b = h.split(":")
    return int(a) * 60 + int(b)


# ---------------------------------------------------------------------------
# Lectura de la planilla
# ---------------------------------------------------------------------------


def es_hoja_de_dia(ws) -> bool:
    return any(texto(r[1]) == "CODE" and texto(r[2]) == "ARTICLE" for r in ws.iter_rows(max_row=12, max_col=4, values_only=True))


def evento(h: tuple[str, str], s: str) -> dict:
    clase = next((c for c, palabra in CLASES if palabra in s.upper()), "otro")
    ev = {"tipo": "evento", "clase": clase, "inicio": h[0], "fin": h[1], "texto": s}
    m = EVENTO.match(s)
    if m:
        personas = [espacios(p) for p in re.split(r",\s*", m["personas"]) if espacios(p)]
        ev.update(nombre=titulo_propio(m["nombre"]), titulo=m["titulo"].strip(), rol=m["rol"].strip(),
                  personas=personas, lugar=lugar_propio(m["lugar"] or ""))
        return ev
    m = EVENTO_LUGAR.match(s)
    if m:
        ev.update(nombre=titulo_propio(m["nombre"]), lugar=lugar_propio(m["lugar"]))
    else:
        ev.update(nombre=titulo_propio(s))
    return ev


def leer_dia(ws) -> dict:
    """{"nombre", "salas": {letra: {"nombre", "principal", "filas": [...]}}} de una hoja por día."""
    dia = {"nombre": "", "salas": {}}
    sala = None
    sesion = None
    for fila in ws.iter_rows(max_col=4, values_only=True):
        a, b, c, d = (texto(x) for x in fila[:4])
        if not (a or b or c or d):
            continue
        if a.upper().startswith("ROOM"):
            letra = re.match(r"ROOM\s+([A-Z])", a.upper())[1]
            sala = {"letra": letra, "nombre": f"Room {letra}", "principal": "PRINCIPAL" in a.upper(), "filas": []}
            dia["salas"][letra] = sala
            sesion = None
            continue
        if a.upper() == "HOUR":
            dia["nombre"] = b
            continue
        if b == "CODE" or sala is None:
            continue
        if a.upper().startswith("SESSION"):
            sesion = {"tipo": "sesion", "id": a.split()[-1], "tracks_texto": b,
                      "chair": nombre_propio(re.sub(r"^chair:\s*", "", d, flags=re.I)), "slots": []}
            sala["filas"].append(sesion)
            continue
        h = hora(a)
        if not h:
            continue
        if b and CODIGO.match(b) and sesion is not None:
            sesion["slots"].append({"inicio": h[0], "fin": h[1], "codigo": b, "titulo": c, "presentador": d})
        elif b:
            sesion = None
            sala["filas"].append(evento(h, b))
        elif sesion is not None:
            sesion["slots"].append({"inicio": h[0], "fin": h[1], "vacio": True})
    return dia


def leer_ponencias(wb) -> dict[str, dict]:
    """Código -> fila de "Ponencias (interno)" (autores, país, idioma...)."""
    hoja = next((wb[n] for n in wb.sheetnames if n.lower().startswith("ponencias")), None)
    if hoja is None:
        return {}
    filas = list(hoja.iter_rows(values_only=True))
    i = next((k for k, f in enumerate(filas) if "Código" in [texto(x) for x in f]), None)
    if i is None:
        return {}
    cab = [texto(x) for x in filas[i]]
    out = {}
    for f in filas[i + 1:]:
        reg = dict(zip(cab, f))
        cod = texto(reg.get("Código"))
        if cod:
            out[cod] = reg
    return out


def leer_cabecera(wb) -> dict:
    """Título, fechas, sede y duración de las ponencias (primeras filas de "Programa General")."""
    hoja = next((wb[n] for n in wb.sheetnames if n.lower().startswith("programa general")), None)
    lineas = [texto(f[0]) for f in hoja.iter_rows(max_row=6, max_col=1, values_only=True)] if hoja else []
    out = {"ciudad": "", "fechas": "", "sede": "", "direccion": "", "duracion": ""}
    for l in lineas:
        partes = [p.strip() for p in l.split("·")]
        if l.lower().startswith("venue:"):
            out["sede"] = partes[0].split(":", 1)[1].strip()
            out["direccion"] = ", ".join(partes[1:])
            continue
        # "Santiago de Chile · October 28–30, 2026 · Paper presentations: 20 minutes each"
        for p in partes:
            m = re.match(r"^(?:paper\s+)?presentations?:\s*(.+)$", p, re.I)
            if m:
                out["duracion"] = m[1]
            elif re.search(MESES + r".*\b(19|20)\d{2}\b", p, re.I) and not out["fechas"]:
                out["fechas"] = p
        if len(partes) > 1 and not out["ciudad"] and out["fechas"] in partes:
            out["ciudad"] = partes[0]
    return out


# ---------------------------------------------------------------------------
# Construcción del programa
# ---------------------------------------------------------------------------


def nombre_propio(nombre: str) -> str:
    """'CRUZ DÍAZ CASTAÑEDA' -> 'Cruz Díaz Castañeda'; los demás quedan igual."""
    if nombre != nombre.upper() or not re.search(r"[A-ZÁÉÍÓÚÑ]{2}", nombre):
        return nombre
    return " ".join(w.lower() if w.lower() in PARTICULAS else w.capitalize() for w in nombre.split(" "))


def tokens(nombre: str) -> list[str]:
    return [t for t in clave_norm(nombre).split() if t not in PARTICULAS]


def es_misma_persona(presentador: str, autor: str) -> bool:
    """'Katiani Pereira da Conceição' ~ 'Katiani Pereira'; 'Hermen Octavio Alvarenga Pérez' ~ 'H. Octavio Alvarenga'."""
    p, a = tokens(presentador), tokens(autor)
    if not p or not a:
        return False
    x, y = p[0], a[0]
    if not (x == y or (len(x) == 1 and y.startswith(x)) or (len(y) == 1 and x.startswith(y))):
        return False
    return len(a) == 1 or bool({t for t in p[1:] if len(t) > 1} & {t for t in a[1:] if len(t) > 1})


def construir(args, cfg: dict) -> tuple[dict, list[str], list[tuple]]:
    import openpyxl

    wb = openpyxl.load_workbook(Path(args.programa).expanduser(), data_only=True)
    ponencias = leer_ponencias(wb)
    cabecera = leer_cabecera(wb)
    correcciones_papers = cfg.get("correcciones_papers", {})
    correcciones_nombres = cfg.get("indice_autores", {}).get("correcciones", {})
    tracks_cfg = {int(t["numero"]): t["en"] for t in cfg.get("tracks", [])}
    avisos: list[str] = []
    revision: list[tuple] = []

    dias_hojas = [leer_dia(wb[n]) for n in wb.sheetnames if es_hoja_de_dia(wb[n])]
    if not dias_hojas:
        sys.exit("La planilla no trae hojas por día (tablas con columnas HOUR / CODE / ARTICLE / PRESENTER).")

    sesiones: dict[str, dict] = {}
    dias = []
    plenarias = []
    for k, dh in enumerate(dias_hojas):
        letras = sorted(dh["salas"])
        principal = next((l for l in letras if dh["salas"][l]["principal"]), letras[-1])
        m = DIA.match(dh["nombre"])
        nombre_dia = f"{m[1].title()}, {m[2].title()}" if m else dh["nombre"].title()
        dia = {"id": f"d{k + 1}", "nombre": nombre_dia,
               "salas": [{"letra": l, "nombre": dh["salas"][l]["nombre"], "principal": l == principal} for l in letras],
               "filas": []}

        # Cada evento común aparece repetido en la hoja de cada sala. Si las
        # salas no coinciden (una se actualizó y las otras no), se usa el texto
        # de la mayoría; en empate, el de la sala principal. Se avisa siempre.
        eventos_por_sala = {l: [f for f in dh["salas"][l]["filas"] if f["tipo"] == "evento"] for l in letras}
        eventos_principal = eventos_por_sala[principal]
        for l in letras:
            if len(eventos_por_sala[l]) != len(eventos_principal):
                avisos.append(f"{nombre_dia}: la sala {l} tiene {len(eventos_por_sala[l])} eventos comunes y la "
                              f"principal {len(eventos_principal)}.")
        for k, ev_principal in enumerate(eventos_principal):
            textos = [eventos_por_sala[l][k]["texto"] for l in letras if k < len(eventos_por_sala[l])]
            votos = Counter(textos)
            if len(votos) == 1:
                continue
            maximo = max(votos.values())
            ganador = ev_principal["texto"] if votos[ev_principal["texto"]] == maximo else votos.most_common(1)[0][0]
            detalle = "; ".join(f"sala(s) {', '.join(l for l in letras if k < len(eventos_por_sala[l]) and eventos_por_sala[l][k]['texto'] == t)}: «{t}»"
                                for t in votos)
            avisos.append(f"{nombre_dia} {ev_principal['inicio']}: las salas no coinciden ({detalle}). Se usa «{ganador}».")
            if ganador != ev_principal["texto"]:
                # Es el mismo objeto que está en las filas de la sala principal.
                fuente = next(eventos_por_sala[l][k] for l in letras
                              if k < len(eventos_por_sala[l]) and eventos_por_sala[l][k]["texto"] == ganador)
                ev_principal.clear()
                ev_principal.update(fuente)

        # Recorre la sala principal en orden; cada sesión arma un bloque con
        # las sesiones paralelas de las demás salas.
        sesiones_por_sala = {l: [f for f in dh["salas"][l]["filas"] if f["tipo"] == "sesion"] for l in letras}
        n_bloque = 0
        for fila in dh["salas"][principal]["filas"]:
            if fila["tipo"] == "evento":
                ev = {k2: v for k2, v in fila.items() if k2 != "texto"}
                dia["filas"].append(ev)
                if fila["clase"] in {"keynote", "plenaria", "cierre"}:
                    plenarias.append({**ev, "dia": nombre_dia})
                continue
            paralelas = [sesiones_por_sala[l][n_bloque] for l in letras if n_bloque < len(sesiones_por_sala[l])]
            n_bloque += 1
            ids = []
            for l, ses in zip(letras, paralelas):
                sid = ses["id"]
                nums = [int(x) for x in re.findall(r"TRACK\s+(\d+)", ses["tracks_texto"].split("·")[0], re.I)]
                papers = []
                for slot in ses["slots"]:
                    if slot.get("vacio"):
                        papers.append({"inicio": slot["inicio"], "fin": slot["fin"], "vacio": True})
                        continue
                    papers.append(armar_paper(slot, ponencias, correcciones_papers, avisos))
                ocupados = [p for p in papers if not p.get("vacio")]
                sesiones[sid] = {
                    "id": sid, "dia": nombre_dia, "dia_id": dia["id"], "sala": l,
                    "sala_nombre": dh["salas"][l]["nombre"] + (" (Principal Room)" if l == principal else ""),
                    "inicio": ocupados[0]["inicio"] if ocupados else "", "fin": ocupados[-1]["fin"] if ocupados else "",
                    "tracks": [{"numero": n, "titulo": tracks_cfg.get(n, f"Track {n}")} for n in nums],
                    "chair": ses["chair"], "papers": papers,
                }
                if not ses["chair"]:
                    avisos.append(f"Sesión {sid}: sin chair.")
                for p in papers:
                    if p.get("vacio"):
                        avisos.append(f"Sesión {sid} ({nombre_dia}, sala {l}) {p['inicio']}: cupo vacío.")
                ids.append(sid)
            horas = [(p["inicio"], p["fin"]) for p in sesiones[ids[0]]["papers"]]
            for sid in ids[1:]:
                if [(p["inicio"], p["fin"]) for p in sesiones[sid]["papers"]] != horas[:len(sesiones[sid]["papers"])]:
                    avisos.append(f"Bloque {ids}: las salas no tienen los mismos horarios.")
            todas = [h for sid in ids for p in sesiones[sid]["papers"] for h in (p["inicio"], p["fin"])]
            dia["filas"].append({"tipo": "bloque", "sesiones": ids,
                                 "inicio": min(todas, key=minutos), "fin": max(todas, key=minutos),
                                 "horas": [{"inicio": a, "fin": b} for a, b in
                                           sorted({(p["inicio"], p["fin"]) for sid in ids for p in sesiones[sid]["papers"]},
                                                  key=lambda x: minutos(x[0]))]})
        dias.append(dia)

    agregar_ponencias(cfg, sesiones, ponencias, correcciones_papers, tracks_cfg, avisos)

    # Tracks: en qué sesiones aparece cada uno.
    tracks = []
    for n, titulo in sorted(tracks_cfg.items()):
        ses = [sid for sid, s in sesiones.items() if any(p.get("track") == n for p in s["papers"])]
        n_papers = sum(1 for s in sesiones.values() for p in s["papers"] if p.get("track") == n)
        if n_papers:
            tracks.append({"numero": n, "titulo": titulo, "sesiones": ses, "papers": n_papers})

    # Índice de autores: autores del CMS y presentadores que no figuran entre ellos.
    orden = {sid: i for i, sid in enumerate(sesiones)}
    indice: dict[str, dict[str, bool]] = defaultdict(dict)
    for sid, s in sesiones.items():
        for p in s["papers"]:
            if p.get("vacio"):
                continue
            nombres = [(a["nombre"], a["presenta"]) for a in p["autores"]] + [(x, True) for x in p["presentadores_extra"]]
            for nombre, presenta in nombres:
                clave, motivo = entrada_indice({"nombre": nombre, "email": "", "afiliacion": p["pais"]}, correcciones_nombres)
                indice[clave][sid] = indice[clave].get(sid, False) or presenta
                revision.append((nombre, clave, motivo, p["codigo"], p["pais"]))
    grupos: dict[str, list[str]] = defaultdict(list)
    for clave in indice:
        grupos[clave_norm(clave)].append(clave)
    entradas = []
    for norm, claves in grupos.items():
        mostrar = max(claves, key=lambda c: (len(indice[c]), c != sin_tildes(c)))
        ses: dict[str, bool] = {}
        for c in claves:
            for sid, presenta in indice[c].items():
                ses[sid] = ses.get(sid, False) or presenta
        if len(claves) > 1:
            avisos.append(f"Índice de autores: se fusionaron {claves} como '{mostrar}'.")
        entradas.append({"clave": mostrar, "orden": norm,
                         "sesiones": [{"id": sid, "presenta": ses[sid]} for sid in sorted(ses, key=orden.get)]})
    entradas.sort(key=lambda e: e["orden"])
    letras_indice = []
    for e in entradas:
        letra = sin_tildes(e["clave"][:1]).upper() or "#"
        if not letras_indice or letras_indice[-1]["letra"] != letra:
            letras_indice.append({"letra": letra, "entradas": []})
        letras_indice[-1]["entradas"].append({"clave": e["clave"], "sesiones": e["sesiones"]})

    # Estado de cada presentación (planilla interna): solo para el reporte.
    por_confirmar = [(p["codigo"], sid, p["estado"]) for sid, s in sesiones.items() for p in s["papers"]
                     if not p.get("vacio") and p["estado"] and not p["estado"].upper().startswith("CONFIRMADO")]
    for cod, sid, est in por_confirmar:
        avisos.append(f"{cod} ({sid}) figura como «{est}» en la planilla; se imprime igual.")

    total = sum(1 for s in sesiones.values() for p in s["papers"] if not p.get("vacio"))
    datos = {
        "cabecera": cabecera,
        "dias": dias,
        "sesiones": sesiones,
        "plenarias": plenarias,
        "tracks": tracks,
        "autores": letras_indice,
        "estadisticas": {"papers": total, "sesiones": len(sesiones), "dias": len(dias),
                         "salas": max(len(d["salas"]) for d in dias), "entradas_indice": len(entradas),
                         "presentadores": len({x for s in sesiones.values() for p in s["papers"] if not p.get("vacio")
                                               for x in p["presentadores"]})},
    }
    return datos, avisos, revision


def agregar_ponencias(cfg: dict, sesiones: dict, ponencias: dict, correcciones: dict,
                      tracks_cfg: dict, avisos: list[str]) -> None:
    """[[programa.agregados]]: ponencias que la organización suma a un cupo
    libre después de la última planilla (título y autores de "Ponencias
    (interno)" o de la misma entrada). Si la planilla ya la trae, se ignora."""
    programados = {p.get("codigo") for s in sesiones.values() for p in s["papers"]}
    for ag in cfg.get("programa", {}).get("agregados", []):
        cod, sid, inicio = ag["codigo"], ag["sesion"], ag["inicio"]
        if cod in programados:
            avisos.append(f"{cod} ya está en la planilla; se ignora su entrada en [[programa.agregados]].")
            continue
        ses = sesiones.get(sid)
        k = next((i for i, p in enumerate(ses["papers"]) if p["inicio"] == inicio), None) if ses else None
        if k is None or not ses["papers"][k].get("vacio"):
            avisos.append(f"[[programa.agregados]] {cod}: la sesión {sid} no tiene un cupo libre a las {inicio}.")
            continue
        slot = {"inicio": inicio, "fin": ses["papers"][k]["fin"], "codigo": cod,
                "titulo": ag.get("titulo", ""), "presentador": ag.get("presentador", "")}
        reg = dict(ponencias.get(cod, {}))
        if ag.get("autores"):
            reg["Autores (CMS)"] = "; ".join(ag["autores"])
        paper = armar_paper(slot, {cod: reg}, correcciones, avisos)
        paper["estado"] = ""  # la planilla aún lo marca sin inscripción
        ses["papers"][k] = paper
        ses["fin"] = max((p["fin"] for p in ses["papers"] if not p.get("vacio")), key=minutos)
        if paper["track"] and paper["track"] not in [t["numero"] for t in ses["tracks"]]:
            ses["tracks"].append({"numero": paper["track"], "titulo": tracks_cfg.get(paper["track"], f"Track {paper['track']}")})
        programados.add(cod)
        avisos[:] = [a for a in avisos if not (a.startswith(f"Sesión {sid} ") and a.endswith(f" {inicio}: cupo vacío."))]
        avisos.append(f"{cod} agregado en {sid} a las {inicio} ([[programa.agregados]])"
                      + ("" if paper["presentadores"] else "; sin presentador indicado") + ".")


def armar_paper(slot: dict, ponencias: dict, correcciones: dict, avisos: list[str]) -> dict:
    cod = slot["codigo"]
    reg = ponencias.get(cod, {})
    titulo = texto(correcciones.get(cod, {}).get("titulo")) or slot["titulo"] or texto(reg.get("Título (CMS)"))
    if titulo and titulo == titulo.upper() and len(titulo) > 20:
        avisos.append(f"{cod}: el título está en mayúsculas; corríjalo en [correcciones_papers] del .toml.")
    autores_cms = [nombre_propio(espacios(a)) for a in texto(reg.get("Autores (CMS)")).split(";") if espacios(a)]
    presentadores = [nombre_propio(espacios(p)) for p in re.split(r"\s+/\s+", slot["presentador"]) if espacios(p)]
    if not autores_cms:
        avisos.append(f"{cod}: sin autores en «Ponencias (interno)»; se imprime solo el presentador.")
    autores = []
    encontrados = set()
    for a in autores_cms:
        presenta = any(es_misma_persona(p, a) for p in presentadores)
        if presenta:
            encontrados.update(p for p in presentadores if es_misma_persona(p, a))
        autores.append({"nombre": a, "presenta": presenta})
    extra = [p for p in presentadores if p not in encontrados]
    if extra and autores_cms:
        avisos.append(f"{cod}: el presentador {', '.join(extra)} no figura entre los autores del CMS; "
                      "se imprime como «Presenter».")
    track = reg.get("Track")
    try:
        track = int(track)
    except (TypeError, ValueError):
        track = None
    idioma_titulo = detectar_idioma(titulo)
    return {
        "inicio": slot["inicio"], "fin": slot["fin"], "codigo": cod, "titulo": titulo,
        "idioma": idioma_titulo, "autores": autores, "presentadores": presentadores,
        "presentadores_extra": extra if autores_cms else presentadores, "pais": texto(reg.get("País")),
        "track": track, "estado": texto(reg.get("Estado")),
        "idioma_presentacion": IDIOMAS.get(texto(reg.get("Idioma")).lower(), ""),
    }


def escribir_reporte(salida: Path, datos: dict, avisos: list[str], revision: list[tuple]) -> Path:
    e = datos["estadisticas"]
    lineas = [
        "# Reporte del Libro del Programa", "",
        f"- Días: {e['dias']} · Salas: {e['salas']} · Sesiones: {e['sesiones']} · Ponencias: {e['papers']} "
        f"· Presentadores: {e['presentadores']}",
        f"- Entradas del índice de autores: {e['entradas_indice']}", "",
        "## Advertencias", "",
    ]
    lineas += [f"- {a}" for a in avisos] or ["- (ninguna)"]
    lineas += ["", "## Índice de autores: nombres ambiguos", "",
               "Corregir en `[indice_autores.correcciones]` del .toml si hace falta.", "",
               "| Nombre | Entrada | Motivo | Paper | País |", "|---|---|---|---|---|"]
    vistos = set()
    for nombre, clave, motivo, cod, pais in sorted(revision, key=lambda x: clave_norm(x[1])):
        if motivo.startswith("AMBIGUO") and nombre not in vistos:
            vistos.add(nombre)
            lineas.append(f"| {nombre} | {clave} | {motivo} | {cod} | {pais} |")
    ruta = salida / "reporte-programa.md"
    ruta.write_text("\n".join(lineas) + "\n", encoding="utf-8")
    return ruta


def datos_web(datos: dict) -> dict:
    """Lo que publica el sitio (sección Programa): sin estado de pago o
    asistencia, país ni índice de autores, que son de uso interno."""
    publicos = ("inicio", "fin", "codigo", "titulo", "idioma", "autores", "presentadores_extra", "track", "vacio")
    sesiones = {
        sid: {**{k: v for k, v in s.items() if k != "papers"},
              "papers": [{k: p[k] for k in publicos if k in p} for p in s["papers"]]}
        for sid, s in datos["sesiones"].items()
    }
    return {"cabecera": datos["cabecera"], "dias": datos["dias"], "sesiones": sesiones,
            "plenarias": datos["plenarias"], "tracks": datos["tracks"]}


def main() -> None:
    from pypdf import PdfReader

    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--programa", required=True, help="Planilla del programa (CLAGTEE2026_Programa_vN.xlsx)")
    ap.add_argument("--config", default=str(DEFAULT_CONFIG), help="Archivo .toml (el mismo del Libro de Resúmenes)")
    ap.add_argument("--salida", default=str(DEFAULT_OUT), help="Carpeta de salida (dentro del repo)")
    ap.add_argument("--nombre", default="CLAGTEE2026_Conference_Program", help="Nombre base del PDF")
    ap.add_argument("--solo-datos", action="store_true", help="Genera programa.json y el reporte sin compilar")
    ap.add_argument("--pliegos", action="store_true", help="Genera además la versión en páginas enfrentadas")
    ap.add_argument("--vista-previa", default="", help="Páginas a exportar como PNG, p. ej. '1-5,12'")
    ap.add_argument("--fuentes", action="append", default=[], help="Carpeta extra con fuentes; se puede repetir")
    ap.add_argument("--web", default="", help="Escribe además el JSON de la sección Programa del sitio "
                                              "(p. ej. data/programa2026.json)")
    args = ap.parse_args()

    config = Path(args.config).resolve()
    cfg = tomllib.loads(config.read_text(encoding="utf-8"))
    salida = Path(args.salida).resolve()
    try:
        salida.relative_to(REPO_ROOT)
    except ValueError:
        sys.exit(f"La carpeta de salida debe estar dentro del repositorio ({REPO_ROOT}): Typst solo lee archivos bajo su raíz.")
    salida.mkdir(parents=True, exist_ok=True)

    datos, avisos, revision = construir(args, cfg)
    datos_json = salida / "programa.json"
    datos_json.write_text(json.dumps(datos, ensure_ascii=False, indent=1), encoding="utf-8")
    if args.web:
        web = Path(args.web).resolve()
        web.write_text(json.dumps(datos_web(datos), ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
        print(f"JSON del sitio: {web}")
    reporte = escribir_reporte(salida, datos, avisos, revision)
    e = datos["estadisticas"]
    print(f"Programa: {e['dias']} días, {e['sesiones']} sesiones, {e['papers']} ponencias; {len(avisos)} advertencias.")
    print(f"Reporte: {reporte}")
    if args.solo_datos:
        return

    pdf = salida / f"{args.nombre}.pdf"
    print("Compilando con Typst...")
    carpetas = [Path(c).expanduser().resolve() for c in args.fuentes] + [FONTS_LOCAL, FONTS_DIR]
    carpetas = [c for c in carpetas if c.is_dir()]
    compilar(config, cfg, datos_json, pdf, carpetas, plantilla=TEMPLATE)
    # Páginas de notas antes de la contraportada para cerrar el cuadernillo.
    multiplo = int(cfg.get("programa", {}).get("multiplo_paginas", 1) or 1)
    paginas = len(PdfReader(str(pdf)).pages)
    notas = -paginas % multiplo
    if notas:
        compilar(config, cfg, datos_json, pdf, carpetas, plantilla=TEMPLATE, extra={"notas": str(notas)})
        paginas += notas
    print(f"PDF: {pdf} ({paginas} páginas{f', {notas} de notas' if notas else ''})")
    if args.pliegos:
        destino = salida / f"{args.nombre}_pliegos.pdf"
        pliegos(pdf, destino)
        print(f"PDF en pliegos: {destino}")
    if args.vista_previa:
        vistas_previas(pdf, args.vista_previa, salida / "vista-previa")


if __name__ == "__main__":
    main()
