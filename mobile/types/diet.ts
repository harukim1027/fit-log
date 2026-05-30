export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  amount: number;
  unit: string;
  snackCardId?: string;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Meal {
  id: string;
  type: MealType;
  foods: FoodItem[];
  date: string;
}

export interface SnackCard {
  id: string;
  name: string;
  foods: FoodItem[];
}

export interface DailyDiet {
  date: string;
  meals: Meal[];
  snackCards: SnackCard[];
  targetCalories: number;
}
