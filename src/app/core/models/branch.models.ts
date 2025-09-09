// === CORE BRANCH INTERFACES ===

export interface Branch {
  id: number;
  branchId?: number; // Alternative id field used in some contexts
  branchName: string;
  branchCode: string;
  address: string;
  city: string;
  province: string;
  region?: string; // Geographic region for grouping/filtering
  postalCode?: string;
  phone?: string;
  email?: string;
  managerName?: string;
  isActive: boolean;
  branchType: 'head_office' | 'regional' | 'local';
  openingDate: string;
  employeeCount?: number;
  storeSize?: number;
  
  // Coordination specific properties
  healthScore?: number;
  lastSync?: string;
  coordinationStatus?: 'optimal' | 'warning' | 'error' | 'offline' | 'pending';
  pendingTransfers?: number;
  criticalAlerts?: number;
}

export interface BranchHealth {
  branchId: number;
  overallScore: number;
  lastUpdated: string;
  metrics: {
    inventoryHealth: number;
    salesPerformance: number;
    operationalEfficiency: number;
    coordinationStatus: number;
  };
  alerts: {
    critical: number;
    warning: number;
    info: number;
  };
}

// === COORDINATION INTERFACES ===

export interface CoordinationMetrics {
  totalBranches: number;
  activeBranches: number;
  offlineBranches: number;
  pendingTransfers: number;
  completedTransfers: number;
  averageHealthScore: number;
  criticalAlerts: number;
  lastOptimization: string;
  nextOptimization: string;
}

export interface BranchConnection {
  branchId: number;
  status: 'online' | 'offline' | 'syncing';
  lastPing: string;
  latency: number;
  dataConsistency: number;
}

// === PERFORMANCE INTERFACES ===

export interface BranchPerformanceMetrics {
  branchId: number;
  period: 'daily' | 'weekly' | 'monthly';
  revenue: number;
  transactions: number;
  averageTransaction: number;
  profitMargin: number;
  inventoryTurnover: number;
  stockoutEvents: number;
  customerSatisfaction?: number;
  wastePercentage: number;
}

export interface BranchComparison {
  branches: {
    branchId: number;
    branchName: string;
    score: number;
    rank: number;
    change: number; // +/- from previous period
  }[];
  benchmarks: {
    industry: number;
    internal: number;
    target: number;
  };
}

// === TRANSFER INTERFACES ===

export interface TransferRequest {
  id?: number;
  sourcebranchId: number;
  targetBranchId: number;
  productId: number;
  quantity: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  reason: string;
  expectedDelivery?: string;
  cost?: number;
  status?: 'pending' | 'approved' | 'in_transit' | 'completed' | 'cancelled';
}

export interface TransferRecommendation {
  id: string;
  sourcebranchId: number;
  sourceBranchName: string;
  targetBranchId: number;
  targetBranchName: string;
  productId: number;
  productName: string;
  recommendedQuantity: number;
  currentSourceStock: number;
  currentTargetStock: number;
  potentialValue: number;
  roiPercentage: number;
  confidenceLevel: number;
  urgencyLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  reasoning: string[];
  deadline: string;
  riskFactors: string[];
  implementation: {
    cost: number;
    timeRequired: string;
    resources: string[];
  };
}

// === OPTIMIZATION INTERFACES ===

export interface OptimizationOpportunity {
  id: string;
  type: 'inventory' | 'pricing' | 'transfer' | 'waste' | 'efficiency';
  title: string;
  description: string;
  potentialSavings: number;
  implementationCost: number;
  roiPercentage: number;
  paybackPeriod: string;
  estimatedTime?: number; // Hours required for implementation
  priority: 'Low' | 'Medium' | 'High';
  affectedBranches: number[];
  requirements: string[];
  timeToImplement: string;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface OptimizationExecution {
  opportunityId: string;
  dryRun: boolean;
  results: {
    success: boolean;
    actualSavings: number;
    implementationTime: string;
    affectedMetrics: Record<string, number>;
    issues: string[];
    recommendations: string[];
  };
  executedAt: string;
  executedBy: number;
}

// === API RESPONSE WRAPPERS ===

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    current: number;
    total: number;
    pageSize: number;
    totalItems: number;
  };
}

// === UTILITY TYPES ===

export type BranchRole = 'head_office' | 'regional' | 'local';
export type HealthStatus = 'excellent' | 'good' | 'warning' | 'critical' | 'unknown';
export type CoordinationStatus = 'optimal' | 'warning' | 'error' | 'offline' | 'pending';
export type UrgencyLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type OptimizationType = 'inventory' | 'pricing' | 'transfer' | 'waste' | 'efficiency';
export type TransferStatus = 'pending' | 'approved' | 'in_transit' | 'completed' | 'cancelled';