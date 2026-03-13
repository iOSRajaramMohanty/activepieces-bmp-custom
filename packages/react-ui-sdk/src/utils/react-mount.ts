/**
 * React Mount Utility
 * 
 * Utility functions for mounting React components in Angular.
 * Handles React 18+ createRoot API and cleanup.
 * 
 * IMPORTANT: React must run outside of Zone.js to avoid conflicts with
 * Angular's change detection. We use Zone's runOutsideAngular pattern.
 */

import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ComponentType } from 'react';

// Type declaration for Zone.js (available when running in Angular)
declare const Zone: {
  current: { run: <T>(fn: () => T) => T } | null;
  root: { run: <T>(fn: () => T) => T } | null;
} | undefined;

/**
 * Runs a function outside of Angular's Zone.js
 * This prevents Zone.js from patching React's async operations
 */
function runOutsideZone<T>(fn: () => T): T {
  // Check if Zone.js is present and we're in Angular zone
  if (typeof Zone !== 'undefined' && Zone && Zone.current && Zone.root && Zone.current !== Zone.root) {
    // Run in root zone (outside Angular)
    return Zone.root.run(fn);
  }
  
  // No Zone.js or already in root zone
  return fn();
}

/**
 * Mounts a React component into a DOM element
 * Runs outside of Zone.js to prevent React hooks conflicts
 */
export function mountReactComponent<T extends Record<string, unknown>>(
  element: HTMLElement,
  Component: ComponentType<T>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any
): Root {
  return runOutsideZone(() => {
    const root = createRoot(element);
    // Render synchronously - the single React instance fix resolved the hooks issue
    root.render(React.createElement(Component, props));
    return root;
  });
}

/**
 * Unmounts a React component from a DOM element
 * Runs outside of Zone.js for consistency
 */
export function unmountReactComponent(root: Root): void {
  runOutsideZone(() => {
    root.unmount();
  });
}

/**
 * Creates a container element for React mounting
 */
export function createReactContainer(): HTMLElement {
  const container = document.createElement('div');
  container.style.width = '100%';
  container.style.height = '100%';
  return container;
}
