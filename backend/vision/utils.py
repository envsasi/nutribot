from groq import Groq

def identify_food_from_image(client: Groq, image_data_url: str) -> str:
    """
    Uses a multimodal LLM to identify the food item in a base64 encoded image.
    """
    # The image data URL is in the format "data:image/jpeg;base64,..."
    # We only need the full data URL for the API call.

    try:
        chat_completion = client.chat.completions.create(
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Identify the primary food item in this image. Respond with only the name of the food (e.g., 'Apple', 'Banana', 'Slice of Pizza'). If you are unsure, say 'unknown food item'."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": image_data_url,
                            },
                        },
                    ],
                }
            ],
            # A powerful model is needed for vision. Llama 3.1 is a great choice.
            model="llama-3.1-70b-versatile",
        )
        food_name = chat_completion.choices[0].message.content.strip()
        return food_name if food_name else "an unknown food item"
    except Exception as e:
        print(f"Error identifying food: {e}")
        return "an unknown food item"