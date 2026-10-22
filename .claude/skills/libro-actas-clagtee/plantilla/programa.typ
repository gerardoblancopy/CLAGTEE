// Libro del Programa CLAGTEE (Conference Program): mismo formato de página,
// portada, página de patrocinadores y contraportada que el Libro de
// Resúmenes (comun.typ).
//
// No se compila a mano: scripts/generar_programa.py le pasa por sys.inputs
//   config -> .toml del libro (sección [programa] y las comunes)
//   data   -> programa.json armado desde la planilla del programa
//   notas  -> páginas de notas para que el total sea múltiplo de 4
//   fuentes-* / escala-* / cursiva-sans -> como en libro.typ

#import "comun.typ": *

#let data = json(sys.inputs.at("data"))
#let P = cfg.programa
#let NOTAS = int(sys.inputs.at("notas", default: "0"))

#let m-int = 54pt
#let m-ext = 40pt
#let m-sup = 70pt
#let m-inf = 46pt

#let MORADO = col("morado")
#let MORADO-T = col("morado_texto")
#let AZUL = col("azul")
#let GRIS = col("gris")
#let TINTE = MORADO.lighten(88%)
#let TINTE-SUAVE = MORADO.lighten(95%)
#let LINEA = MORADO.lighten(65%)
#let TEXTO-2 = luma(70)

#let rango(a, b) = if b == "" { a } else { a + "–" + b }
#let vacio(p) = p.at("vacio", default: false)

// ---------------------------------------------------------------------------
// Cabecera: folio en el borde exterior y título corrido hacia el lomo (en las
// pares el del libro; en las impares, la sección o el día). Cada sección deja
// una marca <seccion>; la cabecera usa la última hasta su página.
// ---------------------------------------------------------------------------
#let seccion(nombre) = [#metadata(nombre)<seccion>]

#let cabecera = context {
  let pag = here().page()
  let marcas = query(<seccion>).filter(m => m.location().page() <= pag)
  if marcas.len() == 0 or marcas.last().value == none { return }
  let folio = text(size: s(9pt), weight: "bold", fill: MORADO-T, counter(page).display())
  set text(size: s(7pt), fill: GRIS)
  if calc.odd(pag) {
    grid(columns: (1fr, auto), align: bottom, marcas.last().value, folio)
  } else {
    grid(columns: (auto, 1fr), align: (left + bottom, right + bottom), folio, P.titulo_corrido)
  }
  v(-4pt)
  line(length: 100%, stroke: 0.6pt + LINEA)
}

// Marcadores invisibles para el panel de navegación del PDF.
#show heading: it => block(sticky: true, height: 0pt, above: 0pt, below: 0pt, clip: true, hide(it.body))
#let marcador(nivel, x) = heading(level: nivel, outlined: false, bookmarked: true, numbering: none, x)

#let titulo-seccion(x) = block(below: 14pt,
  text(font: DISPLAY, weight: "bold", size: d(19pt), fill: MORADO-T, upper(x)))
#let subtitulo(x) = block(above: 14pt, below: 7pt, sticky: true,
  text(size: s(8pt), weight: "bold", fill: AZUL, tracking: 0.04em, upper(x)))

// ---------------------------------------------------------------------------
// Documento
// ---------------------------------------------------------------------------
#set document(title: "Conference Program " + cfg.libro.nombre_corto)
#set page(width: W, height: H, binding: left,
  margin: (inside: m-int, outside: m-ext, top: m-sup, bottom: m-inf),
  numbering: "1", header: cabecera, header-ascent: 16pt, footer: none)
#set text(font: SANS, size: s(9pt), lang: cfg.libro.idioma, hyphenate: true)
#set par(justify: false, leading: 0.5em, spacing: 0.9em)
#set table(stroke: 0.4pt + LINEA)

#portada(P.titulo, marca: seccion(none))
#pagina-patrocinadores(marca: seccion(none))

// ---------------------------------------------------------------------------
// Información general
// ---------------------------------------------------------------------------
#let c = data.cabecera
#let evento-de(clase) = {
  for dia in data.dias {
    for f in dia.filas {
      if f.tipo == "evento" and f.clase == clase { return (dia: dia.nombre, ev: f) }
    }
  }
  none
}
#let salas = data.dias.first().salas

