import { ClusteringService } from './clustering.service';
import { KnowledgebaseEntry } from '../models/interfaces';

describe('ClusteringService', () => {
  let service: ClusteringService;

  beforeEach(() => {
    service = new ClusteringService();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fit and transform entries', () => {
    // Create mock entries
    const entries: KnowledgebaseEntry[] = [
      {
        id: '1',
        question: 'What is MSME registration?',
        questionTokens: ['what', 'is', 'msme', 'registration'],
        answer: 'MSME registration is a government process...',
        context: { country: 'India', state: '', sector: '', intent: '' },
        usageCount: 0,
        lastUsed: Date.now(),
        createdAt: Date.now(),
        source: 'ai-response',
        kbSource: 'official'
      },
      {
        id: '2',
        question: 'How to register for MSME?',
        questionTokens: ['how', 'to', 'register', 'for', 'msme'],
        answer: 'To register for MSME, you need to...',
        context: { country: 'India', state: '', sector: '', intent: '' },
        usageCount: 0,
        lastUsed: Date.now(),
        createdAt: Date.now(),
        source: 'ai-response',
        kbSource: 'official'
      },
      {
        id: '3',
        question: 'What are the benefits of solar energy?',
        questionTokens: ['what', 'are', 'the', 'benefits', 'of', 'solar', 'energy'],
        answer: 'Solar energy provides several benefits...',
        context: { country: 'India', state: '', sector: '', intent: '' },
        usageCount: 0,
        lastUsed: Date.now(),
        createdAt: Date.now(),
        source: 'ai-response',
        kbSource: 'official'
      }
    ];

    // Fit the clustering model
    service.fit(entries);
    
    // Check that the model is fitted
    // Note: Since these are private properties, we'll test through public methods
    expect(service['isFitted']).toBeTrue();
    
    // Check that we can get cluster labels
    const label1 = service.getClusterLabel('1');
    const label2 = service.getClusterLabel('2');
    const label3 = service.getClusterLabel('3');
    
    // At least some entries should have cluster labels
    expect(label1 !== null || label2 !== null || label3 !== null).toBeTrue();
    
    // Check stats
    const stats = service.getStats();
    expect(stats.isFitted).toBeTrue();
    expect(stats.totalEntries).toBe(3);
  });

  it('should handle empty entries', () => {
    service.fit([]);
    expect(service.getStats().isFitted).toBeFalse();
  });

  it('should handle single entry', () => {
    const entries: KnowledgebaseEntry[] = [{
      id: '1',
      question: 'What is MSME?',
      questionTokens: ['what', 'is', 'msme'],
      answer: 'MSME stands for...',
      context: { country: 'India', state: '', sector: '', intent: '' },
      usageCount: 0,
      lastUsed: Date.now(),
      createdAt: Date.now(),
      source: 'ai-response',
      kbSource: 'official'
    }];
    
    service.fit(entries);
    expect(service.getStats().isFitted).toBeTrue();
  });
});