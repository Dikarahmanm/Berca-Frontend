// src/app/core/services/barcode.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

declare var Quagga: any;

@Injectable({
  providedIn: 'root'
})
export class BarcodeService {
  private isScanning = false;
  private scannerInitialized = false;
  private currentCallback: ((barcode: string) => void) | null = null;
  
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
    this.checkQuaggaAvailability();
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
   * Check if Quagga library is loaded
   */
  private checkQuaggaAvailability(): void {
    if (typeof Quagga === 'undefined') {
      console.warn('Quagga library not loaded. Barcode scanning will not work.');
      this.updateScannerStatus({
        isActive: false,
        isSupported: false,
        error: 'Barcode scanner library not loaded'
      });
    }
  }

  /**
   * Start barcode scanner
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
      throw new Error('Quagga library not available');
    }

    try {
      this.currentCallback = callback;
      
      await this.initializeQuagga(targetElementId);
      
      this.isScanning = true;
      this.scannerInitialized = true;
      
      this.updateScannerStatus({
        isActive: true,
        isSupported: true
      });

      console.log('Barcode scanner started successfully');
      
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
      if (typeof Quagga !== 'undefined' && this.scannerInitialized) {
        Quagga.stop();
        Quagga.offDetected();
        Quagga.offProcessed();
      }

      this.isScanning = false;
      this.scannerInitialized = false;
      this.currentCallback = null;

      this.updateScannerStatus({
        isActive: false,
        isSupported: true
      });

      console.log('Barcode scanner stopped');
      
    } catch (error) {
      console.error('Error stopping barcode scanner:', error);
    }
  }

  /**
   * Initialize Quagga scanner
   */
  private async initializeQuagga(targetElementId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const config = {
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: `#${targetElementId}`,
          constraints: {
            width: 640,
            height: 480,
            facingMode: "environment" // Use back camera
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
            "code_39_vin_reader",
            "codabar_reader",
            "upc_reader",
            "upc_e_reader",
            "i2of5_reader"
          ],
          debug: {
            showCanvas: true,
            showPatches: false,
            showFoundPatches: false,
            showSkeleton: false,
            showLabels: false,
            showPatchLabels: false,
            showRemainingPatchLabels: false,
            boxFromPatches: {
              showTransformed: true,
              showTransformedBox: true,
              showBB: true
            }
          }
        }
      };

      Quagga.init(config, (err: any) => {
        if (err) {
          console.error('Quagga initialization failed:', err);
          reject(err);
          return;
        }

        // Set up event listeners
        this.setupQuaggaEventListeners();
        
        Quagga.start();
        resolve();
      });
    });
  }

  /**
   * Setup Quagga event listeners
   */
  private setupQuaggaEventListeners(): void {
    // Barcode detected event
    Quagga.onDetected((result: any) => {
      const code = result.codeResult.code;
      
      if (this.isValidBarcode(code) && this.currentCallback) {
        console.log('Barcode detected:', code);
        this.currentCallback(code);
        
        // Optional: Stop scanner after successful scan
        // this.stopScanner();
      }
    });

    // Processing event for debugging
    Quagga.onProcessed((result: any) => {
      const drawingCtx = Quagga.canvas.ctx.overlay;
      const drawingCanvas = Quagga.canvas.dom.overlay;

      if (result) {
        if (result.boxes) {
          drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.getAttribute("width")), 
                              parseInt(drawingCanvas.getAttribute("height")));
          result.boxes.filter((box: any) => box !== result.box).forEach((box: any) => {
            Quagga.ImageDebug.drawPath(box, {x: 0, y: 1}, drawingCtx, {color: "green", lineWidth: 2});
          });
        }

        if (result.box) {
          Quagga.ImageDebug.drawPath(result.box, {x: 0, y: 1}, drawingCtx, {color: "#00F", lineWidth: 2});
        }

        if (result.codeResult && result.codeResult.code) {
          Quagga.ImageDebug.drawPath(result.line, {x: 'x', y: 'y'}, drawingCtx, {color: 'red', lineWidth: 3});
        }
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

  /**
   * Get scanner configuration for different barcode types
   */
  getScannerConfig(barcodeType: 'all' | 'ean' | 'upc' | 'code128' | 'code39' = 'all'): any {
    const baseConfig = {
      inputStream: {
        name: "Live",
        type: "LiveStream",
        constraints: {
          width: 640,
          height: 480,
          facingMode: "environment"
        }
      },
      locator: {
        patchSize: "medium",
        halfSample: true
      },
      numOfWorkers: 2,
      frequency: 10
    };

    const readers: Record<'all' | 'ean' | 'upc' | 'code128' | 'code39', string[]> = {
      all: [
        "code_128_reader",
        "ean_reader",
        "ean_8_reader", 
        "code_39_reader",
        "codabar_reader",
        "upc_reader",
        "upc_e_reader"
      ],
      ean: ["ean_reader", "ean_8_reader"],
      upc: ["upc_reader", "upc_e_reader"],
      code128: ["code_128_reader"],
      code39: ["code_39_reader"]
    };

    return {
      ...baseConfig,
      decoder: {
        readers: readers[barcodeType] || readers.all
      }
    };
  }
}