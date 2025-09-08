import { Injectable, inject, signal, computed } from '@angular/core';
import { Observable, combineLatest, EMPTY } from 'rxjs';
import { map, tap, catchError, switchMap } from 'rxjs/operators';
import { SupplierService } from './supplier.service';
import { FactureService } from '../../facture/services/facture.service';
import { FactureAnalyticsService } from './facture-analytics.service';
import {
  SupplierDto,
  SupplierStatsDto,
  SupplierRankingDto,
  SupplierBranchStatsDto
} from '../interfaces/supplier.interfaces';

// Enhanced interfaces for integration
export interface SupplierFactureIntegrationDto {
  supplier: SupplierDto;
  totalFactures: number;
  totalOutstanding: number;
  overdueAmount: number;
  averagePaymentDays: number;
  paymentRisk: 'Low' | 'Medium' | 'High' | 'Critical';
  lastFactureDate?: Date;
  oldestUnpaidDate?: Date;
}

export interface IntegratedSupplierStatsDto {
  // Supplier Stats
  totalSuppliers: number;
  activeSuppliers: number;
  inactiveSuppliers: number;
  
  // Facture Integration
  suppliersWithOutstandingFactures: number;
  totalOutstandingAmount: number;
  overdueSuppliers: number;
  overdueAmount: number;
  
  // Top Suppliers by Facture Activity
  topSuppliersByAmount: SupplierRankingDto[];
  topSuppliersByFactureCount: SupplierRankingDto[];
  
  // Risk Analysis
  highRiskSuppliers: SupplierFactureIntegrationDto[];
  paymentTrends: {
    improving: number;
    stable: number;
    declining: number;
  };
  
  // Branch Analysis
  suppliersByBranch: SupplierBranchStatsDto[];
}

@Injectable({
  providedIn: 'root'
})
export class SupplierFactureIntegrationService {
  private readonly supplierService = inject(SupplierService);
  private readonly factureService = inject(FactureService);
  private readonly analyticsService = inject(FactureAnalyticsService);

  // Signal-based state management
  private _integratedStats = signal<IntegratedSupplierStatsDto | null>(null);
  private _supplierFactureMap = signal<Map<number, SupplierFactureIntegrationDto>>(new Map());
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Public readonly signals
  readonly integratedStats = this._integratedStats.asReadonly();
  readonly supplierFactureMap = this._supplierFactureMap.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed properties
  readonly highRiskSuppliersCount = computed(() => 
    Array.from(this._supplierFactureMap().values()).filter(s => 
      s.paymentRisk === 'High' || s.paymentRisk === 'Critical'
    ).length
  );

  readonly totalOutstandingAmount = computed(() => 
    Array.from(this._supplierFactureMap().values()).reduce((sum, s) => sum + s.totalOutstanding, 0)
  );

  /**
   * Get comprehensive supplier-facture integration data
   */
  getIntegratedSupplierAnalytics(branchId?: number): Observable<IntegratedSupplierStatsDto> {
    this._loading.set(true);
    this._error.set(null);

    console.log('🔄 Loading integrated supplier-facture analytics...');

    // Load suppliers and facture analytics in parallel
    const suppliers$ = this.supplierService.getSuppliers({
      page: 1,
      pageSize: 100,
      sortBy: 'companyName',
      sortOrder: 'asc',
      branchId,
      isActive: undefined
    });

    const analytics$ = this.analyticsService.getDashboardSummary(branchId);

    return combineLatest([suppliers$, analytics$]).pipe(
      switchMap(([supplierResponse, analytics]) => {
        const suppliers = supplierResponse.suppliers || [];
        console.log('📊 Processing integration data:', {
          suppliers: suppliers.length,
          outstandingFactures: analytics.outstandingFactures.length,
          topSuppliers: analytics.topSuppliers.length
        });

        // Create supplier-facture integration map
        const supplierFactureMap = this.createSupplierFactureMap(suppliers, analytics);
        this._supplierFactureMap.set(supplierFactureMap);

        // Calculate integrated statistics
        const integratedStats = this.calculateIntegratedStats(
          suppliers, 
          analytics, 
          supplierFactureMap,
          branchId
        );
        
        this._integratedStats.set(integratedStats);
        this._loading.set(false);

        console.log('✅ Integrated analytics calculated:', {
          totalSuppliers: integratedStats.totalSuppliers,
          suppliersWithOutstanding: integratedStats.suppliersWithOutstandingFactures,
          totalOutstanding: integratedStats.totalOutstandingAmount,
          highRiskSuppliers: integratedStats.highRiskSuppliers.length
        });

        return new Observable<IntegratedSupplierStatsDto>(observer => {
          observer.next(integratedStats);
          observer.complete();
        });
      }),
      catchError(error => {
        console.error('❌ Error loading integrated supplier analytics:', error);
        this._error.set('Failed to load integrated supplier analytics');
        this._loading.set(false);
        return EMPTY;
      })
    );
  }

