// src/app/core/interfaces/smart-analytics.interfaces.ts
// ✅ SMART ANALYTICS INTEGRATION: Comprehensive TypeScript Interfaces
// Following Project Guidelines: Type-safe, Performance Optimized, Production-ready

// ===== CORE API RESPONSE INTERFACE =====
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  errors?: string[];
  timestamp?: string;
  metadata?: {
    totalRecords?: number;
    page?: number;
    pageSize?: number;
    hasNextPage?: boolean;
    hasPreviousPage?: boolean;
  };
}

// ===== EXPIRY ANALYTICS INTERFACES =====
export interface ComprehensiveExpiryAnalyticsDto {
  // Core Metrics
  totalProducts: number;
  expiringIn7Days: number;
  expiringIn30Days: number;
  expiredProducts: number;
  criticalAlerts: number;
  potentialLossValue: number;
  averageDaysUntilExpiry: number;
  
  // Risk Analysis
  riskAnalysis: {
    overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    riskScore: number; // 0-1
    insights: {
      type: 'WARNING' | 'INFO' | 'RECOMMENDATION' | 'ALERT';
      message: string;
    }[];
  };
  
  // Detailed Analytics
  categoryBreakdown: CategoryExpiryStatsDto[];
  supplierAnalytics: SupplierExpiryStatsDto[];
  branchAnalytics: BranchExpiryStatsDto[];
  trends: ExpiryTrendDto[];
  predictions: ExpiryPredictionDto[];
  recommendations: SmartFifoRecommendationDto[];
  
  // Performance Metrics
  wasteReductionRate: number;
  fifoComplianceRate: number;
  inventoryTurnoverRate: number;
  costSavingsThisMonth: number;
  
  // Time Information
  lastUpdated: string;
  dataFreshness: number; // minutes since last update
  nextUpdateScheduled: string;
}

export interface CategoryExpiryStatsDto {
  categoryId: number;
  categoryName: string;
  categoryCode: string;
  
  // Stock Information
  totalProducts: number;
  totalCount: number;
  totalStockValue: number;
  expiringProducts: number;
  expiringCount: number;
  expiredProducts: number;
  averageDaysUntilExpiry: number;
  nearestExpiryDate: string;
  
  // Risk Assessment
  riskScore: number; // 0-100
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  potentialLoss: number;
  historicalWasteRate: number;
  
  // Performance Metrics
  fifoCompliance: number;
  turnoverRate: number;
  seasonalityFactor: number;
  demandVariability: number;
  
  // Recommendations
  recommendedActions: CategoryRecommendationDto[];
  optimalStockLevel: number;
  reorderPoint: number;
  safetyStock: number;
}

export interface CategoryRecommendationDto {
  actionType: 'REDUCE_ORDER' | 'INCREASE_DISCOUNT' | 'TRANSFER_STOCK' | 'ADJUST_PRICING' | 'PROMOTIONAL_CAMPAIGN';
  description: string;
  expectedImpact: number;
  implementationCost: number;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timeframe: string;
  successProbability: number;
}

export interface SupplierExpiryStatsDto {
  supplierId: number;
  supplierName: string;
  supplierCode: string;
  
  // Product Information
  totalProducts: number;
  categoriesSupplied: string[];
  averageShelfLife: number;
  shelfLifeVariability: number;
  
  // Quality Metrics
  qualityScore: number; // 0-100
  consistencyRating: number;
  expiringProducts: number;
  defectRate: number;
  returnRate: number;
  
  // Business Impact
  totalValue: number;
  potentialLoss: number;
  costPerUnit: number;
  deliveryReliability: number;
  leadTime: number;
  
  // Performance Insights
  recommendedOrderTiming: number;
  optimalOrderQuantity: number;
  seasonalityPattern: SeasonalityPatternDto[];
  riskFactors: string[];
  recommendations: SupplierRecommendationDto[];
}

export interface SupplierRecommendationDto {
  type: 'NEGOTIATE_TERMS' | 'ADJUST_ORDER_FREQUENCY' | 'QUALITY_IMPROVEMENT' | 'ALTERNATIVE_SUPPLIER' | 'PARTNERSHIP_REVIEW';
  description: string;
  expectedBenefit: number;
  implementationCost: number;
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  feasibility: number;
  timeline: string;
}

