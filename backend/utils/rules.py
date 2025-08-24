import json
import pathlib
import re
from typing import Optional, Dict, Any, List, Set

# --- DATASET LOADING ---

# Path to the main food dataset
FOOD_DATA_PATH = pathlib.Path(__file__).parents[1] / "data" / "food_data.json"


def _load_json_data(path: pathlib.Path) -> Any:
    """A helper function to load a JSON file."""
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"Error loading data from {path}: {e}")
        return None


# Load the entire food dataset into memory when the server starts
FOOD_DATABASE = _load_json_data(FOOD_DATA_PATH)
# Create a simple set of all unique 'base_name' values for fast searching
ALL_FOOD_NAMES: Set[str] = {item['base_name'].lower() for item in FOOD_DATABASE} if FOOD_DATABASE else set()


# --- NEW: ADVANCED FOOD DETECTION ---

def detect_foods(user_message: str) -> List[str]:
    """
    Finds all known food items from the dataset mentioned in the user's message.
    """
    found_foods = set()  # Use a set to avoid duplicates

    for food_name in ALL_FOOD_NAMES:
        # Check if the food name (which can be multi-word) is in the user's message
        if food_name in user_message.lower():
            found_foods.add(food_name.capitalize())

    return list(found_foods)