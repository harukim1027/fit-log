import React from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { Header, Card } from "../../components/ui";
import { useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useDietStore } from "../../store/dietStore";
import { useWorkoutStore } from "../../store/workoutStore";
import { useAuthStore } from "../../store/authStore";
import CalorieRing from "../../components/CalorieRing";
import WaterTracker from "../../components/WaterTracker";
import { useWaterStore } from "../../store/waterStore";

const SHADOW = {
  shadowColor: "#B4A0D8",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.1,
  shadowRadius: 12,
  elevation: 3,
};

export default function HomeScreen() {
  const router = useRouter();
  const { getTotalCalories, targetCalories, getTodayDiet, fetchDiet, summary } =
    useDietStore();
  const { activeSession, getTodaySession, startSession, fetchSessions } =
    useWorkoutStore();
  const { user } = useAuthStore();
  const { fetchTotal } = useWaterStore();

  useEffect(() => {
    fetchDiet();
    fetchSessions();
    fetchTotal();
  }, []);

  getTodayDiet();
  const consumed = getTotalCalories();
  const target = targetCalories;
  const remaining = Math.max(target - consumed, 0);
  const todaySession = getTodaySession();
  const exerciseCount = todaySession?.exercises.length ?? 0;

  const protein = summary?.protein ?? 0;
  const carbs = summary?.carbs ?? 0;
  const fat = summary?.fat ?? 0;

  return (
    <View className="flex-1 bg-background">
      <Header
        title={user?.name ? `${user.name}님 안녕하세요 🌸` : "홈"}
        subtitle={new Date().toLocaleDateString("ko-KR", {
          month: "long",
          day: "numeric",
          weekday: "short",
        })}
        rightElement={
          <TouchableOpacity
            className="w-[42px] h-[42px] rounded-xl bg-surface items-center justify-center"
            style={SHADOW}
            onPress={() => router.push("/modal/set-target" as any)}>
            <Ionicons name="settings-outline" size={20} color="#8B80A8" />
          </TouchableOpacity>
        }
      />
      <ScrollView
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

        <Card className="mb-4">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-[15px] font-bold text-text-secondary">오늘의 칼로리</Text>
            <TouchableOpacity onPress={() => router.push("/modal/set-target" as any)}>
              <Text className="text-sm text-primary font-semibold">목표 수정</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center justify-between mb-4">
            <CalorieRing consumed={consumed} target={target} size={160} />
            <View className="flex-1 pl-5 gap-3">
              <InfoRow label="섭취" value={consumed + " kcal"} color="#A8DCC8" />
              <InfoRow label="목표" value={target + " kcal"} color="#B4A7E8" />
              <InfoRow
                label="잔여"
                value={remaining + " kcal"}
                color={remaining === 0 ? "#F4ADAD" : "#8B80A8"}
              />
            </View>
          </View>

          <View className="flex-row justify-between gap-2 pt-4">
            <MacroChip label="탄수화물" value={carbs + "g"} color="#FFCBA4" />
            <MacroChip label="단백질" value={protein + "g"} color="#B4A7E8" />
            <MacroChip label="지방" value={fat + "g"} color="#F4B8A8" />
          </View>
        </Card>

        <Card className="mb-4">
          <Text className="text-[15px] font-bold text-text-secondary mb-3">오늘의 운동</Text>
          {todaySession ? (
            <>
              <View className="flex-row items-center gap-3">
                <View className="w-9 h-9 rounded-xl items-center justify-center bg-success/30">
                  <Ionicons name="checkmark" size={20} color="#A8DCC8" />
                </View>
                <Text className="text-[15px] text-text-primary font-semibold">
                  {exerciseCount}가지 운동 완료 🎉
                </Text>
              </View>
              {!!todaySession.caloriesBurned && (
                <View className="flex-row items-center gap-3 mt-2">
                  <View className="w-9 h-9 rounded-xl items-center justify-center bg-danger/20">
                    <Ionicons name="flame" size={20} color="#F4ADAD" />
                  </View>
                  <Text className="text-[15px] text-danger font-semibold">
                    {todaySession.caloriesBurned} kcal 소모
                  </Text>
                </View>
              )}
            </>
          ) : activeSession ? (
            <View className="flex-row items-center gap-3">
              <View className="w-9 h-9 rounded-xl items-center justify-center bg-warning/30">
                <Ionicons name="timer-outline" size={20} color="#FFCBA4" />
              </View>
              <Text className="text-[15px] text-text-primary font-semibold">
                운동 중... {activeSession.exercises.length}종목 💪
              </Text>
            </View>
          ) : (
            <View className="items-center py-2 gap-1">
              <Text className="text-[40px]">🏃‍♀️</Text>
              <Text className="text-sm text-text-muted">오늘 운동 기록이 없어요</Text>
            </View>
          )}
        </Card>

        <WaterTracker />

        <Text className="text-[15px] font-bold text-text-secondary mb-3 mt-2">빠른 기록</Text>
        <View className="flex-row gap-3">
          <QuickButton
            label="식단 추가"
            icon="nutrition"
            color="#A8DCC8"
            onPress={() => router.push("/modal/add-food")}
          />
          <QuickButton
            label="운동 시작"
            icon="barbell"
            color="#F4B8A8"
            onPress={() => {
              if (!activeSession) startSession();
              router.push("/(tabs)/workout");
            }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

function InfoRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View className="flex-row justify-between items-center">
      <Text className="text-sm text-text-secondary">{label}</Text>
      <Text className="text-sm font-bold" style={{ color }}>{value}</Text>
    </View>
  );
}

function MacroChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View
      className="items-center flex-1 rounded-2xl py-2 px-1"
      style={{ backgroundColor: color + "20" }}>
      <View className="w-2 h-2 rounded-full mb-1" style={{ backgroundColor: color }} />
      <Text className="text-[10px] text-text-secondary mb-0.5">{label}</Text>
      <Text className="text-sm font-bold" style={{ color }}>{value}</Text>
    </View>
  );
}

function QuickButton({
  label,
  icon,
  color,
  onPress,
}: {
  label: string;
  icon: any;
  color: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      className="flex-1 bg-surface rounded-[22px] p-5 items-center"
      style={SHADOW}
      onPress={onPress}
      activeOpacity={0.7}>
      <View
        className="w-[58px] h-[58px] rounded-[20px] items-center justify-center mb-2"
        style={{ backgroundColor: color + "28" }}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <Text className="text-sm font-semibold text-text-primary">{label}</Text>
    </TouchableOpacity>
  );
}