  /**
   * Get supplier details with facture information
   */
  getSupplierWithFactures(supplierId: number): Observable<SupplierFactureIntegrationDto | null> {
    console.log('🔍 Getting supplier with factures:', supplierId);
    
    // Check if we have cached data
    const cached = this._supplierFactureMap().get(supplierId);
    if (cached) {
      console.log('✅ Using cached supplier-facture data');
      return new Observable(observer => {
        observer.next(cached);
        observer.complete();
      });
    }

    // Load fresh data
    return this.supplierService.getSupplierById(supplierId).pipe(
      switchMap(supplier => {
        // Get supplier's factures
        return this.factureService.getSupplierFactures(supplierId, false, 50).pipe(
          map(factures => {
            const integration = this.createSupplierIntegration(supplier, factures);
            
            // Update cache
            this._supplierFactureMap.update(map => {
              const newMap = new Map(map);
              newMap.set(supplierId, integration);
              return newMap;
            });

            return integration;
          })
        );
      }),
      catchError(error => {
        console.error('❌ Error loading supplier with factures:', error);
        return new Observable<SupplierFactureIntegrationDto | null>(observer => {
          observer.next(null);
          observer.complete();
        });
      })
    );
  }

  /**
   * Create supplier-facture integration mapping
   */
  private createSupplierFactureMap(
    suppliers: SupplierDto[], 
    analytics: any
  ): Map<number, SupplierFactureIntegrationDto> {
    const map = new Map<number, SupplierFactureIntegrationDto>();

    // Create a map of supplier ID to facture data
    const supplierFactureData = new Map<number, any[]>();
    
    analytics.outstandingFactures.forEach((facture: any) => {
      // Try to match supplier by name since we might not have supplier ID
      const supplier = suppliers.find(s => 
        s.companyName === facture.supplierName || 
        s.supplierCode === facture.supplierCode
      );
      
      if (supplier) {
        if (!supplierFactureData.has(supplier.id)) {
          supplierFactureData.set(supplier.id, []);
        }
        supplierFactureData.get(supplier.id)!.push(facture);
      }
    });

    // Create integration DTOs
    suppliers.forEach(supplier => {
      const factures = supplierFactureData.get(supplier.id) || [];
      const integration = this.createSupplierIntegration(supplier, factures);
      map.set(supplier.id, integration);
    });

    return map;
  }

  /**
   * Create individual supplier integration
   */
  private createSupplierIntegration(
    supplier: SupplierDto, 
    factures: any[]
  ): SupplierFactureIntegrationDto {
    const totalOutstanding = factures.reduce((sum, f) => sum + (f.outstandingAmount || 0), 0);
    const overdueAmount = factures.filter(f => f.isOverdue).reduce((sum, f) => sum + (f.outstandingAmount || 0), 0);
    
    // Calculate payment risk based on multiple factors
    let paymentRisk: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
    
    if (overdueAmount > 0) {
      if (overdueAmount > 50000000) paymentRisk = 'Critical'; // > 50M IDR
      else if (overdueAmount > 25000000) paymentRisk = 'High';  // > 25M IDR
      else paymentRisk = 'Medium';
    } else if (totalOutstanding > 100000000) {
      paymentRisk = 'Medium'; // High outstanding even if not overdue
    }

    // Get date information
    const factureDates = factures.map(f => new Date(f.invoiceDate)).sort((a, b) => b.getTime() - a.getTime());
    const lastFactureDate = factureDates.length > 0 ? factureDates[0] : undefined;
    
    const unpaidFactures = factures.filter(f => (f.outstandingAmount || 0) > 0);
    const oldestUnpaid = unpaidFactures.length > 0 
      ? unpaidFactures.sort((a, b) => new Date(a.invoiceDate).getTime() - new Date(b.invoiceDate).getTime())[0]
      : undefined;
    const oldestUnpaidDate = oldestUnpaid ? new Date(oldestUnpaid.invoiceDate) : undefined;

    return {
      supplier,
      totalFactures: factures.length,
      totalOutstanding,
      overdueAmount,
      averagePaymentDays: 0, // Will be calculated if payment history is available
      paymentRisk,
      lastFactureDate,
      oldestUnpaidDate
    };
  }

