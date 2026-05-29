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
import { Icon, HeartIcon, SaladIcon, FlameIcon } from "../../components/AppIcons";
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
  color: (opacity = 1) => `rgba(111, 211, 182, ${opacity})`,
  labelColor: (opacity = 1) => `rgba(126, 154, 144, ${opacity})`,
  style: { borderRadius: 16 },
  propsForDots: { r: "5", strokeWidth: "2", stroke: "#6FD3B6" },
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
        title="통계"
        subtitle={user?.name ?? undefined}
        rightElement={
          <View className="flex-row items-center gap-1">
            <TouchableOpacity
              className="w-9 h-9 items-center justify-center rounded-xl"
              onPress={() => router.push("/modal/edit-profile" as any)}>
              <Icon name="person" size={22} color="#2E9E83" />
            </TouchableOpacity>
            <TouchableOpacity
              className="w-9 h-9 items-center justify-center rounded-xl"
              onPress={logout}>
              <Icon name="logout" size={22} color="#E76C86" />
            </TouchableOpacity>
          </View>
        }
      />
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        {/* 요약 2×2 */}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 10 }}>
          <StatCard label="7일 평균" value={String(avgCalories)} unit="kcal" color="#2E9E83" bg="#6FD3B611" />
          <StatCard label="주간 소모" value={String(totalBurnWeek)} unit="kcal" color="#E76C86" bg="#FF9DB011" />
        </View>
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 14 }}>
          <StatCard label="총 운동" value={String(sessions.length)} unit="회" color="#3F8DD6" bg="#8FC7F511" />
          <StatCard label="총 볼륨" value={String(Math.round(totalVolume / 100) / 10)} unit="ton" color="#E6932F" bg="#FFC07811" />
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
                color: (opacity = 1) => `rgba(46, 158, 131, ${opacity})`,
                propsForDots: { r: "5", strokeWidth: "2", stroke: "#2E9E83" },
              }}
              bezier
              style={{ borderRadius: 16, marginLeft: -10 }}
              withInnerLines={false}
            />
          ) : (
            <View className="items-center py-5 gap-1">
              <SaladIcon size={40} />
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
                color: (opacity = 1) => `rgba(231, 108, 134, ${opacity})`,
              }}
              style={{ borderRadius: 16, marginLeft: -10 }}
              withInnerLines={false}
              showValuesOnTopOfBars={false}
              yAxisLabel=""
              yAxisSuffix="kg"
            />
          ) : (
            <View className="items-center py-5 gap-1">
              <Icon name="dumbbell" size={40} color="#B4CFC5" />
              <Text className="text-sm text-text-muted text-center">운동 기록이 없어요</Text>
            </View>
          )}
        </Card>

        {/* 주간 칼로리 소모 */}
        <Card className="mb-4">
          <Text className="text-[15px] font-bold text-text-secondary mb-4">주간 운동 칼로리 소모</Text>
          {last7BurnData.some((v) => v > 0) ? (
            <BarChart
              data={{ labels: dayLabels, datasets: [{ data: last7BurnData }] }}
              width={W}
              height={160}
              chartConfig={{
                ...chartConfig,
                color: (opacity = 1) => `rgba(255, 192, 120, ${opacity})`,
              }}
              style={{ borderRadius: 16, marginLeft: -10 }}
              withInnerLines={false}
              showValuesOnTopOfBars={false}
              yAxisLabel=""
              yAxisSuffix="kcal"
            />
          ) : (
            <View className="items-center py-5 gap-1">
              <FlameIcon size={40} />
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
                      <HeartIcon size={14} filled color="#FF3B30" />
                      <Text className="text-sm font-semibold" style={{ color: '#FF3B30' }}>가져오기</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>

            {!healthAvailable ? (
              <View className="items-center py-5 gap-2">
                <Icon name="phone" size={32} color="#B4CFC5" />
                <Text className="text-sm text-text-muted text-center">
                  Apple Health는 실제 기기 빌드에서 사용 가능해요
                </Text>
              </View>
            ) : healthData.weight || healthData.bodyFat || healthData.leanBodyMass ? (
              <>
                <View className="flex-row gap-2">
                  <InbodyCard label="체중" value={healthData.weight != null ? `${healthData.weight}` : "-"} unit="kg" color="#2E9E83" />
                  <InbodyCard label="체지방률" value={healthData.bodyFat != null ? `${healthData.bodyFat}` : "-"} unit="%" color="#E76C86" />
                  <InbodyCard label="근육량" value={healthData.leanBodyMass != null ? `${healthData.leanBodyMass}` : "-"} unit="kg" color="#3F8DD6" />
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
                        color: (opacity = 1) => `rgba(63, 141, 214, ${opacity})`,
                        propsForDots: { r: "4", strokeWidth: "2", stroke: "#3F8DD6" },
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
                <HeartIcon size={36} filled={false} />
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
            <Text className="text-[15px] font-bold text-text-secondary mb-4">종목별 성장 그래프</Text>
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
                  color: (opacity = 1) => `rgba(46, 158, 131, ${opacity})`,
                  propsForDots: { r: "5", strokeWidth: "2", stroke: "#2E9E83" },
                }}
                bezier
                style={{ borderRadius: 16, marginLeft: -10 }}
                withInnerLines={false}
                yAxisSuffix="kg"
              />
            ) : (
              <View className="items-center py-5 gap-1">
                <Icon name="chart" size={40} color="#B4CFC5" />
                <Text className="text-sm text-text-muted text-center">
                  {activeExercise ? "2회 이상 기록이 있어야 그래프가 표시돼요" : "운동 기록이 없어요"}
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* PR 기록 */}
        {prs.length > 0 && (
          <View className="bg-surface rounded-[30px] p-[18px] mb-4" style={{ shadowColor: "#4EBFA0", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.20, shadowRadius: 24, elevation: 4 }}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#7E9A90', marginBottom: 12 }}>종목별 최고 기록 PR</Text>
            {prs.map(([name, vol], idx) => (
              <View
                key={name}
                style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#E7F7F0', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 11, marginTop: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 11 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: idx === 0 ? '#FFD36E' : idx === 1 ? '#B4CFC5' : '#FFAE96' }}>
                    <Text style={{ fontSize: 13, fontWeight: '900', color: '#fff' }}>{idx + 1}</Text>
                  </View>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: '#34514A' }}>{name}</Text>
                </View>
                <Text style={{ fontSize: 14, fontWeight: '900', color: '#2E9E83' }}>{vol.toLocaleString()}kg</Text>
              </View>
            ))}
          </View>
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

function StatCard({ label, value, unit, color, bg }: { label: string; value: string; unit: string; color: string; bg: string }) {
  return (
    <View style={{ flex: 1, borderRadius: 22, padding: 14, alignItems: 'center', gap: 3, backgroundColor: bg }}>
      <Text style={{ fontSize: 11, fontWeight: '800', color: '#7E9A90' }}>{label}</Text>
      <Text style={{ fontSize: 22, fontWeight: '900', color }}>{value}</Text>
      <Text style={{ fontSize: 11, fontWeight: '800', color: color + 'BB' }}>{unit}</Text>
    </View>
  );
}
