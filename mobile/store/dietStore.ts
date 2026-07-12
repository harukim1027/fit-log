import { create } from 'zustand';
import { DailyDiet, FoodItem, MealType, SnackCard } from '../types/diet';
import { DEFAULT_TARGET_CALORIES } from '../constants';
import apiClient from '../lib/apiClient';
import { localDateStr } from '../utils/date';

interface NutrientSummary {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  meals: { breakfast: number; lunch: number; dinner: number; snack: number };
}

export interface CalendarDay { date: string; calories: number; }

interface DietStore {
  dailyDiets: DailyDiet[];
  targetCalories: number;
  targetCarbsRatio: number;
  targetProteinRatio: number;
  targetFatRatio: number;
  isLoading: boolean;
  summary: NutrientSummary | null;
  dietCalendar: CalendarDay[];
  getTodayDiet: () => DailyDiet;
  addFood: (mealType: MealType, food: FoodItem, date?: string, snackCardId?: string) => Promise<void>;
  removeFood: (mealType: MealType, foodId: string, date?: string) => Promise<void>;
  getTotalCalories: (date?: string) => number;
  fetchDiet: (date?: string) => Promise<void>;
  fetchSummary: (date?: string) => Promise<void>;
  fetchCalendar: (year: number, month: number) => Promise<void>;
  setTargetCalories: (cal: number) => void;
  setMacroRatios: (carbs: number, protein: number, fat: number) => void;
}

const todayStr = () => localDateStr();

const DEFAULT_SNACK_CARD_ID = 'snack-default';

const emptyDiet = (date: string, target: number): DailyDiet => ({
  date,
  targetCalories: target,
  meals: [
    { id: date+'-breakfast', type: 'breakfast', foods: [], date },
    { id: date+'-lunch',     type: 'lunch',     foods: [], date },
    { id: date+'-dinner',    type: 'dinner',    foods: [], date },
    { id: date+'-snack',     type: 'snack',     foods: [], date },
  ],
  snackCards: [{ id: DEFAULT_SNACK_CARD_ID, name: '간식', foods: [] }],
});

export const useDietStore = create<DietStore>((set, get) => ({
  dailyDiets: [],
  targetCalories: DEFAULT_TARGET_CALORIES,
  targetCarbsRatio: 50,
  targetProteinRatio: 30,
  targetFatRatio: 20,
  isLoading: false,
  summary: null,
  dietCalendar: [],

  setTargetCalories: (cal) => set({ targetCalories: cal }),
  setMacroRatios: (carbs, protein, fat) => set({ targetCarbsRatio: carbs, targetProteinRatio: protein, targetFatRatio: fat }),

  fetchCalendar: async (year, month) => {
    try {
      const res = await apiClient.get('/diet/calendar', { params: { year, month } });
      set({ dietCalendar: res.data });
    } catch (e) {
      console.error('식단 달력 불러오기 실패', e);
    }
  },

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
        const food: FoodItem = {
          id: log.id,
          name: log.foodName,
          calories: log.calories,
          protein: log.protein,
          carbs: log.carbs,
          fat: log.fat,
          amount: log.amount,
          unit: log.unit,
          snackCardId: log.snackCardId ?? undefined,
        };
        if (log.mealType === 'snack') {
          const cardId = log.snackCardId ?? DEFAULT_SNACK_CARD_ID;
          let card = diet.snackCards.find(c => c.id === cardId);
          if (!card) {
            const idx = diet.snackCards.length + 1;
            card = { id: cardId, name: `간식${idx}`, foods: [] };
            diet.snackCards.push(card);
          }
          card.foods.push(food);
          // Also push to the legacy snack meal for calorie calculation
          const snackMeal = diet.meals.find(m => m.type === 'snack');
          if (snackMeal) snackMeal.foods.push(food);
        } else {
          const meal = diet.meals.find(m => m.type === log.mealType);
          if (meal) meal.foods.push(food);
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

  addFood: async (mealType, food, date, snackCardId) => {
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
        snackCardId: mealType === 'snack' ? (snackCardId ?? DEFAULT_SNACK_CARD_ID) : undefined,
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
