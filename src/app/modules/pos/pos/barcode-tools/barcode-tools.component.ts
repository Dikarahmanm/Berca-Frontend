// src/app/modules/pos/pos/barcode-tools/barcode-tools.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, Output, EventEmitter, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';

// ✅ FIX: Proper Quagga import
declare var Quagga: any;

// Product interface
interface Product {
  id: number;
  name: string;
  barcode: string;
  price: number;
  stock: number;
  category?: string;
}

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
  @ViewChild('barcodeInput', { static: false }) barcodeInput?: ElementRef<HTMLInputElement>;

  @Output() barcodeScanned = new EventEmitter<string>();
  @Output() scannerClosed = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();
  @Input() isOpen = false;

  // Camera properties
  isCameraActive = false;
  isScanning = false;
  errorMessage = '';
  manualBarcode = '';

  // Product suggestions
  showSuggestions = false;
  filteredProducts: Product[] = [];
  
  // Mock product data (replace with actual service call)
  private products: Product[] = [
    { id: 1, name: 'Coca Cola 330ml', barcode: '1234567890123', price: 2500, stock: 50, category: 'Beverages' },
    { id: 2, name: 'Samsung Galaxy S24', barcode: '1234567890124', price: 12000000, stock: 10, category: 'Electronics' },
    { id: 3, name: 'Nike Air Max', barcode: '1234567890125', price: 1500000, stock: 25, category: 'Footwear' },
    { id: 4, name: 'Apple iPhone 15', barcode: '1234567890126', price: 15000000, stock: 8, category: 'Electronics' },
    { id: 5, name: 'Pepsi 500ml', barcode: '1234567890127', price: 3000, stock: 75, category: 'Beverages' }
  ];

  // Scanner stream
  private destroy$ = new Subject<void>();
  private mediaStream: MediaStream | null = null;
  private barcodeInputSubject = new Subject<string>();

  constructor() {}

  ngOnInit() {
    this.requestCameraPermission();
    
    // Setup debounced input for product suggestions
    this.barcodeInputSubject.pipe(
      takeUntil(this.destroy$),
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(value => {
      this.filterProducts(value);
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopCamera();
  }

  // ===== CAMERA PERMISSION & INITIALIZATION =====
  
  async requestCameraPermission() {
    try {
      // Request camera access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment', // Use back camera if available
          width: { ideal: 640 },
          height: { ideal: 480 }
        }
      });

      this.isCameraActive = true;
      this.errorMessage = '';
      this.setupVideoStream();
      
    } catch (error: any) {
      this.isCameraActive = false;
      this.handleCameraError(error);
    }
  }

  private setupVideoStream() {
    if (this.videoElement && this.mediaStream) {
      const video = this.videoElement.nativeElement;
      video.srcObject = this.mediaStream;
      
      video.onloadedmetadata = () => {
        video.play().catch(error => {
          console.error('Error playing video:', error);
          this.errorMessage = 'Gagal memutar video kamera';
        });
      };
    }
  }

  private handleCameraError(error: any) {
    console.error('Camera error:', error);
    
    if (error.name === 'NotAllowedError') {
      this.errorMessage = 'Akses kamera ditolak. Silakan izinkan akses kamera di browser.';
    } else if (error.name === 'NotFoundError') {
      this.errorMessage = 'Kamera tidak ditemukan. Pastikan perangkat memiliki kamera.';
    } else if (error.name === 'NotSupportedError') {
      this.errorMessage = 'Browser tidak mendukung akses kamera.';
    } else {
      this.errorMessage = 'Gagal mengakses kamera. Coba lagi atau gunakan input manual.';
    }
  }

  // ===== SCANNER CONTROLS =====

  startCamera() {
    if (!this.isCameraActive) {
      this.requestCameraPermission();
    }
  }

  stopCamera() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    this.isCameraActive = false;
    this.isScanning = false;
  }

  toggleScanning() {
    if (!this.isCameraActive) {
      this.startCamera();
      return;
    }

    this.isScanning = !this.isScanning;
    
    if (this.isScanning) {
      this.startBarcodeDetection();
    } else {
      this.stopBarcodeDetection();
    }
  }

  // ===== BARCODE DETECTION =====

  private startBarcodeDetection() {
    if (!this.videoElement || !this.canvasElement) return;

    const video = this.videoElement.nativeElement;
    const canvas = this.canvasElement.nativeElement;
    const context = canvas.getContext('2d');

    if (!context) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Start detection loop
    const detectLoop = () => {
      if (!this.isScanning) return;

      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Here you could implement barcode detection using QuaggaJS
      // For now, we'll use a simple mock detection for demonstration
      
      requestAnimationFrame(detectLoop);
    };

    detectLoop();
  }

  private stopBarcodeDetection() {
    // Stop the detection loop
    this.isScanning = false;
  }

  // ===== MANUAL INPUT =====

  focusManualInput() {
    setTimeout(() => {
      if (this.manualInput) {
        this.manualInput.nativeElement.focus();
      }
    }, 100);
  }

  onManualKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.onManualSubmit();
    }
  }

  onManualSubmit() {
    const trimmedBarcode = this.manualBarcode.trim();
    if (trimmedBarcode) {
      this.handleBarcodeDetected(trimmedBarcode);
      this.manualBarcode = '';
    }
  }

  // ===== BARCODE HANDLING =====

  private handleBarcodeDetected(barcode: string) {
    console.log('Barcode detected:', barcode);
    this.barcodeScanned.emit(barcode);
    
    // Optional: Stop scanning after successful detection
    this.isScanning = false;
  }

  // ===== UI CONTROLS =====

  closeBarcodeScanner() {
    this.stopCamera();
    this.scannerClosed.emit();
  }

  // ===== PRODUCT SUGGESTIONS =====
  
  onBarcodeInput(event: Event) {
    const target = event.target as HTMLInputElement;
    const value = target.value;
    this.manualBarcode = value;
    
    // Trigger search with debounce
    this.barcodeInputSubject.next(value);
  }
  
  onInputBlur() {
    // Delay hiding suggestions to allow for clicks
    setTimeout(() => {
      this.showSuggestions = false;
    }, 200);
  }
  
  filterProducts(searchTerm: string) {
    if (!searchTerm || searchTerm.length < 2) {
      this.showSuggestions = false;
      this.filteredProducts = [];
      return;
    }
    
    this.filteredProducts = this.products.filter(product => 
      product.barcode.includes(searchTerm) || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5); // Limit to 5 suggestions
    
    this.showSuggestions = this.filteredProducts.length > 0;
  }
  
  selectProduct(product: Product) {
    this.manualBarcode = product.barcode;
    this.showSuggestions = false;
    
    // Emit the selected barcode
    this.barcodeScanned.emit(product.barcode);
    
    // Clear the input
    setTimeout(() => {
      this.manualBarcode = '';
      if (this.barcodeInput) {
        this.barcodeInput.nativeElement.focus();
      }
    }, 100);
  }
  
  formatPrice(price: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(price);
  }

  // ===== KEYBOARD SHORTCUTS =====

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.closeBarcodeScanner();
    }
  }
}
