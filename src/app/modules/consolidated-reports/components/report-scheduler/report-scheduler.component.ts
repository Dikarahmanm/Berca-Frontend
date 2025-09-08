import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-report-scheduler',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatCheckboxModule,
    ReactiveFormsModule
  ],
  template: `
    <mat-card class="report-scheduler">
      <mat-card-header>
        <mat-card-title>
          <mat-icon>schedule</mat-icon>
          Report Scheduler
        </mat-card-title>
        <mat-card-subtitle>Schedule automatic report generation and delivery</mat-card-subtitle>
      </mat-card-header>
      <mat-card-content>
        <form [formGroup]="schedulerForm" class="scheduler-form">
          <div class="form-row">
            <mat-form-field>
              <mat-label>Report Type</mat-label>
              <mat-select formControlName="reportType">
                <mat-option value="sales">Sales Report</mat-option>
                <mat-option value="financial">Financial Report</mat-option>
                <mat-option value="inventory">Inventory Report</mat-option>
                <mat-option value="performance">Performance Report</mat-option>
              </mat-select>
            </mat-form-field>

            <mat-form-field>
              <mat-label>Frequency</mat-label>
              <mat-select formControlName="frequency">
                <mat-option value="daily">Daily</mat-option>
                <mat-option value="weekly">Weekly</mat-option>
                <mat-option value="monthly">Monthly</mat-option>
                <mat-option value="quarterly">Quarterly</mat-option>
              </mat-select>
            </mat-form-field>
          </div>

          <div class="form-row">
            <mat-form-field class="full-width">
              <mat-label>Email Recipients</mat-label>
              <input matInput formControlName="recipients" placeholder="Enter email addresses separated by commas">
            </mat-form-field>
          </div>

          <div class="checkbox-options">
            <mat-checkbox formControlName="includeCharts">Include Charts</mat-checkbox>
            <mat-checkbox formControlName="compressFiles">Compress Files</mat-checkbox>
            <mat-checkbox formControlName="enableNotifications">Enable Notifications</mat-checkbox>
          </div>
        </form>
      </mat-card-content>
      <mat-card-actions>
        <button mat-button>Cancel</button>
        <button mat-raised-button color="primary" (click)="scheduleReport()">
          <mat-icon>schedule_send</mat-icon>
          Schedule Report
        </button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    .report-scheduler {
      max-width: 600px;
    }

    .scheduler-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .form-row {
      display: flex;
      gap: 16px;
    }

    .form-row mat-form-field {
      flex: 1;
    }

    .full-width {
      width: 100%;
    }

    .checkbox-options {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    @media (max-width: 768px) {
      .form-row {
        flex-direction: column;
      }
    }
  `]
})
export class ReportSchedulerComponent {
  schedulerForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.schedulerForm = this.fb.group({
      reportType: [''],
      frequency: [''],
      recipients: [''],
      includeCharts: [true],
      compressFiles: [false],
      enableNotifications: [true]
    });
  }

  scheduleReport() {
    console.log('Scheduling report:', this.schedulerForm.value);
    // Implementation for scheduling report
  }
}