  /**
   * Calculate comprehensive integrated statistics
   */
  private calculateIntegratedStats(
    suppliers: SupplierDto[],
    analytics: any,
    supplierFactureMap: Map<number, SupplierFactureIntegrationDto>,
    branchId?: number
  ): IntegratedSupplierStatsDto {
    const activeSuppliers = suppliers.filter(s => s.isActive);
    const suppliersWithFactures = Array.from(supplierFactureMap.values()).filter(s => s.totalFactures > 0);
    
    // High risk suppliers
    const highRiskSuppliers = Array.from(supplierFactureMap.values()).filter(s => 
      s.paymentRisk === 'High' || s.paymentRisk === 'Critical'
    );

    // Calculate totals
    const totalOutstandingAmount = Array.from(supplierFactureMap.values())
      .reduce((sum, s) => sum + s.totalOutstanding, 0);
    
    const overdueAmount = Array.from(supplierFactureMap.values())
      .reduce((sum, s) => sum + s.overdueAmount, 0);

    // Top suppliers by amount (from facture data)
    const topSuppliersByAmount: SupplierRankingDto[] = Array.from(supplierFactureMap.values())
      .sort((a, b) => b.totalOutstanding - a.totalOutstanding)
      .slice(0, 5)
      .map(s => ({
        supplierId: s.supplier.id,
        companyName: s.supplier.companyName || 'Unknown',
        count: s.totalFactures,
        totalAmount: s.totalOutstanding
      }));

    // Top suppliers by facture count
    const topSuppliersByFactureCount: SupplierRankingDto[] = Array.from(supplierFactureMap.values())
      .sort((a, b) => b.totalFactures - a.totalFactures)
      .slice(0, 5)
      .map(s => ({
        supplierId: s.supplier.id,
        companyName: s.supplier.companyName || 'Unknown',
        count: s.totalFactures,
        totalAmount: s.totalOutstanding
      }));

    // Branch analysis
    const branchGroups = new Map<number, SupplierDto[]>();
    suppliers.forEach(supplier => {
      const key = supplier.branchId || 0;
      if (!branchGroups.has(key)) {
        branchGroups.set(key, []);
      }
      branchGroups.get(key)!.push(supplier);
    });

    const suppliersByBranch: SupplierBranchStatsDto[] = Array.from(branchGroups.entries()).map(([branchId, branchSuppliers]) => ({
      branchId,
      branchName: branchId === 0 ? 'All Branches' : `Branch ${branchId}`,
      supplierCount: branchSuppliers.length,
      activeCount: branchSuppliers.filter(s => s.isActive).length
    }));

    return {
      // Basic supplier stats
      totalSuppliers: suppliers.length,
      activeSuppliers: activeSuppliers.length,
      inactiveSuppliers: suppliers.length - activeSuppliers.length,
      
      // Integrated facture stats
      suppliersWithOutstandingFactures: suppliersWithFactures.length,
      totalOutstandingAmount,
      overdueSuppliers: highRiskSuppliers.length,
      overdueAmount,
      
      // Rankings
      topSuppliersByAmount,
      topSuppliersByFactureCount,
      
      // Risk analysis
      highRiskSuppliers,
      paymentTrends: {
        improving: 0, // Would need historical data
        stable: suppliersWithFactures.length - highRiskSuppliers.length,
        declining: highRiskSuppliers.length
      },
      
      // Branch breakdown
      suppliersByBranch
    };
  }

  /**
   * Refresh all integration data
   */
  refreshIntegratedData(branchId?: number): Observable<IntegratedSupplierStatsDto> {
    console.log('🔄 Refreshing integrated supplier-facture data...');
    
    // Clear cache
    this._supplierFactureMap.set(new Map());
    this._integratedStats.set(null);
    
    return this.getIntegratedSupplierAnalytics(branchId);
  }

  /**
   * Clear all cached data
   */
  clearCache(): void {
    this._supplierFactureMap.set(new Map());
    this._integratedStats.set(null);
    this._error.set(null);
  }

  /**
   * Get suppliers by payment risk level
   */
  getSuppliersByRisk(riskLevel: 'Low' | 'Medium' | 'High' | 'Critical'): SupplierFactureIntegrationDto[] {
    return Array.from(this._supplierFactureMap().values()).filter(s => s.paymentRisk === riskLevel);
  }

  /**
   * Format currency for display
   */
  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  }
}