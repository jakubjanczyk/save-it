export type FocusAction = "save" | "discard";

export type FocusFeedbackAction = FocusAction | null;

export interface FocusEmailContext {
  id: string;
  subject: string;
  from: string;
  receivedAt: number;
}

export interface FocusViewItem {
  id: string;
  title: string;
  description: string;
  url: string;
  email: FocusEmailContext;
}
