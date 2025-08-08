// src/app/core/services/barcode.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

// Import Quagga2 - Better barcode scanner than original Quagga
declare const Quagga: any;

@Injectable({
  providedIn: 'root'
})
export class BarcodeService {
  private isScanning = false;
  private scannerInitialized = false;
  private currentCallback: ((barcode: string) => void) | null = null;
  private currentStream: MediaStream | null = null;
  
  // Scanner status
  private scannerStatusSubject = new BehaviorSubject<{
    isActive: boolean;
    isSupported: boolean;
    error?: string;
  }>({
    isActive: false,
    isSupported: this.isCameraSupported()
  });

  constructor() {
    this.initializeScanner();
  }

  /**
   * Get scanner status observable
   */
  getScannerStatus(): Observable<any> {
    return this.scannerStatusSubject.asObservable();
  }

  /**
   * Check if camera is supported
   */
  private isCameraSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /**
   * Initialize Quagga2 scanner
   */
  private initializeScanner(): void {
    try {
      this.updateScannerStatus({
        isActive: false,
        isSupported: true
      });
    } catch (error) {
      console.error('Failed to initialize scanner:', error);
      this.updateScannerStatus({
        isActive: false,
        isSupported: false,
        error: 'Scanner initialization failed'
      });
    }
  }

  /**
   * Start barcode scanner using Quagga2
   */
  async startScanner(callback: (barcode: string) => void, targetElementId: string = 'barcode-scanner'): Promise<void> {
    if (this.isScanning) {
      console.warn('Scanner is already running');
      return;
    }

    if (!this.isCameraSupported()) {
      throw new Error('Camera not supported on this device');
    }

    if (typeof Quagga === 'undefined') {
      // Try to load Quagga2 dynamically
      try {
        await this.loadQuagga2();
      } catch (error) {
        throw new Error('Quagga2 library not available');
      }
    }

    try {
      this.currentCallback = callback;
      
      await this.initializeQuagga2(targetElementId);
      
      this.isScanning = true;
      this.scannerInitialized = true;
      
      this.updateScannerStatus({
        isActive: true,
        isSupported: true
      });

      console.log('Quagga2 barcode scanner started successfully');
      
    } catch (rawError) {
      const errMsg = rawError instanceof Error
        ? rawError.message
        : String(rawError);
      console.error('Failed to start barcode scanner:', rawError);

      this.updateScannerStatus({
        isActive: false,
        isSupported: true,
        error: `Failed to start scanner: ${errMsg}`
      });
      throw rawError;
    }
  }

  /**
   * Stop barcode scanner
   */
  stopScanner(): void {
    if (!this.isScanning) {
      return;
    }

    try {
      // Stop Quagga2 scanner
      if (typeof Quagga !== 'undefined' && this.scannerInitialized) {
        Quagga.stop();
        Quagga.offDetected();
        Quagga.offProcessed();
      }

      // Stop media stream if exists
      if (this.currentStream) {
        this.currentStream.getTracks().forEach(track => track.stop());
        this.currentStream = null;
      }

      this.isScanning = false;
      this.scannerInitialized = false;
      this.currentCallback = null;

      this.updateScannerStatus({
        isActive: false,
        isSupported: true
      });

      console.log('Quagga2 barcode scanner stopped');
      
    } catch (error) {
      console.error('Error stopping barcode scanner:', error);
    }
  }

