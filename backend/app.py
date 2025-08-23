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
import google.generativeai as genai
# CORRECTED: Use relative imports with a leading dot (.)
from .utils.rules import suggest_from_rules, extract_json_block
from .utils.storage import save_file
from .vision.utils import identify_food_from_image_gemini

# --- CONFIGURATION & APP INITIALIZATION ---

# CORRECTED: Build absolute paths to ensure files are found correctly
APP_ROOT = pathlib.Path(__file__).parent
load_dotenv(dotenv_path=APP_ROOT / ".env")

try:
    genai.configure(api_key=os.getenv("GOOGLE_API_KEY")) # <-- ADD THIS LINE
except Exception as e:
    print(f"--- WARNING: Failed to configure Google AI: {e} ---")

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

class ChatWithImageRequest(BaseModel):
    message: str
    profile: Optional[dict] = None
    report_text: Optional[str] = None
    image_data_url: Optional[str] = None

class ImageAnalysisRequest(BaseModel):
    image_data_url: str
    profile: Optional[dict] = None
    report_text: Optional[str] = None


# --- API ROUTERS ---
@app.get("/", tags=["General"])
async def root():
    return {"message": "NutriBot API is running! Access the docs at /docs"}


@app.get("/health", tags=["General"])
async def health():
    return {"ok": True, "service": "NutriBot API", "version": "0.0.1"}


# NEW: A more detailed system prompt template
# We will use f-strings to format this with the user's data
PROMPT_TEMPLATE = """
You are NutriBot, an expert nutrition assistant. Your goal is to provide safe, evidence-informed, and personalized dietary suggestions based on the user's information. Your tone must be formal, supportive, and scientific.

**Primary Goal:** Suggest foods that can help manage or alleviate the user's stated health issue. For each food, briefly explain its healing property (e.g., "rich in anti-inflammatory omega-3s," "high in magnesium which can relax blood vessels").

**Safety Rules:**
1. DO NOT diagnose any medical condition.
2. DO NOT prescribe medication or specific supplement dosages.
3. If the user's query mentions severe symptoms (e.g., "chest pain", "bleeding"), you MUST refuse to provide advice and instead strongly recommend consulting a doctor immediately in your "explanation".
4. You MUST include the standard disclaimer.

**User Information:**
- User's Query: "{user_message}"
- User's Profile: {user_profile}
- Health Report Context: "{report_text}"

**Factual Grounding Data (if available):**
{grounding_data}

Based on all the information above, analyze the user's needs and generate a personalized food recommendation.
Your final output MUST be a single, valid JSON object and nothing else.
The JSON object must use this exact schema:
{{
  "condition_detected": "The primary health condition or symptom you are addressing (e.g., 'Migraine Headaches')",
  "foods_to_eat": {{
    "main_suggestions": ["A list of 4-5 primary recommended foods with a brief reason, e.g., 'Salmon (rich in omega-3s)'"],
    "alternatives": ["A list of 3-4 alternative foods if the main suggestions are unavailable"]
  }},
  "foods_to_avoid": ["A single, comprehensive list of 5-7 primary foods to avoid with a brief reason, e.g., 'Aged Cheese (contains tyramine)'"],
  "timing_and_tips": ["A list of 2-3 practical tips about meal timing or lifestyle"],
  "explanation": "A brief, 2-3 sentence explanation of the overall dietary strategy for the detected condition.",
  "disclaimer": "This is for informational purposes only and is not medical advice. Please consult a healthcare professional for any health concerns."
}}
"""

