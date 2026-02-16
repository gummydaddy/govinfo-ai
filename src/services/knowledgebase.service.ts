// src/services/knowledgebase.service.ts - Lightweight Knowledge Base for Instant Responses

import { Injectable, inject, signal } from '@angular/core';
import { KnowledgebaseEntry, KnowledgebaseMatch, UserContext } from '../models/interfaces';

/**
 * Configuration for knowledgebase behavior
 */
const KB_CONFIG = {
  MAX_ENTRIES: 500,              // Maximum entries to store
  MIN_CONFIDENCE: 0.7,           // Minimum match confidence (0-1)
  MIN_QUESTION_LENGTH: 10,       // Minimum question length to learn
  MIN_ANSWER_LENGTH: 20,         // Minimum answer length to store
  MAX_STORAGE_SIZE_KB: 500,       // Max ~500KB storage
  TOKENIZE_MIN_LENGTH: 3,        // Minimum token length to consider
  CONTEXT_WEIGHT: 0.3,           // Weight for context matching
  TOKEN_MATCH_WEIGHT: 0.7        // Weight for token matching
};

@Injectable({
  providedIn: 'root'
})
export class KnowledgebaseService {
  
  // In-memory cache
  private entries = signal<KnowledgebaseEntry[]>([]);
  
  // Statistics
  readonly stats = signal({
    totalEntries: 0,
    storageSizeKB: 0,
    hits: 0,
    misses: 0
  });

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Tokenize a question for fast matching
   */
  private tokenize(text: string): string[] {
    // Normalize: lowercase, remove punctuation, split by whitespace
    const normalized = text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    
    const tokens = normalized.split(' ')
      .filter(t => t.length >= KB_CONFIG.TOKENIZE_MIN_LENGTH);
    
    // Remove duplicates while preserving order
    const seen = new Set<string>();
    return tokens.filter(t => {
      const exists = seen.has(t);
      seen.add(t);
      return !exists;
    });
  }

  /**
   * Calculate similarity between two token sets
   */
  private calculateSimilarity(tokens1: string[], tokens2: string[]): number {
    if (tokens1.length === 0 || tokens2.length === 0) return 0;
    
    const set1 = new Set(tokens1);
    const set2 = new Set(tokens2);
    
    // Jaccard similarity
    const intersection = [...set1].filter(t => set2.has(t)).length;
    const union = new Set([...set1, ...set2]).size;
    
    return union > 0 ? intersection / union : 0;
  }

  /**
   * Check if context matches (country, state, sector)
   */
  private contextMatch(entry: KnowledgebaseEntry, context: UserContext): number {
    let score = 0;
    let total = 0;
    
    // Country match (high importance)
    if (entry.context.country && context.country) {
      total++;
      if (entry.context.country === context.country) score += 0.4;
    }
    
    // State match (high importance)
    if (entry.context.state && context.state) {
      total++;
      if (entry.context.state === context.state || entry.context.state === 'All') {
        score += 0.4;
      }
    }
    
    // Sector match (medium importance)
    if (entry.context.sector && context.sector) {
      total++;
      if (entry.context.sector === context.sector) score += 0.2;
    }
    
    return total > 0 ? score / total : 0;
  }

  /**
   * Search knowledgebase for similar question
   */
  findMatch(question: string, context: UserContext): KnowledgebaseMatch | null {
    const entries = this.entries();
    if (entries.length === 0) {
      this.stats.update(s => ({ ...s, misses: s.misses + 1 }));
      return null;
    }

    const questionTokens = this.tokenize(question);
    if (questionTokens.length === 0) return null;

    let bestMatch: KnowledgebaseMatch | null = null;

    for (const entry of entries) {
      // Calculate token similarity
      const tokenSimilarity = this.calculateSimilarity(
        questionTokens, 
        entry.questionTokens
      );
      
      // Calculate context similarity
      const contextSimilarity = this.contextMatch(entry, context);
      
      // Combined confidence score
      const confidence = 
        (tokenSimilarity * KB_CONFIG.TOKEN_MATCH_WEIGHT) +
        (contextSimilarity * KB_CONFIG.CONTEXT_WEIGHT);

      // Only consider matches above threshold
      if (confidence >= KB_CONFIG.MIN_CONFIDENCE) {
        if (!bestMatch || confidence > bestMatch.confidence) {
          bestMatch = { entry, confidence };
        }
      }
    }

    if (bestMatch) {
      // Update usage stats
      this.updateEntryUsage(bestMatch.entry.id);
      this.stats.update(s => ({ ...s, hits: s.hits + 1 }));
    } else {
      this.stats.update(s => ({ ...s, misses: s.misses + 1 }));
    }

    return bestMatch;
  }

