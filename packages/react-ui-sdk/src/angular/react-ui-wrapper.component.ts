/**
 * React UI Wrapper Component
 * 
 * Angular component that wraps React components for use in Angular templates.
 * This is a base component that will be extended for specific React UI components.
 */

// @ts-expect-error - Angular is a peer dependency, types may not be available during build
import { Component, Input, OnDestroy, OnInit, ViewChild, ViewContainerRef, ChangeDetectorRef } from '@angular/core';
import { ReactUISDKConfig } from '../types';
import { mountReactComponent, unmountReactComponent, createReactContainer } from '../utils/react-mount';
import { initializeRuntimeEEChecks } from '../utils/runtime-ee-check';
import { FlowBuilder } from '../react/flow-builder';
import { Dashboard } from '../react/dashboard';
import { Connections } from '../react/connections';
import { Runs } from '../react/runs';
import { Templates } from '../react/templates';

@Component({
  selector: 'ap-react-ui-wrapper',
  standalone: true,
  template: '<div #reactContainer></div>',
  styles: [`
    :host {
      display: block;
      width: 100%;
      height: 100%;
    }
  `],
})
export class ReactUIWrapperComponent implements OnInit, OnDestroy {
  @ViewChild('reactContainer', { read: ViewContainerRef }) container!: ViewContainerRef;
  
  @Input() apiUrl!: string;
  @Input() token!: string;
  @Input() projectId?: string;
  @Input() flowId?: string;
  @Input() component!: 'flow-builder' | 'dashboard' | 'connections' | 'runs' | 'templates';

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private reactRoot: any = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    // Initialize runtime EE checks in development
    initializeRuntimeEEChecks();

    // Validate required inputs
    if (!this.apiUrl || !this.token) {
      console.error('ReactUIWrapperComponent: apiUrl and token are required');
      return;
    }

    if (!this.component) {
      console.error('ReactUIWrapperComponent: component type is required');
      return;
    }

    // Set API configuration IMMEDIATELY before any React code runs
    // This ensures react-ui's api.ts picks up the correct API URL
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).__AP_SDK_CONFIG__ = {
        apiUrl: this.apiUrl,
        token: this.token,
        projectId: this.projectId,
        flowId: this.flowId,
      };
      
      // Also set in sessionStorage for react-ui authentication
      if (this.token) {
        try {
          const storage = window.sessionStorage || window.localStorage;
          storage.setItem('token', this.token);
          if (this.projectId) {
            storage.setItem('projectId', this.projectId);
          }
        } catch (e) {
          console.warn('Failed to set authentication in storage:', e);
        }
      }
    }

    // Wait for view to initialize
    setTimeout(() => this.mountReactComponent(), 0);
  }

  ngOnDestroy(): void {
    if (this.reactRoot) {
      unmountReactComponent(this.reactRoot);
    }
  }

  private mountReactComponent(): void {
    if (!this.container) {
      console.error('ReactUIWrapperComponent: Container not available');
      return;
    }

    const containerElement = createReactContainer();
    this.container.element.nativeElement.appendChild(containerElement);

    const config: ReactUISDKConfig = {
      apiUrl: this.apiUrl,
      token: this.token,
      projectId: this.projectId,
      flowId: this.flowId,
    };

    // Select React component based on input
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ReactComponent: any;
    switch (this.component) {
      case 'flow-builder':
        if (!this.flowId) {
          console.error('ReactUIWrapperComponent: flowId is required for flow-builder');
          return;
        }
        ReactComponent = FlowBuilder;
        break;
      case 'dashboard':
        ReactComponent = Dashboard;
        break;
      case 'connections':
        ReactComponent = Connections;
        break;
      case 'runs':
        ReactComponent = Runs;
        break;
      case 'templates':
        ReactComponent = Templates;
        break;
      default:
        console.error(`ReactUIWrapperComponent: Unknown component type: ${this.component}`);
        return;
    }

    this.reactRoot = mountReactComponent(containerElement, ReactComponent, config);
    this.cdr.detectChanges();
  }
}
