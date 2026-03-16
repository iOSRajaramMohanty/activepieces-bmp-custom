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

// Store cleanup functions for SDK event handlers
const sdkCleanupMap = new WeakMap<HTMLElement, () => void>();

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
 * Sets up SDK-specific event handlers for the embedded context.
 * These handlers fix issues that occur when the SDK is embedded in Angular/non-React hosts.
 *
 * Context menu: We listen in BUBBLE phase so that React/Radix receive the event first and
 * can open the custom menu. We then preventDefault() to stop the native browser menu.
 * If we prevented in capture phase, the native menu was suppressed but the custom menu
 * sometimes failed to open (timing/order). Bubble phase runs after the event has reached
 * the target and bubbled up through the React root, so the custom menu opens first.
 */
function setupSDKEventHandlers(element: HTMLElement): () => void {
  const handleContextMenuBubble = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    
    if (!element.contains(target)) {
      return;
    }
    
    // Only prevent native menu inside the flow canvas; allow it elsewhere (dashboard, settings, etc.)
    const reactFlow = target.closest('.react-flow');
    if (!reactFlow) {
      return;
    }
    
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      return;
    }
    
    const existingMenu = document.querySelector('[data-slot="context-menu-content"]');
    if (existingMenu) {
      return;
    }
    
    // Event has already been handled by React/Radix (we're in bubble phase).
    // Prevent the native context menu so only the custom one shows.
    e.preventDefault();
  };
  
  // Bubble phase (false) so React root and Radix see the event before we prevent default
  document.addEventListener('contextmenu', handleContextMenuBubble, false);
  
  return () => {
    document.removeEventListener('contextmenu', handleContextMenuBubble, false);
  };
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
    // Set up SDK-specific event handlers
    const cleanup = setupSDKEventHandlers(element);
    sdkCleanupMap.set(element, cleanup);
    
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
export function unmountReactComponent(root: Root, element?: HTMLElement): void {
  runOutsideZone(() => {
    // Clean up SDK event handlers if element is provided
    if (element) {
      const cleanup = sdkCleanupMap.get(element);
      if (cleanup) {
        cleanup();
        sdkCleanupMap.delete(element);
      }
    }
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
