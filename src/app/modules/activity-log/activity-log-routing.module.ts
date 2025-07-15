import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LogViewerComponent } from './log-viewer/log-viewer.component';

const routes: Routes = [
  { 
    path: '', 
    component: LogViewerComponent  // ✅ Default route menuju LogViewerComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ActivityLogRoutingModule {}