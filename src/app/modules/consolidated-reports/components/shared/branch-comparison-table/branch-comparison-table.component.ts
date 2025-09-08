import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-branch-comparison-table',
  standalone: true,
  imports: [
    CommonModule,
    MatTableModule,
    MatCardModule,
    MatIconModule
  ],
  template: `
    <mat-card class="branch-comparison-table">
      <mat-card-header>
        <mat-card-title>
          <mat-icon>compare_arrows</mat-icon>
          Branch Comparison
        </mat-card-title>
      </mat-card-header>
      <mat-card-content>
        <mat-table [dataSource]="branchData" class="comparison-table">
          <ng-container matColumnDef="branch">
            <mat-header-cell *matHeaderCellDef>Branch</mat-header-cell>
            <mat-cell *matCellDef="let element">{{ element.branch }}</mat-cell>
          </ng-container>

          <ng-container matColumnDef="revenue">
            <mat-header-cell *matHeaderCellDef>Revenue</mat-header-cell>
            <mat-cell *matCellDef="let element">{{ element.revenue | currency }}</mat-cell>
          </ng-container>

          <ng-container matColumnDef="growth">
            <mat-header-cell *matHeaderCellDef>Growth</mat-header-cell>
            <mat-cell *matCellDef="let element">
              <span [class]="element.growth >= 0 ? 'positive' : 'negative'">
                {{ element.growth > 0 ? '+' : '' }}{{ element.growth }}%
              </span>
            </mat-cell>
          </ng-container>

          <mat-header-row *matHeaderRowDef="displayedColumns"></mat-header-row>
          <mat-row *matRowDef="let row; columns: displayedColumns;"></mat-row>
        </mat-table>
      </mat-card-content>
    </mat-card>
  `,
  styles: [`
    .branch-comparison-table {
      width: 100%;
    }

    .comparison-table {
      width: 100%;
    }

    .positive {
      color: #4caf50;
    }

    .negative {
      color: #f44336;
    }
  `]
})
export class BranchComparisonTableComponent {
  @Input() branchData: any[] = [
    { branch: 'Main Branch', revenue: 150000, growth: 12.5 },
    { branch: 'Downtown', revenue: 120000, growth: 8.3 },
    { branch: 'Mall Location', revenue: 95000, growth: -2.1 }
  ];

  displayedColumns = ['branch', 'revenue', 'growth'];
}