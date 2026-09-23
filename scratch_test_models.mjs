import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const apiKey = process.env.GEMINI_API_KEY;

const candidateModels = ['gemini-3.6-flash', 'gemini-3.8-flash', 'gemini-3.1-pro-preview', 'gemini-flash-latest'];

for (const model of candidateModels) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
  const t0 = Date.now();
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: 'Hello, respond with {"status": "ok"} in JSON' }] }],
        generationConfig: { responseMimeType: 'application/json' }
      })
    });
    const data = await res.json();
    console.log(`Model ${model}: HTTP ${res.status} in ${(Date.now() - t0)/1000}s`, data?.candidates?.[0]?.content?.parts?.[0]?.text || data?.error?.message);
  } catch (err) {
    console.log(`Model ${model} error:`, err.message);
  }
}
