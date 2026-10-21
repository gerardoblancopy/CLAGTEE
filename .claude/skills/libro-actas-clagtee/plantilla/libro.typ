// Libro de Resúmenes CLAGTEE — réplica del formato del "Book of Abstracts
// CLAGTEE 2019" (InDesign, 150 × 220 mm). Todas las medidas salen de ese
// PDF; ver referencia/formato-libro-2019.md.
//
// No se compila a mano: scripts/generar_libro.py le pasa por sys.inputs
//   config  -> ruta (desde la raíz del repo) del .toml del libro
//   data    -> ruta del libro.json generado a partir del export del CMS
//   fuentes-sans / fuentes-serif / fuentes-display -> familias a usar
//   escala-*   -> factor de cuerpo cuando se usa la fuente libre en vez de la
//                 original (ancho igualado)
//   cursiva-sans -> "0" si la familia no trae cursiva (se inclina el texto)
// y usa la raíz del repositorio como raíz de Typst.

#let cfg = toml(sys.inputs.at("config"))
#let data = json(sys.inputs.at("data"))
#let ruta(p) = if p.starts-with("/") { p } else { "/" + p }

// ---------------------------------------------------------------------------
// Medidas (pt) del libro 2019
// ---------------------------------------------------------------------------
#let W = 425.197pt
#let H = 623.622pt
#let m-int = 85pt        // margen interior (lomo)
#let m-ext = 36pt        // margen exterior
#let m-sup = 98.4pt      // margen superior: índice, resúmenes, índice de autores
#let m-sup-pre = 76pt    // margen superior: páginas preliminares
#let m-inf = 55.6pt      // margen inferior (hasta la última línea base)
#let ancho = W - m-int - m-ext

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
#let parrafos(x) = x.trim().split(regex("\n\s*\n")).map(p => p.replace(regex("\s+"), " ").trim()).filter(p => p != "")

// ---------------------------------------------------------------------------
// Estilos de página. Cada sección deja una marca <estilo>; el fondo de cada
// página dibuja folio, cabecera y pie según la última marca hasta ella.
// ---------------------------------------------------------------------------
#let estilo(nombre) = [#metadata(nombre)<estilo>]

// Fin de sección + salto a página impar (o par). La página intermedia queda
// en blanco y sin folio, como en el libro 2019.
#let a-impar() = { [#metadata("fin")<fin>]; pagebreak(weak: true, to: "odd") }
#let a-par() = { [#metadata("fin")<fin>]; pagebreak(weak: true, to: "even") }

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

#let fondo = context {
  let pag = here().page()
  // Página en blanco insertada por a-impar()/a-par().
  let fins = query(<fin>).filter(f => f.location().page() == pag - 1)
  if fins.len() > 0 {
    let sig = query(selector(<estilo>).after(fins.last().location()))
    if sig.len() > 0 and sig.first().location().page() > pag { return }
  }
  let marcas = query(<estilo>).filter(m => m.location().page() <= pag)
  let e = if marcas.len() > 0 { marcas.last().value } else { "nada" }
  if e == "nada" { return }
  let impar = calc.odd(pag)
  let x-izq = if impar { m-int } else { m-ext }
  let x-der = x-izq + ancho
  // Folio en el borde exterior; título corrido hacia el lomo.
  let x-ext = if impar { x-der } else { x-izq }
  let x-lomo = if impar { x-izq } else { x-der }
  let lado-ext = if impar { right } else { left }
  let lado-lomo = if impar { left } else { right }
  set text(font: SANS)
  en-base(x-ext, 68.2pt, s(12pt), counter(page).display(), alinear: lado-ext)
  if e == "indice" {
    en-base(x-lomo, 68.2pt, s(12pt), cfg.indice.cabecera, alinear: lado-lomo)
  }
  if e == "resumenes" {
    en-base(x-lomo, 66.7pt, s(7pt), cfg.libro.titulo_corrido, alinear: lado-lomo)
    place(top + left, dx: x-izq, dy: 70.3pt, line(length: ancho, stroke: 1pt + black))
    en-base(x-izq + ancho / 2, H - 31.6pt, s(8pt), [• #cfg.libro.pie •], alinear: center)
  }
}

// Marcadores invisibles para el panel de navegación del PDF.
#show heading: it => block(sticky: true, height: 0pt, above: 0pt, below: 0pt, clip: true, hide(it.body))
#let marcador(nivel, x) = heading(level: nivel, outlined: false, numbering: none, x)

// ---------------------------------------------------------------------------
// Documento
// ---------------------------------------------------------------------------
#set document(title: "Book of Abstracts " + cfg.libro.nombre_corto)
#set page(width: W, height: H, binding: left,
  margin: (inside: m-int, outside: m-ext, top: m-sup-pre, bottom: m-inf),
  numbering: "i", header: none, footer: none, background: fondo)
