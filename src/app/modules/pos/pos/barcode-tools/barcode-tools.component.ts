// src/app/modules/pos/pos/barcode-tools/barcode-tools.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Output, EventEmitter, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

declare var Quagga: any;

@Component({
  selector: 'app-barcode-tools',
  template: `
    <div class="barcode-tools">
      <!-- Header -->
      <div class="scanner-header">
        <h3 class="scanner-title">
          <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M9.5,2A0.5,0.5 0 0,1 10,2.5V4H14V2.5A0.5,0.5 0 0,1 14.5,2A0.5,0.5 0 0,1 15,2.5V4H16A1,1 0 0,1 17,5V6H20A1,1 0 0,1 21,7V20A1,1 0 0,1 20,21H4A1,1 0 0,1 3,20V7A1,1 0 0,1 4,6H7V5A1,1 0 0,1 8,4H9V2.5A0.5,0.5 0 0,1 9.5,2M15,6V7A1,1 0 0,1 14,8H10A1,1 0 0,1 9,7V6H8V20H16V6H15M5,8V10H7V8H5M5,11V13H7V11H5M5,14V16H7V14H5M5,17V19H7V17H5M19,8V10H21V8H19M19,11V13H21V11H19M19,14V16H21V14H19M19,17V19H21V17H19Z"/>
          </svg>
          Scan Barcode
        </h3>
        
        <button class="close-btn" (click)="closeScannerWithCleanup()" title="Tutup (ESC)">
          <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>

      <!-- Scanner Modes -->
      <div class="scanner-modes">
        <button class="mode-btn" 
                [class.active]="currentMode === 'camera'"
                (click)="switchMode('camera')"
                [disabled]="isScanning">
          <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4,4H7L9,2H15L17,4H20A2,2 0 0,1 22,6V18A2,2 0 0,1 20,20H4A2,2 0 0,1 2,18V6A2,2 0 0,1 4,4M12,7A5,5 0 0,0 7,12A5,5 0 0,0 12,17A5,5 0 0,0 17,12A5,5 0 0,0 12,7M12,9A3,3 0 0,1 15,12A3,3 0 0,1 12,15A3,3 0 0,1 9,12A3,3 0 0,1 12,9Z"/>
          </svg>
          Kamera
        </button>
        
        <button class="mode-btn" 
                [class.active]="currentMode === 'manual'"
                (click)="switchMode('manual')"
                [disabled]="isScanning">
          <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3,5A2,2 0 0,1 5,3H19A2,2 0 0,1 21,5V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5M5,5V19H19V5H5M7,7H17V9H7V7M7,11H17V13H7V11M7,15H13V17H7V15Z"/>
          </svg>
          Manual
        </button>
      </div>

      <!-- Camera Scanner -->
      <div class="camera-scanner" *ngIf="currentMode === 'camera'">
        <!-- Scanner Status -->
        <div class="scanner-status" [ngClass]="scannerStatus">
          <div class="status-indicator">
            <svg *ngIf="scannerStatus === 'loading'" class="spinner" viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="31.416" stroke-dashoffset="31.416">
                <animate attributeName="stroke-dasharray" dur="2s" values="0 31.416;15.708 15.708;0 31.416" repeatCount="indefinite"/>
                <animate attributeName="stroke-dashoffset" dur="2s" values="0;-15.708;-31.416" repeatCount="indefinite"/>
              </circle>
            </svg>
            
            <svg *ngIf="scannerStatus === 'ready'" class="icon success" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M11,16.5L18,9.5L16.59,8.08L11,13.67L7.91,10.58L6.5,12L11,16.5Z"/>
            </svg>
            
            <svg *ngIf="scannerStatus === 'error'" class="icon error" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"/>
            </svg>
          </div>
          
          <div class="status-text">
            <span *ngIf="scannerStatus === 'loading'">Memuat kamera...</span>
            <span *ngIf="scannerStatus === 'ready'">Arahkan ke barcode</span>
            <span *ngIf="scannerStatus === 'error'">{{errorMessage}}</span>
          </div>
        </div>

        <!-- Video Container -->
        <div class="video-container" [hidden]="scannerStatus !== 'ready'">
          <div #scannerContainer class="scanner-container">
            <!-- Quagga akan menambahkan elemen video dan canvas di sini -->
          </div>
          
          <!-- Scanner Overlay -->
          <div class="scanner-overlay">
            <div class="scan-area">
              <div class="corner top-left"></div>
              <div class="corner top-right"></div>
              <div class="corner bottom-left"></div>
              <div class="corner bottom-right"></div>
              <div class="scan-line"></div>
            </div>
          </div>
        </div>

        <!-- Camera Controls -->
        <div class="camera-controls" *ngIf="scannerStatus === 'ready'">
          <button class="control-btn" (click)="toggleTorch()" [disabled]="!torchAvailable">
            <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6,2L18,2V8L15.5,10.5V19C15.5,19.8 14.8,20.5 14,20.5H10C9.2,20.5 8.5,19.8 8.5,19V10.5L6,8V2M9.5,4V7.5L12,10L14.5,7.5V4H9.5M11,12H13V18H11V12Z"/>
            </svg>
            {{torchEnabled ? 'Matikan' : 'Nyalakan'}} Flash
          </button>
          
          <button class="control-btn" (click)="stopScanner()">
            <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18,18H6V6H18V18Z"/>
            </svg>
            Berhenti
          </button>
        </div>
      </div>

      <!-- Manual Input -->
      <div class="manual-input" *ngIf="currentMode === 'manual'">
        <div class="input-group">
          <label for="manualBarcode">Masukkan Barcode</label>
          <div class="input-wrapper">
            <input #manualInput
                   type="text"
                   class="barcode-input"
                   [(ngModel)]="manualBarcode"
                   (keyup.enter)="submitManualBarcode()"
                   placeholder="Ketik atau scan barcode"
                   maxlength="50">
            <button class="submit-btn" 
                    (click)="submitManualBarcode()"
                    [disabled]="!manualBarcode.trim()">
              <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="input-help">
          <svg class="icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M11,9H13V7H11M12,20C7.59,20 4,16.41 4,12C4,7.59 7.59,4 12,4C16.41,4 20,7.59 20,12C20,16.41 16.41,20 12,20M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M11,17H13V11H11V17Z"/>
          </svg>
          Masukkan barcode secara manual atau gunakan scanner eksternal
        </div>
      </div>

      <!-- Recent Scans -->
      <div class="recent-scans" *ngIf="recentScans.length > 0">
        <h4 class="recent-title">Scan Terakhir</h4>
        <div class="recent-list">
          <div *ngFor="let scan of recentScans" 
               class="recent-item"
               (click)="rescanBarcode(scan.code)">
            <div class="scan-code">{{scan.code}}</div>
            <div class="scan-time">{{formatScanTime(scan.timestamp)}}</div>
          </div>
        </div>
      </div>

      <!-- Keyboard Shortcuts Info -->
      <div class="shortcuts-info">
        <small>
          <strong>Shortcut:</strong> 
          Enter: Submit Manual | ESC: Tutup | Space: Toggle Mode
        </small>
      </div>
    </div>
  `,
  styleUrls: ['./barcode-tools.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class BarcodeToolsComponent implements OnInit, OnDestroy {
  @ViewChild('scannerContainer') scannerContainer!: ElementRef;
  @ViewChild('manualInput') manualInput!: ElementRef;

  @Output() barcodeScanned = new EventEmitter<string>();
  @Output() scannerClosed = new EventEmitter<void>();

  private destroy$ = new Subject<void>();

  // Scanner state
  currentMode: 'camera' | 'manual' = 'camera';
  scannerStatus: 'loading' | 'ready' | 'error' = 'loading';
  isScanning = false;
  errorMessage = '';

  // Camera controls
  torchAvailable = false;
  torchEnabled = false;

  // Manual input
  manualBarcode = '';

  // Recent scans
  recentScans: { code: string; timestamp: Date }[] = [];
  maxRecentScans = 5;

  constructor() {}

  ngOnInit() {
    this.loadRecentScans();
    if (this.currentMode === 'camera') {
      this.initializeCamera();
    } else {
      this.focusManualInput();
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopScanner();
  }

  // ===== MODE SWITCHING =====

  switchMode(mode: 'camera' | 'manual') {
    if (this.isScanning) return;

    this.currentMode = mode;
    
    if (mode === 'camera') {
      this.stopScanner();
      setTimeout(() => this.initializeCamera(), 100);
    } else {
      this.stopScanner();
      this.focusManualInput();
    }
  }

  // ===== CAMERA SCANNER =====

  private async initializeCamera() {
    try {
      this.scannerStatus = 'loading';
      this.errorMessage = '';

      // Check if camera is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera tidak tersedia pada browser ini');
      }

      // Check camera permissions
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());

      // Initialize Quagga
      await this.startQuaggaScanner();
      
    } catch (error: any) {
      this.scannerStatus = 'error';
      this.errorMessage = this.getCameraErrorMessage(error);
      console.error('Camera initialization error:', error);
    }
  }

  private startQuaggaScanner(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof Quagga === 'undefined') {
        reject(new Error('Quagga library tidak tersedia'));
        return;
      }

      const config = {
        inputStream: {
          name: "Live",
          type: "LiveStream",
          target: this.scannerContainer?.nativeElement,
          constraints: {
            width: 320,
            height: 240,
            facingMode: "environment" // Gunakan kamera belakang
          }
        },
        decoder: {
          readers: [
            "code_128_reader",
            "ean_reader",
            "ean_8_reader",
            "code_39_reader",
            "code_39_vin_reader",
            "codabar_reader",
            "upc_reader",
            "upc_e_reader"
          ]
        },
        locate: true,
        locator: {
          patchSize: "medium",
          halfSample: true
        }
      };

      Quagga.init(config, (err: any) => {
        if (err) {
          reject(err);
          return;
        }

        // Setup event listeners
        Quagga.onProcessed(this.onProcessed.bind(this));
        Quagga.onDetected(this.onDetected.bind(this));

        Quagga.start();
        this.isScanning = true;
        this.scannerStatus = 'ready';
        
        // Check torch availability
        this.checkTorchAvailability();
        
        resolve();
      });
    });
  }

  private onProcessed(result: any) {
    // Optional: Handle processing feedback
  }

  private onDetected(result: any) {
    const code = result.codeResult.code;
    if (code && code.length > 0) {
      this.handleBarcodeScanned(code);
    }
  }

  stopScanner() {
    if (typeof Quagga !== 'undefined' && this.isScanning) {
      Quagga.stop();
      this.isScanning = false;
    }
    this.scannerStatus = 'loading';
  }

  // ===== TORCH CONTROL =====

  private async checkTorchAvailability() {
    try {
      if ('mediaDevices' in navigator && 'getSupportedConstraints' in navigator.mediaDevices) {
        const supports = navigator.mediaDevices.getSupportedConstraints();
        this.torchAvailable = 'torch' in supports;
      }
    } catch (error) {
      this.torchAvailable = false;
    }
  }

  async toggleTorch() {
    if (!this.torchAvailable) return;

    try {
      const track = Quagga.CameraAccess.getActiveTrack();
      if (track && 'torch' in track.getCapabilities()) {
        await track.applyConstraints({
          advanced: [{ torch: !this.torchEnabled }]
        });
        this.torchEnabled = !this.torchEnabled;
      }
    } catch (error) {
      console.error('Error toggling torch:', error);
    }
  }

  // ===== MANUAL INPUT =====

  private focusManualInput() {
    setTimeout(() => {
      if (this.manualInput) {
        this.manualInput.nativeElement.focus();
      }
    }, 100);
  }

  submitManualBarcode() {
    const code = this.manualBarcode.trim();
    if (code) {
      this.handleBarcodeScanned(code);
      this.manualBarcode = '';
    }
  }

  // ===== BARCODE HANDLING =====

  private handleBarcodeScanned(code: string) {
    // Add to recent scans
    this.addToRecentScans(code);
    
    // Emit the scanned barcode
    this.barcodeScanned.emit(code);
    
    // Show success feedback
    this.showScanSuccess(code);
  }

  private addToRecentScans(code: string) {
    // Remove if already exists
    this.recentScans = this.recentScans.filter(scan => scan.code !== code);
    
    // Add to beginning
    this.recentScans.unshift({
      code,
      timestamp: new Date()
    });

    // Keep only max items
    this.recentScans = this.recentScans.slice(0, this.maxRecentScans);
    
    // Save to localStorage
    this.saveRecentScans();
  }

  rescanBarcode(code: string) {
    this.handleBarcodeScanned(code);
  }

  // ===== RECENT SCANS PERSISTENCE =====

  private loadRecentScans() {
    try {
      const saved = localStorage.getItem('pos-recent-scans');
      if (saved) {
        this.recentScans = JSON.parse(saved).map((scan: any) => ({
          ...scan,
          timestamp: new Date(scan.timestamp)
        }));
      }
    } catch (error) {
      console.error('Error loading recent scans:', error);
      this.recentScans = [];
    }
  }

  private saveRecentScans() {
    try {
      localStorage.setItem('pos-recent-scans', JSON.stringify(this.recentScans));
    } catch (error) {
      console.error('Error saving recent scans:', error);
    }
  }

  // ===== UI HELPERS =====

  private showScanSuccess(code: string) {
    // Could add visual feedback here
    console.log('Barcode scanned successfully:', code);
  }

  formatScanTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    
    if (diff < 60000) { // Less than 1 minute
      return 'Baru saja';
    } else if (diff < 3600000) { // Less than 1 hour
      const minutes = Math.floor(diff / 60000);
      return `${minutes} menit lalu`;
    } else {
      return timestamp.toLocaleTimeString('id-ID', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    }
  }

  private getCameraErrorMessage(error: any): string {
    if (error.name === 'NotAllowedError') {
      return 'Akses kamera ditolak. Mohon berikan izin kamera.';
    } else if (error.name === 'NotFoundError') {
      return 'Kamera tidak ditemukan pada perangkat ini.';
    } else if (error.name === 'NotSupportedError') {
      return 'Browser tidak mendukung akses kamera.';
    } else if (error.message) {
      return error.message;
    } else {
      return 'Gagal mengakses kamera. Coba gunakan input manual.';
    }
  }

  closeScannerWithCleanup() {
    this.stopScanner();
    this.scannerClosed.emit();
  }

  // ===== KEYBOARD SHORTCUTS =====

  @HostListener('window:keydown', ['$event'])
  handleKeyboardShortcuts(event: KeyboardEvent) {
    switch (event.key) {
      case 'Enter':
        if (this.currentMode === 'manual') {
          event.preventDefault();
          this.submitManualBarcode();
        }
        break;
      
      case 'Escape':
        event.preventDefault();
        this.closeScannerWithCleanup();
        break;
      
      case ' ':
        if (!event.ctrlKey && !event.altKey) {
          event.preventDefault();
          this.switchMode(this.currentMode === 'camera' ? 'manual' : 'camera');
        }
        break;
    }
  }
}