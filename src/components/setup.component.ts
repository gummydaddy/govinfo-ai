import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../services/state.service';
import { UserContext } from '../models/interfaces';

@Component({
  selector: 'app-setup',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div class="w-full max-w-lg border border-[#D32F2F] p-8 relative min-h-[500px] flex flex-col">
        
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
        <h2 class="text-2xl font-bold mb-2 tracking-tight">SYSTEM INITIALIZATION</h2>
        <p class="text-xs text-[#D32F2F] font-mono mb-8 uppercase tracking-widest">
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
                      class="w-full text-left p-4 border border-gray-700 hover:border-[#D32F2F] hover:bg-[#111] transition-all flex justify-between group"
                      [class.border-[#D32F2F]]="ctx.country === country"
                    >
                      <span class="font-bold">{{ getCountryFlag(country) }} {{ country }}</span>
                      <span class="opacity-0 group-hover:opacity-100 text-[#D32F2F]">SELECT</span>
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
                  class="w-full bg-[#111] border border-gray-700 p-4 text-white focus:border-[#D32F2F] outline-none appearance-none cursor-pointer hover:border-gray-500"
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
                <div class="grid grid-cols-2 gap-3">
                  @for (sector of sectors; track sector) {
                    <button 
                      (click)="ctx.sector = sector; next()"
                      class="p-4 border border-gray-700 hover:border-[#D32F2F] hover:bg-[#111] text-left text-sm font-medium transition-all"
                      [class.border-[#D32F2F]]="ctx.sector === sector"
                      [class.bg-[#111]]="ctx.sector === sector"
                    >
                      {{ sector }}
                    </button>
                  }
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
                      (click)="ctx.intent = intent; start()"
                      class="p-4 border border-gray-700 hover:border-[#D32F2F] hover:bg-[#111] text-left text-sm font-medium transition-all"
                    >
                      {{ intent }}
                    </button>
                  }
                </div>
              </div>
            }
          }
        </div>

        <!-- Navigation Footer -->
        <div class="flex justify-between mt-8 border-t border-gray-800 pt-4">
          <button 
            (click)="back()" 
            [disabled]="step() === 1"
            class="text-xs text-gray-500 hover:text-white disabled:opacity-0 transition-opacity"
          >
            ← BACK
          </button>
          
          @if (step() === 2 && !ctx.state) {
            <button 
              (click)="ctx.state='All'; next()" 
              class="text-xs text-gray-500 hover:text-white"
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

  sectors = [
    'Manufacturing', 
    'IT / Services', 
    'Agriculture', 
    'Export', 
    'Healthcare',
    'Education',
    'Renewable Energy',
    'Food Processing'
  ];
  
  intents = [
    'Factory Setup', 
    'Startup Registration', 
    'Export License', 
    'NGO Registration', 
    'Legal Compliance Check',
    'Subsidy Application',
    'DPR Generation'
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

  start() {
    this.stateService.updateContext(this.ctx);
    this.stateService.setView('chat');
  }
}