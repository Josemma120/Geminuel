"""
Geminuel — Servidor Python (FastAPI)
=============================================
Reemplaza server.js. Implementa:
  - Proxy a Groq (DeepSeek R1) y Google Gemini con cascada automática
  - CRUD de conversaciones con persistencia en chats.json
  - Servido de archivos estáticos (HTML, CSS, JS)

Requisitos: Python 3.10+
Uso:
  1. pip install -r requirements.txt
  2. Copia .env.example a .env y pon tus claves
  3. python server.py
  4. Abre http://localhost:8000
"""

from __future__ import annotations

import asyncio
import json
import os
import time
from pathlib import Path
from typing import List, Optional

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# ============================================================
#  Bootstrap
# ============================================================
ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")

PORT       = int(os.getenv("PORT", 8000))
CHATS_FILE = ROOT / "chats.json"

# ---- Configuracion de IA ----
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL   = os.getenv("GEMINI_MODEL") or os.getenv("MODEL") or "gemini-3.6-flash"
GEMINI_URL     = (
    f"https://generativelanguage.googleapis.com/v1beta/models"
    f"/{GEMINI_MODEL}:generateContent"
)

GROQ_API_KEY = os.getenv("GROQ_API_KEY") or os.getenv("DEEPSEEK_API_KEY") or ""
GROQ_MODEL   = os.getenv("GROQ_MODEL") or "deepseek-r1-distill-llama-70b"
GROQ_URL     = "https://api.groq.com/openai/v1/chat/completions"

HISTORY_WINDOW = 12

SYSTEM_PROMPT = (
    "Eres **Geminuel**, un asistente experto en programacion.\n\n"
    "Reglas de comportamiento:\n"
    "- Responde siempre en espanol, de forma clara, amable y didactica.\n"
    "- Explica paso a paso y ensena; no te limites a entregar codigo.\n"
    "- Cuando des codigo, explica brevemente las partes clave y recuerda al usuario "
    "que debe probar y verificar el codigo antes de usarlo.\n"
    "- Si no estas seguro de una respuesta, dilo abiertamente.\n"
    "- No solicites ni aceptes informacion personal o sensible (contrasenas, datos privados).\n"
    "- Recomienda que las decisiones importantes sean verificadas por una persona o con "
    "documentacion oficial antes de confiar en la IA.\n"
    "- Aceptas dudas de sintaxis, codigo con errores, mensajes de error e instrucciones de programas.\n"
    "- Usa formato Markdown para tus respuestas (bloques de codigo con ```, listas, negritas).\n"
    "- Se CONCISO: responde lo necesario en pocos parrafos; evita rodeos, repeticiones y textos "
    "largos. Prioriza ir al grano.\n"
    "- Termina SIEMPRE cada respuesta con una conclusion o resumen breve (1-2 frases) que cierre "
    "el tema; nunca dejes la respuesta cortada de golpe."
)

# ============================================================
#  Persistencia de chats  (chats.json)
# ============================================================

def _load_chats() -> list:
    try:
        if CHATS_FILE.exists():
            return json.loads(CHATS_FILE.read_text(encoding="utf-8"))
    except Exception:
        pass
    return []


def _save_chats(chats: list) -> None:
    try:
        CHATS_FILE.write_text(
            json.dumps(chats, ensure_ascii=False, indent=2), encoding="utf-8"
        )
    except Exception as e:
        print(f"[Geminuel] Error guardando chats: {e}")


# ============================================================
#  Clientes de IA
# ============================================================

async def _call_gemini(user_message: str, history: list) -> str:
    if not GEMINI_API_KEY:
        raise RuntimeError(
            "Falta GEMINI_API_KEY en .env. "
            "Consiguela gratis en https://aistudio.google.com/apikey"
        )

    valid = [
        m for m in history
        if m and isinstance(m.get("content"), str) and m["content"].strip()
    ]
    contents = [
        {
            "role": "model" if m["role"] == "assistant" else "user",
            "parts": [{"text": m["content"]}],
        }
        for m in valid[-HISTORY_WINDOW:]
    ]
    if not contents:
        contents = [{"role": "user", "parts": [{"text": user_message}]}]

    body = {
        "systemInstruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": contents,
        "generationConfig": {"temperature": 0.7, "maxOutputTokens": 8192},
    }

    resp = None
    async with httpx.AsyncClient(timeout=60.0) as client:
        for attempt in range(1, 4):
            resp = await client.post(
                f"{GEMINI_URL}?key={GEMINI_API_KEY}",
                json=body,
                headers={"Content-Type": "application/json"},
            )
            if resp.status_code in (429, 503):
                await asyncio.sleep(0.7 * attempt)
            else:
                break

    if not resp.is_success:
        try:
            detail = resp.json().get("error", {}).get("message", resp.text)
        except Exception:
            detail = resp.text
        raise RuntimeError(f"Gemini API error {resp.status_code}: {detail}")

    data = resp.json()
    parts = data.get("candidates", [{}])[0].get("content", {}).get("parts", [])
    text = "".join(p.get("text", "") for p in parts).strip()
    if not text:
        raise RuntimeError("Gemini devolvio una respuesta vacia")

    if data.get("candidates", [{}])[0].get("finishReason") == "MAX_TOKENS":
        text += (
            "\n\n>[La respuesta se corto por el limite de longitud. "
            "Pregunta la continuacion si quieres.]"
        )
    return text


