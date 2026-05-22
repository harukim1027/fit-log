import { create } from 'zustand';
import { DailyDiet, FoodItem, MealType } from '../types/diet';
import { DEFAULT_TARGET_CALORIES } from '../constants';
import apiClient from '../lib/apiClient';

interface NutrientSummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meals: { breakfast: number; lunch: number; dinner: number; snack: number };
}

interface DietStore {
  dailyDiets: DailyDiet[];
  targetCalories: number;
  isLoading: boolean;
  summary: NutrientSummary | null;
  getTodayDiet: () => DailyDiet;
  addFood: (mealType: MealType, food: FoodItem, date?: string) => Promise<void>;
  removeFood: (mealType: MealType, foodId: string, date?: string) => Promise<void>;
  getTotalCalories: (date?: string) => number;
  fetchDiet: (date?: string) => Promise<void>;
  fetchSummary: (date?: string) => Promise<void>;
  setTargetCalories: (cal: number) => void;
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
  isLoading: false,
  summary: null,

  setTargetCalories: (cal) => set({ targetCalories: cal }),

  getTodayDiet: () => {
    const today = todayStr();
    const existing = get().dailyDiets.find(d => d.date === today);
    if (existing) return existing;
    const fresh = emptyDiet(today, get().targetCalories);
    set(s => ({ dailyDiets: [...s.dailyDiets, fresh] }));
    return fresh;
  },

  fetchSummary: async (date) => {
    const d = date ?? todayStr();
    try {
      const res = await apiClient.get('/diet/summary', { params: { date: d } });
      set({ summary: res.data });
    } catch (e) {
      console.error('영양소 요약 불러오기 실패', e);
    }
  },

  fetchDiet: async (date) => {
    const d = date ?? todayStr();
    set({ isLoading: true });
    try {
      const res = await apiClient.get('/diet', { params: { date: d } });
      const logs = res.data;
      const diet = emptyDiet(d, get().targetCalories);
      logs.forEach((log: any) => {
        const meal = diet.meals.find(m => m.type === log.mealType);
        if (meal) {
          meal.foods.push({
            id: log.id,
            name: log.foodName,
            calories: log.calories,
            protein: log.protein,
            carbs: log.carbs,
            fat: log.fat,
            amount: log.amount,
            unit: log.unit,
          });
        }
      });
      set(s => {
        const diets = s.dailyDiets.filter(x => x.date !== d);
        return { dailyDiets: [...diets, diet], isLoading: false };
      });
      await get().fetchSummary(d);
    } catch (e) {
      console.error('식단 불러오기 실패', e);
      set({ isLoading: false });
    }
  },

  addFood: async (mealType, food, date) => {
    const d = date ?? todayStr();
    try {
      await apiClient.post('/diet', {
        date: d,
        mealType,
        foodName: food.name,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        amount: food.amount,
        unit: food.unit,
      });
      await get().fetchDiet(d);
    } catch (e) {
      console.error('식단 추가 실패', e);
    }
  },

  removeFood: async (mealType, foodId, date) => {
    const d = date ?? todayStr();
    try {
      await apiClient.delete('/diet/' + foodId);
      await get().fetchDiet(d);
    } catch (e) {
      console.error('식단 삭제 실패', e);
    }
  },

  getTotalCalories: (date) => {
    const d = date ?? todayStr();
    const diet = get().dailyDiets.find(x => x.date === d);
    if (!diet) return 0;
    return diet.meals.reduce((sum, m) =>
      sum + m.foods.reduce((s, f) => s + f.calories, 0), 0
    );
  },
}));