#set text(font: SANS, size: s(12pt), lang: cfg.libro.idioma, top-edge: ALTO-CAP * 1em, bottom-edge: "baseline", hyphenate: true)
#set par(justify: true, leading: lead(s(12pt), 14pt), spacing: lead(s(12pt), 14pt))
#set block(spacing: 0pt)

// ---------------------------------------------------------------------------
// i. Portada
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

#page(margin: 0pt, background: none)[
  #estilo("nada")
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
  #en-base(W / 2, 421.2pt, d(27.78pt), text(fill: col("azul"), cfg.libro.titulo), alinear: center)
  #en-base(W / 2, 480pt, d(15.5pt), text(fill: col("morado_fecha"), cfg.libro.fechas_portada), alinear: center)
  #en-base(W / 2, 494.5pt, d(10.5pt), text(fill: col("azul"), cfg.libro.ciudad_portada), alinear: center)
  #let logos = cfg.portada.logos_inferiores
  #place(top + left, dx: 20pt, dy: 517pt, box(width: 124pt, height: 60pt, align(left + horizon, image(ruta(logos.at(0)), height: 60pt))))
  #place(top + left, dx: 150pt, dy: 517pt, box(width: 126pt, height: 60pt, align(center + horizon, image(ruta(logos.at(1)), height: 42pt))))
  #place(top + left, dx: 290pt, dy: 517pt, box(width: 116pt, height: 60pt, align(center + horizon, image(ruta(logos.at(2)), height: 42pt))))
  #en-base(27pt, 606pt, d(19pt), text(fill: col("gris"), cfg.libro.web))
]

