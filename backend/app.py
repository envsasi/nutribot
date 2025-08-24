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
from pypdf import PdfReader
import google.generativeai as genai

from .utils.rules import detect_foods
from .utils.storage import save_file
from .vision.utils import identify_food_from_image_gemini

# --- CONFIGURATION & APP INITIALIZATION ---
APP_ROOT = pathlib.Path(__file__).parent
load_dotenv(dotenv_path=APP_ROOT / ".env")

try:
    genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
except Exception as e:
    print(f"--- WARNING: Failed to configure Google AI: {e} ---")

ALLOWED_ORIGINS_STR = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173")
ALLOWED_ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS_STR.split(",")]
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")
UPLOAD_DIR = APP_ROOT / os.getenv("UPLOAD_DIR", "uploads")
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

class ChatWithImageRequest(BaseModel):
    message: str
    profile: Optional[dict] = None
    report_text: Optional[str] = None
    image_data_url: Optional[str] = None


# --- PROMPTS ---
PROMPT_TEMPLATE = """
You are NutriBot, an expert nutrition assistant. Your primary goal is to provide a detailed and personalized analysis of a user's question in the context of their health profile.

**Primary Goal:** First, understand the user's core question. If they ask about specific foods, your explanation must directly answer whether those foods are advisable for their condition and why. Then, provide a more general dietary plan.

**Safety Rules:**
1. DO NOT diagnose any medical condition.
2. You MUST include the standard disclaimer.

**Analysis Context:**
- User's Health Profile: {user_profile}
- User's Core Question: "{user_message}"
- Specific Foods to Analyze: {foods_to_analyze}
- Health Report Context: "{report_text}"

Based on all the information above, generate a personalized recommendation. Your final output MUST be a single, valid JSON object.
{{
  "condition_detected": "The primary health condition you are addressing",
  "foods_to_eat": {{ "main_suggestions": [], "alternatives": [] }},
  "foods_to_avoid": ["A single, comprehensive list of foods to avoid"],
  "timing_and_tips": [],
  "explanation": "A detailed explanation that DIRECTLY answers the user's question about the 'Specific Foods to Analyze' first, before giving general advice.",
  "disclaimer": "This is for informational purposes only and is not medical advice. Consult a healthcare professional."
}}
"""

PROMPT_TEMPLATE_VISION = """
You are NutriBot, an expert nutrition assistant. Your primary goal is to provide a detailed and personalized analysis of a specific food item based on an image the user has provided and their health profile.

**Analysis Context:**
- Identified Food Item: "{identified_food}"
- User's Question: "{user_message}"
- User's Profile: {user_profile}
- Health Report Context: "{report_text}"

Based on all the information above, generate a personalized recommendation. Your final output MUST be a single, valid JSON object.
{{
  "condition_detected": "The user's primary health condition you are analyzing in relation to the food (e.g., 'Type 2 Diabetes')",
  "foods_to_eat": {{
    "main_suggestions": ["Confirm the analyzed food if it's beneficial and briefly explain why, e.g., 'Apple (Good source of soluble fiber, which helps manage blood sugar)'"],
    "alternatives": ["A list of 2-3 other beneficial foods with similar properties"]
  }},
  "foods_to_avoid": ["A single, comprehensive list of foods to avoid for the user's condition"],
  "timing_and_tips": ["A list of 2-3 practical tips related to eating this specific food or managing the condition"],
  "explanation": "A detailed, 2-3 sentence explanation addressing the user's specific question about the food in relation to their health profile.",
  "disclaimer": "This is for informational purposes only and is not medical advice. Please consult a healthcare professional for any health concerns."
}}
"""

# --- API ROUTERS ---
@app.get("/", tags=["General"])
async def root():
    return {"message": "NutriBot API is running! Access the docs at /docs"}

@app.get("/health", tags=["General"])
async def health():
    return {"ok": True, "service": "NutriBot API", "version": "0.0.1"}

@app.post("/chat", tags=["NutriBot"])
def chat(req: ChatRequest):
    foods_mentioned = detect_foods(req.message)

    # CORRECTED: The variable name in the format string was wrong.
    # It should be 'foods_to_analyze', not 'grounding_data'.
    final_prompt = PROMPT_TEMPLATE.format(
        user_message=req.message,
        user_profile=json.dumps(req.profile),
        foods_to_analyze=json.dumps(foods_mentioned) if foods_mentioned else "None specified",
        report_text=req.report_text or "Not provided."
    )

    try:
        comp = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": final_prompt}],
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        response_text = comp.choices[0].message.content
        structured_response = json.loads(response_text)
        simple_reply = f"Here is an analysis regarding '{structured_response.get('condition_detected', 'your query')}'."
        return {"reply": simple_reply, "structured": structured_response}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI generation error: {str(e)}")

@app.post("/chat-with-image", tags=["NutriBot"])
def chat_with_image(req: ChatWithImageRequest):
    identified_food = "unknown food item"
    if req.image_data_url:
        identified_food = identify_food_from_image_gemini(req.image_data_url)

    if "unknown food item" in identified_food:
         return {"reply": "Sorry, I couldn't identify the food in the image. Please try again with a clearer picture.", "structured": None}

    final_prompt = PROMPT_TEMPLATE_VISION.format(
        identified_food=identified_food,
        user_message=req.message or "Is this food good for me?",
        user_profile=json.dumps(req.profile),
        report_text=req.report_text or "Not provided."
    )

    try:
        comp = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": final_prompt}],
            temperature=0.3,
            response_format={"type": "json_object"},
        )
        response_text = comp.choices[0].message.content
        structured_response = json.loads(response_text)
        simple_reply = f"Here is an analysis of the '{identified_food}' based on your profile."
        return {"reply": simple_reply, "structured": structured_response}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI generation error: {str(e)}")
@app.post("/upload", tags=["Files"])
async def upload(file: UploadFile = File(...)):
    try:
        meta = await save_file(file, str(UPLOAD_DIR), MAX_BYTES)
        return {"ok": True, "file": meta}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {e}")


from pypdf import PdfReader # Make sure to add this import at the top

@app.post("/files/{file_id}/parse", tags=["Files"])
async def parse_file(file_id: str): # This endpoint should be public
    pattern = os.path.join(UPLOAD_DIR, f"{file_id}.*.json")
    matches = glob.glob(str(pattern))
    if not matches:
        raise HTTPException(status_code=404, detail="File metadata not found")

    try:
        with open(matches[0], "r", encoding="utf-8") as f:
            meta = json.load(f)

        file_path = os.path.join(UPLOAD_DIR, meta.get("stored_filename"))
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")

        # NEW: Use pypdf to read the PDF
        text_content = ""
        with open(file_path, "rb") as f:
            reader = PdfReader(f)
            for page in reader.pages:
                text_content += page.extract_text() or ""

        return {"ok": True, "file_id": file_id, "content": text_content[:4000]}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse file: {str(e)}")
@app.get("/files/{file_id}/meta", tags=["Files"])
async def file_meta(file_id: str):
    pattern = os.path.join(UPLOAD_DIR, f"{file_id}.*.json")
    matches = glob.glob(str(pattern))
    if not matches:
        raise HTTPException(status_code=404, detail="File not found")
    try:
        with open(matches[0], "r", encoding="utf-8") as f:
            return json.load(f)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Meta read failed: {e}")


if os.getenv("SERVE_UPLOADS", "true").lower() == "true":
    app.mount("/_uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")