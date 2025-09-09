// Advanced notification intelligence and analytics service for multi-branch operations
import { Injectable, signal, computed } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest, interval } from 'rxjs';
import { map, filter, switchMap, tap } from 'rxjs/operators';
import { MultiBranchNotification } from './notification.service';

export interface NotificationPattern {
  id: string;
  name: string;
  pattern: PatternRule[];
  frequency: number; // occurrences per time window
  timeWindow: number; // in minutes
  branches: number[];
  predictedNext?: string; // ISO timestamp
  confidence: number; // 0-100
  actionRecommendation?: string;
}

export interface PatternRule {
  field: keyof MultiBranchNotification;
  operator: 'equals' | 'contains' | 'frequency' | 'sequence';
  value: any;
  weight: number; // importance of this rule
}

export interface PerformanceMetrics {
  branchId: number;
  branchName: string;
  notificationVolume: number;
  responseTime: number; // average in minutes
  resolutionRate: number; // percentage
  criticalAlerts: number;
  systemLoad: number;
  userSatisfaction: number; // 0-100
  trends: TrendData[];
  lastUpdated: string;
}

export interface TrendData {
  timestamp: string;
  metric: string;
  value: number;
}

export interface IntelligentInsight {
  id: string;
  type: 'anomaly' | 'pattern' | 'prediction' | 'optimization' | 'alert';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical';
  branchIds: number[];
  data: any;
  confidence: number;
  actionItems: string[];
  estimatedImpact: string;
  createdAt: string;
  isAcknowledged: boolean;
}

export interface PredictiveAlert {
  id: string;
  type: string;
  branchId: number;
  predictedAt: string;
  probability: number;
  timeToOccurrence: number; // minutes
  preventionActions: string[];
  estimatedImpact: {
    financial: number;
    operational: string;
    users: number;
  };
}

