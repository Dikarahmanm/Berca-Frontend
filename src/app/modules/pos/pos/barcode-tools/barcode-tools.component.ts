// src/app/modules/pos/barcode-tools/barcode-tools.component.ts
import { Component, OnInit, OnDestroy, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-barcode-tools',
  templateUrl: './barcode-tools.component.html',
  styleUrls: ['./barcode-tools.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class BarcodeToolsComponent implements OnInit, OnDestroy {
  @ViewChild('videoElement') videoElement!: ElementRef<HTMLVideoElement>;
  @ViewChild('canvasElement') canvasElement!: ElementRef<HTMLCanvasElement>;
  @ViewChild('manualInput') manualInput!: ElementRef<HTMLInputElement>;

  @Output() barcodeScanned = new EventEmitter<string>();
  @Output() scannerClosed = new EventEmitter<void>();

  // UI State
  isScanning = false;
  isCameraActive = false;
  manualBarcode = '';
  errorMessage = '';
  
  // Camera stream
  private stream: MediaStream | null = null;
  private scanInterval: any;

  ngOnInit() {
    this.startCamera();
  }

  ngOnDestroy() {
    this.stopCamera();
    this.stopScanning();
  }

  /**
   * Start camera for barcode scanning
   */
  async startCamera() {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });

      if (this.videoElement) {
        this.videoElement.nativeElement.srcObject = this.stream;
        this.isCameraActive = true;
        this.errorMessage = '';
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      this.errorMessage = 'Tidak dapat mengakses kamera. Pastikan Anda telah memberikan izin akses kamera.';
      this.isCameraActive = false;
    }
  }

  /**
   * Stop camera
   */
  stopCamera() {
    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
      this.isCameraActive = false;
    }
  }

  /**
   * Start barcode scanning
   */
  startScanning() {
    if (!this.isCameraActive) return;

    this.isScanning = true;
    this.scanInterval = setInterval(() => {
      this.captureAndScan();
    }, 500); // Scan every 500ms
  }

  /**
   * Stop barcode scanning
   */
  stopScanning() {
    this.isScanning = false;
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
  }

  /**
   * Capture frame and attempt to scan barcode
   */
  private captureAndScan() {
    if (!this.videoElement || !this.canvasElement) return;

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d');

    if (!context || video.videoWidth === 0) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data for barcode scanning
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
    
    // Mock barcode detection (in real app, use QuaggaJS or similar library)
    this.mockBarcodeDetection(imageData);
  }

  /**
   * Mock barcode detection (replace with real barcode library)
   */
  private mockBarcodeDetection(imageData: ImageData) {
    // This is a mock implementation
    // In real app, integrate with QuaggaJS or similar library
    
    // Simulate random successful scan for demo
    if (Math.random() > 0.95) { // 5% chance per scan
      const mockBarcodes = [
        '8994587123456',
        '8991234567890',
        '8887654321098',
        '8881122334455',
        '8889988776655'
      ];
      
      const randomBarcode = mockBarcodes[Math.floor(Math.random() * mockBarcodes.length)];
      this.onBarcodeDetected(randomBarcode);
    }
  }

  /**
   * Handle barcode detection
   */
  private onBarcodeDetected(barcode: string) {
    this.stopScanning();
    this.barcodeScanned.emit(barcode);
    console.log('Barcode detected:', barcode);
  }

  /**
   * Handle manual barcode input
   */
  onManualSubmit() {
    if (this.manualBarcode.trim()) {
      this.barcodeScanned.emit(this.manualBarcode.trim());
      this.manualBarcode = '';
    }
  }

  /**
   * Handle manual input keypress
   */
  onManualKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.onManualSubmit();
    }
  }

  /**
   * Close scanner
   */
  closeBarcodeScanner() {
    this.stopScanning();
    this.stopCamera();
    this.scannerClosed.emit();
  }

  /**
   * Toggle scanning
   */
  toggleScanning() {
    if (this.isScanning) {
      this.stopScanning();
    } else {
      this.startScanning();
    }
  }

  /**
   * Focus manual input
   */
  focusManualInput() {
    setTimeout(() => {
      if (this.manualInput) {
        this.manualInput.nativeElement.focus();
      }
    }, 100);
  }
}