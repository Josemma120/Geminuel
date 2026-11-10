# MonseNuel

> Asistente de programación conversacional basado en modelos de lenguaje (LLM), con arquitectura web desacoplada, semántica HTML5 nativa, proxy de seguridad local y análisis de repositorios de GitHub.

[![Python](https://img.shields.io/badge/Python-3.11%2B-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115%2B-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![HTML5 Semantic](https://img.shields.io/badge/HTML5-W3C%20Semantic-E34F26?logo=html5&logoColor=white)](https://www.w3.org/TR/html52/)
[![CSS3 Vanilla](https://img.shields.io/badge/CSS3-Vanilla%20Design%20System-1572B6?logo=css3&logoColor=white)](https://www.w3.org/Style/CSS/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B%20Vanilla-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/es/docs/Web/JavaScript)
[![GitHub API](https://img.shields.io/badge/GitHub-REST%20API-181717?logo=github&logoColor=white)](https://docs.github.com/rest)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Arquitectura del Sistema](#arquitectura-del-sistema)
- [Stack Tecnológico](#stack-tecnológico)
- [Características Principales](#características-principales)
- [Análisis de Repositorios de GitHub](#análisis-de-repositorios-de-github)
- [Seguridad y Gestión de Claves](#seguridad-y-gestión-de-claves)
- [Instalación y Despliegue Local](#instalación-y-despliegue-local)
- [API del Servidor](#api-del-servidor)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Buenas Prácticas e IA Responsable](#buenas-prácticas-e-ia-responsable)
- [Contexto del Proyecto](#contexto-del-proyecto)

---

## Descripción General

**MonseNuel** es una aplicación web interactiva orientada al aprendizaje, depuración y desarrollo de software asistido por inteligencia artificial. Diseñada como una herramienta de apoyo pedagógico y técnico, permite a estudiantes y desarrolladores interactuar con modelos de lenguaje avanzados para resolver problemas de lógica, sintaxis, arquitectura de software y optimización de algoritmos.

Además del chat conversacional, MonseNuel puede **leer un repositorio de GitHub** a partir de su enlace y usar su código como contexto para responder preguntas, detectar bugs, explicar la arquitectura o proponer mejoras.

### Problema que aborda

El desarrollo de software en etapas formativas suele enfrentar barreras críticas:
- Diagnóstico complejo de mensajes de error de compilación o ejecución.
- Dificultad para comprender la lógica detrás de algoritmos clásicos sin explicaciones paso a paso.
- Riesgo de copia ciega de código sin entender los principios subyacentes.
- Pérdida de contexto al pedir ayuda sobre un proyecto real sin poder compartir todo el código.

MonseNuel estructura sus respuestas no como un generador de código opaco, sino como un tutor interactivo que explica los fundamentos, señala advertencias de seguridad y promueve la verificación activa del software generado. Con la integración de GitHub, el asistente puede razonar sobre el código real del usuario en lugar de ejemplos aislados.

---

## Arquitectura del Sistema

El proyecto implementa una arquitectura desacoplada en tres capas, garantizando portabilidad inmediata, tiempos de carga mínimos y máxima seguridad:

```
┌────────────────────────────────────────────────────────┐
│               CAPA CLIENTE (Navegador Web)             │
│   • index.html (Semántica HTML5 nativa & WAI-ARIA)     │
│   • style.css  (Sistema de diseño dark terminal)       │
│   • app.js     (UI, historial, eventos y panel GitHub) │
│   • engine.js  (Capa de abstracción de red)            │
└───────────────────────────┬────────────────────────────┘
                            │  Peticiones HTTP (/api/*)
                            ▼
┌────────────────────────────────────────────────────────┐
│           PROXY LOCAL SEGURO (server.py — FastAPI)     │
│   • Servidor ASGI con uvicorn                          │
│   • Lector de variables de entorno (python-dotenv)     │
│   • Gestión de cuotas, reintentos y fallback en cascada│
│   • Ventana deslizante de historial (Memory Window)    │
│   • Persistencia de chats en chats.json (servidor)     │
│   • Descarga y filtrado de repositorios de GitHub      │
└──────────┬──────────────────┬──────────────┬───────────┘
           │                  │              │
           ▼ (prioritario)    ▼ (fallback)  ▼ (solo lectura)
   ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
   │  Groq Cloud   │  │ Google Gemini │  │  GitHub API   │
   │  API Gateway  │  │  API Gateway  │  │ (solo lectura)│
   └───────────────┘  └───────────────┘  └───────────────┘
```

### Flujo de Datos y Resiliencia en Cascada

1. **Petición del usuario:** El frontend empaqueta el mensaje junto con una ventana deslizante de los últimos 12 mensajes del hilo (6 si hay un repositorio cargado).
2. **Proxy local:** `server.py` intercepta la solicitud, inyecta las directivas de comportamiento del sistema y gestiona la llamada al proveedor.
3. **Mapeo de resiliencia:** Ante errores de red, saturación del servicio (503) o límites de cuota (429), el servidor realiza un cambio automático y transparente al proveedor de respaldo, asegurando disponibilidad continua sin intervención manual.
4. **Persistencia del historial:** Cada mensaje y respuesta se guarda en `chats.json` en el servidor, permitiendo retomar conversaciones desde cualquier navegador sin depender de `localStorage`.
5. **Contexto de repositorio:** Al cargar un enlace de GitHub, el servidor descarga el código permitido, lo recorta y lo guarda en memoria por sesión. En cada mensaje posterior ese código se inyecta de forma delimitada en el *system prompt* de Groq o Gemini.

---

## Stack Tecnológico

| Capa | Tecnología | Justificación Técnica |
| :--- | :--- | :--- |
| **Estructura** | HTML5 W3C | Empleo de elementos semánticos (`<main>`, `<aside>`, `<nav>`, `<section>`, `<footer>`, `<form>`, `<h1>`-`<h2>`) y el elemento nativo `<dialog>` para modales accesibles. |
| **Estilos** | CSS3 Vanilla | Variables CSS personalizadas (`--accent`, `--bg-app`), glassmorphism con `backdrop-filter`, animaciones optimizadas y diseño responsivo adaptativo. |
| **Lógica Cliente** | JavaScript (ES6+) | Código modular, Promesas asíncronas (`async/await`), eventos delegados y comunicación REST con el servidor. |
| **Servidor Proxy** | Python 3.11 + FastAPI | Servidor ASGI con uvicorn, gestión de rutas REST, persistencia JSON y llamadas HTTP asíncronas con `httpx`. |
| **Integración GitHub** | GitHub REST API + raw.githubusercontent.com | Descarga del árbol de archivos y del contenido en crudo, con filtrado por extensión y límites de contexto. |

---

## Características Principales

- **Análisis de repositorios de GitHub:** Pega el enlace de un repositorio y MonseNuel descargará los archivos de código relevantes para usarlos como contexto de la conversación.
- **Semántica y Accesibilidad (WAI-ARIA):** Implementación de roles ARIA (`role="log"`, `aria-live="polite"`), navegación por teclado (`Escape`, `Enter`) y foco controlado para usuarios de tecnologías asistivas.
- **Modal de Confirmación Nativo (`<dialog>`):** Reemplazo integral de alertas bloqueantes del navegador por un cuadro de diálogo contextual, con previsualización del título a eliminar y capa de desenfoque nativa (`::backdrop`).
- **Formulario Interactivo de Envío (`<form>`):** Procesamiento de mensajes mediante eventos estándar de formulario, permitiendo envío con tecla Enter y salto de línea con `Shift + Enter`.
- **Indicador de Razonamiento Visual:** Animación de carga inspirada en la guía Xbox con monograma `M` iluminado y desgloses de razonamiento desplegables (`<details>` / `<summary>`).
- **Historial Persistente en Servidor:** Las conversaciones se guardan en `chats.json` en el servidor, sobreviviendo cambios de navegador o dispositivo y permitiendo retomar hilos anteriores o eliminarlos de forma segura.
- **Diseño Adaptativo (Dark / Light Mode):** Paleta inspirada en entornos de desarrollo modernos y terminales de comandos, con alternador de tema en tiempo real.
- **Marca con división de color:** El nombre `MonseNuel` mantiene su identidad visual en dos tonos (`Monse` rosa y `Nuel` azul).

---

## Análisis de Repositorios de GitHub

La barra superior del chat incluye un campo para pegar el enlace de un repositorio y un botón **Analizar repositorio**.

### Formatos de enlace aceptados

```text
https://github.com/usuario/repositorio
https://github.com/usuario/repositorio/tree/rama
git@github.com:usuario/repositorio.git
```

Solo se permiten enlaces cuyo host sea `github.com` o `www.github.com`. Cualquier otro dominio se rechaza para evitar ataques SSRF.

### Cómo funciona

1. El frontend envía `{ repoUrl, sessionId }` a `POST /api/repo/load`.
2. El backend valida el enlace, consulta los metadatos del repositorio y obtiene el árbol recursivo de archivos.
3. Se filtran solo las extensiones relevantes: `.py`, `.js`, `.ts`, `.html`, `.css`.
4. Se excluyen directorios y archivos no útiles: `node_modules`, `.git`, `dist`, `build`, `out`, `vendor`, `coverage`, `.venv`, `venv`, `env`, `__pycache__`, `.next`, `.nuxt`, `target`, `legacy`, `migrations`, `assets`, `static`, además de archivos `.min.js` / `.min.css`.
5. Los archivos se descargan en paralelo desde `raw.githubusercontent.com` (máximo 8 descargas simultáneas).
6. El contenido se recorta según los límites de contexto y se guarda en memoria asociado al `sessionId`.
7. En cada mensaje del chat, ese contenido se inyecta en el *system prompt* del modelo como datos delimitados (`<<<REPO_DATA_START>>>` … `<<<REPO_DATA_END>>>`), indicando explícitamente que **no son instrucciones**.

### Límites aplicados

| Límite | Valor |
| :--- | :--- |
| Archivos por repositorio | 50 |
| Caracteres por archivo | 15 000 |
| Caracteres totales de contexto | 90 000 |
| Tamaño máximo por archivo remoto | 200 KB |
| Descargas simultáneas | 8 |
| Mensajes de historial con repo cargado | 6 |

Si el repositorio excede estos límites, el panel indica **contexto recortado** y el asistente trabaja con la porción disponible.

### Repositorios privados y límites de GitHub

Sin token, la API de GitHub permite aproximadamente **60 peticiones por hora**. Para repositorios privados o un uso más intensivo, configura `GITHUB_TOKEN` en `.env`:

```env
GITHUB_TOKEN=tu_token_github_aqui
```

Crea el token en [github.com/settings/tokens](https://github.com/settings/tokens) con el permiso `repo` si necesitas acceder a repositorios privados.

### Gestión del contexto

- El botón **Quitar** elimina el repositorio cargado de la sesión (`DELETE /api/repo`).
- El contexto vive en memoria del servidor: **no se guarda en `chats.json`** y se pierde al reiniciar el servidor.
- El `sessionId` se genera en el navegador y se conserva en `localStorage` para mantener la asociación entre el repositorio y la conversación.

---

## Seguridad y Gestión de Claves

En cumplimiento de las mejores prácticas de desarrollo web seguro:

1. **Aislamiento de Credenciales:** Las claves de API (`GEMINI_API_KEY`, `GROQ_API_KEY`, `GITHUB_TOKEN`) residen exclusivamente en el entorno del servidor a través del archivo `.env`. Ningún token o secreto es expuesto en el código cliente ni transmitido por el navegador.
2. **Prevención de Fugas:** El archivo `.env` y el historial de chats (`chats.json`) se encuentran ignorados por defecto en `.gitignore` para evitar filtraciones en repositorios públicos.
3. **Sanitización de Salidas:** El renderizador de contenido escapa cadenas de texto no confiables antes de inyectarlas en el DOM para mitigar vulnerabilidades XSS.
4. **Protección SSRF:** El endpoint de GitHub solo acepta URLs cuyo host sea `github.com` / `www.github.com`, rechazando IPs, `localhost` y dominios externos.
5. **Defensa ante *prompt injection*:** El código descargado se marca como datos no confiables y se delimita en el prompt; se instruye al modelo a ignorar órdenes contenidas en el repositorio y a no revelar secretos.

---

## Instalación y Despliegue Local

### Requisitos Previos

- **Python 3.11 o superior** instalado ([python.org](https://www.python.org/)).
- Claves de API de [Google AI Studio](https://aistudio.google.com/) y/o [Groq Console](https://console.groq.com/).
- Opcional: un token de GitHub para repositorios privados y mayor límite de peticiones.

### 1. Clonar el repositorio

```bash
git clone https://github.com/Josemma120/Geminuel.git
cd Geminuel
```

### 2. Instalar dependencias

```bash
pip install -r requirements.txt
```

### 3. Configurar las variables de entorno

Crea tu archivo `.env` a partir de la plantilla de ejemplo:

**En Windows (PowerShell):**
```powershell
Copy-Item .env.example .env
```

**En Linux / macOS:**
```bash
cp .env.example .env
```

Abre `.env` con un editor de texto e introduce al menos una clave válida:

```env
# Clave de Google Gemini (Google AI Studio)
GEMINI_API_KEY=tu_clave_gemini_aqui

# Clave de Groq (Groq Console - Opcional, activa Llama 3.1 8B como proveedor prioritario)
GROQ_API_KEY=tu_clave_groq_aqui

# Token de GitHub (opcional): evita el límite de 60 peticiones/hora
# y permite analizar repositorios privados.
GITHUB_TOKEN=tu_token_github_aqui

# Puerto de escucha local (por defecto: 8000)
PORT=8000
```

### 4. Iniciar el servidor

**Opción A — Script de inicio (recomendado en Windows):**
Haz doble clic en `start.bat`. Instala dependencias automáticamente y arranca el servidor.

**Opción B — Línea de comandos:**
```bash
python server.py
```

### 5. Acceder en el navegador

Ingresa a la siguiente dirección en tu navegador:

```text
http://localhost:8000
```

---

## API del Servidor

| Método | Ruta | Descripción |
| :--- | :--- | :--- |
| `POST` | `/api/chat` | Envía un mensaje al modelo (cascada Groq → Gemini). Acepta `sessionId` para usar el repositorio cargado. |
| `POST` | `/api/repo/load` | Descarga y registra un repositorio de GitHub como contexto de la sesión. |
| `GET` | `/api/repo/status` | Consulta si la sesión tiene un repositorio cargado. |
| `DELETE` | `/api/repo` | Elimina el repositorio cargado de la sesión. |
| `GET` | `/api/providers` | Estado y modelo de los proveedores de IA configurados. |
| `GET` | `/api/groq/models` | Modelos de chat disponibles en la cuenta de Groq. |
| `GET` | `/api/chats` | Lista las conversaciones guardadas. |
| `POST` | `/api/chats` | Crea una conversación nueva. |
| `POST` | `/api/chats/{id}/messages` | Añade un mensaje a una conversación. |
| `DELETE` | `/api/chats/{id}` | Elimina una conversación. |

---

## Estructura del Proyecto

```
Geminuel/
├── server.py           # Servidor proxy FastAPI, IA en cascada y lectura de GitHub
├── requirements.txt    # Dependencias Python
├── start.bat           # Script de inicio para Windows
├── index.html          # Estructura semántica HTML5 y puntos de anclaje
├── favicon.svg         # Isotipo vectorial de la aplicación
├── chats.json          # Historial persistente de conversaciones (generado)
├── .env.example        # Plantilla pública de variables de entorno
├── .gitignore          # Exclusión de archivos sensibles y temporales
├── README.md           # Documentación técnica del proyecto
├── css/
│   └── style.css       # Sistema de diseño, tokens, componentes y animaciones
├── js/
│   ├── app.js          # Controlador de interfaz, eventos, panel GitHub y API REST
│   └── engine.js       # Capa de comunicación asíncrona con el backend
└── legacy/
    └── server.js       # Implementación anterior en Node.js (referencia)
```

---

## Buenas Prácticas e IA Responsable

- **Validación Humana:** Todo código, comando o solución lógica generada por el asistente debe ser revisado y probado en entornos de prueba antes de su despliegue en entornos productivos.
- **Privacidad de Datos:** Se recomienda no ingresar contraseñas, secretos de API, credenciales corporativas o datos personales identificables (PII) en los mensajes.
- **Repositorios públicos:** Evita analizar repositorios con secretos commiteados; el contenido descargado se envía al proveedor de IA como contexto.
- **Tutoría sobre Automatización:** El asistente prioriza guiar pedagógicamente al programador sobre la razón técnica de una falla antes que entregar soluciones automáticas no explicadas.
- **Lectura, no ejecución:** El análisis de GitHub es de solo lectura: MonseNuel no clona, ejecuta ni modifica el repositorio.

---

## Contexto del Proyecto

- **Materia:** Fundamentos de Inteligencia Artificial
- **Nivel:** 7° Cuatrimestre
- **Proyecto:** Asistente Conversacional para Desarrollo de Software con Modelos Fundacionales
