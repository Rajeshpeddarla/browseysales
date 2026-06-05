# How to Run Browsey Locally (Without Docker)

Since you are running natively on Windows without Docker Desktop, you need to manually start two components of the Browsey architecture: the **Python AI Microservice** and the **Next.js Web App**. AI reasoning is handled by the **Ckey.vn cloud API** (no local LLM needed).

Follow these steps to run the full project:

## 1. Set Up Ckey.vn API Key (AI Engine)
Ckey.vn handles all AI reasoning, reflection, and formatting via cloud API. Uses 4 models with smart routing:
- **claude-haiku-4.5** — reasoning tasks (planner, critic, reflection)
- **gpt-5.4-mini** — formatting tasks (personalization, sales brief)
- **deepseek-3.2** — fast/cheap tasks (tech stack, news enrichment)
- **qwen3-coder-next** — default bulk tasks (multi-pass extraction)

Make sure your `.env.local` file contains:
```
CKEY_API_KEY=sk-your-api-key-here
CKEY_API_URL=https://ckey.vn/v1/chat/completions
```

---

## 2. Start the Python AI Microservice (Embeddings & Reranking)
The Python service handles the `BAAI/bge-m3` semantic embeddings and reranking.

1. Open a **new terminal** (PowerShell or Command Prompt).
2. Navigate to the `python-ai` directory:
   ```bash
   cd d:\aiprojects\browsey-web\browsey-web\python-ai
   ```
3. *(First time only)* Install the required packages:
   ```bash
   python -m pip install -r requirements.txt
   ```
4. Start the FastAPI server using Uvicorn:
   ```bash
   python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   *Keep this terminal window open! You should see a message saying "Application startup complete".*

---

## 3. Start the Next.js App
This is the main web dashboard, API, and agent orchestrator.

1. Open a **second terminal**.
2. Navigate to the project root:
   ```bash
   cd d:\aiprojects\browsey-web\browsey-web
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
   *Keep this terminal window open!*

---

## Testing the Application
Once both systems are running:
1. Go to `http://localhost:3000` in your browser.
2. Enter a URL and hit **Generate Brief**.
3. Watch the terminals! You will see:
   - The Next.js terminal logging the Multi-Pass extractions and Ckey.vn API calls (model used, tokens, cost).
   - The Python terminal logging `/embed` requests as semantic memory chunks are created.

## Testing the Ckey.vn API Connection
Run this to verify all 4 models are working:
```bash
node scripts/test-ckey-models.mjs
```
