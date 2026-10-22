// Piezas comunes del Libro de Resúmenes (libro.typ) y del Libro del Programa
// (programa.typ): formato de página, fuentes, colores, portada y contraportada
// del libro 2019. Ver referencia/formato-libro-2019.md.
//
// Lee de sys.inputs lo mismo que ambas plantillas:
//   config -> ruta (desde la raíz del repo) del .toml
//   fuentes-sans / fuentes-serif / fuentes-display, escala-*, cursiva-sans

#let cfg = toml(sys.inputs.at("config"))
#let ruta(p) = if p.starts-with("/") { p } else { "/" + p }

// Página de 150 × 220 mm.
#let W = 425.197pt
#let H = 623.622pt

#let ES = float(sys.inputs.at("escala-sans", default: "1"))
#let ER = float(sys.inputs.at("escala-serif", default: "1"))
#let ED = float(sys.inputs.at("escala-display", default: "1"))
#let s(x) = x * ES
#let r(x) = x * ER
#let d(x) = x * ED

// La caja de cada línea va de la línea base a 0.7 em sobre ella; así el
// interlineado se fija base a base, igual que en InDesign.
#let ALTO-CAP = 0.7
#let lead(cuerpo, base) = base - ALTO-CAP * cuerpo
// Espacio entre bloques medido de línea base a línea base.
#let salto(base, cuerpo-sig) = v(base - ALTO-CAP * cuerpo-sig, weak: true)

#let col(nombre) = rgb(cfg.colores.at(nombre))
#let familias(tipo) = {
  let clave = "fuentes-" + tipo
  if clave in sys.inputs { sys.inputs.at(clave).split("|") } else { cfg.fuentes.at(tipo) }
}
#let SANS = familias("sans")
#let SERIF = familias("serif")
#let DISPLAY = familias("display")
// Nirmala UI no tiene cursiva: InDesign la simulaba inclinando el texto.
#let cursiva(x) = if sys.inputs.at("cursiva-sans", default: "1") == "1" {
  text(style: "italic", x)
} else { skew(ax: -11deg, x) }

// Los valores pendientes ("TODO...") se imprimen en rojo.
#let t(x) = {
  if type(x) == str and x.starts-with("TODO") {
    text(fill: rgb("#d0021b"), weight: "bold")[#x]
  } else { x }
}

// Texto con su línea base en (x, y) desde la esquina superior izquierda.
#let en-base(x, y, cuerpo, contenido, alinear: left) = {
  let caja = text(size: cuerpo, top-edge: ALTO-CAP * 1em, bottom-edge: "baseline", contenido)
  let dy = y - ALTO-CAP * cuerpo
  if alinear == left {
    place(top + left, dx: x, dy: dy, caja)
  } else if alinear == right {
    place(top + left, dx: x - W, dy: dy, box(width: W, align(right, caja)))
  } else {
    place(top + left, dx: x - W / 2, dy: dy, box(width: W, align(center, caja)))
  }
}

// ---------------------------------------------------------------------------
// Portada
// ---------------------------------------------------------------------------
#let decoraciones() = {
  let claro = col("morado_claro")
  // Grilla de puntos y cruces en escalera, arriba a la izquierda.
  for f in range(10) {
    for c in range(10 - f) {
      let x = 7.05pt + c * 11.6pt
      let y = 21.7pt + f * 9.4pt
      if calc.rem(f * 3 + c * 7, 5) < 2 {
        place(top + left, dx: x - 2.1pt, dy: y - 2.1pt, {
          place(line(start: (0pt, 0pt), end: (4.2pt, 4.2pt), stroke: 1.3pt + claro))
          place(line(start: (4.2pt, 0pt), end: (0pt, 4.2pt), stroke: 1.3pt + claro))
        })
      } else {
        place(top + left, dx: x - 2.15pt, dy: y - 2.15pt, rect(width: 4.3pt, height: 4.3pt, fill: claro, stroke: none))
      }
    }
  }
  let barra(a, b, grosor) = place(top + left, line(start: a, end: b, stroke: (paint: claro, thickness: grosor, cap: "round")))
  // Franjas a 45° a la izquierda.
  barra((-6pt, 184pt), (34pt, 144pt), 11pt)
  barra((30pt, 144pt), (36pt, 138pt), 3.6pt)
  barra((40pt, 152pt), (48pt, 144pt), 3.6pt)
  barra((-4pt, 202pt), (6pt, 192pt), 3.6pt)
  barra((4pt, 190pt), (9pt, 185pt), 3.6pt)
  // Peine arriba a la derecha (lo recorta la diagonal).
  barra((344pt, 21pt), (392pt, 72pt), 4.3pt)
  barra((368pt, 5pt), (420pt, 60pt), 4.3pt)
  barra((368pt, 20pt), (385pt, 30pt), 4.3pt)
  place(top + left, dx: 349pt, dy: 13.5pt, circle(radius: 2.5pt, fill: claro, stroke: none))
}

#let anillo(x, y) = place(top + left, dx: x - 5pt, dy: y - 5pt, circle(radius: 5pt, fill: none, stroke: 2.4pt + white))

