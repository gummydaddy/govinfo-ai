# GovInfo AI - Zero-Hallucination Compliance Intelligence Platform

A comprehensive government compliance guidance platform with multi-provider AI support, document ingestion, and knowledge base management.

## Features

- **Multi-Provider AI**: Supports Gemini, OpenAI, Anthropic, Groq, and OpenRouter
- **Document Ingestion**: Upload PDF, DOCX, TXT, and images for analysis
- **Knowledge Base**: Instant responses from cached Q&A pairs
- **Background Crawling**: Automatic website crawling to build knowledge base
- **Web Search**: Real-time search for additional information
- **Voice Support**: Voice input and text-to-speech
- **DPR Generation**: Generate Detailed Project Reports

## Prerequisites

- Node.js 18+
- npm or yarn

## Installation

```bash
npm install
```

## Running the Application

### Option 1: Run Both Server and Frontend Together
```bash
npm start
```
This will start:
- Backend server on https://govinfo-ai.onrender.com (for web scraping)
- Frontend on http://localhost:3000

### Option 2: Run Separately

**Terminal 1 - Backend Server (for web scraping):**
```bash
npm run server
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

## Configuration

### API Keys Setup
1. Go to Admin Panel (click "Admin" link in chat)
2. Add your API keys for at least one provider:
   - **Gemini** (Free tier available): https://aistudio.google.com/app/apikey
   - **OpenRouter** (200+ models): https://openrouter.ai/keys
   - **OpenAI** (GPT-4o): https://platform.openai.com/api-keys
   - **Anthropic** (Claude): https://console.anthropic.com/settings/keys
   - **Groq** (Fast Llama): https://console.groq.com/keys

### Background Crawling Setup
1. Go to Admin Panel → Section 4: URL Management & Background Crawling
2. Enable "Background Crawling" toggle
3. Set crawl interval (1, 6, 12, or 24 hours)
4. Add URLs to crawl in the "Add New URL" form
5. Click "Crawl Now" to start immediately

The backend server must be running (`npm run server`) for background crawling to work.

### Default URLs for Crawling
The system includes these default government portals:
- National Portal of India (india.gov.in)
- GST Portal (gst.gov.in)
- Startup India (startupindia.gov.in)
- Udyam Registration (udyamregistration.gov.in)
- EPFO (epfindia.gov.in)

## Project Structure

```
govinfo-ai/
├── src/
│   ├── components/       # Angular components
│   │   ├── admin.component.ts
│   │   ├── chat.component.ts
│   │   └── ...
│   ├── services/        # Angular services
│   │   ├── ai.services.ts
│   │   ├── background-crawler.service.ts
│   │   ├── knowledgebase.service.ts
│   │   └── ...
│   ├── models/          # TypeScript interfaces
│   └── ...
├── server.js            # Express backend for scraping
├── package.json
└── angular.json
```

## Technology Stack

- **Frontend**: Angular 17+
- **Backend**: Node.js + Express
- **AI Providers**: Google Gemini, OpenAI, Anthropic, Groq, OpenRouter
- **Document Processing**: PDF.js, Tesseract.js, Mammoth
- **Web Scraping**: Cheerio + Axios

## License

MIT




Changes made:

Backend (server.js)

Added /api/ai/chat proxy endpoint that receives requests from the Angular frontend
Added AI SDK imports and provider functions (callGemini, callOpenAI, callOpenRouter, callAnthropic, callGroq) that read keys exclusively from process.env
Added helpers: getEnvKey, getFirstConfiguredProvider, buildSystemPrompt, parseFollowUpActions
The frontend never touches the API keys
Frontend (src/services/state.services.ts)

Removed apiKey and apiKeys signals
Removed setApiKey, setProviderApiKey, clearProviderApiKey, getApiKey, getAllApiKeys
Removed API key loading from localStorage
Frontend (src/services/ai.services.ts)

Added axios import and new callAI method that sends chat requests to the backend
Replaced all direct provider SDK calls (sendMessageGemini, sendMessageOpenRouter, etc.) with callAI wrappers
Updated sendMessage, sendWithEnhancedContext, and generateDPR to route through the backend
Frontend (src/components/admin.component.ts)

Removed all API key input fields, save/clear buttons, and status indicators for providers
Removed apiKeys property, saveProviderKey, and clearProviderKey
Config

Added .env.example with placeholders for GEMINI_API_KEY, OPENROUTER_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, GROQ_API_KEY
Added .env file (git-ignored)
Updated package.json server script to node --env-file .env server.js so local .env is loaded automatically
To complete setup:

Copy .env.example to .env and fill in your actual API keys
Deploy with the same env vars in Vercel/Render/your platform secrets — the backend will read process.env.* automatically
Run npm start or npm run server + npm run dev