export interface NotificationHealth {
  branchId: number;
  healthScore: number; // 0-100
  factors: HealthFactor[];
  recommendations: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export interface HealthFactor {
  name: string;
  score: number;
  impact: number;
  description: string;
}

export interface AnalyticsData {
  hourly: DataPoint[];
  daily: DataPoint[];
  weekly: DataPoint[];
  monthly: DataPoint[];
}

export interface DataPoint {
  timestamp: string;
  value: number;
  metadata?: any;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationIntelligenceService {
  // State management
  private readonly _patterns = signal<NotificationPattern[]>([]);
  private readonly _insights = signal<IntelligentInsight[]>([]);
  private readonly _predictions = signal<PredictiveAlert[]>([]);
  private readonly _performanceMetrics = signal<PerformanceMetrics[]>([]);
  private readonly _notificationHealth = signal<NotificationHealth[]>([]);
  private readonly _analyticsData = signal<AnalyticsData>({
    hourly: [],
    daily: [],
    weekly: [],
    monthly: []
  });

  // Public readonly signals
  readonly patterns = this._patterns.asReadonly();
  readonly insights = this._insights.asReadonly();
  readonly predictions = this._predictions.asReadonly();
  readonly performanceMetrics = this._performanceMetrics.asReadonly();
  readonly notificationHealth = this._notificationHealth.asReadonly();
  readonly analyticsData = this._analyticsData.asReadonly();

  // Computed analytics
  readonly overallHealth = computed(() => {
    const health = this._notificationHealth();
    if (health.length === 0) return 0;
    return health.reduce((sum, h) => sum + h.healthScore, 0) / health.length;
  });

  readonly criticalInsights = computed(() => 
    this._insights().filter(i => i.severity === 'critical' && !i.isAcknowledged)
  );

  readonly highRiskBranches = computed(() => 
    this._notificationHealth().filter(h => h.riskLevel === 'high' || h.riskLevel === 'critical')
  );

  readonly upcomingAlerts = computed(() => 
    this._predictions().filter(p => p.timeToOccurrence < 60) // Next hour
  );

  readonly intelligenceSummary = computed(() => {
    const insights = this._insights();
    const predictions = this._predictions();
    const health = this._notificationHealth();
    
    return {
      totalInsights: insights.length,
      criticalInsights: insights.filter(i => i.severity === 'critical').length,
      predictions: predictions.length,
      highRiskPredictions: predictions.filter(p => p.probability > 0.8).length,
      averageHealth: this.overallHealth(),
      riskBranches: health.filter(h => h.riskLevel !== 'low').length,
      lastAnalysis: new Date().toISOString()
    };
  });

  constructor() {
    this.initializePatterns();
    this.initializePerformanceMetrics();
    this.startIntelligenceEngine();
    this.startPredictiveAnalysis();
    this.startHealthMonitoring();
  }

  private initializePatterns() {
    const initialPatterns: NotificationPattern[] = [
      {
        id: 'system-failure-cascade',
        name: 'System Failure Cascade Pattern',
        pattern: [
          { field: 'type', operator: 'equals', value: 'system', weight: 0.4 },
          { field: 'severity', operator: 'equals', value: 'error', weight: 0.6 }
        ],
        frequency: 3,
        timeWindow: 15, // 15 minutes
        branches: [1, 2, 3, 4, 5],
        confidence: 85,
        actionRecommendation: 'Investigate common system dependencies'
      },
      {
        id: 'transfer-spike-pattern',
        name: 'Transfer Volume Spike Pattern',
        pattern: [
          { field: 'type', operator: 'equals', value: 'transfer', weight: 0.5 },
          { field: 'actionRequired', operator: 'equals', value: true, weight: 0.5 }
        ],
        frequency: 5,
        timeWindow: 30,
        branches: [1, 2, 3],
        confidence: 92,
        actionRecommendation: 'Scale up approval resources'
      },
      {
        id: 'coordination-stress-pattern',
        name: 'Cross-Branch Coordination Stress',
        pattern: [
          { field: 'type', operator: 'equals', value: 'coordination', weight: 0.7 },
          { field: 'severity', operator: 'equals', value: 'warning', weight: 0.3 }
        ],
        frequency: 4,
        timeWindow: 45,
        branches: [3, 4, 5],
        confidence: 78,
        actionRecommendation: 'Optimize synchronization protocols'
      }
    ];

    this._patterns.set(initialPatterns);
  }

  private initializePerformanceMetrics() {
    const branches = [
      { id: 1, name: 'Jakarta' },
      { id: 2, name: 'Surabaya' },
      { id: 3, name: 'Bandung' },
      { id: 4, name: 'Medan' },
      { id: 5, name: 'Semarang' }
    ];

    const initialMetrics = branches.map((branch, index): PerformanceMetrics => ({
      branchId: branch.id,
      branchName: `Branch ${branch.name}`,
      notificationVolume: Math.floor(Math.random() * 100) + 50,
      responseTime: Math.random() * 30 + 5,
      resolutionRate: Math.random() * 30 + 70,
      criticalAlerts: Math.floor(Math.random() * 10),
      systemLoad: Math.random() * 40 + 30,
      userSatisfaction: Math.random() * 20 + 75,
      trends: this.generateTrendData(),
      lastUpdated: new Date().toISOString()
    }));

    this._performanceMetrics.set(initialMetrics);

    // Initialize health scores
    const healthScores = initialMetrics.map(metric => this.calculateBranchHealth(metric));
    this._notificationHealth.set(healthScores);
  }

  private generateTrendData(): TrendData[] {
    const trends: TrendData[] = [];
    const metrics = ['volume', 'responseTime', 'resolutionRate', 'systemLoad'];
    
    for (let i = 0; i < 24; i++) {
      const timestamp = new Date(Date.now() - i * 60 * 60 * 1000).toISOString();
      metrics.forEach(metric => {
        trends.push({
          timestamp,
          metric,
          value: Math.random() * 100
        });
      });
    }
    
    return trends;
  }

  private calculateBranchHealth(metrics: PerformanceMetrics): NotificationHealth {
    const factors: HealthFactor[] = [
      {
        name: 'Response Time',
        score: Math.max(0, 100 - (metrics.responseTime / 30) * 100),
        impact: 0.3,
        description: `Average response time: ${metrics.responseTime.toFixed(1)} minutes`
      },
      {
        name: 'Resolution Rate',
        score: metrics.resolutionRate,
        impact: 0.25,
        description: `${metrics.resolutionRate.toFixed(1)}% of notifications resolved`
      },
      {
        name: 'System Load',
        score: Math.max(0, 100 - metrics.systemLoad),
        impact: 0.2,
        description: `Current system load: ${metrics.systemLoad.toFixed(1)}%`
      },
      {
        name: 'Critical Alerts',
        score: Math.max(0, 100 - (metrics.criticalAlerts * 10)),
        impact: 0.15,
        description: `${metrics.criticalAlerts} critical alerts`
      },
      {
        name: 'User Satisfaction',
        score: metrics.userSatisfaction,
        impact: 0.1,
        description: `User satisfaction: ${metrics.userSatisfaction.toFixed(1)}%`
      }
    ];

    const healthScore = factors.reduce((sum, factor) => 
      sum + (factor.score * factor.impact), 0
    );

    const riskLevel = healthScore > 80 ? 'low' : 
                     healthScore > 60 ? 'medium' : 
                     healthScore > 40 ? 'high' : 'critical';

    return {
      branchId: metrics.branchId,
      healthScore,
      factors,
      recommendations: this.generateHealthRecommendations(factors, riskLevel),
      riskLevel
    };
  }

  private generateHealthRecommendations(factors: HealthFactor[], riskLevel: string): string[] {
    const recommendations: string[] = [];

    if (riskLevel !== 'low') {
      // Find the worst performing factors
      const sortedFactors = factors.sort((a, b) => a.score - b.score);
      
      if (sortedFactors[0].name === 'Response Time') {
        recommendations.push('Increase notification handling resources');
        recommendations.push('Implement automated triage system');
      }
      
      if (sortedFactors[0].name === 'Resolution Rate') {
        recommendations.push('Review notification escalation procedures');
        recommendations.push('Provide additional staff training');
      }
      
      if (sortedFactors[0].name === 'System Load') {
        recommendations.push('Consider load balancing implementation');
        recommendations.push('Review system resource allocation');
      }
      
      if (sortedFactors[0].name === 'Critical Alerts') {
        recommendations.push('Investigate root causes of critical alerts');
        recommendations.push('Implement preventive monitoring');
      }
    }

    return recommendations;
  }

  // Intelligence Engine
  private startIntelligenceEngine() {
    // Run analysis every 5 minutes
    interval(300000).subscribe(() => {
      this.runIntelligenceAnalysis();
    });

    // Initial analysis
    this.runIntelligenceAnalysis();
  }

  private runIntelligenceAnalysis() {
    console.log('🧠 Running intelligence analysis...');
    
    // Pattern detection
    this.detectPatterns();
    
    // Anomaly detection
    this.detectAnomalies();
    
    // Optimization insights
    this.generateOptimizationInsights();
    
    // Update health scores
    this.updateHealthScores();
  }

  private detectPatterns() {
    // Mock pattern detection - in real implementation, this would analyze notification history
    if (Math.random() > 0.8) {
      const insight: IntelligentInsight = {
        id: this.generateId(),
        type: 'pattern',
        title: 'Recurring System Alert Pattern Detected',
        description: 'Database connection timeouts are occurring in a predictable pattern every 2 hours across multiple branches.',
        severity: 'warning',
        branchIds: [1, 3, 5],
        data: {
          pattern: 'database-timeout',
          interval: 120, // minutes
          confidence: 0.87
        },
        confidence: 87,
        actionItems: [
          'Review database connection pool settings',
          'Implement connection health monitoring',
          'Consider database load balancing'
        ],
        estimatedImpact: 'Medium - potential 15% improvement in system stability',
        createdAt: new Date().toISOString(),
        isAcknowledged: false
      };

      this.addInsight(insight);
    }
  }

  private detectAnomalies() {
    // Mock anomaly detection
    if (Math.random() > 0.9) {
      const insight: IntelligentInsight = {
        id: this.generateId(),
        type: 'anomaly',
        title: 'Unusual Notification Volume Spike',
        description: 'Branch Bandung is experiencing 300% higher notification volume than normal for this time period.',
        severity: 'critical',
        branchIds: [3],
        data: {
          normalVolume: 45,
          currentVolume: 135,
          threshold: 90
        },
        confidence: 95,
        actionItems: [
          'Investigate potential system issues',
          'Check for external events affecting operations',
          'Consider temporary resource reallocation'
        ],
        estimatedImpact: 'High - immediate action required to prevent service degradation',
        createdAt: new Date().toISOString(),
        isAcknowledged: false
      };

      this.addInsight(insight);
    }
  }

  private generateOptimizationInsights() {
    // Mock optimization insights
    if (Math.random() > 0.85) {
      const insight: IntelligentInsight = {
        id: this.generateId(),
        type: 'optimization',
        title: 'Notification Routing Optimization Opportunity',
        description: 'Current routing rules can be optimized to reduce response times by 25% based on historical data analysis.',
        severity: 'info',
        branchIds: [1, 2, 3, 4, 5],
        data: {
          currentAvgResponseTime: 12.5,
          optimizedAvgResponseTime: 9.4,
          potentialSavings: 3.1
        },
        confidence: 78,
        actionItems: [
          'Update notification routing priorities',
          'Implement smart load distribution',
          'Configure dynamic escalation thresholds'
        ],
        estimatedImpact: 'Medium - 25% improvement in response times',
        createdAt: new Date().toISOString(),
        isAcknowledged: false
      };

      this.addInsight(insight);
    }
  }

  private addInsight(insight: IntelligentInsight) {
    const current = this._insights();
    this._insights.set([insight, ...current]);
  }

  // Predictive Analysis
  private startPredictiveAnalysis() {
    // Run predictions every 10 minutes
    interval(600000).subscribe(() => {
      this.generatePredictions();
    });

    // Initial predictions
    this.generatePredictions();
  }

  private generatePredictions() {
    console.log('🔮 Generating predictive alerts...');
    
    // Mock predictive analysis
    if (Math.random() > 0.7) {
      const prediction: PredictiveAlert = {
        id: this.generateId(),
        type: 'system-overload',
        branchId: Math.floor(Math.random() * 5) + 1,
        predictedAt: new Date().toISOString(),
        probability: Math.random() * 0.3 + 0.7, // 70-100%
        timeToOccurrence: Math.random() * 120 + 30, // 30-150 minutes
        preventionActions: [
          'Scale up processing resources',
          'Implement request throttling',
          'Activate backup systems'
        ],
        estimatedImpact: {
          financial: Math.random() * 50000 + 10000,
          operational: 'Service slowdown and potential downtime',
          users: Math.floor(Math.random() * 1000) + 500
        }
      };

      const current = this._predictions();
      this._predictions.set([prediction, ...current]);
    }
  }

  // Health Monitoring
  private startHealthMonitoring() {
    // Update health scores every minute
    interval(60000).subscribe(() => {
      this.updateHealthScores();
    });
  }

  private updateHealthScores() {
    const currentMetrics = this._performanceMetrics();
    const updatedMetrics = currentMetrics.map(metric => ({
      ...metric,
      notificationVolume: Math.max(0, metric.notificationVolume + (Math.random() - 0.5) * 10),
      responseTime: Math.max(1, metric.responseTime + (Math.random() - 0.5) * 5),
      resolutionRate: Math.max(50, Math.min(100, metric.resolutionRate + (Math.random() - 0.5) * 10)),
      systemLoad: Math.max(10, Math.min(100, metric.systemLoad + (Math.random() - 0.5) * 15)),
      lastUpdated: new Date().toISOString()
    }));

    this._performanceMetrics.set(updatedMetrics);

    // Update health scores
    const healthScores = updatedMetrics.map(metric => this.calculateBranchHealth(metric));
    this._notificationHealth.set(healthScores);
  }

  // Public API methods
  acknowledgeInsight(insightId: string): void {
    const current = this._insights();
    const updated = current.map(insight => 
      insight.id === insightId ? { ...insight, isAcknowledged: true } : insight
    );
    this._insights.set(updated);
  }

  dismissPrediction(predictionId: string): void {
    const current = this._predictions();
    const updated = current.filter(p => p.id !== predictionId);
    this._predictions.set(updated);
  }

  getBranchAnalytics(branchId: number): Observable<any> {
    return combineLatest([
      new BehaviorSubject(this._performanceMetrics().find(m => m.branchId === branchId)),
      new BehaviorSubject(this._notificationHealth().find(h => h.branchId === branchId)),
      new BehaviorSubject(this._insights().filter(i => i.branchIds.includes(branchId))),
      new BehaviorSubject(this._predictions().filter(p => p.branchId === branchId))
    ]).pipe(
      map(([metrics, health, insights, predictions]) => ({
        metrics,
        health,
        insights,
        predictions,
        summary: {
          healthScore: health?.healthScore || 0,
          riskLevel: health?.riskLevel || 'unknown',
          activeInsights: insights.filter(i => !i.isAcknowledged).length,
          upcomingAlerts: predictions.length
        }
      }))
    );
  }

  getSystemWideAnalytics(): Observable<any> {
    return new BehaviorSubject({
      overallHealth: this.overallHealth(),
      totalBranches: this._performanceMetrics().length,
      criticalInsights: this.criticalInsights().length,
      predictions: this._predictions().length,
      highRiskBranches: this.highRiskBranches().length,
      patterns: this._patterns().length,
      summary: this.intelligenceSummary()
    }).asObservable();
  }

  exportIntelligenceData(): any {
    return {
      patterns: this._patterns(),
      insights: this._insights(),
      predictions: this._predictions(),
      performanceMetrics: this._performanceMetrics(),
      notificationHealth: this._notificationHealth(),
      analyticsData: this._analyticsData(),
      summary: this.intelligenceSummary(),
      exportedAt: new Date().toISOString()
    };
  }

  // Machine learning simulation methods
  trainPatternRecognition(notifications: MultiBranchNotification[]): void {
    console.log('🤖 Training pattern recognition with', notifications.length, 'notifications');
    // Mock ML training - in real implementation, this would train ML models
  }

  updatePredictionModels(feedback: any[]): void {
    console.log('📈 Updating prediction models with feedback:', feedback.length, 'items');
    // Mock model updates
  }

  private generateId(): string {
    return `intel-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}