export interface BranchExpiryStatsDto {
  branchId: number;
  branchName: string;
  branchCode: string;
  branchType: 'HEAD' | 'BRANCH' | 'SUB_BRANCH';
  
  // Inventory Metrics
  totalProducts: number;
  totalStockValue: number;
  expiringProducts: number;
  expiredProducts: number;
  averageDaysUntilExpiry: number;
  
  // Performance Metrics
  wasteValue: number;
  wasteReductionFromLastMonth: number;
  fifoComplianceRate: number;
  inventoryAccuracy: number;
  stockRotationEfficiency: number;
  
  // Capacity & Utilization
  storageUtilization: number;
  refrigeratedUtilization: number;
  optimalStockLevel: number;
  currentStockLevel: number;
  
  // Comparative Analysis
  performanceRank: number;
  benchmarkComparison: BranchBenchmarkDto;
  improvementOpportunities: BranchImprovementDto[];
}

export interface BranchBenchmarkDto {
  comparedToPeers: {
    wasteRate: number;
    fifoCompliance: number;
    turnoverRate: number;
    profitability: number;
  };
  industryBenchmarks: {
    wasteRate: number;
    fifoCompliance: number;
    turnoverRate: number;
    customerSatisfaction: number;
  };
}

export interface BranchImprovementDto {
  area: 'WASTE_REDUCTION' | 'FIFO_COMPLIANCE' | 'INVENTORY_ACCURACY' | 'STAFF_TRAINING' | 'PROCESS_OPTIMIZATION';
  currentPerformance: number;
  targetPerformance: number;
  potentialImpact: number;
  requiredInvestment: number;
  timeline: string;
  actionPlan: string[];
}

export interface ExpiryTrendDto {
  date: string;
  expiringProducts: number;
  expiredProducts: number;
  potentialLoss: number;
  actualLoss: number;
  wastePreventionSavings: number;
  fifoComplianceRate: number;
  averageDaysUntilExpiry: number;
  seasonalAdjustment: number;
  marketInfluence: number;
}

export interface ExpiryPredictionDto {
  predictionDate: string;
  predictionHorizon: number; // days ahead
  
  // Predicted Metrics
  predictedExpiringProducts: number;
  predictedPotentialLoss: number;
  confidenceInterval: {
    lower: number;
    upper: number;
    confidence: number;
  };
  
  // Influencing Factors
  seasonalFactors: SeasonalityPatternDto[];
  marketFactors: MarketFactorDto[];
  internalFactors: InternalFactorDto[];
  
  // Recommendations
  preventiveActions: PredictiveRecommendationDto[];
  optimalActions: OptimalActionDto[];
}

export interface SeasonalityPatternDto {
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'SEASONAL';
  pattern: string;
  impact: number;
  confidence: number;
  historicalData: number[];
}

export interface MarketFactorDto {
  factor: 'DEMAND_FLUCTUATION' | 'COMPETITOR_ACTIVITY' | 'ECONOMIC_CONDITIONS' | 'WEATHER_IMPACT' | 'HOLIDAY_SEASON';
  impact: number;
  probability: number;
  description: string;
  mitigationStrategies: string[];
}

export interface InternalFactorDto {
  factor: 'STAFF_EFFICIENCY' | 'PROCESS_IMPROVEMENT' | 'TECHNOLOGY_UPGRADE' | 'SUPPLIER_RELATIONSHIP' | 'INVENTORY_POLICY';
  currentState: number;
  targetState: number;
  impact: number;
  controlLevel: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface PredictiveRecommendationDto {
  actionType: 'PROACTIVE_DISCOUNT' | 'INTER_BRANCH_TRANSFER' | 'SUPPLIER_ADJUSTMENT' | 'INVENTORY_REBALANCE' | 'PROMOTIONAL_CAMPAIGN';
  timing: string;
  expectedOutcome: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  resourceRequired: string[];
}

export interface OptimalActionDto {
  priority: number;
  action: string;
  timing: string;
  expectedBenefit: number;
  cost: number;
  roi: number;
  feasibility: number;
  dependencies: string[];
}

// ===== SMART FIFO RECOMMENDATION INTERFACES =====
export interface SmartFifoRecommendationDto {
  id: number;
  productId: number;
  productName: string;
  productBarcode: string;
  productCode: string;
  batchId: string;
  categoryId: number;
  categoryName: string;
  branchId: number;
  branchName: string;
  