// `titulo`: "BOOK OF ABSTRACTS", "CONFERENCE PROGRAM"...; `marca`: contenido
// invisible que la plantilla necesite en la página (p. ej. su estilo de folio).
#let portada(titulo, marca: none) = page(margin: 0pt, background: none, header: none, footer: none)[
  #marca
  #set par(justify: false)
  // Diagonal morada superior: se pinta el rectángulo y las decoraciones, y
  // un polígono blanco recorta la diagonal medida en el original.
  #place(top + left, rect(width: W, height: 330pt, fill: col("morado"), stroke: none))
  #decoraciones()
  #place(top + left, polygon(fill: white, stroke: none, (0pt, 320.8pt), (W, 32.1pt), (W, 340pt), (0pt, 340pt)))
  #place(top + left, polygon(fill: col("morado"), stroke: none, (W, 561.5pt), (W, H), (338.6pt, H)))
  #anillo(184.4pt, 23.7pt)
  #anillo(347pt, 47.8pt)
  #anillo(114.8pt, 171.3pt)
  #place(top + left, dx: 63pt, dy: 31pt, image(ruta(cfg.portada.logo_superior), width: 262pt))
  #place(top + left, dx: 130pt, dy: 200pt, image(ruta(cfg.portada.torre), width: 166pt))
  #set text(font: DISPLAY, weight: "bold")
  #en-base(114.1pt, 340.7pt, d(17.25pt), text(fill: col("morado_texto"), cfg.libro.nombre_corto))
  #for (k, linea) in cfg.portada.subtitulo.enumerate() {
    en-base(114.1pt, 352.2pt + k * 11.5pt, d(9.58pt), text(fill: col("azul_oscuro"), upper(linea)))
  }
  #en-base(W / 2, 421.2pt, d(27.78pt), text(fill: col("azul"), titulo), alinear: center)
  #en-base(W / 2, 480pt, d(15.5pt), text(fill: col("morado_fecha"), cfg.libro.fechas_portada), alinear: center)
  #en-base(W / 2, 494.5pt, d(10.5pt), text(fill: col("azul"), cfg.libro.ciudad_portada), alinear: center)
  #let logos = cfg.portada.logos_inferiores
  #place(top + left, dx: 20pt, dy: 517pt, box(width: 124pt, height: 60pt, align(left + horizon, image(ruta(logos.at(0)), height: 60pt))))
  #place(top + left, dx: 150pt, dy: 517pt, box(width: 126pt, height: 60pt, align(center + horizon, image(ruta(logos.at(1)), height: 42pt))))
  #place(top + left, dx: 290pt, dy: 517pt, box(width: 116pt, height: 60pt, align(center + horizon, image(ruta(logos.at(2)), height: 42pt))))
  #en-base(27pt, 606pt, d(19pt), text(fill: col("gris"), cfg.libro.web))
]

// ---------------------------------------------------------------------------
// Página de logo y patrocinadores: torre grande, triángulos morados en dos
// esquinas (iii del libro 2019)
// ---------------------------------------------------------------------------
#let pagina-patrocinadores(marca: none) = page(margin: 0pt, background: none, header: none, footer: none)[
  #marca
  #place(top + left, polygon(fill: col("morado"), stroke: none, (0pt, 0pt), (115pt, 0pt), (0pt, 81.3pt)))
  #place(top + left, polygon(fill: col("morado"), stroke: none, (W, 559.7pt), (W, H), (337.4pt, H)))
  #let cx = 225pt
  #place(top + left, dx: cx - 145pt, dy: 76pt, image(ruta(cfg.portada.torre), width: 290pt))
  #set text(font: DISPLAY, weight: "bold")
  #en-base(cx, 316pt, d(25.5pt), text(fill: col("morado_texto"), cfg.libro.nombre_corto), alinear: center)
  #en-base(cx, 382pt, d(13pt), text(fill: col("azul"), cfg.patrocinadores.titulo), alinear: center)
  #place(top + left, dx: cx - 150pt, dy: 400pt, box(width: 300pt, height: 175pt, align(center + top, {
    for (i, l) in cfg.patrocinadores.logos.enumerate() {
      if i > 0 { v(26pt) }
      image(ruta(l.archivo), height: l.alto * 1pt)
    }
  })))
]

// ---------------------------------------------------------------------------
// Contraportada: logos institucionales y patrocinadores
// ---------------------------------------------------------------------------
#let contraportada(marca: none) = page(margin: 0pt, background: none, header: none, footer: none)[
  #marca
  #let l = cfg.contraportada.logos_instituciones
  #place(top + left, dx: 18pt, dy: 62pt, box(width: 150pt, height: 48pt, align(left + horizon, image(ruta(l.at(0)), height: 46pt))))
  #place(top + left, dx: 278pt, dy: 62pt, box(width: 130pt, height: 48pt, align(center + horizon, image(ruta(l.at(1)), height: 46pt))))
  #place(top + left, dy: 152pt, box(width: W, height: 64pt, align(center + horizon, image(ruta(l.at(2)), height: 62pt))))
  #set text(font: DISPLAY, weight: "bold")
  #en-base(W / 2, 320pt, d(15pt), text(fill: col("azul"), cfg.patrocinadores.titulo), alinear: center)
  #place(top + left, dy: 362pt, box(width: W, height: 220pt, align(center + top, {
    for (i, lg) in cfg.patrocinadores.logos.enumerate() {
      if i > 0 { v(30pt) }
      image(ruta(lg.archivo), height: lg.alto * 1.25pt)
    }
  })))
]
