# Knowledgebase Implementation TODO

## Phase 1: Add Interface
- [ ] Add KnowledgebaseEntry interface to src/models/interfaces.ts

## Phase 2: Create KnowledgebaseService
- [ ] Create src/services/knowledgebase.service.ts
  - Lightweight keyword-based matching (no heavy embeddings)
  - LocalStorage with size limits (max 500 entries)
  - Confidence threshold (0.7 minimum)
  - Only store valid Q&A (no errors)
  - Automatic cleanup of old entries

## Phase 3: Integrate with AiService
- [ ] Update src/services/ai.services.ts
  - Check knowledgebase before calling AI
  - Learn from successful AI responses
  - Add knowledgebase parameter to sendMessage

## Phase 4: Update ChatComponent
- [ ] Update src/components/chat.component.ts
  - Show indicator when response from knowledgebase

## Phase 5: Build & Test
- [ ] Build project to check errors
- [ ] Verify functionality works correctly

