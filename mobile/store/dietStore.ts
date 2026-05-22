import { create } from 'zustand';
import { DailyDiet, FoodItem, MealType } from '../types/diet';
import { DEFAULT_TARGET_CALORIES } from '../constants';

interface DietStore {
  dailyDiets: DailyDiet[];
  targetCalories: number;
  getTodayDiet: () => DailyDiet;
  addFood: (mealType: MealType, food: FoodItem, date?: string) => void;
  removeFood: (mealType: MealType, foodId: string, date?: string) => void;
  getTotalCalories: (date?: string) => number;
  getMealCalories: (mealType: MealType, date?: string) => number;
}

const todayStr = () => new Date().toISOString().split('T')[0];

const emptyDiet = (date: string, target: number): DailyDiet => ({
  date,
  targetCalories: target,
  meals: [
    { id: date+'-breakfast', type: 'breakfast', foods: [], date },
    { id: date+'-lunch',     type: 'lunch',     foods: [], date },
    { id: date+'-dinner',    type: 'dinner',    foods: [], date },
    { id: date+'-snack',     type: 'snack',     foods: [], date },
  ],
});

export const useDietStore = create<DietStore>((set, get) => ({
  dailyDiets: [],
  targetCalories: DEFAULT_TARGET_CALORIES,

  getTodayDiet: () => {
    const today = todayStr();
    const existing = get().dailyDiets.find(d => d.date === today);
    if (existing) return existing;
    const fresh = emptyDiet(today, get().targetCalories);
    set(s => ({ dailyDiets: [...s.dailyDiets, fresh] }));
    return fresh;
  },

  addFood: (mealType, food, date) => {
    const d = date ?? todayStr();
    set(s => {
      const diets = [...s.dailyDiets];
      let diet = diets.find(x => x.date === d);
      if (!diet) {
        diet = emptyDiet(d, s.targetCalories);
        diets.push(diet);
      }
      diet.meals = diet.meals.map(m =>
        m.type === mealType ? { ...m, foods: [...m.foods, food] } : m
      );
      return { dailyDiets: diets };
    });
  },

  removeFood: (mealType, foodId, date) => {
    const d = date ?? todayStr();
    set(s => ({
      dailyDiets: s.dailyDiets.map(diet =>
        diet.date !== d ? diet : {
          ...diet,
          meals: diet.meals.map(m =>
            m.type === mealType
              ? { ...m, foods: m.foods.filter(f => f.id !== foodId) }
              : m
          ),
        }
      ),
    }));
  },

  getTotalCalories: (date) => {
    const d = date ?? todayStr();
    const diet = get().dailyDiets.find(x => x.date === d);
    if (!diet) return 0;
    return diet.meals.reduce((sum, m) =>
      sum + m.foods.reduce((s, f) => s + f.calories, 0), 0
    );
  },

  getMealCalories: (mealType, date) => {
    const d = date ?? todayStr();
    const diet = get().dailyDiets.find(x => x.date === d);
    if (!diet) return 0;
    const meal = diet.meals.find(m => m.type === mealType);
    return meal?.foods.reduce((s, f) => s + f.calories, 0) ?? 0;
  },
}));