// src/services/background-crawler.service.ts - Background Web Crawler Service

import { Injectable, inject, signal } from '@angular/core';
import { StateService } from './state.services.js';
import { KnowledgebaseService } from './knowledgebase.service.js';
import { WebScraperService } from './web-scraper.service.js';
import { CrawlSettings, CrawlHistoryEntry, CrawlStatus, ApprovedUrl, PendingQuery } from '../models/interfaces';

/**
 * Lightweight Background Crawler Service
 * Uses backend server for scraping to bypass CORS restrictions
 */
@Injectable({
  providedIn: 'root'
})
export class BackgroundCrawlerService {
  private stateService = inject(StateService);
  private knowledgebase = inject(KnowledgebaseService);
  private webScraper = inject(WebScraperService);
  
  // Internal state
  private schedulerInterval: any = null;
  private isRunning = signal(false);
  
  // Backend server URL - use environment variable or default to production URL
  private readonly SERVER_URL = (typeof window !== 'undefined' && (<any>window)['BACKEND_URL']) 
    ? (<any>window)['BACKEND_URL'] 
    : 'https://govinfo-ai.onrender.com';

  constructor() {
    // Auto-start if enabled in settings
    const settings = this.stateService.getCrawlSettings();
    if (settings.enabled) {
      this.startScheduler();
    }
  }

  /**
   * Start the background crawl scheduler
   */
  startScheduler(): void {
    if (this.schedulerInterval) {
      console.log('[BackgroundCrawler] Scheduler already running');
      return;
    }

    const settings = this.stateService.getCrawlSettings();
    
    if (!settings.enabled) {
      console.log('[BackgroundCrawler] Crawling disabled in settings');
      return;
    }

    const intervalMs = settings.intervalHours * 60 * 60 * 1000;
    console.log(`[BackgroundCrawler] Starting scheduler - interval: ${settings.intervalHours} hours`);
    
    // Update status
    this.stateService.updateCrawlStatus({
      isRunning: true,
      nextCrawlTime: Date.now() + intervalMs
    });

    // Run immediately on start
    this.crawlAllUrls();
    
    // Schedule periodic runs
    this.schedulerInterval = setInterval(() => {
      const currentSettings = this.stateService.getCrawlSettings();
      if (currentSettings.enabled) {
        this.crawlAllUrls();
      }
    }, intervalMs);
  }

  /**
   * Stop the background crawl scheduler
   */
  stopScheduler(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
      console.log('[BackgroundCrawler] Scheduler stopped');
    }
    
