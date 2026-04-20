// src/services/ai.service.ts - Enhanced Multi-Provider AI Service with Knowledgebase & Web Search

import { Injectable, inject } from '@angular/core';
import { StateService } from './state.services.js';
import { KnowledgebaseService } from './knowledgebase.service.js';
import { Attachment, AIResponse } from '../models/interfaces';

/**
 * Supported AI Providers
 */
export type AIProvider = 'gemini' | 'openrouter' | 'openai' | 'anthropic' | 'groq';

/**
 * Multi-Provider AI Service
 * Automatically detects which API keys are available and uses them
 * Includes knowledgebase for instant responses to common questions
 */
@Injectable({
  providedIn: 'root'
})
export class AiService {
  private stateService = inject(StateService);
  private knowledgebase = inject(KnowledgebaseService);

  /**
   * Get available providers based on configured API keys
   */
  getAvailableProviders(): AIProvider[] {
    const providers: AIProvider[] = [];
    const keys = this.stateService.getAllApiKeys();

    if (keys.gemini) providers.push('gemini');
    if (keys.openrouter) providers.push('openrouter');
    if (keys.openai) providers.push('openai');
    if (keys.anthropic) providers.push('anthropic');
    if (keys.groq) providers.push('groq');

    return providers;
  }

  /**
   * Get the primary provider (first available)
   */
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
    // Tokenize and queue
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
    
    // Only learn if official docs were available (no early return triggered)
    const relevantOfficialDocs = this.stateService.relevantDocs().filter(d => d.officialSource !== false);
    if (relevantOfficialDocs.length === 0) {
      console.log('[AI] Skipped learning - no official docs for this query');
      return;
    }
    
    const context = this.stateService.userContext();
    const learned = this.knowledgebase.learn(userMessage, aiResponse.text, context, 'ai-response', 'official');
    
