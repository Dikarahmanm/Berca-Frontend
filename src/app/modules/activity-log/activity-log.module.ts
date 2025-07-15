import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivityLogRoutingModule } from './activity-log-routing.module';
import { FormsModule } from '@angular/forms';
import { LogViewerComponent } from './log-viewer/log-viewer.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ActivityLogRoutingModule,
    FormsModule,
    LogViewerComponent  // ✅ Import standalone component
  ]
})
export class ActivityLogModule { }