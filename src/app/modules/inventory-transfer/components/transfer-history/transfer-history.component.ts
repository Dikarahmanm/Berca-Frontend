import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-transfer-history',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
  template: `
    <div class="transfer-history">
      <h2>Transfer History</h2>
      <p>Transfer history component placeholder</p>
    </div>
  `,
  styles: [`
    .transfer-history {
      padding: 16px;
    }
  `]
})
export class TransferHistoryComponent {
}