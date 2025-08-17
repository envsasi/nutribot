import json
import pathlib
import re
from typing import Optional, Dict, Any, List

# Define the path to the rules file
DATA = pathlib.Path(__file__).parents[1] / "data" / "foods.json"

# A mapping of common keywords to the canonical condition keys in foods.json
CONDITION_KEYWORDS = {
    "migraine": ["migraine", "headache", "head pain"],
    "type2_diabetes": ["diabetes", "type 2", "type2", "blood sugar"],
    "hypertension": ["hypertension", "high blood pressure", "high bp"],
    "acidity": ["acidity", "acid reflux", "heartburn", "gerd"],
}

def _load_rules() -> Dict[str, Any]:
    """Loads the food rules from the JSON file."""
    try:
        return json.loads(DATA.read_text(encoding="utf-8"))
    except Exception:
        return {}

def _canonical_key(query: str) -> Optional[str]:
    """Finds the canonical condition key from a user's query."""
    q = query.lower()
    for key, keywords in CONDITION_KEYWORDS.items():
        for keyword in keywords:
            if keyword in q:
                return key
    return None

def suggest_from_rules(query: str) -> Optional[Dict[str, List[str]]]:
    """
    Finds a matching condition from the user query and returns the
    corresponding rules from foods.json.
    """
    rules = _load_rules()
    key = _canonical_key(query)
    return rules.get(key) if key else None

def extract_json_block(text: str) -> Optional[str]:
    """Extracts a JSON block from text, preferring <json> tags."""
    # Prefer <json>...</json>, else fenced ```json
    m = re.search(r"<json>(.*?)</json>", text, flags=re.S | re.I)
    if not m:
        m = re.search(r"```json(.*?)```", text, flags=re.S | re.I)

    return m.group(1).strip() if m else None