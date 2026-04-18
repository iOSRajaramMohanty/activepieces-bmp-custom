export type ChatbotWidgetMode = 'builder' | 'agent';

export type ChatbotMessage = {
  role: 'user' | 'assistant';
  content: string;
  created: string;
};

export type ChatbotWidgetProps = {
  apiUrl: string;
  projectId: string;
  /** Initial mode; users can switch Builder/Agent in the widget UI. */
  mode: ChatbotWidgetMode;
  flowId?: string;
  /** In-app / authenticated widget: user JWT. */
  token?: string;
  /** External embed: publishable key from project Chatbot settings (never commit real keys). */
  publishableKey?: string;
};
