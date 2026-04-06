
export interface WorkLog {
  startedAt: number; // Timestamp
  duration: number; // Seconds
}

export interface Task {
  id: string;
  userId?: string; // New field for Firebase ownership
  title: string;
  category: string;
  dueDate: string; // ISO Date string YYYY-MM-DD
  impact: number; // 1-10
  urgency: number; // 1-10
  effort: number; // 1-10
  isDomino: boolean; // Renamed to "My Core" in UI
  isBlocked: boolean; // Pre-requisite penalty
  isCompleted: boolean;
  isActive: boolean; // The "Switch" state
  createdAt: string;
  completedAt?: string; // ISO Date string for completion time
  totalTime: number; // Accumulated time in seconds
  lastStartTime: number | null; // Timestamp when the current session started
  workLogs?: WorkLog[]; // New: History of work sessions
}

export interface TaskFormData {
  title: string;
  category: string;
  dueDate: string;
  impact: number;
  urgency: number;
  effort: number;
  isDomino: boolean;
  isBlocked: boolean;
}

export const DEFAULT_CATEGORIES = ['업무', '개인', '성장', '건강', '금융'];

// Color Palette Constants - Light Theme High Contrast
export const COLORS = {
  bg: '#F4F4F5', // Zinc 100
  card: 'rgba(255, 255, 255, 0.8)', // White Glass
  textMain: '#18181B', // Zinc 900
  textSub: '#52525B', // Zinc 600
  accent: '#F67121', // Orange
  border: 'rgba(24, 24, 27, 0.1)', // Subtle dark border
  switchOff: '#D4D4D8', // Zinc 300
};
