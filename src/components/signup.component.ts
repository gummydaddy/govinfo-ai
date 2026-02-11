import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { StateService } from '../services/state.services.js';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-signup',
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
        <h2 class="text-3xl font-bold mb-2 tracking-tight">SIGN UP</h2>
        <p class="text-xs text-[#D32F2F] font-mono mb-8 uppercase tracking-widest">
          CREATE YOUR ACCOUNT
        </p>

        <!-- Error/Success Message -->
        @if (message()) {
          <div 
            class="mb-6 p-3 border text-sm"
            [class.border-red-500]="messageType() === 'error'"
            [class.bg-red-900/20]="messageType() === 'error'"
            [class.text-red-300]="messageType() === 'error'"
            [class.border-green-500]="messageType() === 'success'"
            [class.bg-green-900/20]="messageType() === 'success'"
            [class.text-green-300]="messageType() === 'success'"
          >
            {{ message() }}
          </div>
        }

        <!-- Signup Form -->
        <form (ngSubmit)="onSubmit()" class="space-y-6">
          
          <!-- Name -->
          <div>
            <label class="block text-sm text-gray-300 mb-2">Full Name</label>
            <input 
              type="text" 
              [(ngModel)]="name" 
              name="name"
              placeholder="John Doe"
              required
              class="w-full bg-[#111] border border-gray-700 p-3 text-white focus:border-[#D32F2F] outline-none"
            >
          </div>

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
              placeholder="Minimum 8 characters"
              required
              minlength="8"
              class="w-full bg-[#111] border border-gray-700 p-3 text-white focus:border-[#D32F2F] outline-none"
            >
            <p class="text-xs text-gray-500 mt-1">Must be at least 8 characters</p>
          </div>

          <!-- Confirm Password -->
          <div>
            <label class="block text-sm text-gray-300 mb-2">Confirm Password</label>
            <input 
              type="password" 
              [(ngModel)]="confirmPassword" 
              name="confirmPassword"
              placeholder="Re-enter password"
              required
              class="w-full bg-[#111] border border-gray-700 p-3 text-white focus:border-[#D32F2F] outline-none"
            >
          </div>

          <!-- Submit Button -->
          <button 
            type="submit" 
            [disabled]="isLoading()"
            class="w-full bg-[#D32F2F] text-white py-3 font-bold text-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            @if (isLoading()) {
              CREATING ACCOUNT...
            } @else {
              SIGN UP
            }
          </button>
        </form>

        <!-- Footer Links -->
        <div class="mt-6 text-center space-y-2">
          <button 
            (click)="goToLogin()" 
            class="text-gray-500 hover:text-white underline text-sm block w-full"
          >
            Already have an account? Login
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
export class SignupComponent {
  stateService = inject(StateService);
  authService = inject(AuthService);
  
  name = '';
  email = '';
  password = '';
  confirmPassword = '';
  message = signal('');
  messageType = signal<'error' | 'success'>('error');
  isLoading = signal(false);

  onSubmit() {
    this.message.set('');
    
    // Validation
    if (this.password !== this.confirmPassword) {
      this.message.set('Passwords do not match');
      this.messageType.set('error');
      return;
    }

    this.isLoading.set(true);

    // Simulate network delay
    setTimeout(() => {
      const result = this.authService.signup(this.email, this.password, this.name);
      
      this.isLoading.set(false);

      if (result.success) {
        this.message.set('Account created successfully! Redirecting...');
        this.messageType.set('success');
        
        // Redirect to landing after 1.5 seconds
        setTimeout(() => {
          this.stateService.setView('landing');
        }, 1500);
      } else {
        this.message.set(result.message);
        this.messageType.set('error');
      }
    }, 300);
  }

  goToLogin() {
    this.stateService.setView('login');
  }

  goToLanding() {
    this.stateService.setView('landing');
  }
}