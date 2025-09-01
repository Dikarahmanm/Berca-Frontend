import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-branch-stock-comparison',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="branch-stock-comparison">
      <h2>Branch Stock Comparison</h2>
      <p>Branch stock comparison component placeholder</p>
    </div>
  `,
  styles: [`
    .branch-stock-comparison {
      padding: 16px;
    }
  `]
})
export class BranchStockComparisonComponent {
}