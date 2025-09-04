// Member Credit Utility Functions - Complete Business Logic Helpers
// POS Toko Eniwan - Phase 1 Implementation
// Reusable functions for credit calculations, validations, and formatting

import { 
  MemberCreditSummaryDto, 
  CreditValidationRequestDto,
  CreditStatus,
  RiskLevel,
  CreditCalculationResult
} from '../interfaces/member-credit.interfaces';

// ===== CREDIT CALCULATION UTILITIES =====

/**
 * Calculate credit utilization percentage
 */
export function calculateCreditUtilization(currentDebt: number, creditLimit: number): number {
  if (creditLimit === 0) return 0;
  return Math.min(100, Math.max(0, (currentDebt / creditLimit) * 100));
}

/**
 * Calculate available credit amount
 */
export function calculateAvailableCredit(creditLimit: number, currentDebt: number): number {
  return Math.max(0, creditLimit - currentDebt);
}

/**
 * Calculate credit score based on payment history and utilization
 */
export function calculateCreditScore(
  paymentSuccessRate: number,
  creditUtilization: number,
  daysOverdue: number,
  totalTransactions: number,
  avgTransactionAmount: number
): number {
  // Base score calculation (0-1000 scale)
  let score = 850; // Start with good score

  // Payment success rate factor (40% weight)
  score += (paymentSuccessRate - 85) * 2; // Bonus/penalty based on >85% success rate

  // Credit utilization factor (25% weight)
  if (creditUtilization > 80) {
    score -= (creditUtilization - 80) * 5; // Heavy penalty for high utilization
  } else if (creditUtilization > 50) {
    score -= (creditUtilization - 50) * 2; // Moderate penalty
  } else if (creditUtilization < 30) {
    score += (30 - creditUtilization) * 1; // Small bonus for low utilization
  }

  // Overdue days factor (20% weight)
  if (daysOverdue > 0) {
    score -= Math.min(200, daysOverdue * 3); // Up to -200 points for overdue
  }

  // Transaction history factor (10% weight)
  const transactionScore = Math.min(50, totalTransactions); // Up to 50 bonus points
  score += transactionScore;

  // Transaction amount factor (5% weight)
  if (avgTransactionAmount > 100000) { // Above 100k IDR average
    score += Math.min(25, avgTransactionAmount / 10000); // Up to 25 bonus points
  }

  // Ensure score is within bounds
  return Math.max(300, Math.min(1000, Math.round(score)));
}

/**
 * Determine credit status based on utilization and overdue days
 * Fix: Only consider overdue if member has actual debt
 */
export function determineCreditStatus(
  creditUtilization: number,
  daysOverdue: number,
  paymentSuccessRate: number,
  currentDebt: number = 0
): CreditStatus {
  // Blocked conditions
  if ((daysOverdue > 90 && currentDebt > 0) || paymentSuccessRate < 50) {
    return CreditStatus.BLOCKED;
  }

  // Bad conditions - only if there's actual debt
  if ((daysOverdue > 30 && currentDebt > 0) || creditUtilization > 95 || paymentSuccessRate < 70) {
    return CreditStatus.BAD;
  }

  // Warning conditions - only if there's actual debt for overdue check
  if ((daysOverdue > 0 && currentDebt > 0) || creditUtilization > 80 || paymentSuccessRate < 85) {
    return CreditStatus.WARNING;
  }

  // Good status
  return CreditStatus.GOOD;
}

/**
 * Determine risk level based on multiple factors
 */
export function determineRiskLevel(
  creditScore: number,
  creditUtilization: number,
  daysOverdue: number,
  overdueAmount: number,
  totalDebt: number
): RiskLevel {
  // Critical risk conditions
  if (creditScore < 500 || daysOverdue > 60 || overdueAmount > totalDebt * 0.5) {
    return RiskLevel.CRITICAL;
  }

  // High risk conditions  
  if (creditScore < 650 || daysOverdue > 30 || creditUtilization > 90) {
    return RiskLevel.HIGH;
  }

  // Medium risk conditions
  if (creditScore < 750 || daysOverdue > 0 || creditUtilization > 70) {
    return RiskLevel.MEDIUM;
  }

  // Low risk
  return RiskLevel.LOW;
}

/**
 * Calculate maximum allowed transaction based on risk level
 */
