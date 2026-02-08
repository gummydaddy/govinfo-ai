// src/services/state.service.ts

import { Injectable, signal, computed } from '@angular/core';
import {
  User,
  DocMetadata,
  UserContext,
  ChatMessage,
  SavedProject,
  AppView,
  Notification
} from '../models/interfaces';

@Injectable({
  providedIn: 'root'
})
export class StateService {
  
  // ========== NAVIGATION STATE ==========
  readonly currentView = signal<AppView>('landing');
  
  // ========== AUTHENTICATION STATE ==========
  readonly currentUser = signal<User | null>(null);
  
  // ========== CONFIGURATION STATE ==========
  readonly apiKey = signal<string>('');
  readonly googleMapsApiKey = signal<string>('');
  readonly currentLanguage = signal<string>('en');
  
  // ========== USER CONTEXT STATE ==========
  readonly userContext = signal<UserContext>({
    country: 'India',
    state: '',
    sector: '',
    intent: ''
  });
  
  // ========== KNOWLEDGE BASE STATE ==========
  readonly documents = signal<DocMetadata[]>([
    // Default Reference Documents
    {
      id: 'doc-1',
      title: 'Maharashtra Industrial Policy 2019',
      country: 'India',
      state: 'Maharashtra',
      ministry: 'Industries Department',
      type: 'Policy',
      priority: 'High',
      uploadDate: new Date('2019-01-01').toISOString(),
      validityPeriod: '2019-2024',
      sourceAuthority: 'Government of Maharashtra',
      content: `
MAHARASHTRA INDUSTRIAL POLICY 2019

1. OBJECTIVES:
   - Achieve manufacturing sector growth rate of 12-13%
   - Create 4 million direct jobs
   - Attract investments worth INR 5 lakh crores
   - Focus on Make in India initiative

2. INCENTIVES FOR MSMEs:
   - Power Tariff Subsidy: INR 1 per unit for 3 years in Vidarbha, Marathwada, North Maharashtra
   - Interest Subsidy: 5% p.a. on term loans, maximum INR 5 lakhs
   - Stamp Duty Exemption: 100% in C, D, D+ areas; 50% in A, B areas
   - GST Reimbursement: Up to 100% for 7 years in backward regions

3. FACTORY SETUP REQUIREMENTS:
   - Land Allotment: Priority in MIDC industrial areas
   - Environmental Clearance: Required for red category industries
   - Factory License: Under Factories Act 1948
   - Fire NOC: Mandatory for all units
   - Labour Registration: Under various labour laws

4. ELIGIBILITY CRITERIA:
   - Must be registered with Udyam Registration (formerly Udyog Aadhaar)
   - Must commence production within the policy period
   - Should create minimum employment as per category
   - Compliance with environmental and labour laws

5. APPLICATION PROCESS:
   - Online portal: invest.maharashtra.gov.in
   - Single Window Clearance System
   - Timeline: 30-60 days for approvals
   - Documents Required: Project Report, Land documents, PAN, GST registration
      `,
      tags: ['manufacturing', 'msme', 'incentives', 'maharashtra']
    },
    {
      id: 'doc-2',
      title: 'Startup India Action Plan',
      country: 'India',
      state: 'All',
      ministry: 'Ministry of Commerce and Industry',
      type: 'Scheme',
      priority: 'High',
      uploadDate: new Date('2016-01-16').toISOString(),
      validityPeriod: 'Ongoing',
      sourceAuthority: 'Department for Promotion of Industry and Internal Trade (DPIIT)',
      content: `
STARTUP INDIA ACTION PLAN

1. DEFINITION OF STARTUP:
   - Entity incorporated or registered in India
   - Not older than 10 years from date of incorporation
   - Annual turnover less than INR 100 crores
   - Working towards innovation, development or improvement of products/processes
   - Not formed by splitting up or reconstruction of existing business

2. TAX EXEMPTIONS:
   - Income Tax exemption for 3 consecutive years out of 10 years (Section 80-IAC)
   - Exemption on Capital Gains Tax (Section 54EE)
   - Exemption from Angel Tax for DPIIT recognized startups
   - Tax holiday on profits for eligible startups

3. SELF-CERTIFICATION:
   - Startups can self-certify compliance with 6 Labour Laws
   - Self-certification for 3 Environmental Laws
   - No inspection for 5 years (except on credible complaint)
   - Reduced compliance burden for ease of doing business

4. PATENT SUPPORT:
   - 80% rebate in patent filing fees for startups
   - Fast-track patent examination (expedited processing)
   - Panel of facilitators to assist with patent applications
   - Support for filing international patents

5. FUNDING SUPPORT:
   - Fund of Funds with corpus of INR 10,000 crores
   - Credit Guarantee Scheme through SIDBI
   - Support through NIDHI (National Initiative for Developing and Harnessing Innovations)

6. REGISTRATION PROCESS:
   - Register on https://www.startupindia.gov.in
   - Upload incorporation certificate and details
   - Get DPIIT recognition certificate
   - Access to various benefits and schemes
      `,
      tags: ['startup', 'tax', 'innovation', 'dpiit', 'national']
    },
    {
      id: 'doc-3',
      title: 'REFERENCE DPR: 200 KLPD Ethanol Plant with 4.8 MW Power Plant',
      country: 'India',
      state: 'Uttar Pradesh',
      ministry: 'Ministry of Petroleum & Natural Gas',
      type: 'DPR Template',
      priority: 'High',
      uploadDate: new Date('2023-06-01').toISOString(),
      validityPeriod: 'Reference Document',
      sourceAuthority: 'Marubhumi Marketing Pvt Ltd',
      content: `
DETAILED PROJECT REPORT
PROJECT: Grain Based 200 KLPD Fuel Ethanol Plant (140 Ethanol + 60 ENA) & 4.80 MW Co-Generation Power Plant

COMPANY: Marubhumi Marketing Pvt Ltd (Tescon Energy and Infrastructure)
LOCATION: D5, D6 Industrial Estate, Khalilabad, Sant Kabir Nagar, Uttar Pradesh
TOTAL PROJECT COST: Rs. 609.51 Crores

1. EXECUTIVE SUMMARY:
   - Capacity: 200 KLPD (Kilo Litres Per Day) Fuel Ethanol
   - Power Generation: 4.80 MW (Megawatt) Co-generation
   - Raw Material: Multi-feed grains (Broken Rice, Maize, FCI Rice)
   - By-products: CO2, DDGS (Distillers Dried Grains with Solubles)
   - Employment: 500+ direct, 1000+ indirect jobs
   - Zero Liquid Discharge (ZLD) plant

2. PROJECT OVERVIEW:
   - Objective: Support Government's 20% ethanol blending target by 2025
   - Technology: Advanced fermentation and multi-pressure distillation
   - Environmental: Zero effluent discharge, air pollution control
   - Energy Efficiency: Maximum heat integration and recovery

3. PROCESS DESCRIPTION:
   
   A. GRAIN RECEPTION & STORAGE:
      - Capacity: 30 days storage
      - Quality testing laboratory
      - Automated material handling
   
   B. MILLING SECTION:
      - Hammer mills for grain crushing
      - Capacity: 500 TPD (Tonnes Per Day)
   
   C. LIQUEFACTION:
      - Conversion of starch to sugar
      - Continuous process with lees recycling
      - Efficiency: 95%+
   
   D. FERMENTATION:
      - Yeast-based fermentation
      - Duration: 48-60 hours
      - Alcohol yield: 92% efficiency
      - Temperature controlled vessels
   
   E. DISTILLATION:
      - Multi-pressure distillation columns
      - Maximum heat integration
      - Purity: 99.5% ethanol
      - Molecular sieve dehydration
   
   F. EVAPORATION & DRYING:
      - 5-effect falling film evaporator
      - DDGS dryer (Distillers Dried Grains with Solubles)
      - By-product recovery
   
   G. CO2 RECOVERY:
      - Food grade CO2 production
      - Capacity: 150 TPD

4. UTILITIES & INFRASTRUCTURE:
   
   A. BOILER:
      - Capacity: 42 TPH (Tonnes Per Hour)
      - Pressure: 3.5 kg/cm²
      - Fuel: Rice husk / Coal
      - Emission: ESP (Electrostatic Precipitator)
   
   B. TURBINE & POWER:
      - 4.80 MW Back Pressure Turbine
      - Captive power generation
      - Grid connectivity for surplus power
   
   C. WATER:
      - Total requirement: 2862 KLD (Kilo Litres Per Day)
      - Fresh water: 803 KLD
      - Recycled water: 2059 KLD
      - Zero liquid discharge system
   
   D. COOLING TOWER:
      - Capacity: 1500 TR (Tonnes of Refrigeration)
      - Induced draft type
   
   E. EFFLUENT TREATMENT:
      - Primary, secondary, tertiary treatment
      - MEE (Multiple Effect Evaporator) for spent wash
      - ZLD (Zero Liquid Discharge) compliance

5. LAND & CIVIL WORKS:
   - Total Land: 25 acres
   - Built-up Area: 15,000 sq.m
   - Roads and drainage
   - Boundary wall and security
   - Office and laboratory building
   - Worker facilities

6. FINANCIAL BREAKDOWN:
   
   A. CAPITAL COST (in Lakhs INR):
      - Land & Development: 8,000
      - Civil Construction: 5,500
      - Plant & Machinery: 45,651
      - Utilities & Infrastructure: 6,800
      - Pre-operative Expenses: 1,500
      - Working Capital: 2,500
      - TOTAL: 60,951 Lakhs (Rs. 609.51 Crores)
   
   B. OPERATING COST (Annual):
      - Raw Material: 400 Crores
      - Utilities: 50 Crores
      - Manpower: 15 Crores
      - Maintenance: 10 Crores
      - Others: 5 Crores
   
   C. REVENUE (Annual):
      - Ethanol Sales: 500 Crores
      - DDGS Sales: 40 Crores
      - CO2 Sales: 15 Crores
      - Power Export: 10 Crores
      - TOTAL: 565 Crores

7. REQUIRED INPUTS FOR NEW DPR GENERATION:
   - Land ownership proof documents
   - Topographical survey / CAD map of land
   - Circle rate of the area (land valuation)
   - Soil classification report
   - Water source and availability
   - Power connectivity details
   - Road/rail/port connectivity
   - Project capacity requirements
   - Raw material sourcing plan

8. ENVIRONMENTAL COMPLIANCE:
   - Environmental Clearance (EC) from SPCB
   - Consent to Establish (CTE)
   - Consent to Operate (CTO)
   - Air Quality monitoring
   - Water Quality monitoring
   - Hazardous waste management
   - Green belt development

9. STATUTORY APPROVALS:
   - Factory License
   - Fire NOC
   - Building Plan Approval
   - Pollution Control Board NOC
   - Electrical Inspector Approval
   - Explosives License (if required)
   - Trade License

10. TIMELINE:
    - Land Acquisition: 3 months
    - Design & Engineering: 4 months
    - Civil Construction: 12 months
    - Equipment Procurement: 14 months
    - Installation & Commissioning: 6 months
    - TOTAL PROJECT DURATION: 24 months
      `,
      tags: ['dpr', 'ethanol', 'power-plant', 'biofuel', 'reference']
    },
    {
      id: 'doc-4',
      title: 'Delhi Startup Policy 2022',
      country: 'India',
      state: 'Delhi',
      ministry: 'Department of IT & E-Governance',
      type: 'Policy',
      priority: 'Medium',
      uploadDate: new Date('2022-03-01').toISOString(),
      content: `
DELHI STARTUP POLICY 2022

1. Vision: Make Delhi the Startup Capital of India
2. Support for 10,000+ startups by 2030
3. Financial assistance up to INR 20 lakhs per startup
4. Incubation support and mentorship programs
5. Preference in government procurement
      `,
      tags: ['delhi', 'startup', 'policy']
    },
    {
      id: 'doc-5',
      title: 'Karnataka Industrial Policy 2020-2025',
      country: 'India',
      state: 'Karnataka',
      ministry: 'Department of Commerce and Industries',
      type: 'Policy',
      priority: 'Medium',
      uploadDate: new Date('2020-04-01').toISOString(),
      content: `
KARNATAKA INDUSTRIAL POLICY 2020-2025

1. Objective: Position Karnataka as preferred investment destination
2. Special focus on Electronics, Aerospace, Biotechnology
3. Incentives: Capital subsidy up to 15% for new units
4. Skill development and training support
5. Infrastructure development in industrial areas
      `,
      tags: ['karnataka', 'industry', 'investment']
    }
  ]);
  
