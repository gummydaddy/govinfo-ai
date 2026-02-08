// src/services/language.service.ts

import { Injectable, inject } from '@angular/core';
import { StateService } from './state.service';
import { LanguageConfig } from '../models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private stateService = inject(StateService);
  
  // Available languages
  readonly availableLanguages: LanguageConfig[] = [
    { code: 'en', name: 'English', nativeName: 'English', enabled: true },
    { code: 'hi', name: 'Hindi', nativeName: 'हिंदी', enabled: true },
    { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', enabled: true },
    { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', enabled: true },
    { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', enabled: true },
    { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', enabled: true },
    { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', enabled: true },
    { code: 'mr', name: 'Marathi', nativeName: 'मराठी', enabled: true },
    { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', enabled: true },
  ];
  
  // UI translations (limited set for demo)
  private translations: { [lang: string]: { [key: string]: string } } = {
    en: {
      'welcome': 'Welcome to GovInfo AI',
      'start_session': 'Start Session',
      'admin_panel': 'Admin Panel',
      'login': 'Login',
      'signup': 'Sign Up',
      'logout': 'Logout',
      'search': 'Search',
      'send': 'Send',
      'save': 'Save',
      'cancel': 'Cancel',
      'delete': 'Delete',
      'edit': 'Edit',
      'back': 'Back',
      'next': 'Next',
      'skip': 'Skip',
      'country': 'Country',
      'state': 'State',
      'sector': 'Sector',
      'intent': 'Intent',
      'documents': 'Documents',
      'projects': 'Projects',
      'settings': 'Settings',
      'help': 'Help',
      'knowledge_base': 'Knowledge Base',
      'saved_projects': 'Saved Projects',
      'chat_history': 'Chat History',
      'api_key': 'API Key',
      'language': 'Language',
    },
    hi: {
      'welcome': 'गवइन्फो AI में आपका स्वागत है',
      'start_session': 'सत्र प्रारंभ करें',
      'admin_panel': 'प्रशासन पैनल',
      'login': 'लॉगिन',
      'signup': 'साइन अप',
      'logout': 'लॉगआउट',
      'search': 'खोजें',
      'send': 'भेजें',
      'save': 'सहेजें',
      'cancel': 'रद्द करें',
      'delete': 'हटाएं',
      'edit': 'संपादित करें',
      'back': 'पीछे',
      'next': 'आगे',
      'skip': 'छोड़ें',
      'country': 'देश',
      'state': 'राज्य',
      'sector': 'क्षेत्र',
      'intent': 'उद्देश्य',
      'documents': 'दस्तावेज़',
      'projects': 'परियोजनाएं',
      'settings': 'सेटिंग्स',
      'help': 'सहायता',
      'knowledge_base': 'ज्ञान आधार',
      'saved_projects': 'सहेजे गए प्रोजेक्ट',
      'chat_history': 'चैट इतिहास',
      'api_key': 'एपीआई कुंजी',
      'language': 'भाषा',
    }
  };
  
  /**
   * Get current language
   */
  getCurrentLanguage(): LanguageConfig {
    const currentCode = this.stateService.currentLanguage();
    return this.availableLanguages.find(l => l.code === currentCode) || this.availableLanguages[0];
  }
  
  /**
   * Set language
   */
  setLanguage(code: string) {
    const lang = this.availableLanguages.find(l => l.code === code);
    if (lang && lang.enabled) {
      this.stateService.setLanguage(code);
      
      this.stateService.addNotification({
        type: 'success',
        message: `Language changed to ${lang.nativeName}`,
        duration: 2000
      });
    }
  }
  
  /**
   * Translate a key
   */
  translate(key: string): string {
    const currentLang = this.stateService.currentLanguage();
    const langTranslations = this.translations[currentLang];
    
    if (langTranslations && langTranslations[key]) {
      return langTranslations[key];
    }
    
    // Fallback to English
    return this.translations['en'][key] || key;
  }
  
  /**
   * Get translation object for current language
   */
  getTranslations(): { [key: string]: string } {
    const currentLang = this.stateService.currentLanguage();
    return this.translations[currentLang] || this.translations['en'];
  }
  
  /**
   * Add custom translation
   */
  addTranslation(lang: string, key: string, value: string) {
    if (!this.translations[lang]) {
      this.translations[lang] = {};
    }
    this.translations[lang][key] = value;
  }
}
