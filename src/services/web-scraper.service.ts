import { Injectable, inject, signal } from '@angular/core';
import { StateService } from './state.services.js';

/**
 * Configuration for web scraping behavior - ENHANCED
 */
const SCRAPER_CONFIG = {
  MIN_TOPIC_MATCH_SCORE: 0.3,
  MAX_RESULTS_PER_QUERY: 8,
  CACHE_DURATION_MS: 24 * 60 * 60 * 1000,
  REQUEST_TIMEOUT_MS: 15000,
  MAX_CONTENT_LENGTH: 80000,
  USER_AGENT: 'GovInfoAI/1.0 (Compliance Research Bot)',
  
  // CORS Proxy strategies for browser-based scraping
  CORS_PROXIES: [
    'https://api.allorigins.win/raw?url=',
    'https://corsproxy.io/?',
    'https://api.codetabs.com/v1/proxy?quest='
  ]
};

/**
 * Scraped content result - ENHANCED
 */
export interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  timestamp: number;
  relevanceScore: number;
  ministry?: string;
  state?: string;
  snippet?: string;
  domain?: string;
  structuredInfo?: {
    eligibility?: string[];
    documentsRequired?: string[];
    fees?: string;
    timeline?: string;
    howToApply?: string;
    forms?: string[];
    links?: { title: string; url: string }[];
    contactInfo?: string;
  };
}

/**
 * Keyword-based scraping results - NEW for keyword crawling
 */
export interface KeywordScrapedResult extends ScrapedContent {
  matchedKeywords: string[];
  keywordDensity: number;
}

/**
 * Web search result
 */
export interface WebSearchResult {
  url: string;
  title: string;
  snippet: string;
  relevanceScore: number;
}

/**
 * Scraping statistics
 */
export interface ScraperStats {
  totalScrapes: number;
  cacheHits: number;
  failedScrapes: number;
  totalContentChars: number;
}

@Injectable({
  providedIn: 'root'
})
export class WebScraperService {
  private stateService = inject(StateService);
  
  private contentCache = new Map<string, { data: ScrapedContent; timestamp: number }>();
  
  // Backend server URL for CORS-free scraping
  private readonly SERVER_URL = (typeof window !== 'undefined' && (<any>window)['BACKEND_URL']) 
    ? (<any>window)['BACKEND_URL'] 
    : 'https://govinfo-ai.onrender.com';
  
  readonly stats = signal<ScraperStats>({
    totalScrapes: 0,
    cacheHits: 0,
    failedScrapes: 0,
    totalContentChars: 0
  });

  findRelatedTopic(userQuery: string): { ministry: string; sector: string; matchScore: number } | null {
    const documents = this.stateService.documents();
    const queryLower = userQuery.toLowerCase();
    
    const queryTopics = this.extractTopicsFromQuery(userQuery);
    
    let bestMatch: { ministry: string; sector: string; matchScore: number } | null = null;
    
    for (const doc of documents) {
      const docText = `${doc.title} ${doc.ministry} ${doc.content} ${doc.tags?.join(' ') || ''}`.toLowerCase();
      
      let matchScore = 0;
      
      for (const topic of queryTopics) {
        if (docText.includes(topic)) {
          matchScore += 0.3;
        }
      }
      
      if (doc.ministry) {
        const ministryLower = doc.ministry.toLowerCase();
        for (const topic of queryTopics) {
          if (ministryLower.includes(topic) || topic.includes(ministryLower)) {
            matchScore += 0.4;
          }
        }
      }
      
      if (doc.tags) {
        for (const tag of doc.tags) {
          if (queryTopics.some(t => tag.toLowerCase().includes(t) || t.includes(tag.toLowerCase()))) {
            matchScore += 0.2;
          }
        }
      }
      
      matchScore = Math.min(matchScore, 1);
      
      if (matchScore >= SCRAPER_CONFIG.MIN_TOPIC_MATCH_SCORE) {
        if (!bestMatch || matchScore > bestMatch.matchScore) {
          bestMatch = {
            ministry: doc.ministry,
            sector: doc.ministry,
            matchScore
          };
        }
      }
    }
    
    return bestMatch;
  }

