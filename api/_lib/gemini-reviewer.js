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

POLÍTICA EDITORIAL CLAGTEE 2026 E IEEE XPLORE (REGLA MANDATORIA):
- ACEPTACIÓN UNIVERSAL PARA LA CONFERENCIA: Todos los artículos evaluados DEBEN SER ACEPTADOS para su presentación y publicación en las actas de la conferencia CLAGTEE 2026. Bajo ninguna circunstancia dictamines "Rechazar" (reject) para la conferencia.
- REQUISITOS OBLIGATORIOS PARA IEEE XPLORE: Si el trabajo presenta debilidades metodológicas, matemáticas, de validación experimental o formal que ameriten cambios mayores (Major Revisions), estos cambios NO implican el rechazo del artículo para la conferencia, sino que DEBEN SOLICITARSE EXPLÍCITAMENTE COMO REQUISITO OBLIGATORIO Y CONDICIÓN INDISPENSABLE PARA LA PUBLICACIÓN DEL PAPER EN IEEE XPLORE.
- En caso de requerirse cambios mayores, el artículo queda formalmente ACEPTADO para su exposición en CLAGTEE 2026, pero su remisión final e indexación en IEEE Xplore queda supeditada al cumplimiento estricto de dichos cambios.

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
DECISIÓN CONFERENCIA: Aceptar para presentación y actas en CLAGTEE 2026
ESTADO PARA IEEE XPLORE: Aprobado (con ajustes menores) / Condicionado a Requisitos y Cambios Mayores Obligatorios

--------------------------------------------------------------------------------

1. RESUMEN Y JUSTIFICACIÓN DE LA DECISIÓN
[Resumen ejecutivo del trabajo, mérito técnico, confirmación de aceptación para la conferencia CLAGTEE 2026 y justificación de las exigencias para IEEE Xplore]

--------------------------------------------------------------------------------

2. FORTALEZAS PRINCIPALES
- [Punto fuerte 1: Relevancia y aporte técnico al sector eléctrico / energético]
- [Punto fuerte 2: Metodología y modelado matemático]
- [Punto fuerte 3: Resultados y validación]

--------------------------------------------------------------------------------

3. OBSERVACIONES Y REQUISITOS PARA LA VERSIÓN FINAL (CAMERA-READY) E IEEE XPLORE
Se solicita a los autores incorporar las siguientes precisiones y correcciones:

A. REQUISITOS OBLIGATORIOS PARA PUBLICACIÓN EN IEEE XPLORE (CAMBIOS MAYORES):
[Detallar con precisión técnica, teórica, matemática y experimental los cambios de fondo indispensables que los autores deben realizar para que el artículo califique a IEEE Xplore. Si el artículo es excelente y no requiere cambios mayores, indicar explícitamente: "No se requieren cambios mayores; el artículo cumple con la solidez requerida para IEEE Xplore, requiriendo únicamente las precisiones editoriales de la sección B"].

B. CORRECCIONES MENORES DE FORMATO Y REDACCIÓN (CAMERA-READY CLAGTEE 2026):
- [Corrección de epígrafes o leyendas en figuras/tablas]
- [Eliminación de párrafos duplicados o redundancias]
- [Erratas tipográficas y ortográficas específicas indicando página y sección]

--------------------------------------------------------------------------------

4. INFORME DE AUDITORÍA BIBLIOGRÁFICA
- Total de referencias evaluadas: [N]
- Referencias verificadas reales: [N] ([%]%)
- Referencias ficticias/alucinadas: 0 (0%)

--------------------------------------------------------------------------------

5. COMENTARIOS FINALES
[Felicitaciones a los autores por la aceptación de su ponencia en CLAGTEE 2026, recordando que la postulación final a IEEE Xplore dependerá del cumplimiento cabal de los requisitos obligatorios señalados en el punto 3.A]

