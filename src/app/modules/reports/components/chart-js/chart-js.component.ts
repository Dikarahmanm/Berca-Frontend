// src/app/modules/reports/components/chart-js/chart-js.component.ts
import { Component, Input, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Chart, ChartConfiguration, ChartType, registerables } from 'chart.js';

// Register Chart.js components
Chart.register(...registerables);

export interface ChartJSData {
  name: string;
  value: number;
  color?: string;
}

export interface SeriesData {
  name: string;
  series: ChartJSData[];
}

@Component({
  selector: 'app-chart-js',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-container">
      <canvas #chartCanvas></canvas>
    </div>
  `,
  styles: [`
    .chart-container {
      position: relative;
      height: 300px;
      width: 100%;
    }
    
    canvas {
      max-height: 300px;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChartJSComponent implements OnInit, OnDestroy {
  @ViewChild('chartCanvas', { static: true }) chartCanvas!: ElementRef<HTMLCanvasElement>;
  
  @Input() data: ChartJSData[] | SeriesData[] = [];
  @Input() chartType: ChartType = 'doughnut';
  @Input() title: string = '';
  @Input() colors: string[] = [
    '#FF914D', '#4BBF7B', '#FFB84D', '#E15A4F', 
    '#6366f1', '#8b5cf6', '#06b6d4', '#10b981'
  ];

  private chart: Chart | null = null;

  ngOnInit(): void {
    setTimeout(() => {
      this.createChart();
    }, 100);
  }

  ngOnDestroy(): void {
    if (this.chart) {
      this.chart.destroy();
    }
  }

  private createChart(): void {
    if (!this.chartCanvas || !this.data || !this.data.length) {
      console.log('❌ Chart creation skipped - missing data or canvas');
      return;
    }

    // Validate data
    const validData = this.validateAndCleanData();
    if (!validData || validData.length === 0) {
      console.log('❌ Chart creation skipped - invalid data');
      return;
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) return;

    // Destroy existing chart
    if (this.chart) {
      this.chart.destroy();
    }

    try {
      const config = this.getChartConfig();
      this.chart = new Chart(ctx, config);
      console.log('✅ Chart created successfully');
    } catch (error) {
      console.error('❌ Error creating chart:', error);
    }
  }

  private validateAndCleanData(): any[] {
    if (!this.data) return [];

    if (Array.isArray(this.data)) {
      return this.data.filter(item => {
        if (!item || typeof item !== 'object') return false;
        
        // For ChartJSData
        if ('name' in item && 'value' in item) {
          return item.name && 
                 typeof item.value === 'number' && 
                 !isNaN(item.value) && 
                 isFinite(item.value);
        }
        
        // For SeriesData
        if ('name' in item && 'series' in item) {
          return item.name && 
                 Array.isArray(item.series) && 
                 item.series.length > 0;
        }
        
        return false;
      });
    }
    
    return [];
  }

  private getChartConfig(): ChartConfiguration {
    switch (this.chartType) {
      case 'doughnut':
      case 'pie':
        return this.getPieChartConfig();
      case 'bar':
        return this.getBarChartConfig();
      case 'line':
        return this.getLineChartConfig();
      default:
        return this.getPieChartConfig();
    }
  }

  private getPieChartConfig(): ChartConfiguration {
    const pieData = this.data as ChartJSData[];
    
    return {
      type: this.chartType as 'doughnut' | 'pie',
      data: {
        labels: pieData.map(item => item.name),
        datasets: [{
          data: pieData.map(item => item.value),
          backgroundColor: pieData.map((item, index) => 
            item.color || this.colors[index % this.colors.length]
          ),
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              padding: 20,
              usePointStyle: true,
              font: {
                size: 12
              }
            }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed;
                const total = pieData.reduce((sum, item) => sum + item.value, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${this.formatNumber(value)} (${percentage}%)`;
              }
            }
          }
        }
      }
    };
  }

  private getBarChartConfig(): ChartConfiguration {
    const barData = this.data as ChartJSData[];
    
    return {
      type: 'bar',
      data: {
        labels: barData.map(item => item.name),
        datasets: [{
          label: this.title,
          data: barData.map(item => item.value),
          backgroundColor: barData.map((item, index) => 
            item.color || this.colors[index % this.colors.length]
          ),
          borderColor: barData.map((item, index) => 
            item.color || this.colors[index % this.colors.length]
          ),
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `${context.label}: ${this.formatNumber(context.parsed.y)}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => this.formatNumber(Number(value))
            }
          }
        }
      }
    };
  }

  private getLineChartConfig(): ChartConfiguration {
    const lineData = this.data as SeriesData[];
    
    return {
      type: 'line',
      data: {
        labels: lineData[0]?.series.map(item => item.name) || [],
        datasets: lineData.map((series, index) => ({
          label: series.name,
          data: series.series.map(item => item.value),
          borderColor: this.colors[index % this.colors.length],
          backgroundColor: this.colors[index % this.colors.length] + '20',
          fill: false,
          tension: 0.4
        }))
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                return `${context.dataset.label}: ${this.formatNumber(context.parsed.y)}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value) => this.formatNumber(Number(value))
            }
          }
        }
      }
    };
  }

  private formatNumber(value: number): string {
    // Handle invalid numbers
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
      return '0';
    }
    
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M';
    } else if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K';
    }
    return value.toString();
  }
}
