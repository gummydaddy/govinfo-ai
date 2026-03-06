// src/services/document-extraction.service.ts - Document Text Extraction Service
// Supports PDF, DOCX, and Image (OCR) extraction

import { Injectable, signal } from '@angular/core';

/**
 * Result of document extraction
 */
export interface ExtractionResult {
  success: boolean;
  text: string;
  error?: string;
  metadata?: {
    pageCount?: number;
    language?: string;
    confidence?: number;
    fileType: string;
    fileName: string;
  };
}

/**
 * Supported file types for extraction
 */
export type SupportedFileType = 'pdf' | 'docx' | 'doc' | 'image' | 'unknown';

/**
 * Document Extraction Service
 * Extracts text from PDFs, DOCX files, and images using OCR
 * All processing happens client-side for privacy
 */
@Injectable({
  providedIn: 'root'
})
export class DocumentExtractionService {
  
  // Extraction state signals
  readonly isExtracting = signal(false);
  readonly progress = signal(0);
  readonly status = signal<string>('');

  // PDF.js worker - will be initialized lazily
  private pdfjsWorker: any = null;

  // Tesseract.js worker - will be initialized lazily
  private tesseractWorker: any = null;

  /**
   * Determine file type from MIME type or filename
   */
  getFileType(file: File): SupportedFileType {
    const mimeType = file.type.toLowerCase();
    const fileName = file.name.toLowerCase();

    if (mimeType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return 'pdf';
    }
    
    if (mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        fileName.endsWith('.docx')) {
      return 'docx';
    }
    
    if (mimeType === 'application/msword' || fileName.endsWith('.doc')) {
      return 'doc';
    }
    
    if (mimeType.startsWith('image/') || 
        fileName.endsWith('.jpg') || 
        fileName.endsWith('.jpeg') || 
        fileName.endsWith('.png') || 
        fileName.endsWith('.bmp') ||
        fileName.endsWith('.tiff') ||
        fileName.endsWith('.webp')) {
      return 'image';
    }

    return 'unknown';
  }

  /**
   * Main extraction method - routes to appropriate extractor
   */
  async extractText(file: File): Promise<ExtractionResult> {
    const fileType = this.getFileType(file);
    
    if (fileType === 'unknown') {
      return {
        success: false,
        text: '',
        error: `Unsupported file type: ${file.type || file.name}`,
        metadata: { fileType: 'unknown', fileName: file.name }
      };
    }

    this.isExtracting.set(true);
    this.progress.set(0);
    this.status.set('Starting extraction...');

    try {
      let result: ExtractionResult;

      switch (fileType) {
        case 'pdf':
          this.status.set('Extracting PDF text...');
          result = await this.extractFromPDF(file);
          break;
        case 'docx':
        case 'doc':
          this.status.set('Extracting Word document...');
          result = await this.extractFromDOCX(file);
          break;
        case 'image':
          this.status.set('Performing OCR on image...');
          result = await this.extractFromImage(file);
          break;
        default:
          result = {
            success: false,
            text: '',
            error: 'Unknown file type',
            metadata: { fileType: 'unknown', fileName: file.name }
          };
      }

      this.progress.set(100);
      this.status.set('Extraction complete');
      return result;

    } catch (error: any) {
      console.error('Extraction error:', error);
      return {
        success: false,
        text: '',
        error: error.message || 'Unknown extraction error',
        metadata: { fileType, fileName: file.name }
      };
    } finally {
      this.isExtracting.set(false);
    }
  }

  /**
   * Extract text from PDF using PDF.js
   */
  private async extractFromPDF(file: File): Promise<ExtractionResult> {
    try {
      // Dynamically import pdfjs-dist
      const pdfjsLib = await import('pdfjs-dist');
      
      // Set worker source - use the bundled worker from the package
      // This ensures version compatibility between API and worker
      pdfjsLib.GlobalWorkerOptions.workerSrc = 
        new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();

      // Read file as ArrayBuffer
      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      
      // Load PDF document
      this.progress.set(10);
      const pdf = await pdfjsLib.getDocument({ 
        data: arrayBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true
      }).promise;

      const pageCount = pdf.numPages;
      let fullText = '';
      
      // Extract text from each page
      for (let i = 1; i <= pageCount; i++) {
        this.progress.set(10 + Math.floor((i / pageCount) * 80));
        this.status.set(`Extracting page ${i} of ${pageCount}...`);
        
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        // Combine text items with proper spacing
        const pageText = textContent.items
          .filter((item: any) => 'str' in item)
          .map((item: any) => item.str)
          .join(' ');
        
        fullText += pageText + '\n\n';
      }

      // Clean up extracted text
      const cleanedText = this.cleanExtractedText(fullText);

      if (!cleanedText.trim()) {
        return {
          success: false,
          text: '',
          error: 'No text content found in PDF. The PDF may contain only images (scanned). Try using OCR for scanned documents.',
          metadata: { pageCount, fileType: 'pdf', fileName: file.name }
        };
      }

      return {
        success: true,
        text: cleanedText,
        metadata: { pageCount, fileType: 'pdf', fileName: file.name }
      };

    } catch (error: any) {
      console.error('PDF extraction error:', error);
      return {
        success: false,
        text: '',
        error: `PDF extraction failed: ${error.message}`,
        metadata: { fileType: 'pdf', fileName: file.name }
      };
    }
  }

