// ============================================================
//  Geminuel — Servidor local (proxy)
// ============================================================
//  Sirve los archivos estáticos y exponen el endpoint /api/chat
//  que llama a Gemini con la clave DE SERVIDOR a través de la
//  variable de entorno GEMINI_API_KEY (archivo .env). Así la
//  clave NUNCA llega al navegador ni al repositorio.
//
//  Requisito: Node.js 18 o superior.
//
//  Uso:
//    1) Copia .env.example a .env y pon tu clave.
//    2) node server.js
//    3) Abre http://localhost:8000
// ============================================================

const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT || 8000;

// ---- Carga de .env sin dependencias ----
function loadEnv(filePath) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch {
    return; // .env opcional si la variable ya existe en el entorno
  }
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i === -1) continue;
    const key = t.slice(0, i).trim();
    const value = t.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    if (key && !process.env[key]) process.env[key] = value;
  }
}
loadEnv(path.join(ROOT, '.env'));

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_MODEL = process.env.GEMINI_MODEL || process.env.MODEL || 'gemini-3.6-flash';
const GEMINI_API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const GROQ_API_KEY = process.env.GROQ_API_KEY || process.env.DEEPSEEK_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || 'deepseek-r1-distill-llama-70b';
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

// Cuántos mensajes del historial se envían a la API (ventana
// deslizante). Reduce el consumo de tokens y evita agotar la
// cuota en conversaciones largas.
const HISTORY_WINDOW = 12;

const SYSTEM_PROMPT = `Eres **Geminuel**, un asistente experto en programación.

Reglas de comportamiento:
- Responde siempre en español, de forma clara, amable y didáctica.
- Explica paso a paso y enseña; no te limites a entregar código.
- Cuando des código, explica brevemente las partes clave y recuerda al usuario que debe probar y verificar el código antes de usarlo.
- Si no estás seguro de una respuesta, dilo abiertamente.
- No solicites ni aceptes información personal o sensible (contraseñas, datos privados).
- Recomienda que las decisiones importantes sean verificadas por una persona o con documentación oficial antes de confiar en la IA.
- Aceptas dudas de sintaxis, código con errores, mensajes de error e instrucciones de programas.
- Usa formato Markdown para tus respuestas (bloques de código con \`\`\`, listas, negritas).
- Sé CONCISO: responde lo necesario en pocos párrafos; evita rodeos, repeticiones y textos largos. Prioriza ir al grano.
- Termina SIEMPRE cada respuesta con una conclusión o resumen breve (1-2 frases) que cierre el tema; nunca dejes la respuesta cortada de golpe.`;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.md': 'text/plain; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
};

function sendJSON(res, status, obj) {
  const body = JSON.stringify(obj);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

// Extrae un mensaje legible desde la respuesta de error de Gemini.
async function readError(res) {
  try {
    const errData = await res.json();
    return (errData.error && errData.error.message) || '';
  } catch {
    return await res.text().catch(() => '');
  }
}

// Llama a Gemini reintentando ante errores temporales (503 / 429).
async function callGemini(userMessage, history) {
  const contents = history
    .filter(m => m && typeof m.content === 'string' && m.content.trim() !== '')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }))
    .slice(-HISTORY_WINDOW);

  if (contents.length === 0) {
    contents.push({ role: 'user', parts: [{ text: userMessage }] });
  }

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
  });

  let res = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    res = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (res.status === 503 || res.status === 429) {
      await new Promise(r => setTimeout(r, 700 * attempt));
      continue;
    }
    break;
  }

  if (!res.ok) {
    const detail = await readError(res);
    throw new Error(`Gemini API error ${res.status}: ${detail || res.statusText || 'error desconocido'}`);
  }

  const data = await res.json();
  const text = (data.candidates?.[0]?.content?.parts || [])
    .map(p => p.text || '')
    .join('')
    .trim();

  if (!text) throw new Error('Gemini devolvió una respuesta vacía');

  // Si Gemini se quedó sin presupuesto de tokens, avisa para que
  // la respuesta no parezca truncada de golpe.
  const finishReason = data.candidates?.[0]?.finishReason;
  if (finishReason === 'MAX_TOKENS') {
    return text + '\n\n>[La respuesta se cortó por el límite de longitud. Pregunta la continuación si quieres.]';
  }
  return text;
}

// Llama a Groq Cloud (ejecutando DeepSeek R1) con reintentos automáticos.
async function callGroq(userMessage, history) {
  if (!GROQ_API_KEY) {
    throw new Error('Falta configurar GROQ_API_KEY en .env. Consíguela 100% gratis en https://console.groq.com/keys');
  }

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
  ];

  const recentHistory = history
    .filter(m => m && typeof m.content === 'string' && m.content.trim() !== '')
    .slice(-HISTORY_WINDOW);

  for (const m of recentHistory) {
    messages.push({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    });
  }

  const lastMsg = messages[messages.length - 1];
  if (!lastMsg || lastMsg.role !== 'user' || lastMsg.content !== userMessage) {
    messages.push({ role: 'user', content: userMessage });
  }

  const body = JSON.stringify({
    model: GROQ_MODEL,
    messages,
    temperature: 0.6,
    max_tokens: 4096,
  });

  let res = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    res = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`,
      },
      body,
    });

    if (res.status === 503 || res.status === 429) {
      await new Promise(r => setTimeout(r, 700 * attempt));
      continue;
    }
    break;
  }

  if (!res.ok) {
    const detail = await readError(res);
    throw new Error(`Groq API error ${res.status}: ${detail || res.statusText || 'error desconocido'}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0];
  const text = (choice?.message?.content || '').trim();

  if (!text) throw new Error('Groq devolvió una respuesta vacía');

  if (choice?.finish_reason === 'length') {
    return text + '\n\n>[La respuesta se cortó por el límite de tokens. Pide la continuación si lo deseas.]';
  }
  return text;
}

