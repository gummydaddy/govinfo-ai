# Keyword-Based Crawling Implementation
## Status: ✅ Started

### Step 1: Update models/interfaces.ts ✅ COMPLETE
- Renamed `tokens` → `keywords` in PendingQuery interface

### Step 2: Update state.services.ts ✅ COMPLETE
- Renamed `tokens` → `keywords` in `addPendingQuery()`, `tokensMatch` → `keywordsMatch`, `removePendingByTokens` → `removePendingByKeywords`
- Uses `kbService.tokenize()` for keyword extraction

### Step 3: Update background-crawler.service.ts [PENDING]
- In `processPendingQueries()`: use `query.keywords` for `webScraper.scrapeByKeywords(keywords)`
- Adjust `kb.learn()` to use keywords-derived questions

### Step 4: Enhance web-scraper.service.ts [PENDING]
- Add `scrapeByKeywords(keywords: string[])`: keyword search in approvedUrls, extract relevant sections
- Update `generateSearchUrls()` to prioritize keyword matches

### Step 5: Polish ai.services.ts messages [PENDING]
- Update queued message to mention keyword research

### Step 6: Test & Verify [PENDING]
- Add test query → check keywords → verify targeted scrape → KB storage
- Run `ng serve`, test chat pending process

**Next:** Implement Step 1 → update TODO → Step 2...

