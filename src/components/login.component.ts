import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../services/state.service';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div class="w-full max-w-md border border-[#D32F2F] p-8 relative">
        
        <!-- Corner Decorations -->
        <div class="absolute top-0 left-0 w-2 h-2 bg-[#D32F2F]"></div>
        <div class="absolute top-0 right-0 w-2 h-2 bg-[#D32F2F]"></div>
        <div class="absolute bottom-0 left-0 w-2 h-2 bg-[#D32F2F]"></div>
        <div class="absolute bottom-0 right-0 w-2 h-2 bg-[#D32F2F]"></div>

        <!-- Header -->
        <h2 class="text-3xl font-bold mb-2 tracking-tight">LOGIN</h2>
        <p class="text-xs text-[#D32F2F] font-mono mb-8 uppercase tracking-widest">
          ACCESS YOUR ACCOUNT
        </p>

        <!-- Error Message -->
        @if (errorMessage()) {
          <div class="mb-6 p-3 border border-red-500 bg-red-900/20 text-sm text-red-300">
            {{ errorMessage() }}
          </div>
        }

        <!-- Login Form -->
        <form (ngSubmit)="onSubmit()" class="space-y-6">
          
          <!-- Email -->
          <div>
            <label class="block text-sm text-gray-300 mb-2">Email</label>
            <input 
              type="email" 
              [(ngModel)]="email" 
              name="email"
              placeholder="your.email@example.com"
              required
              class="w-full bg-[#111] border border-gray-700 p-3 text-white focus:border-[#D32F2F] outline-none"
            >
          </div>

          <!-- Password -->
          <div>
            <label class="block text-sm text-gray-300 mb-2">Password</label>
            <input 
              type="password" 
              [(ngModel)]="password" 
              name="password"
              placeholder="Enter your password"
              required
              class="w-full bg-[#111] border border-gray-700 p-3 text-white focus:border-[#D32F2F] outline-none"
            >
          </div>

          <!-- Super Admin Hint -->
          <div class="text-xs text-gray-600 border border-gray-800 p-2">
            <strong>Super Admin:</strong> admin@govinfo.ai / GovInfoAdmin@2024
          </div>

          <!-- Submit Button -->
          <button 
            type="submit" 
            [disabled]="isLoading()"
            class="w-full bg-[#D32F2F] text-white py-3 font-bold text-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            @if (isLoading()) {
              LOGGING IN...
            } @else {
              LOGIN
            }
          </button>
        </form>

        <!-- Footer Links -->
        <div class="mt-6 text-center space-y-2">
          <button 
            (click)="goToSignup()" 
            class="text-gray-500 hover:text-white underline text-sm block w-full"
          >
            Don't have an account? Sign Up
          </button>
          <button 
            (click)="goToLanding()" 
            class="text-gray-500 hover:text-white underline text-sm block w-full"
          >
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  `
})
export class LoginComponent {
  stateService = inject(StateService);
  authService = inject(AuthService);
  
  email = '';
  password = '';
  errorMessage = signal('');
  isLoading = signal(false);

  onSubmit() {
    this.errorMessage.set('');
    this.isLoading.set(true);

    // Simulate network delay for better UX
    setTimeout(() => {
      const result = this.authService.login(this.email, this.password);
      
      this.isLoading.set(false);

      if (result.success) {
        this.stateService.setView('landing');
      } else {
        this.errorMessage.set(result.message);
      }
    }, 300);
  }

  goToSignup() {
    this.stateService.setView('signup');
  }

  goToLanding() {
    this.stateService.setView('landing');
  }
}