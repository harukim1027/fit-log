import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  PanResponder,
  Animated,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
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
  d.toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
const isToday = (d: Date) => dateStr(d) === dateStr(new Date());

const CARD_SHADOW = {
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

  useEffect(() => {
    currentDateRef.current = currentDate;
  }, [currentDate]);
  useEffect(() => {
    fetchDiet(dateStr(currentDate));
  }, [currentDate]);

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
      }).start(() => {
        isAnimating.current = false;
      });
    }, 50);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, { dx, dy }) =>
        !isAnimating.current &&
        Math.abs(dx) > Math.abs(dy) &&
        Math.abs(dx) > 10,
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
      <SafeAreaView
        style={[
          s.container,
          { alignItems: "center", justifyContent: "center" },
        ]}
        edges={["top"]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.swipeWrapper} {...panResponder.panHandlers}>
        <Animated.View
          style={{ flex: 1, transform: [{ translateX: slideAnim }] }}>
          <ScrollView
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={s.content}>
            <View style={s.dateNav}>
              <TouchableOpacity style={s.navBtn} onPress={goBack}>
                <Ionicons
                  name="chevron-back"
                  size={20}
                  color={Colors.textSecondary}
                />
              </TouchableOpacity>
              <View style={s.dateCenter}>
                <Text style={s.dateText}>{formatDate(currentDate)}</Text>
                {isToday(currentDate) && <View style={s.todayDot} />}
              </View>
              <TouchableOpacity
                style={[s.navBtn, isToday(currentDate) && s.navBtnDisabled]}
                onPress={goForward}>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={
                    isToday(currentDate)
                      ? Colors.textMuted
                      : Colors.textSecondary
                  }
                />
              </TouchableOpacity>
            </View>

            <View style={s.card}>
              <View style={s.progressHeader}>
                <Text style={s.progressText}>{total} kcal</Text>
                <Text style={s.progressSub}>목표 {targetCalories} kcal</Text>
              </View>
              <View style={s.progressBg}>
                <View
                  style={[
                    s.progressFill,
                    {
                      width: `${progress * 100}%` as `${number}%`,
                      backgroundColor:
                        progress >= 1 ? Colors.danger : Colors.diet,
                    },
                  ]}
                />
              </View>
              <Text style={s.progressPct}>
                {Math.round(progress * 100)}% 달성
              </Text>
            </View>

            <View style={s.card}>
              <Text style={s.cardTitle}>영양소</Text>
              <View style={s.macroBarBg}>
                <View
                  style={[
                    s.macroBarSegment,
                    { flex: carbs / totalMacro, backgroundColor: "#FFCBA4" },
                  ]}
                />
                <View
                  style={[
                    s.macroBarSegment,
                    { flex: protein / totalMacro, backgroundColor: "#B4A7E8" },
                  ]}
                />
                <View
                  style={[
                    s.macroBarSegment,
                    { flex: fat / totalMacro, backgroundColor: "#F4B8A8" },
                  ]}
                />
              </View>
              <View style={s.macroRow}>
                <MacroChip
                  label="탄수화물"
                  value={carbs + "g"}
                  color="#FFCBA4"
                />
                <MacroChip
                  label="단백질"
                  value={protein + "g"}
                  color="#B4A7E8"
                />
                <MacroChip label="지방" value={fat + "g"} color="#F4B8A8" />
              </View>
            </View>

            {MEAL_TYPES.map((type) => {
              const meal = diet?.meals.find((m) => m.type === type);
              const mealCal =
                meal?.foods.reduce((s, f) => s + f.calories, 0) ?? 0;
              return (
                <View key={type} style={s.mealCard}>
                  <View style={s.mealHeader}>
                    <View style={s.mealTitleRow}>
                      <Text style={s.mealIcon}>{MEAL_EMOJI[type]}</Text>
                      <Text style={s.mealTitle}>{MEAL_LABELS[type]}</Text>
                      <Text style={s.mealCal}>{mealCal} kcal</Text>
                    </View>
                    {isToday(currentDate) && (
                      <TouchableOpacity
                        style={s.addBtn}
                        onPress={() =>
                          router.push({
                            pathname: "/modal/add-food",
                            params: { mealType: type },
                          })
                        }>
                        <Ionicons name="add" size={20} color={Colors.diet} />
                      </TouchableOpacity>
                    )}
                  </View>
                  {!meal || meal.foods.length === 0 ? (
                    <View style={s.emptyState}>
                      <Text style={s.emptyEmoji}>🍽️</Text>
                      <Text style={s.emptyText}>추가된 식품이 없어요</Text>
                    </View>
                  ) : (
                    meal.foods.map((food) => (
                      <View key={food.id} style={s.foodRow}>
                        <View style={s.foodInfo}>
                          <Text style={s.foodName}>{food.name}</Text>
                          <Text style={s.foodDetail}>
                            {food.amount}
                            {food.unit} · {food.calories}kcal · 탄 {food.carbs}g
                            · 단 {food.protein}g · 지 {food.fat}g
                          </Text>
                        </View>
                        {isToday(currentDate) && (
                          <TouchableOpacity
                            onPress={() =>
                              removeFood(type, food.id, dateStr(currentDate))
                            }>
                            <Ionicons
                              name="trash-outline"
                              size={16}
                              color={Colors.textMuted}
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    ))
                  )}
                </View>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

function MacroChip({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={[mc.wrap, { backgroundColor: color + "20" }]}>
      <View style={[mc.dot, { backgroundColor: color }]} />
      <Text style={mc.label}>{label}</Text>
      <Text style={[mc.value, { color }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  swipeWrapper: { flex: 1, overflow: "hidden" },
  content: { padding: 20, paddingBottom: 40 },
  dateNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  navBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...CARD_SHADOW,
  },
  navBtnDisabled: { opacity: 0.3 },
  dateCenter: { alignItems: "center", gap: 4 },
  dateText: { fontSize: 17, fontWeight: "700", color: Colors.textPrimary },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.primary,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    ...CARD_SHADOW,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: 14,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  progressText: { fontSize: 22, fontWeight: "700", color: Colors.textPrimary },
  progressSub: {
    fontSize: 14,
    color: Colors.textSecondary,
    alignSelf: "flex-end",
  },
  progressBg: {
    height: 12,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 6,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: { height: "100%", borderRadius: 6 },
  progressPct: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "right",
  },
  macroBarBg: {
    flexDirection: "row",
    height: 14,
    borderRadius: 7,
    overflow: "hidden",
    marginBottom: 14,
  },
  macroBarSegment: { height: "100%" },
  macroRow: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  mealCard: {
    backgroundColor: Colors.surface,
    borderRadius: 22,
    padding: 16,
    marginBottom: 12,
    ...CARD_SHADOW,
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  mealTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  mealIcon: { fontSize: 20 },
  mealTitle: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary },
  mealCal: { fontSize: 13, color: Colors.textSecondary },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: Colors.diet + "28",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: { alignItems: "center", paddingVertical: 10, gap: 4 },
  emptyEmoji: { fontSize: 32 },
  emptyText: { fontSize: 13, color: Colors.textMuted, textAlign: "center" },
  foodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 9,
    marginTop: 4,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  foodInfo: { flex: 1 },
  foodName: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  foodDetail: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
});
const mc = StyleSheet.create({
  wrap: {
    alignItems: "center",
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginBottom: 5 },
  label: { fontSize: 10, color: Colors.textSecondary, marginBottom: 3 },
  value: { fontSize: 13, fontWeight: "700" },
});
