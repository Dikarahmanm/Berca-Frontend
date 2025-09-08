import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';

@Component({
  selector: 'app-report-export-manager',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatChipsModule
  ],
  template: `
    <mat-card class="report-export-manager">
      <mat-card-header>
        <mat-card-title>
          <mat-icon>cloud_download</mat-icon>
          Report Export Manager
        </mat-card-title>
        <mat-card-subtitle>Manage and download your exported reports</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <mat-table [dataSource]="exportHistory" class="export-table">
          <ng-container matColumnDef="report">
            <mat-header-cell *matHeaderCellDef>Report</mat-header-cell>
            <mat-cell *matCellDef="let element">{{ element.report }}</mat-cell>
          </ng-container>

          <ng-container matColumnDef="format">
            <mat-header-cell *matHeaderCellDef>Format</mat-header-cell>
            <mat-cell *matCellDef="let element">
              <mat-chip>{{ element.format }}</mat-chip>
            </mat-cell>
          </ng-container>

          <ng-container matColumnDef="date">
            <mat-header-cell *matHeaderCellDef>Export Date</mat-header-cell>
            <mat-cell *matCellDef="let element">{{ element.date | date }}</mat-cell>
          </ng-container>

          <ng-container matColumnDef="status">
            <mat-header-cell *matHeaderCellDef>Status</mat-header-cell>
            <mat-cell *matCellDef="let element">
              <mat-chip [class]="'status-' + element.status">{{ element.status }}</mat-chip>
            </mat-cell>
          </ng-container>

          <ng-container matColumnDef="actions">
            <mat-header-cell *matHeaderCellDef>Actions</mat-header-cell>
            <mat-cell *matCellDef="let element">
              <button mat-icon-button *ngIf="element.status === 'ready'" (click)="downloadReport(element)">
                <mat-icon>download</mat-icon>
              </button>
              <button mat-icon-button (click)="deleteExport(element)">
                <mat-icon>delete</mat-icon>
              </button>
            </mat-cell>
          </ng-container>

          <mat-header-row *matHeaderRowDef="displayedColumns"></mat-header-row>
          <mat-row *matRowDef="let row; columns: displayedColumns;"></mat-row>
        </mat-table>
      </mat-card-content>
      <mat-card-actions>
        <button mat-raised-button color="primary">
          <mat-icon>add</mat-icon>
          New Export
        </button>
        <button mat-button>
          <mat-icon>refresh</mat-icon>
          Refresh
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    .report-export-manager {
      width: 100%;
    }

    .export-table {
      width: 100%;
    }

    .status-ready {
      background-color: #4caf50;
      color: white;
    }

    .status-processing {
      background-color: #ff9800;
      color: white;
    }

    .status-failed {
      background-color: #f44336;
      color: white;
    }
  `]
})
export class ReportExportManagerComponent {
  displayedColumns = ['report', 'format', 'date', 'status', 'actions'];
  exportHistory = [
    { report: 'Sales Report - Q4 2024', format: 'PDF', date: new Date(), status: 'ready' },
    { report: 'Financial Summary', format: 'Excel', date: new Date(), status: 'processing' },
    { report: 'Inventory Report', format: 'CSV', date: new Date(), status: 'ready' },
    { report: 'Performance Metrics', format: 'PDF', date: new Date(), status: 'failed' }
  ];

  downloadReport(report: any) {
    console.log('Downloading report:', report);
    // Implementation for downloading report
  }

  deleteExport(report: any) {
    console.log('Deleting export:', report);
    // Implementation for deleting export
  }
}