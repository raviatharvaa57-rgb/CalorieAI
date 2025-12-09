
export interface Macros {
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodItem {
  name: string;
  calories: number;
  macros: Macros;
  confidence: 'High' | 'Medium' | 'Low';
  description: string;
  portionSize: string;
  source?: string;
  alternatives?: string[];
  imageUrl?: string;
}

export interface LoggedMeal {
  id: string;
  timestamp: Date;
  item: FoodItem;
  imageUri?: string; // Data URL
}

export interface UserProfile {
  name: string;
  dailyCalorieGoal: number;
  weight: number;
  height: number; // in cm
  isOnboarded: boolean;
}

export interface PersonalNote {
  id: string;
  content: string;
  timestamp: Date;
}

export interface DailyHistory {
  date: string;
  calories: number;
  goal: number;
}

export enum AppView {
  SIGN_IN = 'SIGN_IN',
  SIGN_UP = 'SIGN_UP',
  ONBOARDING = 'ONBOARDING',
  DASHBOARD = 'DASHBOARD',
  SCANNER = 'SCANNER',
  SEARCH = 'SEARCH',
  RECIPE = 'RECIPE',
  NOTES = 'NOTES',
}