    this.stateService.updateCrawlStatus({
      isRunning: false,
      nextCrawlTime: null
    });
  }

  /**
   * Enable and start crawling
   */
  enableCrawling(): void {
    this.stateService.updateCrawlSettings({ enabled: true });
    this.startScheduler();
  }

  /**
   * Disable and stop crawling
   */
  disableCrawling(): void {
    this.stateService.updateCrawlSettings({ enabled: false });
    this.stopScheduler();
  }

  /**
   * Update crawl settings and restart scheduler if needed
   */
  updateSettings(settings: Partial<CrawlSettings>): void {
    const wasEnabled = this.stateService.getCrawlSettings().enabled;
    const wasRunning = this.schedulerInterval !== null;
    
    this.stateService.updateCrawlSettings(settings);
    
    const newSettings = this.stateService.getCrawlSettings();
    
    // Handle scheduler changes
    if (newSettings.enabled && !wasRunning) {
      this.startScheduler();
    } else if (!newSettings.enabled && wasRunning) {
      this.stopScheduler();
    } else if (newSettings.enabled && wasRunning) {
      // Restart with new interval
      this.stopScheduler();
      this.startScheduler();
    }
  }

  /**
   * Crawl all enabled URLs
   */
  async crawlAllUrls(): Promise<void> {
    const settings = this.stateService.getCrawlSettings();
    if (!settings.enabled) {
      console.log('[BackgroundCrawler] Crawling is disabled');
      return;
    }

    // Process pending queries first
    await this.processPendingQueries();
    
    const urls = this.stateService.getApprovedUrls().filter(u => u.enabled);
    
    if (urls.length === 0) {
      console.log('[BackgroundCrawler] No URLs to crawl');
      // Still process pending if no URLs
      await this.processPendingQueries();
      return;
    }

    console.log(`[BackgroundCrawler] Starting crawl of ${urls.length} URLs`);
    
    this.isRunning.set(true);
    
    // Sort by priority
    const priorityOrder = { 'high': 0, 'medium': 1, 'low': 2 };
    urls.sort((a, b) => {
      const priorityA = a.crawlPriority || 'medium';
      const priorityB = b.crawlPriority || 'medium';
      return priorityOrder[priorityA] - priorityOrder[priorityB];
    });

    this.stateService.updateCrawlStatus({
      isRunning: true,
      totalUrls: urls.length,
      completedUrls: 0,
      lastCrawlTime: Date.now()
    });

    let completedCount = 0;

    for (const url of urls) {
      if (!this.stateService.getCrawlSettings().enabled) {
        console.log('[BackgroundCrawler] Crawling disabled during run, stopping...');
        break;
      }

      this.stateService.updateCrawlStatus({
        currentUrl: url.url
      });

      try {
        await this.crawlUrl(url);
        completedCount++;
        
        this.stateService.updateCrawlStatus({
          completedUrls: completedCount
        });
        
        // Update URL's last scraped time
        this.stateService.approvedUrls.update(urlList =>
          urlList.map(u => u.id === url.id ? { ...u, lastScraped: Date.now() } : u)
        );
        
      } catch (error) {
        console.error(`[BackgroundCrawler] Failed to crawl ${url.url}:`, error);
      }

      // Delay between URLs to be respectful
      if (completedCount < urls.length) {
        await this.delay(settings.crawlDelayMs);
      }
    }

    this.isRunning.set(false);
    
    this.stateService.updateCrawlStatus({
      isRunning: false,
      currentUrl: null,
      nextCrawlTime: Date.now() + (settings.intervalHours * 60 * 60 * 1000)
    });

    // Process pending queries after crawl
    await this.processPendingQueries();
    
    console.log(`[BackgroundCrawler] Crawl complete. Indexed data from ${completedCount} URLs`);
  }

  /**
   * Crawl a single URL and store in knowledgebase
   */
  async crawlUrl(approvedUrl: ApprovedUrl): Promise<void> {
    const settings = this.stateService.getCrawlSettings();
    
    // Create history entry
    const historyEntry: CrawlHistoryEntry = {
      id: 'crawl-' + Math.random().toString(36).substr(2, 9),
      url: approvedUrl.url,
      urlTitle: approvedUrl.title,
      status: 'running',
      startedAt: Date.now(),
      pagesCrawled: 0,
      itemsIndexed: 0
    };
    
    this.stateService.addCrawlHistory(historyEntry);

    try {
      // Fetch the page via backend server (returns already-extracted text, not HTML)
      const content = await this.fetchWithCorsProxy(approvedUrl.url);
      
      if (!content) {
        throw new Error('Failed to fetch content');
      }

      // Backend server already extracts text content via cheerio
      // Use content directly - no need to re-parse as HTML
      const pageTitle = approvedUrl.title || 'Untitled';
      const pageContent = content;
      
      // Store in knowledgebase with multiple question patterns
      let itemsIndexed = 0;
      
      // Generate question patterns for this URL's content
      const questions = this.generateQuestions(approvedUrl, pageTitle);
      const context = this.stateService.userContext();
      
      for (const question of questions) {
        // Store crawled content in KB as 'crawled' (admin-approved URL source)
        const learned = this.knowledgebase.learn(
          question,
          pageContent.substring(0, 5000) + (pageContent.length > 5000 ? '\n\n[Content truncated]' : '') + `\n\nSource: ${approvedUrl.url}`,
          context,
          'ai-response',
          'crawled'
        );
        if (learned) {
          itemsIndexed++;
          console.log(`[BackgroundCrawler] KB learned: "${question.substring(0, 60)}..." from ${approvedUrl.url}`);
        }
      }

      // Update history entry as completed
      this.stateService.updateCrawlHistory(historyEntry.id, {
        status: 'completed',
        completedAt: Date.now(),
        pagesCrawled: 1,
        itemsIndexed
      });

      console.log(`[BackgroundCrawler] Indexed ${itemsIndexed} entries from ${approvedUrl.url}`);

    } catch (error: any) {
      // Update history entry as failed
      this.stateService.updateCrawlHistory(historyEntry.id, {
        status: 'failed',
        completedAt: Date.now(),
        error: error.message
      });
      
      throw error;
    }
  }

