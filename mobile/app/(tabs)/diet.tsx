import React, { useState as useLocalState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  PanResponder,
  Animated,
  Dimensions,
} from "react-native";
import { useRouter } from "expo-router";
import { Header } from "../../components/ui";
import { useEffect, useState, useRef, useCallback } from "react";
import { useDietStore } from "../../store/dietStore";
import { MEAL_LABELS } from "../../constants";
import { MealType } from "../../types/diet";
import { Icon, MealSun, MealLunch, MealMoon, MealSnack, SaladIcon } from "../../components/AppIcons";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

const MEAL_ICONS: Record<MealType, React.ReactNode> = {
  breakfast: <MealSun size={18} />,
  lunch:     <MealLunch size={18} />,
  dinner:    <MealMoon size={18} />,
  snack:     <MealSnack size={18} />,
};
const MEAL_BG: Record<MealType, string> = {
  breakfast: '#FFF6D9',
  lunch:     '#FFF1E3',
  dinner:    '#EAF4FF',
  snack:     '#FFE8EF',
};

const SCREEN_WIDTH = Dimensions.get("window").width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.2;

const dateStr = (d: Date) => d.toISOString().split("T")[0];
const formatDate = (d: Date) =>
  d.toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });
const isToday = (d: Date) => dateStr(d) === dateStr(new Date());

const SHADOW = {
  shadowColor: "#4EBFA0",
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.20,
  shadowRadius: 24,
  elevation: 4,
};
const SHADOW_SM = {
  shadowColor: "#4EBFA0",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.16,
  shadowRadius: 14,
  elevation: 3,
};

