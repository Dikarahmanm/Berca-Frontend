import { Component, Input, Output, EventEmitter, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';

export interface PeriodSelection {
  type: 'preset' | 'custom';
  preset?: string;
  startDate?: Date;
  endDate?: Date;
}

@Component({
  selector: 'app-report-period-selector',
  standalone: true,
  imports: [
    CommonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    ReactiveFormsModule
  ],
  template: `
    <div class="report-period-selector">
      <form [formGroup]="periodForm" class="period-form">
        <mat-form-field>
          <mat-label>Period Type</mat-label>
          <mat-select formControlName="periodType" (selectionChange)="onPeriodTypeChange($event.value)">
            <mat-option value="today">Today</mat-option>
            <mat-option value="yesterday">Yesterday</mat-option>
            <mat-option value="this-week">This Week</mat-option>
            <mat-option value="last-week">Last Week</mat-option>
            <mat-option value="this-month">This Month</mat-option>
            <mat-option value="last-month">Last Month</mat-option>
            <mat-option value="this-quarter">This Quarter</mat-option>
            <mat-option value="last-quarter">Last Quarter</mat-option>
            <mat-option value="this-year">This Year</mat-option>
            <mat-option value="last-year">Last Year</mat-option>
            <mat-option value="custom">Custom Range</mat-option>
          </mat-select>
        </mat-form-field>

        <div class="custom-range" *ngIf="showCustomRange">
          <mat-form-field>
            <mat-label>Start Date</mat-label>
            <input matInput [matDatepicker]="startPicker" formControlName="startDate">
            <mat-datepicker-toggle matIconSuffix [for]="startPicker"></mat-datepicker-toggle>
            <mat-datepicker #startPicker></mat-datepicker>
          </mat-form-field>

          <mat-form-field>
            <mat-label>End Date</mat-label>
            <input matInput [matDatepicker]="endPicker" formControlName="endDate">
            <mat-datepicker-toggle matIconSuffix [for]="endPicker"></mat-datepicker-toggle>
            <mat-datepicker #endPicker></mat-datepicker>
          </mat-form-field>
        </div>

        <button mat-raised-button color="primary" (click)="applyPeriod()" [disabled]="!periodForm.valid">
          <mat-icon>calendar_today</mat-icon>
          Apply Period
        </button>
      </form>

      <div class="period-summary" *ngIf="currentPeriod">
        <mat-icon>info</mat-icon>
        <span>{{ getPeriodSummary() }}</span>
      </div>
    </div>
  `,
  styles: [`
    .report-period-selector {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .period-form {
      display: flex;
      gap: 16px;
      align-items: end;
      flex-wrap: wrap;
    }

    .custom-range {
      display: flex;
      gap: 16px;
      align-items: end;
    }

    .period-summary {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background-color: #f5f5f5;
      border-radius: 4px;
      font-size: 0.875rem;
      color: #666;
    }

    .period-summary mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    @media (max-width: 768px) {
      .period-form,
      .custom-range {
        flex-direction: column;
        align-items: stretch;
      }
    }
  `]
})
export class ReportPeriodSelectorComponent implements OnInit {
  @Input() initialPeriod?: string = 'this-month';
  @Output() periodChange = new EventEmitter<PeriodSelection>();
  
  private fb = inject(FormBuilder);
  
  periodForm: FormGroup;
  showCustomRange = false;
  currentPeriod?: PeriodSelection;

  constructor() {
    this.periodForm = this.fb.group({
      periodType: [this.initialPeriod],
      startDate: [null],
      endDate: [null]
    });
  }

  ngOnInit() {
    if (this.initialPeriod) {
      this.onPeriodTypeChange(this.initialPeriod);
    }
  }

  onPeriodTypeChange(periodType: string) {
    this.showCustomRange = periodType === 'custom';
    
    if (periodType !== 'custom') {
      // Clear custom date fields
      this.periodForm.patchValue({
        startDate: null,
        endDate: null
      });
      
      // Auto-apply preset periods
      this.currentPeriod = {
        type: 'preset',
        preset: periodType
      };
      
      this.periodChange.emit(this.currentPeriod);
    }
  }

  applyPeriod() {
    const formValue = this.periodForm.value;
    
    if (formValue.periodType === 'custom') {
      this.currentPeriod = {
        type: 'custom',
        startDate: formValue.startDate,
        endDate: formValue.endDate
      };
    } else {
      this.currentPeriod = {
        type: 'preset',
        preset: formValue.periodType
      };
    }
    
    this.periodChange.emit(this.currentPeriod);
  }

  getPeriodSummary(): string {
    if (!this.currentPeriod) return '';
    
    if (this.currentPeriod.type === 'preset') {
      return this.getPresetPeriodSummary(this.currentPeriod.preset!);
    } else {
      const start = this.currentPeriod.startDate?.toLocaleDateString();
      const end = this.currentPeriod.endDate?.toLocaleDateString();
      return `Custom period: ${start} - ${end}`;
    }
  }

  private getPresetPeriodSummary(preset: string): string {
    const summaries: Record<string, string> = {
      'today': 'Today',
      'yesterday': 'Yesterday',
      'this-week': 'This week (Monday - Sunday)',
      'last-week': 'Last week',
      'this-month': 'This month',
      'last-month': 'Last month',
      'this-quarter': 'This quarter',
      'last-quarter': 'Last quarter',
      'this-year': 'This year',
      'last-year': 'Last year'
    };
    
    return summaries[preset] || preset;
  }
}