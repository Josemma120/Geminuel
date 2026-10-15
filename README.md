# Geminuel

> Asistente de programación conversacional basado en modelos de lenguaje (LLM), desarrollado con arquitectura web desacoplada, semántica HTML5 nativa y proxy de seguridad local.

[![Node.js Version](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![HTML5 Semantic](https://img.shields.io/badge/HTML5-W3C%20Semantic-E34F26?logo=html5&logoColor=white)](https://www.w3.org/TR/html52/)
[![CSS3 Vanilla](https://img.shields.io/badge/CSS3-Vanilla%20Design%20System-1572B6?logo=css3&logoColor=white)](https://www.w3.org/Style/CSS/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6%2B%20Vanilla-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/es/docs/Web/JavaScript)
[![Dependencies](https://img.shields.io/badge/Dependencies-0%20(Pure%20Native)-blue)](https://nodejs.org/api/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

---

## Tabla de Contenidos

- [Descripción General](#descripción-general)
- [Arquitectura del Sistema](#arquitectura-del-sistema)
- [Stack Tecnológico](#stack-tecnológico)
- [Características Principales](#características-principales)
- [Seguridad y Gestión de Claves](#seguridad-y-gestión-de-claves)
- [Instalación y Despliegue Local](#instalación-y-despliegue-local)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Buenas Prácticas e IA Responsable](#buenas-prácticas-e-ia-responsable)
- [Contexto del Proyecto](#contexto-del-proyecto)

---

## Descripción General

**Geminuel** es una aplicación web interactiva orientada al aprendizaje, depuración y desarrollo de software asistido por inteligencia artificial. Diseñada como una herramienta de apoyo pedagógico y técnico, permite a estudiantes y desarrolladores interactuar con modelos de lenguaje avanzados para resolver problemas de lógica, sintaxis, arquitectura de software y optimización de algoritmos.

### Problema que aborda

El desarrollo de software en etapas formativas suele enfrentar barreras críticas:
- Diagnóstico complejo de mensajes de error de compilación o ejecución.
- Dificultad para comprender la lógica detrás de algoritmos clásicos sin explicaciones paso a paso.
- Riesgo de copia ciega de código sin entender los principios subyacentes.

Geminuel estructura sus respuestas no como un generador de código opaco, sino como un tutor interactivo que explica los fundamentos, señala advertencias de seguridad y promueve la verificación activa del software generado.

---

## Arquitectura del Sistema

El proyecto implementa una arquitectura desacoplada en tres capas con **cero dependencias externas** (sin carpeta `node_modules`), garantizando portabilidad inmediata, tiempos de carga mínimos y máxima seguridad:

```
┌────────────────────────────────────────────────────────┐
│               CAPA CLIENTE (Navegador Web)             │
│   • index.html (Semántica HTML5 nativa & WAI-ARIA)     │
│   • style.css  (Sistema de diseño dark terminal)       │
│   • app.js     (Gestión de UI, historial y eventos)   │
│   • engine.js  (Capa de abstracción de red)            │
└───────────────────────────┬────────────────────────────┘
                            │  Peticiones HTTP (/api/chat)
                            ▼
┌────────────────────────────────────────────────────────┐
│               PROXY LOCAL SEGURO (server.js)           │
│   • Servidor HTTP nativo de Node.js                    │
│   • Lector de variables de entorno (.env sin paquetes) │
│   • Gestión de cuotas, reintentos y fallback en cascada│
│   • Ventana deslizante de historial (Memory Window)    │
└──────────────┬───────────────────────────┬─────────────┘
               │                           │
               ▼ (Proveedor prioritario)   ▼ (Fallback silencioso)
     ┌───────────────────┐       ┌───────────────────┐
     │    Groq Cloud     │       │   Google Gemini   │
     │    API Gateway    │       │    API Gateway    │
     └───────────────────┘       └───────────────────┘
```

### Flujo de Datos y Resiliencia en Cascada
1. **Petición del usuario:** El frontend empaqueta el mensaje junto con una ventana deslizante de los últimos 12 mensajes del hilo.
2. **Proxy local:** `server.js` intercepta la solicitud, inyecta las directivas de comportamiento del sistema y gestiona la llamada al proveedor.
3. **Mapeo de resiliencia:** Ante errores de red, saturación del servicio (503) o límites de cuota (429), el servidor realiza un cambio automático y transparente al proveedor de respaldo, asegurando disponibilidad continua sin intervención manual.

---

## Stack Tecnológico

| Capa | Tecnología | Justificación Técnica |
| :--- | :--- | :--- |
| **Estructura** | HTML5 W3C | Empleo de elementos semánticos (`<main>`, `<aside>`, `<nav>`, `<section>`, `<footer>`, `<form>`, `<h1>`-`<h2>`) y el elemento nativo `<dialog>` para modales accesibles. |
| **Estilos** | CSS3 Vanilla | Variables CSS personalizadas (`--accent`, `--bg-app`), glassmorphism con `backdrop-filter`, animaciones optimizadas y diseño responsivo adaptativo. |
| **Lógica Cliente** | JavaScript (ES6+) | Código modular, Promesas asíncronas (`async/await`), eventos delegados y persistencia cliente mediante `LocalStorage`. |
| **Servidor Proxy** | Node.js (Core Modules) | Servidor HTTP creado exclusivamente con módulos estándar (`http`, `fs`, `path`). No requiere ejecutar `npm install`. |

---

## Características Principales

- **Semántica y Accesibilidad (WAI-ARIA):** Implementación de roles ARIA (`role="log"`, `aria-live="polite"`), navegación por teclado (`Escape`, `Enter`) y foco controlado para usuarios de tecnologías asistivas.
- **Modal de Confirmación Nativo (`<dialog>`):** Reemplazo integral de alertas bloqueantes del navegador por un cuadro de diálogo contextual, con previsualización del título a eliminar y capa de desenfoque nativa (`::backdrop`).
- **Formulario Interactivo de Envío (`<form>`):** Procesamiento de mensajes mediante eventos estándar de formulario, permitiendo envío con tecla Enter y salto de línea con `Shift + Enter`.
- **Indicador de Razonamiento Visual:** Animación de carga inspirada en la guía Xbox con monograma `G` iluminado y desgloses de razonamiento desplegables (`<details>` / `<summary>`).
- **Historial Persistente y Gestión Local:** Guardado automático de conversaciones en el navegador con soporte para retomar hilos anteriores o eliminarlos de manera segura.
- **Diseño Adaptativo (Dark / Light Mode):** Paleta inspirada en entornos de desarrollo modernos y terminales de comandos, con alternador de tema en tiempo real.

---

## Seguridad y Gestión de Claves

En cumplimiento de las mejores prácticas de desarrollo web seguro:

1. **Aislamiento de Credenciales:** Las claves de API (`GEMINI_API_KEY`, `GROQ_API_KEY`) residen exclusivamente en el entorno del servidor a través del archivo `.env`. Ningún token o secreto es expuesto en el código cliente ni transmitido por el navegador.
2. **Prevención de Fugas:** El archivo `.env` se encuentra ignorado por defecto en `.gitignore` para evitar filtraciones en repositorios públicos.
3. **Sanitización de Salidas:** El renderizador de contenido escapa cadenas de texto no confiables antes de inyectarlas en el DOM para mitigar vulnerabilidades XSS.

---

## Instalación y Despliegue Local

### Requisitos Previos

- **Node.js 18.0 o superior** instalado ([nodejs.org](https://nodejs.org/)).

### 1. Clonar el repositorio
```bash
git clone https://github.com/Josemma120/Geminuel.git
cd Geminuel
```

### 2. Configurar las variables de entorno
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

# Clave de Groq (Groq Console - Opcional para respaldo)
GROQ_API_KEY=tu_clave_groq_aqui

# Puerto de escucha local (por defecto: 8000)
PORT=8000
```

### 3. Iniciar el servidor
Ejecuta el servidor proxy local (no requiere instalar dependencias adicionales):
```bash
node server.js
```

### 4. Acceder en el navegador
Ingresa a la siguiente dirección en tu navegador:
```
http://localhost:8000
```

---

## Estructura del Proyecto

```
Geminuel/
├── index.html          # Estructura semántica HTML5 y puntos de anclaje
├── server.js           # Servidor proxy HTTP y gestión de modelos LLM
├── favicon.svg         # Isotipo vectorial de la aplicación
├── .env.example        # Plantilla pública de variables de entorno
├── .gitignore          # Exclusión de archivos sensibles y temporales
├── README.md           # Documentación técnica del proyecto
├── css/
│   └── style.css       # Sistema de diseño, tokens, componentes y animaciones
└── js/
    ├── app.js          # Controlador de interfaz, eventos y almacenamiento
    └── engine.js       # Capa de comunicación asíncrona con el backend
```

---

## Buenas Prácticas e IA Responsable

- **Validación Humana:** Todo código, comando o solución lógica generada por el asistente debe ser revisado y probado en entornos de prueba antes de su despliegue en entornos productivos.
- **Privacidad de Datos:** Se recomienda no ingresar contraseñas, secretos de API, credenciales corporativas o datos personales identificables (PII) en los mensajes.
- **Tutoría sobre Automatización:** El asistente prioriza guiar pedagógicamente al programador sobre la razón técnica de una falla antes que entregar soluciones automáticas no explicadas.

---

## Contexto del Proyecto

- **Materia:** Fundamentos de Inteligencia Artificial
- **Nivel:** 7° Cuatrimestre
- **Proyecto:** Asistente Conversacional para Desarrollo de Software con Modelos Fundacionales