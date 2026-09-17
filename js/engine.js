// ============================================================
//  Geminuel — Motor de respuestas (capa de IA)
//  ============================================================
//  En este archivo vive TODO lo relacionado con generar
//  respuestas del asistente: aquí se reemplazará la simulación
//  actual por las llamadas a la API real (con API key) cuando
//  llegue el momento.
//
//  La interfaz (js/app.js) NO debe conocer los detalles de esto:
//  solo usa  GeminuelEngine.getResponse(mensaje)  y espera un
//  string de respuesta.
// ============================================================

window.GeminuelEngine = (() => {
  // ---- Simulated AI Responses (temporal) ----
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

  // ---- Routing de intención (temporal, mejorable) ----
  function chooseResponse(userMsg) {
    const lower = userMsg.toLowerCase();
    if (/hola|buenos|saludos|hi\b/i.test(lower)) return aiResponses.greet;
    if (/código|code|programar|python|javascript|función/i.test(lower)) return aiResponses.code;
    if (/correo|email|carta|redactar/i.test(lower)) return aiResponses.email;
    if (/aprender|aprende|recursiv|explica|concepto/i.test(lower)) return aiResponses.learn;
    const arr = aiResponses.default;
    return arr[Math.floor(Math.random() * arr.length)];
  }

  return {
    // ---- API pública del motor ----
    // TODO (futuro): aquí se integrará la llamada real con la
    // API key. Hoy solo simula una respuesta.
    async getResponse(userMessage) {
      return chooseResponse(userMessage);
    },
  };
})();