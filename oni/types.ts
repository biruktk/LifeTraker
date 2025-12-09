export type Priority = 'TOP' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface Todo {
  id: string;
  title: string;
  priority: Priority;
  completed: boolean;
  date: string; // YYYY-MM-DD
}

export interface Habit {
  id: string;
  name: string;
  logs: Record<string, boolean>; // "YYYY-MM-DD": completed
}

export interface NonNegotiable {
  id: string;
  title: string;
}

export interface JournalEntry {
  id: string;
  date: string; // YYYY-MM-DD
  content: string;
  mood?: 'Happy' | 'Neutral' | 'Sad' | 'Productive' | 'Tired';
  highlights: string[];
  persons: string[];
  images: string[]; // Base64 strings
}

export interface Expense {
  id: string;
  amount: number;
  category: 'Food' | 'Transport' | 'Shopping' | 'Bills' | 'Entertainment' | 'Other';
  description: string;
  date: string;
}

export interface Milestone {
  id: string;
  title: string;
  date: string; // Target Date
  completed: boolean;
  description?: string;
}

export interface SocialPost {
  id: string;
  content: string;
  image: string | null;
  platforms: string[]; // ['telegram', 'twitter', etc.]
  scheduledTime: string; // ISO String
  status: 'QUEUED' | 'PUBLISHED' | 'SENT';
}

export interface AppData {
  goals: {
    main: string;
    weekly: string;
  };
  milestones: Milestone[];
  socialQueue: SocialPost[];
  nonNegotiables: NonNegotiable[];
  nonNegotiableLogs: Record<string, string[]>; // Date -> Array of completed NonNegotiable IDs
  todos: Todo[];
  habits: Habit[];
  journal: JournalEntry[];
  expenses: Expense[];
  user: {
    name: string;
    profileImage?: string;
  };
}