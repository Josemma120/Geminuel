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

  // ==== 2. Cliente del servidor local ======================
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

  // ==== 3. API pública =====================================
  return {
    // getResponse(mensaje, historial) → { ok, text, warning? }
    //   ok=true  → respuesta real (vía servidor local → Gemini)
    //   ok=false → hubo error; text es un mensaje de error claro
    //              y warning trae el detalle técnico.
    async getResponse(userMessage, history = []) {
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