export function calculateMaxAllowedTransaction(
  availableCredit: number,
  riskLevel: RiskLevel,
  creditUtilization: number
): number {
  let maxAmount = availableCredit;

  // Apply risk-based limits
  switch (riskLevel) {
    case RiskLevel.CRITICAL:
      maxAmount = 0; // No transactions allowed
      break;
    case RiskLevel.HIGH:
      maxAmount = Math.min(maxAmount, availableCredit * 0.3); // Max 30% of available
      break;
    case RiskLevel.MEDIUM:
      maxAmount = Math.min(maxAmount, availableCredit * 0.6); // Max 60% of available
      break;
    case RiskLevel.LOW:
      maxAmount = Math.min(maxAmount, availableCredit * 0.8); // Max 80% of available
      break;
  }

  // Additional utilization-based limits
  if (creditUtilization > 80) {
    maxAmount = Math.min(maxAmount, availableCredit * 0.2); // Very conservative
  } else if (creditUtilization > 60) {
    maxAmount = Math.min(maxAmount, availableCredit * 0.5); // Conservative
  }

  return Math.max(0, Math.round(maxAmount));
}

/**
 * Calculate recommended credit limit based on member profile
 */
export function calculateRecommendedCreditLimit(
  totalSpent: number,
  averageTransactionValue: number,
  paymentSuccessRate: number,
  membershipDurationMonths: number,
  currentCreditScore: number
): number {
  // Base limit calculation using spending pattern
  let recommendedLimit = totalSpent * 0.3; // 30% of historical spending

  // Transaction frequency factor
  if (averageTransactionValue > 0) {
    const estimatedMonthlyTransactions = totalSpent / averageTransactionValue / membershipDurationMonths;
    recommendedLimit = Math.max(recommendedLimit, averageTransactionValue * estimatedMonthlyTransactions);
  }

  // Payment success rate multiplier
  const paymentMultiplier = paymentSuccessRate / 100;
  recommendedLimit *= paymentMultiplier;

  // Credit score adjustment
  if (currentCreditScore >= 800) {
    recommendedLimit *= 1.5; // 50% bonus for excellent score
  } else if (currentCreditScore >= 700) {
    recommendedLimit *= 1.2; // 20% bonus for good score
  } else if (currentCreditScore >= 600) {
    recommendedLimit *= 1.0; // No adjustment for fair score
  } else {
    recommendedLimit *= 0.7; // 30% reduction for poor score
  }

  // Membership duration bonus
  if (membershipDurationMonths >= 24) {
    recommendedLimit *= 1.3; // 30% bonus for 2+ years
  } else if (membershipDurationMonths >= 12) {
    recommendedLimit *= 1.1; // 10% bonus for 1+ year
  }

  // Set reasonable bounds
  const minLimit = 500000; // 500k IDR minimum
  const maxLimit = 50000000; // 50M IDR maximum
  
  return Math.max(minLimit, Math.min(maxLimit, Math.round(recommendedLimit)));
}

// ===== VALIDATION UTILITIES =====

/**
 * Validate credit transaction request
 */
export function validateCreditTransaction(
  member: MemberCreditSummaryDto,
  requestedAmount: number,
  currentDate: Date = new Date()
): { isValid: boolean; warnings: string[]; errors: string[] } {
  const warnings: string[] = [];
  const errors: string[] = [];

  // Basic amount validation
  if (requestedAmount <= 0) {
    errors.push('Transaction amount must be greater than 0');
  }

  // Credit eligibility check
  if (!member.isEligibleForCredit) {
    errors.push('Member is not eligible for credit');
  }

  // Credit status check
  if (member.statusDescription === 'Blocked') {
    errors.push('Member credit account is blocked');
  } else if (member.statusDescription === 'Bad') {
    errors.push('Member credit status is Bad - requires manager approval');
  }

  // Available credit check
  if (requestedAmount > member.availableCredit) {
    errors.push(`Insufficient credit limit. Available: ${formatCurrency(member.availableCredit)}`);
  }

  // Overdue payment check - Only if member actually has debt
  // Fix: Ignore overdue status if currentDebt is 0 (already paid off)
  if (member.daysOverdue > 0 && member.currentDebt > 0) {
    if (member.daysOverdue > 30) {
      errors.push(`Member has overdue payment for ${member.daysOverdue} days`);
    } else {
      warnings.push(`Member has overdue payment for ${member.daysOverdue} days`);
    }
  }

  // High utilization warning
  const newUtilization = calculateCreditUtilization(
    member.currentDebt + requestedAmount,
    member.creditLimit
  );
  
  if (newUtilization > 90) {
    warnings.push('Transaction will result in high credit utilization (>90%)');
  } else if (newUtilization > 80) {
    warnings.push('Transaction will result in high credit utilization (>80%)');
  }

  // Risk level check
  if (member.riskLevel === 'Critical') {
    errors.push('Member risk level is Critical - no transactions allowed');
  } else if (member.riskLevel === 'High') {
    warnings.push('Member risk level is High - consider cash payment instead');
  }

  // Maximum transaction limit check - only for POSMemberCreditDto
  if ('maxAllowedTransaction' in member && requestedAmount > (member as any).maxAllowedTransaction) {
    errors.push(`Amount exceeds maximum allowed transaction: ${formatCurrency((member as any).maxAllowedTransaction)}`);
  }

  return {
    isValid: errors.length === 0,
    warnings,
    errors
  };
}

