// src/services/ai.service.ts - Enhanced Multi-Provider AI Service with Knowledgebase & Web Search

import { Injectable, inject } from '@angular/core';
import { StateService } from './state.services.js';
import { KnowledgebaseService } from './knowledgebase.service.js';
import { Attachment, AIResponse } from '../models/interfaces';

export type AIProvider = 'gemini' | 'openrouter' | 'openai' | 'anthropic' | 'groq' | 'kira';

const FALLBACK_QUESTIONS = [
  { text: "What is the main challenge you are facing right now?", category: "general" },
  { text: "How does this situation make you feel?", category: "emotional" },
  { text: "What specific outcome are you hoping for?", category: "goal" },
  { text: "Have you tried any solutions so far? If so, what?", category: "action" },
  { text: "What support do you feel you need most?", category: "needs" }
];

const cleanJson = (text: string): string => {
  if (!text) return "";
  return text.replace(/```json/g, '').replace(/```/g, '').trim();
};

const ensureArray = <T>(data: any): T[] => {
  if (Array.isArray(data)) return data;
  if (!data) return [];
  if (typeof data === 'object') {
    for (const key in data) {
      if (Array.isArray(data[key])) return data[key];
    }
  }
  return [data];
};

const SCHEMAS = {
  questions: {
    type: "ARRAY",
    items: {
      type: "OBJECT",
      properties: { text: { type: "STRING" }, category: { type: "STRING" } },
      required: ["text", "category"]
    }
  },
  rapport: {
    type: "OBJECT",
    properties: { text: { type: "STRING" }, category: { type: "STRING" } },
    required: ["text", "category"]
  },
  metaInsight: {
    type: "OBJECT",
    properties: {
      pattern: { type: "STRING" },
      recommendation: { type: "STRING" }
    },
    required: ["pattern", "recommendation"]
  },
  analysis: {
    type: "OBJECT",
    properties: {
      archetype: { type: "STRING" },
      archetypeDescription: { type: "STRING" },
      riskAssessment: {
        type: "OBJECT",
        properties: {
          level: { type: "STRING" },
          flags: { type: "ARRAY", items: { type: "STRING" } },
          isConcern: { type: "BOOLEAN" },
          detailedAnalysis: { type: "STRING" }
        },
        required: ["level", "flags", "isConcern", "detailedAnalysis"]
      },
      traits: {
        type: "OBJECT",
        properties: {
          empathy: { type: "NUMBER" }, logic: { type: "NUMBER" }, integrity: { type: "NUMBER" },
          ambition: { type: "NUMBER" }, resilience: { type: "NUMBER" }, social_calibration: { type: "NUMBER" },
        },
        required: ["empathy", "logic", "integrity", "ambition", "resilience", "social_calibration"]
      },
      careerPathSuggestions: {
        type: "ARRAY",
        items: {
          type: "OBJECT",
          properties: { title: { type: "STRING" }, description: { type: "STRING" }, strategicFit: { type: "STRING" } },
          required: ["title", "description", "strategicFit"]
        }
      },
      counselingAdvice: { type: "STRING" },
      professionalDiagnosis: { type: "STRING" },
      suggestedActionPlan: { type: "ARRAY", items: { type: "STRING" } },
      primaryPrecautions: { type: "ARRAY", items: { type: "STRING" } },
      suggestedMedicines: { type: "ARRAY", items: { type: "STRING" } },
      rootCauses: { type: "ARRAY", items: { type: "STRING" } },
      interpersonalStrategy: { type: "STRING" }
    },
    required: ["archetype", "archetypeDescription", "riskAssessment", "traits", "careerPathSuggestions", "counselingAdvice"]
  }
};

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private stateService = inject(StateService);
  private knowledgebase = inject(KnowledgebaseService);

  // --- Provider Configuration ---
  private getKeys() {
    const env = (import.meta as any).env || {};
    const processEnv = (window as any).process?.env || {};
    return {
      gemini: env.VITE_GEMINI_API_KEY || processEnv.GEMINI_API_KEY || '',
      openai: env.VITE_OPENAI_API_KEY || processEnv.OPENAI_API_KEY || '',
      openrouter: env.VITE_OPENROUTER_API_KEY || processEnv.OPENROUTER_API_KEY || '',
      anthropic: env.VITE_ANTHROPIC_API_KEY || processEnv.ANTHROPIC_API_KEY || '',
      groq: env.VITE_GROQ_API_KEY || processEnv.GROQ_API_KEY || '',
      kira: env.VITE_KIRA_API_KEY || processEnv.KIRA_API_KEY || '',
      kiraModel: env.VITE_KIRA_MODEL || processEnv.KIRA_MODEL || 'kira-mini-1.0',
      generic: env.VITE_API_KEY || processEnv.API_KEY || ''
    };
  }

  private detectProviderFromKey(key: string): AIProvider {
    if (key.startsWith('sk-or-')) return 'openrouter';
    if (key.startsWith('sk-ant-')) return 'anthropic';
    if (key.startsWith('gsk_')) return 'groq';
    if (key.startsWith('sk-')) return 'openai';
    if (key.startsWith('kira_')) return 'kira';
    return 'gemini';
  }

  getActiveConfig(): { apiKey: string; provider: AIProvider } {
    const keys = this.getKeys();
    if (keys.gemini) return { apiKey: keys.gemini, provider: 'gemini' };
    if (keys.openrouter) return { apiKey: keys.openrouter, provider: 'openrouter' };
    if (keys.openai) return { apiKey: keys.openai, provider: 'openai' };
    if (keys.anthropic) return { apiKey: keys.anthropic, provider: 'anthropic' };
    if (keys.groq) return { apiKey: keys.groq, provider: 'groq' };
    if (keys.kira) return { apiKey: keys.kira, provider: 'kira' };
    const genericKey = keys.generic.trim();
    if (genericKey) {
      return { apiKey: genericKey, provider: this.detectProviderFromKey(genericKey) };
    }
    throw new Error("No API Key configured. Please set VITE_API_KEY or specific provider keys.");
  }

  async generateContent<T>(
    prompt: string,
    schema: any,
    systemInstruction: string,
    retryCount = 0
  ): Promise<T> {
    const { apiKey, provider } = this.getActiveConfig();
    const jsonStructure = JSON.stringify(schema, null, 2);
    const systemPrompt = `${systemInstruction}\n\nIMPORTANT: You must output ONLY valid JSON.\nTarget JSON Schema:\n${jsonStructure}`;

    try {
      let result: T;
      switch (provider) {
        case 'gemini':
          result = await this.generateGemini(apiKey, prompt, schema, systemInstruction);
          break;
        case 'openrouter':
          result = await this.generateOpenCompatible(apiKey, 'https://openrouter.ai/api/v1', 'google/gemini-flash-1.5', prompt, systemPrompt);
          break;
        case 'openai':
          result = await this.generateOpenCompatible(apiKey, 'https://api.openai.com/v1', 'gpt-4o', prompt, systemPrompt, true);
          break;
        case 'groq':
          result = await this.generateOpenCompatible(apiKey, 'https://api.groq.com/openai/v1', 'llama-3.3-70b-versatile', prompt, systemPrompt, true);
          break;
        case 'anthropic':
          result = await this.generateAnthropic(apiKey, prompt, systemPrompt);
          break;
        case 'kira':
          result = await this.generateKira(apiKey, prompt, schema, systemPrompt);
          break;
        default:
          throw new Error(`Provider ${provider} not supported`);
      }
      return result;
    } catch (e: any) {
      console.warn(`${provider} Generation Error (Attempt ${retryCount}):`, e);
      if (retryCount < 2) {
        await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
        return this.generateContent(prompt, schema, systemInstruction, retryCount + 1);
      }
      throw new Error(`AI Service Failed after retries: ${e.message}`);
    }
  }

  private async generateGemini<T>(apiKey: string, prompt: string, schema: any, systemInstruction: string): Promise<T> {
    const model = 'gemini-3-flash-preview';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: systemInstruction }] },
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema
      }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || `Gemini Error: ${res.statusText}`);
    }

    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    try {
      return JSON.parse(cleanJson(text));
    } catch (e) {
      throw new Error("Invalid JSON response from Gemini");
    }
  }

  private async generateOpenCompatible<T>(apiKey: string, baseUrl: string, model: string, prompt: string, systemPrompt: string, supportsJsonMode = false): Promise<T> {
    const body: any = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1
    };
    if (supportsJsonMode) body.response_format = { type: "json_object" };

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
    if (baseUrl.includes('openrouter')) {
      headers['HTTP-Referer'] = typeof window !== 'undefined' ? window.location.origin : 'https://govinfo-ai.app';
      headers['X-Title'] = 'GovInfo AI';
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json();
      if (err.error?.message?.includes("No endpoints") || res.status === 404 || res.status === 502) {
        throw new Error("MODEL_NOT_FOUND");
      }
      throw new Error(err.error?.message || `${model} API Error: ${res.statusText}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    try {
      return JSON.parse(cleanJson(text));
    } catch (e) {
      throw new Error(`Invalid JSON response from ${model}`);
    }
  }

  private async generateAnthropic<T>(apiKey: string, prompt: string, systemPrompt: string): Promise<T> {
    const url = 'https://api.anthropic.com/v1/messages';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'dangerously-allow-browser': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || `Anthropic Error: ${res.statusText}`);
    }
    const data = await res.json();
    const text = data.content[0]?.text;
    try {
      return JSON.parse(cleanJson(text));
    } catch (e) {
      throw new Error("Invalid JSON response from Anthropic");
    }
  }

  private async generateKira<T>(apiKey: string, prompt: string, schema: any, systemPrompt: string): Promise<T> {
    let model = this.getKeys().kiraModel;
    if (model.startsWith('kira_')) {
      console.warn('Kira model env var not set correctly, using default: kira-mini-1.0');
      model = 'kira-mini-1.0';
    }
    const baseUrl = 'https://kiraai.vn/api/v1';

    const body = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
    };

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || `Kira Error: ${res.statusText}`);
    }

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content;
    try {
      return JSON.parse(cleanJson(text));
    } catch (e) {
      throw new Error("Invalid JSON response from Kira");
    }
  }

  // =====================================================
  // EXISTING SYSTEM INTEGRATION
  // =====================================================

  getAvailableProviders(): AIProvider[] {
    try {
      const { provider } = this.getActiveConfig();
      return [provider];
    } catch {
      return [];
    }
  }

  getPrimaryProvider(): AIProvider | null {
    const available = this.getAvailableProviders();
    return available.length > 0 ? available[0] : null;
  }

  /**
   * Check if knowledgebase has a matching response
   */
  private checkKnowledgebase(userMessage: string): AIResponse | null {
    const context = this.stateService.userContext();
    const match = this.knowledgebase.findMatch(userMessage, context);
    
    if (match) {
      console.log(`[Knowledgebase] Official match found with ${(match.confidence * 100).toFixed(0)}% confidence`);
      return {
        text: match.entry.answer,
        suggestedActions: [],
        sources: [],
        fromKnowledgebase: true,
        knowledgebaseConfidence: match.confidence
      };
    }
    return null;
  }

  /**
   * Queue unanswered query for backend processing
   */
  private queueUnansweredQuery(userMessage: string): AIResponse {
    const tokens = this.knowledgebase.tokenize(userMessage);
    this.stateService.addPendingQuery(userMessage);
    
    console.log(`[AI Service] KB miss - queued "${userMessage.substring(0, 50)}..." for backend (tokens: ${tokens.length})`);
    
    return {
      text: `🔍 **Researching your query in background...**\n\nYour question "${userMessage}" has been queued for automated web research using official government sources.\n\n✅ **What happens next:**\n• Background crawler will scrape related government portals\n• Extract eligibility, documents, fees, timeline\n• Add to knowledgebase for instant future answers\n\n⏱️ **Check back soon** or try:\n• Upload related documents\n• Ask about known schemes/policies\n• Use admin panel to process pending manually`,
      suggestedActions: [
        'Go to Admin Panel',
        'Upload a document',
        'Ask about MSME registration',
        'Clear chat and retry'
      ],
      fromKnowledgebase: false
    };
  }

  /**
   * Learn from AI response if it's valid
   */
  private learnFromResponse(userMessage: string, aiResponse: AIResponse): void {
    if (aiResponse.error) return;
    
    const relevantOfficialDocs = this.stateService.relevantDocs().filter(d => d.officialSource !== false);
    if (relevantOfficialDocs.length === 0) {
      console.log('[AI] Skipped learning - no official docs for this query');
      return;
    }
    
    const context = this.stateService.userContext();
    const learned = this.knowledgebase.learn(userMessage, aiResponse.text, context, 'ai-response', 'official');
    
    if (learned) {
      console.log('[Knowledgebase] Official entry learned from AI response');
      
      const entries = this.knowledgebase.getAllEntries();
      if (entries.length > 50 && entries.length % 10 === 0) {
        this.knowledgebase['clusteringService'].fit(entries);
        console.log('[Knowledgebase] Clustering model refitted with', entries.length, 'entries');
      }
    }
  }

  /**
   * Store scraped data directly into knowledgebase for future use
   */
  private storeScrapedData(userMessage: string, webResults: any[]): void {
    if (!webResults || webResults.length === 0) return;

    const context = this.stateService.userContext();
    
    for (const result of webResults.slice(0, 3)) {
      let answer = '';
      
      if (result.structuredInfo) {
        const si = result.structuredInfo;
        if (si.eligibility && si.eligibility.length > 0) {
          answer += `ELIGIBILITY: ${si.eligibility.join(', ')}\n`;
        }
        if (si.documentsRequired && si.documentsRequired.length > 0) {
          answer += `DOCUMENTS REQUIRED: ${si.documentsRequired.join(', ')}\n`;
        }
        if (si.fees) {
          answer += `FEES: ${si.fees}\n`;
        }
        if (si.timeline) {
          answer += `TIMELINE: ${si.timeline}\n`;
        }
        if (si.howToApply) {
          answer += `HOW TO APPLY: ${si.howToApply}\n`;
        }
      }
      
      if (!answer && result.content) {
        answer = result.content.substring(0, 800) + (result.content.length > 800 ? '...' : '');
      }
      
      if (result.url) {
        answer += `\n\nSOURCE: ${result.url}`;
      }

      if (answer.length > 50) {
        const learned = this.knowledgebase.learn(userMessage, answer, context, 'ai-response', 'crawled');
        if (learned) {
          console.log(`[Knowledgebase] Stored scraped data from ${result.domain || result.url}`);
          
          const entries = this.knowledgebase.getAllEntries();
          if (entries.length > 50 && entries.length % 5 === 0) {
            this.knowledgebase['clusteringService'].fit(entries);
            console.log('[Knowledgebase] Clustering model refitted with', entries.length, 'entries (after crawl)');
          }
        }
      }
    }
  }

  /**
   * Send message using the best available provider with hybrid knowledgebase + web search
   */
  async sendMessage(
    userMessage: string,
    attachments: Attachment[] = [],
    useSearch: boolean = false,
    preferredProvider?: AIProvider,
    skipKnowledgebase: boolean = false
  ): Promise<AIResponse> {
    const startTime = Date.now();

    if (!skipKnowledgebase && attachments.length === 0) {
      const cachedResponse = this.checkKnowledgebase(userMessage);
      if (cachedResponse) {
        console.log('[AI] Served from KB');
        return cachedResponse;
      }
    }
    
    const officialDocs = this.stateService.getOfficialDocuments();
    const relevantOfficialDocs = this.stateService.relevantDocs().filter(d => d.officialSource !== false);
    
    if (officialDocs.length === 0 && relevantOfficialDocs.length === 0 && attachments.length === 0) {
      console.log('[AI] No official documents available - early return');
      return {
        text: "❌ **No official document provided**\n\nPlease use the **Admin Panel** to upload official government documents via data ingestion. The AI can only answer questions based on verified sources uploaded by administrators.\n\n**Next steps:**\n• Go to Admin → Data Ingestion → Upload Policy/Scheme documents\n• Ensure documents match your jurisdiction\n• Then ask your question again",
        suggestedActions: ['Go to Admin Panel', 'Upload Official Document'],
        error: 'no_official_docs'
      };
    }
    
    this.stateService.addPendingQuery(userMessage);
    console.log('[AI] KB miss, docs available, calling AI');

    try {
      const systemPrompt = this.buildSystemPrompt();
      const responseText = await this.generateChatResponse(userMessage, systemPrompt);
      
      const response: AIResponse = {
        text: responseText,
        suggestedActions: [],
        sources: []
      };

      if (!response.error && attachments.length === 0) {
        this.learnFromResponse(userMessage, response);
      }

      return response;
    } catch (error: any) {
      console.error('[AI] Generation failed:', error);
      return {
        text: `AI Error: ${error.message}`,
        error: error.message
      };
    }
  }

  private async generateChatResponse(prompt: string, systemPrompt: string, retryCount = 0): Promise<string> {
    const { apiKey, provider } = this.getActiveConfig();

    const MAX_PROMPT_CHARS = 12000;
    const truncatedPrompt = prompt.length > MAX_PROMPT_CHARS
      ? prompt.substring(0, MAX_PROMPT_CHARS) + '...[truncated]'
      : prompt;

    try {
      switch (provider) {
        case 'gemini':
          return await this.generateGeminiChat(apiKey, truncatedPrompt, systemPrompt);
        case 'openrouter':
          return await this.generateOpenCompatibleChat(apiKey, 'https://openrouter.ai/api/v1', 'google/gemini-flash-1.5', truncatedPrompt, systemPrompt);
        case 'openai':
          return await this.generateOpenCompatibleChat(apiKey, 'https://api.openai.com/v1', 'gpt-4o', truncatedPrompt, systemPrompt);
        case 'groq':
          return await this.generateOpenCompatibleChat(apiKey, 'https://api.groq.com/openai/v1', 'llama-3.3-70b-versatile', truncatedPrompt, systemPrompt);
        case 'anthropic':
          return await this.generateAnthropicChat(apiKey, truncatedPrompt, systemPrompt);
        case 'kira':
          return await this.generateKiraChat(apiKey, truncatedPrompt, systemPrompt);
        default:
          throw new Error(`Provider ${provider} not supported`);
      }
    } catch (e: any) {
      console.warn(`${provider} Chat Error (Attempt ${retryCount}):`, e);
      if (retryCount < 2) {
        await new Promise(r => setTimeout(r, 1000 * (retryCount + 1)));
        return this.generateChatResponse(truncatedPrompt, systemPrompt, retryCount + 1);
      }
      throw new Error(`AI Chat Failed after retries: ${e.message}`);
    }
  }

  private async generateGeminiChat(apiKey: string, prompt: string, systemPrompt: string): Promise<string> {
    const model = 'gemini-3-flash-preview';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: {
        temperature: 0.1
      }
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || `Gemini Error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  private async generateOpenCompatibleChat(apiKey: string, baseUrl: string, model: string, prompt: string, systemPrompt: string): Promise<string> {
    const body: any = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1
    };

    const headers: Record<string, string> = {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    };
    if (baseUrl.includes('openrouter')) {
      headers['HTTP-Referer'] = typeof window !== 'undefined' ? window.location.origin : 'https://govinfo-ai.app';
      headers['X-Title'] = 'GovInfo AI';
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json();
      if (err.error?.message?.includes("No endpoints") || res.status === 404 || res.status === 502) {
        throw new Error("MODEL_NOT_FOUND");
      }
      throw new Error(err.error?.message || `${model} API Error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  private async generateAnthropicChat(apiKey: string, prompt: string, systemPrompt: string): Promise<string> {
    const url = 'https://api.anthropic.com/v1/messages';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'dangerously-allow-browser': 'true'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4000,
        system: systemPrompt,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || `Anthropic Error: ${res.statusText}`);
    }
    const data = await res.json();
    return data.content[0]?.text || '';
  }

  private async generateKiraChat(apiKey: string, prompt: string, systemPrompt: string): Promise<string> {
    let model = this.getKeys().kiraModel;
    if (model.startsWith('kira_')) {
      console.warn('Kira model env var not set correctly, using default: kira-mini-1.0');
      model = 'kira-mini-1.0';
    }
    const baseUrl = 'https://kiraai.vn/api/v1';

    const body = {
      model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1
    };

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error?.message || `Kira Error: ${res.statusText}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
  }

  /**
   * Send message with enhanced context from web scraping
   */
  private async sendWithEnhancedContext(
    userMessage: string,
    attachments: Attachment[],
    preferredProvider: AIProvider | undefined,
    existingAnswer?: string,
    webResults?: any[]
  ): Promise<AIResponse> {
    let webContext = '';
    
    if (webResults && webResults.length > 0) {
      webContext = `\n\n=== ADDITIONAL WEB INFORMATION FROM OFFICIAL SOURCES ===\n`;
      
      const MAX_WEB_RESULTS = 2;
      const MAX_WEB_CHARS = 400;
      
      for (const result of webResults.slice(0, MAX_WEB_RESULTS)) {
        let structuredDetails = '';
        if (result.structuredInfo) {
          const si = result.structuredInfo;
          structuredDetails = '\n--- EXTRACTED DETAILS ---';
          if (si.eligibility && si.eligibility.length > 0) {
            structuredDetails += '\nELIGIBILITY: ' + si.eligibility.join(', ');
          }
          if (si.documentsRequired && si.documentsRequired.length > 0) {
            structuredDetails += '\nDOCUMENTS REQUIRED: ' + si.documentsRequired.join(', ');
          }
          if (si.fees) {
            structuredDetails += '\nFEES: ' + si.fees;
          }
          if (si.timeline) {
            structuredDetails += '\nTIMELINE: ' + si.timeline;
          }
          if (si.howToApply) {
            structuredDetails += '\nHOW TO APPLY: ' + si.howToApply;
          }
        }
        
        const contentPreview = result.content 
          ? result.content.substring(0, MAX_WEB_CHARS) + (result.content.length > MAX_WEB_CHARS ? '...' : '')
          : result.snippet || 'No content available';
        
        webContext += `
[${result.domain || 'N/A'}] ${result.title}
URL: ${result.url}
${structuredDetails}
${contentPreview}
---
`;
      }
      
      webContext += `\nIMPORTANT: Use the above official government sources to provide accurate, detailed information. Include specific eligibility criteria, required documents, fees, timeline, and step-by-step application process in your response.\n`;
    }

    let additionalContext = '';
    if (existingAnswer) {
      additionalContext = `
The user has asked a question that was previously answered. 
PREVIOUS ANSWER:
${existingAnswer}

Please enhance this answer with the additional web information below. Make it more comprehensive and informative.
`;
    }

    const enhancedPrompt = `${userMessage}${additionalContext}${webContext}`;

    try {
      const systemPrompt = this.buildSystemPrompt();
      const responseText = await this.generateChatResponse(enhancedPrompt, systemPrompt);
      
      const response: AIResponse = {
        text: responseText,
        suggestedActions: []
      };

      if (response && !response.error && webResults) {
        response.sources = webResults.map(r => ({
          web: {
            uri: r.url,
            title: r.title
          }
        }));
      }

      return response;
    } catch (error: any) {
      console.error('[AI] Enhanced context generation failed:', error);
      return {
        text: `AI Error: ${error.message}`,
        error: error.message
      };
    }
  }

  private estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  private MAX_SYSTEM_TOKENS = 4000;

  /**
   * Build system prompt with RAG context
   */
  private buildSystemPrompt(): string {
    const context = this.stateService.userContext();
    const relevantDocs = this.stateService.relevantDocs();

    const MAX_DOC_CHARS = 400;
    const basePrompt = `You are GovInfo AI for ${context.country} (${context.state || 'National'}). Sector: ${context.sector} | Intent: ${context.intent}

Provide detailed answers from the provided source documents ONLY. Structure: Overview, Eligibility, Required Documents, Fees, Timeline, How to Apply, Links, Sources.

Rules:
- ONLY use provided sources. If missing, say "Not available in provided documents."
- Include specific URLs when available.
- Professional, actionable tone.
- After answer, append "|||Q1|Q2|Q3" with 3 follow-up questions.

PROVIDED SOURCES:\n`;

    let prompt = basePrompt;
    let currentTokens = this.estimateTokens(prompt);
    const selectedDocs: string[] = [];

    for (const doc of relevantDocs) {
      const docChunk = `[${doc.ministry}] ${doc.title} (${doc.type})\n${doc.content.substring(0, MAX_DOC_CHARS)}${doc.content.length > MAX_DOC_CHARS ? '...[truncated]' : ''}\n\n`;
      const docTokens = this.estimateTokens(docChunk);
      
      if (currentTokens + docTokens > this.MAX_SYSTEM_TOKENS) {
        break;
      }
      
      selectedDocs.push(docChunk);
      currentTokens += docTokens;
    }

    return prompt + selectedDocs.join('\n');
  }

  /**
   * Parse follow-up actions from response
   */
  private parseFollowUpActions(text: string): { text: string; actions: string[] } {
    const splitParts = text.split('|||');
    if (splitParts.length > 1) {
      const cleanText = splitParts[0].trim();
      const actions = splitParts.slice(1).map(s => s.trim()).filter(s => s.length > 0);
      return { text: cleanText, actions };
    }
    return { text, actions: [] };
  }

  // =====================================================
  // DPR GENERATION
  // =====================================================
  async generateDPR(input: {
    landDetails: string;
    cadMap?: string;
    circleRate?: string;
    capacity?: string;
  }): Promise<AIResponse> {
    const dprPrompt = `Generate a comprehensive DPR for:
Land: ${input.landDetails}
Circle Rate: ${input.circleRate || 'TBD'}
Capacity: ${input.capacity || 'TBD'}

Include: Executive Summary, Site Analysis, Technical Specs, Financial Projections, Timeline, Risk Analysis.`;

    return this.sendMessage(dprPrompt, input.cadMap ? [{
      name: 'cad-map.jpg',
      mimeType: 'image/jpeg',
      data: input.cadMap
    }] : [], false, 'gemini', true);
  }

  /**
   * Get knowledgebase statistics
   */
  getKnowledgebaseStats() {
    return this.knowledgebase.stats();
  }

  /**
   * Clear knowledgebase
   */
  clearKnowledgebase() {
    this.knowledgebase.clear();
  }
}
