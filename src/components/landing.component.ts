import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from '../services/state.service';
import { AuthService } from '../services/auth.service';
import { LanguageService } from '../services/language.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6 text-center relative">
      
      <!-- Language Selector -->
      <div class="absolute top-4 right-4">
        <select 
          [value]="stateService.currentLanguage()"
          (change)="changeLanguage($event)"
          class="bg-[#111] border border-gray-700 text-white text-sm px-3 py-2 rounded focus:border-[#D32F2F] outline-none"
        >
          @for (lang of languageService.availableLanguages; track lang.code) {
            <option [value]="lang.code">{{ lang.nativeName }}</option>
          }
        </select>
      </div>

      <!-- Logo -->
      <div class="mb-8 border border-[#D32F2F] p-2 inline-block">
        <div class="w-16 h-16 bg-[#D32F2F] flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white">
            <path d="M3 21h18"/>
            <path d="M5 21V7l8-4 8 4v14"/>
            <path d="M17 21v-8.5a.5.5 0 0 0-.5-.5h-5a.5.5 0 0 0-.5.5V21"/>
            <path d="M12 3a3 3 0 0 0-3 3"/>
          </svg>
        </div>
      </div>

      <!-- Title -->
      <h1 class="text-5xl md:text-7xl font-bold tracking-tighter mb-4">
        GOVINFO <span class="text-[#D32F2F]">AI</span>
      </h1>
      
      <!-- Description -->
      <p class="text-lg md:text-xl text-gray-400 max-w-2xl mb-8">
        {{ languageService.translate('welcome') }}<br>
        Zero-hallucination compliance intelligence. Build startups, factories, and NGOs with actionable guidance backed by verified government sources.
      </p>

      <!-- User Info (if logged in) -->
      @if (stateService.currentUser()) {
        <div class="mb-6 p-3 border border-gray-700 bg-[#111] rounded">
          <p class="text-sm text-gray-400">
            Welcome, <span class="text-white font-bold">{{ stateService.currentUser()?.name }}</span>
          </p>
          @if (stateService.currentUser()?.role === 'admin') {
            <p class="text-xs text-[#D32F2F] mt-1">● Administrator Access</p>
          }
        </div>
      }

      <!-- Action Buttons -->
      <div class="flex flex-col md:flex-row gap-4 w-full max-w-md">
        <button 
          (click)="start()" 
          class="flex-1 bg-[#D32F2F] text-white py-4 px-8 font-bold text-lg hover:bg-red-700 transition-colors border border-[#D32F2F]"
        >
          {{ languageService.translate('start_session') }}
        </button>
        
        @if (stateService.currentUser()?.role === 'admin') {
          <button 
            (click)="admin()" 
            class="flex-1 bg-black text-white py-4 px-8 font-bold text-lg border border-gray-700 hover:border-white transition-colors"
          >
            {{ languageService.translate('admin_panel') }}
          </button>
        }
      </div>
      
      <!-- Secondary Actions -->
      <button 
        (click)="search()" 
        class="mt-4 text-gray-500 hover:text-white underline text-sm"
      >
        Access Knowledge Base Search
      </button>

      <!-- Auth Buttons -->
      @if (stateService.currentUser()) {
        <button 
          (click)="logout()" 
          class="mt-4 text-gray-500 hover:text-red-500 underline text-sm"
        >
          {{ languageService.translate('logout') }}
        </button>
      } @else {
        <div class="mt-6 flex gap-4">
          <button 
            (click)="login()" 
            class="text-gray-500 hover:text-white underline text-sm"
          >
            {{ languageService.translate('login') }}
          </button>
          <button 
            (click)="signup()" 
            class="text-gray-500 hover:text-white underline text-sm"
          >
            {{ languageService.translate('signup') }}
          </button>
        </div>
      }

      <!-- System Status -->
      <div class="mt-20 text-xs text-gray-600 font-mono">
        SYSTEM STATUS: ONLINE<br>
        JURISDICTION DATA: LOADED<br>
        DOCUMENTS: {{ stateService.documents().length }}
      </div>
    </div>
  `
})
export class LandingComponent {
  stateService = inject(StateService);
  authService = inject(AuthService);
  languageService = inject(LanguageService);

  start() {
    if (!this.stateService.currentUser()) {
      if (confirm('You need to login to start a session. Would you like to login now?')) {
        this.stateService.setView('login');
      }
      return;
    }
    
    // Check if onboarding needed
    if (!this.stateService.hasCompletedOnboarding()) {
      this.stateService.setView('onboarding');
    } else {
      this.stateService.setView('setup');
    }
  }

  admin() {
    if (this.stateService.currentUser()?.role !== 'admin') {
      alert('Access Denied: Admin privileges required');
      return;
    }
    this.stateService.setView('admin');
  }

  search() {
    this.stateService.setView('search');
  }

  login() {
    this.stateService.setView('login');
  }

  signup() {
    this.stateService.setView('signup');
  }

  logout() {
    if (confirm('Are you sure you want to logout?')) {
      this.authService.logout();
    }
  }

  changeLanguage(event: any) {
    this.languageService.setLanguage(event.target.value);
  }
}