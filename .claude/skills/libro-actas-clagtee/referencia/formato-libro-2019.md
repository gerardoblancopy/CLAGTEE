# Formato del "Book of Abstracts CLAGTEE 2019" (referencia)

Especificación medida sobre `Book_of_abstracts_CLAGTEE_2019.pdf` (Adobe InDesign
CC 2015, 84 páginas PDF). La plantilla `plantilla/libro.typ` reproduce estas
medidas; si algo cambia, se cambia aquí y en la plantilla.

Coordenadas en puntos (pt, 1 pt = 0,3528 mm), medidas desde el borde
**superior** de la página salvo que se diga otra cosa.

## Formato físico

| Elemento | Valor |
|---|---|
| Página | 425,197 × 623,622 pt = **150 × 220 mm** |
| Margen interior (lomo) | 85 pt (30 mm) |
| Margen exterior | 36 pt (12,7 mm) |
| Ancho de caja | 304,2 pt (107 mm) |
| Primera línea base (cuerpo) | ~106 pt |
| Última línea base | 568 pt (55,6 pt sobre el borde inferior) |
| Líneas por página | 34 (interlineado 14 pt) |
| Distribución del PDF | Portada sola, páginas enfrentadas (par izq. / impar der.) y contraportada sola |

Las páginas impares (recto) llevan el lomo a la izquierda; las pares (verso), a
la derecha. El folio va siempre en el borde exterior.

## Tipografías

| Uso | 2019 | Sustituta libre incluida | Factor de cuerpo |
|---|---|---|---|
| Texto general, títulos, índice | Nirmala UI / Nirmala UI Bold | Open Sans | 0,945 |
| Comité de programa, índice de autores | Minion Pro | Crimson Text | 1,03 |
| Portada | Modernica Bold | Montserrat Bold | 0,79 |

El factor iguala el **ancho** del texto (medido con las tablas de anchos del
PDF 2019). Si la fuente original está instalada, el script usa factor 1.

## Colores (portada y páginas de logo)

| Uso | Hex |
|---|---|
| Morado de fondo (diagonal, triángulos) | `#361e59` |
| Morado claro (grilla de puntos, franjas) | `#462768` |
| "CLAGTEE 2019" | `#2f2364` |
| Subtítulo del congreso | `#2b367d` |
| "BOOK OF ABSTRACTS", "Sponsors", ciudad | `#355c9d` |
| Fechas | `#482c7a` |
| URL | `#818181` |

## Secuencia de páginas

| Pág. | Contenido | Folio |
|---|---|---|
| i | Portada | no |
| ii | En blanco | no |
| iii | Torre grande + "CLAGTEE 2019" + "Sponsors" + logos; triángulos morados en esquina sup. izq. (115 × 81 pt) e inf. der. (88 × 64 pt) | no |
| iv | DATA OF PUBLICATION (ficha ISBN) | no |
| v–vi | Preface (firma centrada en cursiva) | sí |
| vii | Date / Place / Home page / Informations + viñetas | sí |
| viii | En blanco | no |
| ix | Objective + History of the congress | sí |
| x | Lista de ediciones anteriores (viñetas) | sí |
| xi | Organization committee / Local organizing committee / Conference secretary | sí |
| xii–xiii | Program Committee Members (título repetido en cada página) | sí |
| xiv | En blanco | no |
| xv–xxv | Index of abstracts | sí + "Index of Abstracts" |
| xxvi | En blanco | no |
| 27–156 | Resúmenes por track | sí + título corrido + filete + pie |
| 157–164 | Author Index (2 columnas) | sí |
| (165) | En blanco | no |
| contraportada | Logos UNESP, UNMdP, PUCV + "Sponsors" + logos | no |

Reglas: Preface, la página de información, Objective, el índice, el primer
track y el índice de autores empiezan en página **impar**; si hace falta se
deja una página par en blanco y sin folio. Cada track empieza en página nueva
(par o impar). La numeración es continua: romanos en las preliminares y
arábigos desde los resúmenes, sin reiniciar el contador (xxv → 27).

## Portada (página i)

- Diagonal morada superior: polígono (0,0) – (425,2; 0) – (425,2; 32,1) –
  (0; 320,8). Triángulo morado inferior derecho: (425,2; 561,5) – (425,2;
  623,6) – (338,6; 623,6).
- Decoración sobre el morado, en `#462768`: grilla en escalera de cuadrados y
  cruces de 4,3 pt (paso 11,6 × 9,4 pt, 10 filas desde (7; 21,7)), franjas
  redondeadas a 45° a la izquierda (y ≈ 140–200) y un "peine" arriba a la
  derecha. Tres anillos blancos (Ø ≈ 10 pt, trazo 2,4 pt) en (184; 24),
  (347; 48) y (115; 171).
- Logo blanco "Escuela de Ingeniería Eléctrica + PUCV": x 63, y 31, ancho
  262 pt.
- Torre CLAGTEE: x 130, y 200, ancho 166 pt.
- "CLAGTEE 2019": Modernica Bold 17,25 pt, línea base 340,7, x 114,1.
- Subtítulo en dos líneas, mayúsculas, 9,58 pt, líneas base 352,2 y 363,7:
  "XIII LATIN-AMERICAN CONGRESS ON ELECTRICITY" / "GENERATION AND TRANSMISSION".
