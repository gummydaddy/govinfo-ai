// src/app.component.ts

import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StateService } from './services/state.services.js';
import { LandingComponent } from './components/landing.component';
import { LoginComponent } from './components/login.component';
import { SignupComponent } from './components/signup.component';
import { SetupComponent } from './components/setup.component';
import { ChatComponent } from './components/chat.component';
import { AdminComponent } from './components/admin.component';
import { SearchComponent } from './components/search.component';
import { OnboardingComponent } from './components/onboarding.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    LandingComponent,
    LoginComponent,
    SignupComponent,
    SetupComponent,
    ChatComponent,
    AdminComponent,
    SearchComponent,
    OnboardingComponent
  ],
  template: `
    <div class="relative w-full h-screen overflow-hidden">
      
      <!-- Notifications Container -->
      <div class="fixed top-4 right-4 z-50 space-y-2">
        @for (notification of stateService.notifications(); track notification.id) {
          <div 
            class="px-4 py-3 rounded border animate-slideUp max-w-sm"
            [class.bg-green-900]="notification.type === 'success'"
            [class.border-green-500]="notification.type === 'success'"
            [class.bg-red-900]="notification.type === 'error'"
            [class.border-red-500]="notification.type === 'error'"
            [class.bg-yellow-900]="notification.type === 'warning'"
            [class.border-yellow-500]="notification.type === 'warning'"
            [class.bg-blue-900]="notification.type === 'info'"
            [class.border-blue-500]="notification.type === 'info'"
          >
            <div class="flex items-start justify-between gap-3">
              <p class="text-sm text-white flex-1">{{ notification.message }}</p>
              <button 
                (click)="stateService.removeNotification(notification.id)"
                class="text-gray-400 hover:text-white text-lg leading-none"
              >
                ×
              </button>
            </div>
          </div>
        }
      </div>

      <!-- Main Content Router -->
      <main class="w-full h-full">
        @switch (stateService.currentView()) {
          @case ('landing') {
            <app-landing />
          }
          @case ('login') {
            <app-login />
          }
          @case ('signup') {
            <app-signup />
          }
          @case ('setup') {
            <app-setup />
          }
          @case ('chat') {
            <app-chat />
          }
          @case ('admin') {
            <app-admin />
          }
          @case ('search') {
            <app-search />
          }
          @case ('onboarding') {
            <app-onboarding />
          }
        }
      </main>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100vh;
    }
  `]
})
export class AppComponent {
  stateService = inject(StateService);
}
