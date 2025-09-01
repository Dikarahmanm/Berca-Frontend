import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-report-export-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <div class="report-export-dialog">
      <h2 mat-dialog-title>
        <mat-icon>file_download</mat-icon>
        Export Report
      </h2>
      <mat-dialog-content>
        <p>Choose export format and options for your report.</p>
        <!-- Export options would go here -->
      </mat-dialog-content>
      <mat-dialog-actions>
        <button mat-button mat-dialog-close>Cancel</button>
        <button mat-raised-button color="primary">Export</button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .report-export-dialog {
      min-width: 400px;
    }

    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      gap: 8px;
    }
  `]
})
export class ReportExportDialogComponent {
}