/**
 * Validate payment request
 */
export function validatePaymentRequest(
  currentDebt: number,
  paymentAmount: number,
  allowPartialPayment: boolean = true
): { isValid: boolean; message?: string } {
  if (paymentAmount <= 0) {
    return { isValid: false, message: 'Payment amount must be greater than 0' };
  }

  if (currentDebt <= 0) {
    return { isValid: false, message: 'Member has no outstanding debt' };
  }

  if (paymentAmount > currentDebt && !allowPartialPayment) {
    return { isValid: false, message: 'Payment amount cannot exceed outstanding debt' };
  }

  return { isValid: true };
}

/**
 * Validate credit limit update
 */
export function validateCreditLimitUpdate(
  currentLimit: number,
  newLimit: number,
  currentDebt: number,
  memberRiskLevel: RiskLevel
): { isValid: boolean; message?: string; requiresApproval: boolean } {
  if (newLimit < 0) {
    return { isValid: false, message: 'Credit limit cannot be negative', requiresApproval: false };
  }

  if (newLimit < currentDebt) {
    return { 
      isValid: false, 
      message: `New limit cannot be less than current debt (${formatCurrency(currentDebt)})`,
      requiresApproval: false 
    };
  }

  // Check if increase requires approval
  const increaseAmount = newLimit - currentLimit;
  const requiresApproval = increaseAmount > currentLimit * 0.5 || // 50% increase
                          newLimit > 20000000 || // Above 20M IDR
                          memberRiskLevel === 'High' || memberRiskLevel === 'Critical';

  return { isValid: true, requiresApproval };
}

// ===== FORMATTING UTILITIES =====

/**
 * Format currency for Indonesian Rupiah
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format credit status with color coding
 */
export function formatCreditStatus(status: CreditStatus): { text: string; color: string; bgColor: string } {
  switch (status) {
    case CreditStatus.GOOD:
      return { text: 'Good', color: '#ffffff', bgColor: '#52a573' };
    case CreditStatus.WARNING:
      return { text: 'Warning', color: '#000000', bgColor: '#e6a855' };
    case CreditStatus.BAD:
      return { text: 'Bad', color: '#ffffff', bgColor: '#d66b2f' };
    case CreditStatus.BLOCKED:
      return { text: 'Blocked', color: '#ffffff', bgColor: '#d44a3f' };
    default:
      return { text: 'Unknown', color: '#000000', bgColor: '#6c757d' };
  }
}

/**
 * Format risk level with color coding
 */
export function formatRiskLevel(riskLevel: RiskLevel): { text: string; color: string; bgColor: string } {
  switch (riskLevel) {
    case RiskLevel.LOW:
      return { text: 'Low', color: '#ffffff', bgColor: '#52a573' };
    case RiskLevel.MEDIUM:
      return { text: 'Medium', color: '#000000', bgColor: '#e6a855' };
    case RiskLevel.HIGH:
      return { text: 'High', color: '#ffffff', bgColor: '#d66b2f' };
    case RiskLevel.CRITICAL:
      return { text: 'Critical', color: '#ffffff', bgColor: '#d44a3f' };
    default:
      return { text: 'Unknown', color: '#000000', bgColor: '#6c757d' };
  }
}

