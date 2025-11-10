# MATHIO (LV) — 6. klases matemātikas čat‑skolotājs

Monorepo GitHub + Render:
- `backend/` — Flask, `/api/llm` (OpenRouter) un `/api/theory`
- `frontend/` — Vite + React + KaTeX, latviski, auto‑temas detektors, soli‑pa‑solim

## Ātrā palaišana lokāli
### Backend
```
cd backend
python -m venv .venv && . .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Ievadi savu atslēgu .env failā (OPENROUTER_API_KEY=sk-or-...)
python app.py
```
### Frontend
```
cd frontend
npm ci
cp .env.example .env   # pieliec backend URL, piem.: http://localhost:5000
npm run dev
```

## Render izvietošana
### Backend (Web Service)
- Root Directory: `backend`
- Build Command: `pip install -r requirements.txt`
- Start Command: `gunicorn app:app`
- Environment:
  - `LLM_PROVIDER=openrouter`
  - `OPENROUTER_MODEL=openai/gpt-4o-mini`
  - `OPENROUTER_API_KEY=sk-or-...`

### Frontend (Static Site)
- Root Directory: `frontend`
- Build Command: `npm ci && npm run build`
- Publish Directory: `dist`
- Environment: `VITE_API_BASE_URL=https://<tavs-backend>.onrender.com`

## Drošība
- **Necommito** `backend/.env` GitHubā. Reālo atslēgu liec Render Environment vai lokāli `.env`.
