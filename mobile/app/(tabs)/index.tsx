import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";
import { Header } from "../../components/ui";
import { useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useDietStore } from "../../store/dietStore";
import { useWorkoutStore } from "../../store/workoutStore";
import { useAuthStore } from "../../store/authStore";
import { Colors } from "../../constants/colors";
import CalorieRing from "../../components/CalorieRing";
import WaterTracker from "../../components/WaterTracker";
import { useWaterStore } from "../../store/waterStore";

const CARD_SHADOW = {
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
    <View style={s.container}>
      <Header
        title={user?.name ? `${user.name}님 안녕하세요 🌸` : "홈"}
        subtitle={new Date().toLocaleDateString("ko-KR", {
          month: "long",
          day: "numeric",
          weekday: "short",
        })}
        rightElement={
          <TouchableOpacity
            style={s.settingBtn}
            onPress={() => router.push("/modal/set-target" as any)}>
            <Ionicons name="settings-outline" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        }
      />
      <ScrollView
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.content}>

        <View style={s.card}>
          <View style={s.cardTitleRow}>
            <Text style={s.cardTitle}>오늘의 칼로리</Text>
            <TouchableOpacity
              onPress={() => router.push("/modal/set-target" as any)}>
              <Text style={s.editText}>목표 수정</Text>
            </TouchableOpacity>
          </View>

          <View style={s.ringRow}>
            <CalorieRing consumed={consumed} target={target} size={160} />
            <View style={s.ringInfo}>
              <InfoRow
                label="섭취"
                value={consumed + " kcal"}
                color={Colors.diet}
              />
              <InfoRow
                label="목표"
                value={target + " kcal"}
                color={Colors.primary}
              />
              <InfoRow
                label="잔여"
                value={remaining + " kcal"}
                color={remaining === 0 ? Colors.danger : Colors.textSecondary}
              />
            </View>
          </View>

          <View style={s.macroRow}>
            <MacroChip label="탄수화물" value={carbs + "g"} color="#FFCBA4" />
            <MacroChip label="단백질" value={protein + "g"} color="#B4A7E8" />
            <MacroChip label="지방" value={fat + "g"} color="#F4B8A8" />
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>오늘의 운동</Text>
          {todaySession ? (
            <>
              <View style={s.row}>
                <View style={s.iconBg}>
                  <Ionicons name="checkmark" size={20} color={Colors.success} />
                </View>
                <Text style={s.workoutText}>
                  {exerciseCount}가지 운동 완료 🎉
                </Text>
              </View>
              {!!todaySession.caloriesBurned && (
                <View style={[s.row, { marginTop: 8 }]}>
                  <View style={[s.iconBg, { backgroundColor: Colors.danger + "20" }]}>
                    <Ionicons name="flame" size={20} color={Colors.danger} />
                  </View>
                  <Text style={[s.workoutText, { color: Colors.danger }]}>
                    {todaySession.caloriesBurned} kcal 소모
                  </Text>
                </View>
              )}
            </>
          ) : activeSession ? (
            <View style={s.row}>
              <View
                style={[s.iconBg, { backgroundColor: Colors.warning + "30" }]}>
                <Ionicons
                  name="timer-outline"
                  size={20}
                  color={Colors.warning}
                />
              </View>
              <Text style={s.workoutText}>
                운동 중... {activeSession.exercises.length}종목 💪
              </Text>
            </View>
          ) : (
            <View style={s.emptyState}>
              <Text style={s.emptyEmoji}>🏃‍♀️</Text>
              <Text style={s.emptyText}>오늘 운동 기록이 없어요</Text>
            </View>
          )}
        </View>

        <WaterTracker />

        <Text style={s.sectionTitle}>빠른 기록</Text>
        <View style={s.quickRow}>
          <QuickButton
            label="식단 추가"
            icon="nutrition"
            color={Colors.diet}
            onPress={() => router.push("/modal/add-food")}
          />
          <QuickButton
            label="운동 시작"
            icon="barbell"
            color={Colors.workout}
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

function InfoRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={ir.row}>
      <Text style={ir.label}>{label}</Text>
      <Text style={[ir.value, { color }]}>{value}</Text>
    </View>
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
    <View style={[mc.chip, { backgroundColor: color + "20" }]}>
      <View style={[mc.dot, { backgroundColor: color }]} />
      <Text style={mc.label}>{label}</Text>
      <Text style={[mc.value, { color }]}>{value}</Text>
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
      style={[qb.btn, CARD_SHADOW]}
      onPress={onPress}
      activeOpacity={0.7}>
      <View style={[qb.iconWrap, { backgroundColor: color + "28" }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <Text style={qb.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  settingBtn: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    ...CARD_SHADOW,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    ...CARD_SHADOW,
  },
  cardTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  cardTitle: { fontSize: 15, fontWeight: "700", color: Colors.textSecondary },
  editText: { fontSize: 13, color: Colors.primary, fontWeight: "600" },
  ringRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  ringInfo: { flex: 1, paddingLeft: 20, gap: 12 },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
    paddingTop: 16,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.success + "30",
    alignItems: "center",
    justifyContent: "center",
  },
  workoutText: { fontSize: 15, color: Colors.textPrimary, fontWeight: "600" },
  emptyState: { alignItems: "center", paddingVertical: 8, gap: 6 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 14, color: Colors.textMuted },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: 12,
    marginTop: 8,
  },
  quickRow: { flexDirection: "row", gap: 12 },
});
const ir = StyleSheet.create({
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: { fontSize: 13, color: Colors.textSecondary },
  value: { fontSize: 14, fontWeight: "700" },
});
const mc = StyleSheet.create({
  chip: {
    alignItems: "center",
    flex: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  dot: { width: 8, height: 8, borderRadius: 4, marginBottom: 5 },
  label: { fontSize: 10, color: Colors.textSecondary, marginBottom: 3 },
  value: { fontSize: 13, fontWeight: "700" },
});
const qb = StyleSheet.create({
  btn: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 22,
    padding: 20,
    alignItems: "center",
  },
  iconWrap: {
    width: 58,
    height: 58,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  label: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
});
