import os, json, orjson,glob
from typing import Optional
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException,UploadFile,File
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq  # NEW
from utils.rules import suggest_from_rules, extract_json_block
from fastapi.staticfiles import StaticFiles
from utils.storage import save_file, ALLOW_MIME



load_dotenv()




ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app = FastAPI(title="NutriBot API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,   # dev-friendly; tighten later
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


UPLOAD_DIR = os.getenv("UPLOAD_DIR", "uploads")
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "10"))
MAX_BYTES = MAX_UPLOAD_MB * 1024 * 1024

# dev convenience: serve uploaded files for quick checks
if os.getenv("SERVE_UPLOADS", "true").lower() == "true":
    app.mount("/_uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")



@app.get("/")
def root():
    return {"message": "NutriBot API is running. See /health and /docs."}

@app.get("/health")
def health():
    return {"ok": True, "service": "NutriBot API", "version": "0.0.1"}


GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL   = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
if not GROQ_API_KEY:
    raise RuntimeError("GROQ_API_KEY missing in backend/.env")

groq_client = Groq(api_key=GROQ_API_KEY)




SYSTEM_PROMPT = (
    "You are NutriBot, a helpful nutrition assistant. "
    "Provide evidence-informed, food-based suggestions tailored to the user's symptoms/conditions and preferences. "
    "Do not diagnose or prescribe medication. Keep a formal, medical tone. "
    "Always include a brief disclaimer: 'Educational information only—not medical advice.' "
    "When possible, include a JSON summary wrapped in <json>...</json> with these exact keys: "
    "{\"condition\", \"what_to_eat\": [], \"what_to_avoid\": [], \"timing\": [], \"explanation\": \"\", \"notes\": \"\", \"disclaimer\": \"\"}."
)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=2000)
    profile: Optional[dict] = None  # e.g. {"age": 25, "restrictions": ["lactose"]}



@app.post("/chat")
def chat(req: ChatRequest):
    # 1) rules-first context
    rules_hit = suggest_from_rules(req.message)
    rules_hint = ""
    if rules_hit:
        rules_hint = (
            "Local rules matched for this query.\n"
            f"Eat: {', '.join(rules_hit.get('eat', []))}\n"
            f"Avoid: {', '.join(rules_hit.get('avoid', []))}\n"
            f"Timing: {', '.join(rules_hit.get('timing', []))}\n"
        )

    # 2) build messages (OpenAI-compatible format; Groq supports this)
    #    https://console.groq.com/docs/openai
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    if rules_hint:
        messages.append({"role": "system", "content": rules_hint})
    if req.profile:
        messages.append({"role": "system", "content": "User profile JSON: " + json.dumps(req.profile)})
    messages.append({"role": "user", "content": req.message})

    # 3) call Groq chat completions
    try:
        comp = groq_client.chat.completions.create(  # https://console.groq.com/docs/api-reference
            model=GROQ_MODEL,
            messages=messages,
            temperature=0.7,
        )
        text = (comp.choices[0].message.content or "").strip()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Groq error: {e}")

    # 4) attempt to extract structured JSON
    structured = None
    j = extract_json_block(text)
    if j:
        try:
            structured = json.loads(j)
        except Exception:
            structured = None

    return {"reply": text, "structured": structured, "from_rules": bool(rules_hit), "model": GROQ_MODEL}



@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    """
    Accepts PDF/JPG/PNG. Saves to UPLOAD_DIR with a UUID filename.
    Returns metadata including file_id, mime, size, sha256.
    """
    try:
        meta = await save_file(file, UPLOAD_DIR, MAX_BYTES)
        return {"ok": True, "file": meta}
    except ValueError as e:
        # validation or size errors
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")


@app.get("/files/{file_id}/meta")
def file_meta(file_id: str):
    """
    Returns metadata for an uploaded file. (Reads the sidecar JSON.)
    """
    pattern = os.path.join(UPLOAD_DIR, f"{file_id}.*.json")
    matches = glob.glob(pattern)
    if not matches:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        with open(matches[0], "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Meta read failed: {e}")