async def _call_groq(user_message: str, history: list) -> str:
    if not GROQ_API_KEY:
        raise RuntimeError(
            "Falta configurar GROQ_API_KEY en .env. "
            "Consiguela 100% gratis en https://console.groq.com/keys"
        )

    messages: list = [{"role": "system", "content": SYSTEM_PROMPT}]
    valid = [
        m for m in history
        if m and isinstance(m.get("content"), str) and m["content"].strip()
    ]
    for m in valid[-HISTORY_WINDOW:]:
        messages.append({
            "role": "assistant" if m["role"] == "assistant" else "user",
            "content": m["content"],
        })

    last = messages[-1]
    if not (last["role"] == "user" and last["content"] == user_message):
        messages.append({"role": "user", "content": user_message})

    body = {
        "model": GROQ_MODEL,
        "messages": messages,
        "temperature": 0.6,
        "max_tokens": 4096,
    }

    resp = None
    async with httpx.AsyncClient(timeout=60.0) as client:
        for attempt in range(1, 4):
            resp = await client.post(
                GROQ_URL,
                json=body,
                headers={
                    "Content-Type": "application/json",
                    "Authorization": f"Bearer {GROQ_API_KEY}",
                },
            )
            if resp.status_code in (429, 503):
                await asyncio.sleep(0.7 * attempt)
            else:
                break

    if not resp.is_success:
        try:
            detail = str(resp.json())
        except Exception:
            detail = resp.text
        raise RuntimeError(f"Groq API error {resp.status_code}: {detail}")

    data = resp.json()
    choice = (data.get("choices") or [{}])[0]
    text = (choice.get("message", {}).get("content") or "").strip()
    if not text:
        raise RuntimeError("Groq devolvio una respuesta vacia")
    if choice.get("finish_reason") == "length":
        text += (
            "\n\n>[La respuesta se corto por el limite de tokens. "
            "Pide la continuacion si lo deseas.]"
        )
    return text


async def _cascade(user_message: str, history: list) -> dict:
    """Cascada: 1 Groq (DeepSeek R1) -> 2 Google Gemini (respaldo automatico)."""
    errors: list[str] = []

    # 1 - Groq / DeepSeek R1
    if GROQ_API_KEY:
        try:
            text = await _call_groq(user_message, history)
            return {
                "text": text,
                "provider": "groq",
                "cascaded": False,
                "fallbackReason": None,
            }
        except Exception as exc:
            msg = str(exc)
            print(f"[Cascada] Groq no disponible: {msg}")
            errors.append(f"Groq ({GROQ_MODEL}): {msg}")
    else:
        errors.append("Groq: No se encontro GROQ_API_KEY en .env")

    # 2 - Google Gemini (respaldo automatico)
    if GEMINI_API_KEY:
        try:
            text = await _call_gemini(user_message, history)
            is_fallback = bool(errors)
            return {
                "text": text,
                "provider": "gemini",
                "cascaded": is_fallback,
                "fallbackReason": errors[0] if is_fallback else None,
            }
        except Exception as exc:
            msg = str(exc)
            print(f"[Cascada] Gemini no disponible: {msg}")
            errors.append(f"Gemini ({GEMINI_MODEL}): {msg}")
    else:
        errors.append("Gemini: No se encontro GEMINI_API_KEY en .env")

    raise RuntimeError(
        "No se pudo obtener respuesta del servicio de IA:\n"
        f"- {errors[0] if errors else 'Servicio primario fallo'}\n"
        f"- {errors[1] if len(errors) > 1 else 'Servicio de respaldo fallo'}"
    )


# ============================================================
#  FastAPI App
# ============================================================

app = FastAPI(title="Geminuel", docs_url=None, redoc_url=None)


# ---- Modelos Pydantic ----

class ChatRequest(BaseModel):
    userMessage: str
    history: Optional[List[dict]] = []
    provider: Optional[str] = "cascade"