  // Stock Information
  currentStock: number;
  optimalStock: number;
  minimumStock: number;
  maximumStock: number;
  
  // Expiry Information
  expiryDate: string;
  nearestExpiryDate: string;
  daysUntilExpiry: number;
  shelfLife: number;
  remainingShelfLife: number;
  
  // Recommendation Details
  recommendedAction: 'SELL_FIRST' | 'DISCOUNT' | 'TRANSFER' | 'DISPOSE' | 'DONATE' | 'RETURN_TO_SUPPLIER';
  recommendation: string;
  actionUrgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  discountPercentage?: number;
  transferTargetBranch?: number;
  transferTargetBranchName?: string;
  transferQuantity?: number;
  
  // Financial Impact
  potentialLoss: number;
  potentialSaving: number;
  potentialSavings: number;
  currentValue: number;
  recoveryValue: number;
  costOfAction: number;
  netBenefit: number;
  
  // Prediction & Analysis
  confidenceScore: number; // 0-1
  riskScore: number; // 0-100
  demandForecast: DemandForecastDto;
  alternativeActions: AlternativeActionDto[];
  
  // Timeline
  actionDeadline: string;
  optimalActionDate: string;
  latestActionDate: string;
  
  // Metadata
  createdAt: string;
  validUntil: string;
  analyticsVersion: string;
  dataSourceReliability: number;
}

export interface DemandForecastDto {
  forecastPeriod: number; // days
  predictedDemand: number;
  demandVariability: number;
  seasonalityFactor: number;
  trendDirection: 'INCREASING' | 'DECREASING' | 'STABLE';
  trendMagnitude: number;
  marketFactors: string[];
  confidenceLevel: number;
}

export interface AlternativeActionDto {
  action: string;
  description: string;
  expectedOutcome: number;
  costEstimate: number;
  feasibilityScore: number;
  timeToImplement: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  pros: string[];
  cons: string[];
}

// ===== PRODUCT EXPIRY DETAIL INTERFACES =====
export interface ProductExpiryDetailDto {
  productId: number;
  productName: string;
  productBarcode: string;
  categoryId: number;
  categoryName: string;
  supplierId: number;
  supplierName: string;
  
  // Comprehensive Batch Information
  batches: BatchExpiryInfoDto[];
  batchSummary: BatchSummaryDto;
  
  // Stock Overview
  totalStock: number;
  totalValue: number;
  expiringStock: number;
  expiredStock: number;
  goodStock: number;
  
  // Analytics
  averageDaysUntilExpiry: number;
  stockTurnoverRate: number;
  demandPattern: DemandPatternDto;
  seasonalityAnalysis: SeasonalityAnalysisDto;
  
  // Recommendations
  recommendations: SmartFifoRecommendationDto[];
  actionPlan: ProductActionPlanDto;
  
  // Performance Metrics
  wasteHistory: WasteHistoryDto[];
  performanceScore: number;
  improvementOpportunities: string[];
  
  // Supply Chain
  supplierPerformance: SupplierPerformanceDto;
  reorderRecommendation: ReorderRecommendationDto;
}

export interface BatchExpiryInfoDto {
  batchId: string;
  batchNumber: string;
  productionDate: string;
  expiryDate: string;
  daysUntilExpiry: number;
  
  // Stock & Financial
  stock: number;
  originalStock: number;
  soldQuantity: number;
  wastedQuantity: number;
  purchasePrice: number;
  sellingPrice: number;
  currentValue: number;
  potentialLoss: number;
  
