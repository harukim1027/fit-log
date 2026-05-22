import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useDietStore } from '../../store/dietStore';
import { Colors, MEAL_LABELS } from '../../constants';
import { MealType, FoodItem } from '../../types/diet';
import apiClient from '../../lib/apiClient';

type Tab = 'search' | 'manual';

export default function AddFoodModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mealType: MealType }>();
  const mealType = params.mealType ?? 'breakfast';
  const { addFood } = useDietStore();

  const [tab, setTab] = useState<Tab>('search');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [amount, setAmount] = useState('100');
  const [loading, setLoading] = useState(false);

  const [manualName, setManualName] = useState('');
  const [manualCalories, setManualCalories] = useState('');
  const [manualProtein, setManualProtein] = useState('');
  const [manualCarbs, setManualCarbs] = useState('');
  const [manualFat, setManualFat] = useState('');
  const [manualAmount, setManualAmount] = useState('100');

  const handleSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    try {
      const res = await apiClient.get('/food/search', { params: { q: search } });
      setResults(res.data);
    } catch {
      Alert.alert('검색 실패', '잠시 후 다시 시도해주세요');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSearch = () => {
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
      unit: 'g',
    };
    addFood(mealType, food);
    router.back();
  };

  const handleAddManual = () => {
    if (!manualName.trim()) return Alert.alert('식품명을 입력해주세요');
    const cal = parseFloat(manualCalories);
    if (isNaN(cal) || cal < 0) return Alert.alert('올바른 칼로리를 입력해주세요');
    const food: FoodItem = {
      id: Date.now().toString(),
      name: manualName,
      calories: Math.round(cal),
      protein: parseFloat(manualProtein) || 0,
      carbs: parseFloat(manualCarbs) || 0,
      fat: parseFloat(manualFat) || 0,
      amount: parseFloat(manualAmount) || 100,
      unit: 'g',
    };
    addFood(mealType, food);
    router.back();
  };

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <Text style={s.subtitle}>{MEAL_LABELS[mealType]}에 추가</Text>

      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tab, tab === 'search' && s.tabActive]} onPress={() => setTab('search')}>
          <Text style={[s.tabText, tab === 'search' && s.tabTextActive]}>검색</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'manual' && s.tabActive]} onPress={() => setTab('manual')}>
          <Text style={[s.tabText, tab === 'manual' && s.tabTextActive]}>직접 입력</Text>
        </TouchableOpacity>
      </View>

      {tab === 'search' ? (
        <>
          <View style={s.searchRow}>
            <TextInput
              style={s.searchInput}
              placeholder="식품명 검색..."
              placeholderTextColor={Colors.textMuted}
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            <TouchableOpacity style={s.searchBtn} onPress={handleSearch}>
              {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.searchBtnText}>검색</Text>}
            </TouchableOpacity>
          </View>

          <ScrollView style={s.list} keyboardShouldPersistTaps="handled">
            {results.length === 0 && !loading && (
              <Text style={s.hintText}>식품명을 입력하고 검색해주세요{'
'}한글은 닭가슴살, 영어는 chicken으로 검색해보세요</Text>
            )}
            {results.map(food => (
              <TouchableOpacity
                key={food.id}
                style={[s.foodItem, selected?.id === food.id && s.foodItemSelected]}
                onPress={() => setSelected(food)}
                activeOpacity={0.7}
              >
                <View style={s.foodItemLeft}>
                  <Text style={s.foodName}>{food.name}</Text>
                  {food.brand ? <Text style={s.foodBrand}>{food.brand}</Text> : null}
                  <Text style={s.foodMacro}>단백질 {food.protein}g · 탄수 {food.carbs}g · 지방 {food.fat}g</Text>
                </View>
                <Text style={s.foodCal}>{food.calories}kcal</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {selected && (
            <View style={s.amountSection}>
              <Text style={s.amountLabel}>{selected.name} 양 입력 (g)</Text>
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

          <TouchableOpacity style={s.addBtn} onPress={handleAddSearch} activeOpacity={0.8}>
            <Text style={s.addBtnText}>추가하기</Text>
          </TouchableOpacity>
        </>
      ) : (
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={s.manualForm}>
            <ManualInput label="식품명 *" value={manualName} onChangeText={setManualName} placeholder="예: 삶은 계란" />
            <ManualInput label="칼로리 (kcal) *" value={manualCalories} onChangeText={setManualCalories} placeholder="0" keyboardType="numeric" />
            <View style={s.manualRow}>
              <View style={{ flex: 1 }}>
                <ManualInput label="탄수화물 (g)" value={manualCarbs} onChangeText={setManualCarbs} placeholder="0" keyboardType="numeric" />
              </View>
              <View style={{ width: 10 }} />
              <View style={{ flex: 1 }}>
                <ManualInput label="단백질 (g)" value={manualProtein} onChangeText={setManualProtein} placeholder="0" keyboardType="numeric" />
              </View>
              <View style={{ width: 10 }} />
              <View style={{ flex: 1 }}>
                <ManualInput label="지방 (g)" value={manualFat} onChangeText={setManualFat} placeholder="0" keyboardType="numeric" />
              </View>
            </View>
            <ManualInput label="양 (g)" value={manualAmount} onChangeText={setManualAmount} placeholder="100" keyboardType="numeric" />
          </View>
          <TouchableOpacity style={s.addBtn} onPress={handleAddManual} activeOpacity={0.8}>
            <Text style={s.addBtnText}>추가하기</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function ManualInput({ label, value, onChangeText, placeholder, keyboardType }: any) {
  return (
    <View style={mi.wrap}>
      <Text style={mi.label}>{label}</Text>
      <TextInput
        style={mi.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboardType || 'default'}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, padding: 20 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 16 },
  tabRow: { flexDirection: 'row', backgroundColor: Colors.surfaceAlt, borderRadius: 12, padding: 4, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: Colors.surface, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 14, fontWeight: '500', color: Colors.textMuted },
  tabTextActive: { color: Colors.textPrimary, fontWeight: '600' },
  searchRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  searchInput: { flex: 1, backgroundColor: Colors.surface, borderRadius: 12, padding: 14, color: Colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: Colors.border },
  searchBtn: { backgroundColor: Colors.diet, borderRadius: 12, paddingHorizontal: 16, justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  list: { flex: 1 },
  hintText: { textAlign: 'center', color: Colors.textMuted, marginTop: 32, fontSize: 13, lineHeight: 22 },
  foodItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  foodItemSelected: { borderColor: Colors.diet, backgroundColor: Colors.diet + '10' },
  foodItemLeft: { flex: 1 },
  foodName: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  foodBrand: { fontSize: 11, color: Colors.primary, marginTop: 1 },
  foodMacro: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  foodCal: { fontSize: 14, fontWeight: '600', color: Colors.diet },
  amountSection: { backgroundColor: Colors.surface, borderRadius: 12, padding: 16, marginVertical: 12, borderWidth: 1, borderColor: Colors.border },
  amountLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 8 },
  amountInput: { backgroundColor: Colors.surfaceAlt, borderRadius: 8, padding: 12, color: Colors.textPrimary, fontSize: 18, fontWeight: '600', textAlign: 'center', borderWidth: 1, borderColor: Colors.border },
  preview: { fontSize: 13, color: Colors.diet, textAlign: 'center', marginTop: 8, fontWeight: '600' },
  addBtn: { backgroundColor: Colors.diet, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 8 },
  addBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  manualForm: { gap: 12, marginBottom: 16 },
  manualRow: { flexDirection: 'row' },
});
const mi = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  input: { backgroundColor: Colors.surface, borderRadius: 10, padding: 12, color: Colors.textPrimary, fontSize: 15, borderWidth: 1, borderColor: Colors.border },
});