class CreateChatIn(BaseModel):
    title: str


class AddMessageIn(BaseModel):
    role: str
    content: str
    provider: Optional[str] = None
    cascaded: Optional[bool] = False


# ============================================================
#  Rutas /api
# ============================================================

@app.get("/api/providers")
async def get_providers():
    return {
        "ok": True,
        "cascadeOrder": ["groq", "gemini"],
        "providers": {
            "groq": {
                "configured": bool(GROQ_API_KEY),
                "model": GROQ_MODEL,
                "role": "primary",
            },
            "gemini": {
                "configured": bool(GEMINI_API_KEY),
                "model": GEMINI_MODEL,
                "role": "fallback",
            },
        },
    }


@app.post("/api/chat")
async def chat(req: ChatRequest):
    if not req.userMessage.strip():
        raise HTTPException(status_code=400, detail="Falta userMessage")

    try:
        history = req.history or []
        if req.provider == "groq":
            text = await _call_groq(req.userMessage, history)
            result: dict = {
                "text": text,
                "provider": "groq",
                "cascaded": False,
                "fallbackReason": None,
            }
        elif req.provider == "gemini":
            text = await _call_gemini(req.userMessage, history)
            result = {
                "text": text,
                "provider": "gemini",
                "cascaded": False,
                "fallbackReason": None,
            }
        else:
            result = await _cascade(req.userMessage, history)

        return {"ok": True, **result}

    except Exception as exc:
        msg = str(exc)
        status = 429 if "429" in msg else (503 if "503" in msg else 502)
        raise HTTPException(status_code=status, detail=msg)


# ---- CRUD de conversaciones ----

@app.get("/api/chats")
async def get_chats():
    return {"ok": True, "chats": _load_chats()}


@app.post("/api/chats", status_code=201)
async def create_chat(body: CreateChatIn):
    chats = _load_chats()
    new_id = max((c.get("id", 0) for c in chats), default=0) + 1
    chat = {
        "id": new_id,
        "title": body.title,
        "messages": [],
        "ts": int(time.time() * 1000),
    }
    chats.append(chat)
    _save_chats(chats)
    return {"ok": True, "chat": chat}


@app.post("/api/chats/{chat_id}/messages", status_code=201)
async def add_message(chat_id: int, body: AddMessageIn):
    chats = _load_chats()
    chat = next((c for c in chats if c["id"] == chat_id), None)
    if not chat:
        raise HTTPException(status_code=404, detail="Chat no encontrado")

    msg: dict = {"role": body.role, "content": body.content}
    if body.provider:
        msg["provider"] = body.provider
    if body.cascaded:
        msg["cascaded"] = body.cascaded

    chat["messages"].append(msg)
    chat["ts"] = int(time.time() * 1000)
    _save_chats(chats)
    return {"ok": True, "message": msg}


@app.delete("/api/chats/{chat_id}")
async def delete_chat(chat_id: int):
    chats = _load_chats()
    filtered = [c for c in chats if c["id"] != chat_id]
    if len(filtered) == len(chats):
        raise HTTPException(status_code=404, detail="Chat no encontrado")
    _save_chats(filtered)
    return {"ok": True}


# ============================================================
#  Archivos estaticos e index.html
# ============================================================

app.mount("/css", StaticFiles(directory=str(ROOT / "css")), name="css")
app.mount("/js",  StaticFiles(directory=str(ROOT / "js")),  name="js")


@app.get("/favicon.svg")
async def favicon():
    svg = ROOT / "favicon.svg"
    if svg.exists():
        return FileResponse(str(svg), media_type="image/svg+xml")
    raise HTTPException(status_code=404)


@app.get("/")
async def index():
    return FileResponse(
        str(ROOT / "index.html"), media_type="text/html; charset=utf-8"
    )


# ============================================================
#  Entry point
# ============================================================

if __name__ == "__main__":
    import uvicorn

    groq_status   = f"Listo ({GROQ_MODEL})"   if GROQ_API_KEY   else "Sin clave (GROQ_API_KEY en .env)"
    gemini_status = f"Listo ({GEMINI_MODEL})" if GEMINI_API_KEY else "Sin clave (GEMINI_API_KEY en .env)"

    print(f"\nGeminuel corriendo en http://localhost:{PORT}")
    print(f"Modo: Cascada Automatica  Groq [DeepSeek R1] -> Google Gemini")
    print(f" - 1 Groq:   {groq_status}")
    print(f" - 2 Gemini: {gemini_status}")
    print(f" - Chats:    {CHATS_FILE}\n")

    uvicorn.run("server:app", host="0.0.0.0", port=PORT, reload=False)