7. ASIGNACIÓN DE PARÁMETROS NUMÉRICOS:
- score: entero de 1 a 5 (PUNTAJE MÁXIMO ES 5: 3: Aceptable para conferencia / Cambios mayores requeridos para IEEE Xplore; 4: Muy bueno; 5: Sobresaliente / Excelente)
- confidence: entero de 1 a 5 (1: Fuera de área, 2: Conocimiento general, 3: Buen conocimiento, 4: Experto en el tema, 5: Máximo referente)
- recommendation: "accept" (si está listo o con cambios menores) o "major-revision" (si requiere cambios mayores para IEEE Xplore). NUNCA uses "reject".
- status: "accepted" (todos los papers son aceptados para la conferencia) o "under-review"
- decisionLabel: "Aceptar (CLAGTEE 2026)" o "Aceptar (Cambios mayores para IEEE Xplore)"`;

const generateOpenAIReview = async ({ paper, pdfBuffer, apiKey }) => {
  let uploadedFileId = null;

  try {
    const userContent = [];

    if (pdfBuffer && Buffer.isBuffer(pdfBuffer) && pdfBuffer.length > 0) {
      const formData = new FormData();
      const blob = new Blob([pdfBuffer], { type: 'application/pdf' });
      formData.append('file', blob, `paper-${paper.id}.pdf`);
      formData.append('purpose', 'user_data');

      const fileRes = await fetch('https://api.openai.com/v1/files', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: formData,
      });

      const fileData = await fileRes.json();
      if (!fileRes.ok || !fileData?.id) {
        throw new Error(fileData?.error?.message || `OpenAI File Upload failed: HTTP ${fileRes.status}`);
      }
      uploadedFileId = fileData.id;

      userContent.push({
        type: 'text',
        text: `Aquí tienes el manuscrito en PDF del artículo #${paper.id} titulado "${paper.title}" presentado en el Track "${paper.track || 'General'}".
Abstract declarado: "${paper.abstract || 'No disponible'}".

Por favor, lee el documento completo en PDF y genera la evaluación completa con la rigurosidad de CLAGTEE e IEEE según las instrucciones del sistema.
Responde obligatoriamente en formato JSON con la siguiente estructura:
{
  "score": 4,
  "confidence": 4,
  "recommendation": "accept",
  "status": "under-review",
  "decisionLabel": "Aceptar",
  "comments": "EVALUACIÓN DE ARTÍCULO / REVIEW REPORT\\n\\n..."
}`,
      });

      userContent.push({
        type: 'file',
        file: { file_id: uploadedFileId },
      });
    } else {
      userContent.push({
        type: 'text',
        text: `El artículo #${paper.id} titulado "${paper.title}" fue presentado en el Track "${paper.track || 'General'}" con el siguiente resumen técnico:
"${paper.abstract || 'Sin resumen disponible'}".
Autores declarados: ${(paper.authors || []).map((a) => a.name).join(', ') || 'No especificados'}.

Genera una evaluación técnica preliminar de este artículo basada en el abstract y el contexto temático de CLAGTEE 2026 e IEEE.
Responde obligatoriamente en formato JSON con la siguiente estructura:
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

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-5.6-luna',
        messages: [
          {
            role: 'system',
            content: SYSTEM_INSTRUCTIONS,
          },
          {
            role: 'user',
            content: userContent,
          },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error?.message || `OpenAI Chat Completion failed: HTTP ${response.status}`);
    }

    const rawText = data.choices?.[0]?.message?.content;
    if (!rawText) {
      throw new Error('EMPTY_OPENAI_RESPONSE');
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
      decisionLabel: parsed.decisionLabel || (recommendation === 'accept' ? 'Aceptar (CLAGTEE 2026)' : recommendation === 'major-revision' ? 'Aceptar (Cambios mayores para IEEE Xplore)' : 'Revisión menor'),
      comments,
      modelUsed: 'gpt-5.6-luna',
    };
  } finally {
    if (uploadedFileId) {
      try {
        await fetch(`https://api.openai.com/v1/files/${uploadedFileId}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${apiKey}` },
        });
      } catch (cleanupErr) {
        console.warn('Failed to clean up OpenAI file:', uploadedFileId, cleanupErr?.message);
      }
    }
  }
};

const generateGeminiReview = async ({ paper, pdfBuffer }) => {
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
        decisionLabel: parsed.decisionLabel || (recommendation === 'accept' ? 'Aceptar (CLAGTEE 2026)' : recommendation === 'major-revision' ? 'Aceptar (Cambios mayores para IEEE Xplore)' : 'Revisión menor'),
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

export const generateAIReview = async ({ paper, pdfBuffer }) => {
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (openaiApiKey) {
    try {
      console.log(`[AI Review] Executing review with OpenAI gpt-5.6-luna for paper ${paper.id}...`);
      return await generateOpenAIReview({ paper, pdfBuffer, apiKey: openaiApiKey });
    } catch (openaiError) {
      console.warn('[AI Review] OpenAI gpt-5.6-luna failed, falling back to Gemini:', openaiError.message);
    }
  }

  return await generateGeminiReview({ paper, pdfBuffer });
};
