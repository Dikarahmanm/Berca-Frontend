// ===== SMART INVENTORY COMPONENT =====
// src/app/modules/inventory/components/smart-inventory/smart-inventory.component.ts

import { Component, OnInit, signal, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StateService } from '../../../../core/services/state.service';
import { AIInventoryService } from '../../services/ai-inventory.service';

// Batch & Expiry Interfaces
export interface BatchExpiryAnalytics {
  totalBatches: number;
  expiredBatches: number;
  criticalBatches: number;
  warningBatches: number;
  wastedValue: number;
  wastedQuantity: number;
  categories: CategoryExpiryStats[];
}

export interface CategoryExpiryStats {
  categoryId: number;
  categoryName: string;
  totalBatches: number;
  expiredBatches: number;
  criticalBatches: number;
  wastedValue: number;
}

export interface SmartFifoRecommendation {
  productId: number;
  productName: string;
  batchNumber: string;
  expiryDate: string;
  currentStock: number;
  daysUntilExpiry: number;
  expiryStatus: 'Good' | 'Normal' | 'Warning' | 'Critical' | 'Expired';
  recommendedAction: string;
  priority: number;
  estimatedWastageRisk: number;
}

export interface ExpiryTrend {
  month: string;
  expiredQuantity: number;
  expiredValue: number;
  wastedQuantity: number;
  wastedValue: number;
  preventableWaste: number;
}

export interface ProductBatch {
  id: number;
  productId: number;
  batchNumber: string;
  expiryDate?: string;
  productionDate?: string;
  currentStock: number;
  initialStock: number;
  costPerUnit: number;
  supplierName?: string;
  branchId?: number;
  expiryStatus: 'NoExpiry' | 'Good' | 'Normal' | 'Warning' | 'Critical' | 'Expired';
  daysUntilExpiry?: number;
  isBlocked: boolean;
  blockReason?: string;
  availableStock: number;
}

// Enhanced ML.NET Interfaces based on actual API responses
export interface DemandForecastResult {
  productId: number;
  productName: string;
  forecastDays: number;
  confidence: number;
  predictions: DailyDemandPrediction[];
  modelType: string;
  trainingDataPoints: number;
  generatedAt: string;
  message: string;
  metrics: ForecastMetrics;
}

export interface DailyDemandPrediction {
  date: string;
  predictedDemand: number;
  lowerBound: number;
  upperBound: number;
  confidence: number;
  influencingFactors: string[];
}

export interface ForecastMetrics {
  meanAbsoluteError: number;
  rootMeanSquareError: number;
  meanAbsolutePercentageError: number;
  r2Score: number;
  lastValidated: string;
  validationDataPoints: number;
}

export interface AnomalyDetectionResult {
  anomalyType: string;
  title: string;
  description: string;
  detectedAt: string;
  anomalyScore: number;
  isAnomaly: boolean;
  affectedData: any;
  possibleCauses: string[];
  recommendedActions: string[];
  context: AnomalyContext;
}

export interface AnomalyContext {
  productId?: number;
  productName?: string;
  branchId?: number;
  branchName?: string;
  timeRange: string;
  expectedValues: Record<string, number>;
  actualValues: Record<string, number>;
  deviationPercentage: number;
}

export interface ProductCluster {
  clusterId: number;
  clusterName: string;
  clusterDescription: string;
  productCount: number;
  products: ClusterProduct[];
  characteristics: Record<string, string>;
  metrics: ClusterMetrics;
}

export interface ClusterProduct {
  productId: number;
  productName: string;
  distance: number;
  similarityScore: number;
  features: Record<string, number>;
}

export interface ClusterMetrics {
  silhouetteScore: number;
  intraClusterDistance: number;
  interClusterDistance: number;
  optimalClusters: number;
  lastClustered: string;
}

export interface MLTransferRecommendation {
  sourceBranchId: number;
  sourceBranchName: string;
  targetBranchId: number;
  targetBranchName: string;
  productId: number;
  productName: string;
  recommendedQuantity: number;
  mlConfidenceScore: number;
  successProbability: number;
  expectedROI: number;
  riskScore: number;
  estimatedValue: number;
  transferCost: number;
  netBenefit: number;
  mlFeatures: Record<string, number>;
  reasoningFactors: string[];
  optimalTransferDate: string;
}

export interface TransferRecommendationData {
  generatedAt: string;
  totalRecommendations: number;
  highConfidenceRecommendations: number;
  recommendations: MLTransferRecommendation[];
  modelAccuracy: number;
  modelMetrics: ModelMetrics;
}

