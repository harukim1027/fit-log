import React from "react";
import { calcSessionVolume, toKg, buildExerciseGrowthData } from "../../utils/workout";
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
import { useRoutineStore } from "../../store/routineStore";
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

// ScrollView padding 20*2=40 + Card p-4 16*2=32 = 72
const W = Dimensions.get("window").width - 72;

/** 로컬 기준 YYYY-MM-DD (세션 date 형식과 일치, UTC 변환으로 인한 날짜 밀림 방지) */
const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate()
  ).padStart(2, "0")}`;

/** offset주 전/후의 월~일 범위 (0=이번주, -1=지난주). 월요일 시작. */
function getWeekRange(offset: number) {
  const now = new Date();
  const day = now.getDay(); // 0=일 ~ 6=토
  const diffToMonday = day === 0 ? -6 : 1 - day; // 일요일이면 직전 월요일(-6)
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday + offset * 7);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { start: monday, end: sunday };
}

/** 기간 라벨: "이번주 · 6/9 ~ 6/15" 형태 */
function formatWeekRange(offset: number) {
  const { start, end } = getWeekRange(offset);
  const r = `${start.getMonth() + 1}/${start.getDate()} ~ ${
    end.getMonth() + 1
  }/${end.getDate()}`;
  if (offset === 0) return `이번주 · ${r}`;
  if (offset === -1) return `지난주 · ${r}`;
  return r;
}

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
  const { routines, loadRoutines } = useRoutineStore(
    useShallow((s) => ({ routines: s.routines, loadRoutines: s.loadRoutines }))
  );
  const { user, logout } = useAuthStore(
    useShallow((s) => ({ user: s.user, logout: s.logout }))
  );

  const [selectedExercise, setSelectedExercise] = React.useState<string | null>(
    null
  );
  // 주간 차트 기간 오프셋 (0=이번주, -1=지난주, ...). 미래(>0)로는 이동 불가.
  const [weekOffset, setWeekOffset] = React.useState(0);

  const chartConfig = React.useMemo(() => makeChartConfig(c), [c]);

  React.useEffect(() => {
    if (sessions.length === 0) fetchSessions();
    fetchRestDays();
    if (routines.length === 0) loadRoutines();
  }, []);

  // 선택된 주(월~일)의 날짜별 볼륨/소모
  const { start: weekStart } = getWeekRange(weekOffset);
  const weekDays = [...Array(7)].map((_, i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return { dateStr: ymd(d), label: d.toLocaleDateString("ko-KR", { weekday: "short" }) };
  });

  const weekVolumes = weekDays.map((w) =>
    sessions
      .filter((s) => s.date === w.dateStr)
      .reduce((sum, s) => sum + calcSessionVolume(s), 0)
  );

  const weekBurns = weekDays.map((w) =>
    sessions
      .filter((s) => s.date === w.dateStr)
      .reduce((sum, s) => sum + (s.caloriesBurned ?? 0), 0)
  );

  // 총 볼륨/총 운동 등 요약은 전체 기간 기준(기간 이동과 무관)
  const totalVolume = sessions.reduce((sum, s) => sum + calcSessionVolume(s), 0);

  const prMap: Record<string, number> = {};
  sessions.forEach((s) => {
    s.exercises.forEach((ex) => {
      ex.sets
        .filter((st) => st.completed && st.weight > 0 && st.reps > 0)
        .forEach((st) => {
          const wKg = toKg(st.weight, st.unit);
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

  // 성장 그래프 데이터는 utils/workout의 buildExerciseGrowthData 하나만 사용한다.
  // (0kg·미완료 세트 제외 규칙이 여기서 재구현/롤백되지 않도록 유일 소스로 유지)
  const exerciseGrowthData = React.useMemo(
    () => buildExerciseGrowthData(sessions, activeExercise),
    [sessions, activeExercise],
  );

  // 날짜별 막대 종류 결정: 운동함 → 실제 값 / 쉬는날 지정 → 체크무늬 / 그 외 → 빈 막대
  const barType = (dateStr: string, value: number): BarDatum["type"] =>
    value > 0 ? "workout" : restDays.includes(dateStr) ? "rest" : "empty";

  // 세션 → 루틴 색 (루틴 없거나 삭제된 루틴이면 개별 운동 색)
  const sessionColor = (s: (typeof sessions)[number]): string => {
    const r = s.fromRoutineId ? routines.find((x) => x.id === s.fromRoutineId) : undefined;
    return r?.color ?? c.textMuted;
  };

  // 해당 날짜 막대 색 = 그 날 볼륨이 가장 큰 세션의 루틴 색
  const dayRoutineColor = (dateStr: string): string | undefined => {
    const day = sessions.filter((s) => s.date === dateStr);
    if (day.length === 0) return undefined;
    let best = day[0];
    let bestVol = calcSessionVolume(day[0]);
    for (const s of day) {
      const v = calcSessionVolume(s);
      if (v > bestVol) { best = s; bestVol = v; }
    }
    return sessionColor(best);
  };

  const volumeBarsAll: BarDatum[] = weekDays.map((w, i) => ({
    label: w.label,
    value: weekVolumes[i],
    type: barType(w.dateStr, weekVolumes[i]),
    color: dayRoutineColor(w.dateStr),
  }));

  // 볼륨 차트 범례용: 이번 주에 사용된 루틴 + 개별 운동 여부
  const weekDateSet = new Set(weekDays.map((w) => w.dateStr));
  const weekSessions = sessions.filter((s) => weekDateSet.has(s.date));
  const usedRoutines = routines.filter((r) =>
    weekSessions.some((s) => s.fromRoutineId === r.id)
  );
  const hasNonRoutine = weekSessions.some(
    (s) => !s.fromRoutineId || !routines.find((r) => r.id === s.fromRoutineId)
  );

  const burnBarsAll: BarDatum[] = weekDays.map((w, i) => ({
    label: w.label,
    value: weekBurns[i],
    type: barType(w.dateStr, weekBurns[i]),
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

        {/* 주간 기간 네비게이션 (볼륨·칼로리 차트 공통) */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            backgroundColor: c.surface,
            borderRadius: 16,
            paddingHorizontal: 8,
            paddingVertical: 6,
            marginBottom: 10,
          }}>
          <TouchableOpacity
            onPress={() => setWeekOffset((o) => o - 1)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ width: 40, height: 32, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: c.textSecondary }}>◀</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 14, fontWeight: "800", color: c.textPrimary }}>
            {formatWeekRange(weekOffset)}
          </Text>
          <TouchableOpacity
            onPress={() => setWeekOffset((o) => Math.min(0, o + 1))}
            disabled={weekOffset >= 0}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{
              width: 40,
              height: 32,
              alignItems: "center",
              justifyContent: "center",
              opacity: weekOffset >= 0 ? 0.3 : 1,
            }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: c.textSecondary }}>▶</Text>
          </TouchableOpacity>
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
              {/* 루틴별 색상 범례 */}
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  gap: 12,
                  marginTop: 12,
                  justifyContent: "center",
                }}>
                {usedRoutines.map((r) => (
                  <View
                    key={r.id}
                    style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 6,
                        backgroundColor: r.color ?? c.textMuted,
                      }}
                    />
                    <Text style={{ fontSize: 12, color: c.textSecondary }}>{r.name}</Text>
                  </View>
                ))}
                {hasNonRoutine && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View
                      style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.textMuted }}
                    />
                    <Text style={{ fontSize: 12, color: c.textSecondary }}>개별 운동</Text>
                  </View>
                )}
                {/* 쉬는날(체크무늬)이 있으면 함께 안내 */}
                {volumeBars.some((b) => b.type === "rest") && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View
                      style={{
                        width: 12,
                        height: 12,
                        borderRadius: 3,
                        borderWidth: 1,
                        borderColor: c.border,
                        backgroundColor: c.surfaceAlt,
                      }}
                    />
                    <Text style={{ fontSize: 12, color: c.textSecondary }}>쉬는날</Text>
                  </View>
                )}
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
                    labels: exerciseGrowthData.map((d) => d.date.slice(5)),
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