  /**
   * Scrape approved sites for specific keywords - extracts relevant sections only
   */
  async scrapeByKeywords(keywords: string[]): Promise<KeywordScrapedResult[]> {
    if (keywords.length === 0) return [];

    console.log(`[WebScraper] Keyword search for: ${keywords.slice(0,5).join(', ')}...`);
    
    const enabledUrls = this.stateService.getApprovedUrls().filter(u => u.enabled);
    const results: KeywordScrapedResult[] = [];

    for (const url of enabledUrls) {
      // Validate URL before attempting scrape
      if (!url.url.startsWith('http://') && !url.url.startsWith('https://')) {
        console.log(`[WebScraper] Skipping invalid URL (no protocol): ${url.url}`);
        continue;
      }

      try {
        // Use backend server for CORS-free scraping
        const content = await this.scrapeUrlViaBackend(url.url, url.title);
        if (!content) continue;

        // Find keyword matches and extract relevant sections
        const keywordMatches = this.extractKeywordSections(content.content, keywords);
        
        for (const match of keywordMatches.slice(0, 2)) { // Top 2 sections per page
          results.push({
            ...content,
            content: match.excerpt,
            relevanceScore: match.score,
            matchedKeywords: match.matchedKeywords,
            keywordDensity: match.density,
            snippet: `Keywords: ${match.matchedKeywords.join(', ')} - ${match.excerpt.substring(0, 150)}...`
          });
        }
      } catch (error) {
        console.log(`[KeywordScrape] Skipped ${url.url}:`, error);
      }
    }

    // Sort by relevance
    return results.sort((a, b) => b.relevanceScore - a.relevanceScore).slice(0, 8);
  }

  /**
   * Extract sections containing keywords with context
   */
  private extractKeywordSections(content: string, keywords: string[]): { excerpt: string; score: number; matchedKeywords: string[]; density: number; start: number }[] {
    const lowerContent = content.toLowerCase();
    const keywordLower = keywords.map(k => k.toLowerCase());
    const sections: { excerpt: string; score: number; matchedKeywords: string[]; density: number; start: number }[] = [];

    // Split into paragraphs/sections
    const paragraphs = lowerContent.split(/\n\s*\n|\r\n\r\n/).map(p => p.trim()).filter(p => p.length > 100);

    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs[i];
      let score = 0;
      const matched: string[] = [];
      let keywordCount = 0;

      for (const kw of keywordLower) {
        const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\\\$&')}\\b`, 'gi');
        keywordCount += (para.match(regex) || []).length;
        if (keywordCount > 0) matched.push(kw);
      }

      if (matched.length > 0) {
        const density = keywordCount / (para.split(' ').length || 1);
        score = (matched.length / keywordLower.length) * (1 + density * 5);

        sections.push({
          excerpt: paragraphs[i].substring(0, 2000) + (paragraphs[i].length > 2000 ? '\n\n... (truncated for KB storage)' : ''),
          score,
          matchedKeywords: matched,
          density,
          start: i
        });
      }
    }