  // Status & Quality
  status: 'FRESH' | 'GOOD' | 'EXPIRING_SOON' | 'EXPIRED' | 'DISPOSED';
  qualityGrade: 'A' | 'B' | 'C' | 'D';
  storageCondition: 'OPTIMAL' | 'ACCEPTABLE' | 'SUBOPTIMAL' | 'CRITICAL';
  
  // Location & Movement
  location: BatchLocationDto;
  movementHistory: BatchMovementDto[];
  
  // Recommendations
  recommendedAction: string;
  actionPriority: number;
  actionDeadline: string;
  
  // Supplier Information
  supplierBatchInfo: SupplierBatchInfoDto;
}

export interface BatchLocationDto {
  branchId: number;
  branchName: string;
  warehouseSection: string;
  storageType: 'AMBIENT' | 'REFRIGERATED' | 'FROZEN' | 'CONTROLLED';
  lastMovedDate: string;
  accessibilityScore: number;
}

export interface BatchMovementDto {
  movementId: number;
  type: 'RECEIVED' | 'TRANSFERRED' | 'SOLD' | 'RETURNED' | 'ADJUSTED' | 'DISPOSED';
  date: string;
  quantity: number;
  fromLocation: string;
  toLocation: string;
  reason: string;
  performedBy: string;
}

export interface SupplierBatchInfoDto {
  supplierBatchCode: string;
  productionFacility: string;
  qualityCertification: string[];
  shelfLifeGuarantee: number;
  storageRecommendations: string[];
  recallStatus: 'NONE' | 'VOLUNTARY' | 'MANDATORY' | 'PRECAUTIONARY';
}

export interface BatchSummaryDto {
  totalBatches: number;
  freshBatches: number;
  expiringBatches: number;
  expiredBatches: number;
  averageBatchSize: number;
  oldestBatch: {
    batchId: string;
    daysUntilExpiry: number;
  };
  newestBatch: {
    batchId: string;
    daysUntilExpiry: number;
  };
}

export interface DemandPatternDto {
  averageDailyDemand: number;
  demandVariability: number;
  trendDirection: 'INCREASING' | 'DECREASING' | 'STABLE';
  cyclicality: boolean;
  peakDemandDays: string[];
  lowDemandDays: string[];
  elasticity: number;
  priceInfluence: number;
}

export interface SeasonalityAnalysisDto {
  hasSeasonality: boolean;
  seasonalStrength: number;
  peakSeason: string;
  lowSeason: string;
  seasonalPattern: SeasonalDataPointDto[];
  yearOverYearGrowth: number;
}

export interface SeasonalDataPointDto {
  period: string;
  demandIndex: number;
  confidence: number;
  historicalAverage: number;
}

export interface ProductActionPlanDto {
  immediateActions: ActionItemDto[];
  shortTermActions: ActionItemDto[];
  longTermActions: ActionItemDto[];
  contingencyPlan: ContingencyPlanDto;
  successMetrics: SuccessMetricDto[];
}

export interface ActionItemDto {
  id: string;
  action: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timeline: string;
  assignedTo: string;
  estimatedCost: number;
  expectedBenefit: number;
  dependencies: string[];
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

export interface ContingencyPlanDto {
  triggers: TriggerConditionDto[];
  escalationProcedure: EscalationStepDto[];
  emergencyContacts: EmergencyContactDto[];
  fallbackActions: ActionItemDto[];
}

export interface TriggerConditionDto {
  condition: string;
  threshold: number;
  monitoringFrequency: string;
  responseTime: string;
}

export interface EscalationStepDto {
  level: number;
  trigger: string;
  responsible: string;
  actions: string[];
  timeline: string;
}

export interface EmergencyContactDto {
  role: string;
  name: string;
  phone: string;
  email: string;
  availability: string;
}

export interface SuccessMetricDto {
  metric: string;
  currentValue: number;
  targetValue: number;
  measurementFrequency: string;
  threshold: {
    green: number;
    yellow: number;
    red: number;
  };
}

// ===== WASTE HISTORY & PERFORMANCE INTERFACES =====
export interface WasteHistoryDto {
  date: string;
  wastedQuantity: number;
  wastedValue: number;
  wasteReason: 'EXPIRY' | 'DAMAGE' | 'OBSOLESCENCE' | 'CONTAMINATION' | 'RECALL' | 'OTHER';
  preventable: boolean;
  costOfPrevention: number;
  lessonsLearned: string[];
}

export interface SupplierPerformanceDto {
  overallScore: number;
  qualityRating: number;
  deliveryReliability: number;
  shelfLifeConsistency: number;
  defectRate: number;
  returnRate: number;
  supportResponsiveness: number;
  costCompetitiveness: number;
  sustainabilityScore: number;
  riskProfile: RiskProfileDto;
}

export interface RiskProfileDto {
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskFactors: RiskFactorDto[];
  mitigationStrategies: MitigationStrategyDto[];
  contingencySuppliers: ContingencySupplierDto[];
}

export interface RiskFactorDto {
  factor: string;
  probability: number;
  impact: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  mitigationActions: string[];
}

export interface MitigationStrategyDto {
  strategy: string;
  effectiveness: number;
  cost: number;
  implementationTime: string;
  responsible: string;
}

export interface ContingencySupplierDto {
  supplierId: number;
  supplierName: string;
  readinessLevel: number;
  leadTime: number;
  costDifference: number;
  qualityScore: number;
}

export interface ReorderRecommendationDto {
  shouldReorder: boolean;
  recommendedQuantity: number;
  reorderPoint: number;
  economicOrderQuantity: number;
  safetyStock: number;
  leadTime: number;
  seasonalAdjustment: number;
  costOptimization: CostOptimizationDto;
  riskAssessment: ReorderRiskAssessmentDto;
}

export interface CostOptimizationDto {
  unitCost: number;
  holdingCost: number;
  orderingCost: number;
  stockoutCost: number;
  totalCost: number;
  costPerUnit: number;
  savingsOpportunity: number;
}

export interface ReorderRiskAssessmentDto {
  stockoutRisk: number;
  expiryRisk: number;
  demandVariabilityRisk: number;
  supplierRisk: number;
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskMitigation: string[];
}

// ===== QUERY & FILTER INTERFACES =====
export interface ExpiryAnalyticsQueryParams {
  // Date Range
  startDate?: string;
  endDate?: string;
  
