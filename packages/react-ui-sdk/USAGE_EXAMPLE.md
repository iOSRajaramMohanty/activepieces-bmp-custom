# Usage Example

## Angular Integration

### 1. Install Dependencies

```bash
npm install @activepieces/react-ui-sdk react react-dom
```

### 2. Import Module

```typescript
// app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { ReactUIWrapperModule } from '@activepieces/react-ui-sdk';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [AppComponent],
  imports: [
    BrowserModule,
    ReactUIWrapperModule, // Add SDK module
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
```

### 3. Use Components

```typescript
// app.component.ts
import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <div class="container">
      <h1>My Angular App</h1>
      
      <!-- Flow Builder -->
      <ap-react-ui-wrapper
        [apiUrl]="apiUrl"
        [token]="token"
        [projectId]="projectId"
        [flowId]="flowId"
        component="flow-builder">
      </ap-react-ui-wrapper>
      
      <!-- Dashboard -->
      <ap-react-ui-wrapper
        [apiUrl]="apiUrl"
        [token]="token"
        [projectId]="projectId"
        component="dashboard">
      </ap-react-ui-wrapper>
      
      <!-- Connections -->
      <ap-react-ui-wrapper
        [apiUrl]="apiUrl"
        [token]="token"
        [projectId]="projectId"
        component="connections">
      </ap-react-ui-wrapper>
    </div>
  `,
  styles: [`
    .container {
      width: 100%;
      height: 100vh;
    }
    
    ap-react-ui-wrapper {
      display: block;
      width: 100%;
      height: 600px;
      margin-bottom: 20px;
    }
  `],
})
export class AppComponent {
  apiUrl = 'https://api.example.com';
  token = 'your-jwt-token';
  projectId = 'your-project-id';
  flowId = 'your-flow-id';
}
```

## Available Components

### Flow Builder
```html
<ap-react-ui-wrapper
  [apiUrl]="apiUrl"
  [token]="token"
  [projectId]="projectId"
  [flowId]="flowId"
  component="flow-builder">
</ap-react-ui-wrapper>
```

### Dashboard (Flows List)
```html
<ap-react-ui-wrapper
  [apiUrl]="apiUrl"
  [token]="token"
  [projectId]="projectId"
  component="dashboard">
</ap-react-ui-wrapper>
```

### Connections
```html
<ap-react-ui-wrapper
  [apiUrl]="apiUrl"
  [token]="token"
  [projectId]="projectId"
  component="connections">
</ap-react-ui-wrapper>
```

### Runs
```html
<ap-react-ui-wrapper
  [apiUrl]="apiUrl"
  [token]="token"
  [projectId]="projectId"
  [flowId]="flowId"
  component="runs">
</ap-react-ui-wrapper>
```

### Templates
```html
<ap-react-ui-wrapper
  [apiUrl]="apiUrl"
  [token]="token"
  [projectId]="projectId"
  component="templates">
</ap-react-ui-wrapper>
```

## Configuration

All components require:
- `apiUrl` (string): API URL of your Activepieces instance
- `token` (string): JWT authentication token
- `component` (string): Component type to render

Optional:
- `projectId` (string): Project ID
- `flowId` (string): Flow ID (required for flow-builder)

## Notes

- The SDK uses MemoryRouter internally, so browser navigation won't affect the SDK components
- Authentication is handled via JWT token passed as input
- All components are CE-only (no EE features)
- Components are isolated and won't interfere with your Angular app's routing