// ---------------------------------------------------------------------------
// ii (en blanco) · iii. Logo y patrocinadores
// ---------------------------------------------------------------------------
#page(background: none)[#estilo("nada")]
#page(margin: 0pt, background: none)[
  #estilo("nada")
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
// iv. Datos de la publicación
// ---------------------------------------------------------------------------
#{
  estilo("nada")
  set text(size: s(10pt))
  set par(justify: false, leading: lead(s(10pt), 14pt), spacing: lead(s(10pt), 14pt))
  let p = cfg.publicacion
  // Primera línea base a 246 pt del borde superior.
  place(top + left, dy: 246pt - m-sup-pre - ALTO-CAP * s(10pt), block(width: ancho, {
    par(strong[DATA OF PUBLICATION])
    par[Title: #t(p.titulo)]
    for e in p.editores { par(t(e)) }
    if p.editorial != "" { par(t(p.editorial)) }
    par(strong[ISBN: #t(p.isbn)])
    for l in p.lineas_extra { par(t(l)) }
    par(t(p.lugar_fecha))
  }))
  if p.nota_pie != "" {
    place(bottom + left, dy: -2pt, text(size: s(6.5pt), t(p.nota_pie)))
  }
}

// ---------------------------------------------------------------------------
// v. Prefacio · vii. Información
// ---------------------------------------------------------------------------
#pagebreak()
#estilo("pre")
#marcador(1, cfg.prefacio.titulo)
#text(size: s(24pt), weight: "bold", cfg.prefacio.titulo)
#salto(28pt, s(12pt))
#for p in parrafos(cfg.prefacio.texto) { par(p) }
#salto(28pt, s(12pt))
#align(center, cursiva(cfg.prefacio.firma_nombre + "\n" + cfg.prefacio.firma_cargo))

#a-impar()
#estilo("pre")
#{
  let i = cfg.informacion
  set par(justify: false)
  // Bloque centrado en la página: primera línea base a 246 pt.
  v(246.2pt - m-sup-pre - ALTO-CAP * s(12pt))
  par[*Date:* #t(i.fecha)]
  par[*Place:* #t(i.lugar)]
  par[*Home page:* #t(i.web)]
  par[*Informations:*]
  for c in i.contacto { par(t(c)) }
  salto(23.3pt, s(12pt))
  set par(leading: lead(s(12pt), 18pt), spacing: lead(s(12pt), 18pt), hanging-indent: 36.7pt)
  for b in i.vinetas {
    par(h(14.2pt) + box(width: 22.5pt)[•] + t(b))
  }
}

// ---------------------------------------------------------------------------
// ix. Objetivo e historia · x. Ediciones · xi. Comités · xii. Comité de programa
// ---------------------------------------------------------------------------
#a-impar()
#estilo("pre")
#marcador(1, cfg.objetivo.titulo)
#text(size: s(20pt), weight: "bold", cfg.objetivo.titulo)
#salto(28.5pt, s(12pt))
#for (k, p) in parrafos(cfg.objetivo.texto).enumerate() {
  if k > 0 { salto(28pt, s(12pt)) }
  par(p)
}
#salto(42pt, s(20pt))
#marcador(1, cfg.historia.titulo)
#text(size: s(20pt), weight: "bold", cfg.historia.titulo)
#salto(28pt, s(12pt))
#for p in parrafos(cfg.historia.texto) { par(p) }

#pagebreak()
#{
  set text(size: s(10pt))
  set par(leading: lead(s(10pt), 12pt), spacing: lead(s(10pt), 12pt), hanging-indent: 18pt)
  let inicio = 115.9pt - ALTO-CAP * s(10pt)
  v(inicio - m-sup-pre)
  let items = cfg.historia.ediciones.map(e => par(box(width: 18pt)[•] + e))
  // 2019: 23.4 pt base a base entre viñetas. Con más ediciones se aprieta
  // lo justo para que la lista quepa en una página.
  context {
    let alto = items.map(i => measure(block(width: ancho, i)).height).sum()
    let n = items.len()
    let libre = (H - m-inf - inicio - alto) / calc.max(1, n - 1)
    let sep = calc.min(23.4pt - ALTO-CAP * s(10pt), libre - 0.5pt)
    for (k, i) in items.enumerate() {
      if k > 0 { v(sep, weak: true) }
      i
    }
  }
}

#pagebreak()
#for (k, c) in cfg.comites.enumerate() {
  if k > 0 { salto(if k == 1 { 68pt } else { 64pt }, s(20pt)) }
  marcador(2, c.titulo)
  text(size: s(20pt), weight: "bold", c.titulo)
  salto(26pt, s(11pt))
  let n = c.filas.map(f => f.len()).fold(1, calc.max)
  pad(left: 4pt, {
    set text(size: s(11pt))
    set par(justify: false)
    grid(columns: n, column-gutter: 14pt, row-gutter: 16pt - ALTO-CAP * s(11pt),
      ..c.filas.map(f => (f + ("",) * (n - f.len())).map(x => t(x))).flatten())
  })
}

#{
  let cp = cfg.comite_programa
  // Revisores del CMS (hoja "Revisores" del export); si no vienen, la config.
  let miembros = if data.at("comite_programa", default: ()).len() > 0 {
    data.comite_programa
  } else {
    cp.miembros.sorted(key: m => lower(m.at(0)))
  }
  let n = cp.filas_por_pagina
  let paginas = range(calc.max(1, calc.ceil(miembros.len() / n))).map(k =>
    miembros.slice(k * n, calc.min(miembros.len(), (k + 1) * n)))
  for (k, lista) in paginas.enumerate() {
    pagebreak()
    if k == 0 { marcador(2, cp.titulo) }
    text(size: s(20pt), weight: "bold", cp.titulo)
    salto(26.7pt, r(12pt))
    pad(left: 25pt, {
      set text(font: SERIF, size: r(12pt))
      set par(justify: false)
      grid(columns: (220pt, auto), row-gutter: 16.7pt - ALTO-CAP * r(12pt),
        ..lista.map(m => (t(m.at(0)), t(m.at(1)))).flatten())
    })
  }
}

// ---------------------------------------------------------------------------
// xv... Índice de resúmenes
// ---------------------------------------------------------------------------
#let pag-de(etiqueta) = context {
  let q = query(label(etiqueta))
  if q.len() > 0 { counter(page).at(q.first().location()).first() } else { "?" }
}

