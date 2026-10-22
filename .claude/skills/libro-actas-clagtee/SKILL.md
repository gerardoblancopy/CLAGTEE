---
name: libro-actas-clagtee
description: Genera el Libro de Resúmenes / libro de actas ("Book of Abstracts") de CLAGTEE 2026 en PDF con el mismo formato y estilo del Book of Abstracts CLAGTEE 2019 (150 × 220 mm, portada morada con la torre, preliminares, índice por track, resúmenes, índice de autores y contraportada), a partir del Excel que exporta el CMS o del JSON de /api/papers; y el Libro del Programa ("Conference Program") con la misma identidad, a partir de la planilla del programa (CLAGTEE2026_Programa_vN.xlsx). Usar cuando pidan el libro de actas, libro de resúmenes, book of abstracts, proceedings locales, libro o folleto del programa del congreso, o cambiar su contenido (prefacio, comités, ISBN, patrocinadores).
---

# Libro de Resúmenes CLAGTEE 2026 (formato 2019)

El libro se arma con tres piezas, todas dentro de esta carpeta:

| Pieza | Qué contiene |
|---|---|
| `config/clagtee2026.toml` | Todo el contenido fijo: portada, ficha ISBN, prefacio, información, objetivo, historia, comités, patrocinadores, tracks |
| `plantilla/libro.typ` | Plantilla Typst que replica el formato 2019 (medidas en `referencia/formato-libro-2019.md`) |
| `scripts/generar_libro.py` | Lee los papers, los ordena y numera, arma el índice de autores, escribe un reporte y compila el PDF |