/**
   * Fetch URL using backend server (bypasses CORS)
   */
  private async fetchWithCorsProxy(url: string): Promise<string | null> {
    try {
      const scrapeUrl = `${this.SERVER_URL}/api/scrape?url=${encodeURIComponent(url)}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout for server proxy

      const response = await fetch(scrapeUrl, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.content) {
        return data.content; // Server returns the HTML content
      } else if (data.error) {
        throw new Error(data.error);
      }
      
      return null;
    } catch (error) {
      console.error(`[BackgroundCrawler] Server fetch failed for ${url}:`, error);
      return null;
    }
  }

  /**
   * Extract key information from HTML (for fallback when server returns parsed content)
   */
  private extractKeyInformationFromHtml(html: string, url: ApprovedUrl): { title: string; content: string } {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    // Get title
    const title = doc.querySelector('title')?.textContent || 
                  doc.querySelector('h1')?.textContent || 
                  url.title;
    
    // Remove scripts, styles, nav, footer
    const removeSelectors = ['script', 'style', 'nav', 'header', 'footer', 'aside', 'iframe', 'noscript', 'form', 'button'];
    for (const selector of removeSelectors) {
      doc.querySelectorAll(selector).forEach(el => el.remove());
    }
    
    // Get main content
    const contentSelectors = ['main', 'article', '.content', '.main-content', '#content', '.container'];
    let contentText = '';
    
    for (const selector of contentSelectors) {
      const element = doc.querySelector(selector);
      if (element) {
        contentText = element.textContent || '';
        break;
      }
    }
    
    if (!contentText) {
      contentText = doc.body?.textContent || '';
    }
    
    // Clean and truncate
    const settings = this.stateService.getCrawlSettings();
    contentText = contentText
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, settings.maxContentLength);
    
    return { title: title.trim(), content: contentText };
  }

  /**
   * Generate search questions for knowledgebase
   */
  private generateQuestions(url: ApprovedUrl, pageTitle: string): string[] {
    const questions: string[] = [];
    
    // Add the page title as a question
    questions.push(pageTitle);
    
    // Generate related questions based on category
    const categoryQuestions: Record<string, string[]> = {
      'Central Government': [
        `central government ${pageTitle}`,
        `${pageTitle} official website`,
        `government of india ${pageTitle}`
      ],
      'Tax & Revenue': [
        `GST ${pageTitle}`,
        `tax ${pageTitle} india`,
        `${pageTitle} filing process`
      ],
      'MSME': [
        `MSME ${pageTitle}`,
        `small business ${pageTitle}`,
        `udyam ${pageTitle}`
      ],
      'Business & Startups': [
        `startup ${pageTitle}`,
        `business registration ${pageTitle}`,
        `${pageTitle} india`
      ],
      'Labour & Employment': [
        `EPF ${pageTitle}`,
        `labour ${pageTitle} india`,
        `employment ${pageTitle}`
      ]
    };
    
    const category = url.category || 'Central Government';
    const specificQuestions = categoryQuestions[category] || categoryQuestions['Central Government'];
    
    questions.push(...specificQuestions.slice(0, 3));
    
    // Add ministry-specific questions
    if (url.ministry) {
      questions.push(`${url.ministry} ${pageTitle}`);
    }
    
    return questions.slice(0, 5); // Max 5 questions per URL
  }

  /**
   * Get current crawl status
   */
  getStatus(): CrawlStatus {
    return this.stateService.getCrawlStatus();
  }

  /**
   * Check if crawler is running
   */
  getIsRunning(): boolean {
    return this.isRunning();
  }

  /**
   * Get crawl settings
   */
  getSettings(): CrawlSettings {
    return this.stateService.getCrawlSettings();
  }

  /**
   * Get crawl history
   */
  getHistory(): CrawlHistoryEntry[] {
    return this.stateService.getCrawlHistory();
  }

  /**
   * Clear crawl history
   */
  clearHistory(): void {
    this.stateService.clearCrawlHistory();
  }

  /**
   * Process pending queries from users
   */
  async processPendingQueries(): Promise<void> {
    const pending = this.stateService.getPendingQueries();
    if (pending.length === 0) {
      console.log('[BackgroundCrawler] No pending queries to process');
      return;
    }

    // Get ENABLED approved URLs only from admin
    const enabledUrls = this.stateService.getApprovedUrls().filter(u => u.enabled);
    if (enabledUrls.length === 0) {
      console.log('[BackgroundCrawler] No enabled crawl URLs - skipping pending');
      return;
    }

    console.log(`[BackgroundCrawler] Processing ${pending.length} pending queries using ${enabledUrls.length} enabled URLs`);
    
    let processed = 0;

    for (const query of pending.slice(0, 10)) { // Limit 10/run
      try {
        // Use keywords for targeted scraping via backend server
        const scrapedResults = await this.webScraper.scrapeByKeywords(query.keywords);
        if (scrapedResults.length === 0) {
          console.log(`[Pending] No keyword matches for "${query.query.substring(0, 50)}..." (keywords: ${query.keywords.slice(0,3).join(', ')})`);
          // Still remove the query to prevent infinite retry
          this.stateService.removePendingQuery(query.id);
          processed++;
          continue;
        }

        // Learn from each relevant result using keyword-based questions
        let itemsAdded = 0;
        for (const result of scrapedResults.slice(0, 3)) {
          const keywordQuestion = query.keywords.join(' ') + '?';
          const contextualQuestion = `${result.ministry || result.domain} ${query.keywords.join(' ')}?`;
          
          // Store with 'crawled' kbSource since these come from admin-approved URLs
          if (this.knowledgebase.learn(keywordQuestion, result.content, query.context, 'ai-response', 'crawled')) {
            itemsAdded++;
          }
          if (this.knowledgebase.learn(contextualQuestion, result.content, query.context, 'ai-response', 'crawled')) {
            itemsAdded++;
          }
          
          // Also store the original user query as a KB entry pointing to this content
          if (this.knowledgebase.learn(query.query, result.content, query.context, 'ai-response', 'crawled')) {
            itemsAdded++;
          }
        }

        console.log(`[Pending] "${query.query.substring(0, 50)}..." → ${itemsAdded} keyword-targeted entries (keywords: ${query.keywords.slice(0,3).join(', ')})`);
        
        // Remove after processing (fixed: was called twice before)
        this.stateService.removePendingQuery(query.id);
        processed++;
        
      } catch (error) {
        console.error(`[Pending] Error processing query: ${error}`);
        // Remove failed queries to prevent infinite retry loops
        this.stateService.removePendingQuery(query.id);
        processed++;
      }
    }

    console.log(`[Pending] Completed ${processed}/${pending.length}`);
  }

  /**
   * Manual process pending trigger
   */
  async processPending(): Promise<void> {
    await this.processPendingQueries();
  }

  /**
   * Manual crawl trigger - for UI buttons
   */
  async crawlNow(): Promise<void> {
    if (this.isRunning()) {
      console.log('[BackgroundCrawler] Crawl already in progress');
      return;
    }
    await this.crawlAllUrls();
  }

  /**
   * Utility: delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