    // Sort by score, unique-ish
    return sections.sort((a, b) => b.score - a.score).slice(0, 6);
  }

  private extractTopicsFromQuery(query: string): string[] {
    const governmentTopics = [
      'license', 'permit', 'registration', 'subsidy', 'scheme', 'policy',
      'tax', 'gst', 'income tax', 'compliance', 'approval', 'noc',
      'environment', 'factory', 'industry', 'msme', 'startup',
      'land', 'property', 'building', 'construction', 'fire',
      'health', 'food', 'drug', 'pharma', 'education', 'school',
      'transport', 'road', 'highway', 'traffic', 'vehicle',
      'electricity', 'power', 'water', 'sewerage', 'municipal',
      'patent', 'trademark', 'copyright', 'ip', 'intellectual property',
      'export', 'import', 'customs', 'duty',
      'labour', 'employment', 'epf', 'esi', 'bonus',
      'forest', 'wildlife', 'pollution', 'environmental',
      'mining', 'minerals', 'geological', 'oil', 'gas',
      'agriculture', 'farmer', 'farms', 'seed', 'fertilizer',
      'bank', 'finance', 'loan', 'credit', 'investment',
      'digital', 'cyber', 'data', 'privacy', 'information',
      'defense', 'security', 'police', 'civil',
      'company', 'llp', 'partnership', 'society', 'trust',
      'court', 'legal', 'judiciary', 'law',
      'passport', 'visa', 'immigration', 'foreign',
      'ration', 'pds', 'food security', 'nrega', 'mgnrega'
    ];
    
    const queryLower = query.toLowerCase();
    const foundTopics: string[] = [];
    
    for (const topic of governmentTopics) {
      if (queryLower.includes(topic)) {
        foundTopics.push(topic);
      }
    }
    
    const words = queryLower.split(/\s+/).filter(w => w.length > 4);
    for (const word of words) {
      const cleaned = word.replace(/[^a-z]/g, '');
      if (cleaned.length > 4 && !foundTopics.includes(cleaned)) {
        foundTopics.push(cleaned);
      }
    }
    
    return foundTopics.slice(0, 5);
  }

  async searchAndScrape(userQuery: string): Promise<ScrapedContent[]> {
    const relatedTopic = this.findRelatedTopic(userQuery);
    
    if (!relatedTopic) {
      console.log('[WebScraper] No related topic found in knowledgebase - skipping scrape');
      return [];
    }
    
    console.log(`[WebScraper] Related topic found: ${relatedTopic.ministry} (score: ${relatedTopic.matchScore.toFixed(2)})`);
    
    const searchUrls = this.generateSearchUrls(userQuery, relatedTopic);
    
    const results: ScrapedContent[] = [];
    
    for (const urlInfo of searchUrls.slice(0, SCRAPER_CONFIG.MAX_RESULTS_PER_QUERY)) {
      // Validate URL before attempting scrape
      if (!urlInfo.url.startsWith('http://') && !urlInfo.url.startsWith('https://')) {
        console.log(`[WebScraper] Skipping invalid URL (no protocol): ${urlInfo.url}`);
        continue;
      }

      try {
        const content = await this.scrapeUrl(urlInfo.url, urlInfo.title);
        if (content) {
          results.push({
            ...content,
            relevanceScore: urlInfo.relevance,
            ministry: relatedTopic.ministry,
            domain: this.extractDomain(urlInfo.url)
          });
        }
      } catch (error) {
        console.error(`[WebScraper] Failed to scrape ${urlInfo.url}:`, error);
        this.stats.update(s => ({ ...s, failedScrapes: s.failedScrapes + 1 }));
      }
    }
    
    this.stats.update(s => ({ ...s, totalScrapes: s.totalScrapes + results.length }));
    
    return results;
  }

  private extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname.replace('www.', '');
    } catch {
      return 'unknown';
    }
  }

  private generateSearchUrls(
    query: string, 
    relatedTopic: { ministry: string; sector: string }
  ): { url: string; title: string; relevance: number }[] {
    const urls: { url: string; title: string; relevance: number }[] = [];
    const queryLower = query.toLowerCase();
    const topicLower = relatedTopic.ministry.toLowerCase();
    
    // Enhanced government portal URLs
    const governmentPortals = [
      'https://www.india.gov.in',
      'https://www.mygov.in',
      'https://services.india.gov.in',
      'https://digitalindia.gov.in',
      'startupindia.gov.in',
      'www.makeinindia.com',
      'www.msme.gov.in',
      'www.dpiit.nic.in',
      'www.meti.gov.in',
      'www.mha.gov.in',
      'www.mowr.gov.in',
      'www.mnre.gov.in',
      'www.fpi.gov.in',
      'www.pharmaceuticals.gov.in',
      'www.mahaonline.gov.in',
      'www.maharashtra.gov.in',
      'invest.maharashtra.gov.in',
      'www.delhigovt.nic.in',
      'www.karnataka.gov.in',
      'www.udyamregistration.gov.in',
      'www.gst.gov.in',
      'www.incometax.gov.in',
      'www.epfindia.gov.in',
      'www.esic.gov.in',
      'niti.gov.in',
      'www.sebi.gov.in',
      'www.rbi.org.in',
      'www.irdai.gov.in',
      'www.business.gov.in',
      'www.indianembassy.gov.in',
      'www.dgft.gov.in',
      'www.cbic.gov.in',
      'www.mca.gov.in',
      'www.nclt.gov.in',
      'www.consumerhelpline.gov.in'
    ];

    for (const portal of governmentPortals) {
      let relevance = 0.5;
      
      if (portal.includes('msme') && (queryLower.includes('msme') || topicLower.includes('msme'))) {
        relevance = 0.9;
      } else if (portal.includes('startup') && (queryLower.includes('startup') || topicLower.includes('startup'))) {
        relevance = 0.9;
      } else if (portal.includes('gst') && queryLower.includes('gst')) {
        relevance = 0.9;
      } else if (portal.includes('udyam') && (queryLower.includes('udyam') || queryLower.includes('registration'))) {
        relevance = 0.9;
      } else if (portal.includes('ministry') || portal.includes('gov.in')) {
        relevance = 0.6;
      }
      
      urls.push({
        url: portal,
        title: this.getPortalTitle(portal),
        relevance
      });
    }

    // NOTE: Direct search engine URLs (Google/Bing) are removed because they block 
    // browser-based requests via CORS. The AI will provide responses based on its 
    // training data and knowledgebase instead.
    
    return urls.sort((a, b) => b.relevance - a.relevance);
  }

  private getPortalTitle(url: string): string {
    const titles: Record<string, string> = {
      'www.india.gov.in': 'National Portal of India',
      'www.mygov.in': 'MyGov',
      'services.india.gov.in': 'Government Services Portal',
      'digitalindia.gov.in': 'Digital India',
      'startupindia.gov.in': 'Startup India',
      'www.makeinindia.com': 'Make in India',
      'www.msme.gov.in': 'MSME Ministry',
      'www.dpiit.gov.in': 'DPIIT',
      'www.gst.gov.in': 'GST Portal',
      'www.incometax.gov.in': 'Income Tax',
      'udyamregistration.gov.in': 'Udyam Registration',
      'www.business.gov.in': 'Business Portal India',
      'www.dgft.gov.in': 'Directorate General of Foreign Trade',
      'www.cbic.gov.in': 'Central Board of Indirect Taxes',
      'www.mca.gov.in': 'Ministry of Corporate Affairs',
      'www.nclt.gov.in': 'National Company Law Tribunal',
      'www.consumerhelpline.gov.in': 'Consumer Helpline'
    };

    for (const [domain, title] of Object.entries(titles)) {
      if (url.includes(domain)) {
        return title;
      }
    }

    return url.replace('https://', '').replace('www.', '');
  }

  private async scrapeUrl(url: string, title: string): Promise<ScrapedContent | null> {
    const cacheKey = this.getCacheKey(url);
    const cached = this.contentCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < SCRAPER_CONFIG.CACHE_DURATION_MS) {
      this.stats.update(s => ({ ...s, cacheHits: s.cacheHits + 1 }));
      return cached.data;
    }

    const settings = this.stateService.getScrapingSettings();
    if (!settings.enabled) {
      console.log('[WebScraper] Web scraping is disabled in settings');
      return null;
    }

    // Try direct fetch first
    let result = await this.tryFetchWithCorsProxy(url, title, 0);
    
    // If direct fails, try CORS proxies
    if (!result) {
      for (let i = 0; i < SCRAPER_CONFIG.CORS_PROXIES.length; i++) {
        result = await this.tryFetchWithCorsProxy(url, title, i);
        if (result) break;
      }
    }

    if (result) {
      // Extract structured info and snippet
      result.structuredInfo = this.extractStructuredInfo(result.content, url);
      result.snippet = this.generateSnippet(result.content);
      
      this.contentCache.set(cacheKey, {
        data: result,
        timestamp: Date.now()
      });

      this.stats.update(s => ({
        ...s,
        totalContentChars: s.totalContentChars + result.content.length
      }));

      return result;
    }

    // Return enhanced placeholder with useful info
    return {
      url,
      title,
      content: this.generateEnhancedSearchHint(url, title),
      timestamp: Date.now(),
      relevanceScore: 0.3,
      domain: this.extractDomain(url),
      snippet: `Click to view ${title} - Official government portal for more information.`,
      structuredInfo: {
        howToApply: `Visit ${this.extractDomain(url)} for detailed application process.`,
        links: [{ title: `Open ${title}`, url: url }]
      }
    };
  }

  private async tryFetchWithCorsProxy(url: string, title: string, proxyIndex: number): Promise<ScrapedContent | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), SCRAPER_CONFIG.REQUEST_TIMEOUT_MS);

      let fetchUrl = url;
      if (proxyIndex > 0) {
        fetchUrl = SCRAPER_CONFIG.CORS_PROXIES[proxyIndex - 1] + encodeURIComponent(url);
      }

      const response = await fetch(fetchUrl, {
        method: 'GET',
        headers: {
          'User-Agent': SCRAPER_CONFIG.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const text = await response.text();
      const content = this.extractContentFromHtml(text, url);
      
      if (content) {
        return {
          url,
          title: content.title || title,
          content: content.text,
          timestamp: Date.now(),
          relevanceScore: 0.5
        };
      }
    } catch (error) {
      console.log(`[WebScraper] Fetch attempt ${proxyIndex + 1} failed for ${url}:`, error);
    }
    return null;
  }

  private extractStructuredInfo(content: string, url: string): ScrapedContent['structuredInfo'] {
    const info: ScrapedContent['structuredInfo'] = {};
    const contentLower = content.toLowerCase();
    
    // Extract eligibility criteria
    const eligibilityPatterns = [
      /eligibility[:\s]+([^\n.]+)/gi,
      /who can apply[:\s]+([^\n.]+)/gi,
      /qualification[:\s]+([^\n.]+)/gi,
      /eligible[:\s]+([^\n.]+)/gi
    ];
    
    const eligibility: string[] = [];
    for (const pattern of eligibilityPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(m => {
          const cleaned = m.replace(/^(eligibility|who can apply|qualification|eligible)[:\s]+/i, '').trim();
          if (cleaned.length > 10 && cleaned.length < 200) {
            eligibility.push(cleaned);
          }
        });
      }
    }
    if (eligibility.length > 0) {
      info.eligibility = [...new Set(eligibility)].slice(0, 5);
    }
    
    // Extract documents required
    const docPatterns = [
      /documents? (required|needed)[:\s]+([^\n.]+)/gi,
      /required documents?[:\s]+([^\n.]+)/gi,
      /list of documents[:\s]+([^\n.]+)/gi
    ];
    
    const documents: string[] = [];
    for (const pattern of docPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        matches.forEach(m => {
          const cleaned = m.replace(/^(documents? (required|needed)|required documents?|list of documents)[:\s]+/i, '').trim();
          if (cleaned.length > 5 && cleaned.length < 150) {
            documents.push(cleaned);
          }
        });
      }
    }
    if (documents.length > 0) {
      info.documentsRequired = [...new Set(documents)].slice(0, 6);
    }
    
    // Extract fees
    const feePatterns = [
      /fee[:\s]+(?:Rs\.?|INR)?\s*[\d,]+/gi,
      /charges?[:\s]+(?:Rs\.?|INR)?\s*[\d,]+/gi,
      /cost[:\s]+(?:Rs\.?|INR)?\s*[\d,]+/gi,
      /₹\s*[\d,]+/g
    ];
    
    const fees: string[] = [];
    for (const pattern of feePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        fees.push(...matches);
      }
    }
    if (fees.length > 0) {
      info.fees = [...new Set(fees)].slice(0, 3).join(' | ');
    }
    
    // Extract timeline
    const timelinePatterns = [
      /processing time[:\s]+([^\n.]+)/gi,
      /time period[:\s]+([^\n.]+)/gi,
      /within[:\s]+(\d+\s*(days?|weeks?|months?))/gi,
      /(\d+\s*(days?|weeks?|months?)) (for processing|to process)/gi
    ];
    
    const timelines: string[] = [];
    for (const pattern of timelinePatterns) {
      const matches = content.match(pattern);
      if (matches) {
        timelines.push(...matches);
      }
    }
    if (timelines.length > 0) {
      info.timeline = [...new Set(timelines)].slice(0, 2).join(' | ');
    }
    
    // Extract how to apply
    if (contentLower.includes('how to apply') || contentLower.includes('application process')) {
      const applySection = content.match(/(how to apply|application process)[:\s]+([^\n]{50,300})/i);
      if (applySection && applySection[2]) {
        info.howToApply = applySection[2].trim();
      }
    }
    
    return info;
  }

  private generateSnippet(content: string): string {
    const paragraphs = content.split(/\n\n+/).filter(p => p.length > 50);
    if (paragraphs.length > 0) {
      const firstPara = paragraphs[0].replace(/\s+/g, ' ').trim();
      return firstPara.substring(0, 200) + (firstPara.length > 200 ? '...' : '');
    }
    return content.substring(0, 200) + '...';
  }

  private extractContentFromHtml(html: string, url: string): { title: string; text: string } | null {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const title = doc.querySelector('title')?.textContent || 
                    doc.querySelector('h1')?.textContent || 
                    '';
      
      const removeSelectors = ['script', 'style', 'nav', 'header', 'footer', 'aside', 'iframe', 'noscript', 'form', 'button', 'input'];
      for (const selector of removeSelectors) {
        doc.querySelectorAll(selector).forEach(el => el.remove());
      }
      
      const contentSelectors = ['main', 'article', '.content', '.main-content', '#content', '.container', '.body', '.page-content'];
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
      
      contentText = contentText
        .replace(/\s+/g, ' ')
        .trim()
        .substring(0, SCRAPER_CONFIG.MAX_CONTENT_LENGTH);
      
      return {
        title: title.trim(),
        text: contentText
      };
    } catch (error) {
      console.error('[WebScraper] Error parsing HTML:', error);
      return null;
    }
  }

  private generateEnhancedSearchHint(url: string, title: string): string {
    const domain = this.extractDomain(url);
    return `📋 **${title}**

🌐 **Source:** ${domain}

⚠️ Due to browser security restrictions, direct access to this government portal is not possible from this application.

✅ **What you can do:**
1. Click the link below to open ${title} in a new tab
2. Look for sections on: Eligibility, Documents Required, Fees, Timeline, How to Apply
3. Most government portals have dedicated pages for each scheme/license

🔗 **Direct Link:** ${url}

The AI will provide guidance based on general knowledge of this topic. For official and current information, please visit the source directly.`;
  }

  private getCacheKey(url: string): string {
    return btoa(url).replace(/[^a-zA-Z0-9]/g, '').substring(0, 50);
  }

  clearCache(): void {
    this.contentCache.clear();
    console.log('[WebScraper] Cache cleared');
  }

  /**
   * Scrape URL via the backend server (bypasses CORS)
   * Used by keyword scraping and background crawler
   */
  private async scrapeUrlViaBackend(url: string, title: string): Promise<ScrapedContent | null> {
    // Check cache first
    const cacheKey = this.getCacheKey(url);
    const cached = this.contentCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < SCRAPER_CONFIG.CACHE_DURATION_MS) {
      this.stats.update(s => ({ ...s, cacheHits: s.cacheHits + 1 }));
      return cached.data;
    }

    try {
      const scrapeUrl = `${this.SERVER_URL}/api/scrape?url=${encodeURIComponent(url)}`;
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout

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
        const result: ScrapedContent = {
          url,
          title: data.title || title,
          content: data.content,
          timestamp: Date.now(),
          relevanceScore: 0.6,
          domain: data.domain || this.extractDomain(url),
          ministry: undefined,
          snippet: data.content.substring(0, 200) + '...'
        };

        // Extract structured info from the content
        result.structuredInfo = this.extractStructuredInfo(result.content, url);

        // Cache the result
        this.contentCache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });

        this.stats.update(s => ({
          ...s,
          totalScrapes: s.totalScrapes + 1,
          totalContentChars: s.totalContentChars + result.content.length
        }));

        return result;
      }
      
      return null;
    } catch (error) {
      console.error(`[WebScraper] Backend scrape failed for ${url}:`, error);
      this.stats.update(s => ({ ...s, failedScrapes: s.failedScrapes + 1 }));
      return null;
    }
  }

  getStats(): ScraperStats {
    return this.stats();
  }

  shouldScrapeWeb(userQuery: string, knowledgebaseConfidence: number | undefined): boolean {
    if (knowledgebaseConfidence && knowledgebaseConfidence >= 0.85) {
      return false;
    }

    const relatedTopic = this.findRelatedTopic(userQuery);
    if (!relatedTopic) {
      return false;
    }

    const latestPatterns = ['latest', '2024', '2025', 'new', 'updated', 'recent', 'current'];
    const queryLower = userQuery.toLowerCase();
    
    if (latestPatterns.some(pattern => queryLower.includes(pattern))) {
      return true;
    }

    const procedurePatterns = ['form', 'download', 'apply', 'process', 'procedure', 'how to'];
    if (procedurePatterns.some(pattern => queryLower.includes(pattern))) {
      return true;
    }

    if (knowledgebaseConfidence && knowledgebaseConfidence >= 0.5 && knowledgebaseConfidence < 0.85) {
      return true;
    }

    return false;
  }
}

