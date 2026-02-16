// src/services/ai.service.ts - Multi-Provider AI Service with Knowledgebase

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
   * Returns null if no match found (confidence below threshold)
   */
  private checkKnowledgebase(userMessage: string): AIResponse | null {
    const context = this.stateService.userContext();
    const match = this.knowledgebase.findMatch(userMessage, context);
    
    if (match) {
      console.log(`[Knowledgebase] Match found with ${(match.confidence * 100).toFixed(0)}% confidence`);
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
   * Learn from AI response if it's valid
   */
  private learnFromResponse(userMessage: string, aiResponse: AIResponse): void {
    if (aiResponse.error) return; // Don't learn from errors
    
    const context = this.stateService.userContext();
    const learned = this.knowledgebase.learn(userMessage, aiResponse.text, context, 'ai-response');
    
    if (learned) {
      console.log('[Knowledgebase] New entry learned from AI response');
    }
  }

  /**
   * Send message using the best available provider
   * Optionally skips knowledgebase check (for file uploads, DPR generation, etc.)
   */
  async sendMessage(
    userMessage: string,
    attachments: Attachment[] = [],
    useSearch: boolean = false,
    preferredProvider?: AIProvider,
    skipKnowledgebase: boolean = false
  ): Promise<AIResponse> {
    // Check knowledgebase first (unless skipped or has attachments)
    if (!skipKnowledgebase && attachments.length === 0) {
      const cachedResponse = this.checkKnowledgebase(userMessage);
      if (cachedResponse) {
        return cachedResponse;
      }
    }

    const provider = preferredProvider || this.getPrimaryProvider();

    if (!provider) {
      return {
        text: "ERROR: No AI provider configured. Please go to Admin Panel and add at least one API key (Gemini, OpenRouter, OpenAI, Anthropic, or Groq).",
        error: 'No API key'
      };
    }

    let response: AIResponse;

    // Route to appropriate provider
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

    // Learn from successful response (if has attachments, user likely wants AI analysis)
    if (!response.error && attachments.length === 0) {
      this.learnFromResponse(userMessage, response);
    }

    return response;
  }

  /**
   * Build system prompt with RAG context
   */
  private buildSystemPrompt(): string {
    const context = this.stateService.userContext();
    const relevantDocs = this.stateService.relevantDocs();

    const contextString = relevantDocs.map(d => `
--- SOURCE START ---
Title: ${d.title}
Ministry: ${d.ministry}
Type: ${d.type}
Content: ${d.content}
--- SOURCE END ---
    `).join('\n');

    return `You are GovInfo AI, a specialized compliance intelligence agent for ${context.country} (${context.state || 'National level'}).
User Sector: ${context.sector}.
User Intent: ${context.intent}.

CORE RULES:
1. You must ONLY answer based on the provided source documents below.
2. If the answer is not in the sources, say "No official source available."
3. Do NOT hallucinate or use general knowledge outside the provided text.
4. Your tone is professional and concise.
5. Structure your response with:
   - Direct Answer (1-2 sentences)
   - Actionable Steps (numbered list)
   - Required Documents (bullet points)
   - Source References (cite document titles)

FINAL OUTPUT:
After your response, append "---FOLLOW_UP---" followed by 3 follow-up questions separated by "|".

Example:
[Your answer here]

---FOLLOW_UP---
How to apply? | What are the fees? | Download forms

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

      // Build content
      const parts: any[] = [];
      if (userMessage) parts.push({ text: userMessage });

      // Add attachments
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

      // Build user message
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
  // DPR Generation (uses primary provider)
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
    }] : [], false, provider, true); // skipKnowledgebase = true for DPR
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