/**
 * Format days overdue with appropriate messaging
 */
export function formatDaysOverdue(days: number): { text: string; color: string; urgency: 'none' | 'low' | 'medium' | 'high' | 'critical' } {
  if (days <= 0) {
    return { text: 'Current', color: '#52a573', urgency: 'none' };
  } else if (days <= 7) {
    return { text: `${days} day(s) overdue`, color: '#e6a855', urgency: 'low' };
  } else if (days <= 30) {
    return { text: `${days} days overdue`, color: '#d66b2f', urgency: 'medium' };
  } else if (days <= 60) {
    return { text: `${days} days overdue`, color: '#d44a3f', urgency: 'high' };
  } else {
    return { text: `${days} days overdue`, color: '#8b0000', urgency: 'critical' };
  }
}

/**
 * Format payment terms
 */
export function formatPaymentTerms(days: number): string {
  if (days === 0) return 'Cash Only';
  if (days === 7) return 'Net 7 days';
  if (days === 14) return 'Net 14 days';
  if (days === 30) return 'Net 30 days';
  if (days === 60) return 'Net 60 days';
  if (days === 90) return 'Net 90 days';
  return `Net ${days} days`;
}

// ===== BUSINESS LOGIC UTILITIES =====

/**
 * Calculate next payment due date
 */
export function calculateNextPaymentDueDate(
  lastTransactionDate: string,
  paymentTerms: number
): Date {
  const lastTransaction = new Date(lastTransactionDate);
  const dueDate = new Date(lastTransaction);
  dueDate.setDate(dueDate.getDate() + paymentTerms);
  return dueDate;
}

/**
 * Calculate payment schedule
 */
export function calculatePaymentSchedule(
  totalAmount: number,
  paymentTerms: number,
  installments: number = 1
): Array<{ dueDate: Date; amount: number; installmentNumber: number }> {
  const schedule = [];
  const amountPerInstallment = totalAmount / installments;
  const baseDate = new Date();

  for (let i = 1; i <= installments; i++) {
    const dueDate = new Date(baseDate);
    dueDate.setDate(baseDate.getDate() + (paymentTerms * i));
    
    schedule.push({
      dueDate,
      amount: i === installments ? 
        totalAmount - (amountPerInstallment * (installments - 1)) : // Handle remainder in last installment
        amountPerInstallment,
      installmentNumber: i
    });
  }

  return schedule;
}

/**
 * Calculate interest or late fees
 */
export function calculateLateFees(
  overdueAmount: number,
  daysOverdue: number,
  feeRate: number = 0.05, // 5% monthly
  maxFeePercentage: number = 0.25 // Max 25% of overdue amount
): number {
  if (daysOverdue <= 0 || overdueAmount <= 0) return 0;

  // Calculate daily rate
  const dailyRate = feeRate / 30; // Monthly rate to daily
  
  // Calculate fee
  let fees = overdueAmount * dailyRate * daysOverdue;
  
  // Apply maximum fee cap
  const maxFees = overdueAmount * maxFeePercentage;
  fees = Math.min(fees, maxFees);
  
  return Math.round(fees);
}

/**
 * Generate payment reminder message
 */