export interface ModelMetrics {
  precision: number;
  recall: number;
  f1Score: number;
  accuracy: number;
  trainingSamples: number;
  lastTrained: string;
}

export interface PredictiveAnalyticsResult {
  generatedAt: string;
  analysisType: string;
  branchId?: number;
  branchName?: string;
  demandForecasts: DemandForecastResult[];
  riskPredictions: RiskPrediction[];
  optimizationOpportunities: OptimizationOpportunity[];
  insights: BusinessInsight[];
  overallConfidence: number;
  modelConfidences: Record<string, number>;
}

export interface RiskPrediction {
  riskType: string;
  description: string;
  probability: number;
  severity: string;
  potentialImpact: number;
  predictedDate: string;
  riskFactors: string[];
  mitigationActions: string[];
  confidence: number;
}

export interface OptimizationOpportunity {
  opportunityType: string;
  title: string;
  description: string;
  potentialValue: number;
  successProbability: number;
  complexity: string;
  estimatedImplementationTime: string;
  requiredActions: string[];
  affectedBranchIds: number[];
  mlConfidence: number;
}

export interface BusinessInsight {
  insightType: string;
  category: string;
  title: string;
  description: string;
  impact: string;
  significance: number;
  confidence: number;
  supportingData: string[];
  recommendedActions: string[];
  validUntil: string;
}

export interface MLModelHealth {
  checkedAt: string;
  overallHealth: string;
  overallHealthScore: number;
  demandForecastModel: ModelHealthDetail;
  anomalyDetectionModel: ModelHealthDetail;
  clusteringModel: ModelHealthDetail;
  transferRecommendationModel: ModelHealthDetail;
  recommendations: string[];
  warnings: string[];
}

export interface ModelHealthDetail {
  isHealthy: boolean;
  healthScore: number;
  lastTrained: string;
  accuracyScore: number;
  dataPoints: number;
  status: string;
  issues: string[];
  performance: ModelPerformance;
}

export interface ModelPerformance {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  meanSquaredError: number;
  r2Score: number;
  trainingTime: string;
  predictionTime: string;
  memoryUsage: number;
}

export interface ModelExplanation {
  modelType: string;
  generatedAt: string;
  demandForecastFeatures: Record<string, number>;
  anomalyDetectionFeatures: Record<string, number>;
  clusteringFeatures: Record<string, number>;
  modelInterpretation: Record<string, string>;
  businessImpact: Record<string, string>;
}

interface SmartInventoryTab {
  id: string;
  name: string;
  icon: string;
  badge?: number;
}

