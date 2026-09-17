# Geminuel 🤖💻

> **Geminuel** es un asistente de programación basado en inteligencia artificial que ayuda a los usuarios a comprender, crear y corregir código mediante una conversación sencilla y explicaciones paso a paso.

---

## 🎯 ¿Qué es Geminuel y qué problema resuelve?

Geminuel fue diseñado para facilitar el aprendizaje y desarrollo de software, ayudando a resolver desafíos cotidianos en la programación como:

- **Dudas de sintaxis y lógica:** Explicación clara sobre cómo estructurar funciones, bucles o estructuras de datos.
- **Depuración de código:** Análisis de errores de consola y fallos de ejecución.
- **Comprensión de algoritmos:** Desglose paso a paso de algoritmos complejos y patrones de diseño.
- **Desarrollo de proyectos:** Ayuda desde cero para estructurar programas en múltiples lenguajes de programación.

---

## 👥 Público Objetivo

Este sistema está optimizado para:

- 🎓 **Estudiantes de programación:** Que necesitan explicaciones didácticas y ejemplos claros.
- 🚀 **Programadores principiantes:** Que buscan solucionar dudas de sintaxis y entender las mejores prácticas.
- 💻 **Desarrolladores y entusiastas:** Que requieren ayuda para estructurar código, generar plantillas o refactorizar proyectos.

---

## ✨ Características

- 🤖 **Asistente de programación:** Responde con explicaciones, ejemplos de código, correcciones y soluciones paso a paso.
- 💬 **Historial de conversaciones:** Menú lateral discreto para consultar, reanudar o eliminar conversaciones anteriores.
- 💾 **Persistencia local:** Guarda automáticamente las conversaciones en tu navegador para que nunca pierdas el historial.
- 🌙 **Modo oscuro / claro:** Alterna la apariencia visual según tus preferencias.
- 🖥️ **Estética tipo terminal:** Tipografía monoespaciada y textos grandes con enfoque en legibilidad.
- 📋 **Botón para copiar respuestas:** Copia cualquier respuesta de la IA con un clic.
- 📱 **Diseño adaptativo (responsive):** Funciona en dispositivos móviles y de escritorio.

---

## 📥 Información que recibe y 📤 Respuestas que genera

| Entradas (lo que recibe) | Salidas (lo que genera) |
| :--- | :--- |
| Preguntas y dudas conceptuales en lenguaje natural | Explicaciones paso a paso detalladas |
| Fragmentos de código con o sin errores | Correcciones, refactorizaciones y código optimizado |
| Capturas de texto o mensajes de error | Diagnóstico del fallo y solución sugerida |
| Indicaciones del lenguaje o framework a utilizar | Código estructurado en el lenguaje solicitado |

---

## 📁 Estructura del proyecto

```
geminuel/
├── index.html        → Interfaz principal
├── css/
│   └── style.css     → Estilos de la aplicación
└── js/
    ├── app.js        → Lógica de la interfaz (UI, conversaciones, renderizado)
    └── engine.js     → Motor de respuestas del asistente
```

La interfaz (`app.js`) y el motor de respuestas (`engine.js`) están separados. `app.js` solo usa `GeminuelEngine.getResponse(mensaje)` para obtener respuestas, sin conocer los detalles internos de cómo se generan.

> ⚠️ **Nota:** Actualmente el motor responde con respuestas simuladas. En el futuro se conectará a una API real, y ese cambio quedará contenido únicamente en `js/engine.js`.

---

## 🚀 ¿Cómo ejecutar el proyecto localmente?

### Opción A: Servidor local (recomendado)

Abre la terminal en la carpeta del proyecto y ejecuta:

```powershell
python -m http.server 8000
```

Luego abre tu navegador e ingresa a: **`http://localhost:8000`**

### Opción B: Abrir directamente el archivo

1. Navega a la carpeta del proyecto en tu explorador de archivos.
2. Haz doble clic sobre **`index.html`** para abrirlo en cualquier navegador.

---

## ⚠️ Uso responsable y riesgos

Geminuel puede brindarte ayuda valiosa, pero ten en cuenta:

- 🔍 **Revisa y prueba siempre el código** antes de usarlo en proyectos reales; las respuestas pueden contener errores.
- 🧠 **Úsalo como guía de aprendizaje:** trata de entender la solución en lugar de solo copiarla.
- 🔒 **No compartas información sensible:** evita escribir contraseñas, datos personales o información privada en el chat.
- ⚖️ **Verifica decisiones importantes** con una persona o documentación oficial antes de confiar en una respuesta.

---

## 🗺️ Próximos pasos

- Conectar `js/engine.js` a una API de IA real para generar respuestas reales.
- Detectar mejor la intención del usuario (lenguaje, nivel de experiencia, tipo de duda).
- Incluir avisos de incertidumbre cuando la pregunta sea ambigua.