// src/services/voice.service.ts

import { Injectable, inject, signal } from '@angular/core';
import { StateService } from './state.service';

@Injectable({
  providedIn: 'root'
})
export class VoiceService {
  private stateService = inject(StateService);
  
  // Speech Recognition
  private recognition: any = null;
  private synthesis: SpeechSynthesis | null = null;
  
  // State
  readonly isListening = signal<boolean>(false);
  readonly isSupported = signal<boolean>(false);
  readonly transcript = signal<string>('');
  readonly interimTranscript = signal<string>('');
  
  constructor() {
    this.checkBrowserSupport();
    this.initializeSpeechRecognition();
    this.initializeSpeechSynthesis();
  }
  
  // ========== SPEECH RECOGNITION (Speech-to-Text) ==========
  
  /**
   * Start listening
   */
  startListening(): void {
    if (!this.isSupported()) {
      this.stateService.addNotification({
        type: 'error',
        message: 'Speech recognition is not supported in your browser. Please use Chrome or Edge.',
        duration: 5000
      });
      return;
    }
    
    if (this.isListening()) {
      return;
    }
    
    try {
      this.transcript.set('');
      this.interimTranscript.set('');
      this.recognition.start();
      this.isListening.set(true);
      
      this.stateService.addNotification({
        type: 'info',
        message: 'Listening... Speak now',
        duration: 2000
      });
    } catch (error: any) {
      console.error('Error starting speech recognition:', error);
      this.stateService.addNotification({
        type: 'error',
        message: 'Failed to start listening. Please try again.',
        duration: 3000
      });
    }
  }
  
  /**
   * Stop listening
   */
  stopListening(): void {
    if (!this.isListening()) {
      return;
    }
    
    try {
      this.recognition.stop();
      this.isListening.set(false);
      
      this.stateService.addNotification({
        type: 'success',
        message: 'Stopped listening',
        duration: 2000
      });
    } catch (error: any) {
      console.error('Error stopping speech recognition:', error);
    }
  }
  
  /**
   * Get final transcript
   */
  getTranscript(): string {
    return this.transcript();
  }
  
  /**
   * Clear transcript
   */
  clearTranscript(): void {
    this.transcript.set('');
    this.interimTranscript.set('');
  }
  
  // ========== SPEECH SYNTHESIS (Text-to-Speech) ==========
  
  /**
   * Speak text
   */
  speak(text: string, lang?: string): void {
    if (!this.synthesis) {
      this.stateService.addNotification({
        type: 'error',
        message: 'Speech synthesis not available',
        duration: 3000
      });
      return;
    }
    
    // Cancel any ongoing speech
    this.synthesis.cancel();
    
    // Create utterance
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Set language based on current app language or provided lang
    const currentLang = lang || this.stateService.currentLanguage();
    utterance.lang = this.getLangCode(currentLang);
    
    // Set voice properties
    utterance.rate = 0.9; // Slightly slower for clarity
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    
    // Try to find appropriate voice
    const voices = this.synthesis.getVoices();
    const voice = voices.find(v => v.lang.startsWith(utterance.lang)) || voices[0];
    if (voice) {
      utterance.voice = voice;
    }
    
    // Event handlers
    utterance.onstart = () => {
      this.stateService.addNotification({
        type: 'info',
        message: 'Speaking...',
        duration: 1000
      });
    };
    
    utterance.onerror = (event: any) => {
      console.error('Speech synthesis error:', event);
      this.stateService.addNotification({
        type: 'error',
        message: 'Failed to speak text',
        duration: 3000
      });
    };
    
    // Speak
    this.synthesis.speak(utterance);
  }
  
  /**
   * Stop speaking
   */
  stopSpeaking(): void {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
  }
  
  /**
   * Check if currently speaking
   */
  isSpeaking(): boolean {
    return this.synthesis ? this.synthesis.speaking : false;
  }
  
  // ========== PRIVATE METHODS ==========
  
  private checkBrowserSupport(): void {
    // Check for Web Speech API support
    const hasRecognition = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
    const hasSynthesis = 'speechSynthesis' in window;
    
    this.isSupported.set(hasRecognition && hasSynthesis);
  }
  
  private initializeSpeechRecognition(): void {
    if (!this.isSupported()) {
      return;
    }
    
    // Create recognition instance
    const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    this.recognition = new SpeechRecognition();
    
    // Configure
    const currentLang = this.stateService.currentLanguage();
    this.recognition.lang = this.getLangCode(currentLang);
    this.recognition.continuous = true; // Keep listening
    this.recognition.interimResults = true; // Show interim results
    this.recognition.maxAlternatives = 1;
    
    // Event handlers
    this.recognition.onresult = (event: any) => {
      let interim = '';
      let final = this.transcript();
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        
        if (event.results[i].isFinal) {
          final += (final ? ' ' : '') + transcript;
        } else {
          interim += (interim ? ' ' : '') + transcript;
        }
      }
      
      this.transcript.set(final);
      this.interimTranscript.set(interim);
    };
    
    this.recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      this.isListening.set(false);
      
      let errorMessage = 'Speech recognition error';
      
      switch (event.error) {
        case 'no-speech':
          errorMessage = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          errorMessage = 'Microphone not available. Please check permissions.';
          break;
        case 'not-allowed':
          errorMessage = 'Microphone access denied. Please enable microphone permissions.';
          break;
        case 'network':
          errorMessage = 'Network error. Please check your connection.';
          break;
      }
      
      this.stateService.addNotification({
        type: 'error',
        message: errorMessage,
        duration: 4000
      });
    };
    
    this.recognition.onend = () => {
      this.isListening.set(false);
    };
  }
  
  private initializeSpeechSynthesis(): void {
    if ('speechSynthesis' in window) {
      this.synthesis = window.speechSynthesis;
      
      // Load voices
      if (this.synthesis.getVoices().length === 0) {
        this.synthesis.onvoiceschanged = () => {
          // Voices loaded
        };
      }
    }
  }
  
  private getLangCode(appLang: string): string {
    // Map app language codes to Speech API language codes
    const langMap: { [key: string]: string } = {
      'en': 'en-US',
      'hi': 'hi-IN',
      'ta': 'ta-IN',
      'te': 'te-IN',
      'kn': 'kn-IN',
      'ml': 'ml-IN',
      'bn': 'bn-IN',
      'mr': 'mr-IN',
      'gu': 'gu-IN'
    };
    
    return langMap[appLang] || 'en-US';
  }
}