export default function DietScreen() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = useState(new Date());
  const {
    getTodayDiet,
    getTotalCalories,
    targetCalories,
    targetCarbsRatio,
    targetProteinRatio,
    targetFatRatio,
    removeFood,
    fetchDiet,
    isLoading,
    summary,
    dailyDiets,
  } = useDietStore();

  const [snackCardNames, setSnackCardNames] = useLocalState<Record<string, string>>({});
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
        <ActivityIndicator size="large" color="#2E9E83" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Header title="식단" />
      <View className="flex-1 overflow-hidden" {...panResponder.panHandlers}>
        <Animated.View style={{ flex: 1, transform: [{ translateX: slideAnim }] }}>
          <ScrollView
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

            {/* 날짜 네비게이션 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <TouchableOpacity
                style={[{ width: 38, height: 38, borderRadius: 999, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }, SHADOW_SM]}
                onPress={goBack}>
                <Icon name="chevronLeft" size={20} color="#7E9A90" />
              </TouchableOpacity>
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Text style={{ fontSize: 16, fontWeight: '900', color: '#34514A' }}>{formatDate(currentDate)}</Text>
                {isToday(currentDate) && (
                  <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: '#6FD3B6' }} />
                )}
              </View>
              <TouchableOpacity
                style={[{ width: 38, height: 38, borderRadius: 999, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', opacity: isToday(currentDate) ? 0.3 : 1 }, SHADOW_SM]}
                onPress={goForward}>
                <Icon name="chevronRight" size={20} color={isToday(currentDate) ? "#B4CFC5" : "#7E9A90"} />
              </TouchableOpacity>
            </View>

            {/* 칼로리 요약 */}
            <View style={[{ backgroundColor: '#fff', borderRadius: 30, padding: 18, marginBottom: 14 }, SHADOW]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 12 }}>
                <Text style={{ fontSize: 22, fontWeight: '900', color: '#34514A' }}>{total} kcal</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#7E9A90' }}>목표 {targetCalories} kcal</Text>
              </View>
              <View style={{ height: 12, borderRadius: 999, backgroundColor: '#E7F7F0', overflow: 'hidden', marginBottom: 6 }}>
                <View style={{ height: '100%', borderRadius: 999, width: `${progress * 100}%` as `${number}%`, backgroundColor: progress >= 1 ? '#FF8FA0' : '#6FD3B6' }} />
              </View>
              <Text style={{ fontSize: 12, fontWeight: '800', color: '#2E9E83', textAlign: 'right' }}>
                {Math.round(progress * 100)}% 달성 · {Math.max(targetCalories - total, 0)} 남음
              </Text>
            </View>

            {/* 영양소 */}
            <View style={[{ backgroundColor: '#fff', borderRadius: 30, padding: 18, marginBottom: 14 }, SHADOW]}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#7E9A90', marginBottom: 12 }}>영양소</Text>
              <View style={{ flexDirection: 'row', height: 12, borderRadius: 999, overflow: 'hidden', marginBottom: 12 }}>
                <View style={{ flex: carbs / totalMacro, backgroundColor: '#FFC078' }} />
                <View style={{ flex: protein / totalMacro, backgroundColor: '#6FD3B6' }} />
                <View style={{ flex: fat / totalMacro, backgroundColor: '#FF9DB0' }} />
              </View>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(() => {
                  const targetCarbsG = Math.round((targetCalories * targetCarbsRatio / 100) / 4);
                  const targetProteinG = Math.round((targetCalories * targetProteinRatio / 100) / 4);
                  const targetFatG = Math.round((targetCalories * targetFatRatio / 100) / 9);
                  return (
                    <>
                      <MacroChip label="탄수화물" value={carbs + "g"} target={targetCarbsG} color="#E6932F" bg="#FFC07820" />
                      <MacroChip label="단백질" value={protein + "g"} target={targetProteinG} color="#2E9E83" bg="#6FD3B620" />
                      <MacroChip label="지방" value={fat + "g"} target={targetFatG} color="#E76C86" bg="#FF9DB020" />
                    </>
                  );
                })()}
              </View>
            </View>

            {/* 식사별 카드 (아침/점심/저녁) */}
            {(['breakfast', 'lunch', 'dinner'] as const).map((type) => {
              const meal = diet?.meals.find((m) => m.type === type);
              const mealCal = meal?.foods.reduce((s, f) => s + f.calories, 0) ?? 0;
              return (
                <View key={type} style={[{ backgroundColor: '#fff', borderRadius: 30, padding: 16, marginBottom: 10 }, SHADOW]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 34, height: 34, borderRadius: 13, backgroundColor: MEAL_BG[type], alignItems: 'center', justifyContent: 'center' }}>
                        {MEAL_ICONS[type]}
                      </View>
                      <View>
                        <Text style={{ fontSize: 15, fontWeight: '900', color: '#34514A' }}>{MEAL_LABELS[type]}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#7E9A90' }}>{mealCal} kcal</Text>
                      </View>
                    </View>
                    {isToday(currentDate) && (
                      <TouchableOpacity
                        style={{ width: 32, height: 32, borderRadius: 12, backgroundColor: '#E7F7F0', alignItems: 'center', justifyContent: 'center' }}
                        onPress={() => router.push({ pathname: "/modal/add-food", params: { mealType: type } })}>
                        <Icon name="plus" size={18} color="#2E9E83" />
                      </TouchableOpacity>
                    )}
                  </View>
                  {!meal || meal.foods.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 10, gap: 4 }}>
                      <SaladIcon size={28} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#B4CFC5' }}>아직 기록이 없어요</Text>
                    </View>
                  ) : (
                    meal.foods.map((food) => (
                      <FoodRow key={food.id} food={food} mealType={type} date={dateStr(currentDate)} isToday={isToday(currentDate)} onRemove={removeFood} />
                    ))
                  )}
                </View>
              );
            })}

            {/* 간식 카드들 */}
            {(diet?.snackCards ?? [{ id: 'snack-default', name: '간식', foods: [] }]).map((card, cardIdx) => {
              const cardCal = card.foods.reduce((s, f) => s + f.calories, 0);
              const cardName = snackCardNames[card.id] ?? card.name;
              return (
                <View key={card.id} style={[{ backgroundColor: '#fff', borderRadius: 30, padding: 16, marginBottom: 10 }, SHADOW]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View style={{ width: 34, height: 34, borderRadius: 13, backgroundColor: MEAL_BG['snack'], alignItems: 'center', justifyContent: 'center' }}>
                        {MEAL_ICONS['snack']}
                      </View>
                      <View>
                        <Text style={{ fontSize: 15, fontWeight: '900', color: '#34514A' }}>{cardName}</Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#7E9A90' }}>{cardCal} kcal</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {cardIdx > 0 && (
                        <TouchableOpacity
                          style={{ width: 28, height: 28, borderRadius: 10, backgroundColor: '#FFE8EF', alignItems: 'center', justifyContent: 'center' }}
                          onPress={() => {
                            if (card.foods.length > 0) {
                              Alert.alert('간식 카드 삭제', '이 간식 카드의 모든 기록이 삭제돼요. 계속할까요?', [
                                { text: '취소', style: 'cancel' },
                                {
                                  text: '삭제', style: 'destructive',
                                  onPress: () => card.foods.forEach(f => removeFood('snack', f.id, dateStr(currentDate))),
                                },
                              ]);
                            }
                          }}>
                          <Icon name="close" size={13} color="#E76C86" />
                        </TouchableOpacity>
                      )}
                      {isToday(currentDate) && (
                        <TouchableOpacity
                          style={{ width: 32, height: 32, borderRadius: 12, backgroundColor: '#E7F7F0', alignItems: 'center', justifyContent: 'center' }}
                          onPress={() => router.push({ pathname: "/modal/add-food", params: { mealType: 'snack', snackCardId: card.id } })}>
                          <Icon name="plus" size={18} color="#2E9E83" />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                  {card.foods.length === 0 ? (
                    <View style={{ alignItems: 'center', paddingVertical: 10, gap: 4 }}>
                      <SaladIcon size={28} />
                      <Text style={{ fontSize: 12, fontWeight: '700', color: '#B4CFC5' }}>아직 기록이 없어요</Text>
                    </View>
                  ) : (
                    card.foods.map((food) => (
                      <FoodRow key={food.id} food={food} mealType="snack" date={dateStr(currentDate)} isToday={isToday(currentDate)} onRemove={removeFood} />
                    ))
                  )}
                </View>
              );
            })}

            {/* 간식 추가 + */}
            {isToday(currentDate) && (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 999, borderWidth: 1.5, borderColor: '#FFD3E0', marginBottom: 10 }}
                onPress={() => {
                  const newId = `snack-${Date.now()}`;
                  const cardCount = (diet?.snackCards.length ?? 1) + 1;
                  setSnackCardNames(prev => ({ ...prev, [newId]: `간식${cardCount}` }));
                  router.push({ pathname: "/modal/add-food", params: { mealType: 'snack', snackCardId: newId } });
                }}
                activeOpacity={0.8}>
                <MealSnack size={16} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#E76C86' }}>간식 추가 +</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </View>
  );
}