- "BOOK OF ABSTRACTS": 27,78 pt, centrado, línea base 421,2 (ancho 251 pt).
- Fechas ("October 20th - 23rd, 2019") centradas, línea base ≈ 480; ciudad
  ("Santiago de Chile") ≈ 494.
- Fila de logos (PUCV color, UNESP, UNMdP) entre y 517 y 577.
- URL ("www.clagtee2019.pucv.cl"), gris, ≈ 16 pt, x 27, línea base ≈ 606.

## Cabeceras y pies

| Página | Cabecera | Pie |
|---|---|---|
| Preliminares e índice de autores | Folio 12 pt, línea base 68,2, borde exterior | — |
| Índice de resúmenes | Folio 12 pt + "Index of Abstracts" 12 pt hacia el lomo | — |
| Resúmenes | Folio 12 pt (base 68,2) + título corrido 7 pt hacia el lomo (base 66,7) + filete 1 pt de todo el ancho de caja (y 70,3–71,3) | "• PUCV 2019 •" 8 pt, centrado en la caja, línea base 592 |
| En blanco, portada, iii, iv | — | — |

Título corrido 2019: "XIII Latin-American Congress on Electric Power
Generation, Transmission and Distribution".

## Preliminares

- **DATA OF PUBLICATION** (iv): 10 pt / 14 pt, primera línea base 246;
  "DATA OF PUBLICATION" e "ISBN: …" en negrita. Nota al pie en 6,5 pt.
- **Preface** (v): título 24 pt negrita, línea base 92; texto 12 pt / 14 pt
  justificado, sin sangría ni espacio entre párrafos; primera línea base 120.
  Firma centrada en cursiva tras una línea en blanco.
- **Información** (vii): 12 pt / 14 pt, primera línea base 246; rótulos
  "Date:", "Place:", "Home page:", "Informations:" en negrita; viñetas con
  sangría 14,2 pt a 18 pt de interlineado.
- **Objective / History** (ix): títulos 20 pt negrita (base 92); texto 12/14
  justificado, línea en blanco entre párrafos.
- **Ediciones** (x): viñetas 10 pt / 12 pt, sangría francesa 18 pt, 23,4 pt
  base a base entre ítems.
- **Comités** (xi): títulos 20 pt; tablas 11 pt a 16 pt de interlineado,
  columnas Apellido, Nombre | Institución (País) o email | Cargo.
- **Program Committee Members** (xii–xiii): título 20 pt; Minion Pro 12 pt,
  16,7 pt de interlineado, sangría 25 pt, columna de país a ~220 pt; 27 filas
  por página; orden alfabético por apellido.

## Índice de resúmenes

- Primera página: "Index of abstracts" 30 pt regular, centrado, línea base 99,8.
- Tabla de dos columnas: texto y página (alineada a la derecha, ~34 pt).
- Track: negrita 9 pt, sangría 4 pt, página en negrita. Subtema (p. ej.
  "Solar Energy"): igual que track, sin número.
- Resumen: 8 pt / 9,6 pt justificado, sangría 18,2 pt:
  "1.1. Título. (ID12)".
- 13,8 pt base a base entre entradas.

## Resúmenes

| Elemento | Formato |
|---|---|
| Track | Nirmala UI Bold 14 pt / 16,8, MAYÚSCULAS, "1. TÍTULO", número colgado (sangría = número + 8 pt) |
| Subtema | Bold Italic 14 pt, MAYÚSCULAS, centrado |
| Título del resumen | Bold 12 pt / 14, justificado, "1.1. Título. (ID12)", número colgado (número + 5,5 pt) |
| Autores | Bold 10 pt / 14, justificado, "A, B and C" (nombre completo, en el orden del paper) |
| Resumen | Regular 11 pt / 14, justificado con partición silábica, sangría de primera línea 14,2 pt (5 mm) |

Espacios base a base: track → primer título 27,5; título → autores 22,8;
autores → resumen 20; fin de resumen → siguiente título 27,1; track →
subtema ≈ 28; subtema → título ≈ 29,5.

Orden: tracks numerados; dentro de cada track, por número de ID ascendente.
Título y autores nunca quedan separados del comienzo del resumen; el resumen
sí puede continuar en la página siguiente.

## Índice de autores

- Primera página: "Author Index" Nirmala UI Bold 30 pt, alineado a la
  izquierda, línea base 99,8.
- Dos columnas (paso 158 pt). Letra separadora Minion 12 pt; entradas Minion
  10 pt / 12 pt, "Apellido, I  27, 31" (dos espacios), sangría francesa en
  las líneas que continúan.
- Orden alfabético sin distinguir tildes ni mayúsculas; las partículas
  ("da", "de", "dos", "di") cuentan para ordenar ("da Silva" va en la D).
- Páginas: la página donde empieza cada resumen del autor.

## Contraportada

Logos UNESP (arriba izq.), UNMdP (arriba der.), PUCV (centro, y ≈ 155–212),
"Sponsors" centrado (≈ 314) y logos de patrocinadores debajo (≈ 370–560).