  // Filters
  branchId?: number;
  branchIds?: number[];
  categoryId?: number;
  categoryIds?: number[];
  supplierId?: number;
  supplierIds?: number[];
  productId?: number;
  productIds?: number[];
  
  // Expiry Filters
  daysAhead?: number;
  expiryDateFrom?: string;
  expiryDateTo?: string;
  includeExpired?: boolean;
  urgencyLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  
  // Stock Filters
  minStockValue?: number;
  maxStockValue?: number;
  minQuantity?: number;
  maxQuantity?: number;
  stockStatus?: 'FRESH' | 'GOOD' | 'EXPIRING_SOON' | 'EXPIRED';
  
  // Sorting & Pagination
  sortBy?: 'expiry_date' | 'potential_loss' | 'stock_quantity' | 'product_name' | 'category_name';
  sortDirection?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
  
  // Analysis Options
  includeDetails?: boolean;
  includePredictions?: boolean;
  includeRecommendations?: boolean;
  includeBenchmarks?: boolean;
  includeHistoricalData?: boolean;
  
  // Performance Options
  useCache?: boolean;
  cacheTimeout?: number;
  dataFreshnessRequired?: number; // minutes
}

// ===== CACHE & PERFORMANCE INTERFACES =====
export interface SmartAnalyticsCacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  key: string;
  version: string;
  dependencies: string[];
  metadata: {
    queryParams?: any;
    dataSource: string;
    generationTime: number;
    compressionUsed: boolean;
    size: number;
  };
}

export interface SmartAnalyticsCacheConfig {
  defaultTTL: number;
  maxCacheSize: number;
  compressionThreshold: number;
  cleanupInterval: number;
  refreshThreshold: number;
  preloadQueries: string[];
  invalidationStrategy: 'TIME_BASED' | 'DEPENDENCY_BASED' | 'HYBRID';
}

export interface SmartAnalyticsPerformanceMetrics {
  queryTime: number;
  cacheHitRate: number;
  dataFreshness: number;
  apiLatency: number;
  processingTime: number;
  memoryUsage: number;
  networkBandwidth: number;
  errorRate: number;
  concurrentUsers: number;
  lastOptimizationDate: string;
}

// ===== NOTIFICATION & ALERT INTERFACES =====
export interface SmartAnalyticsAlert {
  id: number;
  type: 'EXPIRY_WARNING' | 'WASTE_THRESHOLD' | 'PERFORMANCE_DEGRADATION' | 'DATA_ANOMALY' | 'SYSTEM_ERROR';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  message: string;
  affectedEntities: AffectedEntityDto[];
  metrics: AlertMetricDto[];
  recommendations: AlertRecommendationDto[];
  acknowledgmentRequired: boolean;
  escalationRules: EscalationRuleDto[];
  createdAt: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
}

export interface AffectedEntityDto {
  entityType: 'PRODUCT' | 'CATEGORY' | 'BRANCH' | 'SUPPLIER' | 'BATCH';
  entityId: number;
  entityName: string;
  impactLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  affectedMetrics: string[];
}

export interface AlertMetricDto {
  metricName: string;
  currentValue: number;
  expectedValue: number;
  threshold: number;
  trend: 'IMPROVING' | 'STABLE' | 'DEGRADING';
  historicalAverage: number;
}

export interface AlertRecommendationDto {
  action: string;
  priority: number;
  estimatedImpact: number;
  costEstimate: number;
  timeToImplement: string;
  successProbability: number;
  dependencies: string[];
}

export interface EscalationRuleDto {
  level: number;
  triggerAfter: number; // minutes
  recipients: string[];
  channels: ('EMAIL' | 'SMS' | 'PUSH' | 'WEBHOOK')[];
  actions: string[];
}

// ===== DASHBOARD & WIDGET INTERFACES =====
export interface SmartAnalyticsDashboardConfig {
  widgets: SmartAnalyticsWidgetConfig[];
  layout: DashboardLayoutConfig;
  refreshInterval: number;
  autoRefresh: boolean;
  theme: 'LIGHT' | 'DARK' | 'AUTO';
  density: 'COMPACT' | 'COMFORTABLE' | 'SPACIOUS';
  customizations: DashboardCustomizationDto[];
}

export interface SmartAnalyticsWidgetConfig {
  widgetId: string;
  type: 'CHART' | 'TABLE' | 'METRIC' | 'ALERT' | 'MAP' | 'TIMELINE' | 'HEATMAP';
  title: string;
  subtitle?: string;
  dataSource: string;
  queryParams: any;
  refreshInterval: number;
  size: WidgetSizeDto;
  position: WidgetPositionDto;
  visualization: VisualizationConfigDto;
  interactivity: InteractivityConfigDto;
  alerts: WidgetAlertConfigDto[];
}

export interface WidgetSizeDto {
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  resizable: boolean;
}

export interface WidgetPositionDto {
  row: number;
  column: number;
  layer?: number;
  sticky?: boolean;
}

export interface VisualizationConfigDto {
  chartType?: 'LINE' | 'BAR' | 'PIE' | 'AREA' | 'SCATTER' | 'HEATMAP' | 'GAUGE';
  colors: string[];
  axes: AxisConfigDto[];
  legend: LegendConfigDto;
  animation: AnimationConfigDto;
  responsive: boolean;
}

export interface AxisConfigDto {
  axis: 'X' | 'Y' | 'Y2';
  label: string;
  scale: 'LINEAR' | 'LOG' | 'TIME';
  format: string;
  min?: number;
  max?: number;
}

export interface LegendConfigDto {
  show: boolean;
  position: 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT';
  orientation: 'HORIZONTAL' | 'VERTICAL';
  interactive: boolean;
}

export interface AnimationConfigDto {
  enabled: boolean;
  duration: number;
  easing: string;
  delay: number;
}

export interface InteractivityConfigDto {
  clickable: boolean;
  hoverable: boolean;
  zoomable: boolean;
  pannable: boolean;
  selectable: boolean;
  exportable: boolean;
  drilldown: DrilldownConfigDto[];
}

export interface DrilldownConfigDto {
  level: number;
  target: string;
  parameters: Record<string, string>;
  title: string;
}

export interface WidgetAlertConfigDto {
  metric: string;
  threshold: number;
  comparison: 'GT' | 'LT' | 'EQ' | 'GTE' | 'LTE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  message: string;
  actions: string[];
}

export interface DashboardLayoutConfig {
  type: 'GRID' | 'MASONRY' | 'FLEX';
  columns: number;
  rowHeight: number;
  margin: [number, number];
  containerPadding: [number, number];
  responsive: ResponsiveLayoutDto[];
}

export interface ResponsiveLayoutDto {
  breakpoint: string;
  columns: number;
  layouts: WidgetLayoutDto[];
}

export interface WidgetLayoutDto {
  widgetId: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export interface DashboardCustomizationDto {
  property: string;
  value: any;
  scope: 'GLOBAL' | 'WIDGET' | 'USER';
  persistent: boolean;
}

// ===== EXPORT & REPORTING INTERFACES =====
export interface SmartAnalyticsExportConfig {
  format: 'PDF' | 'EXCEL' | 'CSV' | 'JSON' | 'XML';
  template: string;
  includeCharts: boolean;
  includeRawData: boolean;
  includeMetadata: boolean;
  compression: boolean;
  encryption: boolean;
  watermark?: WatermarkConfigDto;
  scheduling?: ScheduleConfigDto;
}

export interface WatermarkConfigDto {
  text: string;
  position: 'TOP_LEFT' | 'TOP_RIGHT' | 'BOTTOM_LEFT' | 'BOTTOM_RIGHT' | 'CENTER';
  opacity: number;
  fontSize: number;
  color: string;
}

export interface ScheduleConfigDto {
  frequency: 'HOURLY' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  time: string;
  timezone: string;
  recipients: string[];
  enabled: boolean;
  nextRun: string;
}

// ===== SYSTEM HEALTH & MONITORING INTERFACES =====
export interface SmartAnalyticsSystemHealth {
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'MAINTENANCE';
  uptime: number;
  version: string;
  lastUpdate: string;
  components: ComponentHealthDto[];
  metrics: SystemMetricDto[];
  alerts: SystemAlertDto[];
  maintenanceSchedule: MaintenanceScheduleDto[];
}

export interface ComponentHealthDto {
  component: string;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'OFFLINE';
  responseTime: number;
  errorRate: number;
  throughput: number;
  lastCheck: string;
  details?: Record<string, any>;
}

export interface SystemMetricDto {
  name: string;
  value: number;
  unit: string;
  trend: 'UP' | 'DOWN' | 'STABLE';
  threshold: {
    warning: number;
    critical: number;
  };
  lastUpdated: string;
}

export interface SystemAlertDto {
  id: string;
  component: string;
  level: 'INFO' | 'WARNING' | 'ERROR' | 'CRITICAL';
  message: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
}

export interface MaintenanceScheduleDto {
  id: string;
  type: 'REGULAR' | 'EMERGENCY' | 'UPGRADE';
  description: string;
  scheduledStart: string;
  scheduledEnd: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  impact: 'LOW' | 'MEDIUM' | 'HIGH';
  affectedComponents: string[];
}

// ===== INTEGRATION & API INTERFACES =====
export interface SmartAnalyticsIntegrationConfig {
  integrations: IntegrationEndpointDto[];
  authentication: AuthenticationConfigDto;
  rateLimit: RateLimitConfigDto;
  monitoring: IntegrationMonitoringDto;
  errorHandling: ErrorHandlingConfigDto;
}

export interface IntegrationEndpointDto {
  name: string;
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers: Record<string, string>;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  cacheable: boolean;
  rateLimited: boolean;
}

export interface AuthenticationConfigDto {
  type: 'NONE' | 'API_KEY' | 'BEARER_TOKEN' | 'OAUTH2' | 'BASIC_AUTH';
  credentials: Record<string, string>;
  tokenRefreshUrl?: string;
  tokenValidation?: TokenValidationDto;
}

export interface TokenValidationDto {
  validateOnStartup: boolean;
  revalidateInterval: number;
  failureAction: 'RETRY' | 'DISABLE' | 'ALERT';
}

export interface RateLimitConfigDto {
  requestsPerMinute: number;
  requestsPerHour: number;
  requestsPerDay: number;
  burstLimit: number;
  strategy: 'FIXED_WINDOW' | 'SLIDING_WINDOW' | 'TOKEN_BUCKET';
}

export interface IntegrationMonitoringDto {
  enabled: boolean;
  logRequests: boolean;
  logResponses: boolean;
  trackLatency: boolean;
  alertOnFailure: boolean;
  healthCheck: HealthCheckConfigDto;
}

export interface HealthCheckConfigDto {
  enabled: boolean;
  interval: number;
  timeout: number;
  endpoint: string;
  expectedStatusCodes: number[];
  retryOnFailure: boolean;
}

export interface ErrorHandlingConfigDto {
  strategy: 'FAIL_FAST' | 'RETRY' | 'CIRCUIT_BREAKER';
  maxRetries: number;
  backoffMultiplier: number;
  circuitBreakerThreshold: number;
  circuitBreakerTimeout: number;
  fallbackActions: FallbackActionDto[];
}

export interface FallbackActionDto {
  condition: string;
  action: 'CACHE_RESPONSE' | 'DEFAULT_VALUE' | 'OFFLINE_MODE' | 'ALERT_USER';
  parameters: Record<string, any>;
}

// ===== TYPE UNIONS AND UTILITIES =====
export type SmartAnalyticsDataSource = 
  | 'expiry-analytics'
  | 'notifications' 
  | 'multi-branch-coordination'
  | 'cache'
  | 'real-time-feed';

export type SmartAnalyticsEventType =
  | 'data-updated'
  | 'alert-triggered'
  | 'threshold-exceeded'
  | 'system-error'
  | 'user-action'
  | 'cache-invalidated';

export type SmartAnalyticsPermission =
  | 'view-analytics'
  | 'export-data'
  | 'manage-alerts'
  | 'configure-widgets'
  | 'system-administration';

// ===== UTILITY TYPES =====
export interface SmartAnalyticsEvent<T = any> {
  type: SmartAnalyticsEventType;
  source: SmartAnalyticsDataSource;
  timestamp: string;
  data: T;
  metadata?: Record<string, any>;
}

export interface SmartAnalyticsSubscription {
  id: string;
  eventTypes: SmartAnalyticsEventType[];
  filters: Record<string, any>;
  callback: (event: SmartAnalyticsEvent) => void;
  active: boolean;
  createdAt: string;
}

export interface SmartAnalyticsError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
  source: SmartAnalyticsDataSource;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  recoverable: boolean;
}

// ===== GLOBAL CONSTANTS =====
export const SMART_ANALYTICS_CONSTANTS = {
  CACHE_TTL: {
    EXPIRY_ANALYTICS: 5 * 60 * 1000, // 5 minutes
    NOTIFICATIONS: 2 * 60 * 1000, // 2 minutes
    MULTI_BRANCH: 60 * 60 * 1000, // 1 hour
    REPORTS: 24 * 60 * 60 * 1000, // 24 hours
  },
  REFRESH_INTERVALS: {
    DASHBOARD: 2 * 60 * 1000, // 2 minutes
    ALERTS: 30 * 1000, // 30 seconds
    REAL_TIME: 5 * 1000, // 5 seconds
    BACKGROUND: 15 * 60 * 1000, // 15 minutes
  },
  PERFORMANCE_THRESHOLDS: {
    QUERY_TIME_WARNING: 2000, // 2 seconds
    QUERY_TIME_CRITICAL: 5000, // 5 seconds
    CACHE_HIT_RATE_WARNING: 0.7, // 70%
    CACHE_HIT_RATE_CRITICAL: 0.5, // 50%
  },
  DATA_LIMITS: {
    MAX_RECORDS_PER_QUERY: 10000,
    MAX_EXPORT_RECORDS: 100000,
    MAX_CONCURRENT_QUERIES: 10,
    MAX_CACHE_SIZE_MB: 500,
  }
} as const;