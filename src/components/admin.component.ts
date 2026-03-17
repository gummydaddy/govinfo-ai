// src/components/admin.component.ts

import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../services/state.services.js';
import { DocMetadata, ExtractionResult, ScrapingSettings, ApprovedUrl, CrawlSettings, CrawlHistoryEntry, CrawlStatus, PendingQuery } from '../models/interfaces';
import { AuthService } from '../services/auth.service.js';
import { User } from '../models/interfaces.js';
import { DocumentExtractionService } from '../services/document-extraction.service.js';
import { WebScraperService, ScraperStats } from '../services/web-scraper.service.js';
import { BackgroundCrawlerService } from '../services/background-crawler.service.js';



@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen max-h-screen overflow-y-auto bg-black text-white p-4 sm:p-8 font-sans safe-area-top safe-area-bottom">
      <div class="max-w-7xl mx-auto">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-10 border-b border-[#D32F2F] pb-4 gap-3">
          <div>
            <h1 class="text-2xl sm:text-3xl font-bold tracking-tight">Admin Console</h1>
            <p class="text-sm text-gray-500 mt-1">System Configuration & Data Management</p>
          </div>
          <button 
            (click)="closeAdmin()" 
            class="text-gray-400 hover:text-white transition-colors text-sm py-2 px-2 min-h-[44px]"
          >
            ← Exit to App
          </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 pb-20">
          
          <!-- LEFT COLUMN: Configuration & Upload -->
          <div class="space-y-6 sm:space-y-8">
            
            <!-- API Key Configuration - Multi-Provider -->
            <div class="border border-[#D32F2F] p-4 sm:p-6 bg-black">
              <h2 class="text-lg sm:text-xl font-bold mb-4 text-[#D32F2F]">1. AI Provider Configuration</h2>
              <p class="text-xs text-gray-500 mb-4">Configure one or more AI providers. The system will automatically use the first available provider.</p>
  
              <!-- Gemini API Key -->
              <div class="space-y-4 mb-6 pb-6 border-b border-gray-800">
                <label class="block text-sm text-gray-400 flex items-center gap-2">
                  <span class="w-20 sm:w-24">🔷 Gemini</span>
                  <span class="text-xs text-gray-600">(Free tier available)</span>
                </label>
                <div class="flex flex-col sm:flex-row gap-2">
                  <input 
                    type="password" 
                    [(ngModel)]="apiKeys.gemini"
                    placeholder="Enter Google Gemini API Key"
                    class="flex-1 bg-[#111] border border-gray-700 p-3 text-white focus:border-[#D32F2F] focus:outline-none text-sm min-h-[48px]"
                  >
                  <div class="flex gap-2">
                    <button 
                      (click)="saveProviderKey('gemini')"
                      class="bg-[#D32F2F] text-white px-4 sm:px-6 py-3 font-bold hover:bg-red-700 transition-colors text-sm min-h-[48px]"
                    >
                      SAVE
                    </button>
                    <button 
                      (click)="clearProviderKey('gemini')"
                      class="bg-gray-800 text-white px-4 py-3 font-bold hover:bg-red-900 transition-colors text-sm border border-gray-700 min-h-[48px]"
                      title="Clear this API key"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <p class="text-xs text-gray-600">
                  🔑 Get key: <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-[#D32F2F] underline">Google AI Studio</a>
                </p>
              </div>

              <!-- OpenRouter API Key -->
              <div class="space-y-4 mb-6 pb-6 border-b border-gray-800">
                <label class="block text-sm text-gray-400 flex items-center gap-2">
                  <span class="w-20 sm:w-24">🔶 OpenRouter</span>
                  <span class="text-xs text-gray-600">(200+ models, $5 min)</span>
                </label>
                <div class="flex flex-col sm:flex-row gap-2">
                  <input 
                    type="password" 
                    [(ngModel)]="apiKeys.openrouter"
                    placeholder="Enter OpenRouter API Key"
                    class="flex-1 bg-[#111] border border-gray-700 p-3 text-white focus:border-[#D32F2F] focus:outline-none text-sm min-h-[48px]"
                  >
                  <div class="flex gap-2">
                    <button 
                      (click)="saveProviderKey('openrouter')"
                      class="bg-gray-700 text-white px-4 sm:px-6 py-3 font-bold hover:bg-gray-600 transition-colors text-sm min-h-[48px]"
                    >
                      SAVE
                    </button>
                    <button 
                      (click)="clearProviderKey('openrouter')"
                      class="bg-gray-800 text-white px-4 py-3 font-bold hover:bg-red-900 transition-colors text-sm border border-gray-700 min-h-[48px]"
                      title="Clear this API key"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <p class="text-xs text-gray-600">
                  🔑 Get key: <a href="https://openrouter.ai/keys" target="_blank" class="text-[#D32F2F] underline">OpenRouter Keys</a>
                </p>
              </div>

              <!-- OpenAI API Key -->
              <div class="space-y-4 mb-6 pb-6 border-b border-gray-800">
                <label class="block text-sm text-gray-400 flex items-center gap-2">
                  <span class="w-20 sm:w-24">🟢 OpenAI</span>
                  <span class="text-xs text-gray-600">(GPT-4o, $5-20 recommended)</span>
                </label>
                <div class="flex flex-col sm:flex-row gap-2">
                  <input 
                    type="password" 
                    [(ngModel)]="apiKeys.openai"
                    placeholder="Enter OpenAI API Key"
                    class="flex-1 bg-[#111] border border-gray-700 p-3 text-white focus:border-[#D32F2F] focus:outline-none text-sm min-h-[48px]"
                  >
                  <div class="flex gap-2">
                    <button 
                      (click)="saveProviderKey('openai')"
                      class="bg-gray-700 text-white px-4 sm:px-6 py-3 font-bold hover:bg-gray-600 transition-colors text-sm min-h-[48px]"
                    >
                      SAVE
                    </button>
                    <button 
                      (click)="clearProviderKey('openai')"
                      class="bg-gray-800 text-white px-4 py-3 font-bold hover:bg-red-900 transition-colors text-sm border border-gray-700 min-h-[48px]"
                      title="Clear this API key"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <p class="text-xs text-gray-600">
                  🔑 Get key: <a href="https://platform.openai.com/api-keys" target="_blank" class="text-[#D32F2F] underline">OpenAI Platform</a>
                </p>
              </div>

              <!-- Anthropic API Key -->
              <div class="space-y-4 mb-6 pb-6 border-b border-gray-800">
                <label class="block text-sm text-gray-400 flex items-center gap-2">
                  <span class="w-20 sm:w-24">🟠 Anthropic</span>
                  <span class="text-xs text-gray-600">(Claude 3.5, $5 min)</span>
                </label>
                <div class="flex flex-col sm:flex-row gap-2">
                  <input 
                    type="password" 
                    [(ngModel)]="apiKeys.anthropic"
                    placeholder="Enter Anthropic API Key"
                    class="flex-1 bg-[#111] border border-gray-700 p-3 text-white focus:border-[#D32F2F] focus:outline-none text-sm min-h-[48px]"
                  >
                  <div class="flex gap-2">
                    <button 
                      (click)="saveProviderKey('anthropic')"
                      class="bg-gray-700 text-white px-4 sm:px-6 py-3 font-bold hover:bg-gray-600 transition-colors text-sm min-h-[48px]"
                    >
                      SAVE
                    </button>
                    <button 
                      (click)="clearProviderKey('anthropic')"
                      class="bg-gray-800 text-white px-4 py-3 font-bold hover:bg-red-900 transition-colors text-sm border border-gray-700 min-h-[48px]"
                      title="Clear this API key"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <p class="text-xs text-gray-600">
                  🔑 Get key: <a href="https://console.anthropic.com/settings/keys" target="_blank" class="text-[#D32F2F] underline">Anthropic Console</a>
                </p>
              </div>

              <!-- Groq API Key -->
              <div class="space-y-4">
                <label class="block text-sm text-gray-400 flex items-center gap-2">
                  <span class="w-20 sm:w-24">⚡ Groq</span>
                  <span class="text-xs text-gray-600">(Fast Llama, Free tier)</span>
                </label>
                <div class="flex flex-col sm:flex-row gap-2">
                  <input 
                    type="password" 
                    [(ngModel)]="apiKeys.groq"
                    placeholder="Enter Groq API Key"
                    class="flex-1 bg-[#111] border border-gray-700 p-3 text-white focus:border-[#D32F2F] focus:outline-none text-sm min-h-[48px]"
                  >
                  <div class="flex gap-2">
                    <button 
                      (click)="saveProviderKey('groq')"
                      class="bg-gray-700 text-white px-4 sm:px-6 py-3 font-bold hover:bg-gray-600 transition-colors text-sm min-h-[48px]"
                    >
                      SAVE
                    </button>
                    <button 
                      (click)="clearProviderKey('groq')"
                      class="bg-gray-800 text-white px-4 py-3 font-bold hover:bg-red-900 transition-colors text-sm border border-gray-700 min-h-[48px]"
                      title="Clear this API key"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
                <p class="text-xs text-gray-600">
                  🔑 Get key: <a href="https://console.groq.com/keys" target="_blank" class="text-[#D32F2F] underline">Groq Console</a>
                </p>
              </div>

              <!-- Status Indicator -->
              <div class="mt-6 pt-6 border-t border-gray-800">
                <div class="text-xs text-gray-500 mb-2">CONFIGURED PROVIDERS:</div>
                <div class="flex gap-2 flex-wrap">
                  @if (apiKeys.gemini) {
                    <span class="bg-blue-900/30 text-blue-400 px-2 py-1 text-xs rounded">Gemini ✓</span>
                  }
                  @if (apiKeys.openrouter) {
                    <span class="bg-orange-900/30 text-orange-400 px-2 py-1 text-xs rounded">OpenRouter ✓</span>
                  }
                  @if (apiKeys.openai) {
                    <span class="bg-green-900/30 text-green-400 px-2 py-1 text-xs rounded">OpenAI ✓</span>
                  }
                  @if (apiKeys.anthropic) {
                    <span class="bg-purple-900/30 text-purple-400 px-2 py-1 text-xs rounded">Anthropic ✓</span>
                  }
                  @if (apiKeys.groq) {
                    <span class="bg-yellow-900/30 text-yellow-400 px-2 py-1 text-xs rounded">Groq ✓</span>
                  }
                  @if (!apiKeys.gemini && !apiKeys.openrouter && !apiKeys.openai && !apiKeys.anthropic && !apiKeys.groq) {
                    <span class="text-gray-600 text-xs">No providers configured yet</span>
                  }
                </div>
              </div>
            </div>

            <!-- Web Scraping Configuration -->
            <div class="border border-[#D32F2F] p-4 sm:p-6 bg-black mt-6 sm:mt-8">
              <h2 class="text-lg sm:text-xl font-bold mb-4 text-[#D32F2F]">Web Scraping Configuration</h2>
              <p class="text-xs text-gray-500 mb-4">Configure how the AI searches for additional information from government websites.</p>
              
              <!-- Enable/Disable Scraping -->
              <div class="flex items-center justify-between bg-[#111] p-4 mb-4 border border-gray-700">
                <div>
                  <div class="text-sm font-bold text-white">Enable Web Search</div>
                  <div class="text-xs text-gray-400">Automatically search for additional information when needed</div>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    [checked]="scrapingSettings().enabled"
                    (change)="toggleScraping($event)"
                    class="sr-only peer"
                  >
                  <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D32F2F]"></div>
                </label>
              </div>

              <!-- Auto Scrape on Low Confidence -->
              <div class="flex items-center justify-between bg-[#111] p-4 mb-4 border border-gray-700">
                <div>
                  <div class="text-sm font-bold text-white">Auto-Scrape on Low Confidence</div>
                  <div class="text-xs text-gray-400">Search web when knowledgebase confidence is below threshold</div>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    [checked]="scrapingSettings().autoScrapeOnLowConfidence"
                    (change)="toggleAutoScrape($event)"
                    class="sr-only peer"
                  >
                  <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#D32F2F]"></div>
                </label>
              </div>

              <!-- Confidence Threshold -->
              <div class="mb-4">
                <label class="block text-sm text-gray-400 mb-2">
                  Knowledgebase Confidence Threshold: {{ scrapingSettings().minConfidenceThreshold * 100 }}%
                </label>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  [value]="scrapingSettings().minConfidenceThreshold * 100"
                  (input)="updateThreshold($event)"
                  class="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#D32F2F]"
                >
                <div class="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0%</span>
                  <span>100%</span>
                </div>
              </div>

              <!-- Scraping Stats -->
              <div class="mt-4 pt-4 border-t border-gray-800">
                <div class="text-xs text-gray-500 mb-2">SCRAPING STATISTICS:</div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                  <div class="bg-[#111] p-2 border border-gray-700">
                    <div class="text-lg font-bold text-[#D32F2F]">{{ scraperStats().totalScrapes }}</div>
                    <div class="text-xs text-gray-500">Total Scrapes</div>
                  </div>
                  <div class="bg-[#111] p-2 border border-gray-700">
                    <div class="text-lg font-bold text-green-500">{{ scraperStats().cacheHits }}</div>
                    <div class="text-xs text-gray-500">Cache Hits</div>
                  </div>
                  <div class="bg-[#111] p-2 border border-gray-700">
                    <div class="text-lg font-bold text-red-500">{{ scraperStats().failedScrapes }}</div>
                    <div class="text-xs text-gray-500">Failed</div>
                  </div>
                  <div class="bg-[#111] p-2 border border-gray-700">
                    <div class="text-lg font-bold text-blue-500">{{ Math.round(scraperStats().totalContentChars / 1024) }}KB</div>
                    <div class="text-xs text-gray-500">Content</div>
                  </div>
                </div>
              </div>

<!-- Clear Cache Button -->
              <button 
                (click)="clearScraperCache()"
                class="mt-4 w-full border border-gray-700 text-gray-400 py-2 hover:border-[#D32F2F] hover:text-white transition-colors text-sm"
              >
                🗑️ Clear Scraping Cache
              </button>
            </div>

            <!-- Pending Queries Section -->
            <div class="border border-yellow-900/50 p-4 sm:p-6 bg-black/50 mt-6 sm:mt-8">
              <h2 class="text-lg sm:text-xl font-bold mb-4 text-yellow-500">🔄 Pending User Queries ({{ pendingCount() }})</h2>
              <p class="text-xs text-gray-500 mb-4">Unanswered user questions queued for backend research.</p>
              
              @if (pendingQueries().length === 0) {
                <div class="text-center py-8 text-gray-600">
                  <p class="text-sm">No pending queries</p>
                  <p class="text-xs mt-2">All user questions answered from knowledgebase</p>
                </div>
              } @else {
                <div class="space-y-3 max-h-64 overflow-y-auto">
                  @for (query of pendingQueries().slice(0, 10); track query.id) {
                    <div class="bg-[#111] p-3 border border-gray-700 rounded text-xs">
                      <div class="font-mono text-gray-300 truncate">{{ query.query }}</div>
                      <div class="text-gray-500 text-[10px] mt-1 flex gap-4">
                        <span>{{ query.timestamp | date:'short' }}</span>
                        <span class="text-blue-500">{{ query.context.state || 'National' }} / {{ query.context.sector }}</span>
                      </div>
                    </div>
                  }
                </div>
                
                <div class="flex gap-2 mt-4 pt-4 border-t border-gray-800">
                  <button 
                    (click)="processPendingQueries()"
                    class="flex-1 bg-yellow-600 text-white px-4 py-2 font-bold hover:bg-yellow-500 transition-colors text-sm"
                  >
                    ⚙️ PROCESS PENDING QUERIES
                  </button>
                  <button 
                    (click)="clearPendingQueries()"
                    class="flex-1 border border-yellow-900 text-yellow-400 px-4 py-2 font-bold hover:bg-yellow-900 hover:text-yellow-100 transition-colors text-sm"
                  >
                    🗑️ CLEAR PENDING
                  </button>
                </div>
              }
            </div>

            <!-- URL Management & Background Crawling -->
            <div class="border border-[#D32F2F] p-4 sm:p-6 bg-black mt-6 sm:mt-8">
              <h2 class="text-lg sm:text-xl font-bold mb-4 text-[#D32F2F]">5. URL Management & Background Crawling</h2>
              <p class="text-xs text-gray-500 mb-4">Configure URLs to crawl in the background and build your knowledgebase automatically.</p>
              
              <!-- Background Crawling Enable/Disable -->
              <div class="flex items-center justify-between bg-[#111] p-4 mb-4 border border-gray-700">
                <div>
                  <div class="text-sm font-bold text-white">Enable Background Crawling</div>
                  <div class="text-xs text-gray-400">Automatically crawl URLs at scheduled intervals</div>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    [checked]="crawlSettings().enabled"
                    (change)="toggleBackgroundCrawl($event)"
                    class="sr-only peer"
                  >
                  <div class="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                </label>
              </div>

              <!-- Crawl Interval -->
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label class="block text-sm text-gray-400 mb-2">Crawl Interval</label>
                  <select 
                    [value]="crawlSettings().intervalHours"
                    (change)="updateCrawlInterval($event)"
                    class="w-full bg-[#111] border border-gray-700 p-2 text-sm text-white focus:border-[#D32F2F] outline-none min-h-[48px]"
                  >
                    <option value="1">Every 1 hour</option>
                    <option value="6">Every 6 hours</option>
                    <option value="12">Every 12 hours</option>
                    <option value="24">Every 24 hours</option>
                  </select>
                </div>
                <div>
                  <label class="block text-sm text-gray-400 mb-2">Max Pages per URL</label>
                  <select 
                    [value]="crawlSettings().maxPagesPerUrl"
                    (change)="updateMaxPages($event)"
                    class="w-full bg-[#111] border border-gray-700 p-2 text-sm text-white focus:border-[#D32F2F] outline-none min-h-[48px]"
                  >
                    <option value="3">3 pages</option>
                    <option value="5">5 pages</option>
                    <option value="10">10 pages</option>
                    <option value="20">20 pages</option>
                  </select>
                </div>
              </div>

              <!-- Crawl Status -->
              @if (crawlStatus().isRunning || crawlStatus().lastCrawlTime) {
                <div class="bg-[#111] p-3 mb-4 border border-gray-700">
                  <div class="flex justify-between items-center text-xs">
                    <div>
                      @if (crawlStatus().isRunning) {
                        <span class="text-yellow-500">🔄 Crawling: {{ crawlStatus().currentUrl }}</span>
                        <span class="text-gray-400 ml-2">({{ crawlStatus().completedUrls }}/{{ crawlStatus().totalUrls }})</span>
                      } @else {
                        <span class="text-green-500">✓ Last crawl: {{ crawlStatus().lastCrawlTime | date:'short' }}</span>
                      }
                    </div>
                    @if (crawlStatus().nextCrawlTime && !crawlStatus().isRunning) {
                      <span class="text-gray-500">Next: {{ crawlStatus().nextCrawlTime | date:'short' }}</span>
                    }
                  </div>
                </div>
              }

              <!-- Manual Crawl Buttons -->
              <div class="flex gap-2 mb-4">
                <button 
                  (click)="crawlNow()"
                  [disabled]="crawlStatus().isRunning"
                  class="flex-1 bg-[#D32F2F] text-white px-4 py-2 font-bold hover:bg-red-700 transition-colors text-sm disabled:opacity-50 min-h-[44px]"
                >
                  {{ crawlStatus().isRunning ? 'CRAWLING...' : '🚀 CRAWL NOW' }}
                </button>
                <button 
                  (click)="clearCrawlHistory()"
                  class="border border-gray-700 text-gray-400 px-4 py-2 hover:border-[#D32F2F] hover:text-white transition-colors text-sm min-h-[44px]"
                >
                  🗑️ Clear
                </button>
              </div>

              <!-- Add New URL Form -->
              <div class="border-t border-gray-800 pt-4 mt-4">
                <h3 class="text-sm font-bold text-white mb-3">➕ Add New URL</h3>
                <div class="space-y-3">
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">Website URL *</label>
                    <input 
                      [(ngModel)]="newUrl.url"
                      placeholder="https://www.example.gov.in"
                      class="w-full bg-[#111] border border-gray-700 p-2 text-sm text-white focus:border-[#D32F2F] outline-none min-h-[44px]"
                    >
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label class="block text-xs text-gray-400 mb-1">Title *</label>
                      <input 
                        [(ngModel)]="newUrl.title"
                        placeholder="e.g., GST Portal"
                        class="w-full bg-[#111] border border-gray-700 p-2 text-sm text-white focus:border-[#D32F2F] outline-none min-h-[44px]"
                      >
                    </div>
                    <div>
                      <label class="block text-xs text-gray-400 mb-1">Category</label>
                      <select 
                        [(ngModel)]="newUrl.category"
                        class="w-full bg-[#111] border border-gray-700 p-2 text-sm text-white focus:border-[#D32F2F] outline-none min-h-[44px]"
                      >
                        <option value="Central Government">Central Government</option>
                        <option value="State Government">State Government</option>
                        <option value="Tax & Revenue">Tax & Revenue</option>
                        <option value="MSME">MSME</option>
                        <option value="Business & Startups">Business & Startups</option>
                        <option value="Labour & Employment">Labour & Employment</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label class="block text-xs text-gray-400 mb-1">Ministry/Department</label>
                      <input 
                        [(ngModel)]="newUrl.ministry"
                        placeholder="e.g., Ministry of Finance"
                        class="w-full bg-[#111] border border-gray-700 p-2 text-sm text-white focus:border-[#D32F2F] outline-none min-h-[44px]"
                      >
                    </div>
                    <div>
                      <label class="block text-xs text-gray-400 mb-1">Priority</label>
                      <select 
                        [(ngModel)]="newUrl.crawlPriority"
                        class="w-full bg-[#111] border border-gray-700 p-2 text-sm text-white focus:border-[#D32F2F] outline-none min-h-[44px]"
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                  </div>
                  <button 
                    (click)="addCrawlUrl()"
                    class="w-full border border-gray-700 text-white py-2 hover:bg-[#D32F2F] hover:border-[#D32F2F] transition-colors text-sm min-h-[44px]"
                  >
                    ➕ ADD URL
                  </button>
                </div>
              </div>

              <!-- URL List -->
              <div class="border-t border-gray-800 pt-4 mt-4">
                <h3 class="text-sm font-bold text-white mb-3">📋 Crawl URLs ({{ getApprovedUrls().length }})</h3>
                <div class="max-h-64 overflow-y-auto space-y-2">
                  @for (url of getApprovedUrls(); track url.id) {
                    <div class="flex items-center justify-between bg-[#111] p-2 border border-gray-700 text-xs">
                      <div class="flex items-center gap-2 flex-1 min-w-0">
                        <label class="relative inline-flex items-center cursor-pointer flex-shrink-0">
                          <input 
                            type="checkbox" 
                            [checked]="url.enabled"
                            (change)="toggleCrawlUrl(url.id)"
                            class="sr-only peer"
                          >
                          <div class="w-8 h-4 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-green-600"></div>
                        </label>
                        <div class="min-w-0 flex-1">
                          <div class="text-white truncate">{{ url.title }}</div>
                          <div class="text-gray-500 truncate">{{ url.url }}</div>
                        </div>
                      </div>
                      <div class="flex items-center gap-2 flex-shrink-0">
                        <span class="text-gray-500 text-[10px]">
                          @if (url.lastScraped) {
                            {{ url.lastScraped | date:'shortDate' }}
                          }
                        </span>
                        <span class="px-1 py-0.5 rounded text-[10px]" 
                          [class.bg-red-900]="url.crawlPriority === 'high'"
                          [class.text-red-300]="url.crawlPriority === 'high'"
                          [class.bg-yellow-900]="url.crawlPriority === 'medium'"
                          [class.text-yellow-300]="url.crawlPriority === 'medium'"
                          [class.bg-gray-700]="url.crawlPriority === 'low'"
                          [class.text-gray-300]="url.crawlPriority === 'low'"
                        >
                          {{ url.crawlPriority || 'medium' }}
                        </span>
                        <button 
                          (click)="removeCrawlUrl(url.id)"
                          class="text-red-500 hover:text-red-400 py-1 px-1"
                          title="Remove URL"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  }
                </div>
              </div>

              <!-- Crawl History -->
              @if (crawlHistory().length > 0) {
                <div class="border-t border-gray-800 pt-4 mt-4">
                  <h3 class="text-sm font-bold text-white mb-3">📜 Crawl History</h3>
                  <div class="max-h-32 overflow-y-auto space-y-1">
                    @for (entry of crawlHistory().slice(0, 10); track entry.id) {
                      <div class="flex items-center justify-between bg-[#111] p-2 border border-gray-700 text-xs">
                        <div class="min-w-0 flex-1">
                          <div class="text-white truncate">{{ entry.urlTitle }}</div>
                          <div class="text-gray-500 text-[10px]">{{ entry.startedAt | date:'medium' }}</div>
                        </div>
                        <div class="flex items-center gap-2 flex-shrink-0">
                          @if (entry.status === 'completed') {
                            <span class="text-green-500">✓ {{ entry.itemsIndexed }} indexed</span>
                          } @else if (entry.status === 'failed') {
                            <span class="text-red-500">✗ {{ entry.error }}</span>
                          } @else {
                            <span class="text-yellow-500">🔄 Running</span>
                          }
                        </div>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>


            <!-- Admin User Management -->
            <div class="border border-[#D32F2F] p-4 sm:p-6 bg-black mt-6 sm:mt-8">
              <h2 class="text-lg sm:text-xl font-bold mb-4 text-[#D32F2F]">Admin User Management</h2>
              <p class="text-xs text-gray-500 mb-4">Create new admin accounts</p>
  
              <div class="space-y-4">
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Admin Name</label>
                  <input 
                    [(ngModel)]="newAdmin.name"
                    placeholder="Enter admin name"
                    class="w-full bg-[#111] border border-gray-700 p-2 text-sm text-white focus:border-[#D32F2F] outline-none min-h-[48px]"
                  >
                </div>
    
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Admin Email</label>
                  <input 
                    [(ngModel)]="newAdmin.email"
                    type="email"
                    placeholder="Enter admin email"
                    class="w-full bg-[#111] border border-gray-700 p-2 text-sm text-white focus:border-[#D32F2F] outline-none min-h-[48px]"
                  >
                </div>
    
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Password</label>
                  <input 
                    [(ngModel)]="newAdmin.password"
                    type="password"
                    placeholder="Enter password"
                    class="w-full bg-[#111] border border-gray-700 p-2 text-sm text-white focus:border-[#D32F2F] outline-none min-h-[48px]"
                  >
                </div>
    
                <button 
                  (click)="createAdmin()"
                  class="w-full border border-white text-white py-3 font-bold hover:bg-white hover:text-black transition-colors min-h-[48px]"
                >
                  CREATE ADMIN USER
                </button>
              </div>
  
              <!-- List of admins -->
              <div class="mt-6 pt-6 border-t border-gray-800">
                <div class="text-xs text-gray-500 mb-2">EXISTING ADMINS:</div>
                <div class="space-y-2">
                  @for (admin of getAdminUsers(); track admin.id) {
                    <div class="flex justify-between items-center bg-[#111] p-2 text-xs">
                      <div>
                        <div class="text-white">{{ admin.name }}</div>
                        <div class="text-gray-500">{{ admin.email }}</div>
                      </div>
                      @if (admin.email !== 'admin@govinfo.ai') {
                        <button 
                          (click)="removeAdmin(admin.id)"
                          class="text-red-500 hover:text-red-400 py-1 px-2"
                        >
                          Remove
                        </button>
                      }
                    </div>
                  }
                </div>
              </div>
            </div>

            <!-- Data Ingestion -->
            <div class="border border-[#D32F2F] p-4 sm:p-6 bg-black">
              <h2 class="text-lg sm:text-xl font-bold mb-4 text-[#D32F2F]">2. Data Ingestion</h2>
              
              <form class="space-y-4">
                
                <!-- Country & State -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">Country *</label>
                    <input 
                      [(ngModel)]="newDoc.country" 
                      name="country"
                      placeholder="e.g., India"
                      class="w-full bg-[#111] border border-gray-700 p-2 text-sm text-white focus:border-[#D32F2F] outline-none min-h-[48px]"
                    >
                  </div>
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">State/Province *</label>
                    <input 
                      [(ngModel)]="newDoc.state" 
                      name="state"
                      placeholder="e.g., Maharashtra"
                      class="w-full bg-[#111] border border-gray-700 p-2 text-sm text-white focus:border-[#D32F2F] outline-none min-h-[48px]"
                    >
                  </div>
                </div>

                <!-- Title -->
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Document Title *</label>
                  <input 
                    [(ngModel)]="newDoc.title" 
                    name="title"
                    placeholder="e.g., Maharashtra Industrial Policy 2023"
                    class="w-full bg-[#111] border border-gray-700 p-2 text-sm text-white focus:border-[#D32F2F] outline-none min-h-[48px]"
                  >
                </div>
                
                <!-- Ministry & Type -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">Ministry/Department *</label>
                    <input 
                      [(ngModel)]="newDoc.ministry" 
                      name="ministry"
                      placeholder="e.g., Industries Department"
                      class="w-full bg-[#111] border border-gray-700 p-2 text-sm text-white focus:border-[#D32F2F] outline-none min-h-[48px]"
                    >
                  </div>
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">Document Type *</label>
                    <select 
                      [(ngModel)]="newDoc.type" 
                      name="type"
                      class="w-full bg-[#111] border border-gray-700 p-2 text-sm text-white focus:border-[#D32F2F] outline-none min-h-[48px]"
                    >
                      <option value="Policy">Policy</option>
                      <option value="Scheme">Scheme</option>
                      <option value="Act">Act/Law</option>
                      <option value="Notification">Notification</option>
                      <option value="DPR Template">DPR Template</option>
                      <option value="Circular">Circular</option>
                      <option value="Tender">Tender</option>
                    </select>
                  </div>
                </div>

                <!-- Priority & Validity -->
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">Priority Level</label>
                    <select 
                      [(ngModel)]="newDoc.priority" 
                      name="priority"
                      class="w-full bg-[#111] border border-gray-700 p-2 text-sm text-white focus:border-[#D32F2F] outline-none min-h-[48px]"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">Validity Period</label>
                    <input 
                      [(ngModel)]="newDoc.validityPeriod" 
                      name="validity"
                      placeholder="e.g., 2023-2028"
                      class="w-full bg-[#111] border border-gray-700 p-2 text-sm text-white focus:border-[#D32F2F] outline-none min-h-[48px]"
                    >
                  </div>
                </div>

                <!-- Source Authority -->
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Source Authority</label>
                  <input 
                    [(ngModel)]="newDoc.sourceAuthority" 
                    name="sourceAuthority"
                    placeholder="e.g., Government of Maharashtra"
                    class="w-full bg-[#111] border border-gray-700 p-2 text-sm text-white focus:border-[#D32F2F] outline-none min-h-[48px]"
                  >
                </div>

                <!-- Tags -->
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Tags (comma-separated)</label>
                  <input 
                    [(ngModel)]="tagsInput" 
                    name="tags"
                    placeholder="e.g., manufacturing, msme, incentives"
                    class="w-full bg-[#111] border border-gray-700 p-2 text-sm text-white focus:border-[#D32F2F] outline-none min-h-[48px]"
                  >
                </div>

                <!-- File Upload Section -->
                <div class="border border-dashed border-gray-700 p-4 text-center hover:border-[#D32F2F] transition-colors">
                  <label class="cursor-pointer block">
                    <span class="text-xs text-gray-400 block mb-2">
                      📄 Upload Document (PDF, DOCX, TXT, Images, CSV, XML)
                    </span>
                    <input 
                      type="file" 
                      (change)="handleFileUpload($event)" 
                      class="hidden" 
                      accept=".txt,.md,.json,.csv,.xml,.pdf,.doc,.docx,.jpg,.png,.jpeg"
                    >
                    <span class="bg-[#222] px-4 py-2 text-xs text-white border border-gray-600 rounded inline-block hover:bg-gray-700 min-h-[44px] flex items-center justify-center">
                      CHOOSE FILE
                    </span>
                  </label>
                  @if (uploadedFileName()) {
                    <p class="text-xs text-green-500 mt-2">✓ {{ uploadedFileName() }}</p>
                  }
                </div>

                <div class="text-center text-xs text-gray-500 -my-2">
                  OR PASTE CONTENT BELOW
                </div>

                <!-- Content Textarea -->
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Document Content *</label>
                  <textarea 
                    [(ngModel)]="newDoc.content"
                    name="content"
                    rows="6"
                    placeholder="Paste the full text of the government document here..."
                    class="w-full bg-[#111] border border-gray-700 p-3 text-sm text-white focus:border-[#D32F2F] outline-none font-mono"
                  ></textarea>
                  <p class="text-xs text-gray-500 mt-1">
                    {{ newDoc.content?.length || 0 }} characters
                  </p>
                </div>

                <!-- Submit Button -->
                <button 
                  type="button"
                  (click)="uploadDocument()"
                  [disabled]="isUploading()"
                  class="w-full border-2 border-white text-white py-3 font-bold hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
                >
                  @if (isUploading()) {
                    INGESTING DOCUMENT...
                  } @else {
                    📤 INGEST DOCUMENT
                  }
                </button>
              </form>
            </div>

          </div>

          <!-- RIGHT COLUMN: Knowledge Base -->
          <div class="border border-[#D32F2F] p-4 sm:p-6 bg-black max-h-screen flex flex-col">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-lg sm:text-xl font-bold text-[#D32F2F]">3. Knowledge Base</h2>
              <span class="text-xs text-gray-500">{{ stateService.documents().length }} documents</span>
            </div>
            
            <!-- Search/Filter -->
            <div class="mb-4">
              <input 
                type="text"
                [(ngModel)]="searchQuery"
                placeholder="Search documents..."
                class="w-full bg-[#111] border border-gray-700 p-2 text-sm text-white focus:border-[#D32F2F] outline-none min-h-[48px]"
              >
            </div>

            <!-- Document List -->
            <div class="flex-1 overflow-y-auto pr-2 space-y-3">
              @for (doc of filteredDocuments(); track doc.id) {
                <div 
                  class="p-3 sm:p-4 border border-gray-800 hover:border-gray-500 transition-colors bg-[#0a0a0a] group cursor-pointer"
                  (click)="openDocument(doc)"
                >
                  
                  <!-- Header -->
                  <div class="flex justify-between items-start mb-2">
                    <span class="text-[#D32F2F] text-xs font-bold uppercase tracking-wider">
                      {{ doc.type }}
                    </span>
                    <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        (click)="deleteDocument(doc.id)"
                        class="text-xs text-red-500 hover:text-red-400 py-1 px-2"
                        title="Delete document"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <!-- Title -->
                  <h3 class="font-bold text-sm mb-1">{{ doc.title }}</h3>
                  
                  <!-- Metadata -->
                  <p class="text-xs text-gray-400 mb-2">
                    {{ doc.ministry }} | {{ doc.state }}, {{ doc.country }}
                  </p>

                  <!-- Upload Date -->
                  <p class="text-xs text-gray-600 mb-2">
                    📅 {{ doc.uploadDate | date:'short' }}
                  </p>

                  <!-- Tags -->
                  @if (doc.tags && doc.tags.length > 0) {
                    <div class="flex gap-1 flex-wrap mb-2">
                      @for (tag of doc.tags; track tag) {
                        <span class="text-xs bg-gray-800 text-gray-400 px-1 py-0.5 rounded">
                          #{{ tag }}
                        </span>
                      }
                    </div>
                  }

                  <!-- Content Preview -->
                  <div class="text-xs text-gray-600 line-clamp-2 font-mono">
                    {{ doc.content.substring(0, 100) }}...
                  </div>
                </div>
              } @empty {
                <div class="text-center py-10 text-gray-600">
                  <p class="text-sm">No documents found</p>
                  <p class="text-xs mt-2">Upload your first document to get started</p>
                </div>
              }
            </div>

            <!-- Stats -->
            <div class="mt-4 pt-4 border-t border-gray-800 grid grid-cols-3 gap-4 text-center">
              <div>
                <div class="text-xl sm:text-2xl font-bold text-[#D32F2F]">{{ stateService.documents().length }}</div>
                <div class="text-xs text-gray-500">Total Docs</div>
              </div>
              <div>
                <div class="text-xl sm:text-2xl font-bold text-[#D32F2F]">{{ uniqueStates() }}</div>
                <div class="text-xs text-gray-500">States</div>
              </div>
              <div>
                <div class="text-xl sm:text-2xl font-bold text-[#D32F2F]">{{ getAdminFirstName() }}</div>
                <div class="text-xs text-gray-500">Admin</div>
              </div>
            </div>
          </div>

        </div>

        <!-- Footer Info -->
        <div class="mt-8 text-xs text-gray-600 text-center font-mono">
          ADMIN CONSOLE v1.0 | AUTHORIZED ACCESS ONLY
        </div>
      </div>

      <!-- Document Viewer Modal -->
      @if (selectedDocument()) {
        <div 
          class="fixed inset-0 bg-black/90 z-50 overflow-y-auto"
          (click)="closeDocument()"
        >
          <div 
            class="min-h-screen p-4 sm:p-8 flex flex-col items-center"
            (click)="$event.stopPropagation()"
          >
            <!-- Modal Content -->
            <div class="w-full max-w-4xl bg-[#0a0a0a] border border-gray-700 rounded-lg overflow-hidden my-4 sm:my-8">
              
              <!-- Modal Header -->
              <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-6 border-b border-gray-800 gap-3">
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-2 flex-wrap">
                    <span class="bg-[#D32F2F] text-white text-[10px] px-2 py-0.5 font-bold uppercase">
                      {{ selectedDocument()!.type }}
                    </span>
                    <span class="text-xs text-gray-400">
                      {{ selectedDocument()!.country }} 
                      @if (selectedDocument()!.state && selectedDocument()!.state !== 'All') {
                        > {{ selectedDocument()!.state }}
                      }
                    </span>
                  </div>
                  <h2 class="text-lg sm:text-xl font-bold text-white">{{ selectedDocument()!.title }}</h2>
                  <p class="text-xs text-gray-400 mt-1 font-mono uppercase">{{ selectedDocument()!.ministry }}</p>
                </div>
                <button 
                  (click)="closeDocument()"
                  class="text-gray-400 hover:text-white transition-colors p-2 min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"/>
                    <line x1="6" y1="6" x2="18" y2="18"/>
                  </svg>
                </button>
              </div>

              <!-- Document Metadata -->
              <div class="px-4 sm:px-6 py-3 bg-[#111] border-b border-gray-800 flex flex-wrap gap-4 text-xs text-gray-400">
                @if (selectedDocument()!.sourceAuthority) {
                  <span><span class="text-gray-500">Authority:</span> {{ selectedDocument()!.sourceAuthority }}</span>
                }
                @if (selectedDocument()!.validityPeriod) {
                  <span><span class="text-gray-500">Validity:</span> {{ selectedDocument()!.validityPeriod }}</span>
                }
                <span><span class="text-gray-500">Uploaded:</span> {{ selectedDocument()!.uploadDate | date:'mediumDate' }}</span>
                <span><span class="text-gray-500">Priority:</span> {{ selectedDocument()!.priority }}</span>
              </div>

              <!-- Document Content -->
              <div class="p-4 sm:p-6 max-h-[60vh] overflow-y-auto">
                <pre class="whitespace-pre-wrap font-mono text-sm text-gray-300 leading-relaxed">{{ selectedDocument()!.content }}</pre>
              </div>

              <!-- Tags -->
              @if (selectedDocument()!.tags && selectedDocument()!.tags!.length > 0) {
                <div class="px-4 sm:px-6 py-4 border-t border-gray-800 flex gap-2 flex-wrap">
                  @for (tag of selectedDocument()!.tags; track tag) {
                    <span class="text-xs bg-gray-800 text-gray-400 px-3 py-1 rounded">#{{ tag }}</span>
                  }
                </div>
              }

              <!-- Modal Footer -->
              <div class="px-4 sm:px-6 py-4 bg-[#111] border-t border-gray-800 flex justify-end gap-3">
                <button 
                  (click)="deleteDocument(selectedDocument()!.id)"
                  class="bg-red-900 hover:bg-red-800 text-white px-4 py-2 rounded transition-colors min-h-[44px]"
                >
                  🗑️ Delete
                </button>
                <button 
                  (click)="closeDocument()"
                  class="bg-[#D32F2F] hover:bg-[#b91c1c] text-white px-6 py-2 rounded transition-colors min-h-[44px]"
                >
                  Close Document
                </button>
              </div>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class AdminComponent {
  stateService = inject(StateService);
  extractionService = inject(DocumentExtractionService);
  webScraperService = inject(WebScraperService);
  backgroundCrawlerService = inject(BackgroundCrawlerService);
  
  // Math helper for template
  Math = Math;
  
  // Scraping settings signal
  scrapingSettings = signal<ScrapingSettings>({
    enabled: true,
    minConfidenceThreshold: 0.7,
    maxResultsPerQuery: 5,
    cacheDurationHours: 24,
    autoScrapeOnLowConfidence: true
  });
  
  // Scraping stats
  scraperStats = signal<ScraperStats>({
    totalScrapes: 0,
    cacheHits: 0,
    failedScrapes: 0,
    totalContentChars: 0
  });
  
  // Crawl settings signal
  crawlSettings = signal<CrawlSettings>({
    enabled: false,
    intervalHours: 6,
    maxPagesPerUrl: 5,
    maxContentLength: 15000,
    crawlDelayMs: 2000
  });

  // Pending Queries
  pendingQueries = computed(() => this.stateService.getPendingQueries());
  pendingCount = computed(() => this.pendingQueries().length);
  
  // Auto-refresh interval
  private refreshInterval: any;
  
  // Crawl status signal
  crawlStatus = signal<CrawlStatus>({
    isRunning: false,
    currentUrl: null,
    totalUrls: 0,
    completedUrls: 0,
    lastCrawlTime: null,
    nextCrawlTime: null
  });
  
  // Crawl history signal
  crawlHistory = signal<CrawlHistoryEntry[]>([]);
  
  // URL Management form
  newUrl = {
    url: '',
    title: '',
    category: 'Central Government',
    ministry: '',
    country: 'India',
    crawlPriority: 'medium' as 'high' | 'medium' | 'low'
  };
  
  // Multi-provider API Keys
  apiKeys = {
    gemini: '',
    openrouter: '',
    openai: '',
    anthropic: '',
    groq: ''
  };

  mapsKeyInput = '';
  searchQuery = '';
  tagsInput = '';
  uploadedFileName = signal('');
  isUploading = signal(false);
  selectedDocument = signal<DocMetadata | null>(null);
  
  newDoc: Partial<DocMetadata> = {
    country: 'India',
    state: '',
    title: '',
    ministry: '',
    type: 'Policy',
    content: '',
    priority: 'Medium',
    validityPeriod: '',
    sourceAuthority: '',
    tags: []
  };

constructor() {
    // Load all provider keys
    this.apiKeys.gemini = this.stateService.getApiKey('gemini');
    this.apiKeys.openrouter = this.stateService.getApiKey('openrouter');
    this.apiKeys.openai = this.stateService.getApiKey('openai');
    this.apiKeys.anthropic = this.stateService.getApiKey('anthropic');
    this.apiKeys.groq = this.stateService.getApiKey('groq');

    this.mapsKeyInput = this.stateService.googleMapsApiKey();
    
    // Load scraping settings
    this.scrapingSettings.set(this.stateService.getScrapingSettings());
    
    // Load crawl settings
    this.crawlSettings.set(this.stateService.getCrawlSettings());
    this.crawlHistory.set(this.stateService.getCrawlHistory());
    this.crawlStatus.set(this.stateService.getCrawlStatus());
    
    // Load initial stats
    this.updateScraperStats();

    // Start auto-refresh for status
    this.startAutoRefresh();
  }

  startAutoRefresh() {
    if (this.refreshInterval) clearInterval(this.refreshInterval);
    
    this.refreshInterval = setInterval(() => {
      this.updateScraperStats();
      this.crawlStatus.set(this.stateService.getCrawlStatus());
      this.crawlHistory.set(this.stateService.getCrawlHistory());
      this.crawlSettings.set(this.stateService.getCrawlSettings());
    }, 30000); // 30 seconds
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }
  
  // Update scraper stats from service
  updateScraperStats() {
    this.scraperStats.set(this.webScraperService.getStats());
  }

  @HostListener('document:keydown.escape')
  onEscapeKey() {
    this.closeDocument();
  }

  // Open document viewer
  openDocument(doc: DocMetadata) {
    this.selectedDocument.set(doc);
  }

  // Close document viewer
  closeDocument() {
    this.selectedDocument.set(null);
  }

  saveProviderKey(provider: 'gemini' | 'openrouter' | 'openai' | 'anthropic' | 'groq') {
    const key = this.apiKeys[provider];
    
    if (!key || !key.trim()) {
      this.stateService.addNotification({
        type: 'warning',
        message: `Please enter a ${provider} API key`,
        duration: 2000
      });
      return;
    }
    
    this.stateService.setProviderApiKey(provider, key.trim());
    
    this.stateService.addNotification({
      type: 'success',
      message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} API Key saved successfully`,
      duration: 3000
    });
  }

  saveMapsKey() {
    if (!this.mapsKeyInput.trim()) {
      alert('Please enter a Maps API key');
      return;
    }
    
    this.stateService.setGoogleMapsApiKey(this.mapsKeyInput);
    this.stateService.addNotification({
      type: 'success',
      message: 'Google Maps API Key saved successfully',
      duration: 3000
    });
  }

  // File Upload Handler with Real Extraction
  async handleFileUpload(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.uploadedFileName.set(file.name);

    // Auto-fill title if empty
    if (!this.newDoc.title) {
      this.newDoc.title = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
    }

    // Check if file type is supported
    const fileType = this.extractionService.getFileType(file);
    
    if (fileType === 'unknown') {
      this.stateService.addNotification({
        type: 'error',
        message: `Unsupported file type: ${file.type || file.name}. Supported: PDF, DOCX, DOC, Images`,
        duration: 4000
      });
      event.target.value = '';
      return;
    }

    // Check file size (10MB limit for extraction)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      this.stateService.addNotification({
        type: 'warning',
        message: `File size (${this.extractionService.formatFileSize(file.size)}) exceeds 10MB. Extraction may be slow.`,
        duration: 4000
      });
    }

    // Check if file is text-based
    const isTextFile = file.type.match(/text.*/) || 
                      file.name.match(/\.(txt|md|json|csv|xml)$/i);
    
    if (isTextFile) {
      // For text files, read directly
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.newDoc.content = e.target.result;
        this.stateService.addNotification({
          type: 'success',
          message: 'Text file loaded successfully',
          duration: 2000
        });
      };
      reader.readAsText(file);
    } else {
      // For binary files (PDF, DOCX, Images), use extraction service
      this.stateService.addNotification({
        type: 'info',
        message: `Extracting text from ${fileType.toUpperCase()}...`,
        duration: 2000
      });

      try {
        const result: ExtractionResult = await this.extractionService.extractText(file);
        
        if (result.success && result.text) {
          // Build content with metadata
          const metadata = result.metadata;
          let contentHeader = `[EXTRACTED FROM: ${file.name}]
Extraction Date: ${new Date().toISOString()}
File Type: ${metadata?.fileType?.toUpperCase() || 'Unknown'}
File Size: ${this.extractionService.formatFileSize(file.size)}
`;

          // Add type-specific metadata
          if (metadata?.pageCount) {
            contentHeader += `Pages: ${metadata.pageCount}\n`;
          }
          if (metadata?.confidence) {
            contentHeader += `OCR Confidence: ${metadata.confidence.toFixed(1)}%\n`;
          }

          contentHeader += `\n--- EXTRACTED CONTENT ---\n\n`;

          this.newDoc.content = contentHeader + result.text;
          
          this.stateService.addNotification({
            type: 'success',
            message: `Text extracted successfully! (${result.text.length} characters)`,
            duration: 3000
          });
        } else {
          // Extraction failed
          this.newDoc.content = `[FILE CONTENT EXTRACTION FAILED: ${file.name}]

Error: ${result.error || 'Unknown error'}
File Type: ${fileType.toUpperCase()}
File Size: ${this.extractionService.formatFileSize(file.size)}

Note: The file could not be processed for text extraction. 

For PDFs: The document may be scanned or image-based. Try using OCR-enabled PDF or convert to text.
For DOCX: The document may be corrupted or in an unsupported format.
For Images: The image may not contain readable text.

You can still paste the document content manually below.
`;
          
          this.stateService.addNotification({
            type: 'warning',
            message: `Extraction failed: ${result.error}. Please enter content manually.`,
            duration: 5000
          });
        }
      } catch (error: any) {
        console.error('Extraction error:', error);
        this.stateService.addNotification({
          type: 'error',
          message: `Extraction error: ${error.message}`,
          duration: 4000
        });
      }
    }

    // Reset file input
    event.target.value = '';
  }

  // Document Upload Method
  uploadDocument() {
    // Validation
    if (!this.newDoc.title || !this.newDoc.content) {
      alert('Title and Content are required.');
      return;
    }

    if (!this.newDoc.country || !this.newDoc.state || !this.newDoc.ministry) {
      alert('Please fill in all required metadata fields.');
      return;
    }

    this.isUploading.set(true);

    // Simulate upload delay
    setTimeout(() => {
      // Parse tags
      const tags = this.tagsInput
        ? this.tagsInput.split(',').map(t => t.trim()).filter(t => t)
        : [];

      // Normalize ministry name for consistent sector matching
      const ministryInput = this.newDoc.ministry || 'Unknown';
      const normalizedMinistry = this.stateService.normalizeSectorName(ministryInput);

      // Create document with normalized ministry
      const doc: DocMetadata = {
        id: this.generateId(),
        title: this.newDoc.title!,
        country: this.newDoc.country || 'India',
        state: this.newDoc.state || 'All',
        ministry: normalizedMinistry,  // Use normalized ministry
        type: this.newDoc.type || 'Policy',
        content: this.newDoc.content!,
        priority: this.newDoc.priority || 'Medium',
        uploadDate: new Date().toISOString(),
        validityPeriod: this.newDoc.validityPeriod,
        sourceAuthority: this.newDoc.sourceAuthority,
        tags: tags
      };

      // Add to state
      this.stateService.addDocument(doc);
      
      this.isUploading.set(false);

      // Show success notification
      this.stateService.addNotification({
        type: 'success',
        message: `Document "${doc.title}" ingested successfully`,
        duration: 4000
      });

      // Reset form
      this.resetForm();
    }, 800);
  }

  // Delete Document
  deleteDocument(id: string) {
    if (confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      const doc = this.stateService.documents().find(d => d.id === id);
      this.stateService.deleteDocument(id);
      
      this.stateService.addNotification({
        type: 'info',
        message: `Document "${doc?.title}" deleted`,
        duration: 3000
      });
    }
  }

  // Filtered Documents
  filteredDocuments() {
    const query = this.searchQuery.toLowerCase();
    if (!query) {
      return this.stateService.documents();
    }

    return this.stateService.documents().filter(doc =>
      doc.title.toLowerCase().includes(query) ||
      doc.content.toLowerCase().includes(query) ||
      doc.ministry.toLowerCase().includes(query) ||
      doc.state.toLowerCase().includes(query) ||
      (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(query)))
    );
  }

  // Statistics
  uniqueStates() {
    const states = new Set(
      this.stateService.documents()
        .map(d => d.state)
        .filter(s => s && s !== 'All')
    );
    return states.size;
  }

  // Helper to safely get admin first name
  getAdminFirstName(): string {
    const user = this.stateService.currentUser();
    if (!user || !user.name) {
      return 'Admin';
    }
    const nameParts = user.name.split(' ');
    return nameParts[0] || 'Admin';
  }

  // Navigation
  closeAdmin() {
    this.stateService.setView('landing');
  }

  // Helpers
  private resetForm() {
    this.newDoc = {
      country: 'India',
      state: '',
      title: '',
      ministry: '',
      type: 'Policy',
      content: '',
      priority: 'Medium',
      validityPeriod: '',
      sourceAuthority: '',
      tags: []
    };
    this.tagsInput = '';
    this.uploadedFileName.set('');
  }

  private generateId(): string {
    return 'doc-' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  // Web Scraping Configuration Methods
  
  toggleScraping(event: any) {
    const enabled = event.target.checked;
    this.stateService.updateScrapingSettings({ enabled });
    this.scrapingSettings.set(this.stateService.getScrapingSettings());
    
    this.stateService.addNotification({
      type: 'success',
      message: `Web search ${enabled ? 'enabled' : 'disabled'}`,
      duration: 2000
    });
  }
  
  toggleAutoScrape(event: any) {
    const autoScrapeOnLowConfidence = event.target.checked;
    this.stateService.updateScrapingSettings({ autoScrapeOnLowConfidence });
    this.scrapingSettings.set(this.stateService.getScrapingSettings());
    
    this.stateService.addNotification({
      type: 'info',
      message: `Auto-scrape ${autoScrapeOnLowConfidence ? 'enabled' : 'disabled'}`,
      duration: 2000
    });
  }
  
  updateThreshold(event: any) {
    const value = parseInt(event.target.value) / 100;
    this.stateService.updateScrapingSettings({ minConfidenceThreshold: value });
    this.scrapingSettings.set(this.stateService.getScrapingSettings());
  }
  
  clearScraperCache() {
    this.webScraperService.clearCache();
    this.updateScraperStats();
    
    this.stateService.addNotification({
      type: 'success',
      message: 'Scraping cache cleared',
      duration: 2000
    });
  }
  
  // End Web Scraping Configuration Methods
  
  clearProviderKey(provider: 'gemini' | 'openrouter' | 'openai' | 'anthropic' | 'groq') {
    if (!confirm(`Are you sure you want to remove the ${provider} API key?`)) {
      return;
    }
    
    this.apiKeys[provider] = '';
    this.stateService.clearProviderApiKey(provider);
    
    this.stateService.addNotification({
      type: 'info',
      message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} API Key removed`,
      duration: 3000
    });
  }

  // New admin form data
  newAdmin = {
    name: '',
    email: '',
    password: ''
  };

  // Inject AuthService
  authService = inject(AuthService);

  // Create new admin
  createAdmin() {
    if (!this.newAdmin.name || !this.newAdmin.email || !this.newAdmin.password) {
      this.stateService.addNotification({
        type: 'warning',
        message: 'Please fill in all fields',
        duration: 2000
      });
      return;
    }
  
    // Create user with admin role
    const result = this.authService.createAdminUser(
      this.newAdmin.name,
      this.newAdmin.email,
      this.newAdmin.password
    );
  
    if (result.success) {
      this.stateService.addNotification({
        type: 'success',
        message: `Admin user ${this.newAdmin.name} created successfully`,
        duration: 3000
      });
    
      // Reset form
      this.newAdmin = { name: '', email: '', password: '' };
    } else {
      this.stateService.addNotification({
        type: 'error',
        message: result.error || 'Failed to create admin',
        duration: 3000
      });
    }
  }

  // Get all admin users
  getAdminUsers() {
    const users = this.authService.getAllUsers();
    return users.filter((u: User) => u.role === 'admin');
  }

// Remove admin user
  removeAdmin(userId: string) {
    if (!confirm('Are you sure you want to remove this admin user?')) {
      return;
    }
  
    this.authService.deleteUser(userId);
    this.stateService.addNotification({
      type: 'info',
      message: 'Admin user removed',
      duration: 3000
    });
  }
  
  // ==================== URL MANAGEMENT & CRAWLING ====================
  
  // Get all approved URLs
  getApprovedUrls(): ApprovedUrl[] {
    return this.stateService.getApprovedUrls();
  }
  
  // Add new URL for crawling
  addCrawlUrl() {
    if (!this.newUrl.url || !this.newUrl.title) {
      this.stateService.addNotification({
        type: 'warning',
        message: 'Please enter URL and title',
        duration: 2000
      });
      return;
    }
    
    // Validate URL
    try {
      new URL(this.newUrl.url);
    } catch (e) {
      this.stateService.addNotification({
        type: 'error',
        message: 'Please enter a valid URL',
        duration: 2000
      });
      return;
    }
    
    this.stateService.addApprovedUrl({
      url: this.newUrl.url,
      title: this.newUrl.title,
      category: this.newUrl.category,
      ministry: this.newUrl.ministry,
      country: this.newUrl.country,
      enabled: true,
      crawlPriority: this.newUrl.crawlPriority
    });
    
    this.stateService.addNotification({
      type: 'success',
      message: `URL "${this.newUrl.title}" added for crawling`,
      duration: 3000
    });
    
    // Reset form
    this.newUrl = {
      url: '',
      title: '',
      category: 'Central Government',
      ministry: '',
      country: 'India',
      crawlPriority: 'medium'
    };
  }
  
  // Remove URL
  removeCrawlUrl(id: string) {
    if (!confirm('Are you sure you want to remove this URL?')) {
      return;
    }
    
    this.stateService.removeApprovedUrl(id);
    this.stateService.addNotification({
      type: 'info',
      message: 'URL removed',
      duration: 2000
    });
  }
  
  // Toggle URL enabled status
  toggleCrawlUrl(id: string) {
    this.stateService.toggleApprovedUrl(id);
  }
  
  // Crawl settings methods
  toggleBackgroundCrawl(event: any) {
    const enabled = event.target.checked;
    
    if (enabled) {
      this.backgroundCrawlerService.enableCrawling();
    } else {
      this.backgroundCrawlerService.disableCrawling();
    }
    
    this.crawlSettings.set(this.stateService.getCrawlSettings());
    this.crawlStatus.set(this.stateService.getCrawlStatus());
    
    this.stateService.addNotification({
      type: 'success',
      message: `Background crawling ${enabled ? 'enabled' : 'disabled'}`,
      duration: 2000
    });
  }
  
  updateCrawlInterval(event: any) {
    const intervalHours = parseInt(event.target.value);
    this.backgroundCrawlerService.updateSettings({ intervalHours });
    this.crawlSettings.set(this.stateService.getCrawlSettings());
  }
  
  updateMaxPages(event: any) {
    const maxPagesPerUrl = parseInt(event.target.value);
    this.backgroundCrawlerService.updateSettings({ maxPagesPerUrl });
    this.crawlSettings.set(this.stateService.getCrawlSettings());
  }
  
  // Manual crawl actions
  async processPendingQueries() {
    await this.backgroundCrawlerService.processPending();
    
    this.stateService.addNotification({
      type: 'success',
      message: 'Processed pending queries',
      duration: 2000
    });
  }

  clearPendingQueries() {
    if (!confirm('Clear all pending queries?')) return;
    
    this.stateService.clearPendingQueries();
    
    this.stateService.addNotification({
      type: 'info',
      message: 'Pending queries cleared',
      duration: 2000
    });
  }

  async crawlNow() {
    if (this.crawlStatus().isRunning) {
      this.stateService.addNotification({
        type: 'warning',
        message: 'Crawl already in progress',
        duration: 2000
      });
      return;
    }
    
    this.stateService.addNotification({
      type: 'info',
      message: 'Starting crawl...',
      duration: 2000
    });
    
    // Update status
    this.crawlStatus.set(this.stateService.getCrawlStatus());
    
    await this.backgroundCrawlerService.crawlNow();
    
    // Refresh data
    this.crawlHistory.set(this.stateService.getCrawlHistory());
    this.crawlStatus.set(this.stateService.getCrawlStatus());
    
    this.stateService.addNotification({
      type: 'success',
      message: 'Crawl completed!',
      duration: 3000
    });
  }
  
  clearCrawlHistory() {
    if (!confirm('Are you sure you want to clear crawl history?')) {
      return;
    }
    
    this.backgroundCrawlerService.clearHistory();
    this.crawlHistory.set(this.stateService.getCrawlHistory());
    
    this.stateService.addNotification({
      type: 'info',
      message: 'Crawl history cleared',
      duration: 2000
    });
  }
  
  // Refresh crawl status (called periodically)
  refreshCrawlStatus() {
    this.crawlStatus.set(this.stateService.getCrawlStatus());
    this.crawlHistory.set(this.stateService.getCrawlHistory());
  }
}
