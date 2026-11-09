# 📖 Guía Integral y Explicación Técnica del Código — Geminuel
> **Repositorio Oficial:** [https://github.com/Josemma120/Geminuel.git](https://github.com/Josemma120/Geminuel.git)  
> **Objetivo:** Desglosar en profundidad la arquitectura, componentes, funciones y flujos de datos de Geminuel para comprender su funcionamiento interno y servir como plantilla constructiva para desarrollar un nuevo proyecto asistido por IA.

---

## 📑 Tabla de Contenidos

1. [Visión General de la Arquitectura](#1-visión-general-de-la-arquitectura)
2. [Estructura del Proyecto y Rol de Archivos](#2-estructura-del-proyecto-y-rol-de-archivos)
3. [Explicación a Fondo del Backend (`server.py`)](#3-explicación-a-fondo-del-backend-serverpy)
4. [Explicación del Motor de Red (`js/engine.js`)](#4-explicación-del-motor-de-red-jsenginejs)
5. [Explicación de la Lógica de Interfaz (`js/app.js`)](#5-explicación-de-la-lógica-de-interfaz-jsappjs)
6. [Explicación de la Maquetación y Accesibilidad (`index.html`)](#6-explicación-de-la-maquetación-y-accesibilidad-indexhtml)
7. [Explicación del Sistema de Diseño (`css/style.css`)](#7-explicación-del-sistema-de-diseño-cssstylecss)
8. [Historial Legacy y Transición de Node.js a Python](#8-historial-legacy-y-transición-de-nodejs-a-python)
9. [Guía Paso a Paso para Crear un Proyecto Nuevo Basado en Geminuel](#9-guía-paso-a-paso-para-crear-un-proyecto-nuevo-basado-en-geminuel)

---

## 1. Visión General de la Arquitectura

Geminuel está construido bajo un patrón **Cliente-Servidor Desacoplado** con **Proxy Local de Seguridad**:

```
┌────────────────────────────────────────────────────────┐
│              CAPA CLIENTE (Navegador Web)              │
│  - index.html  : Estructura semántica W3C + <dialog>   │
│  - style.css   : Sistema de tokens CSS (Dark/Light)    │
│  - app.js      : Estado, eventos, streaming y Markdown │
│  - engine.js   : Cliente HTTP asíncrono hacia el proxy │
└───────────────────────────┬────────────────────────────┘
                            │ Peticiones Fetch JSON (/api/chat, /api/chats)
                            ▼
┌────────────────────────────────────────────────────────┐
│            PROXY LOCAL SEGURO (server.py)              │
│  - Framework: FastAPI + Servidor ASGI Uvicorn          │
│  - Carga segura de .env (API Keys jamás van al cliente)│
│  - Persistencia de chats en JSON (chats.json)          │
│  - Resiliencia en Cascada (Cascade Fallback)           │
│  - Ventana deslizante de historial (12 mensajes)       │
└──────────────┬───────────────────────────┬─────────────┘
               │                           │
               ▼ (Proveedor 1 - Prioritario)▼ (Proveedor 2 - Respaldo)
     ┌───────────────────┐       ┌───────────────────┐
     │    Groq Cloud     │       │   Google Gemini   │
     │  DeepSeek R1 70B  │       │  Gemini 3.6 Flash │
     └───────────────────┘       └───────────────────┘
```

### ¿Por qué esta arquitectura es superior para un proyecto nuevo?
1. **Seguridad Total:** Las API Keys (`GEMINI_API_KEY`, `GROQ_API_KEY`) nunca se envían al navegador. Se mantienen en el servidor dentro de `.env` (ignorado en `.gitignore`).
2. **Cero Caídas (Alta Disponibilidad):** Si Groq se satura o se queda sin cuota (error 429), el servidor conmuta a Gemini automáticamente en segundo plano sin que la aplicación falle.
3. **Persistencia Sólida y Simple:** Las conversaciones se guardan en un archivo `chats.json` local en el servidor, permitiendo recargar o cambiar de navegador sin perder datos.
4. **Independencia de Frameworks Pesados en el Frontend:** Utiliza Vanilla JavaScript y HTML5 puro, cargando de forma instantánea sin necesidad de Webpack, Vite ni `node_modules` en el cliente.

---

## 2. Estructura del Proyecto y Rol de Archivos

| Archivo / Carpeta | Tecnología | Rol en la Aplicación |
| :--- | :--- | :--- |
| `server.py` | Python (FastAPI) | Backend central: API REST, proxy seguro de IA, persistencia y servidor de estáticos. |
| `requirements.txt` | Python Pip | Declaración de paquetes necesarios: `fastapi`, `uvicorn`, `httpx`, `python-dotenv`. |
| `start.bat` | Script Batch (Windows) | Instalador y lanzador automático en un clic para sistemas Windows. |
| `index.html` | HTML5 Semántico | Interfaz de usuario estructurada: área de chat, barra lateral, modal nativo `<dialog>`, intro animada. |
| `css/style.css` | CSS3 Vanilla | Sistema de diseño de alta fidelidad: terminal dark, variables CSS, animaciones y diseño responsivo. |
| `js/engine.js` | JavaScript ES6+ | Módulo cliente para comunicar la interfaz con los endpoints del backend (`GeminuelEngine`). |
| `js/app.js` | JavaScript ES6+ | Controlador principal: renderizado, streaming, historial, parseo de Markdown y gestión de modales. |
| `.env.example` | Texto plano | Plantilla pública para configurar puertos y claves de API. |
| `chats.json` | JSON (Generado) | Base de datos ligera donde el backend almacena las conversaciones y mensajes. |
| `legacy/` | Node.js | Contenedor histórico con la versión previa `server.js` y su documentación. |

---

## 3. Explicación a Fondo del Backend (`server.py`)

`server.py` es el núcleo del sistema. Consta de 448 líneas organizadas en módulos lógicos claros:

### 3.1. Carga de Configuración y Constantes (Líneas 33–74)
- **`load_dotenv(ROOT / ".env")`**: Lee las claves secretas desde el archivo local `.env`.
- **`SYSTEM_PROMPT`**: Inyecta la personalidad y límites de Geminuel:
  - Formato Markdown estricto.
  - Reglas de IA responsable: no recibir contraseñas ni datos sensibles, pedir verificación humana del código y actuar como **tutor didáctico**, no como caja negra.
  - Manejo de concisión y obligatoriedad de un cierre/conclusión en cada respuesta.
- **`HISTORY_WINDOW = 12`**: Constante que delimita la memoria que se le envía a la API a un máximo de los últimos 12 mensajes, evitando el consumo excesivo de tokens en chats largos.

### 3.2. Persistencia de Chats (`_load_chats` y `_save_chats`, Líneas 79–96)
```python
def _load_chats() -> list:
    if CHATS_FILE.exists():
        return json.loads(CHATS_FILE.read_text(encoding="utf-8"))
    return []

def _save_chats(chats: list) -> None:
    CHATS_FILE.write_text(json.dumps(chats, ensure_ascii=False, indent=2), encoding="utf-8")
```
- Lee y escribe en `chats.json` con soporte para caracteres especiales (`ensure_ascii=False`). Si el archivo no existe, arranca con una lista vacía.

### 3.3. Clientes de IA Asíncronos (`_call_gemini` y `_call_groq`, Líneas 101–225)
Ambas funciones operan con `httpx.AsyncClient(timeout=60.0)` para no bloquear el bucle de eventos:
- **Mapeo de Roles:** Traducen el rol `'assistant'` al formato esperado por cada proveedor (por ejemplo, Gemini exige `'model'`).
- **Política de Reintentos Exponenciales:**
  ```python
  for attempt in range(1, 4):
      resp = await client.post(...)
      if resp.status_code in (429, 503):
          await asyncio.sleep(0.7 * attempt) # Backoff exponencial: 0.7s, 1.4s, 2.1s
      else:
          break
  ```
  Si la API responde con límite de cuota (429) o saturación temporal (503), espera fracciones de segundo antes de reintentar antes de rendirse.

### 3.4. Algoritmo de Resiliencia en Cascada (`_cascade`, Líneas 227–271)
Este es el mecanismo más robusto del proyecto:
1. Intenta enviar el mensaje a **Groq (DeepSeek R1)**.
2. Si Groq tiene éxito, devuelve `{ "text": text, "provider": "groq", "cascaded": False }`.
3. Si Groq falla (o no hay `GROQ_API_KEY`), captura la excepción, registra el error y salta silenciosamente a **Google Gemini**.
4. Si Gemini responde, devuelve `{ "text": text, "provider": "gemini", "cascaded": True, "fallbackReason": ... }`.
5. Si ambos fallan, lanza un `RuntimeError` detallado indicando los motivos técnicos de ambos proveedores.

### 3.5. Rutas de la API REST (Líneas 303–406)
- **`GET /api/providers`**: Informa qué modelos tienen claves configuradas en el entorno.
- **`POST /api/chat`**: Recibe `{ userMessage, history, provider }` y ejecuta la llamada con cascada.
- **`GET /api/chats`**: Retorna todas las conversaciones guardadas.
- **`POST /api/chats`**: Crea una nueva conversación con un título y timestamp.
- **`POST /api/chats/{chat_id}/messages`**: Agrega un mensaje (de usuario o de la IA) al chat seleccionado.
- **`DELETE /api/chats/{chat_id}`**: Elimina una conversación de `chats.json`.

### 3.6. Servidor de Archivos Estáticos (Líneas 412–430)
- `app.mount("/css", StaticFiles(directory="css"))` y `app.mount("/js", StaticFiles(directory="js"))`.
- Ruta `/` que retorna directamente el archivo `index.html`.

---

## 4. Explicación del Motor de Red (`js/engine.js`)

`engine.js` aísla toda la lógica de red de la vista mediante el patrón módulo (IIFE):

- **Objeto Global:** Expone `window.GeminuelEngine`.
- **Mapeo de Errores Amigables (`ERROR_MESSAGES`):**
  Traduce códigos HTTP abstractos a mensajes claros en español:
  - `429` → "Se alcanzó el límite de uso de la IA temporalmente...".
  - `503` → "El servicio de IA está saturado en este momento...".
  - `offline` → "No se pudo conectar con el servidor local...".
- **Método `getResponse(userMessage, history, provider)`:**
  Envía el payload a `/api/chat` y devuelve un objeto estructurado:
  ```javascript
  {
    ok: true,
    text: "Respuesta de la IA...",
    provider: "groq" | "gemini",
    cascaded: false | true,
    fallbackReason: null | string
  }
  ```

---

## 5. Explicación de la Lógica de Interfaz (`js/app.js`)

Con más de 850 líneas, este archivo gestiona la reactividad de la aplicación sin dependencias:

### 5.1. Estado Centralizado (`state`, Líneas 15–22)
```javascript
const state = {
  isDark: true,          // Tema visual activo
  isTyping: false,        // Bandera de bloqueo mientras la IA genera respuesta
  chats: [],              // Lista de conversaciones sincronizadas con el backend
  currentChatId: null,    // ID del chat actualmente visualizado
  provider: 'cascade',    // Estrategia de IA activa
};
```

### 5.2. Parseador de Markdown y Bloques de Razonamiento (`parseMarkdown`, Líneas 137–185)
Convierte el texto recibido de la IA en HTML seguro y enriquecido:
- **Sanitización Inicial:** `escapeHtml()` previene inyecciones XSS convirtiendo `<` y `>` en entidades HTML.
- **Soporte para DeepSeek R1 (`<think>...</think>`):**
  Detecta las etiquetas de razonamiento de modelos DeepSeek y las transforma en elementos nativos desplegables:
  ```html
  <details class="reasoning-block" open>
    <summary class="reasoning-summary">🧠 Proceso de razonamiento</summary>
    <div class="reasoning-content">...</div>
  </details>
  ```
- **Bloques de Código:** Formatea ` ```lang ... ``` ` en etiquetas `<pre><code class="lang-...">`.
- **Formatos Comunes:** Negritas (`**`), cursivas (`*`), listas ordenadas/desordenadas y saltos de párrafo.

### 5.3. Efecto de Escritura en Streaming (`streamAIResponse`, Líneas 430–472)
- Como las APIs locales no siempre usan SSE (Server-Sent Events), `app.js` implementa un generador de streaming por fragmentos (`chunkSize = 20`) con variaciones aleatorias de tiempo (`setTimeout`), recreando la sensación fluida de una IA escribiendo en vivo junto a un cursor parpadeante (`<span class="cursor"></span>`).
- Incorpora un botón funcional de **"Copiar"** para guardar el texto generado en el portapapeles.

### 5.4. Ciclo de Vida de Mensajes (`sendMessage`, Líneas 475–550)
1. Comprueba que el mensaje no esté vacío y que no se esté procesando otro mensaje.
2. Si no hay un chat abierto, llama a `createChatAPI()` con un título generado automáticamente (`makeTitle()`).
3. Muestra el mensaje del usuario de inmediato en el DOM y lo persiste en el servidor (`addMessageAPI`).
4. Muestra el indicador animado de pensamiento (`renderTyping()`).
5. Invoca a `GeminuelEngine.getResponse()`.
6. Al recibir el resultado, ejecuta `streamAIResponse()` y persiste la respuesta generada en `server.py`.

### 5.5. Modal Nativo Accesible (`initConfirmModal`, Líneas 750–831)
- Reemplaza el clásico `confirm()` del navegador con el elemento nativo `<dialog id="confirm-modal">`.
- Controla el foco con teclado (tecla `Escape`, foco inicial en el botón *Cancelar* para evitar borrados accidentales).
- Cierra con animación de salida (`closing`) y previsualiza el título del chat que se va a borrar.

---

## 6. Explicación de la Maquetación y Accesibilidad (`index.html`)

1. **Semántica HTML5 Estricta:**
   - `<aside class="sidebar">`: Menú lateral para la navegación del historial.
   - `<main class="main">`: Contenedor principal del chat.
   - `<section class="chat-area">`: Zona donde se renderizan los mensajes.
   - `<footer class="input-area">`: Pie de página que contiene el formulario `<form id="chat-form">`.
   - `<dialog id="confirm-modal">`: Cuadro de diálogo modal nativo.
2. **Atributos WAI-ARIA:**
   - `role="log"` y `aria-live="polite"` en el contenedor `#messages`: Permite a los lectores de pantalla anunciar los nuevos mensajes a medida que llegan sin interrumpir al usuario.
   - `aria-label` y `title` en todos los botones de iconos para garantizar accesibilidad auditiva y visual.

---

## 7. Explicación del Sistema de Diseño (`css/style.css`)

- **Sistema de Tokens CSS (`:root`):**
  Centraliza colores primarios, fondos, bordes y fuentes:
  ```css
  --accent: #10a37f;
  --bg-app: #121316;
  --bg-surface: #1e1f23;
  --text-primary: #e6edf3;
  --border: rgba(255, 255, 255, 0.08);
  ```
- **Soporte Light/Dark Theme:** Mediante el selector `[data-theme="light"]`, sobreescribe las variables sin duplicar reglas CSS.
- **Micro-interacciones y Animaciones:**
  - Onda expansiva y esfera brillante (`.xbox-pulse-wave`, `.xbox-guide-sphere`).
  - Efectos de desenfoque (`backdrop-filter: blur(12px)`).
  - Transiciones suaves en modales y apertura/cierre de barra lateral.

---

## 8. Historial Legacy y Transición de Node.js a Python

El proyecto comenzó como un servidor nativo de Node.js (`server.js`, ubicado ahora en `legacy/server.js`):
- **¿Por qué se migró a Python?**
  1. **Ecosistema de IA:** Python es el estándar de facto en Inteligencia Artificial y facilita futuras integraciones (LangChain, LlamaIndex, embeddings locales, ChromaDB).
  2. **FastAPI & Rendimiento Asíncrono:** Validación automática con Pydantic y soporte nativo de asincronía mediante `uvicorn`.
  3. **Persistencia Simplificada:** Manejo fluido de archivos JSON y manipulación estructurada de datos.

---

## 9. Guía Paso a Paso para Crear un Proyecto Nuevo Basado en Geminuel

Si deseas construir un nuevo asistente conversacional o reutilizar esta base para otra aplicación, sigue estos pasos:

### Paso 1: Crear la estructura de carpetas
```text
MiNuevoAsistente/
├── .env
├── .env.example
├── requirements.txt
├── start.bat
├── server.py
├── index.html
├── css/
│   └── style.css
└── js/
    ├── engine.js
    └── app.js
```

### Paso 2: Definir `requirements.txt`
```text
fastapi>=0.115.0
uvicorn[standard]>=0.30.0
httpx>=0.27.0
python-dotenv>=1.0.0
```

### Paso 3: Configurar `.env` con tus claves
```env
GEMINI_API_KEY=tu_clave_de_google_ai_studio
GROQ_API_KEY=tu_clave_de_groq_console
PORT=8000
```

### Paso 4: Reutilizar y personalizar el backend (`server.py`)
- Modifica el `SYSTEM_PROMPT` para el rol específico de tu nuevo asistente (ej. experto legal, asesor médico, tutor matemático).
- Si solo deseas un proveedor, puedes simplificar `_cascade()` para usar solo `_call_gemini()` o `_call_groq()`.

### Paso 5: Personalizar la interfaz
- En `index.html`: Cambia el título `<title>` y las tarjetas de sugerencia rápida (`.suggestion-card`).
- En `css/style.css`: Cambia los colores principales (`--accent`, `--bg-app`) para adaptar la identidad visual de tu nuevo proyecto.
- En `js/app.js`: Personaliza los saludos iniciales y títulos.

### Paso 6: Lanzar el proyecto
En Windows, ejecuta `start.bat` o desde la terminal:
```bash
pip install -r requirements.txt
python server.py
```
Abre en tu navegador `http://localhost:8000` y tu nuevo asistente estará 100% operativo con memoria, persistencia y seguridad multi-proveedor.
