import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Header, Card } from "../../components/ui";
import { Ionicons } from "@expo/vector-icons";
import { useDietStore } from "../../store/dietStore";
import { useWorkoutStore } from "../../store/workoutStore";
import { useAuthStore } from "../../store/authStore";
import { useHealthStore } from "../../store/healthStore";
import { LineChart, BarChart } from "react-native-chart-kit";
import { Dimensions } from "react-native";

const W = Dimensions.get("window").width - 40;

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
  const { sessions, fetchSessions } = useWorkoutStore();
  const { user, logout } = useAuthStore();
  const {
    data: healthData,
    isLoading: healthLoading,
    isAvailable: healthAvailable,
    fetchHealthData,
  } = useHealthStore();

  const [selectedExercise, setSelectedExercise] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (sessions.length === 0) fetchSessions();
  }, []);

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
          sum + s.exercises.reduce((es, ex) => es + ex.sets.reduce((ss, st) => ss + st.weight * st.reps, 0), 0),
        0
      )
  );

  const totalVolume = sessions.reduce(
    (sum, s) =>
      sum + s.exercises.reduce((es, ex) => es + ex.sets.reduce((ss, st) => ss + st.weight * st.reps, 0), 0),
    0
  );

  const last7BurnData = last7.map((date) =>
    sessions.filter((s) => s.date === date).reduce((sum, s) => sum + (s.caloriesBurned ?? 0), 0)
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
  const prs = Object.entries(prMap).sort((a, b) => b[1] - a[1]).slice(0, 5);

  const exerciseNames = React.useMemo(() => {
    const freq: Record<string, number> = {};
    sessions.forEach((s) => s.exercises.forEach((ex) => { freq[ex.name] = (freq[ex.name] ?? 0) + 1; }));
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).map(([name]) => name).slice(0, 10);
  }, [sessions]);

  const activeExercise = selectedExercise ?? exerciseNames[0] ?? null;

  const exerciseGrowthData = React.useMemo(() => {
    if (!activeExercise) return null;
    const points = sessions
      .slice()
      .reverse()
      .filter((s) => s.exercises.some((ex) => ex.name === activeExercise))
      .slice(-8)
      .map((s) => {
        const ex = s.exercises.find((e) => e.name === activeExercise)!;
        const maxWeight = ex.sets.length > 0 ? Math.max(...ex.sets.map((st) => st.weight)) : 0;
        return { date: s.date.slice(5), maxWeight };
      });
    return points.length >= 2 ? points : null;
  }, [sessions, activeExercise]);

  const dayLabels = last7.map((d) =>
    new Date(d).toLocaleDateString("ko-KR", { weekday: "short" })
  );

  return (
    <View className="flex-1 bg-background">
      <Header
        title="통계 📊"
        subtitle={user?.name ?? undefined}
        rightElement={
          <View className="flex-row items-center gap-1">
            <TouchableOpacity
              className="w-9 h-9 items-center justify-center rounded-xl"
              onPress={() => router.push("/modal/edit-profile" as any)}>
              <Ionicons name="person-circle-outline" size={22} color="#B4A7E8" />
            </TouchableOpacity>
            <TouchableOpacity
              className="w-9 h-9 items-center justify-center rounded-xl"
              onPress={logout}>
              <Ionicons name="log-out-outline" size={22} color="#F4ADAD" />
            </TouchableOpacity>
          </View>
        }
      />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* 요약 */}
        <View className="flex-row gap-2 mb-4">
          <StatCard label="7일 평균" value={String(avgCalories)} unit="kcal" color="#A8DCC8" />
          <StatCard label="주간 소모" value={String(totalBurnWeek)} unit="kcal" color="#F4B8A8" />
        </View>
        <View className="flex-row gap-2 mb-4">
          <StatCard label="총 운동" value={String(sessions.length)} unit="회" color="#B4A7E8" />
          <StatCard label="총 볼륨" value={String(Math.round(totalVolume / 100) / 10)} unit="ton" color="#FFCBA4" />
        </View>

        {/* 주간 칼로리 */}
        <Card className="mb-4">
          <Text className="text-[15px] font-bold text-text-secondary mb-4">주간 칼로리</Text>
          {calorieData.some((v) => v > 0) ? (
            <LineChart
              data={{ labels: dayLabels, datasets: [{ data: calorieData.map((v) => v || 0) }] }}
              width={W}
              height={160}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(168, 220, 200, ${opacity})`,
                propsForDots: { r: "5", strokeWidth: "2", stroke: "#A8DCC8" },
              }}
              bezier
              style={{ borderRadius: 16, marginLeft: -10 }}
              withInnerLines={false}
            />
          ) : (
            <View className="items-center py-5 gap-1">
              <Text className="text-[40px]">🥗</Text>
              <Text className="text-sm text-text-muted text-center">식단 기록이 없어요</Text>
            </View>
          )}
        </Card>

        {/* 주간 운동 볼륨 */}
        <Card className="mb-4">
          <Text className="text-[15px] font-bold text-text-secondary mb-4">주간 운동 볼륨</Text>
          {last7Sessions.some((v) => v > 0) ? (
            <BarChart
              data={{ labels: dayLabels, datasets: [{ data: last7Sessions }] }}
              width={W}
              height={160}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(244, 184, 168, ${opacity})`,
              }}
              style={{ borderRadius: 16, marginLeft: -10 }}
              withInnerLines={false}
              showValuesOnTopOfBars={false}
              yAxisLabel=""
              yAxisSuffix="kg"
            />
          ) : (
            <View className="items-center py-5 gap-1">
              <Text className="text-[40px]">🏋️</Text>
              <Text className="text-sm text-text-muted text-center">운동 기록이 없어요</Text>
            </View>
          )}
        </Card>

        {/* 주간 칼로리 소모 */}
        <Card className="mb-4">
          <Text className="text-[15px] font-bold text-text-secondary mb-4">주간 운동 칼로리 소모 🔥</Text>
          {last7BurnData.some((v) => v > 0) ? (
            <BarChart
              data={{ labels: dayLabels, datasets: [{ data: last7BurnData }] }}
              width={W}
              height={160}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(244, 184, 168, ${opacity})`,
              }}
              style={{ borderRadius: 16, marginLeft: -10 }}
              withInnerLines={false}
              showValuesOnTopOfBars={false}
              yAxisLabel=""
              yAxisSuffix="kcal"
            />
          ) : (
            <View className="items-center py-5 gap-1">
              <Text className="text-[40px]">🔥</Text>
              <Text className="text-sm text-text-muted text-center">운동 기록이 없어요</Text>
            </View>
          )}
        </Card>

        {/* Apple Health 인바디 */}
        {Platform.OS === "ios" && (
          <Card className="mb-4">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-[15px] font-bold text-text-secondary">인바디 (Apple Health)</Text>
              {healthAvailable && (
                <TouchableOpacity
                  className="flex-row items-center gap-1 rounded-[20px] px-3 py-[7px] min-w-[80px] justify-center"
                  style={{ backgroundColor: '#FF3B3018' }}
                  onPress={fetchHealthData}
                  disabled={healthLoading}>
                  {healthLoading ? (
                    <ActivityIndicator size="small" color="#FF3B30" />
                  ) : (
                    <>
                      <Ionicons name="heart" size={14} color="#FF3B30" />
                      <Text className="text-sm font-semibold" style={{ color: '#FF3B30' }}>가져오기</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {!healthAvailable ? (
              <View className="items-center py-5 gap-2">
                <Ionicons name="phone-portrait-outline" size={32} color="#C4B8D4" />
                <Text className="text-sm text-text-muted text-center">
                  Apple Health는 실제 기기 빌드에서 사용 가능해요
                </Text>
              </View>
            ) : healthData.weight || healthData.bodyFat || healthData.leanBodyMass ? (
              <>
                <View className="flex-row gap-2">
                  <InbodyCard label="체중" value={healthData.weight != null ? `${healthData.weight}` : "-"} unit="kg" color="#B4A7E8" />
                  <InbodyCard label="체지방률" value={healthData.bodyFat != null ? `${healthData.bodyFat}` : "-"} unit="%" color="#FF6B6B" />
                  <InbodyCard label="근육량" value={healthData.leanBodyMass != null ? `${healthData.leanBodyMass}` : "-"} unit="kg" color="#F4B8A8" />
                </View>
                {healthData.weightHistory.length > 1 && (
                  <>
                    <Text className="text-[15px] font-bold text-text-secondary mt-4 mb-2">체중 추이 (30일)</Text>
                    <LineChart
                      data={{
                        labels: healthData.weightHistory
                          .filter((_, i) => i % Math.ceil(healthData.weightHistory.length / 6) === 0)
                          .map((d) => d.date.slice(5)),
                        datasets: [{ data: healthData.weightHistory.map((d) => d.value) }],
                      }}
                      width={W}
                      height={160}
                      chartConfig={{
                        ...chartConfig,
                        decimalPlaces: 1,
                        color: (opacity = 1) => `rgba(122, 200, 200, ${opacity})`,
                        propsForDots: { r: "4", strokeWidth: "2", stroke: "#7AC8C8" },
                      }}
                      bezier
                      style={{ borderRadius: 16, marginLeft: -10 }}
                      withInnerLines={false}
                    />
                  </>
                )}
              </>
            ) : (
              <View className="items-center py-5 gap-2">
                <Ionicons name="heart-outline" size={36} color="#C4B8D4" />
                <Text className="text-sm text-text-muted text-center">
                  Apple Health에서 신체 데이터를 가져오세요
                </Text>
                <TouchableOpacity
                  className="rounded-[20px] px-5 py-2 mt-1"
                  style={{ backgroundColor: '#FF3B3018' }}
                  onPress={fetchHealthData}
                  disabled={healthLoading}>
                  <Text className="text-sm font-bold" style={{ color: '#FF3B30' }}>
                    {healthLoading ? "불러오는 중..." : "Apple Health 연동하기"}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </Card>
        )}

        {/* 종목별 성장 그래프 */}
        {exerciseNames.length > 0 && (
          <Card className="mb-4">
            <Text className="text-[15px] font-bold text-text-secondary mb-4">종목별 성장 그래프 📈</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 14, marginHorizontal: -4 }}
              contentContainerStyle={{ paddingHorizontal: 4, gap: 8, flexDirection: "row" }}>
              {exerciseNames.map((name) => {
                const isActive = activeExercise === name;
                return (
                  <TouchableOpacity
                    key={name}
                    className={[
                      "rounded-[20px] px-3 py-[7px]",
                      isActive ? "bg-primary" : "bg-surface-alt",
                    ].join(" ")}
                    onPress={() => setSelectedExercise(name)}
                    activeOpacity={0.7}>
                    <Text
                      className={[
                        "text-sm font-semibold",
                        isActive ? "text-white" : "text-text-secondary",
                      ].join(" ")}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {exerciseGrowthData ? (
              <LineChart
                data={{
                  labels: exerciseGrowthData.map((d) => d.date),
                  datasets: [{ data: exerciseGrowthData.map((d) => d.maxWeight) }],
                }}
                width={W}
                height={160}
                chartConfig={{
                  ...chartConfig,
                  decimalPlaces: 1,
                  color: (opacity = 1) => `rgba(180, 167, 232, ${opacity})`,
                  propsForDots: { r: "5", strokeWidth: "2", stroke: "#B4A7E8" },
                }}
                bezier
                style={{ borderRadius: 16, marginLeft: -10 }}
                withInnerLines={false}
                yAxisSuffix="kg"
              />
            ) : (
              <View className="items-center py-5 gap-1">
                <Text className="text-[40px]">📊</Text>
                <Text className="text-sm text-text-muted text-center">
                  {activeExercise ? "2회 이상 기록이 있어야 그래프가 표시돼요" : "운동 기록이 없어요"}
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* PR 기록 */}
        {prs.length > 0 && (
          <Card className="mb-4">
            <Text className="text-[15px] font-bold text-text-secondary mb-4">종목별 최고 기록 PR 🏆</Text>
            {prs.map(([name, vol], idx) => (
              <View
                key={name}
                className="flex-row justify-between items-center py-2 mt-1 bg-surface-alt rounded-xl px-3 mb-1">
                <View className="flex-row items-center gap-3">
                  <View
                    className="w-[26px] h-[26px] rounded-full items-center justify-center"
                    style={{
                      backgroundColor:
                        idx === 0 ? "#FFCBA4" : idx === 1 ? "#C4B8D4" : "#F4B8A8",
                    }}>
                    <Text className="text-sm font-extrabold text-text-primary">{idx + 1}</Text>
                  </View>
                  <Text className="text-sm font-semibold text-text-primary">{name}</Text>
                </View>
                <Text className="text-sm font-bold text-workout">{vol.toLocaleString()}kg</Text>
              </View>
            ))}
          </Card>
        )}
      </ScrollView>
    </View>
  );
}

function InbodyCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View className="flex-1 rounded-2xl p-3 items-center" style={{ backgroundColor: color + "14" }}>
      <Text className="text-[11px] text-text-secondary font-semibold mb-1">{label}</Text>
      <Text className="text-[20px] font-extrabold" style={{ color }}>{value}</Text>
      <Text className="text-[11px] font-semibold mt-0.5" style={{ color: color + "AA" }}>{unit}</Text>
    </View>
  );
}

function StatCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View className="flex-1 rounded-[18px] p-3.5 items-center" style={{ backgroundColor: color + "18" }}>
      <Text className="text-[11px] text-text-secondary mb-1 font-semibold">{label}</Text>
      <Text className="text-[22px] font-extrabold" style={{ color }}>{value}</Text>
      <Text className="text-[11px] font-semibold mt-0.5" style={{ color: color + "BB" }}>{unit}</Text>
    </View>
  );
}