`plantilla/comun.typ` tiene lo que comparten los dos libros (formato de
página, fuentes, portada, página de patrocinadores y contraportada). El Libro
del Programa se arma aparte: ver [Libro del Programa](#libro-del-programa).

`assets/` trae las fuentes libres (Open Sans, Crimson Text, Montserrat, con su
licencia OFL) y los logos: torre CLAGTEE, PUCV/EIE blanco, PUCV color, UNESP y
UNMdP, recortados del libro 2019. Los patrocinadores salen de `public/sponsors/`.

## Flujo

Ejecutar todo desde la raíz del repositorio.

### 1. Dependencias

```bash
python3 -c "import typst, openpyxl, pypdf" 2>/dev/null || pip install typst openpyxl pypdf
```

Python 3.11 o superior. `pdftoppm` (poppler) es opcional, solo para las
vistas previas PNG.

### 2. Conseguir los papers

Lo normal es el Excel del CMS: en el panel de staff o chair, sección de
papers, **Exportar a Excel** con la opción de todos los papers (genera
`clagtee2026_papers_todos-completo_AAAAMMDD_HHMM.xlsx` con una pestaña
"Aceptado (N)"). Pedírselo al usuario si no lo adjuntó; no inventar papers.

También sirve el JSON de `GET /api/papers` (requiere sesión de staff) o un
CSV con columnas `id`, `title`, `abstract`, `authors` (separados por `;`),
`track`, `status`.

El script toma solo los papers con estado aceptado. Por defecto usa el
título y abstract **en inglés** confirmados para IEEE (`--idioma en`); si un
paper no los tiene, cae al original y lo informa. Con `--idioma original`
usa los del envío (como en 2019, donde había resúmenes en español y
portugués). El Excel del CMS trae ambos: "Abstract (Envío Original)" y
"Abstract en Inglés (IEEE)". Los exports anteriores a octubre de 2026 no traen
abstracts: si el reporte lo indica, pedir un export nuevo.

### 3. Revisar datos antes de compilar

```bash
python3 .claude/skills/libro-actas-clagtee/scripts/generar_libro.py \
  --papers RUTA/AL/EXPORT.xlsx --solo-datos
```

Leer `scratch/libro-actas/reporte.md` y resolver con el usuario:

- **Pendientes de configuración** (valores que empiezan con `TODO`): ISBN,
  editores de la ficha, secretaría, Comité de Programa. Mientras sigan así se
  imprimen en rojo en el PDF.
- **Advertencias de datos**: papers sin abstract en inglés, sin autores,
  track no reconocido (van a "Other Contributions"), IDs repetidos.
- **Índice de autores**: el CMS guarda el nombre completo en un solo campo,
  así que el apellido se deduce. La regla: último apellido en nombres
  brasileños o portugueses (email `.br`/`.pt`, "Universidade"), dos apellidos
  en nombres hispanos de 4 palabras, partículas incluidas ("de Souza", "dos
  Santos") y sufijos unidos ("Silva Junior"). Los nombres hispanos de 3
  palabras son ambiguos y salen en una tabla aparte. Revisar esa tabla y
  `indice-autores.csv`; corregir lo que haga falta en
  `[indice_autores.correcciones]` del .toml:

  ```toml
  [indice_autores.correcciones]
  "Jorge Mendoza Baeza" = "Mendoza, J"
  "Juan Manuel Vignerte" = "Vignerte, J"
  ```

  Las variantes con y sin tilde de una misma entrada ("Aguero, C" /
  "Agüero, C") se fusionan solas y se informan.

Para quitar papers (retirados, no presentados) usar `[seleccion].excluir`.
Para dejar solo los que tienen inscripción en el CMS: `--requiere-inscripcion`.

### 4. Compilar

```bash
python3 .claude/skills/libro-actas-clagtee/scripts/generar_libro.py \
  --papers RUTA/AL/EXPORT.xlsx --pliegos --vista-previa 1,3,5,13,23-24
```

Salida en `scratch/libro-actas/` (carpeta ignorada por git; los PDF no se
suben al repo):

- `CLAGTEE2026_Book_of_Abstracts.pdf`: página por página, para imprenta.
- `CLAGTEE2026_Book_of_Abstracts_pliegos.pdf` (`--pliegos`): portada sola,
  páginas enfrentadas y contraportada sola, como el PDF 2019 para pantalla.
- `vista-previa/*.png`, `libro.json`, `reporte.md`, `indice-autores.csv`.

La salida tiene que quedar dentro del repo: Typst solo lee archivos bajo su
raíz, que es la raíz del repositorio.

### 5. Verificar

Abrir las vistas previas (Read sobre los PNG) y revisar:

- [ ] Portada: diagonal morada, logo PUCV/EIE, torre, "CLAGTEE 2026",
      subtítulo en 2 líneas, BOOK OF ABSTRACTS, fechas, ciudad, 3 logos, URL.
- [ ] Preface, Información, Objective, Index of abstracts, primer track y
      Author Index empiezan en página impar; las pares intermedias están en
      blanco y sin folio.
- [ ] Folios romanos en preliminares, arábigos desde los resúmenes, sin
      reinicio.
- [ ] Páginas de resúmenes: título corrido de 7 pt hacia el lomo, filete,
      folio exterior y "• PUCV 2026 •".
- [ ] Ningún título de resumen queda solo al pie de página.
- [ ] Los números de página del índice y del índice de autores coinciden con
      el cuerpo (abrir 2 o 3 al azar).
- [ ] La contraportada es la última página y es par.
- [ ] El reporte no tiene pendientes antes de la versión final.

Para comparar con el original, el PDF 2019 está en la carpeta de uploads del
usuario si lo adjuntó; las medidas están en `referencia/formato-libro-2019.md`.

## Cambiar contenido

Todo lo editorial está en `config/clagtee2026.toml`, con comentarios. Lo más
común:

- `[publicacion]`: ficha ISBN de la página iv (`editores`, `isbn`,
  `lineas_extra`, `nota_pie`).
- `[prefacio]`: texto y firma. El texto actual es un borrador adaptado del
  prefacio 2019 con los datos 2026 del sitio: confirmarlo con el comité.
- `[[comites]]`: tablas de la página xi.
- Comité de Programa: sale de la hoja "Revisores (N)" del Excel del CMS
  (revisores registrados, con trabajos asignados y evaluaciones enviadas). El
  script arma "Apellido, Nombre" y deduce el país de la afiliación o del
  dominio del email; lo que no pudo deducir queda en el reporte y se corrige
  en `[comite_programa.correcciones]`. `[comite_programa].solo_con_evaluaciones = true`
  (o `--revisores-con-evaluaciones`) deja solo a quienes enviaron al menos
  una evaluación; `[comite_programa].incluir` agrega revisores puntuales
  aunque no tengan evaluaciones en el CMS. Si el Excel no trae esa
  hoja, se usa `[comite_programa].miembros` del .toml.
  `[comite_programa].excluir` saca revisores puntuales y
  `mostrar_pais = false` imprime solo los nombres.
- `[correcciones_papers]`: título o abstract por ID cuando en el CMS falta o
  está mal (`"BIO-3" = { titulo = "..." }`); gana sobre el export.
- `[patrocinadores]`: logos y alto en pt.
- `[[tracks]]`: los 13 tracks oficiales con su título en es/en/pt; el CMS
  guarda el título en español y el libro imprime el inglés.
  `[seleccion].numeracion_tracks = "secuencial"` renumera 1, 2, 3... como
  en 2019 si algún track queda vacío.
- `[libro].formato_id`: cómo se muestra el ID al final del título
  (`"(ID {id})"` → "(ID PLA-12)").

Los subtemas dentro de un track (como "Solar Energy" en 2019) salen si los
papers traen una columna o campo `subtema`.

## Fuentes

El 2019 usó Nirmala UI, Minion Pro y Modernica, que son comerciales y no se
pueden subir al repo. El script busca cada familia en el sistema, en
`assets/fonts-locales/` (ignorada por git, ver su `LEEME.md`) y en las
carpetas pasadas con `--fuentes`. La usa solo si encuentra todas las
variantes que el libro necesita: Nirmala UI regular **y** negrita, Minion Pro
regular, Modernica negrita. Si falta alguna, avisa y usa Open Sans, Crimson
Text o Montserrat (incluidas), con un factor de cuerpo que iguala el ancho
del texto al original (`[fuentes].escala_sustituta`). Con ese factor, los
resúmenes cortan las líneas en las mismas palabras que en 2019.

Si el usuario sube las fuentes (por ejemplo, un .zip), descomprimirlas en una
carpeta aparte y copiar los .ttf/.otf/.ttc a `assets/fonts-locales/`; al
compilar, el script dice qué familia usó y qué variante falta. En una
sesión nueva en la nube esa carpeta empieza vacía y hay que volver a copiarlas.

Nirmala UI no tiene cursiva; la firma del prefacio y los subtemas se inclinan
como hacía InDesign en 2019.

## Libro del Programa

El folleto del programa ("Conference Program") usa la misma portada,
página de patrocinadores y contraportada, con `scripts/generar_programa.py`
y `plantilla/programa.typ`. Todo sale de la planilla del programa que arma
la organización (`CLAGTEE2026_Programa_vN.xlsx`):

- Hojas por día (`Miércoles 28`, `Jueves 29`...): una tabla por sala con
  eventos comunes (registro, keynote, plenarias, coffee, cena, cierre),
  sesiones (`SESSION S1A`, tracks, `Chair:`) y cada ponencia (hora, código,
  título, presentador). Los eventos comunes se toman de la sala principal; si
  otra sala dice algo distinto, el reporte lo avisa.
- `Ponencias (interno)`: autores del CMS, país y estado de cada código.
- `Programa General`: título, fechas, ciudad, sede y duración de las
  ponencias (primeras filas).

```bash
python3 .claude/skills/libro-actas-clagtee/scripts/generar_programa.py \
  --programa RUTA/CLAGTEE2026_Programa_v7.xlsx --pliegos --vista-previa 1-6
```

Salida en `scratch/libro-actas/programa/`: el PDF, la versión en pliegos,
`programa.json` y `reporte-programa.md`. Revisar el reporte con el usuario:
eventos que difieren entre salas, presentadores que no figuran entre los
autores del CMS (se imprimen como "Presenter"), cupos vacíos, ponencias
"por confirmar" y nombres ambiguos del índice de autores.

Contenido: portada, patrocinadores, información general (más
`[[programa.actividades]]` del .toml, p. ej. el pre-congreso), programa de un
vistazo, keynote y plenarias, por día una grilla hora × sala y el detalle de
cada sesión (chair, horario, título, autores con el presentador subrayado),
tracks, índice de autores con sus sesiones (en negrita, donde presenta) y
contraportada. Si hace falta, agrega páginas de notas para que el total sea
múltiplo de `[programa].multiplo_paginas` (4, cuadernillo).

Los títulos de `[correcciones_papers]` y los nombres de
`[indice_autores.correcciones]` valen para los dos libros.

## Prueba rápida

```bash
python3 .claude/skills/libro-actas-clagtee/scripts/generar_libro.py \
  --papers .claude/skills/libro-actas-clagtee/ejemplos/papers-ejemplo.json \
  --salida scratch/libro-actas/ejemplo --pliegos
```

`ejemplos/papers-ejemplo.json` tiene 7 papers ficticios (uno rechazado, uno
en español, uno en portugués, subtemas) para probar cambios a la plantilla.
