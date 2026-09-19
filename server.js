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
const MODEL = process.env.MODEL || 'gemini-3.6-flash';

// Cuántos mensajes del historial se envían a la API (ventana
// deslizante). Reduce el consumo de tokens y evita agotar la
// cuota gratis en conversaciones largas.
const HISTORY_WINDOW = 12;

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

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
- Termina SIEMPRE cada respuesta con una conclusión o resumen breve (1-2 frases) que cierre el tema; nunca dejes la respuesta cortada de golpe.
- SOLO programación: aceptas únicamente temas relacionados con desarrollo de software, código, arquitectura, algoritmos, errores y herramientas de desarrollo. Si la pregunta NO es de programación (música, deportes, noticias, política, vida personal, etc.), recházala cortésmente explicando que eres un asistente especializado en programación y sugiere reformular la duda hacia ese ámbito. No respondas al contenido fuera de tema.
- Personalización natural (sin perfiles): si el usuario menciona su nombre, úsalo a partir de ese momento para dirigirte a él. Detecta su nivel de experiencia según sus preguntas y errores, y adapta el nivel de detalle (explica más a principiantes, sé más técnico con avanzados). Mantén un trato cercano y amable, como un mentor.`;

// ==== Red de seguridad de temas (igual que js/engine.js) =====
// Refuerzo del filtro en el servidor: aunque el navegador tenga
// cacheada una versión vieja del motor, el servidor bloquea temas
// ajenos y ahorra cuota.
const PROGRAMMING_HINTS = /\b(programa\w*|c[oó]digo|code|script|\bhtm\w*|css|javascrip\w*|typescript|node|npm|react|vue|angular|django|flask|python|java)\b|\b(php|ruby|rust|sql|mysql|mongodb|database|base de datos|funci[oó]n|clase|objeto|variable|array|arreglo|algoritmo|recursi\w*|api|fetch|server|servidor|framework|librer\w*a|terminal|git|github|commit|deploy|docker|sintaxis|bug|error|debug|compilar|ejecutar|archivo|token|json|ide|engine|motor de juego|videojue\w*|game\w*|unreal|unity|godot|blender|shader|modelado 3d|fortnite)\b/i;

const OFF_TOPIC_HINTS = /\b(m[úu]sica|canc[ióo]n|album|banda\w*|cantant\w*|deporte\w*|f[úu]tbol|basquet|tenis|equipo deportivo|atleta|noticia\w*|pol[ií]tic\w*|presidente|presidencia|gobierno|partido pol[ií]tic\w*|elecci\w*|vot\w*|candidat\w*|senador|diputad\w*|gobernador|alcalde\w*|econom[ií]a|salario\w*|impuesto\w*|inflaci[oó]n|d[ée]ficit|morena|pri\b|prd\b|pan\b|militar|ej[eé]rcito|guerra\w*|viaje\w*|vacaciones|hotel\w*|playa\w*|receta\w*|cocinar|restaurante\w*|cine|netflix|serie\w*|pel[ií]cula|anime|manga|comic|c[óo]mic\w*|dibujos animados|caricatura\w*|superh[eé]roe|clima|tiempo meteorol\w*|lluvia\w*|novia|novio|amig\w* personal|familia|salud|doctor|enfermedad|cumplea\w*os|hor[oó]scopo|mascota\w*|sue[ñn]os o\w*|religi[oó]n|m[oó]da|ropa\w*|fotograf[ií]a|fotos|sonic\b|flash\b|superman|batman|spiderman|ironman|hulk|thor|avengers|dragon ball|naruto|pok[ée]mon|zelda|mario bros|calabozos y dragones)\b/i;

const OFF_TOPIC_REPLY = 'Ese tema está fuera de mi área. Soy **Geminuel**, un asistente especializado en programación: puedo ayudarte con código, errores, algoritmos, arquitectura, desarrollo de juegos o herramientas de desarrollo. Si reformulas tu duda hacia alguno de esos ámbitos, con gusto te ayudo.';

function isProgrammingTopic(msg) {
  if (PROGRAMMING_HINTS.test(msg)) return true;
  return !OFF_TOPIC_HINTS.test(msg);
}

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

// Personaliza el prompt del sistema con el perfil del usuario.
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
    res = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
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

// ---- Servidor ----
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = decodeURIComponent(url.pathname);

  // Endpoint de chat (proxy hacia Gemini)
  if (pathname === '/api/chat') {
    if (req.method !== 'POST') return sendJSON(res, 405, { ok: false, error: 'Método no permitido' });
    if (!GEMINI_API_KEY) return sendJSON(res, 500, { ok: false, error: 'Falta GEMINI_API_KEY en .env' });

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
      // Filtro de tema: bloquea lo ajeno ANTES de gastar cuota (y
      // cubre el caso de que el navegador use un motor cacheado viejo).
      if (!isProgrammingTopic(parsed.userMessage)) {
        return sendJSON(res, 200, { ok: true, text: OFF_TOPIC_REPLY });
      }
      try {
        const text = await callGemini(
          parsed.userMessage,
          Array.isArray(parsed.history) ? parsed.history : []
        );
        sendJSON(res, 200, { ok: true, text });
      } catch (err) {
        const message = (err && err.message) || 'error desconocido';
        // Propagar el código real para que el cliente muestre el
        // mensaje de error adecuado (429 = cuota, 503 = saturado).
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
  if (!GEMINI_API_KEY) {
    console.log('AVISO: crea el archivo .env con GEMINI_API_KEY (ver .env.example) para activar la IA.');
  }
});