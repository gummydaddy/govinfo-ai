// Simple Express server for web scraping proxy
// Run this with: node server.js

import express from 'express';
import cors from 'cors';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { writeFileSync, appendFileSync, existsSync, readFileSync } from 'fs';

const app = express();
const PORT = process.env.PORT || 3001;

// Enable CORS for the Angular app - allow localhost for development and production domains
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:4200',
  'https://govinfo-ai.vercel.app',
  'https://govinfo-ai.onrender.com'
];

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Configuration
const CONFIG = {
  REQUEST_TIMEOUT: 20000,
  MAX_CONTENT_LENGTH: 50000,
  USER_AGENT: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  LOG_FILE: 'crawl-server.log'
};

// In-memory log storage for admin panel
let serverLogs = [];

// Logger function
function log(message, type = 'info') {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, message, type };
  
  // Keep last 100 logs in memory
  serverLogs.push(logEntry);
  if (serverLogs.length > 100) {
    serverLogs.shift();
  }
  
  // Also log to console
  console.log(`[${type.toUpperCase()}] ${message}`);
  
  // Write to file
  try {
    const logLine = `${timestamp} [${type.toUpperCase()}] ${message}\n`;
    appendFileSync(CONFIG.LOG_FILE, logLine);
  } catch (e) {
    // Ignore file write errors
  }
}

// Store crawl results in memory (in production, use a database)
let crawlCache = new Map();
let crawlSchedule = null;

// Helper: Extract domain from URL
function extractDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return 'unknown';
  }
}

// Helper: Extract key information from HTML
function extractKeyInformation(html, url) {
  const $ = cheerio.load(html);
  
  // Get title
  const title = $('title').text() || $('h1').first().text() || '';
  
  // Remove unwanted elements
  $('script, style, nav, header, footer, aside, iframe, noscript, form, button').remove();
  
  // Get main content
  const contentSelectors = ['main', 'article', '.content', '.main-content', '#content', '.container', '.body'];
  let contentText = '';
  
  for (const selector of contentSelectors) {
    const element = $(selector);
    if (element.length > 0) {
      contentText = element.text() || '';
      break;
    }
  }
  
  if (!contentText) {
    contentText = $('body').text() || '';
  }
  
  // Clean and truncate
  contentText = contentText
    .replace(/\s+/g, ' ')
    .trim()
    .substring(0, CONFIG.MAX_CONTENT_LENGTH);
  
  return {
    title: title.trim(),
    content: contentText,
    domain: extractDomain(url),
    url: url
  };
}

// API Endpoint: Scrape a single URL
app.get('/api/scrape', async (req, res) => {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }
  
// Check cache first
  const cacheKey = btoa(url).substring(0, 50);
  const cached = crawlCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour cache
    log(`Returning cached result for ${url}`, 'info');
    return res.json(cached.data);
  }
  
  log(`Scraping: ${url}`, 'info');
  
  try {
    const response = await axios.get(url, {
      timeout: CONFIG.REQUEST_TIMEOUT,
      headers: {
        'User-Agent': CONFIG.USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      maxRedirects: 5,
      validateStatus: (status) => status < 500
    });
    
    if (response.status >= 400) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const extractedData = extractKeyInformation(response.data, url);
    
    const result = {
      success: true,
      url: url,
      title: extractedData.title,
      content: extractedData.content,
      domain: extractedData.domain,
      timestamp: Date.now()
    };
    
    // Cache the result
    crawlCache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });
    
    res.json(result);
    
} catch (error) {
    log(`Error scraping ${url}: ${error.message}`, 'error');
    res.status(500).json({
      success: false,
      error: 'Failed to scrape URL',
      message: error.message,
      url: url
    });
  }
});

// API Endpoint: Scrape multiple URLs
app.post('/api/scrape-batch', async (req, res) => {
  const { urls } = req.body;
  
  if (!urls || !Array.isArray(urls)) {
    return res.status(400).json({ error: 'URLs array is required' });
  }
  
  
  const results = [];
  
  for (const url of urls) {
    try {
      const response = await axios.get(url, {
        timeout: CONFIG.REQUEST_TIMEOUT,
        headers: {
          'User-Agent': CONFIG.USER_AGENT,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      
      const extractedData = extractKeyInformation(response.data, url);
      
      results.push({
        success: true,
        url: url,
        title: extractedData.title,
        content: extractedData.content,
        domain: extractedData.domain
      });
      
    } catch (error) {
      results.push({
        success: false,
        url: url,
        error: error.message
      });
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  res.json({ results });
});

// API Endpoint: Get crawl status
app.get('/api/status', (req, res) => {
  res.json({
    status: 'running',
    cacheSize: crawlCache.size,
    uptime: process.uptime()
  });
});

// API Endpoint: Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Handle root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'GovInfo AI Scraping Server', 
    status: 'running',
    timestamp: Date.now()
  });
});

// API Endpoint: Get server logs
app.get('/api/logs', (req, res) => {
  const limit = parseInt(req.query.limit) || 50;
  const logs = serverLogs.slice(-limit);
  res.json({ logs });
});

// API Endpoint: Get log file contents
app.get('/api/logs/file', (req, res) => {
  try {
    if (existsSync(CONFIG.LOG_FILE)) {
      const content = readFileSync(CONFIG.LOG_FILE, 'utf-8');
      const lines = content.split('\n').filter(l => l.trim());
      const limit = parseInt(req.query.limit) || 100;
      res.json({ 
        success: true, 
        logs: lines.slice(-limit).join('\n'),
        totalLines: lines.length
      });
    } else {
      res.json({ success: false, error: 'Log file not found' });
    }
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

// API Endpoint: Clear logs
app.post('/api/logs/clear', (req, res) => {
  serverLogs = [];
  res.json({ success: true, message: 'Logs cleared from memory' });
});

// Start server
app.listen(PORT, () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const serverUrl = isProduction ? 'https://govinfo-ai.onrender.com' : `http://localhost:${PORT}`;
  
  console.log(`
╔══════════════════════════════════════════════════════════════╗
║         GovInfo AI Scraping Server Started                ║
╠══════════════════════════════════════════════════════════════╣
║  Server running on: ${serverUrl}              ║
║                                                            ║
║  Endpoints:                                               ║
║  - GET  /api/scrape?url=<url>     Scrape single URL       ║
║  - POST /api/scrape-batch          Scrape multiple URLs    ║
║  - GET  /api/status                Server status          ║
║  - GET  /api/health                Health check          ║
║                                                            ║
║  Usage from Angular:                                       ║
║  ${serverUrl}/api/scrape?url=https://...       ║
╚══════════════════════════════════════════════════════════════╝
  `);
});

