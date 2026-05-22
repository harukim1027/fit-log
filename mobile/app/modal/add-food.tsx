import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useDietStore } from '../../store/dietStore';
import { Colors, MEAL_LABELS } from '../../constants';
import { MealType, FoodItem } from '../../types/diet';

const SAMPLE_FOODS = [
  { name: '닭가슴살', calories: 165, protein: 31, carbs: 0, fat: 3.6, unit: 'g' },
  { name: '흰쌀밥', calories: 130, protein: 2.7, carbs: 28, fat: 0.3, unit: 'g' },
  { name: '고구마', calories: 86, protein: 1.6, carbs: 20, fat: 0.1, unit: 'g' },
  { name: '달걀', calories: 155, protein: 13, carbs: 1.1, fat: 11, unit: '개' },
  { name: '아보카도', calories: 160, protein: 2, carbs: 9, fat: 15, unit: 'g' },
  { name: '바나나', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, unit: '개' },
  { name: '오트밀', calories: 389, protein: 17, carbs: 66, fat: 7, unit: 'g' },
  { name: '그릭요거트', calories: 59, protein: 10, carbs: 3.6, fat: 0.4, unit: 'g' },
];

export default function AddFoodModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mealType: MealType }>();
  const mealType = params.mealType ?? 'breakfast';
  const { addFood } = useDietStore();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<typeof SAMPLE_FOODS[0] | null>(null);
  const [amount, setAmount] = useState('100');

  const filtered = SAMPLE_FOODS.filter(f => f.name.includes(search));

  const handleAdd = () => {
    if (!selected) return Alert.alert('식품을 선택해주세요');
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return Alert.alert('올바른 양을 입력해주세요');
    const ratio = amt / 100;
    const food: FoodItem = {
      id: Date.now().toString(),
      name: selected.name,
      calories: Math.round(selected.calories * ratio),
      protein: Math.round(selected.protein * ratio * 10) / 10,
      carbs: Math.round(selected.carbs * ratio * 10) / 10,
      fat: Math.round(selected.fat * ratio * 10) / 10,
      amount: amt,
      unit: selected.unit,
    };
    addFood(mealType, food);
    router.back();
  };

  return (
    <View style={s.container}>
      <Text style={s.subtitle}>{MEAL_LABELS[mealType]}에 추가</Text>
      <TextInput
        style={s.searchInput}
        placeholder="식품명 검색..."
        placeholderTextColor={Colors.textMuted}
        value={search}
        onChangeText={setSearch}
      />
      <ScrollView style={s.list} keyboardShouldPersistTaps="handled">
        {filtered.map(food => (
          <TouchableOpacity
            key={food.name}
            style={[s.foodItem, selected?.name === food.name && s.foodItemSelected]}
            onPress={() => setSelected(food)}
            activeOpacity={0.7}
          >
            <View style={s.foodItemLeft}>
              <Text style={s.foodName}>{food.name}</Text>
              <Text style={s.foodMacro}>단백질 {food.protein}g · 탄수 {food.carbs}g · 지방 {food.fat}g</Text>
            </View>
            <Text style={s.foodCal}>{food.calories}kcal</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {selected && (
        <View style={s.amountSection}>
          <Text style={s.amountLabel}>{selected.name} 양 입력 ({selected.unit})</Text>
          <TextInput
            style={s.amountInput}
            value={amount}
            onChangeText={setAmount}
            keyboardType="numeric"
            selectTextOnFocus
          />
          <Text style={s.preview}>
            {Math.round(selected.calories * parseFloat(amount || '0') / 100)} kcal
          </Text>
        </View>
      )}
      <TouchableOpacity style={s.addBtn} onPress={handleAdd} activeOpacity={0.8}>
        <Text style={s.addBtnText}>추가하기</Text>
      </TouchableOpacity>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 20 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 16 },
  searchInput: { backgroundColor: Colors.surface, borderRadius: 12, padding: 14, color: Colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: Colors.border, marginBottom: 12 },
  list: { flex: 1 },
  foodItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  foodItemSelected: { borderColor: Colors.diet, backgroundColor: Colors.diet + '10' },
  foodItemLeft: { flex: 1 },
  foodName: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  foodMacro: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  foodCal: { fontSize: 14, fontWeight: '600', color: Colors.diet },
  amountSection: { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, marginVertical: 12, borderWidth: 1, borderColor: Colors.border },
  amountLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 8 },
  amountInput: { backgroundColor: Colors.surfaceAlt, borderRadius: 8, padding: 12, color: Colors.textPrimary, fontSize: 18, fontWeight: '600', textAlign: 'center', borderWidth: 1, borderColor: Colors.border },
  preview: { fontSize: 13, color: Colors.diet, textAlign: 'center', marginTop: 8, fontWeight: '600' },
  addBtn: { backgroundColor: Colors.diet, borderRadius: 14, padding: 16, alignItems: 'center' },
  addBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});