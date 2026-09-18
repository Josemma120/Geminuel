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
  // ==== 1. Respuestas simuladas (respaldo si la API falla) ===
  const aiResponses = {
    default: [
      `¡Hola! Soy **Geminuel**, tu asistente de programación experto.\n\nPuedo ayudarte a:\n- **Escribir código limpio y eficiente** en múltiples lenguajes\n- **Encontrar y solucionar bugs** complejos\n- **Diseñar arquitecturas escalables** para tus aplicaciones\n- **Explicar conceptos avanzados** (algoritmos, patrones de diseño)\n\n¿En qué desafío técnico estás trabajando hoy?`,
      `Interesante pregunta sobre arquitectura de software. Para abordar este problema, deberíamos considerar patrones como microservicios o arquitecturas event-driven, dependiendo de tus requerimientos de escalabilidad.\n\n¿Te gustaría que diseñemos un diagrama básico de cómo interactuarían los componentes?`,
      `¡Claro! La refactorización es clave para mantener un código saludable. Aquí tienes algunas sugerencias inmediatas:\n\n1. **Extraer funciones** — Divide funciones largas en piezas más pequeñas, cada una con una responsabilidad única.\n2. **Reducir la complejidad ciclomática** — Evita demasiados \`if/else\` anidados utilizando retornos tempranos o polimorfismo.\n3. **Nombrado descriptivo** — Cambia variables como \`x\` o \`data\` por nombres que revelen su intención.\n\n¿Quieres que revisemos un fragmento de código específico?`,
    ],
    greet: `¡Hola! Soy **Geminuel**, tu asistente de programación experto.\n\nEstoy listo para revisar código, diseñar bases de datos, optimizar algoritmos o explicarte ese concepto que te está costando. ¿Con qué empezamos?`,
    code: `Claro, con gusto te ayudo con código. Aquí tienes un ejemplo:\n\n\`\`\`python\ndef saludo(nombre):\n    """Función que genera un saludo personalizado."""\n    return f"¡Hola, {nombre}! Bienvenido a Geminuel."\n\n# Uso\nmensaje = saludo("Usuario")\nprint(mensaje)\n\`\`\`\n\nEste código define una función simple en Python que acepta un nombre y devuelve un saludo personalizado. ¿Quieres que lo adapte o explique alguna parte?`,
    email: `Por supuesto. Aquí tienes una plantilla de correo profesional:\n\n---\n\n**Asunto**: [Tema del correo]\n\nEstimado/a [Nombre],\n\nEspero que este mensaje le encuentre bien. Me dirijo a usted para [motivo principal del correo].\n\n[Desarrollo del mensaje con los puntos clave.]\n\nQuedo a su disposición para cualquier consulta o aclaración.\n\nAtentamente,\n[Tu nombre]\n[Tu cargo]\n[Tu empresa]\n\n---\n\n¿Desea que personalice este correo para un caso específico?`,
    learn: `Excelente curiosidad. Déjame explicarte este concepto de forma clara y sencilla.\n\nImagina que la **recursividad** es como mirarte en dos espejos enfrentados: cada espejo contiene un reflejo que a su vez contiene otro reflejo, y así sucesivamente.\n\nEn programación, una función recursiva se llama a sí misma:\n\n\`\`\`python\ndef factorial(n):\n    if n <= 1:      # Caso base: detiene la recursión\n        return 1\n    return n * factorial(n - 1)  # Se llama a sí misma\n\nprint(factorial(5))  # → 120\n\`\`\`\n\nLa clave es siempre tener un **caso base** que detenga la recursión, de lo contrario el programa se ejecutaría indefinidamente.\n\n¿Quieres que explore algún otro ejemplo?`,
  };

  // Selección de respuesta simulada según el tema del mensaje.
  function chooseResponse(userMsg) {
    const lower = userMsg.toLowerCase();
    if (/hola|buenos|saludos|hi\b/i.test(lower)) return aiResponses.greet;
    if (/código|code|programar|python|javascript|función/i.test(lower)) return aiResponses.code;
    if (/correo|email|carta|redactar/i.test(lower)) return aiResponses.email;
    if (/aprender|aprende|recursiv|explica|concepto/i.test(lower)) return aiResponses.learn;
    const arr = aiResponses.default;
    return arr[Math.floor(Math.random() * arr.length)];
  }

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
      throw new Error('No se pudo contactar el servidor local. Ejecuta `node server.js` y entra a http://localhost:8000');
    }

    let data = null;
    try { data = await res.json(); } catch { /* no era JSON */ }

    if (!res.ok || !data || data.ok !== true) {
      throw new Error((data && data.error) || `El servidor local respondió con error ${res.status}`);
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
    //   ok=false → hubo error; text es un respaldo simulado
    //              y warning explica qué pasó.
    async getResponse(userMessage, history = []) {
      try {
        const text = await callApi(userMessage, history);
        return { ok: true, text };
      } catch (err) {
        console.error('[Geminuel] Error al llamar a la API:', err);
        const detail = (err && typeof err.message === 'string' && err.message.trim() !== '')
          ? err.message.split('\n')[0].slice(0, 200)
          : 'desconocido (revisa la consola, F12)';
        return {
          ok: false,
          text: chooseResponse(userMessage),
          warning: 'No se obtuvo una respuesta real (¿está corriendo `node server.js` o falló la API de Gemini?), así que este es un respaldo simulado. Detalle: ' + detail,
        };
      }
    },
  };
})();