export function generatePaymentReminderMessage(
  memberName: string,
  overdueAmount: number,
  daysOverdue: number,
  nextPaymentDue?: string
): string {
  if (daysOverdue > 0) {
    return `Dear ${memberName}, you have an overdue payment of ${formatCurrency(overdueAmount)} ` +
           `that is ${daysOverdue} days past due. Please settle this amount immediately to avoid further fees.`;
  } else if (nextPaymentDue) {
    const daysUntilDue = Math.ceil((new Date(nextPaymentDue).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
    if (daysUntilDue <= 3) {
      return `Dear ${memberName}, your payment of ${formatCurrency(overdueAmount)} is due in ${daysUntilDue} day(s). ` +
             `Please ensure timely payment to maintain your good credit standing.`;
    }
  }
  
  return `Dear ${memberName}, this is a reminder about your upcoming payment obligations. ` +
         `Please contact us if you have any questions.`;
}

/**
 * Check if member qualifies for credit limit increase
 * Fix: Only check overdue if member has actual debt
 */
export function checkCreditLimitIncreaseEligibility(
  member: MemberCreditSummaryDto,
  requestedIncrease: number
): { eligible: boolean; reason?: string; requirements?: string[] } {
  const requirements: string[] = [];

  // Basic eligibility checks
  if (member.statusDescription !== 'Good' && member.statusDescription !== 'Warning') {
    return { eligible: false, reason: 'Credit status must be Good or Warning' };
  }

  // Fix: Only check overdue if member has actual debt
  if (member.daysOverdue > 0 && member.currentDebt > 0) {
    return { eligible: false, reason: 'Member has overdue payments' };
  }

  if (member.paymentSuccessRate < 80) {
    return { eligible: false, reason: 'Payment success rate must be at least 80%' };
  }

  // Calculate requirements for approval
  if (member.paymentSuccessRate < 90) {
    requirements.push('Improve payment success rate to >90%');
  }

  if (member.creditUtilization > 70) {
    requirements.push('Reduce credit utilization to <70%');
  }

  if (member.creditScore < 700) {
    requirements.push('Improve credit score to >700');
  }

  const currentLimit = member.creditLimit;
  if (requestedIncrease > currentLimit * 0.5) {
    requirements.push('Limit increase >50% requires manager approval');
  }

  if (currentLimit + requestedIncrease > 20000000) {
    requirements.push('Limits >20M IDR require senior management approval');
  }

  return {
    eligible: true,
    requirements: requirements.length > 0 ? requirements : undefined
  };
}

/**
 * Calculate optimal payment amount for debt reduction
 */
export function calculateOptimalPaymentAmount(
  currentDebt: number,
  availableAmount: number,
  prioritizeHighestDebt: boolean = true
): { recommendedAmount: number; strategy: string; timeline: string } {
  let recommendedAmount = Math.min(availableAmount, currentDebt);
  let strategy = 'Pay full available amount';
  let timeline = 'Immediate';

  if (availableAmount >= currentDebt) {
    // Can pay full debt
    recommendedAmount = currentDebt;
    strategy = 'Pay off entire debt';
    timeline = 'Debt cleared immediately';
  } else {
    // Partial payment strategies
    if (availableAmount >= currentDebt * 0.5) {
      // Can pay substantial portion
      strategy = 'Pay majority of debt (>50%)';
      timeline = 'Significant debt reduction';
    } else if (availableAmount >= currentDebt * 0.2) {
      // Can make meaningful payment
      strategy = 'Make meaningful payment (>20%)';
      timeline = 'Moderate debt reduction';
    } else {
      // Small payment
      strategy = 'Make minimum payment to show good faith';
      timeline = 'Maintain payment history';
    }
  }

  return { recommendedAmount, strategy, timeline };
}

// ===== PERFORMANCE CALCULATION UTILITIES =====

/**
 * Calculate credit performance metrics for analytics
 */
export function calculateCreditPerformanceMetrics(
  members: MemberCreditSummaryDto[]
): {
  totalDebt: number;
  totalCreditLimit: number;
  averageUtilization: number;
  overdueRate: number;
  badDebtRate: number;
  averagePaymentSuccessRate: number;
} {
  if (members.length === 0) {
    return {
      totalDebt: 0,
      totalCreditLimit: 0,
      averageUtilization: 0,
      overdueRate: 0,
      badDebtRate: 0,
      averagePaymentSuccessRate: 0
    };
  }

  const totalDebt = members.reduce((sum, m) => sum + m.currentDebt, 0);
  const totalCreditLimit = members.reduce((sum, m) => sum + m.creditLimit, 0);
  const averageUtilization = members.reduce((sum, m) => sum + m.creditUtilization, 0) / members.length;
  const overdueMembers = members.filter(m => m.daysOverdue > 0).length;
  const badStatusMembers = members.filter(m => m.statusDescription === 'Bad' || m.statusDescription === 'Blocked').length;
  const averagePaymentSuccessRate = members.reduce((sum, m) => sum + m.paymentSuccessRate, 0) / members.length;

  return {
    totalDebt,
    totalCreditLimit,
    averageUtilization,
    overdueRate: (overdueMembers / members.length) * 100,
    badDebtRate: (badStatusMembers / members.length) * 100,
    averagePaymentSuccessRate
  };
}