#seccion("General Information")
#marcador(1, "General Information")
#titulo-seccion("General Information")
#{
  let reg = evento-de("registro")
  let cena = evento-de("cena")
  let filas = (
    ("Dates", [#data.dias.first().nombre.split(",").first()–#data.dias.last().nombre.split(",").first(), #c.fechas]),
    ("City", c.ciudad),
    ("Venue", [*#c.sede* \ #c.direccion]),
    ("Rooms", salas.map(sa => if sa.principal [#sa.nombre (Principal Room)] else [#sa.nombre]).join(", ", last: " and ")),
    if c.duracion != "" { ("Presentations", [Paper presentations: #c.duracion]) },
    if reg != none { ("Registration", [#reg.dia · #rango(reg.ev.inicio, reg.ev.fin)]) },
    if cena != none { (cena.ev.nombre, [#cena.dia · #rango(cena.ev.inicio, cena.ev.fin)]) },
    ("Website", cfg.libro.web),
    ("Contact", P.contacto),
  ).filter(x => x != none)
  grid(columns: (84pt, 1fr), column-gutter: 10pt, row-gutter: 10pt,
    ..filas.map(((etq, valor)) => (text(weight: "bold", fill: AZUL, hyphenate: false, etq), valor)).flatten())
}

#if P.at("actividades", default: ()).len() > 0 {
  subtitulo("Also this week")
  for a in P.actividades {
    block(width: 100%, fill: TINTE-SUAVE, inset: 8pt, radius: 2pt, below: 6pt, {
      text(weight: "bold", fill: MORADO-T, a.titulo)
      linebreak()
      text(size: s(8pt), weight: "bold", fill: AZUL, hyphenate: false)[#a.cuando · #a.donde]
      linebreak()
      text(size: s(8pt), a.detalle)
    })
  }
}

#subtitulo("How to read this program")
#{
  set text(size: s(8.5pt))
  let bloques = data.dias.map(dia => {
    let ids = dia.filas.filter(f => f.tipo == "bloque").map(f => f.sesiones.first().slice(0, -1))
    [#ids.join("–") #dia.nombre.split(",").first()]
  })
  par[Technical sessions are named by time block and room: #bloques.join("; "); the letter gives the room (#salas.map(sa => sa.letra).join(", ")). For example, #data.sesiones.keys().at(calc.min(9, data.sesiones.len() - 1)) is #{
    let e = data.sesiones.values().at(calc.min(9, data.sesiones.len() - 1))
    [#e.dia.split(",").first(), #rango(e.inicio, e.fin), #e.sala_nombre]
  }.]
  par[Each paper keeps its submission code (e.g. PLA-21). The presenting author is #underline[underlined]. The keynote lecture and the plenary sessions take place in the principal room.]
}

// ---------------------------------------------------------------------------
// Programa de un vistazo (los tres días)
// ---------------------------------------------------------------------------
#let fondo-de(clase) = if clase in ("keynote", "plenaria") { TINTE } else if clase in ("cafe", "receso") { luma(244) } else if clase == "bloque" { AZUL.lighten(88%) } else { none }

#pagebreak()
#seccion("Program at a Glance")
#marcador(1, "Program at a Glance")
#titulo-seccion("Program at a Glance")
#grid(columns: (1fr,) * data.dias.len(), column-gutter: 6pt, ..data.dias.map(dia => {
  block(width: 100%, fill: MORADO, inset: (x: 5pt, y: 6pt), below: 3pt,
    text(size: s(8.5pt), weight: "bold", fill: white, dia.nombre))
  for f in dia.filas {
    let clase = if f.tipo == "bloque" { "bloque" } else { f.clase }
    let que = if f.tipo == "bloque" {
      [*Technical Sessions* \ #text(size: s(7pt), fill: TEXTO-2)[#f.sesiones.join(", ")]]
    } else if "titulo" in f {
      [*#f.nombre* \ #text(size: s(7pt), fill: TEXTO-2)[“#f.titulo”]]
    } else if clase in ("cafe", "receso") { text(fill: TEXTO-2, f.nombre) } else { strong(f.nombre) }
    block(width: 100%, fill: fondo-de(clase), inset: (x: 5pt, y: 4pt), below: 2pt, breakable: false, {
      set text(hyphenate: false)
      text(size: s(7pt), weight: "bold", fill: AZUL, rango(f.inicio, f.fin))
      linebreak()
      text(size: s(7.5pt), que)
    })
  }
}))

// ---------------------------------------------------------------------------
// Charla magistral y plenarias
// ---------------------------------------------------------------------------
#pagebreak()
#seccion("Keynote and Plenary Sessions")
#marcador(1, "Keynote and Plenary Sessions")
#titulo-seccion("Keynote and Plenary Sessions")
#for (k, ev) in data.plenarias.enumerate() {
  block(width: 100%, breakable: false, above: if k == 0 { 0pt } else { 12pt }, {
    block(below: 6pt, box(fill: if ev.clase == "cierre" { AZUL } else { MORADO }, inset: (x: 6pt, y: 4pt), radius: 2pt,
      text(size: s(8pt), weight: "bold", fill: white, tracking: 0.04em, upper(ev.nombre))))
    text(size: s(8.5pt), weight: "bold", fill: AZUL)[#ev.dia · #rango(ev.inicio, ev.fin)#if ev.at("lugar", default: "") != "" [ · #ev.lugar]]
    if "titulo" in ev {
      block(above: 7pt, below: 6pt, text(size: s(12pt), weight: "bold", fill: MORADO-T)[“#ev.titulo”])
    }
    if "personas" in ev {
      grid(columns: (auto, 1fr), column-gutter: 6pt,
        text(weight: "bold")[#ev.rol:], ev.personas.join(", "))
    }
  })
  if k < data.plenarias.len() - 1 { block(above: 12pt, line(length: 100%, stroke: 0.4pt + LINEA)) }
}

// ---------------------------------------------------------------------------
// Días: grilla por sala y detalle de cada sesión
// ---------------------------------------------------------------------------
#let sesion-de(f, letra) = {
  let ids = f.sesiones.filter(sid => data.sesiones.at(sid).sala == letra)
  if ids.len() > 0 { data.sesiones.at(ids.first()) } else { none }
}

#let grilla(dia) = {
  let n = dia.salas.len()
  let hora-celda(x) = text(size: s(7pt), weight: "bold", fill: AZUL, x)
  let celdas = ()
  celdas.push(table.cell(fill: MORADO, text(size: s(7pt), weight: "bold", fill: white, "Time")))
  for sa in dia.salas {
    celdas.push(table.cell(fill: MORADO, text(size: s(7pt), weight: "bold", fill: white,
      if sa.principal [#sa.nombre \ #text(size: s(5.5pt), weight: "regular")[Principal Room]] else [#sa.nombre])))
  }
  for f in dia.filas {
    if f.tipo == "evento" {
      celdas.push(hora-celda(rango(f.inicio, f.fin)))
      let detalle = if "titulo" in f {
        [ \ #text(size: s(6.5pt), weight: "regular")[“#f.titulo”#if "personas" in f [ · #f.personas.join(", ")]]]
      } else { [] }
      celdas.push(table.cell(colspan: n, fill: fondo-de(f.clase),
        text(size: s(7.5pt), weight: if f.clase in ("cafe", "receso") { "regular" } else { "bold" })[#f.nombre#detalle]))
      continue
    }
    let por-sala = dia.salas.map(sa => sesion-de(f, sa.letra))
    celdas.push(hora-celda(rango(f.inicio, f.fin)))
    for ses in por-sala {
      celdas.push(table.cell(fill: TINTE, if ses == none [] else {
        text(size: s(7.5pt), weight: "bold", fill: MORADO-T, ses.id)
        linebreak()
        text(size: s(6pt), ses.tracks.map(t => "Track " + str(t.numero)).join(" / "))
      }))
    }
    for h in f.horas {
      celdas.push(text(size: s(7pt), fill: TEXTO-2, h.inicio))
      for ses in por-sala {
        let p = if ses == none { none } else { ses.papers.find(p => p.inicio == h.inicio) }
        celdas.push(text(size: s(7.5pt), if p == none or vacio(p) { text(fill: GRIS, "—") } else { p.codigo }))
      }
    }
  }
  table(columns: (42pt,) + (1fr,) * n, inset: (x: 3pt, y: 3.4pt), align: (x, y) => if x == 0 { left + horizon } else { center + horizon },
    ..celdas)
}

#let autores(p) = {
  let nombres = p.autores.map(a => if a.presenta { underline(a.nombre) } else { a.nombre })
  let lineas = ()
  if nombres.len() > 0 { lineas.push(nombres.join(", ")) }
  let extra = p.presentadores_extra
  if extra.len() > 0 { lineas.push([Presenter: #extra.map(x => underline(x)).join(" / ")]) }
  text(size: s(7.5pt), fill: TEXTO-2, lineas.join(linebreak()))
}

#let sesion(ses) = {
  block(sticky: true, width: 100%, above: 14pt, below: 7pt, fill: TINTE, inset: (x: 7pt, y: 6pt), radius: 2pt, {
    grid(columns: (auto, 1fr), column-gutter: 8pt, align: (left + horizon, right + horizon),
      text(font: DISPLAY, weight: "bold", size: d(16pt), fill: MORADO-T, ses.id),
      text(size: s(8pt), weight: "bold", fill: AZUL)[#ses.sala_nombre \ #rango(ses.inicio, ses.fin)])
    v(2pt)
    for tr in ses.tracks { block(below: 2pt, text(size: s(8pt), weight: "bold")[Track #tr.numero · #tr.titulo]) }
    text(size: s(8pt))[Chair: #ses.chair]
  })
  for p in ses.papers {
    if vacio(p) { continue }
    block(breakable: false, below: 8pt, grid(columns: (30pt, 1fr), column-gutter: 4pt,
      text(size: s(8pt), weight: "bold", fill: AZUL, p.inicio),
      {
        block(below: 3pt, text(size: s(8.5pt), weight: "bold", lang: p.idioma, hyphenate: true)[#text(fill: MORADO-T, p.codigo) · #p.titulo])
        autores(p)
      }))
  }
}

#for dia in data.dias {
  pagebreak()
  seccion(dia.nombre)
  marcador(1, dia.nombre)
  block(width: 100%, fill: MORADO, inset: (x: 10pt, y: 10pt), below: 10pt,
    text(font: DISPLAY, weight: "bold", size: d(18pt), fill: white, upper(dia.nombre)))
  grilla(dia)
  for f in dia.filas.filter(f => f.tipo == "bloque") {
    pagebreak()
    for sa in dia.salas {
      let ses = sesion-de(f, sa.letra)
      if ses != none {
        marcador(2, ses.id + " · " + ses.sala_nombre + " · " + rango(ses.inicio, ses.fin))
        sesion(ses)
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Tracks temáticos
// ---------------------------------------------------------------------------
#pagebreak()
#seccion("Thematic Tracks")
#marcador(1, "Thematic Tracks")
#titulo-seccion("Thematic Tracks")
#for tr in data.tracks {
  block(breakable: false, below: 10pt, grid(columns: (52pt, 1fr), column-gutter: 6pt,
    text(font: DISPLAY, weight: "bold", size: d(12pt), fill: MORADO-T)[Track #tr.numero],
    {
      text(weight: "bold", tr.titulo)
      linebreak()
      text(size: s(8pt), fill: TEXTO-2)[#tr.papers #if tr.papers == 1 [paper] else [papers] · Sessions: #tr.sesiones.join(", ")]
    }))
}

// ---------------------------------------------------------------------------
// Índice de autores
// ---------------------------------------------------------------------------
#pagebreak()
#seccion("Author Index")
#marcador(1, "Author Index")
#titulo-seccion("Author Index")
#text(size: s(8pt), fill: TEXTO-2)[Sessions where each author has a paper; in *bold*, the sessions where the author presents.]
#v(8pt)
#columns(2, gutter: 14pt, {
  set par(hanging-indent: 10pt, spacing: 0.55em, leading: 0.4em)
  for g in data.autores {
    block(sticky: true, above: 9pt, below: 4pt, text(size: s(10pt), weight: "bold", fill: MORADO-T, g.letra))
    for e in g.entradas {
      par(text(size: s(7.5pt))[#e.clave#h(0.6em)#e.sesiones.map(x => if x.presenta { strong(x.id) } else { x.id }).join(", ")])
    }
  }
})

// ---------------------------------------------------------------------------
// Notas (para completar un múltiplo de 4 páginas) y contraportada
// ---------------------------------------------------------------------------
#for i in range(NOTAS) {
  pagebreak()
  seccion("Notes")
  titulo-seccion("Notes")
  for k in range(26) { block(above: 16.5pt, line(length: 100%, stroke: 0.4pt + LINEA)) }
}

#contraportada(marca: seccion(none))
