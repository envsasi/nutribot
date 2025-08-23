import os
import google.generativeai as genai
from PIL import Image
import io
import base64


def identify_food_from_image_gemini(image_data_url: str) -> str:
    """
    Uses Google's Gemini 1.5 Flash model to identify a food item.
    """
    try:
        image_data = base64.b64decode(image_data_url.split(",")[1])
        img = Image.open(io.BytesIO(image_data))

        model = genai.GenerativeModel('gemini-1.5-flash')

        prompt = "Identify the primary food item in this image. Respond with only the name of the food (e.g., 'Apple', 'Banana', 'Slice of Pizza'). If you are unsure, say 'unknown food item'."

        response = model.generate_content([prompt, img])

        food_name = response.text.strip()
        print(f"--- DEBUG: Gemini Vision identified: {food_name} ---")
        return food_name if food_name else "an unknown food item"

    except Exception as e:
        print(f"--- DEBUG: An error occurred in the Gemini API call: {e} ---")
        return "an unknown food item"