PROMPT_TEMPLATE_VISION = """
You are NutriBot, an expert nutrition assistant. Your goal is to provide a detailed and personalized analysis of a specific food item based on an image the user has provided and their health profile.

**Primary Goal:** Analyze the identified food item and the user's question about it in the context of their health profile. Provide a clear recommendation on whether they should eat it and why.

**Safety Rules:**
1. DO NOT diagnose any medical condition.
2. DO NOT prescribe medication.
3. You MUST include the standard disclaimer.

**Analysis Context:**
- Identified Food Item: "{identified_food}"
- User's Question: "{user_message}"
- User's Profile: {user_profile}
- Health Report Context: "{report_text}"

Based on all the information above, generate a personalized food recommendation.
Your final output MUST be a single, valid JSON object and nothing else.
The JSON object must use this exact schema:
{{
  "condition_detected": "The user's primary health condition you are analyzing in relation to the food (e.g., 'Type 2 Diabetes')",
  "foods_to_eat": {{
    "main_suggestions": ["Confirm the analyzed food if it's beneficial and briefly explain why, e.g., 'Apple (Good source of soluble fiber, which helps manage blood sugar)'"],
    "alternatives": ["A list of 2-3 other beneficial foods with similar properties"]
  }},
  "foods_to_avoid": ["A single, comprehensive list of 5-7 foods to avoid for the user's condition"],
  "timing_and_tips": ["A list of 2-3 practical tips related to eating this specific food or managing the condition"],
  "explanation": "A detailed, 2-3 sentence explanation addressing the user's specific question about the food in relation to their health profile.",
  "disclaimer": "This is for informational purposes only and is not medical advice. Please consult a healthcare professional for any health concerns."
}}
"""

@app.post("/chat", tags=["NutriBot"])
def chat(req: ChatRequest):
    # 1. Look up grounding data from our old rules file
    rules_hit = suggest_from_rules(req.message)
    grounding_data = "None available."
    if rules_hit:
        grounding_data = f"Known beneficial foods: {rules_hit.get('eat', [])}. Known foods to avoid: {rules_hit.get('avoid', [])}."

    # 2. Format the final prompt
    final_prompt = PROMPT_TEMPLATE.format(
        user_message=req.message,
        user_profile=json.dumps(req.profile),
        report_text=req.report_text or "Not provided.",
        grounding_data=grounding_data
    )

    try:
        # 3. Call the LLM with the new, detailed prompt
        comp = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": final_prompt}],
            temperature=0.3,  # Lower temperature for more factual, less creative responses
            response_format={"type": "json_object"},  # Instruct the model to output JSON
        )

        response_text = comp.choices[0].message.content

        # 4. Parse the JSON response and send it to the frontend
        structured_response = json.loads(response_text)

        # The frontend expects a "reply" key for the bubble, so we create a simple one.
        # The main content will be in the structured card.
        simple_reply = f"Here are some recommendations regarding {structured_response.get('condition_detected', 'your query')}."

        return {"reply": simple_reply, "structured": structured_response, "from_rules": bool(rules_hit)}

    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI generation error: {str(e)}")


@app.post("/chat-with-image", tags=["NutriBot"])
def chat_with_image(req: ChatWithImageRequest):
    # Step 1: Identify the food from the image
    identified_food = identify_food_from_image_gemini(req.image_data_url)

    if "unknown food item" in identified_food:
         return {"reply": "Sorry, I couldn't identify the food in the image. Please try again with a clearer picture.", "structured": None, "from_rules": False}

    # Step 2: Format the new, specialized vision prompt
    final_prompt = PROMPT_TEMPLATE_VISION.format(
        identified_food=identified_food,
        user_message=req.message or "Is this food good for me?",
        user_profile=json.dumps(req.profile),
        report_text=req.report_text or "Not provided."
    )

    try:
        # Step 3: Call the LLM with the new prompt
        comp = groq_client.chat.completions.create(
            model=GROQ_MODEL,
            messages=[{"role": "user", "content": final_prompt}],
            temperature=0.3,
            response_format={"type": "json_object"},
        )

        response_text = comp.choices[0].message.content
        structured_response = json.loads(response_text)

        simple_reply = f"Here is an analysis of the '{identified_food}' based on your profile."

        return {"reply": simple_reply, "structured": structured_response, "from_rules": False}

    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI generation error: {str(e)}")
@app.post("/analyze-food-image", tags=["NutriBot"])
def analyze_food_image(req: ImageAnalysisRequest):
    # Step 1: Identify the food from the image using the vision model
    identified_food = identify_food_from_image_gemini(req.image_data_url)

    # Step 2: Create a new, specific query for our chat logic
    new_message = f"Based on my health profile, can I eat this food item: {identified_food}?"

    # Step 3: Create a ChatRequest object to pass to our existing chat function
    chat_req = ChatRequest(
        message=new_message,
        profile=req.profile,
        report_text=req.report_text
    )

    # Step 4: Call the existing chat function to get the full analysis
    return chat(chat_req)
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
    matches = glob.glob(str(pattern))
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