  /**
   * Learn a new Q&A pair from chat
   */
  learn(
    question: string, 
    answer: string, 
    context: UserContext,
    source: 'user-chat' | 'ai-response' = 'ai-response'
  ): boolean {
    // Validation checks
    const cleanQuestion = question.trim();
    const cleanAnswer = answer.trim();
    
    if (cleanQuestion.length < KB_CONFIG.MIN_QUESTION_LENGTH) return false;
    if (cleanAnswer.length < KB_CONFIG.MIN_ANSWER_LENGTH) return false;
    
    // Check for error indicators in answer
    const errorIndicators = ['error', 'not available', 'cannot answer', 'no information'];
    const isErrorAnswer = errorIndicators.some(ind => 
      cleanAnswer.toLowerCase().includes(ind)
    );
    if (isErrorAnswer) return false;

    const entries = this.entries();
    
    // Check for duplicate/similar entry
    const questionTokens = this.tokenize(cleanQuestion);
    const isDuplicate = entries.some(entry => 
      this.calculateSimilarity(questionTokens, entry.questionTokens) > 0.9
    );
    if (isDuplicate) return false;

    // Create new entry
    const newEntry: KnowledgebaseEntry = {
      id: this.generateId(),
      question: cleanQuestion,
      questionTokens,
      answer: cleanAnswer,
      context: {
        country: context.country,
        state: context.state || '',
        sector: context.sector || '',
        intent: context.intent || ''
      },
      usageCount: 0,
      lastUsed: Date.now(),
      createdAt: Date.now(),
      source
    };

    // Add to entries
    let updatedEntries = [newEntry, ...entries];
    
    // Cleanup if exceeds max entries (remove oldest/lowest usage)
    if (updatedEntries.length > KB_CONFIG.MAX_ENTRIES) {
      updatedEntries = this.cleanupEntries(updatedEntries);
    }

    this.entries.set(updatedEntries);
    this.saveToStorage();
    this.updateStats();
    
    return true;
  }

  /**
   * Update entry usage count and timestamp
   */
  private updateEntryUsage(id: string) {
    this.entries.update(entries => 
      entries.map(e => 
        e.id === id 
          ? { ...e, usageCount: e.usageCount + 1, lastUsed: Date.now() }
          : e
      )
    );
    this.saveToStorage();
  }

  /**
   * Remove oldest/lowest usage entries to stay within limits
   */
  private cleanupEntries(entries: KnowledgebaseEntry[]): KnowledgebaseEntry[] {
    // Sort by: lower usage count first, then older entries
    const sorted = [...entries].sort((a, b) => {
      if (a.usageCount !== b.usageCount) return a.usageCount - b.usageCount;
      return a.lastUsed - b.lastUsed;
    });
    
    // Keep top entries
    return sorted.slice(0, KB_CONFIG.MAX_ENTRIES);
  }

  /**
   * Clear all knowledgebase entries
   */
  clear(): void {
    this.entries.set([]);
    localStorage.removeItem('govinfo_knowledgebase');
    this.updateStats();
  }

  /**
   * Get all entries (for debugging/admin)
   */
  getAllEntries(): KnowledgebaseEntry[] {
    return this.entries();
  }

  /**
   * Remove specific entry
   */
  removeEntry(id: string): void {
    this.entries.update(entries => entries.filter(e => e.id !== id));
    this.saveToStorage();
    this.updateStats();
  }

  /**
   * Export knowledgebase to JSON
   */
  exportToJSON(): string {
    return JSON.stringify(this.entries(), null, 2);
  }

  /**
   * Import knowledgebase from JSON
   */
  importFromJSON(json: string): number {
    try {
      const imported = JSON.parse(json) as KnowledgebaseEntry[];
      const validEntries = imported.filter(e => 
        e.question && e.answer && e.questionTokens
      );
      
      // Merge with existing (avoid duplicates)
      const existingIds = new Set(this.entries().map(e => e.id));
      const newEntries = validEntries.filter(e => !existingIds.has(e.id));
      
      this.entries.update(entries => [...newEntries, ...entries]);
      this.saveToStorage();
      this.updateStats();
      
      return newEntries.length;
    } catch {
      return 0;
    }
  }

  // ========== Storage Management ==========

  private getStorageKey(): string {
    return 'govinfo_knowledgebase';
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.getStorageKey());
      if (stored) {
        const entries = JSON.parse(stored) as KnowledgebaseEntry[];
        this.entries.set(entries);
        this.updateStats();
      }
    } catch (e) {
      console.error('Failed to load knowledgebase:', e);
    }
  }

  private saveToStorage(): void {
    try {
      const entries = this.entries();
      const json = JSON.stringify(entries);
      
      // Check size (rough estimate)
      const sizeKB = new Blob([json]).size / 1024;
      if (sizeKB > KB_CONFIG.MAX_STORAGE_SIZE_KB) {
        // Remove oldest entries to fit
        const trimmed = this.cleanupEntries(entries);
        this.entries.set(trimmed);
        localStorage.setItem(this.getStorageKey(), JSON.stringify(trimmed));
      } else {
        localStorage.setItem(this.getStorageKey(), json);
      }
    } catch (e) {
      console.error('Failed to save knowledgebase:', e);
    }
  }

  private updateStats(): void {
    const entries = this.entries();
    const json = JSON.stringify(entries);
    const sizeKB = new Blob([json]).size / 1024;
    
    this.stats.set({
      totalEntries: entries.length,
      storageSizeKB: Math.round(sizeKB * 100) / 100,
      hits: this.stats().hits,
      misses: this.stats().misses
    });
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }
}

