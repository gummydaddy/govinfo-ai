import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../services/state.services.js';
import { UserContext } from '../models/interfaces';

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-black text-white flex items-center justify-center p-3 sm:p-4 safe-area-top safe-area-bottom">
      <div class="w-full max-w-lg border border-[#D32F2F] p-4 sm:p-8 relative min-h-[400px] sm:min-h-[500px] flex flex-col mx-2 sm:mx-0">
        
        <!-- Corner Decorations -->
        <div class="absolute top-0 left-0 w-2 h-2 bg-[#D32F2F]"></div>
        <div class="absolute top-0 right-0 w-2 h-2 bg-[#D32F2F]"></div>
        <div class="absolute bottom-0 left-0 w-2 h-2 bg-[#D32F2F]"></div>
        <div class="absolute bottom-0 right-0 w-2 h-2 bg-[#D32F2F]"></div>

        <!-- Progress Bar -->
        <div class="flex gap-1 mb-8">
          @for (i of [1,2,3,4]; track i) {
            <div 
              class="h-1 flex-1 transition-all" 
              [class.bg-[#D32F2F]]="step() >= i" 
              [class.bg-gray-800]="step() < i"
            ></div>
          }
        </div>

        <!-- Header -->
        <h2 class="text-xl sm:text-2xl font-bold mb-2 tracking-tight">SYSTEM INITIALIZATION</h2>
        <p class="text-xs text-[#D32F2F] font-mono mb-6 sm:mb-8 uppercase tracking-widest">
          STEP {{step()}} of 4: {{ getStepTitle() }}
        </p>
        
        <!-- Step Content -->
        <div class="flex-1">
          @switch (step()) {
            
            <!-- Step 1: Country -->
            @case (1) {
              <div class="animate-fadeIn">
                <label class="block text-sm text-gray-300 mb-4">
                  Select your operational jurisdiction. This defines the legal framework.
                </label>
                <div class="space-y-3">
                  @for (country of availableCountries(); track country) {
                    <button 
                      (click)="ctx.country = country; next()"
                      class="w-full text-left p-3 sm:p-4 border border-gray-700 hover:border-[#D32F2F] hover:bg-[#111] transition-all flex justify-between group min-h-[48px]"
                      [class.border-[#D32F2F]]="ctx.country === country"
                    >
                      <span class="font-bold text-sm sm:text-base">{{ getCountryFlag(country) }} {{ country }}</span>
                      <span class="opacity-0 group-hover:opacity-100 text-[#D32F2F] text-sm">SELECT</span>
                    </button>
                  }
                </div>
              </div>
            }

            <!-- Step 2: State -->
            @case (2) {
              <div class="animate-fadeIn">
                <label class="block text-sm text-gray-300 mb-4">
                  Specify the state/province for local bylaws and schemes.
                </label>
                <select 
                  [(ngModel)]="ctx.state" 
                  (change)="next()"
                  class="w-full bg-[#111] border border-gray-700 p-3 sm:p-4 text-white focus:border-[#D32F2F] outline-none appearance-none cursor-pointer hover:border-gray-500 min-h-[48px] text-base"
                >
                  <option value="">-- Select State --</option>
                  @for (state of availableStates(); track state) {
                    <option [value]="state">{{ state }}</option>
                  }
                </select>
                <div class="mt-4 text-xs text-gray-500">
                  💡 Selecting a state prioritizes local schemes and regulations.<br>
                  📚 The list updates as new state documents are added.
                </div>
              </div>
            }

            <!-- Step 3: Sector -->
            @case (3) {
              <div class="animate-fadeIn">
                <label class="block text-sm text-gray-300 mb-4">
                  What is your primary industry sector?
                </label>
                <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  @for (sector of availableSectors(); track sector) {
                    <button 
                      (click)="ctx.sector = sector; next()"
                      class="p-3 sm:p-4 border border-gray-700 hover:border-[#D32F2F] hover:bg-[#111] text-left text-sm font-medium transition-all min-h-[48px]"
                      [class.border-[#D32F2F]]="ctx.sector === sector"
                      [class.bg-[#111]]="ctx.sector === sector"
                    >
                      {{ sector }}
                    </button>
                  }
                </div>
                <div class="mt-4 text-xs text-gray-500">
                  💡 Sectors are populated from Ministry/Department entries in uploaded documents.<br>
                  📚 New sectors automatically appear when admin adds documents.
                </div>
              </div>
            }

            <!-- Step 4: Intent -->
            @case (4) {
              <div class="animate-fadeIn">
                <label class="block text-sm text-gray-300 mb-4">
                  What is your core objective today?
                </label>
                <div class="grid grid-cols-1 gap-3">
                  @for (intent of intents; track intent) {
                    <button 
                      (click)="selectIntent(intent)"
                      class="p-3 sm:p-4 border border-gray-700 hover:border-[#D32F2F] hover:bg-[#111] text-left text-sm font-medium transition-all min-h-[48px]"
                      [class.border-[#D32F2F]]="ctx.intent === intent"
                      [class.bg-[#111]]="ctx.intent === intent"
                    >
                      {{ intent }}
                    </button>
                  }
                </div>
                
                <!-- Custom "Other" Input -->
                @if (showOtherIntent()) {
                  <div class="mt-4 animate-fadeIn">
                    <label class="block text-xs text-gray-400 mb-2">
                      Please specify your objective:
                    </label>
                    <input 
                      type="text"
                      [(ngModel)]="customIntent"
                      (keyup.enter)="confirmCustomIntent()"
                      placeholder="Enter your objective..."
                      class="w-full bg-[#111] border border-[#D32F2F] p-3 text-white focus:border-[#D32F2F] outline-none text-sm min-h-[48px]"
                    >
                    <div class="flex gap-2 mt-3">
                      <button 
                        (click)="confirmCustomIntent()"
                        class="flex-1 bg-[#D32F2F] text-white py-2 px-4 font-bold hover:bg-red-700 transition-colors text-sm min-h-[44px]"
                      >
                        CONFIRM
                      </button>
                      <button 
                        (click)="cancelCustomIntent()"
                        class="bg-gray-800 text-white py-2 px-4 hover:bg-gray-700 transition-colors text-sm min-h-[44px]"
                      >
                        CANCEL
                      </button>
                    </div>
                  </div>
                }
                
                <div class="mt-4 text-xs text-gray-500">
                  💡 Can't find what you're looking for? Select "Other" and specify your requirement.
                </div>
              </div>
            }
          }
        </div>

        <!-- Navigation Footer -->
        <div class="flex justify-between mt-6 sm:mt-8 border-t border-gray-800 pt-4">
          <button 
            (click)="back()" 
            [disabled]="step() === 1"
            class="text-xs text-gray-500 hover:text-white disabled:opacity-0 transition-opacity py-2 px-2 min-h-[44px]"
          >
            ← BACK
          </button>
          
          @if (step() === 2 && !ctx.state) {
            <button 
              (click)="ctx.state='All'; next()" 
              class="text-xs text-gray-500 hover:text-white py-2 px-2 min-h-[44px]"
            >
              SKIP (National Only) →
            </button>
          }
        </div>
      </div>
    </div>
  `
})
export class SetupComponent {
  stateService = inject(StateService);
  step = signal(1);
  
  // Signal for showing custom "Other" intent input
  showOtherIntent = signal(false);
  customIntent = '';

  ctx: UserContext = {
    country: 'India',
    state: '',
    sector: '',
    intent: ''
  };

  // Computed available states from documents
  availableStates = computed(() => {
    return this.stateService.availableStates();
  });

  availableCountries = computed(() => {
    return this.stateService.availableCountries();
  });

  // Dynamic sectors from state service (extracted from document ministries)
  availableSectors = computed(() => {
    return this.stateService.availableSectors();
  });
  
  // Default intents with "Other" option
  intents = [
    'Factory Setup', 
    'Startup Registration', 
    'Export License', 
    'NGO Registration', 
    'Legal Compliance Check',
    'Subsidy Application',
    'DPR Generation',
    'Other'
  ];

  getStepTitle() {
    switch(this.step()) {
      case 1: return 'JURISDICTION';
      case 2: return 'LOCALITY';
      case 3: return 'SECTOR';
      case 4: return 'INTENT';
      default: return '';
    }
  }

  getCountryFlag(country: string): string {
    const flags: { [key: string]: string } = {
      'India': '🇮🇳',
      'USA': '🇺🇸',
      'UK': '🇬🇧',
      'UAE': '🇦🇪'
    };
    return flags[country] || '🏴';
  }

  next() {
    if (this.step() < 4) {
      this.step.update(s => s + 1);
    }
  }

  back() {
    if (this.step() > 1) {
      this.step.update(s => s - 1);
    }
  }
  
  // Handle intent selection including "Other" option
  selectIntent(intent: string) {
    if (intent === 'Other') {
      this.showOtherIntent.set(true);
      this.customIntent = '';
    } else {
      this.ctx.intent = intent;
      this.start();
    }
  }
  
  // Confirm custom intent from "Other" option
  confirmCustomIntent() {
    if (this.customIntent.trim()) {
      this.ctx.intent = this.customIntent.trim();
      this.start();
    } else {
      // Show warning - input is empty
      this.stateService.addNotification({
        type: 'warning',
        message: 'Please enter your objective',
        duration: 2000
      });
    }
  }
  
  // Cancel custom intent and go back
  cancelCustomIntent() {
    this.showOtherIntent.set(false);
    this.customIntent = '';
  }

  start() {
    this.stateService.updateContext(this.ctx);
    this.stateService.setView('chat');
  }
}