@Component({
  selector: 'app-smart-inventory',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule
  ],
  templateUrl: './smart-inventory.component.html',
  styleUrls: ['./smart-inventory.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SmartInventoryComponent implements OnInit {
  private aiInventoryService = inject(AIInventoryService);
  private stateService = inject(StateService);

  // Component State
  public readonly currentBranchName = computed(() => this.stateService.selectedBranch()?.branchName || 'Unknown Branch');
  public readonly isLoading = signal<boolean>(false);
  public readonly error = signal<string | null>(null);
  public readonly activeTab = signal<string>('overview');

  // AI Data Signals - Enhanced with more detailed data
  public readonly demandForecasts = signal<DemandForecastResult[]>([]);
  public readonly anomalies = signal<AnomalyDetectionResult[]>([]);
  public readonly productClusters = signal<ProductCluster[]>([]);
  public readonly transferRecommendations = signal<TransferRecommendationData | null>(null);
  public readonly predictiveAnalytics = signal<PredictiveAnalyticsResult | null>(null);
  public readonly modelHealth = signal<MLModelHealth | null>(null);
  public readonly modelExplanation = signal<ModelExplanation | null>(null);

  // Batch & Expiry Signals
  public readonly expiryAnalytics = signal<BatchExpiryAnalytics | null>(null);
  public readonly fifoRecommendations = signal<SmartFifoRecommendation[]>([]);
  public readonly expiryTrends = signal<ExpiryTrend[]>([]);
  public readonly wastageMetrics = signal<any>(null);

  // Enhanced Configuration
  public readonly forecastDays = signal<number>(30);
  public readonly selectedProducts = signal<number[]>([25, 21, 1, 4]); // Default test products
  public readonly refreshInterval = signal<number>(5); // minutes
  public readonly autoRefresh = signal<boolean>(true);

  public readonly tabs: SmartInventoryTab[] = [
    { id: 'overview', name: 'AI Dashboard', icon: 'dashboard', badge: 0 },
    { id: 'forecasting', name: 'Demand Forecasting', icon: 'trending_up' },
    { id: 'anomalies', name: 'Anomaly Detection', icon: 'warning' },
    { id: 'clustering', name: 'Product Clustering', icon: 'group_work' },
    { id: 'transfers', name: 'Smart Transfers', icon: 'swap_horiz' },
    { id: 'analytics', name: 'Predictive Analytics', icon: 'analytics' },
    { id: 'explanation', name: 'Model Insights', icon: 'psychology' },
    { id: 'health', name: 'Model Health', icon: 'health_and_safety' }
  ];

  // Enhanced Computed Properties with detailed insights
  public readonly highPriorityAnomalies = computed(() => {
    const anomalies = this.anomalies().filter(a => a.anomalyScore >= 0.8 && a.isAnomaly);
    console.log('High priority anomalies computed:', anomalies);
    return anomalies;
  });

  public readonly criticalAnomalies = computed(() => {
    const anomalies = this.anomalies().filter(a => a.anomalyScore >= 0.9 && a.isAnomaly);
    console.log('Critical anomalies computed:', anomalies);
    return anomalies;
  });

  public readonly highConfidenceForecasts = computed(() =>
    this.demandForecasts().filter(f => f.confidence >= 80)
  );

  public readonly actionableTransfers = computed(() => {
    const transferData = this.transferRecommendations();
    return transferData ? transferData.recommendations.filter(t => t.mlConfidenceScore >= 0.8) : [];
  });

  public readonly highValueTransfers = computed(() => {
    const transferData = this.transferRecommendations();
    return transferData ? transferData.recommendations.filter(t => t.netBenefit > 50000) : [];
  });

  public readonly totalTransferValue = computed(() => {
    const transferData = this.transferRecommendations();
    return transferData ? transferData.recommendations.reduce((sum, t) => sum + t.estimatedValue, 0) : 0;
  });

  public readonly systemHealthStatus = computed(() => {
    const health = this.modelHealth();
    if (!health) return { status: 'Unknown', color: 'text-gray-500', score: 0 };
    
    const score = health.overallHealthScore;
    if (score >= 90) return { status: 'Excellent', color: 'text-green-600', score };
    if (score >= 75) return { status: 'Good', color: 'text-blue-600', score };
    if (score >= 60) return { status: 'Fair', color: 'text-yellow-600', score };
    return { status: 'Needs Attention', color: 'text-red-600', score };
  });

  public readonly modelHealthSummary = computed(() => {
    const health = this.modelHealth();
    if (!health) return { healthy: 0, warning: 0, critical: 0 };
    
    const models = [
      health.demandForecastModel,
      health.anomalyDetectionModel,
      health.clusteringModel,
      health.transferRecommendationModel
    ];
    
    return {
      healthy: models.filter(m => m.isHealthy).length,
      warning: models.filter(m => !m.isHealthy && m.healthScore >= 50).length,
      critical: models.filter(m => !m.isHealthy && m.healthScore < 50).length
    };
  });

  public readonly aiInsightsCount = computed(() => {
    const analytics = this.predictiveAnalytics();
    return analytics ? analytics.insights.length : 0;
  });

  public readonly riskPredictionsCount = computed(() => {
    const analytics = this.predictiveAnalytics();
    return analytics ? analytics.riskPredictions.length : 0;
  });

  public readonly optimizationOpportunitiesValue = computed(() => {
    const analytics = this.predictiveAnalytics();
    return analytics ? analytics.optimizationOpportunities.reduce((sum, opp) => sum + opp.potentialValue, 0) : 0;
  });

  public readonly criticalExpiryItems = computed(() => {
    const fifoRecommendations = this.fifoRecommendations();
    return fifoRecommendations ? fifoRecommendations.filter(item => 
      item.expiryStatus === 'Critical' || item.expiryStatus === 'Expired'
    ) : [];
  });

  public readonly totalWastedValue = computed(() => {
    const expiryAnalytics = this.expiryAnalytics();
    return expiryAnalytics ? expiryAnalytics.wastedValue : 0;
  });

  ngOnInit(): void {
    this.initializeSmartInventory();
    this.setupAutoRefresh();
  }

  private async initializeSmartInventory(): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      // Load all AI data in parallel
      await Promise.all([
        this.loadPredictiveAnalytics(),
        this.loadAnomalies(),
        this.loadProductClusters(),
        this.loadTransferRecommendations(),
        this.loadModelHealth(),
        this.loadModelExplanation(),
        this.loadExpiryAnalytics(),
        this.loadFifoRecommendations(),
        this.loadExpiryTrends()
      ]);
    } catch (error) {
      console.error('Failed to initialize smart inventory:', error);
      this.error.set('Failed to load AI inventory data. Please refresh to try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  private setupAutoRefresh(): void {
    // Refresh data every N minutes
    const interval = this.refreshInterval() * 60 * 1000;
    setInterval(() => {
      if (!this.isLoading()) {
        this.refreshData();
      }
    }, interval);
  }

  // === DATA LOADING METHODS ===

  async loadPredictiveAnalytics(): Promise<void> {
    try {
      const analytics = await this.aiInventoryService.getPredictiveAnalytics(undefined, this.forecastDays()).toPromise();
      this.predictiveAnalytics.set(analytics || null);
    } catch (error) {
      console.error('Failed to load predictive analytics:', error);
    }
  }

  async loadAnomalies(): Promise<void> {
    try {
      console.log('Loading anomalies...');
      const branchId = this.stateService.selectedBranch()?.id;
      console.log('Selected branch ID:', branchId);
      
      const anomalies = await this.aiInventoryService.detectAnomalies(branchId).toPromise();
      console.log('Received anomalies data:', anomalies);
      
      this.anomalies.set(anomalies || []);
      console.log('Anomalies set in signal:', this.anomalies());
      
      // Update anomalies badge
      const criticalCount = this.highPriorityAnomalies().length;
      console.log('Critical anomalies count:', criticalCount);
      const anomaliesTab = this.tabs.find(t => t.id === 'anomalies');
      if (anomaliesTab) anomaliesTab.badge = criticalCount;
    } catch (error) {
      console.error('Failed to load anomalies:', error);
    }
  }

  async loadProductClusters(): Promise<void> {
    try {
      const clusters = await this.aiInventoryService.clusterProducts().toPromise();
      this.productClusters.set(clusters || []);
    } catch (error) {
      console.error('Failed to load product clusters:', error);
    }
  }

  async loadTransferRecommendations(): Promise<void> {
    try {
      const recommendations = await this.aiInventoryService.getTransferRecommendations().toPromise();
      this.transferRecommendations.set(recommendations || null);
    } catch (error) {
      console.error('Failed to load transfer recommendations:', error);
    }
  }

  async loadModelHealth(): Promise<void> {
    try {
      const health = await this.aiInventoryService.getModelHealth().toPromise();
      this.modelHealth.set(health || null);
    } catch (error) {
      console.error('Failed to load model health:', error);
    }
  }

  async loadModelExplanation(): Promise<void> {
    try {
      const explanation = await this.aiInventoryService.getModelExplanation().toPromise();
      this.modelExplanation.set(explanation || null);
    } catch (error) {
      console.error('Failed to load model explanation:', error);
    }
  }

  // === EXPIRY & BATCH LOADING METHODS ===

  async loadExpiryAnalytics(): Promise<void> {
    try {
      const branchId = this.stateService.selectedBranch()?.id;
      const analytics = await this.aiInventoryService.getExpiryAnalytics(branchId).toPromise();
      this.expiryAnalytics.set(analytics || null);

      // Update expiry badge with critical items count
      const criticalCount = this.fifoRecommendations().filter(f => 
        f.expiryStatus === 'Critical' && f.daysUntilExpiry <= 3
      ).length;
      
      const expiryTab = this.tabs.find(t => t.id === 'expiry');
      if (expiryTab) expiryTab.badge = criticalCount;
    } catch (error) {
      console.error('Failed to load expiry analytics:', error);
    }
  }

  async loadFifoRecommendations(): Promise<void> {
    try {
      const branchId = this.stateService.selectedBranch()?.id;
      const recommendations = await this.aiInventoryService.getSmartFifoRecommendations(branchId).toPromise();
      this.fifoRecommendations.set(recommendations || []);
    } catch (error) {
      console.error('Failed to load FIFO recommendations:', error);
    }
  }

  async loadExpiryTrends(): Promise<void> {
    try {
      const branchId = this.stateService.selectedBranch()?.id;
      const endDate = new Date().toISOString();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12); // Last 12 months
      
      const trends = await this.aiInventoryService.getExpiryTrends(
        branchId, 
        startDate.toISOString(), 
        endDate
      ).toPromise();
      this.expiryTrends.set(trends || []);
    } catch (error) {
      console.error('Failed to load expiry trends:', error);
    }
  }

  async loadWastageMetrics(): Promise<void> {
    try {
      const branchId = this.stateService.selectedBranch()?.id;
      const endDate = new Date().toISOString();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 3); // Last 3 months
      
      const metrics = await this.aiInventoryService.getWastageMetrics(
        branchId, 
        startDate.toISOString(), 
        endDate
      ).toPromise();
      this.wastageMetrics.set(metrics);
    } catch (error) {
      console.error('Failed to load wastage metrics:', error);
    }
  }

  // === ACTION METHODS ===

  switchTab(tabId: string): void {
    this.activeTab.set(tabId);
    
    // Load data for specific tab if not already loaded
    switch (tabId) {
      case 'forecasting':
        if (this.demandForecasts().length === 0) {
          this.loadDemandForecasts();
        }
        break;
      case 'expiry':
        if (!this.wastageMetrics()) {
          this.loadWastageMetrics();
        }
        break;
    }
  }

  async loadDemandForecasts(): Promise<void> {
    try {
      // Load forecasts for top products
      const products = this.selectedProducts().length > 0 ? this.selectedProducts() : [1, 2, 3, 4, 5]; // Default top 5
      const forecasts = await this.aiInventoryService.batchForecastDemand(products, this.forecastDays()).toPromise();
      this.demandForecasts.set(forecasts || []);
    } catch (error) {
      console.error('Failed to load demand forecasts:', error);
    }
  }

  async refreshData(): Promise<void> {
    await this.initializeSmartInventory();
  }

  async refreshAnomalies(): Promise<void> {
    console.log('Manually refreshing anomalies...');
    await this.loadAnomalies();
  }

  async trainMLModels(): Promise<void> {
    try {
      this.isLoading.set(true);
      await this.aiInventoryService.trainMLModels().toPromise();
      await this.loadModelHealth(); // Refresh model health after training
    } catch (error) {
      console.error('Failed to train ML models:', error);
      this.error.set('Failed to train ML models. Please try again.');
    } finally {
      this.isLoading.set(false);
    }
  }

  updateForecastDays(days: number): void {
    this.forecastDays.set(days);
    this.loadPredictiveAnalytics(); // Reload with new timeframe
  }

  updateRefreshInterval(minutes: number): void {
    this.refreshInterval.set(minutes);
    this.setupAutoRefresh(); // Reset refresh timer
  }

  // === UTILITY METHODS ===

  formatConfidence(confidence: number): string {
    return `${confidence.toFixed(1)}%`;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR'
    }).format(amount);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('id-ID');
  }

  formatShortDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' });
  }

  getMaxPrediction(predictions: DailyDemandPrediction[]): number {
    return Math.max(...predictions.map(p => p.predictedDemand));
  }

  getObjectKeys(obj: Record<string, any>): string[] {
    return Object.keys(obj);
  }

  getCharacteristicsArray(characteristics: Record<string, string>): string[] {
    return Object.entries(characteristics).map(([key, value]) => `${key}: ${value}`);
  }

  getTotalClusteredProducts(): number {
    return this.productClusters().reduce((total, cluster) => total + cluster.productCount, 0);
  }

  getAnomalySeverityClass(score: number): string {
    if (score >= 0.8) return 'severity-critical';
    if (score >= 0.6) return 'severity-high';
    if (score >= 0.4) return 'severity-medium';
    return 'severity-low';
  }

  getHealthScoreClass(score: number): string {
    if (score >= 90) return 'health-excellent';
    if (score >= 75) return 'health-good';
    if (score >= 60) return 'health-fair';
    return 'health-poor';
  }

  getClusterColor(clusterId: number): string {
    const colors = ['#FF914D', '#4BBF7B', '#FFB84D', '#E15A4F', '#6366f1'];
    return colors[clusterId % colors.length];
  }

  getExpiryStatusClass(status: string): string {
    switch (status) {
      case 'Good': return 'expiry-good';
      case 'Normal': return 'expiry-normal';
      case 'Warning': return 'expiry-warning';
      case 'Critical': return 'expiry-critical';
      case 'Expired': return 'expiry-expired';
      default: return 'expiry-none';
    }
  }

  getExpiryStatusColor(status: string): string {
    switch (status) {
      case 'Good': return 'text-green-600';
      case 'Normal': return 'text-blue-600';
      case 'Warning': return 'text-yellow-600';
      case 'Critical': return 'text-orange-600';
      case 'Expired': return 'text-red-600';
      default: return 'text-gray-500';
    }
  }

  formatDaysUntilExpiry(days: number): string {
    if (days < 0) return 'Expired';
    if (days === 0) return 'Today';
    if (days === 1) return '1 day';
    return `${days} days`;
  }
}