function FoodRow({ food, mealType, date, isToday, onRemove }: {
  food: any; mealType: string; date: string; isToday: boolean;
  onRemove: (type: any, id: string, date: string) => void;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#E7F7F0', borderRadius: 16, paddingHorizontal: 13, paddingVertical: 10, marginTop: 7 }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: '#34514A' }}>{food.name}</Text>
        <Text style={{ fontSize: 10.5, fontWeight: '600', color: '#7E9A90', marginTop: 2 }}>
          {food.amount}{food.unit} · 탄 {food.carbs}g · 단 {food.protein}g · 지 {food.fat}g
        </Text>
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={{ fontSize: 12, fontWeight: '900', color: '#2E9E83' }}>{food.calories}kcal</Text>
        {isToday && (
          <TouchableOpacity onPress={() => onRemove(mealType, food.id, date)}>
            <Icon name="trash" size={15} color="#B4CFC5" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function MacroChip({ label, value, target, color, bg }: { label: string; value: string; target?: number; color: string; bg: string }) {
  const numVal = parseFloat(value);
  const pct = target && target > 0 ? Math.min(100, Math.round((numVal / target) * 100)) : null;
  return (
    <View style={{ flex: 1, borderRadius: 16, paddingVertical: 9, paddingHorizontal: 8, alignItems: 'center', gap: 3, backgroundColor: bg }}>
      <View style={{ width: 7, height: 7, borderRadius: 999, backgroundColor: color }} />
      <Text style={{ fontSize: 10, color: '#7E9A90', fontWeight: '700' }}>{label}</Text>
      <Text style={{ fontSize: 13, fontWeight: '900', color }}>{value}</Text>
      {target != null && (
        <>
          <Text style={{ fontSize: 9, color, fontWeight: '700', opacity: 0.8 }}>/{target}g</Text>
          <View style={{ width: '100%', height: 4, backgroundColor: `${color}30`, borderRadius: 999, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${pct ?? 0}%` as `${number}%`, backgroundColor: color, borderRadius: 999 }} />
          </View>
          <Text style={{ fontSize: 9, color, fontWeight: '800' }}>{pct ?? 0}%</Text>
        </>
      )}
    </View>
  );
}
