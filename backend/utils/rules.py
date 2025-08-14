import json, pathlib, re
from typing import Optional, Dict, Any, List

DATA = pathlib.Path(__file__).parents[1] / "data" / "foods.json"

def _load_rules() -> Dict[str, Any]:
    try:
        return json.loads(DATA.read_text(encoding="utf-8"))
    except Exception:
        return {}

def _canonical_key(query: str) -> Optional[str]:
    q = query.lower()
    if "migraine" in q or "headache" in q:
        return "migraine"
    if "diabetes" in q or "type 2" in q or "type2" in q:
        return "type2_diabetes"
    return None

def suggest_from_rules(query: str) -> Optional[Dict[str, List[str]]]:
    rules = _load_rules()
    k = _canonical_key(query)
    return rules.get(k) if k else None

def extract_json_block(text: str) -> Optional[str]:
    # Prefer <json>...</json>, else fenced ```json ... ```
    m = re.search(r"<json>(.*?)</json>", text, flags=re.S|re.I)
    if not m:
        m = re.search(r"```json(.*?)```", text, flags=re.S|re.I)
    return m.group(1).strip() if m else None
