/**
 * React UI Wrapper Module
 * 
 * Angular module that exports React UI wrapper components.
 */

// @ts-expect-error - Angular is a peer dependency, types may not be available during build
import { NgModule } from '@angular/core';
// @ts-expect-error - Angular is a peer dependency, types may not be available during build
import { CommonModule } from '@angular/common';
import { ReactUIWrapperComponent } from './react-ui-wrapper.component';
import { ReactUIService } from './react-ui.service';

@NgModule({
  imports: [CommonModule],
  declarations: [ReactUIWrapperComponent],
  exports: [ReactUIWrapperComponent],
  providers: [ReactUIService],
})
export class ReactUIWrapperModule {}
