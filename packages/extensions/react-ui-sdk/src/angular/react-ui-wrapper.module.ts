/**
 * React UI Wrapper Module
 * 
 * Angular module that exports React UI wrapper components.
 */

// @ts-ignore - Angular is a peer dependency
import { NgModule } from '@angular/core';
// @ts-ignore - Angular is a peer dependency
import { CommonModule } from '@angular/common';
import { ReactUIWrapperComponent } from './react-ui-wrapper.component';
import { ReactUIService } from './react-ui.service';

@NgModule({
  imports: [CommonModule, ReactUIWrapperComponent],
  exports: [ReactUIWrapperComponent],
  providers: [ReactUIService],
})
export class ReactUIWrapperModule {}
