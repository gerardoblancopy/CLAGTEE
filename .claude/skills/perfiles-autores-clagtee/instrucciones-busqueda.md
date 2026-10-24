# Instrucciones para buscar y analizar perfiles (un lote)

Contexto: CLAGTEE 2026 (Congreso Latinoamericano de Generación y Transporte de
Energía Eléctrica, Santiago de Chile, 28-30 oct 2026). Para cada autor se arma
un perfil de intereses que después usará una IA para proponerle un programa
personalizado (qué sesiones y papers del congreso le conviene ver).

## Entrada

`scratch/perfiles-autores/lotes/lote-NN.json`: lista de autores con sus papers
en CLAGTEE (código, título, track, abstract si existe), coautores, sesiones que
modera (chair) y paneles. La afiliación y el país vienen vacíos si no se usó el
export del CMS.

## Por cada autor

1. **Buscar el perfil de Google Scholar** con WebSearch
   (`allowed_domains: ["scholar.google.com"]`, `mode: "standard"`): nombre
   completo y, si no aparece, nombre + 2-3 palabras del tema del paper, o la
   forma corta del nombre (primer nombre + primer apellido; en nombres
   brasileños, primer nombre + último apellido). Máximo 3 búsquedas por autor.
   La búsqueda interna de Scholar (`view_op=search_authors`) exige login: no
   usarla.
2. **Leer el perfil candidato** con WebFetch sobre
   `https://scholar.google.com/citations?hl=en&user=<ID>` pidiendo: nombre,
   afiliación, dominio de email verificado, intereses, citas totales y desde
   2021, h-index, y título + año + citas de las publicaciones listadas.
3. **Verificar identidad** antes de aceptarlo. Confianza:
   - `alta`: el nombre coincide y hay evidencia directa: un coautor de CLAGTEE
     aparece en el perfil o en sus publicaciones, o una publicación es
     claramente la misma línea del paper CLAGTEE en el mismo grupo.
   - `media`: el nombre coincide y el tema y país son coherentes, sin
     evidencia directa.
   - `baja`: plausible pero dudoso (nombre común, tema distinto). Se registra
     pero NO se usa para los intereses.
   Si hay varios candidatos y no se puede decidir, `busqueda: "ambiguo"` y
   anotar los candidatos en `evidencia`.
4. **Si no tiene Scholar** (frecuente en estudiantes), una búsqueda web general
   (sin `allowed_domains`) con nombre + tema puede mostrar ORCID, Lattes,
   ResearchGate, IEEE Xplore o página institucional; anotarlas en
   `otras_fuentes` solo si coinciden con certeza. No gastar más de 1 búsqueda
   extra en esto.
5. **Analizar intereses** con: títulos (y abstracts) de sus papers CLAGTEE +
   Scholar (solo confianza alta o media) + otras fuentes. Sin Scholar, usar sus
   papers CLAGTEE y, como contexto de grupo, los intereses del perfil Scholar
   de un coautor senior del mismo paper (anotar `"grupo_coautores"` en `base`).
   No inventar: si la evidencia es poca, decirlo en el resumen.

No reutilizar perfiles de otro autor del lote salvo que sea la misma persona.
Los coautores comparten grupo: aprovechar lo que ya se encontró de uno para
verificar a otro (coautores listados en Scholar, mismo dominio de email).

## Tracks oficiales (para `afinidad_tracks`)

1 Power System Planning, Operation, and Reliability ·
2 Renewable Energy Integration, DER, and Storage ·
3 Power Electronics and Energy Conversion ·
4 Sensors, Metrology, and Advanced Monitoring ·
5 Telecommunications, Digital Networks, and Cybersecurity ·
6 Data Science, AI, and Advanced Computing ·
7 Electricity Markets, Economics, Regulation, and Energy Transition ·
8 Electrical Machines, Drives, and Actuators ·
9 Conventional Power Plants and Components ·
10 Alternative Power Plants and Components ·
11 Bioenergy and Hydrogen ·
12 Social and Economic Issues ·
13 Environmental and Ecological Issues

## Salida

Escribir `.claude/skills/perfiles-autores-clagtee/datos/scholar/lote-NN.json`
(mismo NN), un arreglo JSON con un objeto por autor del lote, en el mismo
orden. Reescribir el archivo cada ~5 autores para no perder avance. Validar al
final con `python3 -m json.tool <archivo> > /dev/null` y que estén todos los
`id` del lote.

