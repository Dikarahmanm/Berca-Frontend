// Smart Notification API Interfaces
// Based on the SmartNotification API endpoints

export interface SmartNotificationResponse {
  success: boolean;
  message: string;
  data: SmartNotification[];
  timestamp: string;
  errors?: string[] | null;
  error?: string | null;
}

export interface SmartNotification {
  id?: number;
  type: string;
  priority: number;
  title: string;
  message: string;
  potentialLoss?: number;
  actionDeadline?: string;
  actionUrl?: string;
  actionItems?: string[];
  escalationRule?: EscalationRule;
  businessImpact?: BusinessImpact;
  affectedBatches?: AffectedBatch[];
  metadata?: any;
  createdAt?: string;
  isRead?: boolean;
}

export interface SmartNotificationDto {
  type: string;
  priority: number;
  title: string;
  message: string;
  potentialLoss: number;
  actionDeadline: string;
  actionUrl: string;
  actionItems: string[];
  escalationRule: EscalationRule;
  businessImpact: BusinessImpact;
  affectedBatches: AffectedBatch[];
}

export interface EscalationRule {
  escalateAfterHours: number;
  escalateToRoles: string[];
  requireAcknowledgment: boolean;
  notificationChannels: number[];
}

export interface BusinessImpact {
  financialRisk: number;
  operationalImpact: string;
  customerImpact: string;
  complianceRisk: string;
}

export interface AffectedBatch {
  batchId: number;
  batchNumber: string;
  quantity: number;
  value: number;
  expiryDate: string;
}

export interface NotificationPreferences {
  userId: number;
  emailNotifications: boolean;
  pushNotifications: boolean;
  smsNotifications: boolean;
  expiryAlerts: boolean;
  stockAlerts: boolean;
  financialAlerts: boolean;
  alertFrequency: string;
  quietHours: QuietHours;
}

export interface QuietHours {
  start: string;
  end: string;
}

export interface NotificationSystemHealth {
  totalActiveNotifications: number;
  criticalNotifications: number;
  highNotifications: number;
  mediumNotifications: number;
  lowNotifications: number;
  totalValueAtRisk: number;
  overdueNotifications: number;
  checkTimestamp: string;
}

export interface EscalationAlert {
  originalNotificationId: number;
  escalatedAt: string;
  escalationReason: string;
  escalatedToUserCount: number;
  priority: string;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
  errors: string[] | null;
  error: string | null;
}
