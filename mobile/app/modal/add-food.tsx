import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Header } from "../../components/ui";
import { useState, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useDietStore } from "../../store/dietStore";
import { useFavoriteStore } from "../../store/favoriteStore";
import { Colors, MEAL_LABELS } from "../../constants";
import { MealType, FoodItem } from "../../types/diet";
import apiClient from "../../lib/apiClient";

type Tab = "search" | "favorites" | "manual";

const CARD_SHADOW = {
  shadowColor: "#B4A0D8",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.09,
  shadowRadius: 10,
  elevation: 3,
};

export default function AddFoodModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mealType: MealType }>();
  const mealType = params.mealType ?? "breakfast";
  const { addFood } = useDietStore();
  const { favorites, fetchFavorites, addFavorite, removeFavorite, isFavorite } =
    useFavoriteStore();

  const [tab, setTab] = useState<Tab>("search");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [amount, setAmount] = useState("100");
  const [loading, setLoading] = useState(false);

  const [manualName, setManualName] = useState("");
  const [manualCalories, setManualCalories] = useState("");
  const [manualProtein, setManualProtein] = useState("");
  const [manualCarbs, setManualCarbs] = useState("");
  const [manualFat, setManualFat] = useState("");
  const [manualAmount, setManualAmount] = useState("100");

  useEffect(() => {
    fetchFavorites();
  }, []);

  const handleSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    try {
      const res = await apiClient.get("/food/search", {
        params: { q: search },
      });
      setResults(res.data);
    } catch {
      Alert.alert("검색 실패", "잠시 후 다시 시도해주세요");
    } finally {
      setLoading(false);
    }
  };

  const handleAddFood = (food: any, amt: number) => {
    const ratio = amt / 100;
    const item: FoodItem = {
      id: Date.now().toString(),
      name: food.name || food.foodName,
      calories: Math.round(food.calories * ratio),
      protein: Math.round(food.protein * ratio * 10) / 10,
      carbs: Math.round(food.carbs * ratio * 10) / 10,
      fat: Math.round(food.fat * ratio * 10) / 10,
      amount: amt,
      unit: "g",
    };
    addFood(mealType, item);
    router.back();
  };

  const handleAddSearch = () => {
    if (!selected) return Alert.alert("식품을 선택해주세요");
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) return Alert.alert("올바른 양을 입력해주세요");
    handleAddFood(selected, amt);
  };

  const handleToggleFavorite = async (food: any) => {
    if (isFavorite(food.name || food.foodName)) {
      const fav = favorites.find(
        (f) => f.foodName === (food.name || food.foodName)
      );
      if (fav) await removeFavorite(fav.id);
    } else {
      await addFavorite({
        foodName: food.name || food.foodName,
        calories: food.calories,
        protein: food.protein,
        carbs: food.carbs,
        fat: food.fat,
        amount: 100,
        unit: "g",
      });
    }
  };

  const handleAddManual = () => {
    if (!manualName.trim()) return Alert.alert("식품명을 입력해주세요");
    const cal = parseFloat(manualCalories);
    if (isNaN(cal) || cal < 0)
      return Alert.alert("올바른 칼로리를 입력해주세요");
    const food: FoodItem = {
      id: Date.now().toString(),
      name: manualName,
      calories: Math.round(cal),
      protein: parseFloat(manualProtein) || 0,
      carbs: parseFloat(manualCarbs) || 0,
      fat: parseFloat(manualFat) || 0,
      amount: parseFloat(manualAmount) || 100,
      unit: "g",
    };
    addFood(mealType, food);
    router.back();
  };

  const TABS: { key: Tab; label: string }[] = [
    { key: "search", label: "검색" },
    { key: "favorites", label: "즐겨찾기" },
    { key: "manual", label: "직접 입력" },
  ];

  return (
    <SafeAreaView style={s.container} edges={["bottom"]}>
      <Header
        title="식품 추가"
        subtitle={MEAL_LABELS[mealType] + "에 추가"}
        showClose
        rightElement={
          <TouchableOpacity
            style={s.barcodeBtn}
            onPress={() =>
              router.push({
                pathname: "/modal/barcode-scan",
                params: { mealType },
              } as any)
            }>
            <Ionicons name="barcode-outline" size={20} color={Colors.primary} />
            <Text style={s.barcodeBtnText}>바코드</Text>
          </TouchableOpacity>
        }
      />

      <View style={s.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[s.tab, tab === t.key && s.tabActive]}
            onPress={() => setTab(t.key)}>
            <Text style={[s.tabText, tab === t.key && s.tabTextActive]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "search" && (
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
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={s.searchBtnText}>검색</Text>
              )}
            </TouchableOpacity>
          </View>
          <ScrollView
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            style={s.list}>
            {results.length === 0 && !loading && (
              <View style={s.hintContainer}>
                <Text style={s.hintEmoji}>🔍</Text>
                <Text style={s.hintText}>
                  식품명을 입력하고 검색해주세요{"\n"}한글은 닭가슴살, 영어는
                  chicken
                </Text>
              </View>
            )}
            {results.map((food) => (
              <TouchableOpacity
                key={food.id}
                style={[
                  s.foodItem,
                  selected?.id === food.id && s.foodItemSelected,
                ]}
                onPress={() => setSelected(food)}
                activeOpacity={0.7}>
                <View style={s.foodItemLeft}>
                  <Text style={s.foodName}>{food.name}</Text>
                  {food.brand ? (
                    <Text style={s.foodBrand}>{food.brand}</Text>
                  ) : null}
                  <Text style={s.foodMacro}>
                    단백질 {food.protein}g · 탄수 {food.carbs}g · 지방{" "}
                    {food.fat}g
                  </Text>
                </View>
                <View style={s.foodRight}>
                  <Text style={s.foodCal}>{food.calories}kcal</Text>
                  <TouchableOpacity onPress={() => handleToggleFavorite(food)}>
                    <Ionicons
                      name={isFavorite(food.name) ? "heart" : "heart-outline"}
                      size={20}
                      color={
                        isFavorite(food.name)
                          ? Colors.secondary
                          : Colors.textMuted
                      }
                    />
                  </TouchableOpacity>
                </View>
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
                {Math.round(
                  (selected.calories * parseFloat(amount || "0")) / 100
                )}{" "}
                kcal
              </Text>
            </View>
          )}
          <TouchableOpacity
            style={s.addBtn}
            onPress={handleAddSearch}
            activeOpacity={0.8}>
            <Text style={s.addBtnText}>추가하기</Text>
          </TouchableOpacity>
        </>
      )}

      {tab === "favorites" && (
        <>
          <ScrollView
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            style={s.list}>
            {favorites.length === 0 ? (
              <View style={s.hintContainer}>
                <Text style={s.hintEmoji}>🤍</Text>
                <Text style={s.hintText}>
                  즐겨찾기한 식품이 없어요{"\n"}검색 후 하트를 눌러 추가해보세요
                </Text>
              </View>
            ) : (
              favorites.map((food) => (
                <View key={food.id} style={s.foodItem}>
                  <View style={s.foodItemLeft}>
                    <Text style={s.foodName}>{food.foodName}</Text>
                    <Text style={s.foodMacro}>
                      단백질 {food.protein}g · 탄수 {food.carbs}g · 지방{" "}
                      {food.fat}g
                    </Text>
                  </View>
                  <View style={s.foodRight}>
                    <Text style={s.foodCal}>{food.calories}kcal</Text>
                    <View style={s.favBtns}>
                      <TouchableOpacity
                        style={s.favAddBtn}
                        onPress={() =>
                          handleAddFood(
                            { name: food.foodName, ...food },
                            food.amount
                          )
                        }>
                        <Text style={s.favAddBtnText}>추가</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removeFavorite(food.id)}>
                        <Ionicons
                          name="heart"
                          size={20}
                          color={Colors.secondary}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </>
      )}

      {tab === "manual" && (
        <ScrollView keyboardShouldPersistTaps="handled">
          <View style={s.manualForm}>
            <ManualInput
              label="식품명 *"
              value={manualName}
              onChangeText={setManualName}
              placeholder="예: 삶은 계란"
            />
            <ManualInput
              label="칼로리 (kcal) *"
              value={manualCalories}
              onChangeText={setManualCalories}
              placeholder="0"
              keyboardType="numeric"
            />
            <View style={s.manualRow}>
              <View style={{ flex: 1 }}>
                <ManualInput
                  label="탄수화물 (g)"
                  value={manualCarbs}
                  onChangeText={setManualCarbs}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
              <View style={{ width: 10 }} />
              <View style={{ flex: 1 }}>
                <ManualInput
                  label="단백질 (g)"
                  value={manualProtein}
                  onChangeText={setManualProtein}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
              <View style={{ width: 10 }} />
              <View style={{ flex: 1 }}>
                <ManualInput
                  label="지방 (g)"
                  value={manualFat}
                  onChangeText={setManualFat}
                  placeholder="0"
                  keyboardType="numeric"
                />
              </View>
            </View>
            <ManualInput
              label="양 (g)"
              value={manualAmount}
              onChangeText={setManualAmount}
              placeholder="100"
              keyboardType="numeric"
            />
          </View>
          <TouchableOpacity
            style={s.addBtn}
            onPress={handleAddManual}
            activeOpacity={0.8}>
            <Text style={s.addBtnText}>추가하기</Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function ManualInput({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
}: any) {
  return (
    <View style={mi.wrap}>
      <Text style={mi.label}>{label}</Text>
      <TextInput
        style={mi.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        keyboardType={keyboardType || "default"}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background, paddingHorizontal: 20 },
  barcodeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary + "20",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  barcodeBtnText: { fontSize: 13, fontWeight: "700", color: Colors.primary },
  tabRow: {
    flexDirection: "row",
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 16,
    padding: 4,
    marginBottom: 16,
  },
  tab: { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: 14 },
  tabActive: { backgroundColor: Colors.surface, ...CARD_SHADOW },
  tabText: { fontSize: 13, fontWeight: "500", color: Colors.textMuted },
  tabTextActive: { color: Colors.textPrimary, fontWeight: "700" },
  searchRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  searchInput: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    color: Colors.textPrimary,
    fontSize: 15,
    ...CARD_SHADOW,
  },
  searchBtn: {
    backgroundColor: Colors.diet,
    borderRadius: 16,
    paddingHorizontal: 18,
    justifyContent: "center",
  },
  searchBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  list: { flex: 1 },
  hintContainer: { alignItems: "center", marginTop: 40, gap: 10 },
  hintEmoji: { fontSize: 48 },
  hintText: {
    textAlign: "center",
    color: Colors.textMuted,
    fontSize: 13,
    lineHeight: 22,
  },
  foodItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    ...CARD_SHADOW,
  },
  foodItemSelected: { backgroundColor: Colors.diet + "18" },
  foodItemLeft: { flex: 1 },
  foodName: { fontSize: 15, fontWeight: "600", color: Colors.textPrimary },
  foodBrand: { fontSize: 11, color: Colors.primary, marginTop: 1 },
  foodMacro: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  foodRight: { alignItems: "flex-end", gap: 6 },
  foodCal: { fontSize: 14, fontWeight: "700", color: Colors.diet },
  favBtns: { flexDirection: "row", gap: 8, alignItems: "center" },
  favAddBtn: {
    backgroundColor: Colors.diet + "28",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  favAddBtnText: { fontSize: 12, color: Colors.diet, fontWeight: "700" },
  amountSection: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    marginVertical: 12,
    ...CARD_SHADOW,
  },
  amountLabel: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
    fontWeight: "600",
  },
  amountInput: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    padding: 12,
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  preview: {
    fontSize: 14,
    color: Colors.diet,
    textAlign: "center",
    marginTop: 8,
    fontWeight: "700",
  },
  addBtn: {
    backgroundColor: Colors.diet,
    borderRadius: 24,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  addBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  manualForm: { gap: 12, marginBottom: 16 },
  manualRow: { flexDirection: "row" },
});
const mi = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 12,
    color: Colors.textPrimary,
    fontSize: 15,
    ...CARD_SHADOW,
  },
});
