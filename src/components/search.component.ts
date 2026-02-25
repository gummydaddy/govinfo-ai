import { Component, inject, signal, computed, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../services/state.services.js';
import { DocMetadata } from '../models/interfaces';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-black text-white p-4 sm:p-8 safe-area-top safe-area-bottom overflow-y-auto">
      <div class="max-w-5xl mx-auto">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 sm:mb-10 border-b border-[#D32F2F] pb-4 gap-3">
          <h1 class="text-xl sm:text-3xl font-bold tracking-tight">KNOWLEDGE BASE SEARCH</h1>
          <button 
            (click)="backToChat()" 
            class="text-gray-400 hover:text-white transition-colors text-sm py-2 px-2 min-h-[44px]"
          >
            ← Back to Chat
          </button>
        </div>

        <!-- Search & Filter Bar -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
          <!-- Search Input -->
          <div class="sm:col-span-2 lg:col-span-2">
            <input 
              type="text" 
              [(ngModel)]="query" 
              (ngModelChange)="onQueryChange()"
              placeholder="Search by keywords (e.g., 'subsidy', 'tax', 'license')..."
              class="w-full bg-[#111] border border-gray-700 p-3 text-white focus:border-[#D32F2F] outline-none min-h-[48px] text-base"
            >
          </div>
          
          <!-- Type Filter -->
          <div>
            <select 
              [(ngModel)]="filterType" 
              (ngModelChange)="onQueryChange()"
              class="w-full bg-[#111] border border-gray-700 p-3 text-white focus:border-[#D32F2F] outline-none appearance-none min-h-[48px] text-base"
            >
              <option value="">All Types</option>
              <option value="Policy">Policy</option>
              <option value="Scheme">Scheme</option>
              <option value="Act">Act/Law</option>
              <option value="DPR Template">DPR Template</option>
              <option value="Notification">Notification</option>
            </select>
          </div>
          
          <!-- State Filter -->
          <div>
            <select 
              [(ngModel)]="filterState" 
              (ngModelChange)="onQueryChange()"
              class="w-full bg-[#111] border border-gray-700 p-3 text-white focus:border-[#D32F2F] outline-none appearance-none min-h-[48px] text-base"
            >
              <option value="">All States</option>
              <option value="All">National</option>
              @for (state of stateService.availableStates(); track state) {
                <option [value]="state">{{ state }}</option>
              }
            </select>
          </div>
        </div>

        <!-- Results Count -->
        <div class="text-xs text-gray-500 uppercase tracking-widest mb-4 px-1">
          {{ results().length }} DOCUMENTS FOUND
          @if (query()) {
            <span class="text-[#D32F2F]"> FOR "{{ query() }}"</span>
          }
        </div>

        <!-- Results -->
        <div class="space-y-4">
          @for (doc of results(); track doc.id) {
            <div 
              class="border border-gray-800 bg-[#0a0a0a] p-4 sm:p-6 hover:border-[#D32F2F] transition-colors group cursor-pointer"
              (click)="openDocument(doc)"
            >
              
              <!-- Header Row -->
              <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 gap-2">
                <div class="flex items-center gap-2 flex-wrap">
                  <span class="bg-[#D32F2F] text-white text-[10px] px-2 py-0.5 font-bold uppercase">
                    {{ doc.type }}
                  </span>
                  <span class="text-xs text-gray-400">
                    {{ doc.country }} 
                    @if (doc.state && doc.state !== 'All') {
                      > {{ doc.state }}
                    }
                  </span>
                </div>
                <span class="text-xs text-gray-500">
                  {{ doc.uploadDate | date:'mediumDate' }}
                </span>
              </div>

              <!-- Title -->
              <h3 class="text-base sm:text-lg font-bold text-white mb-2">{{ doc.title }}</h3>
              
              <!-- Ministry -->
              <p class="text-xs text-gray-400 mb-3 sm:mb-4 font-mono uppercase">{{ doc.ministry }}</p>
              
              <!-- Content Snippet -->
              <div class="text-sm text-gray-300 leading-relaxed font-mono border-l-2 border-gray-700 pl-3 sm:pl-4 py-1">
                <div [innerHTML]="getSnippet(doc.content)"></div>
              </div>

              <!-- Tags (if available) -->
              @if (doc.tags && doc.tags.length > 0) {
                <div class="mt-3 flex gap-2 flex-wrap">
                  @for (tag of doc.tags; track tag) {
                    <span class="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">
                      #{{ tag }}
                    </span>
                  }
                </div>
              }
            </div>
          } @empty {
            <div class="text-center py-12 sm:py-20 border border-dashed border-gray-800 text-gray-500 px-4">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" class="mx-auto mb-4 opacity-50">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.3-4.3"/>
              </svg>
              <p class="text-base sm:text-lg">NO DOCUMENTS MATCH YOUR CRITERIA</p>
              <p class="text-sm mt-2">Try adjusting your filters or search terms</p>
            </div>
          }
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
              <div class="p-4 sm:p-6">
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
              <div class="px-4 sm:px-6 py-4 bg-[#111] border-t border-gray-800 flex justify-end">
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
export class SearchComponent {
  stateService = inject(StateService);
  
  query = signal('');
  filterType = signal('');
  filterState = signal('');
  selectedDocument = signal<DocMetadata | null>(null);

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

  results = computed(() => {
    const q = this.query().toLowerCase();
    const type = this.filterType();
    const state = this.filterState();
    
    return this.stateService.documents().filter(doc => {
      const matchesQuery = !q || 
        doc.title.toLowerCase().includes(q) || 
        doc.content.toLowerCase().includes(q) || 
        doc.ministry.toLowerCase().includes(q) ||
        (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(q)));
      
      const matchesType = !type || doc.type === type;
      const matchesState = !state || doc.state === state;
      
      return matchesQuery && matchesType && matchesState;
    });
  });

  onQueryChange() {
    // Trigger recomputation (signals handle this automatically)
  }

  getSnippet(content: string): string {
    const q = this.query().toLowerCase();
    
    if (!q) {
      // No search query, show beginning
      const snippet = content.substring(0, 250);
      return snippet + (content.length > 250 ? '...' : '');
    }
    
    // Find query position
    const index = content.toLowerCase().indexOf(q);
    
    if (index === -1) {
      // Query not found in content (might be in title)
      return content.substring(0, 250) + '...';
    }
    
    // Show context around query
    const start = Math.max(0, index - 80);
    const end = Math.min(content.length, index + 170);
    let snippet = content.substring(start, end);
    
    if (start > 0) snippet = '...' + snippet;
    if (end < content.length) snippet = snippet + '...';
    
    // Highlight query
    const regex = new RegExp(`(${q})`, 'gi');
    snippet = snippet.replace(regex, '<mark class="bg-[#D32F2F] text-white px-1">$1</mark>');
    
    return snippet;
  }

  backToChat() {
    this.stateService.setView('chat');
  }
}
