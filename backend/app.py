import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import requests

load_dotenv()
app = Flask(__name__)
CORS(app)

LLM_PROVIDER = os.getenv("LLM_PROVIDER", "openrouter").lower()

def normalize_messages(messages):
    norm = []
    for m in messages:
        role = m.get("role", "user")
        if role == "bot":
            role = "assistant"
        norm.append({"role": role, "content": m.get("content", "")})
    return norm

# -------- OpenRouter provider (key format: sk-or-...) --------
def run_openrouter(messages):
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY is not set")
    model = os.getenv("OPENROUTER_MODEL", "openai/gpt-4o-mini")
    url = "https://openrouter.ai/api/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        # Optional but recommended by OpenRouter:
        "HTTP-Referer": os.getenv("OPENROUTER_REFERER", "https://render.com"),
        "X-Title": os.getenv("OPENROUTER_TITLE", "MATHIO"),
    }
    payload = {
        "model": model,
        "messages": normalize_messages(messages),
        "temperature": 0.2,
    }
    r = requests.post(url, headers=headers, json=payload, timeout=60)
    r.raise_for_status()
    data = r.json()
    return data["choices"][0]["message"]["content"]

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/api/llm")
def llm():
    data = request.get_json(force=True)
    messages = data.get("messages", [])
    topic_hint = data.get("topicHint")

    system_prompt = f"""Tu esi MATHIO — 6. klases matemātikas čat‑skolotājs.
Raksti latviski, skaidri un pa soļiem. 
Ja skolēns risina uzdevumu, nesniedz gala atbildi uzreiz — palīdzi ar starpsoļiem, formulām un norādēm.
Formulas raksti KaTeX sintaksē ($...$ vai $$...$$).
Tēma (ja dota): {topic_hint or 'auto'}.
"""

    # prepend system prompt
    messages = [{"role":"system","content":system_prompt}] + messages

    if LLM_PROVIDER == "openrouter":
        text = run_openrouter(messages)
    else:
        # fallback: try openrouter anyway
        text = run_openrouter(messages)
    return jsonify({"reply": text})

# Optional theory endpoint (you can expand content later)
from theory_db_lv import THEORY_6

@app.get("/api/theory")
def theory():
    topic = request.args.get("topic")
    return jsonify(THEORY_6.get(topic, {"title":"", "summary":"", "formulas":[], "examples":[]}))

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)))
