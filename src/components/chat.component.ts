// src/components/chat.component.ts

import { Component, inject, signal, ElementRef, ViewChild, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../services/state.services.js';
import { AiService } from '../services/ai.services.js';
import { VoiceService } from '../services/voice.service';
import { LanguageService } from '../services/language.service';
import { Attachment } from '../models/interfaces';
import { MarkdownPipe } from '../pipes/markdown.pipe';

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule, MarkdownPipe],
  template: `
    <div class="flex h-screen bg-black text-white overflow-hidden">
      
      <!-- LEFT SIDEBAR: Projects & History -->
      <div class="w-72 border-r border-[#D32F2F] flex flex-col hidden md:flex bg-[#050505]">
        
        <!-- Active Session Info -->
        <div class="p-4 border-b border-[#D32F2F]">
          <h2 class="font-bold tracking-wider text-xs text-[#D32F2F] mb-2">ACTIVE SESSION</h2>
          <div class="text-sm font-medium">{{ stateService.userContext().intent }}</div>
          <div class="text-xs text-gray-500">
            {{ stateService.userContext().state || 'National' }} • {{ stateService.userContext().sector }}
          </div>
        </div>

        <!-- Saved Projects List -->
        <div class="flex-1 overflow-y-auto p-4 space-y-4">
          <div class="flex justify-between items-center mb-2">
            <div class="text-xs text-gray-500 uppercase tracking-widest">SAVED PROJECTS</div>
          </div>
           
          @for (proj of stateService.savedProjects(); track proj.id) {
            <div 
              class="group relative p-3 border border-gray-800 bg-black text-xs hover:border-gray-600 transition-colors cursor-pointer" 
              (click)="loadProject(proj)"
            >
              <div class="font-bold text-gray-300 mb-1">{{ proj.name }}</div>
              <div class="text-gray-600 flex justify-between items-center">
                <span>{{ proj.date | date:'shortDate' }}</span>
                <button 
                  (click)="deleteProject($event, proj.id)"
                  class="text-red-900 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  DEL
                </button>
              </div>
            </div>
          }
           
          @if (stateService.savedProjects().length === 0) {
            <div class="text-gray-700 text-xs italic">No saved projects yet.</div>
          }
        </div>

        <!-- Actions -->
        <div class="p-4 border-t border-[#D32F2F] space-y-2">
          <button 
            (click)="showSaveModal = true" 
            class="w-full py-2 border border-gray-700 text-xs hover:bg-white hover:text-black transition-colors font-bold"
          >
            💾 SAVE CURRENT PROJECT
          </button>
          <button 
            (click)="resetSession()" 
            class="w-full py-2 border border-gray-700 text-xs hover:bg-[#D32F2F] hover:border-[#D32F2F] transition-colors"
          >
            🔄 START NEW
          </button>
        </div>
      </div>

      <!-- MAIN CHAT AREA -->
      <div class="flex-1 flex flex-col relative">
        
        <!-- Context Header -->
        <div class="bg-black border-b border-[#D32F2F] p-4 flex justify-between items-center z-10 shadow-lg shadow-red-900/5">
          <div class="flex items-center space-x-6 text-sm">
            <div class="hidden lg:block">
              <span class="block text-xs text-[#D32F2F] font-bold uppercase">Jurisdiction</span>
              <span>{{ stateService.userContext().country }} / {{ stateService.userContext().state || 'All' }}</span>
            </div>
            <div class="hidden lg:block">
              <span class="block text-xs text-[#D32F2F] font-bold uppercase">Sector</span>
              <span>{{ stateService.userContext().sector }}</span>
            </div>
          </div>
          
          <div class="flex items-center gap-4">
            <!-- Knowledgebase Stats (for admin) -->
            @if (stateService.currentUser()?.role === 'admin' && knowledgebaseStats()) {
              <div class="text-xs text-gray-500 hidden lg:block">
                🧠 KB: {{ knowledgebaseStats()?.totalEntries }} entries | 
                <span class="text-green-500">✓ {{ knowledgebaseStats()?.hits }}</span> / 
                <span class="text-red-500">✗ {{ knowledgebaseStats()?.misses }}</span>
              </div>
            }
            
            <!-- Voice Toggle -->
            <button 
              (click)="toggleVoiceMode()"
              class="flex items-center gap-2 text-xs border px-3 py-1"
              [class.border-[#D32F2F]]="voiceMode()"
              [class.bg-[#D32F2F]]="voiceMode()"
              [class.border-gray-700]="!voiceMode()"
            >
              @if (voiceMode()) {
                🎤 VOICE ON
              } @else {
                🎤 VOICE OFF
              }
            </button>

            <button 
              (click)="goToSearch()" 
              class="flex items-center gap-2 text-xs border border-gray-700 px-3 py-1 hover:border-[#D32F2F]"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.3-4.3"/>
              </svg>
              DOC SEARCH
            </button>
            
            @if (stateService.currentUser()?.role === 'admin') {
              <button 
                (click)="openAdmin()" 
                class="text-xs text-gray-500 hover:text-white underline"
              >
                Admin
              </button>
            }
          </div>
        </div>

        <!-- Messages Container -->
        <div #scrollContainer class="flex-1 overflow-y-auto p-6 space-y-8 pb-40">
          
          <!-- Welcome Message -->
          <div class="flex flex-col items-start max-w-3xl">
            <div class="text-xs text-[#D32F2F] mb-1 font-bold">GOVINFO AI</div>
            <div class="bg-black border border-[#D32F2F] p-6 text-sm leading-relaxed shadow-[0_0_15px_rgba(211,47,47,0.1)]">
              <p>Context locked: <strong>{{ stateService.userContext().intent }}</strong>.</p>
              <p class="mt-2">I have access to verified government documents for {{ stateService.userContext().state || 'India' }}. Ask me about compliance, licenses, schemes, or setup procedures.</p>
              <p class="mt-2 text-gray-400">
                <strong>💡 Features:</strong> Upload documents for analysis, generate DPRs with CAD maps, or enable live search for real-time data.
              </p>
              <p class="mt-2 text-xs text-green-500">
                🧠 Smart Cache: Repeated questions are answered instantly without API calls.
              </p>
            </div>
          </div>

          <!-- Chat Messages -->
          @for (msg of stateService.chatHistory(); track msg.timestamp) {
            
            <!-- User Message -->
            @if (msg.role === 'user') {
              <div class="flex flex-col items-end w-full">
                <div class="text-xs text-gray-500 mb-1 mr-1">YOU</div>
                <div class="bg-white text-black border border-[#D32F2F] p-4 max-w-2xl text-sm font-medium">
                  {{ msg.content }}
                  
                  @if (msg.attachments && msg.attachments.length > 0) {
                    <div class="mt-2 pt-2 border-t border-gray-300">
                      @for (att of msg.attachments; track att.name) {
                        <div class="flex items-center gap-2 text-xs text-gray-600 bg-gray-100 p-1 rounded mb-1">
                          <span>📎</span> {{ att.name }}
                        </div>
                      }
                    </div>
                  }
                </div>
              </div>
            }
            
            <!-- AI Message -->
            @if (msg.role === 'ai') {
              <div class="flex flex-col items-start w-full">
                <div class="text-xs text-[#D32F2F] mb-1 ml-1 font-bold flex items-center gap-2">
                  GOVINFO AI
                  @if (msg.fromKnowledgebase && msg.knowledgebaseConfidence) {
                    <span class="bg-green-900 text-green-300 text-[10px] px-2 py-0.5 rounded-full border border-green-700">
                      ⚡ CACHED ({{ (msg.knowledgebaseConfidence * 100).toFixed(0) }}%)
                    </span>
                  }
                </div>
                <div class="bg-black text-white border border-[#D32F2F] p-6 max-w-3xl text-sm leading-relaxed shadow-[0_0_15px_rgba(211,47,47,0.1)]"
                     [class.border-green-800]="msg.fromKnowledgebase">
                  <div [innerHTML]="msg.content | markdown"></div>

                  <!-- Grounding Sources -->
                  @if (msg.sources && msg.sources.length > 0) {
                    <div class="mt-4 pt-4 border-t border-gray-800">
                      <div class="text-xs text-[#D32F2F] font-bold mb-2">📍 LIVE SOURCES</div>
                      <div class="grid gap-2">
                        @for (source of msg.sources; track $index) {
                          <a 
                            [href]="source.web?.uri || source.retrievedContext?.uri || '#'" 
                            target="_blank" 
                            class="block bg-[#111] p-2 text-xs text-gray-300 hover:text-white hover:bg-gray-800 border border-gray-800 flex items-center gap-2"
                          >
                            <span>🔗</span> {{ source.web?.title || source.retrievedContext?.title || 'External Source' }}
                          </a>
                        }
                      </div>
                    </div>
                  }
                  
                  <!-- Suggested Actions -->
                  @if (msg.suggestedActions && msg.suggestedActions.length > 0) {
                    <div class="mt-5 pt-3 border-t border-gray-800 animate-fadeIn">
                      <div class="text-[10px] text-gray-500 uppercase tracking-widest mb-2">
                        💡 SUGGESTED NEXT STEPS
                      </div>
                      <div class="flex flex-wrap gap-2">
                        @for (action of msg.suggestedActions; track action) {
                          <button 
                            (click)="runAction(action)"
                            class="text-xs bg-[#111] border border-gray-700 text-gray-300 px-3 py-2 hover:border-[#D32F2F] hover:text-white hover:bg-[#1a1a1a] transition-all text-left"
                          >
                            {{ action }}
                          </button>
                        }
                      </div>
                    </div>
                  }
                </div>
              </div>
            }
          }

          <!-- Thinking Indicator -->
          @if (isThinking()) {
            <div class="flex flex-col items-start w-full animate-pulse">
              <div class="text-xs text-[#D32F2F] mb-1 ml-1 font-bold">GOVINFO AI</div>
              <div class="bg-black border border-[#D32F2F] p-4 w-auto min-w-64">
                <div class="h-2 bg-gray-800 w-3/4 mb-2"></div>
                <div class="h-2 bg-gray-800 w-1/2"></div>
                <div class="mt-2 text-xs text-[#D32F2F] font-mono">
                  🤖 {{ getActiveProviderDisplay() }}
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Input Area -->
        <div class="absolute bottom-0 left-0 right-0 bg-black p-6 border-t border-[#D32F2F]">
          <div class="max-w-4xl mx-auto">
            
            <!-- Mode Toggle & File Preview -->
            <div class="flex justify-between items-end mb-2">
              <div class="flex items-center gap-4">
                <!-- Live Search Toggle -->
                <label class="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    [(ngModel)]="useLiveSearch" 
                    class="accent-[#D32F2F] w-4 h-4"
                  >
                  <span class="text-xs text-gray-400 select-none hover:text-white">
                    🌐 Enable Live Maps & Web Search
                  </span>
                </label>
              </div>
              
              <!-- Attached Files Preview -->
              @if (currentAttachments.length > 0) {
                <div class="flex gap-2">
                  @for (att of currentAttachments; track att.name) {
                    <div class="flex items-center gap-1 bg-[#222] border border-gray-700 px-2 py-1 text-xs text-white">
                      <span>📄</span> {{ att.name }}
                      <button 
                        (click)="removeAttachment($index)" 
                        class="text-gray-500 hover:text-red-500 ml-1"
                      >
                        ×
                      </button>
                    </div>
                  }
                </div>
              }
            </div>

            <!-- Voice Transcript Display -->
            @if (voiceMode() && (voiceService.transcript() || voiceService.interimTranscript())) {
              <div class="mb-2 p-3 bg-[#111] border border-gray-700 rounded">
                <div class="text-xs text-gray-400 mb-1">Voice Transcript:</div>
                <div class="text-sm text-white">
                  {{ voiceService.transcript() }}
                  @if (voiceService.interimTranscript()) {
                    <span class="text-gray-500">{{ voiceService.interimTranscript() }}</span>
                  }
                </div>
              </div>
            }

            <!-- Input Row -->
            <div class="flex gap-4">
              
              <!-- File Upload Button -->
              <button 
                (click)="fileInput.click()" 
                class="bg-[#111] border border-gray-700 text-gray-400 px-4 hover:text-white hover:border-gray-500 transition-colors" 
                title="Upload Document/Image"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/>
                </svg>
              </button>
              <input 
                #fileInput 
                type="file" 
                (change)="onFileSelected($event)" 
                class="hidden" 
                accept=".pdf,.jpg,.jpeg,.png,.txt,.docx,.doc"
              >

              <!-- Voice Button (if voice mode) -->
              @if (voiceMode()) {
                <button 
                  (click)="toggleListening()"
                  class="px-4 border transition-colors"
                  [class.bg-[#D32F2F]]="voiceService.isListening()"
                  [class.border-[#D32F2F]]="voiceService.isListening()"
                  [class.animate-pulse]="voiceService.isListening()"
                  [class.bg-[#111]]="!voiceService.isListening()"
                  [class.border-gray-700]="!voiceService.isListening()"
                >
                  @if (voiceService.isListening()) {
                    🎤 LISTENING...
                  } @else {
                    🎤 SPEAK
                  }
                </button>
              }

              <!-- Text Input -->
              <input 
                type="text" 
                [(ngModel)]="userInput" 
                (keydown.enter)="sendMessage()"
                [placeholder]="voiceMode() ? 'Speak or type your question...' : 'Type query or ask to create DPR (requires land details & CAD map)...'"
                class="flex-1 bg-[#111] border border-gray-700 text-white p-4 focus:border-[#D32F2F] focus:outline-none placeholder-gray-600"
                [disabled]="isThinking()"
              >

              <!-- Send Button -->
              <button 
                (click)="sendMessage()"
                [disabled]="isThinking() || (!userInput.trim() && currentAttachments.length === 0 && !voiceService.transcript())"
                class="bg-[#D32F2F] text-white px-8 font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                SEND
              </button>
            </div>
          </div>
        </div>

      </div>

      <!-- Save Project Modal -->
      @if (showSaveModal) {
        <div class="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div class="bg-black border border-[#D32F2F] p-8 w-96 max-w-full">
            <h3 class="text-xl font-bold mb-4">Save Project</h3>
            <input 
              type="text" 
              [(ngModel)]="newProjectName" 
              placeholder="Enter Project Name" 
              class="w-full bg-[#111] border border-gray-700 p-3 text-white mb-6 focus:border-[#D32F2F] outline-none"
            >
            <div class="flex justify-end gap-3">
              <button 
                (click)="showSaveModal = false" 
                class="px-4 py-2 text-sm text-gray-400 hover:text-white"
              >
                CANCEL
              </button>
              <button 
                (click)="saveProject()" 
                class="px-6 py-2 bg-[#D32F2F] text-white font-bold hover:bg-red-700"
              >
                SAVE
              </button>
            </div>
          </div>
        </div>
      }
    </div>
  `
})
export class ChatComponent {
  stateService = inject(StateService);
  aiService = inject(AiService);
  voiceService = inject(VoiceService);
  languageService = inject(LanguageService);
  
