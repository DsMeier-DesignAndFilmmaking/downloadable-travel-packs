export type FeedbackType = 'positive' | 'negative';

export interface SignalFeedback {
  recId: string;
  type: FeedbackType;
  timestamp: number;
}

const FEEDBACK_STORAGE_KEY = 'hade-feedback-v1';
const MAX_FEEDBACK_ROWS = 300;

function readFeedbackRows(): SignalFeedback[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(FEEDBACK_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((row): row is SignalFeedback => {
      if (!row || typeof row !== 'object') return false;
      const record = row as Record<string, unknown>;
      return (
        typeof record.recId === 'string' &&
        (record.type === 'positive' || record.type === 'negative') &&
        typeof record.timestamp === 'number'
      );
    });
  } catch {
    return [];
  }
}

function writeFeedbackRows(rows: SignalFeedback[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(rows));
  } catch {
    // Ignore storage quota/privacy errors; feedback is best-effort.
  }
}

export const SignalsDB = {
  async recordFeedback(feedback: SignalFeedback): Promise<void> {
    const existing = readFeedbackRows();
    const next = [...existing, feedback].slice(-MAX_FEEDBACK_ROWS);
    writeFeedbackRows(next);
  },

  getRecentFeedback(n: number): SignalFeedback[] {
    return readFeedbackRows().slice(-n);
  },
};

