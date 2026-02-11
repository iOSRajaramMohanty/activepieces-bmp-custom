# @activepieces/react-ui-sdk

React UI SDK for Angular - Community Edition (MIT Licensed)

This SDK provides Angular components that wrap React UI components from Activepieces, allowing seamless integration into Angular applications.

## ⚠️ Important: CE Edition Only

This SDK **only includes Community Edition (CE) features** and is licensed under MIT. Enterprise Edition (EE) features are explicitly excluded to maintain license compliance.

## Installation

```bash
npm install @activepieces/react-ui-sdk react react-dom
# or
yarn add @activepieces/react-ui-sdk react react-dom
```

## Peer Dependencies

- `react` ^18.0.0
- `react-dom` ^18.0.0
- `@angular/core` ^15.0.0 || ^16.0.0 || ^17.0.0 || ^18.0.0
- `@angular/common` ^15.0.0 || ^16.0.0 || ^17.0.0 || ^18.0.0

## Quick Start

### 1. Import the Module

```typescript
import { ReactUIWrapperModule } from '@activepieces/react-ui-sdk';

@NgModule({
  imports: [ReactUIWrapperModule],
  // ...
})
export class AppModule {}
```

### 2. Use Components in Templates

```html
<ap-react-ui-flow-builder
  [apiUrl]="'https://api.example.com'"
  [token]="jwtToken"
  [flowId]="flowId"
  (onFlowSaved)="handleFlowSaved($event)">
</ap-react-ui-flow-builder>
```

## Available Components

### Flow Builder

```html
<ap-react-ui-flow-builder
  [apiUrl]="apiUrl"
  [token]="token"
  [flowId]="flowId"
  (onFlowSaved)="onFlowSaved($event)"
  (onError)="onError($event)">
</ap-react-ui-flow-builder>
```

### Dashboard

```html
<ap-react-ui-flows-dashboard
  [apiUrl]="apiUrl"
  [token]="token"
  [projectId]="projectId"
  (onFlowSelected)="onFlowSelected($event)">
</ap-react-ui-flows-dashboard>
```

### Connections

```html
<ap-react-ui-connections
  [apiUrl]="apiUrl"
  [token]="token"
  [projectId]="projectId"
  (onConnectionChanged)="onConnectionChanged($event)">
</ap-react-ui-connections>
```

### Runs

```html
<ap-react-ui-runs
  [apiUrl]="apiUrl"
  [token]="token"
  [projectId]="projectId"
  [flowId]="flowId"
  (onRunSelected)="onRunSelected($event)">
</ap-react-ui-runs>
```

### Templates

```html
<ap-react-ui-templates
  [apiUrl]="apiUrl"
  [token]="token"
  [projectId]="projectId"
  (onTemplateSelected)="onTemplateSelected($event)">
</ap-react-ui-templates>
```

## Configuration

All components accept a base configuration:

```typescript
interface ReactUISDKConfig {
  apiUrl: string;      // Required: API URL of Activepieces instance
  token: string;       // Required: JWT authentication token
  projectId?: string;  // Optional: Project ID
  flowId?: string;     // Optional: Flow ID
}
```

## Excluded Features (EE Only)

The following features are **NOT available** in this CE SDK:

- ❌ Embedding features
- ❌ SSO configuration
- ❌ Custom branding
- ❌ Billing management
- ❌ Audit logs
- ❌ API keys management
- ❌ Signing keys
- ❌ Project roles
- ❌ Global connections
- ❌ Organizations management
- ❌ Event destinations

## License

MIT License - See [LICENSE](./LICENSE) file for details.

## Support

For issues and questions:
- GitHub Issues: https://github.com/activepieces/activepieces/issues
- Documentation: https://www.activepieces.com/docs

## Contributing

Contributions are welcome! Please ensure:
1. No EE imports are used
2. All code follows MIT license
3. Tests pass
4. Build validation passes
