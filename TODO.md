# GovInfo AI Restriction Task Progress

## Status: In Progress (0/12 steps complete)

## Approved Plan Steps

### Phase 1: Core Type & Service Updates (4 steps)
- [✓] 1. Update `src/models/interfaces.ts`: Add `kbSource: 'official' | 'web' | 'unknown'` to `KnowledgebaseEntry`, `DocMetadata.officialSource?: boolean`
- [✓] 2. Update `src/services/knowledgebase.service.ts`: Add source filtering in `findMatch()` & `learn()` (only official)
- [✓] 3. Update `src/services/state.services.ts`: Add `getOfficialDocuments()`, mark admin uploads as official
- [✓] 4. Update `src/components/admin.component.ts`: Set `officialSource: true` on upload (via state service)

### Phase 2: AI Service Restriction (3 steps)
- [✓] 5. Update `src/services/ai.services.ts`: `sendMessage()` → check official docs first → no docs = immediate "no official document provided"
- [✓] 6. Update `src/services/ai.services.ts`: Disable web-scraping injection, update system prompt with exact fallback
- [✓] 7. Update `src/services/ai.services.ts`: `checkKnowledgebase()` → filter official-only entries (via KB)

### Phase 3: Disable Non-Official Sources (3 steps)
- [✓] 8. Update `src/services/web-scraper.service.ts`: Disable auto-injection to AI, log only
- [✓] 9. Update `src/services/background-crawler.service.ts`: Don't add web data to KB
- [✓] 10. Update `src/services/ai.services.ts`: Remove `storeScrapedData()`, `sendWithEnhancedContext()` web usage

### Phase 4: UI & Testing (2 steps)
- [✓] 11. Update `src/components/chat.component.ts`: Show "Upload official docs" if no docs (via early return)
- [ ] 12. Test & Verify: Upload doc → related Q ✓, unrelated → fallback msg, no web answers

## Next Action
Step 1: Update interfaces.ts types

## Commands to Run After Completion
```bash
ng serve
# Test: Admin upload doc → chat ask related/unrelated → verify restriction
```

