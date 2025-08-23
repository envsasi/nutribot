import os
import json
import orjson
import glob
import pathlib
from typing import Optional

from pydantic import BaseModel, Field
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from fastapi.staticfiles import StaticFiles
import fitz

# CORRECTED: Use relative imports with a leading dot (.)
from .utils.rules import suggest_from_rules, extract_json_block
from .utils.storage import save_file

# --- CONFIGURATION & APP INITIALIZATION ---

# CORRECTED: Build absolute paths to ensure files are found correctly
APP_ROOT = pathlib.Path(__file__).parent
load_dotenv(dotenv_path=APP_ROOT / ".env")

ALLOWED_ORIGINS_STR = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS_STR.split(",")]
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
UPLOAD_DIR = APP_ROOT / os.getenv("UPLOAD_DIR", "uploads")  # CORRECTED: Path is now absolute
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "10"))
MAX_BYTES = MAX_UPLOAD_MB * 1024 * 1024

if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY missing in backend/.env")

app = FastAPI(title="NutriBot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

groq_client = Groq(api_key=GROQ_API_KEY)


# --- DATA MODELS ---
class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    profile: Optional[dict] = None
    report_text: Optional[str] = None


# --- API ROUTERS ---
@app.get("/", tags=["General"])
async def root():
    return {"message": "NutriBot API is running! Access the docs at /docs"}


@app.get("/health", tags=["General"])
async def health():
    return {"ok": True, "service": "NutriBot API", "version": "0.0.1"}


SYSTEM_PROMPT = (
    "You are NutriBot, a helpful nutrition assistant. "
    "Provide evidence-informed, food-based suggestions tailored to the user's symptoms/conditions and preferences. "
    "Do not diagnose or prescribe medication. Keep a formal, medical tone. "
    "Always include a brief disclaimer: 'Educational information only—not medical advice.' "
    "When possible, include a JSON summary wrapped in <json>...</json> with these exact keys: "
    "{\"condition\", \"what_to_eat\": [], \"what_to_avoid\": [], \"timing\": [], \"explanation\": \"\", \"notes\": \"\", \"disclaimer\": \"\"}."
)


@app.post("/chat", tags=["NutriBot"])
def chat(req: ChatRequest):
    rules_hit = suggest_from_rules(req.message)
    rules_hint = ""
    if rules_hit:
        rules_hint = (
            "Local rules matched for this query.\n"
            f"Eat: {', '.join(rules_hit.get('eat', []))}\n"
            f"Avoid: {', '.join(rules_hit.get('avoid', []))}\n"
            f"Timing: {', '.join(rules_hit.get('timing', []))}\n"
        )

    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if rules_hint:
        messages.append({"role": "system", "content": rules_hint})
    if req.profile:
        messages.append({"role": "system", "content": "User profile JSON: " + json.dumps(req.profile)})
    if req.report_text:
        report_context = f"The user has provided the following text from a health report. Use relevant data from it (like high/low values, specific conditions mentioned, etc.) to further personalize your recommendations:\n---BEGIN REPORT---\n{req.report_text}\n---END REPORT---"
        messages.append({"role": "system", "content": report_context})
    messages.append({"role": "user", "content": req.message})

    try:
        comp = groq_client.chat.completions.create(
            model=GROQ_MODEL, messages=messages, temperature=0.7
        )
        text = (comp.choices[0].message.content or "").strip()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Groq error: {e}")

    structured = None
    j = extract_json_block(text)
    if j:
        try:
            structured = json.loads(j)
        except Exception:
            structured = None

    return {"reply": text, "structured": structured, "from_rules": bool(rules_hit), "model": GROQ_MODEL}


@app.post("/upload", tags=["Files"])
async def upload(file: UploadFile = File(...)):
    try:
        meta = await save_file(file, str(UPLOAD_DIR), MAX_BYTES)
        return {"ok": True, "file": meta}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")


@app.post("/files/{file_id}/parse", tags=["Files"])
async def parse_file(file_id: str):
    pattern = os.path.join(UPLOAD_DIR, f"{file_id}.*.json")
    matches = glob.glob(str(pattern))  # Ensure pattern is a string
    if not matches:
        raise HTTPException(status_code=404, detail="File metadata not found")

    try:
        with open(matches[0], "r", encoding="utf-8") as f:
            meta = json.load(f)
        file_path = os.path.join(UPLOAD_DIR, meta.get("stored_filename"))
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")

        text_content = ""
        with fitz.open(file_path) as doc:
            for page in doc:
                text_content += page.get_text()

        return {"ok": True, "file_id": file_id, "content": text_content[:4000]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse file: {str(e)}")


@app.get("/files/{file_id}/meta", tags=["Files"])
async def file_meta(file_id: str):
    pattern = os.path.join(UPLOAD_DIR, f"{file_id}.*.json")
    matches = glob.glob(str(pattern))  # Ensure pattern is a string
    if not matches:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        with open(matches[0], "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Meta read failed: {e}")


if os.getenv("SERVE_UPLOADS", "true").lower() == "true":
    app.mount("/_uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")