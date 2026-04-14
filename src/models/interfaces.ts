// src/models/interfaces.ts

/**
 * User authentication and profile
 */
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  //password: string;
  createdAt: string;
  language?: string;
}

/**
 * Document metadata for government documents in the knowledge base
 */
export interface DocMetadata {
  id: string;
  title: string;
  country: string;
  state: string;
  ministry: string;
  type: 'Policy' | 'Scheme' | 'Act' | 'Notification' | 'DPR Template' | 'Law' | 'Tender' | 'Circular';
  content: string;
  priority: 'High' | 'Medium' | 'Low';
  uploadDate: string;
  validityPeriod?: string;
  sourceAuthority?: string;
  fileUrl?: string;
  tags?: string[];
  officialSource?: boolean;  // True if uploaded via admin panel
}

/**
 * User context for personalized compliance guidance
 */
export interface UserContext {
  country: string;
  state: string;
  sector: string;
  intent: string;
}

/**
 * File attachment for multimodal AI analysis
 */
export interface Attachment {
  name: string;
  mimeType: string;
  data: string; // Base64 encoded
  size?: number;
}

/**
 * Chat message structure
 */
export interface ChatMessage {
  role: 'user' | 'ai' | 'system';
  content: string;
  timestamp: number;
  sources?: GroundingSource[];
  attachments?: Attachment[];
  suggestedActions?: string[];
  fromKnowledgebase?: boolean;      // True if response came from knowledgebase
  knowledgebaseConfidence?: number;  // Confidence score if from knowledgebase
}

/**
 * Grounding source from Google Search/Maps
 */
export interface GroundingSource {
  web?: {
    uri?: string;
    title?: string;
  };
  retrievedContext?: {
    uri?: string;
    title?: string;
  };
}

/**
 * Saved project for session management
 */
export interface SavedProject {
  id: string;
  name: string;
  date: number;
  context: UserContext;
  history: ChatMessage[];
  language?: string;
}

/**
 * DPR (Detailed Project Report) input requirements
 */
export interface DPRInput {
  projectName: string;
  projectType: string;
  capacity?: string;
  location: {
    state: string;
    district: string;
    village?: string;
  };
  landDetails: {
    area: number; // in acres or hectares
    ownershipProof?: Attachment;
    cadMap?: Attachment;
    soilClassification?: string;
  };
  circleRate?: number;
  connectivity?: {
    roadAccess?: boolean;
    railAccess?: boolean;
    portDistance?: number;
    airportDistance?: number;
  };
  utilities?: {
    powerAvailability?: boolean;
    waterSource?: string;
  };
}

/**
 * DPR Output structure
 */
export interface DPROutput {
  id: string;
  projectName: string;
  generatedDate: string;
  executiveSummary: string;
  sections: DPRSection[];
  financials: DPRFinancials;
  siteAnalysis?: string;
  recommendations?: string[];
}

export interface DPRSection {
  title: string;
  content: string;
  order: number;
}

export interface DPRFinancials {
  totalProjectCost: number;
  landCost?: number;
  civilCost?: number;
  machineryC?: number;
  workingCapital?: number;
  breakdown: { [key: string]: number };
}

/**
 * Search filter criteria
 */
export interface SearchFilters {
  keyword?: string;
  country?: string;
  state?: string;
  ministry?: string;
  documentType?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Language configuration
 */
export interface LanguageConfig {
  code: string;
  name: string;
  nativeName: string;
  enabled: boolean;
}

/**
 * Voice chat configuration
 */
export interface VoiceConfig {
  language: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
}

/**
 * Onboarding step
 */
export interface OnboardingStep {
  id: number;
  title: string;
  description: string;
  targetElement?: string;
  action?: string;
}

/**
 * AI Service Response
 */
export interface AIResponse {
  text: string;
  sources?: any[]; // Using any[] to match Gemini API's flexible grounding chunk types
  suggestedActions?: string[];
  error?: string;
  fromKnowledgebase?: boolean;      // True if response came from knowledgebase
  knowledgebaseConfidence?: number;  // Confidence score of knowledgebase match
}

/**
 * Application view states
 */
export type AppView = 
  | 'landing' 
  | 'login' 
  | 'signup' 
  | 'setup' 
  | 'chat' 
  | 'admin' 
  | 'search' 
  | 'onboarding'
  | 'voice-chat';

/**
 * Notification types
 */
export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  timestamp: number;
  duration?: number;
}

