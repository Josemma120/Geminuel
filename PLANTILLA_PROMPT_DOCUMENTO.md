# 📋 Plantilla y Prompt Maestro para Generación de Documento Académico / Técnico
> **Proyecto:** Geminuel — Asistente de Programación con Modelos Fundacionales  
> **Repositorio Oficial:** [https://github.com/Josemma120/Geminuel.git](https://github.com/Josemma120/Geminuel.git)  
> **Materia:** Fundamentos de Inteligencia Artificial (7° Cuatrimestre)

---

## 📌 ¿Cómo usar este archivo?

1. **Copia todo el bloque de texto** que se encuentra dentro de la sección **"PROMPT MAESTRO"** (desde `INICIO DEL PROMPT` hasta `FIN DEL PROMPT`).
2. **Pégalo** en tu modelo de lenguaje preferido (ChatGPT, Claude, Gemini, etc.) o utilízalo como guía estructurada para redactar tu documento en Microsoft Word, Google Docs o LaTeX.
3. El prompt ya incluye **todo el contexto técnico verificado y actualizado** del repositorio (incluyendo la migración a Python/FastAPI, endpoints, interfaz semántica y principios de IA responsable).

---

```markdown
============================= INICIO DEL PROMPT =============================

Actúa como un redactor técnico y académico especializado en Inteligencia Artificial y Desarrollo de Software. Tu objetivo es generar un **Documento / Reporte Formal de Proyecto** completo, profesional, riguroso y listo para entrega académica o ejecutiva, basado en la información técnica proporcionada a continuación.

---

### DATOS GENERALES DEL PROYECTO (Completar / Ajustar si es necesario)
- **Nombre del Proyecto:** Geminuel
- **Materia:** Fundamentos de Inteligencia Artificial
- **Nivel Académico:** 7° Cuatrimestre
- **Autor / Estudiante:** [Tu Nombre Completo Aquí]
- **Matrícula / ID:** [Tu Matrícula Aquí]
- **Docente / Asesor:** [Nombre del Docente]
- **Institución:** [Nombre de la Universidad / Instituto]
- **Fecha:** [Fecha de Entrega]
- **Repositorio GitHub:** https://github.com/Josemma120/Geminuel.git

---

### CONTEXTO TÉCNICO Y ARQUITECTURA DEL REPOSITORIO

1. **Propósito de Geminuel:**
   - Asistente conversacional pedagógico orientado al aprendizaje, depuración y desarrollo de software asistido por IA.
   - A diferencia de generadores de código opacos, actúa como tutor interactivo: explica errores paso a paso, promueve la verificación activa y enseña fundamentos lógicos.

2. **Evolución y Arquitectura del Sistema:**
   - **Frontend:**
     * `index.html`: Semántica HTML5 nativa (`<main>`, `<aside>`, `<nav>`, `<section>`, `<footer>`, `<form>`), elemento `<dialog>` nativo para confirmaciones seguras sin bloqueos, y accesibilidad WAI-ARIA (`role="log"`, `aria-live="polite"`).
     * `css/style.css`: Sistema de diseño moderno *dark terminal*, variables CSS personalizadas, glassmorphism con `backdrop-filter` y diseño responsivo.
     * `js/app.js` y `js/engine.js`: Modularidad ES6+, controladores de eventos, manejo de estados, historial local y comunicación asíncrona vía Fetch API.
   - **Backend Actual (Python FastAPI):**
     * `server.py`: Servidor de alto rendimiento construido con FastAPI y Uvicorn.
     * Proxy seguro que resguarda las claves de API en el servidor mediante variables de entorno (`.env`), evitando filtraciones hacia el cliente o repositorios públicos.
     * **Resiliencia en Cascada (Multi-Provider Fallback):** Intento prioritario con Groq Cloud (`deepseek-r1-distill-llama-70b`) con cambio automático transparente ante errores de cuota (429) o fallos de red hacia Google Gemini (`gemini-3.6-flash`).
     * Ventana deslizante de memoria (`HISTORY_WINDOW = 12`) para optimizar el consumo de tokens.
     * Persistencia de conversaciones en `chats.json`.
   - **Entorno y Ejecución:**
     * `requirements.txt`: `fastapi`, `uvicorn[standard]`, `httpx`, `python-dotenv`.
     * `start.bat`: Script de arranque automatizado en Windows (verifica dependencias e inicia el servidor en el puerto 8000).
   - **Historial Legacy:**
     * Directorio `legacy/`: Preserva el servidor original `server.js` (Node.js nativo sin dependencias) con su respectiva documentación histórica.

3. **Principios de IA Responsable:**
   - **Validación Humana (Human-in-the-Loop):** Advertencia explícita al usuario para que compruebe todo código antes de ejecutarlo.
   - **Privacidad y Seguridad:** Prohibición estricta de solicitar o procesar credenciales, contraseñas o datos personales sensibles (PII).
   - **Tutoría sobre Automatización:** Prioriza la explicación de la causa raíz de un bug sobre la generación masiva de soluciones no verificadas.

---

### ESTRUCTURA QUE DEBE TENER EL DOCUMENTO A GENERAR

Genera el documento desarrollando en profundidad cada una de las siguientes secciones:

1. **PORTADA FORMAL:**
   - Título del proyecto, materia, autor, docente, institución y fecha.

2. **RESUMEN EJECUTIVO (ABSTRACT):**
   - Síntesis de 250-300 palabras describiendo el problema, la solución implementada, la tecnología utilizada y los resultados obtenidos.

3. **INTRODUCCIÓN Y JUSTIFICACIÓN:**
   - Contextualización del uso de LLMs en la educación de ingeniería de software.
   - Problemática del "copiado ciego" de código y cómo Geminuel resuelve esta barrera como tutor pedagógico.

4. **OBJETIVOS:**
   - Objetivo General.
   - Objetivos Específicos (técnicos, pedagógicos y de seguridad).

5. **ARQUITECTURA Y DISEÑO DEL SISTEMA:**
   - Diagrama de flujo y arquitectura desacoplada en tres capas (Cliente Web, Backend Proxy FastAPI, Proveedores LLM Groq/Gemini).
   - Explicación del mecanismo de tolerancia a fallos y fallback en cascada.
   - Gestión de memoria conversacional mediante ventana deslizante.

6. **STACK TECNOLÓGICO Y COMPONENTES:**
   - Tabla comparativa de tecnologías (FastAPI vs Node.js Legacy, HTML5 Semántico, Vanilla CSS, HTTPX).
   - Explicación de los archivos clave del repositorio (`server.py`, `app.js`, `index.html`, `start.bat`).

7. **SEGURIDAD, PRIVACIDAD E INTELIGENCIA ARTIFICIAL RESPONSABLE:**
   - Aislamiento de llaves de API mediante proxy reverso y `.env`.
   - Directivas del prompt del sistema para evitar alucinaciones y prevenir captura de PII.
   - Criterios éticos de verificación humana del software.

8. **GUÍA DE INSTALACIÓN, DESPLIEGUE Y PRUEBAS:**
   - Requisitos de entorno (Python 3.10+).
   - Paso a paso de clonación de repositorio, configuración del `.env` y ejecución con `start.bat` o `python server.py`.
   - Casos de prueba documentados (conversación estándar, prueba de fallback ante saturación, persistencia de chats).

9. **CONCLUSIONES Y TRABAJO FUTURO:**
   - Logros alcanzados en la asignatura de Fundamentos de IA.
   - Posibles extensiones futuras (soporte RAG, ejecución de código en sandbox seguro, soporte multi-modelo adicional).

10. **REFERENCIAS Y ENLACES:**
    - Repositorio oficial en GitHub, documentación oficial de FastAPI, Google AI Studio, Groq Cloud y estándares W3C.

---
Instrucciones de estilo:
- Redacta en tercera persona con tono formal y académico.
- Utiliza tablas, listas y bloques de código/diagramas en Markdown donde aporte claridad.
- Desarrolla cada sección con explicaciones técnicas detalladas y fundamentadas.

============================= FIN DEL PROMPT =============================
```
