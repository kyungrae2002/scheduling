
import { Task, TaskFormData } from './types';

export const generateId = (): string => {
  return Math.random().toString(36).substr(2, 9);
};

// Helper to parse "YYYY-MM-DD" as local date at midnight to avoid timezone issues
export const parseLocalDate = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
};

export const getDueWeight = (dueDateStr: string): number => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = parseLocalDate(dueDateStr);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) return 5; // Today or Overdue
  if (diffDays <= 7) return 3; // This Week
  return 0;
};

// The Core Algorithm
export const calculatePriorityScore = (
  impact: number,
  urgency: number,
  effort: number,
  dueDate: string,
  isDomino: boolean,
  isBlocked: boolean
): number => {
  if (isBlocked) return -999; // Block penalty

  const dueWeight = getDueWeight(dueDate);
  const dominoBonus = isDomino ? 3 : 0;

  // Score = (Impact×3) + (Urgency×2) + (DueWeight×2) - (Effort×1) + (DominoBonus)
  const score = (impact * 3) + (urgency * 2) + (dueWeight * 2) - (effort * 1) + dominoBonus;
  
  return Math.round(score * 10) / 10;
};

export const getFormattedDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const addDays = (date: Date, days: number): Date => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

// Convert seconds to HH:MM:SS format always
export const formatTime = (totalSeconds: number): string => {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  const h = String(hours).padStart(2, '0');
  const m = String(minutes).padStart(2, '0');
  const s = String(seconds).padStart(2, '0');

  return `${h}:${m}:${s}`;
};

// Google Analytics Event Tracking Helper
export const trackEvent = (eventName: string, params?: Record<string, any>) => {
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', eventName, params);
  }
};

export const calculateTodayEnergy = (tasks: Task[]): number => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDate = now.getDate();
  let totalSeconds = 0;

  tasks.forEach(task => {
    if (task.workLogs && task.workLogs.length > 0) {
      task.workLogs.forEach(log => {
        const logDate = new Date(log.startedAt);
        if (
          logDate.getFullYear() === currentYear &&
          logDate.getMonth() === currentMonth &&
          logDate.getDate() === currentDate
        ) {
          totalSeconds += log.duration;
        }
      });
    }
    
    // Add currently active session if it started today
    if (task.isActive && task.lastStartTime) {
        const logDate = new Date(task.lastStartTime);
        if (
          logDate.getFullYear() === currentYear &&
          logDate.getMonth() === currentMonth &&
          logDate.getDate() === currentDate
        ) {
          totalSeconds += (Date.now() - task.lastStartTime) / 1000;
        }
    }
  });
  return Math.floor(totalSeconds);
};
