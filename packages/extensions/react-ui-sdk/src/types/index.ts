/**
 * TypeScript types for React UI SDK
 * 
 * These types define the configuration and props for SDK components.
 * All types are CE-compatible and exclude EE features.
 */

/**
 * SDK Configuration
 */
export interface ReactUISDKConfig {
  /** API URL of the Activepieces instance */
  apiUrl: string;
  /** JWT authentication token */
  token: string;
  /** Optional project ID */
  projectId?: string;
  /** Optional flow ID for flow-specific views */
  flowId?: string;
}

/**
 * Flow Builder Component Props
 */
export interface FlowBuilderProps extends ReactUISDKConfig {
  /** Flow ID to edit */
  flowId: string;
  /** Callback when flow is saved */
  onFlowSaved?: (flowId: string) => void;
  /** Callback for errors */
  onError?: (error: Error) => void;
}

/**
 * Dashboard Component Props
 */
export interface DashboardProps extends ReactUISDKConfig {
  /** Callback when a flow is selected */
  onFlowSelected?: (flowId: string) => void;
}

/**
 * Connections Component Props
 */
export interface ConnectionsProps extends ReactUISDKConfig {
  /** Callback when connection is created/updated */
  onConnectionChanged?: (connectionId: string) => void;
}

/**
 * Runs Component Props
 */
export interface RunsProps extends ReactUISDKConfig {
  /** Optional flow ID to filter runs */
  flowId?: string;
  /** Callback when run is selected */
  onRunSelected?: (runId: string) => void;
}

/**
 * Templates Component Props
 */
export interface TemplatesProps extends ReactUISDKConfig {
  /** Callback when template is selected */
  onTemplateSelected?: (templateId: string) => void;
}

/**
 * SDK Event Types
 */
export type SDKEventType = 
  | 'flow-saved'
  | 'flow-selected'
  | 'connection-changed'
  | 'run-selected'
  | 'template-selected'
  | 'error';

export interface SDKEvent {
  type: SDKEventType;
  data?: unknown;
}