// Ejecuta la cascada inteligente: 1° Groq (DeepSeek R1) -> 2° Gemini (Respaldo automático)
async function callCascade(userMessage, history) {
  const errors = [];

  // Intento 1: Groq Cloud (DeepSeek R1)
  if (GROQ_API_KEY) {
    try {
      const text = await callGroq(userMessage, history);
      return { text, provider: 'groq', cascaded: false };
    } catch (err) {
      const msg = (err && err.message) || 'Error en Groq';
      console.warn('[Cascada] Groq no disponible:', msg);
      errors.push(`Groq (${GROQ_MODEL}): ${msg}`);
    }
  } else {
    errors.push('Groq: No se encontró GROQ_API_KEY en .env');
  }

  // Intento 2: Google Gemini (Respaldo automático)
  if (GEMINI_API_KEY) {
    try {
      const text = await callGemini(userMessage, history);
      const isFallback = errors.length > 0;
      return {
        text,
        provider: 'gemini',
        cascaded: isFallback,
        fallbackReason: isFallback ? errors[0] : null,
      };
    } catch (err) {
      const msg = (err && err.message) || 'Error en Gemini';
      console.warn('[Cascada] Gemini no disponible:', msg);
      errors.push(`Gemini (${GEMINI_MODEL}): ${msg}`);
    }
  } else {
    errors.push('Gemini: No se encontró GEMINI_API_KEY en .env');
  }

  // Si ambos fallaron
  throw new Error(
    `No se pudo obtener respuesta del servicio de IA:\n• ${errors[0] || 'Servicio primario falló'}\n• ${errors[1] || 'Servicio de respaldo falló'}`
  );
}

// ---- Servidor ----
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);

  // Endpoint de estado y proveedores disponibles
  if (pathname === '/api/providers') {
    if (req.method !== 'GET') return sendJSON(res, 405, { ok: false, error: 'Método no permitido' });
    return sendJSON(res, 200, {
      ok: true,
      cascadeOrder: ['groq', 'gemini'],
      providers: {
        groq: { configured: Boolean(GROQ_API_KEY), model: GROQ_MODEL, role: 'primary' },
        gemini: { configured: Boolean(GEMINI_API_KEY), model: GEMINI_MODEL, role: 'fallback' },
      },
    });
  }

  // Endpoint de chat (cascada automática por defecto)
  if (pathname === '/api/chat') {
    if (req.method !== 'POST') return sendJSON(res, 405, { ok: false, error: 'Método no permitido' });

    let body = '';
    req.on('data', c => {
      body += c;
      if (body.length > 1e6) req.destroy();
    });
    req.on('end', async () => {
      let parsed;
      try {
        parsed = JSON.parse(body);
      } catch {
        return sendJSON(res, 400, { ok: false, error: 'JSON inválido' });
      }
      if (typeof parsed.userMessage !== 'string' || !parsed.userMessage.trim()) {
        return sendJSON(res, 400, { ok: false, error: 'Falta userMessage' });
      }

      const mode = parsed.provider || 'cascade';
      const history = Array.isArray(parsed.history) ? parsed.history : [];

      try {
        let result;
        if (mode === 'groq') {
          const text = await callGroq(parsed.userMessage, history);
          result = { text, provider: 'groq', cascaded: false };
        } else if (mode === 'gemini') {
          const text = await callGemini(parsed.userMessage, history);
          result = { text, provider: 'gemini', cascaded: false };
        } else {
          // Cascada automática unificada
          result = await callCascade(parsed.userMessage, history);
        }

        sendJSON(res, 200, {
          ok: true,
          text: result.text,
          provider: result.provider,
          cascaded: Boolean(result.cascaded),
          fallbackReason: result.fallbackReason || null,
        });
      } catch (err) {
        const message = (err && err.message) || 'error desconocido';
        const status = /429/.test(message) ? 429 : (/503/.test(message) ? 503 : 502);
        sendJSON(res, status, { ok: false, error: message });
      }
    });
    return;
  }

  // Archivos estáticos (solo GET/HEAD)
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405);
    res.end();
    return;
  }

  let target = path.normalize(path.join(ROOT, pathname));
  if (!target.startsWith(ROOT)) {
    res.writeHead(403);
    res.end();
    return;
  }
  if (pathname === '/' || !path.extname(target)) {
    target = path.join(target, 'index.html');
  } else if (pathname === '/favicon.ico' && !fs.existsSync(target)) {
    target = path.join(ROOT, 'favicon.svg');
  }

  fs.readFile(target, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 — No encontrado');
      return;
    }
    const ext = path.extname(target).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Geminuel corriendo en http://localhost:${PORT}`);
  console.log(`Modo: Cascada de Respaldo Automática (Groq [DeepSeek R1] -> Google Gemini)`);
  console.log(` - 1° Groq:   ${GROQ_API_KEY ? `Listo (${GROQ_MODEL})` : 'Sin clave en .env (GROQ_API_KEY)'}`);
  console.log(` - 2° Gemini: ${GEMINI_API_KEY ? `Listo (${GEMINI_MODEL})` : 'Sin clave en .env (GEMINI_API_KEY)'}`);
});