import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

export interface SummaryCardData {
  title: string;
  value: string | number;
  icon: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  subtitle?: string;
}

@Component({
  selector: 'app-report-summary-card',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule
  ],
  template: `
    <mat-card class="summary-card" [class]="cardClass">
      <mat-card-content>
        <div class="card-header">
          <div class="card-info">
            <h3 class="card-title">{{ data.title }}</h3>
            <p class="card-subtitle" *ngIf="data.subtitle">{{ data.subtitle }}</p>
          </div>
          <mat-icon class="card-icon">{{ data.icon }}</mat-icon>
        </div>
        
        <div class="card-value">{{ data.value }}</div>
        
        <div class="card-change" *ngIf="data.change" [class]="'change-' + data.changeType">
          <mat-icon class="change-icon">
            {{ getChangeIcon() }}
          </mat-icon>
          <span>{{ data.change }}</span>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .summary-card {
      height: 100%;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .summary-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }

    .summary-card.primary {
      border-left: 4px solid #2196f3;
    }

    .summary-card.success {
      border-left: 4px solid #4caf50;
    }

    .summary-card.warning {
      border-left: 4px solid #ff9800;
    }

    .summary-card.danger {
      border-left: 4px solid #f44336;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .card-info {
      flex: 1;
    }

    .card-title {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 500;
      color: #666;
      line-height: 1.2;
    }

    .card-subtitle {
      margin: 4px 0 0 0;
      font-size: 0.75rem;
      color: #999;
      line-height: 1.2;
    }

    .card-icon {
      color: #999;
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .card-value {
      font-size: 2rem;
      font-weight: 600;
      margin-bottom: 12px;
      color: #333;
      line-height: 1;
    }

    .card-change {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .change-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .change-positive {
      color: #4caf50;
    }

    .change-negative {
      color: #f44336;
    }

    .change-neutral {
      color: #666;
    }

    @media (max-width: 768px) {
      .card-value {
        font-size: 1.5rem;
      }
      
      .card-title {
        font-size: 0.8rem;
      }
    }
  `]
})
export class ReportSummaryCardComponent {
  @Input() data!: SummaryCardData;
  @Input() cardClass: string = 'primary';

  getChangeIcon(): string {
    switch (this.data.changeType) {
      case 'positive':
        return 'trending_up';
      case 'negative':
        return 'trending_down';
      default:
        return 'trending_flat';
    }
  }
}