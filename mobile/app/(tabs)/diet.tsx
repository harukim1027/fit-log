import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  PanResponder,
  Animated,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Header, Card } from "../../components/ui";
import { useEffect, useState, useRef, useCallback } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useDietStore } from "../../store/dietStore";
import { Colors, MEAL_LABELS } from "../../constants";
import { MealType } from "../../types/diet";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_EMOJI: Record<MealType, string> = {
  breakfast: "🌅",
  lunch: "☀️",
  dinner: "🌙",
  snack: "🍎",
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.2;

const dateStr = (d: Date) => d.toISOString().split("T")[0];
const formatDate = (d: Date) =>
  d.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
const isToday = (d: Date) => dateStr(d) === dateStr(new Date());

const SHADOW = {
  shadowColor: "#B4A0D8",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.09,
  shadowRadius: 12,
  elevation: 3,
};

export default function DietScreen() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const {
    getTodayDiet,
    getTotalCalories,
    targetCalories,
    removeFood,
    fetchDiet,
    isLoading,
    summary,
    dailyDiets,
  } = useDietStore();

  const slideAnim = useRef(new Animated.Value(0)).current;
  const isAnimating = useRef(false);
  const currentDateRef = useRef(currentDate);

  useEffect(() => { currentDateRef.current = currentDate; }, [currentDate]);
  useEffect(() => { fetchDiet(dateStr(currentDate)); }, [currentDate]);

  const navigate = useCallback((direction: "prev" | "next") => {
    if (isAnimating.current) return;
    if (direction === "next" && isToday(currentDateRef.current)) return;
    isAnimating.current = true;
    const enterFrom = direction === "next" ? SCREEN_WIDTH : -SCREEN_WIDTH;
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + (direction === "next" ? 1 : -1));
      return d;
    });
    slideAnim.setValue(enterFrom);
    setTimeout(() => {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }).start(() => { isAnimating.current = false; });
    }, 50);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        !isAnimating.current && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 10,
      onPanResponderRelease: (_, { dx }) => {
        if (dx < -SWIPE_THRESHOLD) navigateRef.current("next");
        else if (dx > SWIPE_THRESHOLD) navigateRef.current("prev");
      },
    })
  ).current;

  const diet = dailyDiets.find((d) => d.date === dateStr(currentDate));
  const total =
    diet?.meals.reduce(
      (s, m) => s + m.foods.reduce((f, food) => f + food.calories, 0),
      0
    ) ?? 0;
  const progress = Math.min(total / targetCalories, 1);

  const protein = summary?.protein ?? 0;
  const carbs = summary?.carbs ?? 0;
  const fat = summary?.fat ?? 0;
  const totalMacro = protein + carbs + fat || 1;

  const goBack = () => navigate("prev");
  const goForward = () => navigate("next");

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#B4A7E8" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Header title="식단 🥗" />
      <View className="flex-1 overflow-hidden" {...panResponder.panHandlers}>
        <Animated.View style={{ flex: 1, transform: [{ translateX: slideAnim }] }}>
          <ScrollView
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

            {/* 날짜 네비게이션 */}
            <View className="flex-row items-center justify-between mb-5">
              <TouchableOpacity
                className="w-[38px] h-[38px] rounded-xl bg-surface items-center justify-center"
                style={SHADOW}
                onPress={goBack}>
                <Ionicons name="chevron-back" size={20} color="#8B80A8" />
              </TouchableOpacity>
              <View className="items-center gap-1">
                <Text className="text-[17px] font-bold text-text-primary">
                  {formatDate(currentDate)}
                </Text>
                {isToday(currentDate) && (
                  <View className="w-1.5 h-1.5 rounded-full bg-primary" />
                )}
              </View>
              <TouchableOpacity
                className={[
                  "w-[38px] h-[38px] rounded-xl bg-surface items-center justify-center",
                  isToday(currentDate) ? "opacity-30" : "",
                ].join(" ")}
                style={SHADOW}
                onPress={goForward}>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={isToday(currentDate) ? "#C4B8D4" : "#8B80A8"}
                />
              </TouchableOpacity>
            </View>

            {/* 칼로리 요약 */}
            <Card className="mb-4">
              <View className="flex-row justify-between mb-3">
                <Text className="text-[22px] font-bold text-text-primary">{total} kcal</Text>
                <Text className="text-sm text-text-secondary self-end">목표 {targetCalories} kcal</Text>
              </View>
              <View className="h-3 bg-surface-alt rounded-full overflow-hidden mb-2">
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${progress * 100}%` as `${number}%`,
                    backgroundColor: progress >= 1 ? '#F4ADAD' : '#A8DCC8',
                  }}
                />
              </View>
              <Text className="text-xs text-text-secondary text-right">
                {Math.round(progress * 100)}% 달성
              </Text>
            </Card>

            {/* 영양소 */}
            <Card className="mb-4">
              <Text className="text-[15px] font-bold text-text-secondary mb-3">영양소</Text>
              <View className="flex-row h-3 rounded-full overflow-hidden mb-3">
                <View style={{ flex: carbs / totalMacro, backgroundColor: "#FFCBA4" }} />
                <View style={{ flex: protein / totalMacro, backgroundColor: "#B4A7E8" }} />
                <View style={{ flex: fat / totalMacro, backgroundColor: "#F4B8A8" }} />
              </View>
              <View className="flex-row justify-between gap-2">
                <MacroChip label="탄수화물" value={carbs + "g"} color="#FFCBA4" />
                <MacroChip label="단백질" value={protein + "g"} color="#B4A7E8" />
                <MacroChip label="지방" value={fat + "g"} color="#F4B8A8" />
              </View>
            </Card>

            {/* 식사별 카드 */}
            {MEAL_TYPES.map((type) => {
              const meal = diet?.meals.find((m) => m.type === type);
              const mealCal = meal?.foods.reduce((s, f) => s + f.calories, 0) ?? 0;
              return (
                <Card key={type} className="mb-3 p-4">
                  <View className="flex-row justify-between items-center mb-3">
                    <View className="flex-row items-center gap-2">
                      <Text className="text-[20px]">{MEAL_EMOJI[type]}</Text>
                      <Text className="text-base font-bold text-text-primary">
                        {MEAL_LABELS[type]}
                      </Text>
                      <Text className="text-sm text-text-secondary">{mealCal} kcal</Text>
                    </View>
                    {isToday(currentDate) && (
                      <TouchableOpacity
                        className="w-[34px] h-[34px] rounded-xl bg-diet/30 items-center justify-center"
                        onPress={() =>
                          router.push({
                            pathname: "/modal/add-food",
                            params: { mealType: type },
                          })
                        }>
                        <Ionicons name="add" size={20} color="#A8DCC8" />
                      </TouchableOpacity>
                    )}
                  </View>
                  {!meal || meal.foods.length === 0 ? (
                    <View className="items-center py-2 gap-1">
                      <Text className="text-[32px]">🍽️</Text>
                      <Text className="text-sm text-text-muted text-center">추가된 식품이 없어요</Text>
                    </View>
                  ) : (
                    meal.foods.map((food) => (
                      <View
                        key={food.id}
                        className="flex-row justify-between items-center py-2 mt-1 bg-surface-alt rounded-xl px-3 mb-1">
                        <View className="flex-1">
                          <Text className="text-sm font-semibold text-text-primary">{food.name}</Text>
                          <Text className="text-[11px] text-text-secondary mt-0.5">
                            {food.amount}{food.unit} · {food.calories}kcal · 탄 {food.carbs}g
                            · 단 {food.protein}g · 지 {food.fat}g
                          </Text>
                        </View>
                        {isToday(currentDate) && (
                          <TouchableOpacity
                            onPress={() =>
                              removeFood(type, food.id, dateStr(currentDate))
                            }>
                            <Ionicons name="trash-outline" size={16} color="#C4B8D4" />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))
                  )}
                </Card>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>
    </View>
  );
}

function MacroChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View
      className="items-center flex-1 rounded-2xl py-2"
      style={{ backgroundColor: color + "20" }}>
      <View className="w-2 h-2 rounded-full mb-1" style={{ backgroundColor: color }} />
      <Text className="text-[10px] text-text-secondary mb-0.5">{label}</Text>
      <Text className="text-sm font-bold" style={{ color }}>{value}</Text>
    </View>
  );
}
