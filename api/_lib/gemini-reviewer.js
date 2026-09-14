import { Storage } from '@google-cloud/storage';

const getStorage = () => {
  const projectId = process.env.GCS_PROJECT_ID;
  const clientEmail = process.env.GCS_CLIENT_EMAIL;
  const privateKey = (process.env.GCS_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) return null;

  return new Storage({
    projectId,
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
  });
};

export const fetchPaperPdfBuffer = async (fileKey) => {
  if (!fileKey) return null;
  try {
    const storage = getStorage();
    if (!storage) return null;
    const bucketName = process.env.GCS_BUCKET || 'clagtee2026';
    const bucket = storage.bucket(bucketName);
    const file = bucket.file(fileKey);
    const [exists] = await file.exists();
    if (!exists) return null;
    const [buffer] = await file.download();
    return buffer;
  } catch (error) {
    console.error('Error downloading paper PDF from GCS:', error?.message || error);
    return null;
  }
};

const SYSTEM_INSTRUCTIONS = `Eres el evaluador técnico líder del congreso internacional XVI Latin-American Congress on Electricity Generation and Transmission (CLAGTEE 2026) y publicaciones IEEE.
Tu misión es realizar una revisión por pares (peer review) exhaustiva, metódica, rigurosa y constructiva del artículo científico proporcionado.

DEBES SEGUIR ESTRICTAMENTE ESTAS REGLAS:

1. ORTOGRAFÍA, ACENTUACIÓN Y REDACCIÓN IMPECABLE (ESPAÑOL):
- Es OBLIGATORIO utilizar tildes/acentos ortográficos (á, é, í, ó, ú, Á, É, Í, Ó, Ú) y la letra 'ñ' o 'Ñ' con total corrección según las normas de la Real Academia Española (RAE).
- Bajo NINGUNA circunstancia omitas tildes ni sustituyas letras (ejemplos obligatorios: Evaluación, Artículo, Título, Decisión, Justificación, Metodología, Formulación, Introducción, Conclusión, Observaciones Técnicas, Redacción, Erratas, Revisión Menor/Mayor, Aceptación, etc.).
- La redacción debe ser formal, académica, impecable, sin faltas ortográficas, errores gramaticales ni problemas de concordancia.

2. EVALUACIÓN TÉCNICA PROFUNDA:
- Analiza el resumen y la introducción: claridad del problema, motivación, brecha de investigación (research gap) y aportes declarados.
- Formulación matemática y algoritmos: consistencia de variables, restricciones, función objetivo y solidez teórica.
- Caso de estudio y simulación: representatividad de la red o sistema probado, convergencia, tiempos y parámetros.
- Validación física y reproducibilidad: plausibilidad de resultados, comprobación física y contraste con literatura previa.

3. AUDITORÍA BIBLIOGRÁFICA ANTI-ALUCINACIONES:
- Inspecciona minuciosamente la sección de Referencias Bibliográficas del manuscrito.
- Evalúa la autenticidad de los títulos, autores, actas de congreso y revistas científicas.
- Identifica si existen citas inventadas, erróneas o referencias alucinadas.
- Reporta cuantitativamente: Total de referencias evaluadas, referencias verificadas reales y referencias ficticias/alucinadas (debe ser 0 si todas son reales).

4. CONTROL DE CALIDAD FORMAL Y EDITORIAL:
- Detecta párrafos duplicados o texto repetido por copia-pega.
- Verifica correspondencia entre leyendas/epígrafes de figuras/tablas y el contenido real mostrado.
- Señala erratas tipográficas u ortográficas destacadas indicando página/sección aproximada.

5. FORMATO DE SALIDA PARA CMS (OBLIGATORIO):
- NADA DE FORMATO MARKDOWN: No uses asteriscos para negritas (**texto**), ni para cursivas (*texto*), ni encabezados con numerales (# o ##), ni bloques de código con comillas invertidas. Debe ser texto plano directo para formularios web y correos de notificación.
- NADA DE SINTAXIS LATEX: Prohibido usar símbolos $, \\alpha, \\Delta, \\text{}. Escribe nombres legibles (ej. Gamma, Delta V, d_fair, omega_1).
- Estructura limpia y elegante: Títulos en MAYÚSCULAS con tildes correctas, separadores de 80 guiones (--------------------------------------------------------------------------------) y viñetas simples con guion (-).

6. ESTRUCTURA EXACTA DEL INFORME DE COMENTARIOS:
EVALUACIÓN DE ARTÍCULO / REVIEW REPORT

TÍTULO: [Título completo del artículo]
AUTORES: [Autores o indicación si es anónimo para double-blind]
CONGRESO: XVI Latin-American Congress on Electricity Generation and Transmission (CLAGTEE 2026)
DECISIÓN: Aceptar (Accept) / Revisión Menor (Minor Revision) / Revisión Mayor (Major Revision) / Rechazar (Reject)

--------------------------------------------------------------------------------

1. RESUMEN Y JUSTIFICACIÓN DE LA DECISIÓN
[Resumen ejecutivo del trabajo, mérito técnico y justificación del dictamen]

--------------------------------------------------------------------------------

2. FORTALEZAS PRINCIPALES
- [Punto fuerte 1: Relevancia y aporte técnico al sector eléctrico / energético]
- [Punto fuerte 2: Metodología y modelado matemático]
- [Punto fuerte 3: Resultados y validación]

--------------------------------------------------------------------------------

3. OBSERVACIONES PARA LA VERSIÓN FINAL (CAMERA-READY)
Se solicita a los autores incorporar las siguientes precisiones y correcciones:

A. Clarificaciones Técnicas:
- [Punto técnico 1]
- [Punto técnico 2]

B. Correcciones de Formato y Redacción:
- [Corrección de epígrafes o leyendas]
- [Eliminación de redundancias]
- [Erratas tipográficas específicas identificadas]

--------------------------------------------------------------------------------

4. INFORME DE AUDITORÍA BIBLIOGRÁFICA
- Total de referencias evaluadas: [N]
- Referencias verificadas reales: [N] ([%]%)
- Referencias ficticias/alucinadas: 0 (0%)

--------------------------------------------------------------------------------

5. COMENTARIOS FINALES
[Declaración de cierre sobre la idoneidad del trabajo para su presentación en CLAGTEE 2026 y su publicación en IEEE Xplore]

7. ASIGNACIÓN DE PARÁMETROS NUMÉRICOS:
- score: entero de 1 a 5 (PUNTAJE MÁXIMO ES 5: 1: Muy deficiente, 2: Por debajo del promedio, 3: Aceptable, 4: Muy bueno, 5: Sobresaliente / Excelente)
- confidence: entero de 1 a 5 (1: Fuera de área, 2: Conocimiento general, 3: Buen conocimiento, 4: Experto en el tema, 5: Máximo referente)
- recommendation: uno de "accept", "minor-revision", "major-revision", "reject"
- status: uno de "under-review", "accepted", "rejected"`;

