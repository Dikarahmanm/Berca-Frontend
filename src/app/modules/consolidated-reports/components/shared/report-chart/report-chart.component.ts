import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string;
    borderColor?: string;
  }>;
}

@Component({
  selector: 'app-report-chart',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule
  ],
  template: `
    <mat-card class="chart-container">
      <mat-card-header *ngIf="title">
        <mat-card-title>
          <mat-icon>{{ chartIcon }}</mat-icon>
          {{ title }}
        </mat-card-title>
        <div class="chart-actions">
          <button mat-icon-button>
            <mat-icon>more_vert</mat-icon>
          </button>
        </div>
      </mat-card-header>
      <mat-card-content>
        <div class="chart-placeholder" [style.height.px]="height">
          <div class="chart-mock" [ngSwitch]="chartType">
            <!-- Bar Chart Mock -->
            <div *ngSwitchCase="'bar'" class="bar-chart-mock">
              <div class="bars">
                <div *ngFor="let value of mockData" 
                     class="bar" 
                     [style.height.%]="value">
                </div>
              </div>
              <div class="labels">
                <span *ngFor="let label of mockLabels">{{ label }}</span>
              </div>
            </div>
            
            <!-- Line Chart Mock -->
            <div *ngSwitchCase="'line'" class="line-chart-mock">
              <svg [attr.width]="'100%'" [attr.height]="height - 40">
                <polyline [attr.points]="getLinePoints()" 
                          stroke="#2196f3" 
                          stroke-width="3" 
                          fill="none">
                </polyline>
                <circle *ngFor="let point of getCirclePoints(); let i = index"
                        [attr.cx]="point.x"
                        [attr.cy]="point.y"
                        r="4"
                        fill="#2196f3">
                </circle>
              </svg>
            </div>
            
            <!-- Pie Chart Mock -->
            <div *ngSwitchCase="'pie'" class="pie-chart-mock">
              <div class="pie-container">
                <svg width="200" height="200" viewBox="0 0 42 42">
                  <circle cx="21" cy="21" r="15.91549430918954" 
                          fill="transparent" stroke="#4caf50" stroke-width="3"
                          stroke-dasharray="40, 60" stroke-dashoffset="25">
                  </circle>
                  <circle cx="21" cy="21" r="15.91549430918954"
                          fill="transparent" stroke="#2196f3" stroke-width="3" 
                          stroke-dasharray="35, 65" stroke-dashoffset="-15">
                  </circle>
                  <circle cx="21" cy="21" r="15.91549430918954"
                          fill="transparent" stroke="#ff9800" stroke-width="3"
                          stroke-dasharray="25, 75" stroke-dashoffset="-50">
                  </circle>
                </svg>
              </div>
              <div class="pie-legend">
                <div class="legend-item">
                  <span class="legend-color" style="background-color: #4caf50;"></span>
                  <span>Sales (40%)</span>
                </div>
                <div class="legend-item">
                  <span class="legend-color" style="background-color: #2196f3;"></span>
                  <span>Marketing (35%)</span>
                </div>
                <div class="legend-item">
                  <span class="legend-color" style="background-color: #ff9800;"></span>
                  <span>Operations (25%)</span>
                </div>
              </div>
            </div>
            
            <!-- Default/No Data -->
            <div *ngSwitchDefault class="no-data">
              <mat-icon>assessment</mat-icon>
              <p>Chart visualization will appear here</p>
              <small>Data: {{ chartType }} | {{ mockData.length || 0 }} points</small>
            </div>
          </div>
        </div>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .chart-container {
      height: 100%;
    }

    .chart-placeholder {
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: #fafafa;
      border-radius: 4px;
      position: relative;
    }

    .chart-mock {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .bar-chart-mock {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      padding: 20px;
    }

    .bars {
      display: flex;
      align-items: flex-end;
      height: 80%;
      gap: 8px;
      justify-content: center;
    }

    .bar {
      width: 40px;
      background: linear-gradient(to top, #2196f3, #64b5f6);
      border-radius: 4px 4px 0 0;
      min-height: 20px;
    }

    .labels {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-top: 12px;
    }

    .labels span {
      width: 40px;
      text-align: center;
      font-size: 0.75rem;
      color: #666;
    }

    .line-chart-mock {
      width: 100%;
      height: 100%;
      padding: 20px;
    }

    .pie-chart-mock {
      display: flex;
      align-items: center;
      gap: 32px;
    }

    .pie-container svg {
      transform: rotate(-90deg);
    }

    .pie-legend {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.875rem;
    }

    .legend-color {
      width: 12px;
      height: 12px;
      border-radius: 2px;
    }

    .no-data {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      color: #999;
      text-align: center;
    }

    .no-data mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
    }

    .chart-actions {
      margin-left: auto;
    }

    @media (max-width: 768px) {
      .pie-chart-mock {
        flex-direction: column;
        gap: 16px;
      }
    }
  `]
})
export class ReportChartComponent implements OnInit {
  @Input() title?: string;
  @Input() chartType: 'bar' | 'line' | 'pie' | 'area' = 'bar';
  @Input() data?: ChartData;
  @Input() height: number = 300;
  
  chartIcon = 'bar_chart';
  mockData = [60, 80, 45, 90, 70, 55];
  mockLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

  ngOnInit() {
    this.setChartIcon();
  }

  private setChartIcon() {
    const icons: Record<string, string> = {
      bar: 'bar_chart',
      line: 'show_chart',
      pie: 'pie_chart',
      area: 'area_chart'
    };
    this.chartIcon = icons[this.chartType] || 'bar_chart';
  }

  getLinePoints(): string {
    const width = 300;
    const height = 200;
    const points = this.mockData.map((value, index) => {
      const x = (index / (this.mockData.length - 1)) * width;
      const y = height - (value / 100) * height;
      return `${x},${y}`;
    });
    return points.join(' ');
  }

  getCirclePoints(): Array<{x: number, y: number}> {
    const width = 300;
    const height = 200;
    return this.mockData.map((value, index) => ({
      x: (index / (this.mockData.length - 1)) * width,
      y: height - (value / 100) * height
    }));
  }
}