/**
 * Knowledgebase entry for instant Q&A retrieval
 */
export interface KnowledgebaseEntry {
  id: string;
  question: string;           // Normalized question
  questionTokens: string[];   // Tokenized for fast matching
  answer: string;             // Cached answer
  context: {                  // Context in which this was learned
    country: string;
    state: string;
    sector: string;
    intent: string;
  };
  usageCount: number;         // How many times used
  lastUsed: number;          // Timestamp
  createdAt: number;         // When learned
  source: 'user-chat' | 'ai-response';
  kbSource: 'official' | 'web' | 'unknown';  // Source type for filtering
}

/**
 * Knowledgebase search result
 */
export interface KnowledgebaseMatch {
  entry: KnowledgebaseEntry;
  confidence: number;         // 0-1 similarity score
}

/**
 * Document extraction result
 */
export interface ExtractionResult {
  success: boolean;
  text: string;
  error?: string;
  metadata?: {
    pageCount?: number;
    language?: string;
    confidence?: number;
    fileType: string;
    fileName: string;
  };
}

/**
 * Web scraping settings
 */
export interface ScrapingSettings {
  enabled: boolean;
  minConfidenceThreshold: number;
  maxResultsPerQuery: number;
  cacheDurationHours: number;
  autoScrapeOnLowConfidence: boolean;
}

/**
 * Approved URL for scraping
 */
export interface ApprovedUrl {
  id: string;
  url: string;
  title: string;
  category: string;
  ministry?: string;
  country: string;
  enabled: boolean;
  addedAt: number;
  lastScraped?: number;
  crawlPriority?: 'high' | 'medium' | 'low';
}

/**
 * Crawl settings for background crawler
 */
export interface CrawlSettings {
  enabled: boolean;
  intervalHours: number;  // 1, 6, 12, 24 hours
  maxPagesPerUrl: number; // Max pages to crawl per URL
  maxContentLength: number; // Max characters per page
  crawlDelayMs: number;   // Delay between requests
}

/**
 * Crawl history entry
 */
export interface CrawlHistoryEntry {
  id: string;
  url: string;
  urlTitle: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: number;
  completedAt?: number;
  pagesCrawled: number;
  itemsIndexed: number;
  error?: string;
}

/**
 * Crawl status
 */
export interface CrawlStatus {
  isRunning: boolean;
  currentUrl: string | null;
  totalUrls: number;
  completedUrls: number;
  lastCrawlTime: number | null;
  nextCrawlTime: number | null;
}

/**
 * Structured information extracted from web content
 */
export interface StructuredInfo {
  eligibility?: string[];
  documentsRequired?: string[];
  fees?: string;
  timeline?: string;
  howToApply?: string;
  forms?: string[];
  links?: { title: string; url: string }[];
  contactInfo?: string;
  importantLinks?: { title: string; url: string }[];
}

/**
 * Scraped content from web
 */
export interface ScrapedContent {
  url: string;
  title: string;
  content: string;
  timestamp: number;
  relevanceScore: number;
  ministry?: string;
  state?: string;
  sourceType: 'knowledgebase' | 'uploaded-doc' | 'web-scraped';
  structuredInfo?: StructuredInfo;
  snippet?: string;
  domain?: string;
}

/**
 * Web search result
 */
export interface WebSearchResult {
  url: string;
  title: string;
  snippet: string;
  relevanceScore: number;
  sourceType: 'knowledgebase' | 'uploaded-doc' | 'web-scraped';
}

/**
 * Enhanced AI response with source attribution
 */
export interface EnhancedAIResponse {
  text: string;
  sources: GroundingSource[];
  suggestedActions?: string[];
  error?: string;
  fromKnowledgebase: boolean;
  knowledgebaseConfidence?: number;
  webResults?: WebSearchResult[];
  responseMetadata?: {
    scrapedContent: boolean;
    topicMatch: string | null;
    processingTimeMs: number;
  };
}

/**
 * Pending query for backend processing
 */
export interface PendingQuery {
  id: string;
  query: string;
  keywords: string[];
  context: UserContext;
  timestamp: number;
}

