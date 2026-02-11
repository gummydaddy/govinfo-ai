// src/services/ai.service.ts

import { Injectable, inject } from '@angular/core';
import { GoogleGenAI } from '@google/genai';
import { StateService } from './state.services.js';
import { Attachment, AIResponse } from '../models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class AiService {
  private stateService = inject(StateService);
  
  /**
   * Send message to AI and get response
   */
  async sendMessage(
    userMessage: string,
    attachments: Attachment[] = [],
    useSearch: boolean = false
  ): Promise<AIResponse> {
    const apiKey = this.stateService.apiKey();
    
    if (!apiKey) {
      return {
        text: "⚠️ ERROR: No API Key configured. Please configure your Gemini API key in the Admin Panel.",
        error: "No API key"
      };
    }
    
    const context = this.stateService.userContext();
    const relevantDocs = this.stateService.relevantDocs();
    const language = this.stateService.currentLanguage();
    
    // Construct RAG context from relevant documents
    const contextString = relevantDocs.map(d => `
--- DOCUMENT START ---
Title: ${d.title}
Ministry: ${d.ministry}
State: ${d.state}
Type: ${d.type}
Priority: ${d.priority}
Content:
${d.content}
--- DOCUMENT END ---
    `).join('\n\n');
    
    // Build system instruction based on mode
    let systemInstruction = '';
    
    if (useSearch) {
      // Live search mode with Google Maps/Web
      systemInstruction = this.buildSearchModeInstruction(context, language);
    } else {
      // RAG mode with knowledge base
      systemInstruction = this.buildRAGModeInstruction(context, contextString, language);
    }
    
    try {
      const ai = new GoogleGenAI({ apiKey });
      
      // Configure generation
      const config: any = {
        systemInstruction,
        temperature: 0.1, // Low temperature for factual accuracy
        topP: 0.95,
        topK: 40,
      };
      
      // Add tools if search enabled
      if (useSearch) {
        config.tools = [{ googleSearch: {} }];
      }
      
      // Prepare content parts
      const contentParts: any[] = [];
      
      // Add text message
      if (userMessage && userMessage.trim()) {
        contentParts.push({ text: userMessage });
      }
      
      // Add attachments (images, PDFs, etc.)
      if (attachments && attachments.length > 0) {
        for (const att of attachments) {
          const base64Data = att.data.includes(',') ? att.data.split(',')[1] : att.data;
          
          contentParts.push({
            inlineData: {
              mimeType: att.mimeType,
              data: base64Data
            }
          });
        }
      }
      
      // Generate response
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: contentParts },
        config
      });
      
      // Extract grounding sources if available
      const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      const rawText = response.text || "No response generated.";
      
      // Parse follow-up actions
      const { finalText, suggestions } = this.parseFollowUpActions(rawText);
      
      return {
        text: finalText,
        sources: sources || [],
        suggestedActions: suggestions
      };
      
    } catch (error: any) {
      console.error("AI Service Error:", error);
      
      let errorMessage = "An error occurred while processing your request.";
      
      if (error.message?.includes('API key')) {
        errorMessage = "Invalid API key. Please check your Gemini API key in the Admin Panel.";
      } else if (error.message?.includes('quota')) {
        errorMessage = "API quota exceeded. Please try again later or check your API usage.";
      } else if (error.message?.includes('network')) {
        errorMessage = "Network error. Please check your internet connection.";
      }
      
      return {
        text: `❌ ${errorMessage}`,
        error: error.message || 'Unknown error'
      };
    }
  }
  
  /**
   * Generate DPR (Detailed Project Report)
   */
  async generateDPR(
    projectDetails: any,
    cadMapAttachment?: Attachment
  ): Promise<AIResponse> {
    const apiKey = this.stateService.apiKey();
    
    if (!apiKey) {
      return {
        text: "ERROR: No API Key configured.",
        error: "No API key"
      };
    }
    
    // Find reference DPR template
    const referenceDPR = this.stateService.documents().find(
      d => d.type === 'DPR Template'
    );
    
    if (!referenceDPR) {
      return {
        text: "ERROR: No DPR template found in knowledge base.",
        error: "No template"
      };
    }
    
    // Build specialized DPR prompt
    const dprPrompt = `
You are a specialized DPR (Detailed Project Report) generator.

Reference Template:
${referenceDPR.content}

User's Project Requirements:
${JSON.stringify(projectDetails, null, 2)}

TASK:
Generate a comprehensive DPR following the structure of the reference template.
Scale financial estimates based on the user's project capacity and land area.
If a CAD map is provided, analyze the layout and comment on site suitability.

STRUCTURE YOUR DPR WITH THESE SECTIONS:
1. Executive Summary
2. Project Overview
3. Technical Specifications
4. Process Description
5. Land & Infrastructure Requirements
6. Financial Projections (scaled from reference)
7. Utilities & Services
8. Environmental Compliance
9. Statutory Approvals Required
10. Implementation Timeline

FINANCIAL SCALING LOGIC:
- Base your estimates on the reference DPR costs
- Scale proportionally to capacity/land area
- Show clear cost breakdown
- Include contingency (10-15%)

OUTPUT FORMAT:
Use clear markdown formatting.
Include tables for financial breakdowns.
At the end, append: ---FOLLOW_UP---
Then suggest 3 next steps like: "Apply for environmental clearance | Arrange project finance | Hire consultant"
    `;
    
    try {
      const ai = new GoogleGenAI({ apiKey });
      
      const contentParts: any[] = [{ text: dprPrompt }];
      
      if (cadMapAttachment) {
        const base64Data = cadMapAttachment.data.includes(',') 
          ? cadMapAttachment.data.split(',')[1] 
          : cadMapAttachment.data;
        
        contentParts.push({
          inlineData: {
            mimeType: cadMapAttachment.mimeType,
            data: base64Data
          }
        });
      }
      
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts: contentParts },
        config: {
          temperature: 0.2,
          topP: 0.9
        }
      });
      
      const rawText = response.text || "Failed to generate DPR.";
      const { finalText, suggestions } = this.parseFollowUpActions(rawText);
      
      return {
        text: finalText,
        suggestedActions: suggestions
      };
      
    } catch (error: any) {
      console.error("DPR Generation Error:", error);
      return {
        text: `ERROR: Failed to generate DPR. ${error.message}`,
        error: error.message
      };
    }
  }
  
  // ========== PRIVATE METHODS ==========
  
  private buildRAGModeInstruction(context: any, docsContext: string, language: string): string {
    const langInstruction = language !== 'en' 
      ? `\nIMPORTANT: Respond in ${this.getLanguageName(language)} language.`
      : '';
    
    return `
You are GovInfo AI, a specialized compliance intelligence agent for ${context.country}, ${context.state || 'National level'}.

USER PROFILE:
- Sector: ${context.sector}
- Intent: ${context.intent}
- Language: ${language}${langInstruction}

CORE PRINCIPLES:
1. **Zero-Hallucination**: You must ONLY answer based on the provided source documents below.
2. **Source Verification**: If the answer is not in the sources, explicitly state: "No official source available in the knowledge base."
3. **No External Knowledge**: Do NOT use general knowledge outside the provided documents.
4. **Government-Serious Tone**: Professional, concise, clear, authoritative.

RESPONSE STRUCTURE:
1. **Direct Answer**: 1-2 sentence summary
2. **Detailed Steps**: Numbered actionable steps
3. **Required Documents**: Specific forms/certificates needed
4. **Relevant Schemes**: Names of applicable policies/schemes
5. **Source Citation**: Reference the specific document title(s) used
6. **Next Steps**: 3 strategic follow-up actions

SPECIAL PROTOCOLS:

A. DPR GENERATION:
   If user asks to create a DPR or project report:
   - First verify they have provided: Land details, CAD map, Circle rate
   - If missing, politely request the missing items
   - If provided, use the reference DPR template structure
   - Scale financials based on capacity or land size
   - Analyze uploaded CAD map for layout feasibility

B. FOLLOW-UP SUGGESTIONS:
   At the END of every response, append a hidden block:
   
   ---FOLLOW_UP---
   Question 1 | Question 2 | Question 3
   
   These should be SHORT, SPECIFIC follow-up questions or actions.
   Example: "How to apply for Udyam? | What are the processing fees? | Download application form"

PROVIDED KNOWLEDGE BASE:
${docsContext}

Remember: Stick to the sources. Be precise. Cite your references.
    `;
  }
  
  private buildSearchModeInstruction(context: any, language: string): string {
    const langInstruction = language !== 'en' 
      ? `\nRespond in ${this.getLanguageName(language)} language.`
      : '';
    
    return `
You are GovInfo AI with live web search and maps access.

USER CONTEXT: ${context.country}, ${context.state}, ${context.sector}${langInstruction}

CAPABILITIES:
- Real-time web search via Google Search tool
- Location data and government office addresses
- Current policies and recent updates
- Circle rates and property valuations

USAGE:
- Use search for current information not in knowledge base
- Find government office locations, contact details
- Check recent policy updates or news
- Verify current circle rates if user needs for DPR

OUTPUT FORMAT:
- Integrate search results naturally into compliance guidance
- Cite sources when using web data
- End with: ---FOLLOW_UP--- followed by 3 next-step suggestions (pipe-separated)

If generating DPR and circle rate not provided, search for it and clearly state it's an estimate from web.
    `;
  }
  
  private parseFollowUpActions(rawText: string): { finalText: string; suggestions: string[] } {
    const parts = rawText.split('---FOLLOW_UP---');
    
    if (parts.length > 1) {
      const finalText = parts[0].trim();
      const suggestionStr = parts[1].trim();
      const suggestions = suggestionStr
        .split('|')
        .map(s => s.trim())
        .filter(s => s.length > 0 && s.length < 100) // Filter out invalid suggestions
        .slice(0, 3); // Max 3 suggestions
      
      return { finalText, suggestions };
    }
    
    return { finalText: rawText, suggestions: [] };
  }
  
  private getLanguageName(code: string): string {
    const languages: { [key: string]: string } = {
      'en': 'English',
      'hi': 'Hindi',
      'ta': 'Tamil',
      'te': 'Telugu',
      'kn': 'Kannada',
      'ml': 'Malayalam',
      'bn': 'Bengali',
      'mr': 'Marathi',
      'gu': 'Gujarati'
    };
    
    return languages[code] || 'English';
  }
}