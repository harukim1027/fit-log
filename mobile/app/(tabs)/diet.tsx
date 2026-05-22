import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useDietStore } from '../../store/dietStore';
import { Colors, MEAL_LABELS } from '../../constants';
import { MealType } from '../../types/diet';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_EMOJI: Record<MealType, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };

export default function DietScreen() {
    const router = useRouter();
  const { getTodayDiet, getTotalCalories, targetCalories, removeFood, fetchDiet, isLoading } = useDietStore();

  useEffect(() => { fetchDiet(); }, []);

  const todayDiet = getTodayDiet();
  const total = getTotalCalories();
  const progress = Math.min(total / targetCalories, 1);

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={s.container}>
    <ScrollView contentContainerStyle={s.content}>
      <Text style={s.title}>식단 기록</Text>
      <View style={s.card}>
        <View style={s.progressHeader}>
          <Text style={s.progressText}>{total} kcal</Text>
          <Text style={s.progressSub}>목표 {targetCalories} kcal</Text>
        </View>
        <View style={s.progressBg}>
          <View style={[s.progressFill, { width: (progress * 100) + '%' }]} />
        </View>
        <Text style={s.progressPct}>{Math.round(progress * 100)}% 달성</Text>
      </View>
      {MEAL_TYPES.map(type => {
        const meal = todayDiet.meals.find(m => m.type === type);
        const mealCal = meal?.foods.reduce((s, f) => s + f.calories, 0) ?? 0;
        return (
          <View key={type} style={s.mealCard}>
            <View style={s.mealHeader}>
              <View style={s.mealTitleRow}>
                <Text style={s.mealIcon}>{MEAL_EMOJI[type]}</Text>
                <Text style={s.mealTitle}>{MEAL_LABELS[type]}</Text>
                <Text style={s.mealCal}>{mealCal} kcal</Text>
              </View>
              <TouchableOpacity style={s.addBtn} onPress={() => router.push({ pathname: '/modal/add-food', params: { mealType: type } })}>
                <Ionicons name="add" size={20} color={Colors.diet} />
              </TouchableOpacity>
            </View>
            {!meal || meal.foods.length === 0 ? (
              <Text style={s.emptyText}>추가된 식품이 없어요</Text>
            ) : (
              meal.foods.map(food => (
                <View key={food.id} style={s.foodRow}>
                  <View style={s.foodInfo}>
                    <Text style={s.foodName}>{food.name}</Text>
                    <Text style={s.foodDetail}>{food.amount}{food.unit} · {food.calories}kcal</Text>
                  </View>
                  <TouchableOpacity onPress={() => removeFood(type, food.id)}>
                    <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        );
      })}
    </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  title: { fontSize: 26, fontWeight: '700', color: Colors.textPrimary, marginBottom: 20 },
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  progressText: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  progressSub: { fontSize: 14, color: Colors.textSecondary, alignSelf: 'flex-end' },
  progressBg: { height: 8, backgroundColor: Colors.surfaceAlt, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', backgroundColor: Colors.diet, borderRadius: 4 },
  progressPct: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right' },
  mealCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  mealTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mealIcon: { fontSize: 20 },
  mealTitle: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  mealCal: { fontSize: 13, color: Colors.textSecondary },
  addBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: Colors.diet + '20', alignItems: 'center', justifyContent: 'center' },
  emptyText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingVertical: 8 },
  foodRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderTopWidth: 1, borderTopColor: Colors.border },
  foodInfo: { flex: 1 },
  foodName: { fontSize: 14, fontWeight: '500', color: Colors.textPrimary },
  foodDetail: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
});
