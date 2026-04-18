import React from 'react';
import { createRoot } from 'react-dom/client';

import { ChatbotWidget } from '../react/chatbot-widget';
import { ChatbotWidgetProps } from '../types';

export function mountChatbot({
  element,
  props,
}: {
  element: HTMLElement;
  props: ChatbotWidgetProps;
}) {
  const root = createRoot(element);
  root.render(<ChatbotWidget {...props} />);
  return () => root.unmount();
}
