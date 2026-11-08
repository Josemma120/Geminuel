// ============================================================
//  Geminuel — Motor de respuestas (capa de IA multi-agente)
// ============================================================
//  Soporta tanto Google Gemini como DeepSeek mediante el
//  servidor local (server.js).
//  La interfaz (js/app.js) llama a:
//  GeminuelEngine.getResponse(mensaje, historial, provider)
// ============================================================

window.GeminuelEngine = (() => {
  // ==== 1. Mensajes de error para el usuario final ========
  const ERROR_MESSAGES = {
    429: 'Se alcanzó el límite de uso de la IA temporalmente. Por favor espera unos minutos e inténtalo de nuevo.',
    503: 'El servicio de IA está saturado en este momento. Espera unos segundos e inténtalo de nuevo.',
    offline: 'No se pudo conectar con el servidor local. Ejecuta `node server.js` y abre http://localhost:8000.',
    400: 'El servidor de IA rechazó la petición. Revisa la consola (F12) para más detalles.',
  };
  const ERROR_DEFAULT = 'Ocurrió un error al generar la respuesta. Verifica que `node server.js` esté corriendo y revisa la consola (F12).';

  // ==== 2. Cliente del servidor local ======================
  async function callApi(userMessage, history, provider = 'cascade', chatId = null) {
    let res;
    try {
      res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userMessage,
          history,
          provider,
          chatId: chatId || null,
        }),
      });
    } catch {
      const err = new Error('El servidor local no responde');
      err.status = 'offline';
      throw err;
    }

    let data = null;
    try { data = await res.json(); } catch { /* no era JSON */ }

    if (!res.ok || !data || data.ok !== true) {
      const errMsg = (data && data.error) || `El servidor local respondió con error ${res.status}`;
      const err = new Error(errMsg);
      err.status = res.status;
      throw err;
    }

    if (typeof data.text !== 'string' || !data.text.trim()) {
      throw new Error('El servidor devolvió una respuesta vacía');
    }
    return {
      text: data.text,
      provider: data.provider || provider,
      cascaded: Boolean(data.cascaded),
      fallbackReason: data.fallbackReason || null,
    };
  }

  // ==== 3. API pública =====================================
  return {
    // getResponse(mensaje, historial, provider, chatId) → { ok, text, warning?, provider, cascaded, fallbackReason }
    async getResponse(userMessage, history = [], provider = 'cascade', chatId = null) {
      try {
        const result = await callApi(userMessage, history, provider, chatId);
        return {
          ok: true,
          text: result.text,
          provider: result.provider,
          cascaded: result.cascaded,
          fallbackReason: result.fallbackReason,
        };
      } catch (err) {
        console.error('[Geminuel] Error al llamar a la API:', err);
        const detailMsg = (err && typeof err.message === 'string' && err.message.trim() !== '') ? err.message : '';
        let msg = ERROR_MESSAGES[err && err.status] || ERROR_DEFAULT;
        if (detailMsg && (detailMsg.includes('Falta configurar') || detailMsg.includes('No se encontró') || detailMsg.includes('La cascada no pudo'))) {
          msg = detailMsg;
        }
        const detail = detailMsg ? detailMsg.split('\n')[0].slice(0, 250) : 'sin detalles';
        return { ok: false, text: msg, warning: 'Detalle: ' + detail, provider };
      }
    },

    // Consulta qué agentes tienen clave configurada en el servidor
    async getProviders() {
      try {
        const res = await fetch('/api/providers');
        if (!res.ok) return null;
        const data = await res.json();
        return data.ok ? data.providers : null;
      } catch {
        return null;
      }
    },
  };
})();