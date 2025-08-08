import { MembershipService } from './services/membership.service';
// src/app/modules/membership/index.ts
// ✅ Membership Module Exports

// Components
export { MembershipListComponent } from './components/membership-list/membership-list.component';
export { MembershipFormComponent } from './components/membership-form/membership-form.component';
export { MemberPointsComponent } from './components/member-points/member-points.component';
export { MembershipTestComponent } from './components/membership-test/membership-test.component';

// Services
export { MembershipService } from './services/membership.service';

// Interfaces
export * from './interfaces/membership.interfaces';

// Module
export { MembershipModule } from './membership.module';