    if (learned) {
      console.log('[Knowledgebase] Official entry learned from AI response');
    }
  }

  /**
   * Store scraped data directly into knowledgebase for future use
   */
  private storeScrapedData(userMessage: string, webResults: any[]): void {
    if (!webResults || webResults.length === 0) return;

    const context = this.stateService.userContext();
    
    // Store each scraped result as a separate knowledgebase entry
    for (const result of webResults.slice(0, 3)) {
      // Create a structured answer from scraped content
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
      
      // Add content preview if no structured info
      if (!answer && result.content) {
        answer = result.content.substring(0, 800) + (result.content.length > 800 ? '...' : '');
      }
      
      // Add source URL
      if (result.url) {
        answer += `\n\nSOURCE: ${result.url}`;
      }

      if (answer.length > 50) {
        // Learn with the scraped data as answer - use 'crawled' since data comes from admin-approved URLs
        this.knowledgebase.learn(userMessage, answer, context, 'ai-response', 'crawled');
        console.log(`[Knowledgebase] Stored scraped data from ${result.domain || result.url}`);
      }
    }
  }

  /**
   * Check if we have recently scraped data for this topic
   */


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

    // Step 1: Check knowledgebase first (no attachments)
    // Always check KB first (no attachments)
    if (!skipKnowledgebase && attachments.length === 0) {
      const cachedResponse = this.checkKnowledgebase(userMessage);
      if (cachedResponse) {
        console.log('[AI] Served from KB');
        return cachedResponse;
      }
    }
    
    // KB miss - queue silently + continue to AI
    
    // CRITICAL: Check for official documents FIRST
    const officialDocs = this.stateService.getOfficialDocuments();
    const relevantOfficialDocs = this.stateService.relevantDocs().filter(d => d.officialSource !== false);
    
    if (officialDocs.length === 0 && relevantOfficialDocs.length === 0 && attachments.length === 0) {
      console.log('[AI] No official documents available - early return');
      return {
        text: "❌ **No official document provided**\n\nPlease use the **Admin Panel** to upload official government documents via data ingestion. The AI can only answer questions based on verified sources uploaded by administrators.\n\n**Next steps:**\n• Go to Admin → Data Ingestion → Upload Policy/Scheme documents\n• Ensure documents match your jurisdiction ({{this.stateService.userContext().country}} / {{this.stateService.userContext().state}})\n• Then ask your question again",
        suggestedActions: ['Go to Admin Panel', 'Upload Official Document'],
        error: 'no_official_docs'
      };
    }
    
    this.stateService.addPendingQuery(userMessage);
    console.log('[AI] KB miss, docs available, calling AI');

    // Step 2: Direct AI call (attachments or KB skipped)
    const provider = preferredProvider || this.getPrimaryProvider();

    if (!provider) {
      return {
        text: "ERROR: No AI provider configured. Please go to Admin Panel and add at least one API key (Gemini, OpenRouter, OpenAI, Anthropic, or Groq).",
        error: 'No API key'
      };
    }

    let response: AIResponse;
    switch (provider) {
      case 'gemini':
        response = await this.sendMessageGemini(userMessage, attachments, useSearch);
        break;
      case 'openrouter':
        response = await this.sendMessageOpenRouter(userMessage, attachments);
        break;
      case 'openai':
        response = await this.sendMessageOpenAI(userMessage, attachments);
        break;
      case 'anthropic':
        response = await this.sendMessageAnthropic(userMessage, attachments);
        break;
      case 'groq':
        response = await this.sendMessageGroq(userMessage, attachments);
        break;
      default:
        response = { text: "Unknown provider", error: 'Invalid provider' };
    }

    if (!response.error && attachments.length === 0) {
      this.learnFromResponse(userMessage, response);
    }

    return response;
  }

  /**
   * Send message with enhanced context from web scraping - ENHANCED
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
      
      for (const result of webResults.slice(0, 4)) {
        // Include structured info if available
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
        
        webContext += `
SOURCE: ${result.title}
DOMAIN: ${result.domain || 'N/A'}
URL: ${result.url}
${structuredDetails}
CONTENT PREVIEW:
${result.content ? result.content.substring(0, 1500) : result.snippet || 'No content available'}
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

    const provider = preferredProvider || this.getPrimaryProvider();

    if (!provider) {
      return {
        text: "ERROR: No AI provider configured.",
        error: 'No API key'
      };
    }

    let response: AIResponse;
    
    switch (provider) {
      case 'gemini':
        response = await this.sendMessageGemini(enhancedPrompt, attachments, true);
        break;
      case 'openrouter':
        response = await this.sendMessageOpenRouter(enhancedPrompt, attachments);
        break;
      case 'openai':
        response = await this.sendMessageOpenAI(enhancedPrompt, attachments);
        break;
      case 'anthropic':
        response = await this.sendMessageAnthropic(enhancedPrompt, attachments);
        break;
      case 'groq':
        response = await this.sendMessageGroq(enhancedPrompt, attachments);
        break;
      default:
        response = { text: "Unknown provider", error: 'Invalid provider' };
    }

    if (response && !response.error && webResults) {
      response.sources = webResults.map(r => ({
        web: {
          uri: r.url,
          title: r.title
        }
      }));
    }

    return response;
  }

  /**
   * Build system prompt with RAG context - ENHANCED for more descriptive answers
   */
  private buildSystemPrompt(): string {
    const context = this.stateService.userContext();
    const relevantDocs = this.stateService.relevantDocs();

    const contextString = relevantDocs.map(d => `
--- DOCUMENT START ---
Title: ${d.title}
Ministry/Department: ${d.ministry}
Document Type: ${d.type}
Content: ${d.content}
--- DOCUMENT END ---
    `).join('\n');

    return `You are GovInfo AI, a specialized compliance intelligence agent for ${context.country} (${context.state || 'National level'}).
User Sector: ${context.sector}
User Intent: ${context.intent}

🎯 YOUR MISSION:
Provide comprehensive, accurate, and actionable information about government schemes, licenses, permits, policies, and compliance requirements.

📋 RESPONSE FORMAT - Be Detailed and Informative:
Your response MUST include these sections:
1. **OVERVIEW** (2-3 sentences): Brief summary of the topic
2. **ELIGIBILITY** (bullet points): Who can apply, qualification criteria
3. **REQUIRED DOCUMENTS** (numbered list): All documents needed
4. **FEES & CHARGES** (if applicable): Cost involved, payment methods
5. **TIMELINE** (if applicable): Processing time, validity period
6. **HOW TO APPLY** (step-by-step): Online/offline process
7. **IMPORTANT LINKS** (if available): Official portals, forms
8. **SOURCE REFERENCES**: Cite the government source

⚠️ CRITICAL RULES:
1. ONLY use information from the provided source documents
2. If information is not in sources, clearly state "Based on the provided documents, this information is not available"
3. Do NOT hallucinate or make up information
4. Always provide actionable steps - tell users exactly what to do
5. Include specific government portal URLs when available
6. Use professional but friendly tone

📝 OUTPUT STRUCTURE:
After your detailed response, append "---FOLLOW_UP---" followed by 3 relevant follow-up questions separated by "|".

Example:
OVERVIEW: The Udyam Registration is a government initiative for MSME businesses...
ELIGIBILITY: 
- Manufacturing and service enterprises
- Investment under ₹50 crore
- Turnover under ₹250 crore

REQUIRED DOCUMENTS:
1. Aadhaar card
2. Business address proof
3. Category certificate (if SC/ST)

FEES: Free of cost

TIMELINE: Instant registration

HOW TO APPLY:
1. Visit udyamregistration.gov.in
2. Click "For New Registration"
3. Enter Aadhaar and verify
4. Fill business details
5. Get Udyam Certificate

SOURCE REFERENCES: Ministry of MSME, Udyam Registration Portal

---FOLLOW_UP---
How to download Udyam certificate? | What are MSME benefits? | Is re-registration required?

PROVIDED SOURCES:
${contextString}`;
  }

  /**
   * Parse follow-up actions from response
   */
  private parseFollowUpActions(text: string): { text: string; actions: string[] } {
    const splitParts = text.split('---FOLLOW_UP---');
    if (splitParts.length > 1) {
      const cleanText = splitParts[0].trim();
      const actionsStr = splitParts[1].trim();
      const actions = actionsStr.split('|').map(s => s.trim()).filter(s => s.length > 0);
      return { text: cleanText, actions };
    }
    return { text, actions: [] };
  }

  // =====================================================
  // PROVIDER 1: Google Gemini
  // =====================================================
  private async sendMessageGemini(
    userMessage: string,
    attachments: Attachment[],
    useSearch: boolean
  ): Promise<AIResponse> {
    const apiKey = this.stateService.getApiKey('gemini');
    if (!apiKey) return { text: "Gemini API key not configured", error: 'No key' };

    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);

      const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

      const parts: any[] = [];
      if (userMessage) parts.push({ text: userMessage });

      attachments.forEach(att => {
        const base64Data = att.data.includes(',') ? att.data.split(',')[1] : att.data;
        parts.push({
          inlineData: {
            mimeType: att.mimeType,
            data: base64Data
          }
        });
      });

      const result = await model.generateContent({
        contents: [{ role: 'user', parts }],
        systemInstruction: this.buildSystemPrompt()
      });

      const response = await result.response;
      const rawText = response.text();
      const { text, actions } = this.parseFollowUpActions(rawText);

      return {
        text,
        suggestedActions: actions,
        sources: []
      };
    } catch (error: any) {
      console.error('Gemini Error:', error);
      return { text: `Gemini Error: ${error.message}`, error: error.message };
    }
  }

  // =====================================================
  // PROVIDER 2: OpenRouter
  // =====================================================
  private async sendMessageOpenRouter(
    userMessage: string,
    attachments: Attachment[]
  ): Promise<AIResponse> {
    const apiKey = this.stateService.getApiKey('openrouter');
    if (!apiKey) return { text: "OpenRouter API key not configured", error: 'No key' };

    try {
      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
      });

      const messages: any[] = [
        { role: 'system', content: this.buildSystemPrompt() }
      ];

      if (attachments.length > 0) {
        const content: any[] = [];
        if (userMessage) content.push({ type: 'text', text: userMessage });

        attachments.forEach(att => {
          if (att.mimeType.startsWith('image/')) {
            content.push({ type: 'image_url', image_url: { url: att.data } });
          }
        });

        messages.push({ role: 'user', content });
      } else {
        messages.push({ role: 'user', content: userMessage });
      }

      const response = await client.chat.completions.create({
        model: 'openai/gpt-4o',
        messages,
        temperature: 0.1
      });

      const rawText = response.choices[0]?.message?.content || "No response";
      const { text, actions } = this.parseFollowUpActions(rawText);

      return { text, suggestedActions: actions };
    } catch (error: any) {
      console.error('OpenRouter Error:', error);
      return { text: `OpenRouter Error: ${error.message}`, error: error.message };
    }
  }

  // =====================================================
  // PROVIDER 3: OpenAI Direct
  // =====================================================
  private async sendMessageOpenAI(
    userMessage: string,
    attachments: Attachment[]
  ): Promise<AIResponse> {
    const apiKey = this.stateService.getApiKey('openai');
    if (!apiKey) return { text: "OpenAI API key not configured", error: 'No key' };

    try {
      const { default: OpenAI } = await import('openai');
      const client = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
      });

      const messages: any[] = [
        { role: 'system', content: this.buildSystemPrompt() },
        { role: 'user', content: userMessage }
      ];

      const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages,
        temperature: 0.1
      });

      const rawText = response.choices[0]?.message?.content || "No response";
      const { text, actions } = this.parseFollowUpActions(rawText);

      return { text, suggestedActions: actions };
    } catch (error: any) {
      console.error('OpenAI Error:', error);
      return { text: `OpenAI Error: ${error.message}`, error: error.message };
    }
  }

  // =====================================================
  // PROVIDER 4: Anthropic Claude
  // =====================================================
  private async sendMessageAnthropic(
    userMessage: string,
    attachments: Attachment[]
  ): Promise<AIResponse> {
    const apiKey = this.stateService.getApiKey('anthropic');
    if (!apiKey) return { text: "Anthropic API key not configured", error: 'No key' };

    try {
      const { default: Anthropic } = await import('@anthropic-ai/sdk');
      const client = new Anthropic({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
      });

      const response = await client.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 2000,
        system: this.buildSystemPrompt(),
        messages: [
          { role: 'user', content: userMessage }
        ]
      });

      const rawText = response.content[0].type === 'text' ? response.content[0].text : "No response";
      const { text, actions } = this.parseFollowUpActions(rawText);

      return { text, suggestedActions: actions };
    } catch (error: any) {
      console.error('Anthropic Error:', error);
      return { text: `Anthropic Error: ${error.message}`, error: error.message };
    }
  }

  // =====================================================
  // PROVIDER 5: Groq
  // =====================================================
  private async sendMessageGroq(
    userMessage: string,
    attachments: Attachment[]
  ): Promise<AIResponse> {
    const apiKey = this.stateService.getApiKey('groq');
    if (!apiKey) return { text: "Groq API key not configured", error: 'No key' };

    try {
      const { default: Groq } = await import('groq-sdk');
      const client = new Groq({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
      });

      const response = await client.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        messages: [
          { role: 'system', content: this.buildSystemPrompt() },
          { role: 'user', content: userMessage }
        ],
        temperature: 0.1
      });

      const rawText = response.choices[0]?.message?.content || "No response";
      const { text, actions } = this.parseFollowUpActions(rawText);

      return { text, suggestedActions: actions };
    } catch (error: any) {
      console.error('Groq Error:', error);
      return { text: `Groq Error: ${error.message}`, error: error.message };
    }
  }

  // =====================================================
  // DPR Generation
  // =====================================================
  async generateDPR(input: {
    landDetails: string;
    cadMap?: string;
    circleRate?: string;
    capacity?: string;
  }): Promise<AIResponse> {
    const provider = this.getPrimaryProvider();
    if (!provider) {
      return { text: "No AI provider configured", error: 'No key' };
    }

    const dprPrompt = `Generate a comprehensive DPR for:
Land: ${input.landDetails}
Circle Rate: ${input.circleRate || 'TBD'}
Capacity: ${input.capacity || 'TBD'}

Include: Executive Summary, Site Analysis, Technical Specs, Financial Projections, Timeline, Risk Analysis.`;

    return this.sendMessage(dprPrompt, input.cadMap ? [{
      name: 'cad-map.jpg',
      mimeType: 'image/jpeg',
      data: input.cadMap
    }] : [], false, provider, true);
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
