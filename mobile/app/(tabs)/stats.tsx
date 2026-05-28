import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useDietStore } from "../../store/dietStore";
import { useWorkoutStore } from "../../store/workoutStore";
import { useAuthStore } from "../../store/authStore";
import { Colors } from "../../constants/colors";
import { LineChart, BarChart } from "react-native-chart-kit";

const W = Dimensions.get("window").width - 40;

const CARD_SHADOW = {
  shadowColor: "#B4A0D8",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.09,
  shadowRadius: 12,
  elevation: 3,
};

const chartConfig = {
  backgroundColor: "#fff",
  backgroundGradientFrom: "#fff",
  backgroundGradientTo: "#fff",
  decimalPlaces: 0,
  color: (opacity = 1) => `rgba(180, 167, 232, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(139, 128, 168, ${opacity})`,
  style: { borderRadius: 16 },
  propsForDots: { r: "5", strokeWidth: "2", stroke: "#B4A7E8" },
};

export default function StatsScreen() {
  const router = useRouter();
  const { dailyDiets, targetCalories } = useDietStore();
  const { sessions } = useWorkoutStore();
  const { user, logout } = useAuthStore();

  const last7 = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });

  const calorieData = last7.map((date) => {
    const diet = dailyDiets.find((d) => d.date === date);
    return (
      diet?.meals.reduce(
        (s, m) => s + m.foods.reduce((f, food) => f + food.calories, 0),
        0
      ) ?? 0
    );
  });

  const avgCalories = Math.round(calorieData.reduce((a, b) => a + b, 0) / 7);

  const last7Sessions = last7.map((date) =>
    sessions
      .filter((s) => s.date === date)
      .reduce(
        (sum, s) =>
          sum +
          s.exercises.reduce(
            (es, ex) =>
              es + ex.sets.reduce((ss, st) => ss + st.weight * st.reps, 0),
            0
          ),
        0
      )
  );

  const totalVolume = sessions.reduce(
    (sum, s) =>
      sum +
      s.exercises.reduce(
        (es, ex) =>
          es + ex.sets.reduce((ss, st) => ss + st.weight * st.reps, 0),
        0
      ),
    0
  );

  const last7BurnData = last7.map((date) =>
    sessions
      .filter((s) => s.date === date)
      .reduce((sum, s) => sum + (s.caloriesBurned ?? 0), 0)
  );

  const totalBurnWeek = last7BurnData.reduce((a, b) => a + b, 0);

  const prMap: Record<string, number> = {};
  sessions.forEach((s) => {
    s.exercises.forEach((ex) => {
      ex.sets.forEach((st) => {
        const vol = st.weight * st.reps;
        if (!prMap[ex.name] || prMap[ex.name] < vol) prMap[ex.name] = vol;
      });
    });
  });
  const prs = Object.entries(prMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const dayLabels = last7.map((d) =>
    new Date(d).toLocaleDateString("ko-KR", { weekday: "short" })
  );

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <ScrollView contentContainerStyle={s.content}>
        <View style={s.header}>
          <View>
            <Text style={s.title}>통계 📊</Text>
            <Text style={s.subtitle}>{user?.name ?? ""}</Text>
          </View>
          <View style={s.headerActions}>
            <TouchableOpacity
              style={s.editBtn}
              onPress={() => router.push("/modal/edit-profile" as any)}>
              <Ionicons
                name="person-circle-outline"
                size={18}
                color={Colors.primary}
              />
              <Text style={s.editBtnText}>편집</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.logoutBtn} onPress={logout}>
              <Ionicons
                name="log-out-outline"
                size={18}
                color={Colors.danger}
              />
              <Text style={s.logoutText}>로그아웃</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={s.summaryRow}>
          <StatCard
            label="7일 평균"
            value={String(avgCalories)}
            unit="kcal"
            color={Colors.diet}
          />
          <StatCard
            label="주간 소모"
            value={String(totalBurnWeek)}
            unit="kcal"
            color={Colors.workout}
          />
        </View>
        <View style={s.summaryRow}>
          <StatCard
            label="총 운동"
            value={String(sessions.length)}
            unit="회"
            color={Colors.primary}
          />
          <StatCard
            label="총 볼륨"
            value={String(Math.round(totalVolume / 100) / 10)}
            unit="ton"
            color={Colors.stats}
          />
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>주간 칼로리</Text>
          {calorieData.some((v) => v > 0) ? (
            <LineChart
              data={{
                labels: dayLabels,
                datasets: [{ data: calorieData.map((v) => v || 0) }],
              }}
              width={W}
              height={160}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(168, 220, 200, ${opacity})`,
                propsForDots: { r: "5", strokeWidth: "2", stroke: "#A8DCC8" },
              }}
              bezier
              style={s.chart}
              withInnerLines={false}
            />
          ) : (
            <View style={s.emptyState}>
              <Text style={s.emptyEmoji}>🥗</Text>
              <Text style={s.emptyText}>식단 기록이 없어요</Text>
            </View>
          )}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>주간 운동 볼륨</Text>
          {last7Sessions.some((v) => v > 0) ? (
            <BarChart
              data={{ labels: dayLabels, datasets: [{ data: last7Sessions }] }}
              width={W}
              height={160}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(244, 184, 168, ${opacity})`,
              }}
              style={s.chart}
              withInnerLines={false}
              showValuesOnTopOfBars={false}
              yAxisLabel=""
              yAxisSuffix="kg"
            />
          ) : (
            <View style={s.emptyState}>
              <Text style={s.emptyEmoji}>🏋️</Text>
              <Text style={s.emptyText}>운동 기록이 없어요</Text>
            </View>
          )}
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>주간 운동 칼로리 소모 🔥</Text>
          {last7BurnData.some((v) => v > 0) ? (
            <BarChart
              data={{ labels: dayLabels, datasets: [{ data: last7BurnData }] }}
              width={W}
              height={160}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(244, 184, 168, ${opacity})`,
              }}
              style={s.chart}
              withInnerLines={false}
              showValuesOnTopOfBars={false}
              yAxisLabel=""
              yAxisSuffix="kcal"
            />
          ) : (
            <View style={s.emptyState}>
              <Text style={s.emptyEmoji}>🔥</Text>
              <Text style={s.emptyText}>운동 기록이 없어요</Text>
            </View>
          )}
        </View>

        {prs.length > 0 && (
          <View style={s.card}>
            <Text style={s.cardTitle}>종목별 최고 기록 PR 🏆</Text>
            {prs.map(([name, vol], idx) => (
              <View key={name} style={s.prRow}>
                <View style={s.prLeft}>
                  <View
                    style={[
                      s.prRankBadge,
                      {
                        backgroundColor:
                          idx === 0
                            ? "#FFCBA4"
                            : idx === 1
                            ? "#C4B8D4"
                            : "#F4B8A8",
                      },
                    ]}>
                    <Text style={s.prRank}>{idx + 1}</Text>
                  </View>
                  <Text style={s.prName}>{name}</Text>
                </View>
                <Text style={s.prVol}>{vol.toLocaleString()}kg</Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  return (
    <View style={[sc.card, { backgroundColor: color + "18" }]}>
      <Text style={sc.label}>{label}</Text>
      <Text style={[sc.value, { color }]}>{value}</Text>
      <Text style={[sc.unit, { color: color + "BB" }]}>{unit}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: { fontSize: 26, fontWeight: "700", color: Colors.textPrimary },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primary + "18",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  editBtnText: { fontSize: 13, fontWeight: "600", color: Colors.primary },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.danger + "18",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  logoutText: { fontSize: 13, fontWeight: "600", color: Colors.danger },
  summaryRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
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
    marginBottom: 16,
  },
  chart: { borderRadius: 16, marginLeft: -10 },
  emptyState: { alignItems: "center", paddingVertical: 20, gap: 6 },
  emptyEmoji: { fontSize: 40 },
  emptyText: { fontSize: 13, color: Colors.textMuted, textAlign: "center" },
  prRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    marginTop: 4,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  prLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  prRankBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  prRank: { fontSize: 13, fontWeight: "800", color: Colors.textPrimary },
  prName: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  prVol: { fontSize: 14, fontWeight: "700", color: Colors.workout },
});
const sc = StyleSheet.create({
  card: { flex: 1, borderRadius: 18, padding: 14, alignItems: "center" },
  label: {
    fontSize: 11,
    color: Colors.textSecondary,
    marginBottom: 6,
    fontWeight: "600",
  },
  value: { fontSize: 22, fontWeight: "800" },
  unit: { fontSize: 11, marginTop: 2, fontWeight: "600" },
});