  // ========== CHAT STATE ==========
  readonly chatHistory = signal<ChatMessage[]>([]);
  
  // ========== PROJECTS STATE ==========
  readonly savedProjects = signal<SavedProject[]>([]);
  
  // ========== NOTIFICATIONS STATE ==========
  readonly notifications = signal<Notification[]>([]);
  
  // ========== ONBOARDING STATE ==========
  readonly hasCompletedOnboarding = signal<boolean>(false);
  
  // ========== COMPUTED STATE ==========
  
  /**
   * Get documents relevant to current user context
   */
  readonly relevantDocs = computed(() => {
    const ctx = this.userContext();
    const allDocs = this.documents();
    
    return allDocs.filter(doc => 
      (doc.country === ctx.country) && 
      (doc.state === 'All' || doc.state === ctx.state || ctx.state === '')
    );
  });
  
  /**
   * Get available states from documents
   */
  readonly availableStates = computed(() => {
    const docs = this.documents();
    const states = new Set<string>(['Maharashtra', 'Karnataka', 'Delhi']);
    
    docs.forEach(doc => {
      if (doc.state && doc.state !== 'All' && doc.state.trim()) {
        states.add(doc.state);
      }
    });
    
    return Array.from(states).sort();
  });
  
  /**
   * Get available countries from documents
   */
  readonly availableCountries = computed(() => {
    const docs = this.documents();
    const countries = new Set<string>();
    
    docs.forEach(doc => {
      if (doc.country) {
        countries.add(doc.country);
      }
    });
    
    return Array.from(countries).sort();
  });
  
