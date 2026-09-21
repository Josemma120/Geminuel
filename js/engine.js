// ============================================================
//  Geminuel — Motor de respuestas (capa de IA)
// ============================================================
//  La clave de la API ya NO vive en este archivo: el navegador
//  llama a /api/chat del servidor local (server.js), que la
//  guarda en .env. Así la clave no se expone al navegador ni al
//  repositorio.
//  La interfaz (js/app.js) solo usa
//  GeminuelEngine.getResponse(mensaje, historial) y espera un
//  string de respuesta.
// ============================================================

window.GeminuelEngine = (() => {
  // ==== 1. Mensajes de error para el usuario final ========
  // Cuando la API falla, NO se inventa una respuesta: se muestra
  // un mensaje claro de qué pasó, según el tipo de error.
  const ERROR_MESSAGES = {
    429: 'Se alcanzó el límite de uso de la IA (cuota gratuita agotada). Espera unos minutos o hasta mañana, cuando la cuota se reinicia, y vuelve a intentarlo.',
    503: 'El servicio de IA está saturado en este momento. Espera unos segundos e inténtalo de nuevo.',
    offline: 'No se pudo conectar con el servidor local. Ejecuta `node server.js` y abre http://localhost:8000.',
    400: 'El servidor de IA rechazó la petición. Revisa la consola (F12) para más detalles.',
  };
  const ERROR_DEFAULT = 'Ocurrió un error al generar la respuesta. Verifica que `node server.js` esté corriendo y revisa la consola (F12).';

  // ==== 2. Filtro de tema (solo programación) ============
  // Modo ESTRICTO: solo pasan los mensajes con pista clara de
  // programación (PROGRAMMING_HINTS) o los saludos/agradecimientos
  // (GREETINGS). Lo claramente ajeno (OFF_TOPIC_HINTS) y lo
  // ambiguo/sin señales se rechaza SIN llamar a la API.
  const PROGRAMMING_HINTS = /\b(programa\w*|c[oó]digo|code|script|cod[eé]|\bhtm\w*|css|javascrip\w*|typescript|node|npm|react|vue|angular|django|flask|python|java)\b|\b(php|ruby|rust|sql|mysql|mongodb|database|base de datos|funci[oó]n|clase|objeto|variable|array|arreglo|algoritmo|recursi\w*|api|fetch|server|servidor|framework|librer\w*a|terminal|git|github|commit|deploy|docker|sintaxis|bug|error|debug|compilar|ejecutar|archivo|token|json|ide|engine|motor de juego|videojue\w*|\bjuego\b|game\w*|unreal|unity|godot|blender|shader|modelado 3d|fortnite|\bapp\w*|\bsitio\b|\bweb\b|frontend|backend|\bp[áa]gina\w*|pantalla\b|\bbot[óo]n\b|interfaz\b|\bproyecto\b|\bdise[ñn]o\b|responsive|estilos\b|instalar\b|configurar\b|importar\b|exportar\b|consultar\b|CRUD|registro\w*|depurar|debuggear|clonar\b|\brama\w*|\bpull\b|\bpush\b|branch|merge\b|issues\b|arquitectura|escalab\w*|rendimiento\b|optimiz\w*)\b/i;

  const OFF_TOPIC_HINTS = /\b(m[úu]sica|canc[ióo]n|album|banda\w*|cantant\w*|deporte\w*|f[úu]tbol|basquet|tenis|equipo deportivo|atleta|noticia\w*|pol[ií]tic\w*|presidente|presidencia|gobierno|partido pol[ií]tic\w*|elecci\w*|vot\w*|candidat\w*|senador|diputad\w*|gobernador|alcalde\w*|econom[ií]a|salario\w*|impuesto\w*|inflaci[oó]n|d[ée]ficit|morena|pri\b|prd\b|pan\b|militar|ej[eé]rcito|guerra\w*|viaje\w*|vacaciones|hotel\w*|playa\w*|receta\w*|cocinar|restaurante\w*|cine|netflix|serie\w*|pel[ií]cula|anime|manga|comic|c[óo]mic\w*|dibujos animados|caricatura\w*|superh[eé]roe|clima|tiempo meteorol\w*|lluvia\w*|novia|novio|amig\w* personal|familia|salud|doctor|enfermedad|cumplea\w*os|hor[oó]scopo|mascota\w*|sue[ñn]os o\w*|religi[oó]n|m[oó]da|ropa\w*|fotograf[ií]a|fotos|sonic\b|flash\b|superman|batman|spiderman|ironman|hulk|thor|avengers|dragon ball|naruto|pok[ée]mon|zelda|mario bros|calabozos y dragones)\b/i;

  const OFF_TOPIC_REPLY = 'Ese tema está fuera de mi área. Soy **Geminuel**, un asistente especializado en programación: puedo ayudarte con código, errores, algoritmos, arquitectura, desarrollo de juegos o herramientas de desarrollo. Si reformulas tu duda hacia alguno de esos ámbitos, con gusto te ayudo.';

  const AMBIGUOUS_REPLY = 'Tu pregunta no deja claro si es de programación. Soy **Geminuel**, un asistente especializado en desarrollo de software: si me cuentas qué estás intentando (qué lenguaje usas, qué error te sale o qué quieres construir), con gusto te ayudo.';

  // Saludos y agradecimientos: pasan a Gemini pero como cortesía
  // simple, no para responder contenido ajeno.
  const GREETINGS = /\b(hola|buenos d[ií]as|buenas tardes|buenas noches|hey|qu[eé] tal|saludos|gracias|muchas gracias|ok\b|s[ií]\b|perfecto|entendido|listo|de nada)\b/i;

  // Devuelve true si el mensaje DEBE pasar al motor: tiene pista
  // clara de programación o es un saludo breve. Todo lo demás
  // (ajeno u ambiguo) se rechaza.
  function isProgrammingTopic(msg) {
    if (PROGRAMMING_HINTS.test(msg)) return true;
    if (OFF_TOPIC_HINTS.test(msg)) return false;
    return GREETINGS.test(msg);
  }

  // ==== 3. Cliente del servidor local ======================
  // Pide la respuesta real al proxy (server.js). El proxy es
  // quien guarda la clave y llama a Gemini.
  async function callApi(userMessage, history) {
    let res;
    try {
      res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userMessage, history }),
      });
    } catch {
      const err = new Error('El servidor local no responde');
      err.status = 'offline';
      throw err;
    }

    let data = null;
    try { data = await res.json(); } catch { /* no era JSON */ }

    if (!res.ok || !data || data.ok !== true) {
      const err = new Error((data && data.error) || `El servidor local respondió con error ${res.status}`);
      err.status = res.status;
      throw err;
    }

    if (typeof data.text !== 'string' || !data.text.trim()) {
      throw new Error('El servidor devolvió una respuesta vacía');
    }
    return data.text;
  }

  // ==== 4. API pública =====================================
  return {
    // getResponse(mensaje, historial) → { ok, text, warning? }
    //   ok=true  → respuesta real (vía servidor local → Gemini)
    //              o rechazo de tema fuera de programación
    //   ok=false → hubo error; text es un mensaje de error claro
    //              y warning trae el detalle técnico.
    async getResponse(userMessage, history = []) {
      // Fuera de programación: se rechaza sin llamar a la API.
      // Mensaje distinto según sea tema ajeno o ambiguo.
      if (!isProgrammingTopic(userMessage)) {
        const text = OFF_TOPIC_HINTS.test(userMessage) ? OFF_TOPIC_REPLY : AMBIGUOUS_REPLY;
        return { ok: true, text };
      }

      try {
        const text = await callApi(userMessage, history);
        return { ok: true, text };
      } catch (err) {
        console.error('[Geminuel] Error al llamar a la API:', err);
        const msg = ERROR_MESSAGES[err && err.status] || ERROR_DEFAULT;
        const detail = (err && typeof err.message === 'string' && err.message.trim() !== '')
          ? err.message.split('\n')[0].slice(0, 250)
          : 'sin detalles';
        return { ok: false, text: msg, warning: 'Detalle: ' + detail };
      }
    },
  };
})();