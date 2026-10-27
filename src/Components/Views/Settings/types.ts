export interface FeedbackMessage {
  type: 'success' | 'warning' | 'error' | 'info';
  text: string;
}
