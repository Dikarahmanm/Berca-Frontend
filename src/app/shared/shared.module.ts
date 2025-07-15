import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopbarComponent } from './topbar/topbar';

@NgModule({
  imports: [CommonModule, TopbarComponent],
  exports: [TopbarComponent]
})
export class SharedModule {}
