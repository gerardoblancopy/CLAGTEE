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

#import "comun.typ": *

#let data = json(sys.inputs.at("data"))

// ---------------------------------------------------------------------------
// Márgenes (pt) del libro 2019
// ---------------------------------------------------------------------------
#let m-int = 85pt        // margen interior (lomo)
#let m-ext = 36pt        // margen exterior
#let m-sup = 98.4pt      // margen superior: índice, resúmenes, índice de autores
#let m-sup-pre = 76pt    // margen superior: páginas preliminares
#let m-inf = 55.6pt      // margen inferior (hasta la última línea base)
#let ancho = W - m-int - m-ext

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
#portada(cfg.libro.titulo, marca: estilo("nada"))

// ---------------------------------------------------------------------------
// ii (en blanco) · iii. Logo y patrocinadores
// ---------------------------------------------------------------------------
#page(background: none)[#estilo("nada")]
#pagina-patrocinadores(marca: estilo("nada"))

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
    // Misma letra que las tablas de comités (en 2019 era Minion Pro 12 pt).
    salto(26pt, s(11pt))
    pad(left: 4pt, {
      set text(size: s(11pt))
      set par(justify: false)
      if cp.at("mostrar_pais", default: true) {
        grid(columns: (1fr, auto), column-gutter: 14pt, row-gutter: 16pt - ALTO-CAP * s(11pt),
          ..lista.map(m => (t(m.at(0)), t(m.at(1)))).flatten())
      } else {
        grid(columns: 1, row-gutter: 16pt - ALTO-CAP * s(11pt), ..lista.map(m => t(m.at(0))))
      }
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
#contraportada(marca: estilo("nada"))
