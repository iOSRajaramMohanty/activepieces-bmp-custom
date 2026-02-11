/**
 * React Mount Utility
 * 
 * Utility functions for mounting React components in Angular.
 * Handles React 18+ createRoot API and cleanup.
 */

import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ComponentType } from 'react';

/**
 * Mounts a React component into a DOM element
 */
export function mountReactComponent<T extends Record<string, unknown>>(
  element: HTMLElement,
  Component: ComponentType<T>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any
): Root {
  const root = createRoot(element);
  root.render(React.createElement(Component, props));
  return root;
}

/**
 * Unmounts a React component from a DOM element
 */
export function unmountReactComponent(root: Root): void {
  root.unmount();
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
