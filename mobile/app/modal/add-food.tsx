import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Header, Card, Input, Button } from "../../components/ui";
import { Stepper } from "../../components/ui/Stepper";
import { useState, useEffect } from "react";
import { Icon, HeartIcon, BowlMascot, EmptyMascot } from "../../components/AppIcons";
import { useDietStore } from "../../store/dietStore";
import { useFavoriteStore } from "../../store/favoriteStore";
import { Colors, MEAL_LABELS } from "../../constants";
import { MealType, FoodItem } from "../../types/diet";
import apiClient from "../../lib/apiClient";

type Tab = "search" | "favorites" | "manual";

const TABS: { key: Tab; label: string }[] = [
  { key: "search", label: "검색" },
  { key: "favorites", label: "즐겨찾기" },
  { key: "manual", label: "직접 입력" },
];

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
      const res = await apiClient.get("/food/search", { params: { q: search } });
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

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["bottom"]}>
      <Header
        title="식품 추가"
        subtitle={MEAL_LABELS[mealType] + "에 추가"}
        showClose
        rightElement={
          <TouchableOpacity
            className="flex-row items-center gap-1 bg-primary/20 px-3 py-[7px] rounded-[20px]"
            onPress={() =>
              router.push({
                pathname: "/modal/barcode-scan",
                params: { mealType },
              } as any)
            }>
            <Icon name="barcode" size={20} color={Colors.primary} />
            <Text className="text-sm font-bold text-primary">바코드</Text>
          </TouchableOpacity>
        }
      />

      <View className="px-5 flex-1">
        {/* 탭 */}
        <View className="flex-row bg-surface-alt rounded-2xl p-1 mb-4">
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              className={[
                "flex-1 py-2 items-center rounded-xl",
                tab === t.key ? "bg-surface shadow-card" : "",
              ].join(" ")}
              onPress={() => setTab(t.key)}>
              <Text
                className={[
                  "text-sm",
                  tab === t.key
                    ? "text-text-primary font-bold"
                    : "text-text-muted font-medium",
                ].join(" ")}>
                {t.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {tab === "search" && (
          <>
            <View className="flex-row gap-2 mb-3">
              <Input
                placeholder="식품명 검색..."
                value={search}
                onChangeText={setSearch}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
                className="flex-1"
              />
              <TouchableOpacity
                className="bg-diet rounded-2xl px-[18px] justify-center mb-4"
                onPress={handleSearch}>
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text className="text-white font-bold text-sm">검색</Text>
                )}
              </TouchableOpacity>
            </View>
            <ScrollView
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              className="flex-1">
              {results.length === 0 && !loading && (
                <View className="items-center mt-10 gap-3">
                  <BowlMascot size={64} />
                  <Text className="text-center text-text-muted text-sm leading-6">
                    먹은 걸 검색해볼까요?{"\n"}한글은 닭가슴살, 영어는 chicken
                  </Text>
                </View>
              )}
              {results.map((food) => (
                <TouchableOpacity
                  key={food.id}
                  onPress={() => setSelected(food)}
                  activeOpacity={0.7}>
                  <Card
                    className={[
                      "flex-row justify-between items-center mb-2",
                      selected?.id === food.id ? "bg-diet/10" : "",
                    ].join(" ")}>
                    <View className="flex-1">
                      <Text className="text-[15px] font-semibold text-text-primary">
                        {food.name}
                      </Text>
                      {food.brand ? (
                        <Text className="text-xs text-primary mt-0.5">{food.brand}</Text>
                      ) : null}
                      <Text className="text-xs text-text-secondary mt-0.5">
                        단백질 {food.protein}g · 탄수 {food.carbs}g · 지방 {food.fat}g
                      </Text>
                    </View>
                    <View className="items-end gap-1">
                      <Text className="text-sm font-bold text-diet">
                        {food.calories}kcal
                      </Text>
                      <TouchableOpacity onPress={() => handleToggleFavorite(food)}>
                        <HeartIcon
                          filled={isFavorite(food.name)}
                          size={20}
                          color={isFavorite(food.name) ? Colors.secondary : Colors.textMuted}
                        />
                      </TouchableOpacity>
                    </View>
                  </Card>
                </TouchableOpacity>
              ))}
            </ScrollView>
            {selected && (
              <Card className="my-3">
                <Text className="text-sm text-text-secondary mb-2 font-semibold">
                  {selected.name} 양 입력
                </Text>
                <Stepper value={amount} onChange={setAmount} step={10} min={0} suffix="g" />
                <View className="flex-row gap-2 mt-3">
                  {[50, 100, 150, 200].map((g) => {
                    const on = amount === String(g);
                    return (
                      <TouchableOpacity
                        key={g}
                        className={[
                          "flex-1 rounded-full py-2 items-center border",
                          on ? "bg-diet/10 border-diet" : "bg-surface-alt border-transparent",
                        ].join(" ")}
                        onPress={() => setAmount(String(g))}>
                        <Text className={on ? "text-diet font-bold text-xs" : "text-text-secondary font-semibold text-xs"}>
                          {g}g
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text className="text-base text-diet text-center font-extrabold mt-3">
                  {Math.round(
                    (selected.calories * parseFloat(amount || "0")) / 100
                  )}{" "}kcal
                </Text>
              </Card>
            )}
            <Button
              title="추가하기"
              onPress={handleAddSearch}
              fullWidth
              className="mt-2 mb-2"
            />
          </>
        )}

        {tab === "favorites" && (
          <ScrollView
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            className="flex-1">
            {favorites.length === 0 ? (
              <View className="items-center mt-10 gap-3">
                <EmptyMascot size={64} />
                <Text className="text-center text-text-muted text-sm leading-6">
                  즐겨찾기한 식품이 아직 없어요{"\n"}검색 후 하트를 눌러 담아보세요
                </Text>
              </View>
            ) : (
              favorites.map((food) => (
                <Card key={food.id} className="flex-row justify-between items-center mb-2">
                  <View className="flex-1">
                    <Text className="text-[15px] font-semibold text-text-primary">
                      {food.foodName}
                    </Text>
                    <Text className="text-xs text-text-secondary mt-0.5">
                      단백질 {food.protein}g · 탄수 {food.carbs}g · 지방 {food.fat}g
                    </Text>
                  </View>
                  <View className="items-end gap-1">
                    <Text className="text-sm font-bold text-diet">
                      {food.calories}kcal
                    </Text>
                    <View className="flex-row gap-2 items-center">
                      <TouchableOpacity
                        className="bg-diet/30 rounded-xl px-3 py-1"
                        onPress={() =>
                          handleAddFood({ name: food.foodName, ...food }, food.amount)
                        }>
                        <Text className="text-xs text-diet font-bold">추가</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => removeFavorite(food.id)}>
                        <HeartIcon filled size={20} color={Colors.secondary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                </Card>
              ))
            )}
          </ScrollView>
        )}

        {tab === "manual" && (
          <ScrollView keyboardShouldPersistTaps="handled">
            <View className="gap-3 mb-4">
              <Input label="식품명 *" value={manualName} onChangeText={setManualName} placeholder="예: 삶은 계란" />
              <Input
                label="칼로리 (kcal) *"
                value={manualCalories}
                onChangeText={setManualCalories}
                placeholder="0"
                keyboardType="numeric"
              />
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Input
                    label="탄수화물 (g)"
                    value={manualCarbs}
                    onChangeText={setManualCarbs}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
                <View className="flex-1">
                  <Input
                    label="단백질 (g)"
                    value={manualProtein}
                    onChangeText={setManualProtein}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
                <View className="flex-1">
                  <Input
                    label="지방 (g)"
                    value={manualFat}
                    onChangeText={setManualFat}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
              </View>
              <Input
                label="양 (g)"
                value={manualAmount}
                onChangeText={setManualAmount}
                placeholder="100"
                keyboardType="numeric"
              />
            </View>
            <Button title="추가하기" onPress={handleAddManual} fullWidth className="mb-2" />
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}
