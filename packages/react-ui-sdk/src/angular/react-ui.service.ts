/**
 * React UI Service
 * 
 * Angular service for managing SDK configuration and state.
 */

// @ts-expect-error - Angular is a peer dependency, types may not be available during build
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ReactUISDKConfig } from '../types';

@Injectable({
  providedIn: 'root',
})
export class ReactUIService {
  private configSubject = new BehaviorSubject<ReactUISDKConfig | null>(null);
  public config$: Observable<ReactUISDKConfig | null> = this.configSubject.asObservable();

  /**
   * Sets the SDK configuration
   */
  setConfig(config: ReactUISDKConfig): void {
    this.configSubject.next(config);
  }

  /**
   * Gets the current SDK configuration
   */
  getConfig(): ReactUISDKConfig | null {
    return this.configSubject.value;
  }
}