  /**
   * Load Quagga2 library dynamically - Use CDN fallback
   */
  private async loadQuagga2(): Promise<void> {
    // Check if Quagga is already available
    if (typeof (window as any).Quagga !== 'undefined') {
      return;
    }

    // Load from CDN as fallback
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/@ericblade/quagga2@1.8.3/dist/quagga.min.js';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load Quagga2 from CDN'));
      document.head.appendChild(script);
    });
  }

  /**
   * Initialize Quagga2 scanner
   */
  private async initializeQuagga2(targetElementId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const targetEl = document.getElementById(targetElementId);
      if (!targetEl) {
        reject(new Error(`Scanner target element '#${targetElementId}' not found in DOM. Make sure the scanner component is rendered.`));
        return;
      }

      console.log('Found scanner target element:', targetEl);

      const config = {
        inputStream: {
          name: "Live",
          type: "LiveStream",
          // Pass real HTMLElement for Quagga2 to attach its video/canvas elements
          target: targetEl,
          constraints: {
            width: 640,
            height: 480,
            facingMode: "environment", // Use back camera
            aspectRatio: 4/3
          }
        },
        locator: {
          patchSize: "medium",
          halfSample: true
        },
        numOfWorkers: 2,
        frequency: 10,
        decoder: {
          readers: [
            "code_128_reader",
            "ean_reader",
            "ean_8_reader",
            "code_39_reader",
            "upc_reader",
            "upc_e_reader",
            "codabar_reader"
          ],
          debug: {
            showCanvas: false,
            showPatches: false,
            showFoundPatches: false,
            showSkeleton: false,
            showLabels: false,
            showPatchLabels: false,
            showRemainingPatchLabels: false,
            boxFromPatches: {
              showTransformed: false,
              showTransformedBox: false,
              showBB: false
            }
          }
        }
      };

      Quagga.init(config, (err: any) => {
        if (err) {
          console.error('Quagga2 initialization failed:', err);
          reject(err);
          return;
        }

        // Set up event listeners
        this.setupQuagga2EventListeners();
        
        Quagga.start();
        resolve();
      });
    });
  }

  /**
   * Setup Quagga2 event listeners
   */
  private setupQuagga2EventListeners(): void {
    // Barcode detected event
    Quagga.onDetected((result: any) => {
      const code = result.codeResult.code;
      
      if (this.isValidBarcode(code) && this.currentCallback) {
        console.log('Barcode detected with Quagga2:', code);
        this.currentCallback(code);
        
        // Optional: Stop scanner after successful scan
        // this.stopScanner();
      }
    });

    // Processing event (optional - for debugging)
    Quagga.onProcessed((result: any) => {
      // You can add visual feedback here if needed
      if (result) {
        // Handle processing result
      }
    });
  }

  /**
   * Validate barcode format
   */
  private isValidBarcode(code: string): boolean {
    // Basic validation - adjust based on your barcode format requirements
    if (!code || code.length < 6) {
      return false;
    }

    // Remove any non-alphanumeric characters
    const cleanCode = code.replace(/[^a-zA-Z0-9]/g, '');
    
    // Check if it's not just repeated characters
    const firstChar = cleanCode.charAt(0);
    if (cleanCode.split('').every(char => char === firstChar)) {
      return false;
    }

    return true;
  }

  /**
   * Update scanner status
   */
  private updateScannerStatus(status: any): void {
    this.scannerStatusSubject.next(status);
  }

  /**
   * Check if scanner is currently active
   */
  isActive(): boolean {
    return this.isScanning;
  }

  /**
   * Get available cameras
   */
  async getAvailableCameras(): Promise<MediaDeviceInfo[]> {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      throw new Error('Camera enumeration not supported');
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter(device => device.kind === 'videoinput');
    } catch (error) {
      console.error('Error getting available cameras:', error);
      throw error;
    }
  }

  /**
   * Switch camera (front/back)
   */
  async switchCamera(deviceId?: string): Promise<void> {
    if (!this.isScanning) {
      throw new Error('Scanner is not active');
    }

    this.stopScanner();
    
    // Wait a bit before restarting with new camera
    setTimeout(async () => {
      try {
        if (this.currentCallback) {
          await this.startScanner(this.currentCallback);
        }
      } catch (error) {
        console.error('Error switching camera:', error);
      }
    }, 500);
  }

  /**
   * Test barcode scanner functionality
   */
  async testScanner(): Promise<boolean> {
    try {
      const cameras = await this.getAvailableCameras();
      return cameras.length > 0 && this.isCameraSupported();
    } catch (error) {
      console.error('Scanner test failed:', error);
      return false;
    }
  }

  /**
   * Generate test barcode for debugging
   */
  generateTestBarcode(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8);
    return `TEST${timestamp.slice(-6)}${random.toUpperCase()}`;
  }

  /**
   * Manual barcode validation
   */
  validateManualBarcode(barcode: string): {
    isValid: boolean;
    format?: string;
    error?: string;
  } {
    if (!barcode || barcode.trim().length === 0) {
      return {
        isValid: false,
        error: 'Barcode cannot be empty'
      };
    }

    const cleanBarcode = barcode.trim().toUpperCase();

    // Check length
    if (cleanBarcode.length < 6 || cleanBarcode.length > 20) {
      return {
        isValid: false,
        error: 'Barcode length must be between 6 and 20 characters'
      };
    }

    // Detect format based on length and pattern
    let format = 'UNKNOWN';
    
    if (/^\d{13}$/.test(cleanBarcode)) {
      format = 'EAN-13';
    } else if (/^\d{8}$/.test(cleanBarcode)) {
      format = 'EAN-8';
    } else if (/^\d{12}$/.test(cleanBarcode)) {
      format = 'UPC-A';
    } else if (/^[A-Z0-9\-\s]+$/.test(cleanBarcode)) {
      format = 'CODE-128';
    }

    return {
      isValid: true,
      format
    };
  }
}