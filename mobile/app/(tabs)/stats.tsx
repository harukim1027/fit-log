import React from "react";
import { calcSessionVolume } from "../../utils/workout";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { useRouter } from "expo-router";
import { Header, Card, ThemeToggle } from "../../components/ui";
import {
  Icon,
  SaladIcon,
  FlameIcon,
} from "../../components/AppIcons";
import { useWorkoutStore } from "../../store/workoutStore";
import { useRestDayStore } from "../../store/restDayStore";
import { useAuthStore } from "../../store/authStore";
import { useShallow } from "zustand/react/shallow";
import { useColors, ThemeColors } from "../../constants/colors";
import { LineChart } from "react-native-chart-kit";
import {
  RestBarChart,
  RestBarLegend,
  BarDatum,
} from "../../components/stats/RestBarChart";
import { Dimensions } from "react-native";
import { BackgroundBlobs } from "../../components/BackgroundBlobs";

// ScrollView padding 20*2=40 + Card p-4 16*2=32 = 72
const W = Dimensions.get("window").width - 72;

function makeChartConfig(c: ThemeColors) {
  return {
    backgroundColor: c.surface,
    backgroundGradientFrom: c.surface,
    backgroundGradientTo: c.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(61,139,224,${opacity})`,
    labelColor: (opacity = 1) => {
      const [r, g, b] = c.textSecondary
        .replace("#", "")
        .match(/.{2}/g)!
        .map((h) => parseInt(h, 16));
      return `rgba(${r},${g},${b},${opacity})`;
    },
    style: { borderRadius: 16 },
    propsForDots: { r: "5", strokeWidth: "2", stroke: c.primary },
  };
}

export default function StatsScreen() {
  const router = useRouter();
  const c = useColors();
  const { sessions, fetchSessions } = useWorkoutStore(
    useShallow((s) => ({ sessions: s.sessions, fetchSessions: s.fetchSessions }))
  );
  const { restDays, fetchRestDays } = useRestDayStore(
    useShallow((s) => ({ restDays: s.restDays, fetchRestDays: s.fetchRestDays }))
  );
  const { user, logout } = useAuthStore(
    useShallow((s) => ({ user: s.user, logout: s.logout }))
  );

  const [selectedExercise, setSelectedExercise] = React.useState<string | null>(
    null
  );

  const chartConfig = React.useMemo(() => makeChartConfig(c), [c]);

  React.useEffect(() => {
    if (sessions.length === 0) fetchSessions();
    fetchRestDays();
  }, []);

  const last7 = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split("T")[0];
  });

  const last7Sessions = last7.map((date) =>
    sessions
      .filter((s) => s.date === date)
      .reduce((sum, s) => sum + calcSessionVolume(s), 0)
  );

  const totalVolume = sessions.reduce((sum, s) => sum + calcSessionVolume(s), 0);

  const last7BurnData = last7.map((date) =>
    sessions
      .filter((s) => s.date === date)
      .reduce((sum, s) => sum + (s.caloriesBurned ?? 0), 0)
  );

  const prMap: Record<string, number> = {};
  sessions.forEach((s) => {
    s.exercises.forEach((ex) => {
      ex.sets
        .filter((st) => st.weight > 0 && st.reps > 0)
        .forEach((st) => {
          const wKg = st.unit === 'lbs' ? st.weight / 2.20462 : st.weight;
          if (!prMap[ex.name] || prMap[ex.name] < wKg) prMap[ex.name] = wKg;
        });
    });
  });
  const prs = Object.entries(prMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const exerciseNames = React.useMemo(() => {
    const freq: Record<string, number> = {};
    sessions.forEach((s) =>
      s.exercises.forEach((ex) => {
        freq[ex.name] = (freq[ex.name] ?? 0) + 1;
      })
    );
    return Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
      .slice(0, 10);
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
        const maxWeight =
          ex.sets.length > 0 ? Math.max(...ex.sets.map((st) => st.weight)) : 0;
        return { date: s.date.slice(5), maxWeight };
      });
    return points.length >= 2 ? points : null;
  }, [sessions, activeExercise]);

  const dayLabels = last7.map((d) =>
    new Date(d).toLocaleDateString("ko-KR", { weekday: "short" })
  );

  // 날짜별 막대 종류 결정: 운동함 → 실제 값 / 쉬는날 지정 → 체크무늬 / 그 외 → 빈 막대
  const barType = (dateStr: string, value: number): BarDatum["type"] =>
    value > 0 ? "workout" : restDays.includes(dateStr) ? "rest" : "empty";

  const volumeBarsAll: BarDatum[] = last7.map((date, i) => ({
    label: dayLabels[i],
    value: last7Sessions[i],
    type: barType(date, last7Sessions[i]),
  }));

  const burnBarsAll: BarDatum[] = last7.map((date, i) => ({
    label: dayLabels[i],
    value: last7BurnData[i],
    type: barType(date, last7BurnData[i]),
  }));

  // 그래프엔 운동/쉬는날만 표시 — 운동 안 한 날(값 0 & 쉬는날 아님)은 제외
  const volumeBars = volumeBarsAll.filter((b) => b.type !== "empty");
  const burnBars = burnBarsAll.filter((b) => b.type !== "empty");

  // 평균은 "운동한 날만" 기준 (쉬는날·미수행일 모두 제외)
  const workoutDayAvg = (bars: BarDatum[]): number => {
    const days = bars.filter((b) => b.type === "workout");
    if (days.length === 0) return 0;
    return Math.round(days.reduce((s, b) => s + b.value, 0) / days.length);
  };
  const avgVolume = workoutDayAvg(volumeBarsAll);
  const avgBurn = workoutDayAvg(burnBarsAll);

  const SHADOW = {
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 4,
  };

  return (
    <View className="flex-1 bg-background">
      <BackgroundBlobs />
      <Header
        title="통계"
        subtitle={user?.name ?? undefined}
        rightElement={
          <View className="flex-row items-center gap-1">
            <ThemeToggle size={36} />
            <TouchableOpacity
              className="w-9 h-9 items-center justify-center rounded-xl"
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              onPress={() => router.push("/modal/edit-profile" as any)}>
              <Icon name="person" size={22} color={c.success} />
            </TouchableOpacity>
            <TouchableOpacity
              className="w-9 h-9 items-center justify-center rounded-xl"
              hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
              onPress={logout}>
              <Icon name="logout" size={22} color={c.danger} />
            </TouchableOpacity>
          </View>
        }
      />
      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        {/* 요약 2×2 */}
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
          <StatCard
            label="운동일 평균 볼륨"
            value={String(avgVolume)}
            unit="kg"
            color={c.success}
            bg={c.success + "18"}
          />
          <StatCard
            label="운동일 평균 소모"
            value={String(avgBurn)}
            unit="kcal"
            color={c.danger}
            bg={c.danger + "18"}
          />
        </View>
        <View style={{ flexDirection: "row", gap: 10, marginBottom: 14 }}>
          <StatCard
            label="총 운동"
            value={String(sessions.length)}
            unit="회"
            color={c.primary}
            bg={c.primary + "18"}
          />
          <StatCard
            label="총 볼륨"
            value={String(Math.round(totalVolume / 100) / 10)}
            unit="ton"
            color={c.warning}
            bg={c.warning + "18"}
          />
        </View>

        {/* 주간 운동 볼륨 */}
        <Card className="mb-4">
          <Text className="text-[15px] font-bold text-text-secondary mb-1">
            주간 운동 볼륨
          </Text>
          {volumeBars.length > 0 ? (
            <View>
              <Text style={{ fontSize: 12, fontWeight: "700", color: c.textMuted, marginBottom: 10 }}>
                운동일 평균 {avgVolume.toLocaleString()}kg
              </Text>
              <RestBarChart
                data={volumeBars}
                color={c.danger}
                width={W}
                suffix="kg"
                c={c}
                patternId="restVolume"
              />
              <View style={{ alignItems: "center", marginTop: 6 }}>
                <RestBarLegend color={c.danger} c={c} />
              </View>
            </View>
          ) : (
            <View className="items-center py-5 gap-1">
              <Icon name="dumbbell" size={40} color={c.textMuted} />
              <Text className="text-sm text-text-muted text-center">
                운동 기록이 없어요
              </Text>
            </View>
          )}
        </Card>

        {/* 주간 칼로리 소모 */}
        <Card className="mb-4">
          <Text className="text-[15px] font-bold text-text-secondary mb-1">
            주간 운동 칼로리 소모
          </Text>
          {burnBars.length > 0 ? (
            <View>
              <Text style={{ fontSize: 12, fontWeight: "700", color: c.textMuted, marginBottom: 10 }}>
                운동일 평균 {avgBurn.toLocaleString()}kcal
              </Text>
              <RestBarChart
                data={burnBars}
                color={c.warning}
                width={W}
                suffix="kcal"
                c={c}
                patternId="restBurn"
              />
              <View style={{ alignItems: "center", marginTop: 6 }}>
                <RestBarLegend color={c.warning} c={c} />
              </View>
            </View>
          ) : (
            <View className="items-center py-5 gap-1">
              <FlameIcon size={40} />
              <Text className="text-sm text-text-muted text-center">
                운동 기록이 없어요
              </Text>
            </View>
          )}
        </Card>

        {/* 종목별 성장 그래프 */}
        {exerciseNames.length > 0 && (
          <Card className="mb-4">
            <Text className="text-[15px] font-bold text-text-secondary mb-4">
              종목별 성장 그래프
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 14, marginHorizontal: -4 }}
              contentContainerStyle={{
                paddingHorizontal: 4,
                gap: 8,
                flexDirection: "row",
              }}>
              {exerciseNames.map((name) => {
                const isActive = activeExercise === name;
                return (
                  <TouchableOpacity
                    key={name}
                    className={[
                      "rounded-[14px] px-3 py-[7px]",
                      isActive ? "bg-primary" : "bg-surface-alt",
                    ].join(" ")}
                    onPress={() => setSelectedExercise(name)}
                    activeOpacity={0.7}>
                    <Text
                      className={[
                        "text-sm font-semibold",
                        isActive ? "text-on-accent" : "text-text-secondary",
                      ].join(" ")}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            {exerciseGrowthData ? (
              <View style={{ overflow: 'hidden', borderRadius: 16 }}>
                <LineChart
                  data={{
                    labels: exerciseGrowthData.map((d) => d.date),
                    datasets: [
                      { data: exerciseGrowthData.map((d) => d.maxWeight) },
                    ],
                  }}
                  width={W}
                  height={160}
                  chartConfig={{
                    ...chartConfig,
                    decimalPlaces: 1,
                    color: (opacity = 1) => `rgba(61,139,224,${opacity})`,
                    propsForDots: { r: "5", strokeWidth: "2", stroke: c.primary },
                  }}
                  bezier
                  style={{ borderRadius: 16, marginLeft: -10 }}
                  withInnerLines={false}
                  yAxisSuffix="kg"
                />
              </View>
            ) : (
              <View className="items-center py-5 gap-1">
                <Icon name="chart" size={40} color={c.textMuted} />
                <Text className="text-sm text-text-muted text-center">
                  {activeExercise
                    ? "2회 이상 기록이 있어야 그래프가 표시돼요"
                    : "운동 기록이 없어요"}
                </Text>
              </View>
            )}
          </Card>
        )}

        {/* PR 기록 */}
        {prs.length > 0 && (
          <View
            className="bg-surface rounded-[30px] p-[18px] mb-4"
            style={SHADOW}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "800",
                color: c.textSecondary,
                marginBottom: 12,
              }}>
              종목별 최고 기록 PR
            </Text>
            {prs.map(([name, maxW], idx) => (
              <View
                key={name}
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  backgroundColor: c.surfaceAlt,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                  marginTop: 8,
                }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 11,
                  }}>
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 999,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor:
                        idx === 0
                          ? c.stats
                          : idx === 1
                          ? c.textMuted
                          : c.warning,
                    }}>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: "900",
                        color: c.onAccent,
                      }}>
                      {idx + 1}
                    </Text>
                  </View>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "800",
                      color: c.textPrimary,
                    }}>
                    {name}
                  </Text>
                </View>
                <Text
                  style={{ fontSize: 14, fontWeight: "900", color: c.success, fontVariant: ['tabular-nums'] }}>
                  {Math.round(maxW * 10) / 10}kg
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function StatCard({
  label,
  value,
  unit,
  color,
  bg,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
  bg: string;
}) {
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 22,
        padding: 14,
        alignItems: "center",
        gap: 3,
        backgroundColor: bg,
      }}>
      <Text className="text-[11px] font-extrabold text-text-secondary">
        {label}
      </Text>
      <Text style={{ fontSize: 22, fontWeight: "900", color, fontVariant: ['tabular-nums'] }}>{value}</Text>
      <Text style={{ fontSize: 11, fontWeight: "800", color: color + "BB" }}>
        {unit}
      </Text>
    </View>
  );
}
