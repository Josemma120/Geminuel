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

- 🤖 **Asistente de programación:** Responde con explicaciones, ejemplos de código, correcciones y soluciones paso a paso generadas por la API de Gemini.
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
├── server.js         → Servidor local (proxy de IA) — guarda la clave
├── .env.example      → Plantilla de configuración (copia a ".env")
├── css/
│   └── style.css     → Estilos de la aplicación
└── js/
    ├── app.js        → Lógica de la interfaz (UI, conversaciones, renderizado)
    └── engine.js     → Motor de respuestas del asistente
```

La interfaz (`app.js`) y el motor de respuestas (`engine.js`) están separados. `app.js` solo usa `GeminuelEngine.getResponse(mensaje, historial)` para obtener respuestas, sin conocer los detalles internos de cómo se generan.

> ⚙️ **Respuestas reales:** El motor pide la respuesta al servidor local (`server.js`), que consulta la **API de Gemini** (modelo `gemini-3.6-flash`). Si el servidor no está corriendo o la API falla (sin conexión, límite de cuota, etc.), se usa un respaldo simulado y se muestra un aviso visible en el chat para que no quede como una respuesta real.

---

## 🔑 Clave de la API

- La clave se guarda en un archivo **`.env`** (no se sube al repositorio), en la variable `GEMINI_API_KEY`. Puedes conseguir una gratuita en [Google AI Studio](https://aistudio.google.com/apikey).
- ⚠️ **Es un secreto:** con este servidor la clave **no viaja en el navegador** ni aparece en el código del frontend. Solo `server.js` la lee desde `.env`.
- ⚠️ **No subas `.env` al repositorio** (ya está en `.gitignore`). Para usar la app en otra computadora, copia el repositorio **sin** `.env` y crea ahí uno nuevo con `GEMINI_API_KEY`.
- En AI Studio puedes **restringir el uso** de la clave (a tu proyecto y a tu origen/dominio) para evitar abusos o costos inesperados.

---

## 🚀 ¿Cómo ejecutar el proyecto localmente?

### Prerrequisito

Tener **Node.js 18 o superior** instalado (https://nodejs.org).

### 1. Configurar la clave

En la carpeta del proyecto, copia la plantilla y edítala con tu clave:

```powershell
Copy-Item .env.example .env
# Abre ".env" y reemplaza "pon_aqui_tu_clave" por tu GEMINI_API_KEY
```

### 2. Iniciar el servidor

```powershell
node server.js
```

Luego abre tu navegador e ingresa a: **`http://localhost:8000`**

> 💡 **Importante:** ahora la app necesita el servidor local para funcionar (el navegador obtiene respuestas reales en `/api/chat`). Si abres `index.html` con doble clic verás la interfaz, pero el chat usará el respaldo simulado con aviso, porque no hay servidor que responda.

---

## ⚠️ Uso responsable y riesgos

Geminuel puede brindarte ayuda valiosa, pero ten en cuenta:

- 🔍 **Revisa y prueba siempre el código** antes de usarlo en proyectos reales; las respuestas pueden contener errores.
- 🧠 **Úsalo como guía de aprendizaje:** trata de entender la solución en lugar de solo copiarla.
- 🔒 **No compartas información sensible:** evita escribir contraseñas, datos personales o información privada en el chat.
- ⚖️ **Verifica decisiones importantes** con una persona o documentación oficial antes de confiar en una respuesta.

---

## 🗺️ Próximos pasos

- Detectar mejor la intención del usuario (lenguaje, nivel de experiencia, tipo de duda).
- Incluir avisos de incertidumbre cuando la pregunta sea ambigua.
- Explorar la respuesta en streaming real de la API (`streamGenerateContent`).