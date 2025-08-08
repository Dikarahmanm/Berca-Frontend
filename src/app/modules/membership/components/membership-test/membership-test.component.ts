// src/app/modules/membership/components/membership-test/membership-test.component.ts
// Simple test component untuk debugging routing

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-membership-test',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 20px;">
      <h1>🎉 Membership Test Component</h1>
      <p>Jika Anda melihat pesan ini, berarti routing ke membership sudah bekerja!</p>
      <p>Membership module berhasil dimuat.</p>
    </div>
  `,
  styles: [`
    div {
      background: #f0f8ff;
      border: 2px solid #007bff;
      border-radius: 8px;
      margin: 20px;
    }
    h1 {
      color: #007bff;
      margin: 0 0 10px 0;
    }
    p {
      margin: 5px 0;
      color: #333;
    }
  `]
})
export class MembershipTestComponent {
  constructor() {
    console.log('✅ MembershipTestComponent loaded successfully!');
  }
}