  /**
   * Extract text from DOCX using mammoth.js
   */
  private async extractFromDOCX(file: File): Promise<ExtractionResult> {
    try {
      // Dynamically import mammoth
      const mammoth = await import('mammoth');

      // Read file as ArrayBuffer
      const arrayBuffer = await this.readFileAsArrayBuffer(file);
      
      // Extract raw text (ignores formatting but works reliably)
      const result = await mammoth.extractRawText({ arrayBuffer });
      
      const cleanedText = this.cleanExtractedText(result.value);

      if (!cleanedText.trim()) {
        return {
          success: false,
          text: '',
          error: 'No text content found in the Word document',
          metadata: { fileType: 'docx', fileName: file.name }
        };
      }

      return {
        success: true,
        text: cleanedText,
        metadata: { fileType: 'docx', fileName: file.name }
      };

    } catch (error: any) {
      console.error('DOCX extraction error:', error);
      return {
        success: false,
        text: '',
        error: `DOCX extraction failed: ${error.message}`,
        metadata: { fileType: 'docx', fileName: file.name }
      };
    }
  }

  /**
   * Extract text from images using Tesseract.js OCR
   */
  private async extractFromImage(file: File): Promise<ExtractionResult> {
    try {
      // Dynamically import tesseract.js
      const { createWorker } = await import('tesseract.js');

      this.progress.set(20);
      
      // Create worker
      if (!this.tesseractWorker) {
        this.status.set('Initializing OCR engine...');
        this.tesseractWorker = await createWorker('eng', 1, {
          logger: (m: any) => {
            if (m.status === 'recognizing text') {
              this.progress.set(20 + Math.floor(m.progress * 70));
              this.status.set(`OCR Progress: ${Math.floor(m.progress * 100)}%`);
            }
          }
        });
      } else {
        this.tesseractWorker.setParameters({
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?@#$%^&*()[]{}:;-_+/\\|\'" \t\n'
        });
      }

      this.progress.set(30);
      this.status.set('Performing OCR...');

      // Read file as base64
      const base64 = await this.readFileAsBase64(file);

      // Recognize text
      const { data: { text, confidence } } = await this.tesseractWorker.recognize(base64);

      const cleanedText = this.cleanExtractedText(text);

      if (!cleanedText.trim()) {
        return {
          success: false,
          text: '',
          error: 'No text detected in the image. The image may be empty or contain only graphics.',
          metadata: { confidence, fileType: 'image', fileName: file.name }
        };
      }

      return {
        success: true,
        text: cleanedText,
        metadata: { confidence, fileType: 'image', fileName: file.name }
      };

    } catch (error: any) {
      console.error('OCR error:', error);
      return {
        success: false,
        text: '',
        error: `OCR failed: ${error.message}`,
        metadata: { fileType: 'image', fileName: file.name }
      };
    }
  }

  /**
   * Clean up extracted text
   */
  private cleanExtractedText(text: string): string {
    return text
      // Remove excessive whitespace
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      // Replace multiple newlines with double newline
      .replace(/\n{3,}/g, '\n\n')
      // Replace multiple spaces with single space
      .replace(/[ \t]{2,}/g, ' ')
      // Remove page numbers that appear alone on a line
      .replace(/^\s*\d+\s*$/gm, '')
      // Trim each line
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .join('\n')
      .trim();
  }

  /**
   * Read file as ArrayBuffer
   */
  private readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as ArrayBuffer);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Read file as base64 data URL
   */
  private readFileAsBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Check if file needs extraction vs AI vision
   * Returns true if we should extract text first
   */
  shouldExtractText(file: File): boolean {
    const fileType = this.getFileType(file);
    // For PDFs and documents, always extract
    // For images, we can use both - extract for knowledgebase, send to AI for vision
    return fileType === 'pdf' || fileType === 'docx' || fileType === 'doc';
  }

  /**
   * Get supported file extensions
   */
  getSupportedExtensions(): string[] {
    return ['.pdf', '.docx', '.doc', '.jpg', '.jpeg', '.png', '.bmp', '.tiff', '.webp'];
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}