#a-impar()
#set page(margin: (inside: m-int, outside: m-ext, top: m-sup, bottom: m-inf))
#estilo("indice")
#marcador(1, cfg.indice.titulo)
// El título de la primera página sube por sobre el margen, como en 2019.
#v(-19.9pt)
#align(center, text(size: s(30pt), cfg.indice.titulo))
#salto(30.7pt, s(9pt))
#{
  set par(justify: true, leading: lead(s(8pt), 9.6pt), spacing: lead(s(8pt), 9.6pt))
  let fila-fuerte(x, etq) = (
    pad(left: 4pt, text(size: s(9pt), weight: "bold", x)),
    align(right, text(size: s(9pt), weight: "bold", pag-de(etq))),
  )
  let filas = ()
  for tr in data.tracks {
    filas.push(fila-fuerte([#tr.numero. #tr.titulo], tr.etiqueta))
    for it in tr.items {
      if it.tipo == "subtema" {
        filas.push(fila-fuerte(it.titulo, it.etiqueta))
      } else {
        filas.push((
          pad(left: 18.2pt, text(size: s(8pt), lang: it.idioma, [#it.numero. #t(it.titulo) #box(it.sufijo)])),
          align(right, text(size: s(8pt), pag-de(it.etiqueta))),
        ))
      }
    }
  }
  // 13.8 pt de línea base a línea base entre entradas (2019).
  grid(columns: (1fr, 34pt), column-gutter: 8pt, row-gutter: 13.8pt - ALTO-CAP * s(8pt),
    ..filas.flatten())
}

// ---------------------------------------------------------------------------
// 27... Resúmenes por track
// ---------------------------------------------------------------------------
#a-impar()
#set page(numbering: "1")
#estilo("resumenes")

// Número colgado: el texto de las líneas siguientes se alinea con el
// primer carácter del título, a la distancia del número + 5.5 pt (2019).
#let con-numero(numero, cuerpo, base, separacion, contenido) = context {
  let etq = [#numero.]
  let sangria = measure(text(size: cuerpo, weight: "bold", etq)).width + separacion
  par(justify: true, leading: lead(cuerpo, base), hanging-indent: sangria,
    text(size: cuerpo, weight: "bold", box(width: sangria, etq) + contenido))
}

#let titulo-track(tr) = block(sticky: true, width: 100%,
  con-numero(tr.numero, s(14pt), 16.8pt, 8pt, upper(tr.titulo)))

#let titulo-resumen(it) = block(sticky: true, width: 100%, {
  set text(lang: it.idioma)
  con-numero(it.numero, s(12pt), 14pt, 5.5pt, [#t(it.titulo) #box(it.sufijo)])
})

#let autores(it) = block(sticky: true, width: 100%,
  par(justify: true, leading: lead(s(10pt), 14pt), text(size: s(10pt), weight: "bold", it.autores)))

#let resumen(it) = {
  set text(size: s(11pt), lang: it.idioma)
  set par(justify: true, leading: lead(s(11pt), 14pt), spacing: lead(s(11pt), 14pt),
    first-line-indent: (amount: 14.2pt, all: true))
  for p in it.resumen { par(t(p)) }
}

#for (k, tr) in data.tracks.enumerate() {
  if k > 0 { pagebreak(weak: true) }
  [#metadata(tr.numero)#label(tr.etiqueta)]
  marcador(1, [#tr.numero. #tr.titulo])
  titulo-track(tr)
  let despues-de-titulo = true
  for it in tr.items {
    if it.tipo == "subtema" {
      salto(28pt, s(14pt))
      [#metadata(it.titulo)#label(it.etiqueta)]
      block(sticky: true, width: 100%,
        align(center, cursiva(text(size: s(14pt), weight: "bold", upper(it.titulo)))))
      despues-de-titulo = true
      continue
    }
    salto(if despues-de-titulo { 27.5pt } else { 27.1pt }, s(12pt))
    despues-de-titulo = false
    [#metadata(it.id)#label(it.etiqueta)]
    marcador(2, it.numero + ". " + it.titulo + " " + it.sufijo)
    titulo-resumen(it)
    salto(22.8pt, s(10pt))
    autores(it)
    salto(20pt, s(11pt))
    resumen(it)
  }
}

// ---------------------------------------------------------------------------
// Índice de autores
// ---------------------------------------------------------------------------
#a-impar()
#estilo("autores")
#marcador(1, cfg.indice_autores.titulo)
#v(-19.9pt)
#text(size: s(30pt), weight: "bold", cfg.indice_autores.titulo)
#salto(28pt, r(12pt))
#{
  set text(font: SERIF)
  set par(justify: false, leading: lead(r(10pt), 12pt), spacing: lead(r(10pt), 12pt), hanging-indent: 18pt)
  columns(2, gutter: 14pt, {
    for (k, g) in data.autores.enumerate() {
      if k > 0 { salto(21.6pt, r(12pt)) }
      block(sticky: true, text(size: r(12pt), g.letra))
      salto(19.2pt, r(10pt))
      for e in g.entradas {
        par(text(size: r(10pt), {
          e.clave
          h(0.55em)
          context e.etiquetas.map(x => {
            let q = query(label(x))
            if q.len() > 0 { counter(page).at(q.first().location()).first() } else { 0 }
          }).dedup().sorted().map(str).join(", ")
        }))
      }
    }
  })
}

// ---------------------------------------------------------------------------
// Contraportada (última página, par)
// ---------------------------------------------------------------------------
#a-par()
#page(margin: 0pt, background: none)[
  #estilo("nada")
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