export const generateAIReview = async ({ paper, pdfBuffer }) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('MISSING_GEMINI_API_KEY');
  }

  const parts = [];

  if (pdfBuffer && Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 0) {
    parts.push({
      inlineData: {
        mimeType: 'application/pdf',
        data: pdfBuffer.toString('base64'),
      },
    });
    parts.push({
      text: `Aquí tienes el manuscrito en PDF del artículo #${paper.id} titulado "${paper.title}" presentado en el Track "${paper.track || 'General'}".
Abstract declarado: "${paper.abstract || 'No disponible'}".

Por favor, lee el documento completo en PDF y genera la evaluación completa con la rigurosidad de CLAGTEE e IEEE según las instrucciones del sistema.
Responde únicamente en formato JSON con la siguiente estructura:
{
  "score": 4,
  "confidence": 4,
  "recommendation": "accept",
  "status": "under-review",
  "decisionLabel": "Aceptar",
  "comments": "EVALUACIÓN DE ARTÍCULO / REVIEW REPORT\\n\\n..."
}`,
    });
  } else {
    parts.push({
      text: `El artículo #${paper.id} titulado "${paper.title}" fue presentado en el Track "${paper.track || 'General'}" con el siguiente resumen técnico:
"${paper.abstract || 'Sin resumen disponible'}".
Autores declarados: ${(paper.authors || []).map((a) => a.name).join(', ') || 'No especificados'}.

Genera una evaluación técnica preliminar de este artículo basada en el abstract y el contexto temático de CLAGTEE 2026 e IEEE.
Responde únicamente en formato JSON con la siguiente estructura:
{
  "score": 3,
  "confidence": 3,
  "recommendation": "minor-revision",
  "status": "under-review",
  "decisionLabel": "Revisión Menor",
  "comments": "EVALUACIÓN DE ARTÍCULO / REVIEW REPORT\\n\\n..."
}`,
    });
  }

  const candidateModels = ['gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.6-flash', 'gemini-3.8-flash'];
  let lastError = null;

  for (const model of candidateModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTIONS }],
          },
          contents: [{ parts }],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.2,
          },
        }),
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error?.message || `HTTP ${response.status}`);
      }

      const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) {
        throw new Error('EMPTY_GEMINI_RESPONSE');
      }

      let parsed;
      try {
        parsed = JSON.parse(rawText);
      } catch (parseError) {
        const cleaned = rawText.replace(/```json\s*|```\s*$/g, '').trim();
        parsed = JSON.parse(cleaned);
      }

      const validRecs = new Set(['accept', 'minor-revision', 'major-revision', 'reject']);
      const recommendation = validRecs.has(parsed.recommendation) ? parsed.recommendation : 'minor-revision';

      const validStatuses = new Set(['under-review', 'accepted', 'rejected']);
      const status = validStatuses.has(parsed.status) ? parsed.status : 'under-review';

      const score = Math.max(1, Math.min(5, Number(parsed.score) || 3));
      const confidence = Math.max(1, Math.min(5, Number(parsed.confidence) || 3));
      const comments = String(parsed.comments || '').trim();

      return {
        score,
        confidence,
        recommendation,
        status,
        decisionLabel: parsed.decisionLabel || (recommendation === 'accept' ? 'Aceptar' : recommendation === 'reject' ? 'Rechazar' : 'Revisión'),
        comments,
        modelUsed: model,
      };
    } catch (err) {
      console.warn(`Attempt with ${model} failed:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error('ALL_GEMINI_MODELS_FAILED');
};