  userInput = '';
  isThinking = signal(false);
  useLiveSearch = false;
  voiceMode = signal(false);
  
  showSaveModal = false;
  newProjectName = '';
  
  currentAttachments: Attachment[] = [];
  
  // Knowledgebase stats signal
  knowledgebaseStats = signal<{ totalEntries: number; storageSizeKB: number; hits: number; misses: number } | null>(null);
  
  @ViewChild('scrollContainer') scrollContainer!: ElementRef;

  constructor() {
    // Auto-scroll on new messages
    effect(() => {
      const history = this.stateService.chatHistory();
      setTimeout(() => this.scrollToBottom(), 100);
    });

    // Load knowledgebase stats
    this.loadKnowledgebaseStats();
  }

  loadKnowledgebaseStats() {
    const stats = this.aiService.getKnowledgebaseStats();
    this.knowledgebaseStats.set(stats);
  }

  scrollToBottom() {
    if (this.scrollContainer) {
      this.scrollContainer.nativeElement.scrollTop = 
        this.scrollContainer.nativeElement.scrollHeight;
    }
  }

  // Voice Methods
  toggleVoiceMode() {
    this.voiceMode.update(v => !v);
    
    if (!this.voiceMode()) {
      // Stop listening if turning off
      this.voiceService.stopListening();
    } else {
      this.stateService.addNotification({
        type: 'info',
        message: 'Voice mode enabled. Click SPEAK to start.',
        duration: 3000
      });
    }
  }

