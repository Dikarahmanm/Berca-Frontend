// src/app/modules/pos/pos/barcode-tools/barcode-tools.component.ts
import { Component, OnInit, OnDestroy, AfterViewInit, ViewChild, ElementRef, Output, EventEmitter, HostListener, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { BarcodeService } from '../../../../core/services/barcode.service';
import { ProductService, Product } from '../../../../core/services/product.service';

@Component({
  selector: 'app-barcode-tools',
  templateUrl: './barcode-tools.component.html',
  styleUrls: ['./barcode-tools.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule]
})
export class BarcodeToolsComponent implements OnInit, AfterViewInit, OnDestroy {
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
  isRetrying = false;

  // Product suggestions
  showSuggestions = false;
  filteredProducts: Product[] = [];
  isLoading = false;
  selectedProductIndex = -1;
  
  // Scanner stream
  private destroy$ = new Subject<void>();
  private mediaStream: MediaStream | null = null;
  private barcodeInputSubject = new Subject<string>();

  constructor(
    private barcodeService: BarcodeService,
    private productService: ProductService
  ) {}

  ngOnInit() {
    // Setup debounced input for product suggestions
    this.barcodeInputSubject.pipe(
      takeUntil(this.destroy$),
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(value => {
      this.filterProducts(value);
    });
  }

  ngAfterViewInit() {
    // Initialize camera after view is rendered and DOM elements are available
    // Use a longer delay to ensure Angular change detection completes
    if (this.isOpen) {
      this.isCameraActive = true;
      this.isRetrying = true;
      
      setTimeout(() => {
        this.requestCameraPermission();
      }, 500); // Increased timeout like inventory component
    }
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
    this.stopCamera();
  }

  // ===== CAMERA PERMISSION & INITIALIZATION =====
  
  async requestCameraPermission() {
    try {
      this.errorMessage = '';
      this.isRetrying = true;
      
      // Set camera active first so the scanner element becomes visible
      this.isCameraActive = true;
      
      // Wait a brief moment for Angular change detection to update the DOM
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Verify element exists
      const targetElement = document.getElementById('barcode-scanner');
      if (!targetElement) {
        throw new Error('Scanner element not found in DOM');
      }

      this.isRetrying = false;
      
      // Use BarcodeService to start scanner
      await this.barcodeService.startScanner(
        (barcode: string) => this.handleBarcodeDetected(barcode),
        'barcode-scanner'
      );
      
      console.log('Quagga2 scanner started successfully');
      
    } catch (error: any) {
      this.isCameraActive = false;
      this.isRetrying = false;
      this.handleCameraError(error);
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
    } else if (error.message && error.message.includes('Scanner container')) {
      this.errorMessage = 'Scanner sedang memuat. Silakan tunggu sebentar dan coba lagi.';
    } else {
      this.errorMessage = 'Gagal mengakses kamera. Coba lagi atau gunakan input manual.';
    }
  }

  // ===== SCANNER CONTROLS =====

  startCamera() {
    if (!this.isCameraActive) {
      this.isCameraActive = true;
      this.isRetrying = true;
      this.errorMessage = '';
      
      // Use longer timeout to ensure DOM is fully updated
      setTimeout(() => {
        this.requestCameraPermission();
      }, 500); // Increased timeout like inventory component
    }
  }

  stopCamera() {
    // Use BarcodeService to stop scanner
    this.barcodeService.stopScanner();
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
      console.log('Scanner is already active with Quagga2');
    } else {
      this.stopCamera();
    }
  }

  // ===== BARCODE DETECTION =====

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
      this.showSuggestions = false;
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
      this.selectedProductIndex = -1;
      return;
    }
    
    this.isLoading = true;
    this.selectedProductIndex = -1;
    
    // Use ProductService to search for products
    this.productService.getProducts({ 
      search: searchTerm, 
      isActive: true,
      pageSize: 5 // Limit to 5 suggestions
    }).pipe(
      takeUntil(this.destroy$)
    ).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.data?.products) {
          this.filteredProducts = response.data.products;
          this.showSuggestions = this.filteredProducts.length > 0;
        } else {
          this.filteredProducts = [];
          this.showSuggestions = false;
        }
      },
      error: (error) => {
        this.isLoading = false;
        this.filteredProducts = [];
        this.showSuggestions = false;
        console.error('Error searching products:', error);
      }
    });
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
  
  formatPrice(sellPrice: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(sellPrice);
  }

  // ===== KEYBOARD SHORTCUTS =====

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      this.closeBarcodeScanner();
    }
  }
}
