import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../services/state.services.js';

@Component({
  selector: 'app-onboarding',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-black text-white flex items-center justify-center p-3 sm:p-4 relative overflow-hidden safe-area-top safe-area-bottom">
      
      <!-- Background Pattern -->
      <div class="absolute inset-0 opacity-5">
        <div class="absolute inset-0" style="background-image: linear-gradient(45deg, #D32F2F 25%, transparent 25%, transparent 75%, #D32F2F 75%, #D32F2F), linear-gradient(45deg, #D32F2F 25%, transparent 25%, transparent 75%, #D32F2F 75%, #D32F2F); background-size: 60px 60px; background-position: 0 0, 30px 30px;"></div>
      </div>

      <!-- Content -->
      <div class="w-full max-w-2xl relative z-10 px-2 sm:px-0">
        
        <!-- Progress Dots -->
        <div class="flex justify-center gap-2 mb-6 sm:mb-8">
          @for (i of [1,2,3,4]; track i) {
            <div 
              class="w-3 h-3 rounded-full transition-all cursor-pointer"
              [class.bg-[#D32F2F]]="currentStep() === i"
              [class.bg-gray-700]="currentStep() !== i"
              [class.scale-125]="currentStep() === i"
              (click)="goToStep(i)"
            ></div>
          }
        </div>

        <!-- Step Content -->
        <div class="border border-[#D32F2F] p-4 sm:p-8 md:p-12 min-h-[350px] sm:min-h-[400px] flex flex-col justify-between animate-fadeIn">
          
          @switch (currentStep()) {
            
            <!-- Step 1: Welcome -->
            @case (1) {
              <div>
                <h2 class="text-2xl sm:text-4xl font-bold mb-4">
                  Welcome to <span class="text-[#D32F2F]">GovInfo AI</span>
                </h2>
                <p class="text-base sm:text-lg text-gray-300 mb-6">
                  Your intelligent compliance assistant for navigating government regulations and schemes.
                </p>
                <div class="bg-[#111] border border-gray-700 p-3 sm:p-4">
                  <p class="text-sm text-gray-400 mb-2">✨ <strong>What makes us different?</strong></p>
                  <ul class="text-xs sm:text-sm text-gray-400 space-y-2">
                    <li>✓ Zero hallucination - answers based only on verified documents</li>
                    <li>✓ Context-aware guidance tailored to your jurisdiction</li>
                    <li>✓ DPR generation with AI-powered financial modeling</li>
                    <li>✓ Voice chat and multi-language support</li>
                  </ul>
                </div>
              </div>
            }

            <!-- Step 2: Context Setup -->
            @case (2) {
              <div>
                <h2 class="text-2xl sm:text-3xl font-bold mb-4 text-[#D32F2F]">
                  Context is Everything
                </h2>
                <p class="text-base sm:text-lg text-gray-300 mb-6">
                  Before we start, you'll select your country, state, sector, and objective. This helps us provide the most relevant compliance information.
                </p>
                <div class="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
                  <div class="bg-[#111] border border-gray-700 p-3 sm:p-4">
                    <div class="text-xl sm:text-2xl mb-2">🌍</div>
                    <h3 class="font-bold text-xs sm:text-sm mb-1">Jurisdiction</h3>
                    <p class="text-xs text-gray-400">Sets the legal framework</p>
                  </div>
                  <div class="bg-[#111] border border-gray-700 p-3 sm:p-4">
                    <div class="text-xl sm:text-2xl mb-2">📍</div>
                    <h3 class="font-bold text-xs sm:text-sm mb-1">State/Region</h3>
                    <p class="text-xs text-gray-400">Local bylaws & schemes</p>
                  </div>
                  <div class="bg-[#111] border border-gray-700 p-3 sm:p-4">
                    <div class="text-xl sm:text-2xl mb-2">🏭</div>
                    <h3 class="font-bold text-xs sm:text-sm mb-1">Industry Sector</h3>
                    <p class="text-xs text-gray-400">Sector-specific incentives</p>
                  </div>
                  <div class="bg-[#111] border border-gray-700 p-3 sm:p-4">
                    <div class="text-xl sm:text-2xl mb-2">🎯</div>
                    <h3 class="font-bold text-xs sm:text-sm mb-1">Your Goal</h3>
                    <p class="text-xs text-gray-400">Focused guidance</p>
                  </div>
                </div>
              </div>
            }

            <!-- Step 3: Features -->
            @case (3) {
              <div>
                <h2 class="text-2xl sm:text-3xl font-bold mb-4 text-[#D32F2F]">
                  Powerful Features
                </h2>
                <p class="text-base sm:text-lg text-gray-300 mb-6">
                  Explore what you can do with GovInfo AI:
                </p>
                <div class="space-y-2 sm:space-y-3">
                  <div class="bg-[#111] border border-gray-700 p-3 sm:p-4 hover:border-[#D32F2F] transition-colors">
                    <h3 class="font-bold text-sm sm:text-base mb-1">💬 Intelligent Chat</h3>
                    <p class="text-xs sm:text-sm text-gray-400">Ask questions in natural language, get precise answers with source citations</p>
                  </div>
                  <div class="bg-[#111] border border-gray-700 p-3 sm:p-4 hover:border-[#D32F2F] transition-colors">
                    <h3 class="font-bold text-sm sm:text-base mb-1">📄 DPR Generation</h3>
                    <p class="text-xs sm:text-sm text-gray-400">Upload CAD maps and land details to generate detailed project reports</p>
                  </div>
                  <div class="bg-[#111] border border-gray-700 p-3 sm:p-4 hover:border-[#D32F2F] transition-colors">
                    <h3 class="font-bold text-sm sm:text-base mb-1">🔍 Advanced Search</h3>
                    <p class="text-xs sm:text-sm text-gray-400">Search the knowledge base with filters and Boolean operators</p>
                  </div>
                  <div class="bg-[#111] border border-gray-700 p-3 sm:p-4 hover:border-[#D32F2F] transition-colors">
                    <h3 class="font-bold text-sm sm:text-base mb-1">🎤 Voice Interface</h3>
                    <p class="text-xs sm:text-sm text-gray-400">Speak your questions and hear responses in your language</p>
                  </div>
                </div>
              </div>
            }

            <!-- Step 4: Ready -->
            @case (4) {
              <div class="text-center">
                <div class="text-4xl sm:text-6xl mb-4 sm:mb-6">🚀</div>
                <h2 class="text-2xl sm:text-4xl font-bold mb-4">
                  You're All Set!
                </h2>
                <p class="text-base sm:text-lg text-gray-300 mb-6 sm:mb-8">
                  Ready to get started with compliance intelligence?
                </p>
                <div class="bg-[#D32F2F]/10 border border-[#D32F2F] p-3 sm:p-4 mb-6">
                  <p class="text-xs sm:text-sm text-gray-300">
                    💡 <strong>Pro Tip:</strong> Use the "Suggested Next Steps" chips after each AI response to explore your options faster.
                  </p>
                </div>
              </div>
            }
          }

          <!-- Navigation -->
          <div class="flex flex-col sm:flex-row justify-between items-center mt-6 sm:mt-8 pt-6 border-t border-gray-700 gap-4">
            <button 
              (click)="skip()"
              class="text-sm text-gray-500 hover:text-white underline py-2 min-h-[44px]"
            >
              Skip Tutorial
            </button>
            
            <div class="flex gap-3">
              @if (currentStep() > 1) {
                <button 
                  (click)="previousStep()"
                  class="px-4 sm:px-6 py-2 border border-gray-700 hover:border-white transition-colors text-sm font-bold min-h-[48px]"
                >
                  BACK
                </button>
              }
              
              @if (currentStep() < 4) {
                <button 
                  (click)="nextStep()"
                  class="px-4 sm:px-6 py-2 bg-[#D32F2F] hover:bg-red-700 transition-colors text-sm font-bold min-h-[48px]"
                >
                  NEXT
                </button>
              } @else {
                <button 
                  (click)="complete()"
                  class="px-6 sm:px-8 py-2 bg-[#D32F2F] hover:bg-red-700 transition-colors text-sm font-bold min-h-[48px]"
                >
                  LET'S GO! →
                </button>
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class OnboardingComponent {
  stateService = inject(StateService);
  currentStep = signal(1);

  nextStep() {
    if (this.currentStep() < 4) {
      this.currentStep.update(s => s + 1);
    }
  }

  previousStep() {
    if (this.currentStep() > 1) {
      this.currentStep.update(s => s - 1);
    }
  }

  goToStep(step: number) {
    this.currentStep.set(step);
  }

  complete() {
    this.stateService.completeOnboarding();
    this.stateService.addNotification({
      type: 'success',
      message: 'Welcome aboard! Let\'s set up your context.',
      duration: 3000
    });
    this.stateService.setView('setup');
  }

  skip() {
    if (confirm('Are you sure you want to skip the tutorial?')) {
      this.complete();
    }
  }
}
