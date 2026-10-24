---
name: perfiles-autores-clagtee
description: Arma el perfil de intereses de cada autor de CLAGTEE 2026 a partir de sus papers en el congreso (títulos y abstracts del CMS) y de su perfil de Google Scholar verificado, con sus compromisos en el programa (cuándo presenta, modera o es panelista). Es la base para que una IA proponga a cada autor un programa personalizado. Usar cuando pidan analizar o actualizar los perfiles o intereses de los autores, buscar sus Google Scholar, o preparar los datos para el programa personalizado.
---

# Perfiles de intereses de los autores CLAGTEE 2026

Tres pasos, todos desde la raíz del repo:

| Paso | Qué hace | Salida |
|---|---|---|
| `scripts/extraer_autores.py` | Lee `data/programa2026.json` (y el export del CMS si se pasa) y arma la lista de personas con sus papers, coautores, sesiones que modera y paneles; la reparte en lotes por grupos de coautoría | `scratch/perfiles-autores/` (`autores.json`, `lotes/`, `reporte-autores.md`) |
| Análisis por lote (agentes) | Busca y verifica el Google Scholar de cada autor y sintetiza sus intereses, según `instrucciones-busqueda.md` | `datos/scholar/lote-NN.json` |
| `scripts/construir_perfiles.py` | Une todo en un perfil por persona | `datos/perfiles-autores.json`, `perfiles-autores.md`, `reporte-perfiles.md` |

`datos/` se versiona: el análisis de Scholar es caro de rehacer. `scratch/`
no. La carpeta `.claude/` no se despliega en Vercel.

## 1. Lista de autores

```bash
python3 .claude/skills/perfiles-autores-clagtee/scripts/extraer_autores.py \
  --papers RUTA/clagtee2026_papers_todos-completo_AAAAMMDD_HHMM.xlsx
```

`--papers` es opcional pero recomendado: aporta los abstracts (inglés IEEE u
original) y la afiliación y país de cada autor, que ayudan a verificar su
Scholar. Es el mismo Excel que usa el libro de actas (Exportar a Excel, todos
los papers); reutiliza su lector. Los emails solo sirven para deducir el país
y no se escriben en ningún archivo.

Leer `reporte-autores.md`: la sección "Nombres que podrían ser la misma
persona" lista variantes ("Juan Tapia" / "Juan A. Tapia"). Si son la misma
persona, agregarlas a `[alias]` de `config/perfiles.toml` y volver a correr.
Dos nombres que firman un mismo paper nunca se proponen como duplicados.

Los lotes son deterministas: con el mismo programa y alias salen iguales, así
que los `datos/scholar/lote-NN.json` ya hechos siguen valiendo. Si cambian
los autores (programa nuevo o alias nuevos), los lotes cambian: rehacer solo
los autores nuevos y mover los existentes por `id` (construir_perfiles.py
busca cada `id` en todos los lotes, no importa en cuál esté).

## 2. Análisis por lote

Un agente por lote (corren en paralelo), cada uno con las instrucciones de
`instrucciones-busqueda.md`. Resumen de cómo se busca:

- La búsqueda de autores de Google Scholar exige login y `curl` recibe un
  captcha. Lo que sí funciona: WebSearch con
  `allowed_domains: ["scholar.google.com"]` para encontrar la URL del perfil,
  y WebFetch sobre `citations?hl=en&user=<ID>` para leerlo.
- Cada perfil se verifica (coautores en común, misma línea de trabajo, dominio
  del email) y lleva su confianza: `alta`, `media` o `baja`. Los de confianza
  baja quedan registrados pero no se usan para los intereses.
- Sin Scholar (frecuente en estudiantes), los intereses salen de sus papers
  CLAGTEE y del grupo de sus coautores.
- OpenAlex y Semantic Scholar sirven poco desde la nube: la IP compartida
  agota la cuota gratuita (429).
- **Cupo de WebSearch:** unas 200 búsquedas por turno, compartidas por todos
  los agentes lanzados en ese turno. Con 11 agentes a la vez la primera
  pasada se cortó a un tercio. Lanzar por tandas, dándole a cada agente un
  presupuesto explícito cuya suma no pase de ~190 (en 2026: lotes 01-05 con
  37 cada uno y, en el turno siguiente, 06-11 con 31), y aprovechar la barra
  de coautores de los perfiles ya verificados, que se lee con WebFetch sin
  gastar cupo. Ver "Pasadas siguientes" en `instrucciones-busqueda.md`.

Para rehacer un autor puntual, editar su objeto en el lote correspondiente o
pedirle a un agente solo ese `id`.

## 3. Perfiles

```bash
python3 .claude/skills/perfiles-autores-clagtee/scripts/construir_perfiles.py
```

Revisar `datos/reporte-perfiles.md`: cobertura, la lista "Revisar a mano"
(ambiguos y confianza baja, con el enlace al candidato) y avisos de formato.

Cada perfil de `perfiles-autores.json` trae:

- `papers`: sus papers en CLAGTEE con track, sesión y abstract (si hubo
  export del CMS).
- `rol` y `compromisos`: dónde presenta, modera o es panelista, con fecha y
  hora. El programa personalizado no debe proponerle sesiones que choquen.
- `scholar`: URL, afiliación, intereses declarados, citas, h-index, hasta 12
  publicaciones y la evidencia de la verificación.
- `intereses`: temas, palabras clave, métodos y aplicaciones (en inglés, como
  los títulos del programa), `afinidad_tracks` (0-1 por track oficial),
  `etapa` (estudiante ... investigador senior) y un `resumen` en español.

Estado al 24-oct-2026: 299 personas; 98 con Scholar usable (86 alta, 12
media), 3 dudosos (confianza baja o ambiguo, no se usan) y 198 sin perfil,
con intereses sacados de sus papers y del grupo de coautores. Sin abstracts
todavía.

## Sumar los abstracts después

Si el análisis se hizo sin el export del CMS (`reporte-perfiles.md` lo dice),
correr el paso 1 con `--papers` y repetir el análisis solo para refinar
`intereses` con los abstracts: los datos de Scholar ya verificados se
conservan.