  // ========== CONSTRUCTOR ==========
  constructor() {
    this.loadFromLocalStorage();
  }
  
  // ========== PUBLIC METHODS ==========
  
  // --- Navigation ---
  setView(view: AppView) {
    this.currentView.set(view);
  }
  
  // --- Authentication ---
  setCurrentUser(user: User | null) {
    this.currentUser.set(user);
    if (user) {
      localStorage.setItem('govinfo_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('govinfo_user');
    }
  }
  
  // --- Configuration ---
  setApiKey(key: string) {
    this.apiKey.set(key);
    localStorage.setItem('govinfo_api_key', key);
  }
  
  setGoogleMapsApiKey(key: string) {
    this.googleMapsApiKey.set(key);
    localStorage.setItem('govinfo_maps_key', key);
  }
  
  setLanguage(lang: string) {
    this.currentLanguage.set(lang);
    localStorage.setItem('govinfo_language', lang);
  }
  
  // --- User Context ---
  updateContext(ctx: UserContext) {
    this.userContext.set(ctx);
    localStorage.setItem('govinfo_context', JSON.stringify(ctx));
  }
  
  // --- Documents ---
  addDocument(doc: DocMetadata) {
    this.documents.update(docs => [doc, ...docs]);
    this.saveDocumentsToLocalStorage();
  }
  
  updateDocument(id: string, updates: Partial<DocMetadata>) {
    this.documents.update(docs => 
      docs.map(doc => doc.id === id ? { ...doc, ...updates } : doc)
    );
    this.saveDocumentsToLocalStorage();
  }
  
  deleteDocument(id: string) {
    this.documents.update(docs => docs.filter(doc => doc.id !== id));
    this.saveDocumentsToLocalStorage();
  }
  
  // --- Chat ---
  addMessage(msg: ChatMessage) {
    this.chatHistory.update(hist => [...hist, msg]);
  }
  
  clearChat() {
    this.chatHistory.set([]);
  }
  
  // --- Projects ---
  saveCurrentProject(name: string) {
    const project: SavedProject = {
      id: this.generateId(),
      name,
      date: Date.now(),
      context: this.userContext(),
      history: this.chatHistory(),
      language: this.currentLanguage()
    };
    
    this.savedProjects.update(projects => {
      const updated = [project, ...projects];
      localStorage.setItem('govinfo_projects', JSON.stringify(updated));
      return updated;
    });
  }
  
  loadProject(project: SavedProject) {
    this.userContext.set(project.context);
    this.chatHistory.set(project.history);
    if (project.language) {
      this.setLanguage(project.language);
    }
    this.setView('chat');
  }
  
  deleteProject(id: string) {
    this.savedProjects.update(projects => {
      const updated = projects.filter(p => p.id !== id);
      localStorage.setItem('govinfo_projects', JSON.stringify(updated));
      return updated;
    });
  }
  
  // --- Notifications ---
  addNotification(notification: Omit<Notification, 'id' | 'timestamp'>) {
    const newNotification: Notification = {
      ...notification,
      id: this.generateId(),
      timestamp: Date.now()
    };
    
    this.notifications.update(notifs => [...notifs, newNotification]);
    
    // Auto-remove after duration
    if (notification.duration) {
      setTimeout(() => {
        this.removeNotification(newNotification.id);
      }, notification.duration);
    }
  }
  
  removeNotification(id: string) {
    this.notifications.update(notifs => notifs.filter(n => n.id !== id));
  }
  
  // --- Onboarding ---
  completeOnboarding() {
    this.hasCompletedOnboarding.set(true);
    localStorage.setItem('govinfo_onboarding_complete', 'true');
  }
  
  // ========== PRIVATE METHODS ==========
  
  private loadFromLocalStorage() {
    // Load API Key
    const apiKey = localStorage.getItem('govinfo_api_key');
    if (apiKey) {
      this.apiKey.set(apiKey);
    }
    
    // Load Maps Key
    const mapsKey = localStorage.getItem('govinfo_maps_key');
    if (mapsKey) {
      this.googleMapsApiKey.set(mapsKey);
    }
    
    // Load Language
    const language = localStorage.getItem('govinfo_language');
    if (language) {
      this.currentLanguage.set(language);
    }
    
    // Load User
    const userStr = localStorage.getItem('govinfo_user');
    if (userStr) {
      try {
        this.currentUser.set(JSON.parse(userStr));
      } catch (e) {
        console.error('Failed to load user', e);
      }
    }
    
    // Load Context
    const contextStr = localStorage.getItem('govinfo_context');
    if (contextStr) {
      try {
        this.userContext.set(JSON.parse(contextStr));
      } catch (e) {
        console.error('Failed to load context', e);
      }
    }
    
    // Load Projects
    const projectsStr = localStorage.getItem('govinfo_projects');
    if (projectsStr) {
      try {
        this.savedProjects.set(JSON.parse(projectsStr));
      } catch (e) {
        console.error('Failed to load projects', e);
      }
    }
    
    // Load Documents (optional - documents can also come from backend)
    const docsStr = localStorage.getItem('govinfo_documents');
    if (docsStr) {
      try {
        const loadedDocs = JSON.parse(docsStr);
        // Merge with default documents
        const defaultIds = this.documents().map(d => d.id);
        const newDocs = loadedDocs.filter((d: DocMetadata) => !defaultIds.includes(d.id));
        this.documents.update(docs => [...docs, ...newDocs]);
      } catch (e) {
        console.error('Failed to load documents', e);
      }
    }
    
    // Load Onboarding Status
    const onboarding = localStorage.getItem('govinfo_onboarding_complete');
    if (onboarding === 'true') {
      this.hasCompletedOnboarding.set(true);
    }
  }
  
  private saveDocumentsToLocalStorage() {
    try {
      localStorage.setItem('govinfo_documents', JSON.stringify(this.documents()));
    } catch (e) {
      console.error('Failed to save documents', e);
    }
  }
  
  private generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }
}
