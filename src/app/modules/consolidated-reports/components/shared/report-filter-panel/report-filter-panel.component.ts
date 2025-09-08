import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';

@Component({
  selector: 'app-report-filter-panel',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatFormFieldModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    ReactiveFormsModule
  ],
  template: `
    <mat-card class="filter-panel">
      <mat-card-header>
        <mat-card-title>
          <mat-icon>filter_list</mat-icon>
          Filters
        </mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <form [formGroup]="filterForm" class="filter-form">
          <mat-form-field *ngFor="let filter of filters">
            <mat-label>{{ filter.label }}</mat-label>
            <mat-select [formControlName]="filter.key" [multiple]="filter.multiple">
              <mat-option *ngFor="let option of filter.options" [value]="option.value">
                {{ option.label }}
              </mat-option>
            </mat-select>
          </mat-form-field>
          
          <div class="filter-actions">
            <button mat-button (click)="clearFilters()">
              <mat-icon>clear</mat-icon>
              Clear
            </button>
            <button mat-raised-button color="primary" (click)="applyFilters()">
              <mat-icon>check</mat-icon>
              Apply
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .filter-panel {
      margin-bottom: 16px;
    }

    .filter-form {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: end;
    }

    .filter-form mat-form-field {
      min-width: 200px;
    }

    .filter-actions {
      display: flex;
      gap: 8px;
    }

    @media (max-width: 768px) {
      .filter-form {
        flex-direction: column;
        align-items: stretch;
      }

      .filter-form mat-form-field {
        min-width: auto;
      }
    }
  `]
})
export class ReportFilterPanelComponent {
  @Input() filters: any[] = [];
  @Output() filtersChange = new EventEmitter<any>();
  
  filterForm: FormGroup;

  constructor(private fb: FormBuilder) {
    this.filterForm = this.fb.group({});
  }

  ngOnInit() {
    // Build form controls based on filters
    const controls: any = {};
    this.filters.forEach(filter => {
      controls[filter.key] = [filter.defaultValue || ''];
    });
    this.filterForm = this.fb.group(controls);
  }

  applyFilters() {
    this.filtersChange.emit(this.filterForm.value);
  }

  clearFilters() {
    this.filterForm.reset();
    this.filtersChange.emit({});
  }
}