```json
{
  "id": "katiani-pereira",
  "nombre": "Katiani Pereira",
  "busqueda": "encontrado | sin_perfil | ambiguo",
  "scholar": {
    "url": "https://scholar.google.com/citations?user=XXXXXXXXXXXX",
    "user_id": "XXXXXXXXXXXX",
    "nombre_perfil": "Katiani Pereira",
    "afiliacion": "UNESP - Ilha Solteira",
    "email_verificado": "unesp.br",
    "intereses_scholar": ["Power systems", "Protection"],
    "citas": 123,
    "citas_desde_2021": 100,
    "h_index": 5,
    "publicaciones": [{"titulo": "…", "anio": 2024, "citas": 10}],
    "confianza": "alta | media | baja",
    "evidencia": "Coautor Juan Manoel Home-Ortiz figura en el perfil; publica sobre protección de redes de distribución activas como PLA-21."
  },
  "otras_fuentes": [{"tipo": "ORCID | Lattes | ResearchGate | IEEE | institucional", "url": "…"}],
  "afiliacion_inferida": "Universidade Estadual Paulista (UNESP), Ilha Solteira",
  "pais_inferido": "Brasil",
  "intereses": {
    "temas": ["Protection coordination in active distribution networks", "…"],
    "palabras_clave": ["distributed generation", "overcurrent protection", "…"],
    "metodos": ["mixed-integer linear programming", "…"],
    "aplicaciones": ["distribution networks with EV charging", "…"],
    "afinidad_tracks": {"1": 0.9, "2": 0.6},
    "etapa": "estudiante | investigador_inicial | investigador_consolidado | investigador_senior | industria | desconocida",
    "resumen": "2-3 frases en español: qué investiga, con qué enfoque y qué le interesaría ver en el congreso.",
    "base": ["papers_clagtee", "abstracts_clagtee", "google_scholar", "otras_fuentes", "grupo_coautores"]
  }
}
```

Reglas de formato:

- `scholar` es `null` si `busqueda` es `sin_perfil`; con `ambiguo`, `null`
  salvo que un candidato tenga confianza baja (se deja con esa confianza).
- `publicaciones`: hasta 12, priorizando las más recientes (2020 en adelante)
  y las más citadas; títulos tal como aparecen.
- `temas` (3-6), `palabras_clave` (5-12), `metodos` y `aplicaciones` (0-6) en
  **inglés**, en minúscula salvo siglas, específicos ("unit commitment under
  wind uncertainty", no "power systems").
- `afinidad_tracks`: solo los tracks con afinidad ≥ 0.2, valores 0-1 con un
  decimal; el track de sus papers CLAGTEE suele ser el más alto.
- `etapa`: deducir de citas, h-index, años de publicación y cargo; sin datos,
  `desconocida`.
- `afiliacion_inferida` y `pais_inferido`: de Scholar, otras fuentes o
  coautores; cadena vacía si no se sabe.
- No incluir emails personales.

## Al terminar

Responder con un resumen breve: cuántos autores con Scholar (por confianza),
cuántos sin perfil, cuántos ambiguos, y cualquier caso dudoso que convenga
revisar a mano. No hacer commit ni push.

## Pasadas siguientes (autores pendientes)

WebSearch tiene un cupo de unas 200 búsquedas por turno, compartido por todos
los agentes que corren en paralelo. La primera pasada lo agotó a mitad de
camino y dejó autores con `busqueda: "pendiente"` (no se buscaron; distinto de
`sin_perfil`). Las pasadas siguientes:

- Trabajan solo sobre los `id` del lote que en
  `datos/scholar/lote-NN.json` están `pendiente`, `ambiguo` o faltan. Los
  demás objetos no se tocan. Cada objeto rehecho reemplaza al anterior en su
  lugar; los que faltan se insertan respetando el orden del lote de entrada.
- Tienen un **presupuesto fijo de WebSearch** (lo da el pedido). Contar cada
  llamada y, al llegar al tope, dejar el resto como `pendiente`.
- Ahorran búsquedas así, en este orden:
  1. **Barra de coautores.** Antes de buscar, leer con WebFetch los perfiles
     Scholar ya verificados del lote (confianza alta o media) y de los
     coautores ya encontrados en esta pasada, pidiendo la lista de coautores
     con su `user=` ID. Los perfiles que aparecen ahí se leen sin gastar
     búsquedas. WebFetch no consume el cupo de WebSearch.
  2. **Una búsqueda por autor** (nombre completo, o forma corta + tema). Una
     segunda solo si presenta en el congreso o si la primera dio un candidato
     plausible sin confirmar.
  3. En un grupo sin ningún perfil conocido, buscar primero al autor que
     parezca más senior (suele ir último en la lista de autores del paper) y
     seguir por su barra de coautores.
  4. La búsqueda web general (otras fuentes) solo para quienes presentan y no
     tienen Scholar, si sobra cupo.
- Si con una sola búsqueda no aparece nada, `busqueda: "sin_perfil"` y en
  `scholar` `null`; anotar en `nota_busqueda` (campo libre, opcional) qué se
  buscó.
