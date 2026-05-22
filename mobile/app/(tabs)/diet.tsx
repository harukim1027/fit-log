import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useDietStore } from '../../store/dietStore';
import { Colors, MEAL_LABELS } from '../../constants';
import { MealType } from '../../types/diet';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_EMOJI: Record<MealType, string> = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };

const dateStr = (d: Date) => d.toISOString().split('T')[0];
const formatDate = (d: Date) => d.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });
const isToday = (d: Date) => dateStr(d) === dateStr(new Date());

export default function DietScreen() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const { getTodayDiet, getTotalCalories, targetCalories, removeFood, fetchDiet, isLoading, summary, dailyDiets } = useDietStore();

  useEffect(() => { fetchDiet(dateStr(currentDate)); }, [currentDate]);

  const diet = dailyDiets.find(d => d.date === dateStr(currentDate));
  const total = diet?.meals.reduce((s, m) => s + m.foods.reduce((f, food) => f + food.calories, 0), 0) ?? 0;
  const progress = Math.min(total / targetCalories, 1);

  const protein = summary?.protein ?? 0;
  const carbs = summary?.carbs ?? 0;
  const fat = summary?.fat ?? 0;
  const totalMacro = protein + carbs + fat || 1;

  const goBack = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const goForward = () => {
    if (isToday(currentDate)) return;
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[s.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.content}>

        <View style={s.dateNav}>
          <TouchableOpacity style={s.navBtn} onPress={goBack}>
            <Ionicons name="chevron-back" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
          <View style={s.dateCenter}>
            <Text style={s.dateText}>{formatDate(currentDate)}</Text>
            {isToday(currentDate) && <View style={s.todayDot} />}
          </View>
          <TouchableOpacity style={[s.navBtn, isToday(currentDate) && s.navBtnDisabled]} onPress={goForward}>
            <Ionicons name="chevron-forward" size={20} color={isToday(currentDate) ? Colors.textMuted : Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          <View style={s.progressHeader}>
            <Text style={s.progressText}>{total} kcal</Text>
            <Text style={s.progressSub}>목표 {targetCalories} kcal</Text>
          </View>
          <View style={s.progressBg}>
            <View style={[s.progressFill, { width: (progress * 100) + '%', backgroundColor: progress >= 1 ? Colors.danger : Colors.diet }]} />
          </View>
          <Text style={s.progressPct}>{Math.round(progress * 100)}% 달성</Text>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>영양소</Text>
          <View style={s.macroBarBg}>
            <View style={[s.macroBarSegment, { flex: carbs / totalMacro, backgroundColor: '#FFB347' }]} />
            <View style={[s.macroBarSegment, { flex: protein / totalMacro, backgroundColor: '#6C63FF' }]} />
            <View style={[s.macroBarSegment, { flex: fat / totalMacro, backgroundColor: '#FF6584' }]} />
          </View>
          <View style={s.macroRow}>
            <MacroChip label="탄수화물" value={carbs + 'g'} color="#FFB347" />
            <MacroChip label="단백질" value={protein + 'g'} color="#6C63FF" />
            <MacroChip label="지방" value={fat + 'g'} color="#FF6584" />
          </View>
        </View>

        {MEAL_TYPES.map(type => {
          const meal = diet?.meals.find(m => m.type === type);
          const mealCal = meal?.foods.reduce((s, f) => s + f.calories, 0) ?? 0;
          return (
            <View key={type} style={s.mealCard}>
              <View style={s.mealHeader}>
                <View style={s.mealTitleRow}>
                  <Text style={s.mealIcon}>{MEAL_EMOJI[type]}</Text>
                  <Text style={s.mealTitle}>{MEAL_LABELS[type]}</Text>
                  <Text style={s.mealCal}>{mealCal} kcal</Text>
                </View>
                {isToday(currentDate) && (
                  <TouchableOpacity style={s.addBtn} onPress={() => router.push({ pathname: '/modal/add-food', params: { mealType: type } })}>
                    <Ionicons name="add" size={20} color={Colors.diet} />
                  </TouchableOpacity>
                )}
              </View>
              {!meal || meal.foods.length === 0 ? (
                <Text style={s.emptyText}>추가된 식품이 없어요</Text>
              ) : (
                meal.foods.map(food => (
                  <View key={food.id} style={s.foodRow}>
                    <View style={s.foodInfo}>
                      <Text style={s.foodName}>{food.name}</Text>
                      <Text style={s.foodDetail}>{food.amount}{food.unit} · {food.calories}kcal · 탄 {food.carbs}g · 단 {food.protein}g · 지 {food.fat}g</Text>
                    </View>
                    {isToday(currentDate) && (
                      <TouchableOpacity onPress={() => removeFood(type, food.id, dateStr(currentDate))}>
                        <Ionicons name="trash-outline" size={16} color={Colors.textMuted} />
                      </TouchableOpacity>
                    )}
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

function MacroChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={mc.wrap}>
      <View style={[mc.dot, { backgroundColor: color }]} />
      <Text style={mc.label}>{label}</Text>
      <Text style={[mc.value, { color }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  dateNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  navBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  navBtnDisabled: { opacity: 0.3 },
  dateCenter: { alignItems: 'center', gap: 4 },
  dateText: { fontSize: 17, fontWeight: '600', color: Colors.textPrimary },
  todayDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.primary },
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary, marginBottom: 14 },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  progressText: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  progressSub: { fontSize: 14, color: Colors.textSecondary, alignSelf: 'flex-end' },
  progressBg: { height: 10, backgroundColor: Colors.surfaceAlt, borderRadius: 5, overflow: 'hidden', marginBottom: 8 },
  progressFill: { height: '100%', borderRadius: 5 },
  progressPct: { fontSize: 12, color: Colors.textSecondary, textAlign: 'right' },
  macroBarBg: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', marginBottom: 14 },
  macroBarSegment: { height: '100%' },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between' },
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
  foodDetail: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
});
const mc = StyleSheet.create({
  wrap: { alignItems: 'center', flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  label: { fontSize: 11, color: Colors.textSecondary, marginBottom: 2 },
  value: { fontSize: 14, fontWeight: '700' },
});
