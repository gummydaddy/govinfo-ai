// src/components/admin.component.ts

import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../services/state.service';
import { DocMetadata } from '../models/interfaces';

@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-black text-white p-8 font-sans">
      <div class="max-w-7xl mx-auto">
        
        <!-- Header -->
        <div class="flex justify-between items-center mb-10 border-b border-[#D32F2F] pb-4">
          <div>
            <h1 class="text-3xl font-bold tracking-tight">Admin Console</h1>
            <p class="text-sm text-gray-500 mt-1">System Configuration & Data Management</p>
          </div>
          <button 
            (click)="closeAdmin()" 
            class="text-gray-400 hover:text-white transition-colors text-sm"
          >
            ← Exit to App
          </button>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          <!-- LEFT COLUMN: Configuration & Upload -->
          <div class="space-y-8">
            
            <!-- API Key Configuration -->
            <div class="border border-[#D32F2F] p-6 bg-black">
              <h2 class="text-xl font-bold mb-4 text-[#D32F2F]">1. System Configuration</h2>
              
              <!-- Gemini API Key -->
              <div class="space-y-4 mb-6">
                <label class="block text-sm text-gray-400">Gemini API Key</label>
                <div class="flex gap-2">
                  <input 
                    type="password" 
                    [(ngModel)]="apiKeyInput"
                    placeholder="Enter Google GenAI API Key"
                    class="flex-1 bg-[#111] border border-gray-700 p-3 text-white focus:border-[#D32F2F] focus:outline-none"
                  >
                  <button 
                    (click)="saveApiKey()"
                    class="bg-[#D32F2F] text-white px-6 py-3 font-bold hover:bg-red-700 transition-colors"
                  >
                    SAVE
                  </button>
                </div>
                <p class="text-xs text-gray-500">
                  🔑 Get your API key from: <a href="https://aistudio.google.com/app/apikey" target="_blank" class="text-[#D32F2F] underline">Google AI Studio</a>
                </p>
              </div>

              <!-- Google Maps API Key -->
              <div class="space-y-4">
                <label class="block text-sm text-gray-400">Google Maps API Key (Optional)</label>
                <div class="flex gap-2">
                  <input 
                    type="password" 
                    [(ngModel)]="mapsKeyInput"
                    placeholder="Enter Google Maps API Key"
                    class="flex-1 bg-[#111] border border-gray-700 p-3 text-white focus:border-[#D32F2F] focus:outline-none"
                  >
                  <button 
                    (click)="saveMapsKey()"
                    class="bg-gray-700 text-white px-6 py-3 font-bold hover:bg-gray-600 transition-colors"
                  >
                    SAVE
                  </button>
                </div>
                <p class="text-xs text-gray-500">
                  🗺️ Required for live location search features
                </p>
              </div>
            </div>

            <!-- Data Ingestion -->
            <div class="border border-[#D32F2F] p-6 bg-black">
              <h2 class="text-xl font-bold mb-4 text-[#D32F2F]">2. Data Ingestion</h2>
              
              <form class="space-y-4">
                
                <!-- Country & State -->
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">Country *</label>
                    <input 
                      [(ngModel)]="newDoc.country" 
                      name="country"
                      placeholder="e.g., India"
                      class="w-full bg-[#111] border border-gray-700 p-2 text-sm text-white focus:border-[#D32F2F] outline-none"
                    >
                  </div>
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">State/Province *</label>
                    <input 
                      [(ngModel)]="newDoc.state" 
                      name="state"
                      placeholder="e.g., Maharashtra"
                      class="w-full bg-[#111] border border-gray-700 p-2 text-sm text-white focus:border-[#D32F2F] outline-none"
                    >
                  </div>
                </div>

                <!-- Title -->
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Document Title *</label>
                  <input 
                    [(ngModel)]="newDoc.title" 
                    name="title"
                    placeholder="e.g., Maharashtra Industrial Policy 2023"
                    class="w-full bg-[#111] border border-gray-700 p-2 text-sm text-white focus:border-[#D32F2F] outline-none"
                  >
                </div>
                
                <!-- Ministry & Type -->
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">Ministry/Department *</label>
                    <input 
                      [(ngModel)]="newDoc.ministry" 
                      name="ministry"
                      placeholder="e.g., Industries Department"
                      class="w-full bg-[#111] border border-gray-700 p-2 text-sm text-white focus:border-[#D32F2F] outline-none"
                    >
                  </div>
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">Document Type *</label>
                    <select 
                      [(ngModel)]="newDoc.type" 
                      name="type"
                      class="w-full bg-[#111] border border-gray-700 p-2 text-sm text-white focus:border-[#D32F2F] outline-none"
                    >
                      <option value="Policy">Policy</option>
                      <option value="Scheme">Scheme</option>
                      <option value="Act">Act/Law</option>
                      <option value="Notification">Notification</option>
                      <option value="DPR Template">DPR Template</option>
                      <option value="Circular">Circular</option>
                      <option value="Tender">Tender</option>
                    </select>
                  </div>
                </div>

                <!-- Priority & Validity -->
                <div class="grid grid-cols-2 gap-4">
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">Priority Level</label>
                    <select 
                      [(ngModel)]="newDoc.priority" 
                      name="priority"
                      class="w-full bg-[#111] border border-gray-700 p-2 text-sm text-white focus:border-[#D32F2F] outline-none"
                    >
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                  <div>
                    <label class="block text-xs text-gray-400 mb-1">Validity Period</label>
                    <input 
                      [(ngModel)]="newDoc.validityPeriod" 
                      name="validity"
                      placeholder="e.g., 2023-2028"
                      class="w-full bg-[#111] border border-gray-700 p-2 text-sm text-white focus:border-[#D32F2F] outline-none"
                    >
                  </div>
                </div>

                <!-- Source Authority -->
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Source Authority</label>
                  <input 
                    [(ngModel)]="newDoc.sourceAuthority" 
                    name="sourceAuthority"
                    placeholder="e.g., Government of Maharashtra"
                    class="w-full bg-[#111] border border-gray-700 p-2 text-sm text-white focus:border-[#D32F2F] outline-none"
                  >
                </div>

                <!-- Tags -->
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Tags (comma-separated)</label>
                  <input 
                    [(ngModel)]="tagsInput" 
                    name="tags"
                    placeholder="e.g., manufacturing, msme, incentives"
                    class="w-full bg-[#111] border border-gray-700 p-2 text-sm text-white focus:border-[#D32F2F] outline-none"
                  >
                </div>

                <!-- File Upload Section -->
                <div class="border border-dashed border-gray-700 p-4 text-center hover:border-[#D32F2F] transition-colors">
                  <label class="cursor-pointer block">
                    <span class="text-xs text-gray-400 block mb-2">
                      📄 Upload Document (PDF, DOCX, TXT, Images, CSV, XML)
                    </span>
                    <input 
                      type="file" 
                      (change)="handleFileUpload($event)" 
                      class="hidden" 
                      accept=".txt,.md,.json,.csv,.xml,.pdf,.doc,.docx,.jpg,.png,.jpeg"
                    >
                    <span class="bg-[#222] px-4 py-2 text-xs text-white border border-gray-600 rounded inline-block hover:bg-gray-700">
                      CHOOSE FILE
                    </span>
                  </label>
                  @if (uploadedFileName()) {
                    <p class="text-xs text-green-500 mt-2">✓ {{ uploadedFileName() }}</p>
                  }
                </div>

                <div class="text-center text-xs text-gray-500 -my-2">
                  OR PASTE CONTENT BELOW
                </div>

                <!-- Content Textarea -->
                <div>
                  <label class="block text-xs text-gray-400 mb-1">Document Content *</label>
                  <textarea 
                    [(ngModel)]="newDoc.content"
                    name="content"
                    rows="8"
                    placeholder="Paste the full text of the government document here..."
                    class="w-full bg-[#111] border border-gray-700 p-3 text-sm text-white focus:border-[#D32F2F] outline-none font-mono"
                  ></textarea>
                  <p class="text-xs text-gray-500 mt-1">
                    {{ newDoc.content?.length || 0 }} characters
                  </p>
                </div>

                <!-- Submit Button -->
                <button 
                  type="button"
                  (click)="uploadDocument()"
                  [disabled]="isUploading()"
                  class="w-full border-2 border-white text-white py-3 font-bold hover:bg-white hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  @if (isUploading()) {
                    INGESTING DOCUMENT...
                  } @else {
                    📤 INGEST DOCUMENT
                  }
                </button>
              </form>
            </div>

          </div>

          <!-- RIGHT COLUMN: Knowledge Base -->
          <div class="border border-[#D32F2F] p-6 bg-black h-full flex flex-col">
            <div class="flex justify-between items-center mb-4">
              <h2 class="text-xl font-bold text-[#D32F2F]">3. Knowledge Base</h2>
              <span class="text-xs text-gray-500">{{ stateService.documents().length }} documents</span>
            </div>
            
            <!-- Search/Filter -->
            <div class="mb-4">
              <input 
                type="text"
                [(ngModel)]="searchQuery"
                placeholder="Search documents..."
                class="w-full bg-[#111] border border-gray-700 p-2 text-sm text-white focus:border-[#D32F2F] outline-none"
              >
            </div>

            <!-- Document List -->
            <div class="flex-1 overflow-y-auto pr-2 space-y-3">
              @for (doc of filteredDocuments(); track doc.id) {
                <div class="p-4 border border-gray-800 hover:border-gray-500 transition-colors bg-[#0a0a0a] group">
                  
                  <!-- Header -->
                  <div class="flex justify-between items-start mb-2">
                    <span class="text-[#D32F2F] text-xs font-bold uppercase tracking-wider">
                      {{ doc.type }}
                    </span>
                    <div class="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        (click)="deleteDocument(doc.id)"
                        class="text-xs text-red-500 hover:text-red-400"
                        title="Delete document"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>

                  <!-- Title -->
                  <h3 class="font-bold text-sm mb-1">{{ doc.title }}</h3>
                  
                  <!-- Metadata -->
                  <p class="text-xs text-gray-400 mb-2">
                    {{ doc.ministry }} | {{ doc.state }}, {{ doc.country }}
                  </p>

                  <!-- Upload Date -->
                  <p class="text-xs text-gray-600 mb-2">
                    📅 {{ doc.uploadDate | date:'short' }}
                  </p>

                  <!-- Tags -->
                  @if (doc.tags && doc.tags.length > 0) {
                    <div class="flex gap-1 flex-wrap mb-2">
                      @for (tag of doc.tags; track tag) {
                        <span class="text-xs bg-gray-800 text-gray-400 px-1 py-0.5 rounded">
                          #{{ tag }}
                        </span>
                      }
                    </div>
                  }

                  <!-- Content Preview -->
                  <div class="text-xs text-gray-600 line-clamp-2 font-mono">
                    {{ doc.content.substring(0, 100) }}...
                  </div>
                </div>
              } @empty {
                <div class="text-center py-10 text-gray-600">
                  <p class="text-sm">No documents found</p>
                  <p class="text-xs mt-2">Upload your first document to get started</p>
                </div>
              }
            </div>

            <!-- Stats -->
            <div class="mt-4 pt-4 border-t border-gray-800 grid grid-cols-3 gap-4 text-center">
              <div>
                <div class="text-2xl font-bold text-[#D32F2F]">{{ stateService.documents().length }}</div>
                <div class="text-xs text-gray-500">Total Docs</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-[#D32F2F]">{{ uniqueStates() }}</div>
                <div class="text-xs text-gray-500">States</div>
              </div>
              <div>
                <div class="text-2xl font-bold text-[#D32F2F]">{{ getAdminFirstName() }}</div>
                <div class="text-xs text-gray-500">Admin</div>
              </div>
            </div>
          </div>

        </div>

        <!-- Footer Info -->
        <div class="mt-8 text-xs text-gray-600 text-center font-mono">
          ADMIN CONSOLE v1.0 | AUTHORIZED ACCESS ONLY
        </div>
      </div>
    </div>
  `
})
export class AdminComponent {
  stateService = inject(StateService);
  
  apiKeyInput = '';
  mapsKeyInput = '';
  searchQuery = '';
  tagsInput = '';
  uploadedFileName = signal('');
  isUploading = signal(false);
  
  newDoc: Partial<DocMetadata> = {
    country: 'India',
    state: '',
    title: '',
    ministry: '',
    type: 'Policy',
    content: '',
    priority: 'Medium',
    validityPeriod: '',
    sourceAuthority: '',
    tags: []
  };

  constructor() {
    this.apiKeyInput = this.stateService.apiKey();
    this.mapsKeyInput = this.stateService.googleMapsApiKey();
  }

  // Configuration Methods
  saveApiKey() {
    if (!this.apiKeyInput.trim()) {
      alert('Please enter an API key');
      return;
    }
    
    this.stateService.setApiKey(this.apiKeyInput);
    this.stateService.addNotification({
      type: 'success',
      message: 'Gemini API Key saved successfully',
      duration: 3000
    });
  }

  saveMapsKey() {
    if (!this.mapsKeyInput.trim()) {
      alert('Please enter a Maps API key');
      return;
    }
    
    this.stateService.setGoogleMapsApiKey(this.mapsKeyInput);
    this.stateService.addNotification({
      type: 'success',
      message: 'Google Maps API Key saved successfully',
      duration: 3000
    });
  }

  // File Upload Handler
  handleFileUpload(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    this.uploadedFileName.set(file.name);

    // Auto-fill title if empty
    if (!this.newDoc.title) {
      this.newDoc.title = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
    }

    const reader = new FileReader();
    
    // Check if file is text-based
    const isTextFile = file.type.match(/text.*/) || 
                      file.name.match(/\.(txt|md|json|csv|xml)$/i);
    
    if (isTextFile) {
      reader.onload = (e: any) => {
        this.newDoc.content = e.target.result;
        this.stateService.addNotification({
          type: 'success',
          message: 'File loaded successfully',
          duration: 2000
        });
      };
      reader.readAsText(file);
    } else {
      // For binary files (PDF, DOCX, Images)
      // In production, you'd upload to server for OCR/extraction
      // For demo, we'll simulate extraction
      this.newDoc.content = `[FILE CONTENT EXTRACTED FROM: ${file.name}]

(System Note: This document was uploaded as a binary file. In a production system, this would be processed through OCR or document extraction APIs.)

File Type: ${file.type || 'Unknown'}
File Size: ${(file.size / 1024).toFixed(2)} KB
Upload Date: ${new Date().toISOString()}

--- SIMULATED EXTRACTED CONTENT ---

Document Title: ${this.newDoc.title || file.name}
Source: ${this.newDoc.sourceAuthority || 'Government Document'}

The system has indexed this document's content for RAG retrieval. 
Users can query information from this document through the chat interface.

To properly extract content from PDFs, DOCX, and images in production:
- Use PDF.js or PyPDF2 for PDF extraction
- Use mammoth.js or python-docx for Word documents
- Use Tesseract OCR for scanned images
- Store extracted text in the content field
`;
      
      this.stateService.addNotification({
        type: 'info',
        message: 'Binary file uploaded. Content extraction simulated for demo.',
        duration: 4000
      });
    }

    // Reset file input
    event.target.value = '';
  }

  // Document Upload Method
  uploadDocument() {
    // Validation
    if (!this.newDoc.title || !this.newDoc.content) {
      alert('Title and Content are required.');
      return;
    }

    if (!this.newDoc.country || !this.newDoc.state || !this.newDoc.ministry) {
      alert('Please fill in all required metadata fields.');
      return;
    }

    this.isUploading.set(true);

    // Simulate upload delay
    setTimeout(() => {
      // Parse tags
      const tags = this.tagsInput
        ? this.tagsInput.split(',').map(t => t.trim()).filter(t => t)
        : [];

      // Create document
      const doc: DocMetadata = {
        id: this.generateId(),
        title: this.newDoc.title!,
        country: this.newDoc.country || 'India',
        state: this.newDoc.state || 'All',
        ministry: this.newDoc.ministry || 'Unknown',
        type: this.newDoc.type || 'Policy',
        content: this.newDoc.content!,
        priority: this.newDoc.priority || 'Medium',
        uploadDate: new Date().toISOString(),
        validityPeriod: this.newDoc.validityPeriod,
        sourceAuthority: this.newDoc.sourceAuthority,
        tags: tags
      };

      // Add to state
      this.stateService.addDocument(doc);
      
      this.isUploading.set(false);

      // Show success notification
      this.stateService.addNotification({
        type: 'success',
        message: `Document "${doc.title}" ingested successfully`,
        duration: 4000
      });

      // Reset form
      this.resetForm();
    }, 800);
  }

  // Delete Document
  deleteDocument(id: string) {
    if (confirm('Are you sure you want to delete this document? This action cannot be undone.')) {
      const doc = this.stateService.documents().find(d => d.id === id);
      this.stateService.deleteDocument(id);
      
      this.stateService.addNotification({
        type: 'info',
        message: `Document "${doc?.title}" deleted`,
        duration: 3000
      });
    }
  }

  // Filtered Documents
  filteredDocuments() {
    const query = this.searchQuery.toLowerCase();
    if (!query) {
      return this.stateService.documents();
    }

    return this.stateService.documents().filter(doc =>
      doc.title.toLowerCase().includes(query) ||
      doc.content.toLowerCase().includes(query) ||
      doc.ministry.toLowerCase().includes(query) ||
      doc.state.toLowerCase().includes(query) ||
      (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(query)))
    );
  }

  // Statistics
  uniqueStates() {
    const states = new Set(
      this.stateService.documents()
        .map(d => d.state)
        .filter(s => s && s !== 'All')
    );
    return states.size;
  }

  // Helper to safely get admin first name
  getAdminFirstName(): string {
    const user = this.stateService.currentUser();
    if (!user || !user.name) {
      return 'Admin';
    }
    const nameParts = user.name.split(' ');
    return nameParts[0] || 'Admin';
  }

  // Navigation
  closeAdmin() {
    this.stateService.setView('landing');
  }

  // Helpers
  private resetForm() {
    this.newDoc = {
      country: 'India',
      state: '',
      title: '',
      ministry: '',
      type: 'Policy',
      content: '',
      priority: 'Medium',
      validityPeriod: '',
      sourceAuthority: '',
      tags: []
    };
    this.tagsInput = '';
    this.uploadedFileName.set('');
  }

  private generateId(): string {
    return 'doc-' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }
}