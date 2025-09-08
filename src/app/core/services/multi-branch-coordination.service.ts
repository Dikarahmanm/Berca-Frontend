// src/app/core/services/multi-branch-coordination.service.ts  
// Multi-Branch Coordination Service with optimization algorithms
// Angular 20 with Signal-based reactive architecture for branch management

import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environment/environment';
import { 
  ExpiringProduct, 
  ExpiredProduct, 
  ProductBatch,
  ExpiryUrgency,
  ApiResponse 
} from '../interfaces/expiry.interfaces';

// Multi-Branch Coordination Interfaces
export interface BranchDto {
  id: number;
  branchCode: string;
  branchName: string;
  address: string;
  managerName: string;
  phone: string;
  email?: string;
  parentBranchId?: number;
  branchType: 'Head' | 'Branch' | 'SubBranch';
  isActive: boolean;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  operatingHours?: {
    open: string;
    close: string;
    timezone: string;
  };
  capacity?: {
    storageSpace: number; // in cubic meters
    maxProducts: number;
    refrigeratedSpace: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface BranchInventoryStatus {
  branchId: number;
  branchName: string;
  branchCode: string;
  totalProducts: number;
  totalStockValue: number;
  expiringProducts: number;
  expiredProducts: number;
  criticalProducts: number;
  availableCapacity: number;
  utilizationRate: number;
  averageExpiryDays: number;
  wasteValue: number;
  lastSyncAt: string;
}

export interface InterBranchTransferRecommendation {
  id: number;
  productId: number;
  productName: string;
  productBarcode: string;
  categoryName: string;
  fromBranchId: number;
  fromBranchName: string;
  toBranchId: number;
  toBranchName: string;
  recommendedQuantity: number;
  priority: ExpiryUrgency;
  reason: 'expiry_prevention' | 'stock_balancing' | 'demand_optimization' | 'capacity_management';
  estimatedSaving: number;
  transferCost: number;
  netBenefit: number;
  urgencyScore: number;
  feasibilityScore: number;
  distanceKm: number;
  estimatedTransferTime: number; // in hours
  expiryDate?: string;
  daysUntilExpiry?: number;
  currentStockSource: number;
  currentStockTarget: number;
  recommendedTransferDate: string;
  validUntil: string;
  constraints?: string[];
  alternativeOptions?: AlternativeTransferOption[];
}

export interface AlternativeTransferOption {
  toBranchId: number;
  toBranchName: string;
  quantity: number;
  priority: number;
  reason: string;
  estimatedBenefit: number;
}

export interface CrossBranchAnalyticsDto {
  totalBranches: number;
  activeBranches: number;
  totalTransfers: number;
  transfersSavings: number;
  branchPerformance: BranchInventoryStatus[];
  transferRecommendations: InterBranchTransferRecommendation[];
}

export interface StockTransferOpportunityDto {
  id: number;
  productName: string;
  fromBranchName: string;
  toBranchName: string;
  quantity: number;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  potentialSavings: number;
  transferCost: number;
  netBenefit: number;
}

export interface BranchCoordinationAnalytics {
  totalBranches: number;
  activeBranches: number;
  totalRecommendations: number;
  activeTransfers: number;
  completedTransfers: number;
  totalSavings: number;
  averageTransferTime: number;
  successRate: number;
  topPerformingBranches: BranchPerformanceMetric[];
  transferEfficiency: TransferEfficiencyMetric[];
  capacityUtilization: BranchCapacityMetric[];
  syncStatus: BranchSyncStatus[];
}

export interface BranchPerformanceMetric {
  branchId: number;
  branchName: string;
  performanceScore: number;
  wasteReduction: number;
  transferSuccess: number;
  responseTime: number; // in minutes
  cooperationRating: number;
  rank: number;
}

export interface TransferEfficiencyMetric {
  routeId: string;
  fromBranch: string;
  toBranch: string;
  totalTransfers: number;
  successRate: number;
  averageTime: number;
  costPerUnit: number;
  savingsGenerated: number;
}

export interface BranchCapacityMetric {
  branchId: number;
  branchName: string;
  currentUtilization: number;
  optimalUtilization: number;
  availableCapacity: number;
  projectedNeed: number;
  recommendation: 'increase_stock' | 'reduce_stock' | 'maintain' | 'expand_capacity';
}

export interface BranchSyncStatus {
  branchId: number;
  branchName: string;
  lastSyncAt: string;
  syncStatus: 'online' | 'offline' | 'syncing' | 'error';
  dataFreshness: number; // minutes since last update
  pendingUpdates: number;
}

export interface TransferRequest {
  id?: number;
  productId: number;
  fromBranchId: number;
  toBranchId: number;
  quantity: number;
  reason: string;
  priority: ExpiryUrgency;
  requestedBy: string;
  requestedAt: string;
  requiredBy?: string;
  status: 'pending' | 'approved' | 'in_transit' | 'completed' | 'cancelled';
  notes?: string;
  estimatedCost?: number;
  actualCost?: number;
  transferMethod?: 'direct_delivery' | 'pickup' | 'third_party' | 'customer_pickup';
}

export interface TransferOptimizationResult {
  totalRecommendations: number;
  totalPotentialSaving: number;
  totalTransferCost: number;
  netBenefit: number;
  recommendedTransfers: InterBranchTransferRecommendation[];
  consolidatedRoutes: ConsolidatedRoute[];
  timeline: TransferTimeline[];
  constraints: OptimizationConstraint[];
}

export interface ConsolidatedRoute {
  routeId: string;
  fromBranchId: number;
  toBranchId: number;
  products: TransferProduct[];
  totalQuantity: number;
  totalValue: number;
  estimatedCost: number;
  estimatedTime: number;
  priority: ExpiryUrgency;
  scheduledDate: string;
}

export interface TransferProduct {
  productId: number;
  productName: string;
  quantity: number;
  value: number;
  expiryDate?: string;
  batchNumber?: string;
}

export interface TransferTimeline {
  date: string;
  transfers: number;
  totalProducts: number;
  totalValue: number;
  urgencyLevel: ExpiryUrgency;
}

export interface OptimizationConstraint {
  type: 'capacity' | 'time' | 'cost' | 'regulation' | 'operational';
  description: string;
  affectedBranches: number[];
  severity: 'low' | 'medium' | 'high';
  recommendation: string;
}

@Injectable({
  providedIn: 'root'
})
export class MultiBranchCoordinationService {
  private readonly http = inject(HttpClient);
  // ✅ Use relative URL for proxy routing
  private readonly baseUrl = '/api/BranchCoordination';

  // Signal-based state management
  private _branches = signal<BranchDto[]>([]);
  private _branchStatuses = signal<BranchInventoryStatus[]>([]);
  private _transferRecommendations = signal<InterBranchTransferRecommendation[]>([]);
  private _activeTransfers = signal<TransferRequest[]>([]);
  private _analytics = signal<BranchCoordinationAnalytics | null>(null);
  private _optimizationResult = signal<TransferOptimizationResult | null>(null);
  private _loading = signal<boolean>(false);
  private _error = signal<string | null>(null);

  // Public readonly signals
  readonly branches = this._branches.asReadonly();
  readonly branchStatuses = this._branchStatuses.asReadonly();
  readonly transferRecommendations = this._transferRecommendations.asReadonly();
  readonly activeTransfers = this._activeTransfers.asReadonly();
  readonly analytics = this._analytics.asReadonly();
  readonly optimizationResult = this._optimizationResult.asReadonly();
  readonly loading = this._loading.asReadonly();
  readonly error = this._error.asReadonly();

  // Computed properties for intelligent insights
  readonly activeBranches = computed(() => 
    this._branches().filter(branch => branch.isActive)
  );

  readonly onlineBranches = computed(() => {
    const statuses = this._branchStatuses();
    return statuses.filter(status => 
      status.lastSyncAt && 
      new Date(status.lastSyncAt).getTime() > Date.now() - 15 * 60 * 1000 // 15 minutes
    );
  });

  readonly criticalTransfers = computed(() => 
    this._transferRecommendations().filter(rec => 
      rec.priority === ExpiryUrgency.CRITICAL || rec.priority === ExpiryUrgency.HIGH
    )
  );

  readonly branchPerformanceRanking = computed(() => {
    const analytics = this._analytics();
    if (!analytics) return [];
    
    return analytics.topPerformingBranches.sort((a, b) => b.performanceScore - a.performanceScore);
  });

  readonly totalPotentialSavings = computed(() => 
    this._transferRecommendations().reduce((sum, rec) => sum + rec.netBenefit, 0)
  );

  readonly branchCapacityOverview = computed(() => {
    const statuses = this._branchStatuses();
    return statuses.map(status => ({
      branchId: status.branchId,
      branchName: status.branchName,
      utilization: status.utilizationRate,
      capacity: status.availableCapacity,
      status: status.utilizationRate > 0.9 ? 'critical' : 
              status.utilizationRate > 0.7 ? 'warning' : 'good'
    }));
  });

  readonly transferEfficiencyRating = computed(() => {
    const analytics = this._analytics();
    if (!analytics) return 0;
    
    return Math.round(analytics.successRate * analytics.averageTransferTime / 100);
  });

  constructor() {
    this.initializeService();
    this.setupCoordinationEffects();
  }

  private initializeService(): void {
    this.loadBranches();
    this.loadBranchStatuses();
    this.loadTransferRecommendations();
    this.loadActiveTransfers();
    this.loadAnalytics();
  }

  private setupCoordinationEffects(): void {
    // Auto-optimize when new critical situations arise
    effect(() => {
      const critical = this.criticalTransfers();
      if (critical.length > 0) {
        this.handleCriticalTransferSituations(critical);
      }
    });

    // Monitor branch capacity and suggest optimizations
    effect(() => {
      const capacityOverview = this.branchCapacityOverview();
      const overCapacity = capacityOverview.filter(b => b.status === 'critical');
      if (overCapacity.length > 0) {
        this.handleCapacityConstraints(overCapacity);
      }
    });

    // Auto-refresh data every 5 minutes for real-time coordination
    setInterval(() => {
      this.refreshBranchStatuses();
    }, 5 * 60 * 1000);
  }

  // ===== CORE COORDINATION METHODS =====

  async loadBranches(): Promise<void> {
    this._loading.set(true);
    this._error.set(null);

    try {
      console.log('🏢 Loading branch data for coordination...');
      
      const response = await this.http.get<ApiResponse<BranchDto[]>>(
        `${this.baseUrl}/branches`
      ).toPromise();

      if (response?.success && response.data) {
        this._branches.set(response.data);
        console.log(`✅ Loaded ${response.data.length} branches for coordination`);
      } else {
        // Enhanced fallback with intelligent mock data
        this._branches.set(this.generateIntelligentMockBranches());
        console.log('📝 Using intelligent mock branch data');
      }
    } catch (error: any) {
      console.error('❌ Error loading branches:', error);
      this._error.set('Failed to load branches');
      this._branches.set(this.generateIntelligentMockBranches());
    } finally {
      this._loading.set(false);
    }
  }

  async loadBranchStatuses(): Promise<void> {
    try {
      console.log('📊 Loading branch inventory statuses...');
      
      const response = await this.http.get<ApiResponse<BranchInventoryStatus[]>>(
        `${this.baseUrl}/statuses`
      ).toPromise();

      if (response?.success && response.data) {
        this._branchStatuses.set(response.data);
        console.log(`✅ Loaded ${response.data.length} branch statuses`);
      } else {
        this._branchStatuses.set(this.generateMockBranchStatuses());
        console.log('📝 Using mock branch status data');
      }
    } catch (error) {
      console.error('❌ Error loading branch statuses:', error);
      this._branchStatuses.set(this.generateMockBranchStatuses());
    }
  }

  async loadTransferRecommendations(): Promise<void> {
    try {
      console.log('💡 Loading intelligent transfer recommendations...');
      
      const response = await this.http.get<ApiResponse<InterBranchTransferRecommendation[]>>(
        `${this.baseUrl}/recommendations`
      ).toPromise();

      if (response?.success && response.data) {
        this._transferRecommendations.set(response.data);
        console.log(`✅ Loaded ${response.data.length} transfer recommendations`);
      } else {
        this._transferRecommendations.set(this.generateIntelligentTransferRecommendations());
        console.log('📝 Using intelligent mock transfer recommendations');
      }
    } catch (error) {
      console.error('❌ Error loading recommendations:', error);
      this._transferRecommendations.set(this.generateIntelligentTransferRecommendations());
    }
  }

  // ===== INTELLIGENT OPTIMIZATION ENGINE =====

  async optimizeInterBranchTransfers(
    expiringProducts: ExpiringProduct[],
    branchCapacities?: BranchCapacityMetric[]
  ): Promise<TransferOptimizationResult> {
    try {
      console.log('🧠 Running intelligent inter-branch transfer optimization...');
      
      const recommendations = await this.generateOptimizedTransferRecommendations(
        expiringProducts, 
        branchCapacities
      );
      
      const consolidatedRoutes = this.consolidateTransferRoutes(recommendations);
      const timeline = this.generateTransferTimeline(recommendations);
      const constraints = this.analyzeOptimizationConstraints(recommendations);
      
      const totalSaving = recommendations.reduce((sum, rec) => sum + rec.netBenefit, 0);
      const totalCost = recommendations.reduce((sum, rec) => sum + rec.transferCost, 0);
      
      const result: TransferOptimizationResult = {
        totalRecommendations: recommendations.length,
        totalPotentialSaving: totalSaving,
        totalTransferCost: totalCost,
        netBenefit: totalSaving - totalCost,
        recommendedTransfers: recommendations,
        consolidatedRoutes,
        timeline,
        constraints
      };
      
      this._optimizationResult.set(result);
      console.log(`✅ Optimization complete: ${recommendations.length} recommendations, net benefit: ${this.formatCurrency(result.netBenefit)}`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Error in transfer optimization:', error);
      throw new Error('Failed to optimize transfers');
    }
  }

  private async generateOptimizedTransferRecommendations(
    expiringProducts: ExpiringProduct[],
    branchCapacities?: BranchCapacityMetric[]
  ): Promise<InterBranchTransferRecommendation[]> {
    const recommendations: InterBranchTransferRecommendation[] = [];
    const branches = this._branches();
    const branchStatuses = this._branchStatuses();
    
    for (const product of expiringProducts) {
      const sourceBranch = branchStatuses.find(b => b.branchId === product.branchId);
      if (!sourceBranch) continue;
      
      // Find optimal target branches using AI scoring
      const targetBranches = this.findOptimalTargetBranches(
        product, 
        sourceBranch, 
        branchStatuses,
        branchCapacities
      );
      
      for (const targetBranch of targetBranches) {
        const recommendation = this.createTransferRecommendation(
          product, 
          sourceBranch, 
          targetBranch
        );
        
        if (recommendation.netBenefit > 0) {
          recommendations.push(recommendation);
        }
      }
    }
    
    // Sort by priority and net benefit
    return recommendations.sort((a, b) => {
      const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      return b.netBenefit - a.netBenefit;
    });
  }

  private findOptimalTargetBranches(
    product: ExpiringProduct,
    sourceBranch: BranchInventoryStatus,
    allBranches: BranchInventoryStatus[],
    capacities?: BranchCapacityMetric[]
  ): BranchInventoryStatus[] {
    const candidates = allBranches.filter(branch => 
      branch.branchId !== sourceBranch.branchId &&
      branch.availableCapacity > 0 &&
      branch.utilizationRate < 0.9
    );
    
    // Score each candidate branch
    const scoredCandidates = candidates.map(branch => {
      let score = 0;
      
      // Capacity score (30% weight)
      const capacityScore = (1 - branch.utilizationRate) * 30;
      score += capacityScore;
      
      // Distance score (25% weight) - closer is better
      const distance = this.calculateDistance(sourceBranch.branchId, branch.branchId);
      const distanceScore = Math.max(0, (100 - distance) / 100) * 25;
      score += distanceScore;
      
      // Performance score (25% weight)
      const performanceScore = (1 - branch.wasteValue / branch.totalStockValue) * 25;
      score += performanceScore;
      
      // Urgency matching score (20% weight)
      const urgencyScore = product.daysUntilExpiry <= 3 ? 20 : 
                          product.daysUntilExpiry <= 7 ? 15 : 10;
      score += urgencyScore;
      
      return { branch, score };
    });
    
    // Return top 3 candidates
    return scoredCandidates
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.branch);
  }

  private createTransferRecommendation(
    product: ExpiringProduct,
    sourceBranch: BranchInventoryStatus,
    targetBranch: BranchInventoryStatus
  ): InterBranchTransferRecommendation {
    const distance = this.calculateDistance(sourceBranch.branchId, targetBranch.branchId);
    const transferCost = this.calculateTransferCost(product.currentStock, distance);
    const estimatedSaving = this.calculatePotentialSaving(product);
    const netBenefit = estimatedSaving - transferCost;
    
    // Determine optimal quantity to transfer
    const maxTransferQuantity = Math.floor(product.currentStock * 0.8); // Keep 20% as safety stock
    const optimalQuantity = Math.min(
      maxTransferQuantity,
      Math.floor(targetBranch.availableCapacity * 0.1) // Don't overwhelm target branch
    );
    
    const urgencyScore = this.calculateUrgencyScore(product);
    const feasibilityScore = this.calculateFeasibilityScore(sourceBranch, targetBranch, distance);
    
    return {
      id: Date.now() + Math.random(),
      productId: product.productId,
      productName: product.productName,
      productBarcode: product.productBarcode,
      categoryName: product.categoryName,
      fromBranchId: sourceBranch.branchId,
      fromBranchName: sourceBranch.branchName,
      toBranchId: targetBranch.branchId,
      toBranchName: targetBranch.branchName,
      recommendedQuantity: optimalQuantity,
      priority: this.determinePriority(urgencyScore, netBenefit),
      reason: this.determineTransferReason(product, sourceBranch, targetBranch),
      estimatedSaving,
      transferCost,
      netBenefit,
      urgencyScore,
      feasibilityScore,
      distanceKm: distance,
      estimatedTransferTime: this.calculateTransferTime(distance),
      expiryDate: product.expiryDate,
      daysUntilExpiry: product.daysUntilExpiry,
      currentStockSource: product.currentStock,
      currentStockTarget: 0, // Would need API to get target stock
      recommendedTransferDate: this.calculateOptimalTransferDate(product.daysUntilExpiry),
      validUntil: this.calculateRecommendationValidityDate(product.daysUntilExpiry),
      constraints: this.identifyTransferConstraints(sourceBranch, targetBranch, product),
      alternativeOptions: []
    };
  }

  // ===== CALCULATION HELPER METHODS =====

  private calculateDistance(branchId1: number, branchId2: number): number {
    // Mock distance calculation - in real implementation, use coordinates
    const distances: Record<string, number> = {
      '1-2': 15, '1-3': 25, '1-4': 35,
      '2-3': 20, '2-4': 30, '3-4': 18
    };
    
    const key = `${Math.min(branchId1, branchId2)}-${Math.max(branchId1, branchId2)}`;
    return distances[key] || 25;
  }

  private calculateTransferCost(quantity: number, distanceKm: number): number {
    const baseCost = 50000; // IDR 50K base cost
    const perKmCost = 2000; // IDR 2K per km
    const perUnitCost = 1000; // IDR 1K per unit
    
    return baseCost + (distanceKm * perKmCost) + (quantity * perUnitCost);
  }

  private calculatePotentialSaving(product: ExpiringProduct): number {
    // Calculate saving based on preventing waste
    const wastePreventionRate = product.daysUntilExpiry <= 3 ? 0.9 : 0.7;
    return product.valueAtRisk * wastePreventionRate;
  }

  private calculateUrgencyScore(product: ExpiringProduct): number {
    let score = 0;
    
    // Time urgency (50% weight)
    if (product.daysUntilExpiry <= 1) score += 50;
    else if (product.daysUntilExpiry <= 3) score += 40;
    else if (product.daysUntilExpiry <= 7) score += 30;
    else score += 20;
    
    // Value urgency (30% weight)
    if (product.valueAtRisk > 1000000) score += 30;
    else if (product.valueAtRisk > 500000) score += 25;
    else if (product.valueAtRisk > 100000) score += 20;
    else score += 15;
    
    // Stock urgency (20% weight)
    if (product.currentStock > 100) score += 20;
    else if (product.currentStock > 50) score += 15;
    else score += 10;
    
    return score;
  }

  private calculateFeasibilityScore(
    source: BranchInventoryStatus,
    target: BranchInventoryStatus,
    distance: number
  ): number {
    let score = 100;
    
    // Distance penalty
    if (distance > 50) score -= 20;
    else if (distance > 30) score -= 10;
    
    // Capacity constraint
    if (target.utilizationRate > 0.8) score -= 15;
    if (target.utilizationRate > 0.9) score -= 25;
    
    // Source availability
    if (source.utilizationRate < 0.3) score -= 10; // Too little stock might indicate low demand
    
    return Math.max(score, 0);
  }

  private determinePriority(urgencyScore: number, netBenefit: number): ExpiryUrgency {
    if (urgencyScore >= 80 || netBenefit > 1000000) {
      return ExpiryUrgency.CRITICAL;
    } else if (urgencyScore >= 60 || netBenefit > 500000) {
      return ExpiryUrgency.HIGH;
    } else if (urgencyScore >= 40 || netBenefit > 100000) {
      return ExpiryUrgency.MEDIUM;
    } else {
      return ExpiryUrgency.LOW;
    }
  }

  private determineTransferReason(
    product: ExpiringProduct,
    source: BranchInventoryStatus,
    target: BranchInventoryStatus
  ): 'expiry_prevention' | 'stock_balancing' | 'demand_optimization' | 'capacity_management' {
    if (product.daysUntilExpiry <= 5) {
      return 'expiry_prevention';
    } else if (source.utilizationRate > 0.9) {
      return 'capacity_management';
    } else if (Math.abs(source.utilizationRate - target.utilizationRate) > 0.3) {
      return 'stock_balancing';
    } else {
      return 'demand_optimization';
    }
  }

  private calculateTransferTime(distanceKm: number): number {
    // Estimate transfer time: 1 hour setup + 1 hour per 30km + 1 hour delivery
    const setupTime = 1;
    const travelTime = Math.ceil(distanceKm / 30);
    const deliveryTime = 1;
    
    return setupTime + travelTime + deliveryTime;
  }

  private calculateOptimalTransferDate(daysUntilExpiry: number): string {
    // Transfer should happen with enough buffer time
    const bufferDays = daysUntilExpiry <= 5 ? 0 : 1;
    const optimalDate = new Date();
    optimalDate.setDate(optimalDate.getDate() + bufferDays);
    
    return optimalDate.toISOString();
  }

  private calculateRecommendationValidityDate(daysUntilExpiry: number): string {
    // Recommendation is valid until halfway to expiry
    const validityDays = Math.max(1, Math.floor(daysUntilExpiry / 2));
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + validityDays);
    
    return validUntil.toISOString();
  }

  private identifyTransferConstraints(
    source: BranchInventoryStatus,
    target: BranchInventoryStatus,
    product: ExpiringProduct
  ): string[] {
    const constraints: string[] = [];
    
    if (target.utilizationRate > 0.8) {
      constraints.push('Target branch near capacity limit');
    }
    
    if (product.daysUntilExpiry <= 2) {
      constraints.push('Very urgent - immediate transfer required');
    }
    
    if (source.totalProducts < 10) {
      constraints.push('Source branch has limited inventory');
    }
    
    return constraints;
  }

  // ===== ROUTE CONSOLIDATION =====

  private consolidateTransferRoutes(
    recommendations: InterBranchTransferRecommendation[]
  ): ConsolidatedRoute[] {
    const routes = new Map<string, ConsolidatedRoute>();
    
    recommendations.forEach(rec => {
      const routeKey = `${rec.fromBranchId}-${rec.toBranchId}`;
      
      if (!routes.has(routeKey)) {
        routes.set(routeKey, {
          routeId: routeKey,
          fromBranchId: rec.fromBranchId,
          toBranchId: rec.toBranchId,
          products: [],
          totalQuantity: 0,
          totalValue: 0,
          estimatedCost: rec.transferCost,
          estimatedTime: rec.estimatedTransferTime,
          priority: rec.priority,
          scheduledDate: rec.recommendedTransferDate
        });
      }
      
      const route = routes.get(routeKey)!;
      route.products.push({
        productId: rec.productId,
        productName: rec.productName,
        quantity: rec.recommendedQuantity,
        value: rec.estimatedSaving,
        expiryDate: rec.expiryDate,
        batchNumber: `BATCH-${rec.productId}`
      });
      
      route.totalQuantity += rec.recommendedQuantity;
      route.totalValue += rec.estimatedSaving;
      
      // Upgrade priority if needed
      const priorityOrder = { 'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4 };
      if (priorityOrder[rec.priority as keyof typeof priorityOrder] > 
          priorityOrder[route.priority as keyof typeof priorityOrder]) {
        route.priority = rec.priority;
      }
    });
    
    return Array.from(routes.values());
  }

  private generateTransferTimeline(
    recommendations: InterBranchTransferRecommendation[]
  ): TransferTimeline[] {
    const timeline = new Map<string, TransferTimeline>();
    
    recommendations.forEach(rec => {
      const date = new Date(rec.recommendedTransferDate).toISOString().split('T')[0];
      
      if (!timeline.has(date)) {
        timeline.set(date, {
          date,
          transfers: 0,
          totalProducts: 0,
          totalValue: 0,
          urgencyLevel: ExpiryUrgency.LOW
        });
      }
      
      const entry = timeline.get(date)!;
      entry.transfers += 1;
      entry.totalProducts += rec.recommendedQuantity;
      entry.totalValue += rec.estimatedSaving;
      
      // Update urgency level
      const priorityOrder = { 'Low': 1, 'Medium': 2, 'High': 3, 'Critical': 4 };
      if (priorityOrder[rec.priority as keyof typeof priorityOrder] > 
          priorityOrder[entry.urgencyLevel as keyof typeof priorityOrder]) {
        entry.urgencyLevel = rec.priority;
      }
    });
    
    return Array.from(timeline.values()).sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  private analyzeOptimizationConstraints(
    recommendations: InterBranchTransferRecommendation[]
  ): OptimizationConstraint[] {
    const constraints: OptimizationConstraint[] = [];
    
    // Check capacity constraints
    const branchLoads = new Map<number, number>();
    recommendations.forEach(rec => {
      const current = branchLoads.get(rec.toBranchId) || 0;
      branchLoads.set(rec.toBranchId, current + rec.recommendedQuantity);
    });
    
    branchLoads.forEach((load, branchId) => {
      if (load > 100) { // High load threshold
        constraints.push({
          type: 'capacity',
          description: `Branch ${branchId} receiving high transfer volume (${load} units)`,
          affectedBranches: [branchId],
          severity: 'medium',
          recommendation: 'Consider spreading transfers across multiple days'
        });
      }
    });
    
    // Check time constraints
    const urgentTransfers = recommendations.filter(rec => 
      rec.priority === ExpiryUrgency.CRITICAL && rec.daysUntilExpiry! <= 2
    );
    
    if (urgentTransfers.length > 5) {
      constraints.push({
        type: 'time',
        description: `${urgentTransfers.length} critical transfers needed within 48 hours`,
        affectedBranches: urgentTransfers.map(t => t.fromBranchId),
        severity: 'high',
        recommendation: 'Prioritize immediate transfers and consider emergency protocols'
      });
    }
    
    return constraints;
  }

  // ===== EVENT HANDLERS =====

  private handleCriticalTransferSituations(
    criticalTransfers: InterBranchTransferRecommendation[]
  ): void {
    console.log(`🚨 CRITICAL: ${criticalTransfers.length} urgent inter-branch transfers needed`);
    
    criticalTransfers.forEach(transfer => {
      console.log(`⚡ URGENT TRANSFER: ${transfer.productName} from ${transfer.fromBranchName} to ${transfer.toBranchName} (expires in ${transfer.daysUntilExpiry} days)`);
    });
  }

  private handleCapacityConstraints(
    overCapacityBranches: any[]
  ): void {
    console.log(`📦 CAPACITY WARNING: ${overCapacityBranches.length} branches at critical capacity`);
    
    overCapacityBranches.forEach(branch => {
      console.log(`⚠️ Branch ${branch.branchName} at ${Math.round(branch.utilization * 100)}% capacity`);
    });
  }

  // ===== MOCK DATA GENERATORS =====

  private generateIntelligentMockBranches(): BranchDto[] {
    return [
      {
        id: 1,
        branchCode: 'HQ001',
        branchName: 'Cabang Utama Jakarta',
        address: 'Jl. Sudirman No. 123, Jakarta Pusat',
        managerName: 'Budi Santoso',
        phone: '+62-21-1234-5678',
        email: 'hq@tokoeniwan.com',
        branchType: 'Head',
        isActive: true,
        coordinates: { latitude: -6.1944, longitude: 106.8229 },
        operatingHours: { open: '08:00', close: '22:00', timezone: 'Asia/Jakarta' },
        capacity: { storageSpace: 500, maxProducts: 2000, refrigeratedSpace: 150 },
        createdAt: '2024-01-01T08:00:00Z',
        updatedAt: '2024-08-24T10:00:00Z'
      },
      {
        id: 2,
        branchCode: 'BR002',
        branchName: 'Cabang Bekasi Timur',
        address: 'Jl. Raya Bekasi No. 456, Bekasi',
        managerName: 'Siti Rahmatika',
        phone: '+62-21-8765-4321',
        email: 'bekasi@tokoeniwan.com',
        parentBranchId: 1,
        branchType: 'Branch',
        isActive: true,
        coordinates: { latitude: -6.2643, longitude: 107.0127 },
        operatingHours: { open: '07:00', close: '21:00', timezone: 'Asia/Jakarta' },
        capacity: { storageSpace: 300, maxProducts: 1200, refrigeratedSpace: 100 },
        createdAt: '2024-02-15T08:00:00Z',
        updatedAt: '2024-08-24T09:30:00Z'
      },
      {
        id: 3,
        branchCode: 'BR003',
        branchName: 'Cabang Tangerang Selatan',
        address: 'Jl. BSD Raya No. 789, Tangerang Selatan',
        managerName: 'Ahmad Hidayat',
        phone: '+62-21-5555-6666',
        email: 'tangerang@tokoeniwan.com',
        parentBranchId: 1,
        branchType: 'Branch',
        isActive: true,
        coordinates: { latitude: -6.3089, longitude: 106.6753 },
        operatingHours: { open: '08:00', close: '22:00', timezone: 'Asia/Jakarta' },
        capacity: { storageSpace: 400, maxProducts: 1600, refrigeratedSpace: 120 },
        createdAt: '2024-03-01T08:00:00Z',
        updatedAt: '2024-08-24T11:15:00Z'
      },
      {
        id: 4,
        branchCode: 'BR004',
        branchName: 'Cabang Depok Margonda',
        address: 'Jl. Margonda Raya No. 321, Depok',
        managerName: 'Rina Oktaviani',
        phone: '+62-21-7777-8888',
        email: 'depok@tokoeniwan.com',
        parentBranchId: 1,
        branchType: 'SubBranch',
        isActive: true,
        coordinates: { latitude: -6.3754, longitude: 106.8286 },
        operatingHours: { open: '07:30', close: '21:30', timezone: 'Asia/Jakarta' },
        capacity: { storageSpace: 250, maxProducts: 1000, refrigeratedSpace: 80 },
        createdAt: '2024-04-10T08:00:00Z',
        updatedAt: '2024-08-24T08:45:00Z'
      }
    ];
  }

  private generateMockBranchStatuses(): BranchInventoryStatus[] {
    const now = new Date();
    
    return [
      {
        branchId: 1,
        branchName: 'Cabang Utama Jakarta',
        branchCode: 'HQ001',
        totalProducts: 1856,
        totalStockValue: 125800000,
        expiringProducts: 23,
        expiredProducts: 5,
        criticalProducts: 8,
        availableCapacity: 144,
        utilizationRate: 0.78,
        averageExpiryDays: 15.2,
        wasteValue: 890000,
        lastSyncAt: new Date(now.getTime() - 2 * 60 * 1000).toISOString()
      },
      {
        branchId: 2,
        branchName: 'Cabang Bekasi Timur',
        branchCode: 'BR002',
        totalProducts: 1134,
        totalStockValue: 76400000,
        expiringProducts: 18,
        expiredProducts: 3,
        criticalProducts: 12,
        availableCapacity: 66,
        utilizationRate: 0.89,
        averageExpiryDays: 12.8,
        wasteValue: 1250000,
        lastSyncAt: new Date(now.getTime() - 5 * 60 * 1000).toISOString()
      },
      {
        branchId: 3,
        branchName: 'Cabang Tangerang Selatan',
        branchCode: 'BR003',
        totalProducts: 1467,
        totalStockValue: 98200000,
        expiringProducts: 15,
        expiredProducts: 2,
        criticalProducts: 6,
        availableCapacity: 133,
        utilizationRate: 0.67,
        averageExpiryDays: 18.5,
        wasteValue: 670000,
        lastSyncAt: new Date(now.getTime() - 1 * 60 * 1000).toISOString()
      },
      {
        branchId: 4,
        branchName: 'Cabang Depok Margonda',
        branchCode: 'BR004',
        totalProducts: 892,
        totalStockValue: 54300000,
        expiringProducts: 21,
        expiredProducts: 7,
        criticalProducts: 14,
        availableCapacity: 108,
        utilizationRate: 0.82,
        averageExpiryDays: 11.3,
        wasteValue: 1580000,
        lastSyncAt: new Date(now.getTime() - 8 * 60 * 1000).toISOString()
      }
    ];
  }

  private generateIntelligentTransferRecommendations(): InterBranchTransferRecommendation[] {
    const now = new Date();
    
    return [
      {
        id: 1,
        productId: 1,
        productName: 'Susu UHT Indomilk 1L',
        productBarcode: '8992745123456',
        categoryName: 'Dairy Products',
        fromBranchId: 2,
        fromBranchName: 'Cabang Bekasi Timur',
        toBranchId: 3,
        toBranchName: 'Cabang Tangerang Selatan',
        recommendedQuantity: 30,
        priority: ExpiryUrgency.CRITICAL,
        reason: 'expiry_prevention',
        estimatedSaving: 150000,
        transferCost: 45000,
        netBenefit: 105000,
        urgencyScore: 85,
        feasibilityScore: 78,
        distanceKm: 25,
        estimatedTransferTime: 3,
        expiryDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        daysUntilExpiry: 2,
        currentStockSource: 45,
        currentStockTarget: 12,
        recommendedTransferDate: now.toISOString(),
        validUntil: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        constraints: ['Very urgent - immediate transfer required']
      },
      {
        id: 2,
        productId: 3,
        productName: 'Keju Prochiz 200g',
        productBarcode: '8993456789012',
        categoryName: 'Dairy Products',
        fromBranchId: 4,
        fromBranchName: 'Cabang Depok Margonda',
        toBranchId: 1,
        toBranchName: 'Cabang Utama Jakarta',
        recommendedQuantity: 15,
        priority: ExpiryUrgency.HIGH,
        reason: 'capacity_management',
        estimatedSaving: 225000,
        transferCost: 38000,
        netBenefit: 187000,
        urgencyScore: 72,
        feasibilityScore: 85,
        distanceKm: 18,
        estimatedTransferTime: 2,
        expiryDate: new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000).toISOString(),
        daysUntilExpiry: 4,
        currentStockSource: 28,
        currentStockTarget: 8,
        recommendedTransferDate: new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000).toISOString(),
        validUntil: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        constraints: []
      },
      {
        id: 3,
        productId: 5,
        productName: 'Yogurt Cimory 80ml',
        productBarcode: '8994567890123',
        categoryName: 'Dairy Products',
        fromBranchId: 1,
        fromBranchName: 'Cabang Utama Jakarta',
        toBranchId: 2,
        toBranchName: 'Cabang Bekasi Timur',
        recommendedQuantity: 25,
        priority: ExpiryUrgency.MEDIUM,
        reason: 'stock_balancing',
        estimatedSaving: 125000,
        transferCost: 42000,
        netBenefit: 83000,
        urgencyScore: 58,
        feasibilityScore: 65,
        distanceKm: 20,
        estimatedTransferTime: 3,
        expiryDate: new Date(now.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString(),
        daysUntilExpiry: 6,
        currentStockSource: 67,
        currentStockTarget: 5,
        recommendedTransferDate: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(),
        validUntil: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        constraints: ['Target branch near capacity limit']
      }
    ];
  }

  // ===== PUBLIC API METHODS =====

  async loadActiveTransfers(): Promise<void> {
    try {
      console.log('🚛 Loading active transfer requests...');
      // Mock for development
      this._activeTransfers.set([]);
    } catch (error) {
      console.error('❌ Error loading active transfers:', error);
    }
  }

  async loadAnalytics(): Promise<void> {
    try {
      console.log('📊 Loading coordination analytics...');
      
      // Mock analytics for development
      this._analytics.set({
        totalBranches: 4,
        activeBranches: 4,
        totalRecommendations: 3,
        activeTransfers: 1,
        completedTransfers: 28,
        totalSavings: 2400000,
        averageTransferTime: 2.8,
        successRate: 0.89,
        topPerformingBranches: [
          { branchId: 3, branchName: 'Cabang Tangerang Selatan', performanceScore: 92, wasteReduction: 0.15, transferSuccess: 0.95, responseTime: 45, cooperationRating: 4.8, rank: 1 },
          { branchId: 1, branchName: 'Cabang Utama Jakarta', performanceScore: 88, wasteReduction: 0.12, transferSuccess: 0.91, responseTime: 38, cooperationRating: 4.6, rank: 2 }
        ],
        transferEfficiency: [],
        capacityUtilization: [],
        syncStatus: []
      });
      
    } catch (error) {
      console.error('❌ Error loading analytics:', error);
    }
  }

  async refreshBranchStatuses(): Promise<void> {
    console.log('🔄 Refreshing branch statuses...');
    await this.loadBranchStatuses();
  }

  async createTransferRequest(request: Partial<TransferRequest>): Promise<void> {
    try {
      const response = await this.http.post(`${this.baseUrl}/transfer-request`, request).toPromise();
      console.log('✅ Transfer request created successfully');
      await this.loadActiveTransfers();
    } catch (error) {
      console.error('❌ Error creating transfer request:', error);
    }
  }

  clearError(): void {
    this._error.set(null);
  }

  // ===== MISSING METHODS FOR BUILD FIXES =====
  
  async getCrossBranchAnalytics(): Promise<CrossBranchAnalyticsDto> {
    try {
      const response = await this.http.get<ApiResponse<CrossBranchAnalyticsDto>>(
        `${this.baseUrl}/cross-branch-analytics`
      ).toPromise();

      if (response?.success && response.data) {
        return response.data;
      } else {
        // Mock data fallback
        return {
          totalBranches: this._branches().length,
          activeBranches: this.activeBranches().length,
          totalTransfers: 45,
          transfersSavings: 12500000,
          branchPerformance: this._branchStatuses(),
          transferRecommendations: this._transferRecommendations()
        };
      }
    } catch (error) {
      console.error('❌ Error loading cross branch analytics:', error);
      return {
        totalBranches: 0,
        activeBranches: 0,
        totalTransfers: 0,
        transfersSavings: 0,
        branchPerformance: [],
        transferRecommendations: []
      };
    }
  }

  async executeTransferOpportunity(opportunityId: number): Promise<void> {
    try {
      console.log(`⚡ Executing transfer opportunity: ${opportunityId}`);
      
      const response = await this.http.post(
        `${this.baseUrl}/execute-transfer/${opportunityId}`, 
        {}
      ).toPromise();
      
      console.log('✅ Transfer opportunity executed successfully');
      
      // Refresh data after execution
      await this.loadTransferRecommendations();
      await this.loadActiveTransfers();
      
    } catch (error) {
      console.error('❌ Error executing transfer opportunity:', error);
      throw error;
    }
  }

  refreshData(): void {
    console.log('🔄 Refreshing all multi-branch data...');
    this.refreshAll();
  }

  refreshAll(): void {
    this.loadBranches();
    this.loadBranchStatuses();
    this.loadTransferRecommendations();
    this.loadActiveTransfers();
    this.loadAnalytics();
  }

  private formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(amount);
  }
}