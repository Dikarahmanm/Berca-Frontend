// src/app/modules/reports/components/charts/reports-chart.component.ts
// ✅ Reusable Chart Component for Reports

import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgxChartsModule } from '@swimlane/ngx-charts';

export interface ChartData {
  name: string;
  value: number;
  extra?: any;
}

export interface SeriesData {
  name: string;
  series: ChartData[];
}

export type ChartType = 'pie' | 'doughnut' | 'bar' | 'grouped-bar' | 'line' | 'area';

@Component({
  selector: 'app-reports-chart',
  standalone: true,
  imports: [CommonModule, NgxChartsModule],
  template: `
    <div class="chart-wrapper" [style.height.px]="height">
      <!-- Pie Chart -->
      <ngx-charts-pie-chart
        *ngIf="chartType === 'pie'"
        [results]="data"
        [view]="view"
        [legend]="showLegend"
        [legendTitle]="legendTitle"
        [labels]="showLabels"
        [doughnut]="false"
        [explodeSlices]="false"
        [gradient]="gradient"
        [arcWidth]="0.25"
        [tooltipDisabled]="false"
        (select)="onSelect($event)">
      </ngx-charts-pie-chart>

      <!-- Doughnut Chart -->
      <ngx-charts-pie-chart
        *ngIf="chartType === 'doughnut'"
        [results]="data"
        [view]="view"
        [legend]="showLegend"
        [legendTitle]="legendTitle"
        [labels]="showLabels"
        [doughnut]="true"
        [explodeSlices]="false"
        [gradient]="gradient"
        [arcWidth]="0.25"
        [tooltipDisabled]="false"
        (select)="onSelect($event)">
      </ngx-charts-pie-chart>

      <!-- Bar Chart -->
      <ngx-charts-bar-vertical
        *ngIf="chartType === 'bar'"
        [results]="data"
        [view]="view"
        [legend]="showLegend"
        [legendTitle]="legendTitle"
        [xAxis]="showXAxis"
        [yAxis]="showYAxis"
        [showXAxisLabel]="showXAxisLabel"
        [showYAxisLabel]="showYAxisLabel"
        [xAxisLabel]="xAxisLabel"
        [yAxisLabel]="yAxisLabel"
        [gradient]="gradient"
        [showGridLines]="showGridLines"
        [tooltipDisabled]="false"
        (select)="onSelect($event)">
      </ngx-charts-bar-vertical>

      <!-- Grouped Bar Chart -->
      <ngx-charts-bar-vertical-2d
        *ngIf="chartType === 'grouped-bar'"
        [results]="seriesData"
        [view]="view"
        [legend]="showLegend"
        [legendTitle]="legendTitle"
        [xAxis]="showXAxis"
        [yAxis]="showYAxis"
        [showXAxisLabel]="showXAxisLabel"
        [showYAxisLabel]="showYAxisLabel"
        [xAxisLabel]="xAxisLabel"
        [yAxisLabel]="yAxisLabel"
        [gradient]="gradient"
        [showGridLines]="showGridLines"
        [tooltipDisabled]="false"
        (select)="onSelect($event)">
      </ngx-charts-bar-vertical-2d>

      <!-- Line Chart -->
      <ngx-charts-line-chart
        *ngIf="chartType === 'line'"
        [results]="seriesData"
        [view]="view"
        [legend]="showLegend"
        [legendTitle]="legendTitle"
        [xAxis]="showXAxis"
        [yAxis]="showYAxis"
        [showXAxisLabel]="showXAxisLabel"
        [showYAxisLabel]="showYAxisLabel"
        [xAxisLabel]="xAxisLabel"
        [yAxisLabel]="yAxisLabel"
        [gradient]="gradient"
        [showGridLines]="showGridLines"
        [curve]="curve"
        [tooltipDisabled]="false"
        (select)="onSelect($event)">
      </ngx-charts-line-chart>

      <!-- Area Chart -->
      <ngx-charts-area-chart
        *ngIf="chartType === 'area'"
        [results]="seriesData"
        [view]="view"
        [legend]="showLegend"
        [legendTitle]="legendTitle"
        [xAxis]="showXAxis"
        [yAxis]="showYAxis"
        [showXAxisLabel]="showXAxisLabel"
        [showYAxisLabel]="showYAxisLabel"
        [xAxisLabel]="xAxisLabel"
        [yAxisLabel]="yAxisLabel"
        [gradient]="gradient"
        [showGridLines]="showGridLines"
        [curve]="curve"
        [tooltipDisabled]="false"
        (select)="onSelect($event)">
      </ngx-charts-area-chart>
    </div>
  `,
  styles: [`
    .chart-wrapper {
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    :host ::ng-deep {
      .ngx-charts {
        fill: var(--clr-primary);
      }
      
      .legend-labels {
        font-size: 12px;
      }
      
      .tooltip-anchor {
        fill: var(--clr-primary);
      }
      
      .gridline-path {
        stroke: rgba(255, 145, 77, 0.2);
      }
      
      .tick {
        font-size: 11px;
        fill: rgba(0, 0, 0, 0.6);
      }
      
      .bar {
        cursor: pointer;
        transition: opacity 0.12s ease-out;
      }
      
      .bar:hover {
        opacity: 0.8;
      }
      
      .line-series path {
        stroke-width: 3px;
      }
      
      .area-series path {
        opacity: 0.7;
      }
    }
  `]
})
export class ReportsChartComponent implements OnChanges {
  @Input() chartType: ChartType = 'pie';
  @Input() data: ChartData[] = [];
  @Input() seriesData: SeriesData[] = [];
  @Input() height: number = 300;
  @Input() showLegend: boolean = true;
  @Input() legendTitle: string = '';
  @Input() showLabels: boolean = true;
  @Input() showXAxis: boolean = true;
  @Input() showYAxis: boolean = true;
  @Input() showXAxisLabel: boolean = true;
  @Input() showYAxisLabel: boolean = true;
  @Input() xAxisLabel: string = '';
  @Input() yAxisLabel: string = '';
  @Input() gradient: boolean = true;
  @Input() showGridLines: boolean = true;
  @Input() curve: any = 'cardinal'; // curve type for line/area charts

  // Chart dimensions
  view: [number, number] = [700, 300];
  
  // Orange color scheme matching the theme
  colorScheme = {
    domain: [
      '#FF914D', // Primary orange
      '#4BBF7B', // Success green
      '#FFB84D', // Warning yellow
      '#E15A4F', // Error red
      '#6366f1', // Purple
      '#8b5cf6', // Violet
      '#06b6d4', // Cyan
      '#10b981', // Emerald
      '#f59e0b', // Amber
      '#ef4444'  // Red
    ]
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['height']) {
      this.view = [700, this.height];
    }
  }

  onSelect(event: any): void {
    console.log('Chart selection:', event);
    // Emit selection event if needed
  }
}