  toggleListening() {
    if (this.voiceService.isListening()) {
      this.voiceService.stopListening();
    } else {
      this.voiceService.clearTranscript();
      this.voiceService.startListening();
    }
  }

  // File Methods
  async onFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    // Check file size (5MB limit for demo)
    if (file.size > 5 * 1024 * 1024) {
      this.stateService.addNotification({
        type: 'error',
        message: 'File size exceeds 5MB limit',
        duration: 3000
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: any) => {
      const base64 = e.target.result;
      this.currentAttachments.push({
        name: file.name,
        mimeType: file.type,
        data: base64,
        size: file.size
      });
      
      this.stateService.addNotification({
        type: 'success',
        message: `File "${file.name}" attached`,
        duration: 2000
      });
    };
    reader.readAsDataURL(file);

    // Reset input
    event.target.value = '';
  }

  removeAttachment(index: number) {
    const removed = this.currentAttachments.splice(index, 1)[0];
    this.stateService.addNotification({
      type: 'info',
      message: `Removed "${removed.name}"`,
      duration: 2000
    });
  }

  // Message Methods
  runAction(actionText: string) {
    this.userInput = actionText;
    this.sendMessage();
  }

  async sendMessage() {
    // Get text from input or voice transcript
    let text = this.userInput.trim();
    
    if (this.voiceMode() && this.voiceService.transcript()) {
      text = this.voiceService.transcript();
      this.voiceService.clearTranscript();
      this.voiceService.stopListening();
    }

    if (!text && this.currentAttachments.length === 0) {
      this.stateService.addNotification({
        type: 'warning',
        message: 'Please enter a message or upload a file',
        duration: 2000
      });
      return;
    }

    const attachments = [...this.currentAttachments];
    
    this.userInput = '';
    this.currentAttachments = [];
    
    // Add user message
    this.stateService.addMessage({
      role: 'user',
      content: text || '[File attachment]',
      timestamp: Date.now(),
      attachments: attachments
    });

    this.isThinking.set(true);

    // Detect which provider will be used
    const provider = this.aiService.getPrimaryProvider();
    if (provider) {
      this.activeProvider.set(provider);
    }

    // Call AI with search flag
    const response = await this.aiService.sendMessage(text, attachments, this.useLiveSearch);

    this.isThinking.set(false);
    this.activeProvider.set('');


    // Add AI response with knowledgebase info
    this.stateService.addMessage({
      role: 'ai',
      content: response.text,
      sources: response.sources,
      suggestedActions: response.suggestedActions,
      timestamp: Date.now(),
      fromKnowledgebase: response.fromKnowledgebase,
      knowledgebaseConfidence: response.knowledgebaseConfidence
    });

    // Show notification if response came from knowledgebase
    if (response.fromKnowledgebase && response.knowledgebaseConfidence) {
      this.stateService.addNotification({
        type: 'info',
        message: `⚡ Answered from cache (${(response.knowledgebaseConfidence * 100).toFixed(0)}% match) - saved API tokens!`,
        duration: 2000
      });
      
      // Refresh knowledgebase stats
      this.loadKnowledgebaseStats();
    }

    // Text-to-speech for AI response (if voice mode)
    if (this.voiceMode() && response.text && !response.error) {
      // Speak first 200 characters to avoid too long speech
      const textToSpeak = response.text.substring(0, 200);
      this.voiceService.speak(textToSpeak);
    }
  }

  // Navigation Methods
  resetSession() {
    if (confirm('Start a new session? Current chat will not be saved.')) {
      this.stateService.clearChat();
      this.stateService.setView('setup');
    }
  }

  openAdmin() {
    this.stateService.setView('admin');
  }

  goToSearch() {
    this.stateService.setView('search');
  }

  // Project Methods
  saveProject() {
    if (!this.newProjectName.trim()) {
      this.stateService.addNotification({
        type: 'warning',
        message: 'Please enter a project name',
        duration: 2000
      });
      return;
    }

    this.stateService.saveCurrentProject(this.newProjectName);
    this.showSaveModal = false;
    this.newProjectName = '';
    
    this.stateService.addNotification({
      type: 'success',
      message: 'Project saved successfully',
      duration: 3000
    });
  }

  loadProject(project: any) {
    if (this.stateService.chatHistory().length > 0) {
      if (!confirm('Loading this project will replace your current chat. Continue?')) {
        return;
      }
    }
    
    this.stateService.loadProject(project);
    
    this.stateService.addNotification({
      type: 'success',
      message: `Loaded project: ${project.name}`,
      duration: 3000
    });
  }

  deleteProject(event: Event, id: string) {
    event.stopPropagation();
    
    if (confirm('Delete this project? This cannot be undone.')) {
      this.stateService.deleteProject(id);
    }
  }

  activeProvider = signal<string>('');
  
  // Method to get provider display name
  getActiveProviderDisplay(): string {
    const provider = this.activeProvider();
    if (!provider) return '> ANALYZING SOURCES & DATA...';
    
    const providerNames: Record<string, string> = {
      'gemini': 'Processing with Gemini Flash...',
      'openrouter': 'Processing with OpenRouter GPT-4o...',
      'openai': 'Processing with OpenAI GPT-4o...',
      'anthropic': 'Processing with Claude 3.5 Sonnet...',
      'groq': 'Processing with Groq Llama 3.3...'
    };
    
    return providerNames[provider] || '> ANALYZING SOURCES & DATA...';
  }
}

