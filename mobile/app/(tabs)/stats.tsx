import React from "react";
import { calcSessionVolume, toKg, buildExerciseGrowthData } from "../../utils/workout";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import { Card } from "../../components/ui";
import { Header } from "../../design-system";
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
import { useThemeStore } from "../../store/themeStore";
import { LineChart } from "react-native-chart-kit";
import {
  RestBarChart,
  RestBarLegend,
  BarDatum,
} from "../../components/stats/RestBarChart";
import { Dimensions } from "react-native";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { localDateStr, getWeekRangeByOffset, weekDates } from "../../utils/date";
import MuscleMap, { MUSCLE_MAP, CATEGORY_TO_SLUGS, MAJOR_MUSCLES, MAJOR_MUSCLE_LABELS } from "../../components/MuscleMap";
import { eunNeun } from "../../utils/korean";

// ScrollView padding 20*2=40 + Card p-4 16*2=32 = 72
const W = Dimensions.get("window").width - 72;

// ymd·getWeekRange 는 utils/date.ts 로 옮겼다. 홈에도 같은 이름의 함수가 따로
// 있었고 **주 시작 요일이 서로 달랐다**(홈 일요일 / 통계 월요일). 같은
// "이번 주"인데 두 화면이 모든 날 다른 7일을 봤고, 일요일에는 겹치는 날이
// 하루뿐이었다. 일요일 시작으로 통일했다 — 근거는 utils/date.ts 주석에 있다.

/** 기간 라벨: "이번주 · 6/9 ~ 6/15" 형태 */
function formatWeekRange(offset: number) {
  const { start, end } = getWeekRangeByOffset(offset);
  const r = `${start.getMonth() + 1}/${start.getDate()} ~ ${
    end.getMonth() + 1
  }/${end.getDate()}`;
  if (offset === 0) return `이번주 · ${r}`;
  if (offset === -1) return `지난주 · ${r}`;
  return r;
}

// react-native-chart-kit은 색을 rgba() 문자열 팩토리로만 받는다.
// 회귀 방지: 채널 값을 직접 적지 말 것. 과거 여기 하드코딩돼 있던
// rgba(61,139,224) = #3D8BE0은 colors.ts의 primary(#1E7AEA/#2E82F0)와
// 어긋난 값이었다. 반드시 토큰에서 파생시킨다.
function rgbaFrom(hex: string, opacity: number): string {
  const [r, g, b] = hex
    .replace("#", "")
    .match(/.{2}/g)!
    .map((h) => parseInt(h, 16));
  return `rgba(${r},${g},${b},${opacity})`;
}

// DESIGN.md Governance에 shadow.light가 unresolved로 기록돼 있어 확정 토큰이 없다.
// 값이 정해지면 이 상수를 토큰 참조로 교체할 것. (index.tsx / workout.tsx와 동일)
const LIGHT_SHADOW_SM = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 2,
};

/**
 * Creates chart configuration values from the current theme colors.
 *
 * @param c - Theme colors used for chart backgrounds, labels, and dots
 * @returns Configuration for themed line charts
 */
function makeChartConfig(c: ThemeColors) {
  return {
    backgroundColor: c.surface,
    backgroundGradientFrom: c.surface,
    backgroundGradientTo: c.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => rgbaFrom(c.primary, opacity),
    labelColor: (opacity = 1) => rgbaFrom(c.textSecondary, opacity),
    style: { borderRadius: 16 },
    propsForDots: { r: "5", strokeWidth: "2", stroke: c.primary },
  };
}

/**
 * Renders the workout statistics screen with weekly summaries, charts, and personal records.
 *
 * @returns The statistics screen UI.
 */
function StatsScreen() {
  const c = useColors();
  const isDark = useThemeStore((s) => s.mode) === "dark";
  const { sessions, fetchSessions } = useWorkoutStore(
    useShallow((s) => ({ sessions: s.sessions, fetchSessions: s.fetchSessions }))
  );
  const { restDays, fetchRestDays } = useRestDayStore(
    useShallow((s) => ({ restDays: s.restDays, fetchRestDays: s.fetchRestDays }))
  );
  const { routines, loadRoutines } = useRoutineStore(
    useShallow((s) => ({ routines: s.routines, loadRoutines: s.loadRoutines }))
  );
  const { user } = useAuthStore(
    useShallow((s) => ({ user: s.user }))
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

  // 선택된 주(일~토)의 날짜별 볼륨/소모
  const { start: weekStart, end: weekEnd } = getWeekRangeByOffset(weekOffset);

  /**
   * 선택한 주에 자극한 부위. 홈에 있던 "이번 주 자극 부위" 섹션을 옮겨온 것이다.
   *
   * ★ 주 범위는 **통계의 weekOffset** 을 따른다. 홈은 selectedDate 로 주를
   *   정하고 이 화면은 weekOffset 으로 정한다 — 두 상태는 별개이고 그대로 둔다.
   *   탭 간 주 상태를 공유하지 않는다는 기존 결정을 유지한다. 홈에서 지난 주를
   *   보다 통계로 와도 통계는 자기 ◀▶ 가 가리키는 주를 보여준다.
   */
  const weekMuscleData = React.useMemo(() => {
    const weekSessions = sessions.filter((s) => {
      const d = new Date(s.date + "T00:00:00");
      return d >= weekStart && d <= weekEnd;
    });
    const set = new Set<string>();
    for (const sess of weekSessions) {
      for (const ex of sess.exercises) {
        const slugs = MUSCLE_MAP[ex.name] ?? CATEGORY_TO_SLUGS[ex.category ?? ""] ?? [];
        for (const sl of slugs) set.add(sl);
      }
    }
    const chips = MAJOR_MUSCLES.map((m) => ({
      slug: m,
      label: MAJOR_MUSCLE_LABELS[m] ?? m,
      on: set.has(m),
    }));
    return {
      muscles: Array.from(set),
      hit: chips.filter((ch) => ch.on).length,
      // 힌트는 칩과 같은 배열에서 파생시킨다 — 둘이 어긋날 수 없게.
      missing: chips.find((ch) => !ch.on) ?? null,
      total: chips.length,
    };
  }, [sessions, weekOffset]);
  const weekDays = weekDates(weekStart).map((d) => ({
    dateStr: localDateStr(d),
    label: d.toLocaleDateString("ko-KR", { weekday: "short" }),
  }));

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

  // DESIGN.md: 그림자는 라이트 모드에서만. 다크에서는 surface 명도 차 + 보더로 계층을 만든다.
  const SHADOW = isDark ? null : LIGHT_SHADOW_SM;

  return (
    <View className="flex-1 bg-background">
      {/* rightElement 를 두지 않는다. 테마·프로필·로그아웃 셋은 설정 탭으로
          옮겼다. 통계는 보는 화면인데 헤더에 설정 진입점 세 개가 있었다.
          Header 가 좌우 슬롯 폭을 고정하므로 제거해도 레이아웃은 깨지지 않고
          제목 슬롯만 넓어진다. */}
      <Header title="통계" subtitle={user?.name ?? undefined} />
      <ScrollView
        /* 좌우 여백은 여기 한 번만(space.16). 카드 사이는 부모 gap(space.12)이 만든다 */
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 40, gap: 12 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">
        {/* 요약 2×2 */}
        <View style={{ flexDirection: "row", gap: 12 }}>
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
        <View style={{ flexDirection: "row", gap: 12 }}>
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
            borderWidth: 1,
            borderColor: c.border,
            paddingHorizontal: 8,
            paddingVertical: 6,
          }}>
          <TouchableOpacity activeOpacity={0.7}
            onPress={() => setWeekOffset((o) => o - 1)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{ width: 40, height: 32, alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "800", color: c.textSecondary }}>◀</Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 14, fontWeight: "800", color: c.textPrimary }}>
            {formatWeekRange(weekOffset)}
          </Text>
          <TouchableOpacity activeOpacity={0.7}
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
        <Card style={{ gap: 8 }}>
          <Text className="text-[17px] font-extrabold text-text-secondary">
            주간 운동 볼륨
          </Text>
          {volumeBars.length > 0 ? (
            <View style={{ gap: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: c.textSecondary }}>
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
                    <Text style={{ fontSize: 12, fontWeight: "600", color: c.textSecondary }}>{r.name}</Text>
                  </View>
                ))}
                {hasNonRoutine && (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <View
                      style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: c.textMuted }}
                    />
                    <Text style={{ fontSize: 12, fontWeight: "600", color: c.textSecondary }}>개별 운동</Text>
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
                    <Text style={{ fontSize: 12, fontWeight: "600", color: c.textSecondary }}>쉬는날</Text>
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
        <Card style={{ gap: 8 }}>
          <Text className="text-[17px] font-extrabold text-text-secondary">
            주간 운동 칼로리 소모
          </Text>
          {burnBars.length > 0 ? (
            <View style={{ gap: 10 }}>
              <Text style={{ fontSize: 12, fontWeight: "600", color: c.textSecondary }}>
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

        {/* 자극 부위 — 홈에서 옮겨왔다.

            배치: **주간 네비게이션이 지배하는 블록의 끝**이다. ◀▶(weekOffset)가
            바꾸는 것은 위의 볼륨·칼로리와 이 섹션뿐이고, 아래 성장 그래프·PR
            기록은 전체 기간이라 weekOffset 을 쓰지 않는다. 같은 컨트롤이
            지배하는 것들을 붙여 두지 않으면 ◀▶ 를 눌렀을 때 화면 저 아래
            무언가가 같이 바뀌는 것을 사용자가 연결하지 못한다. */}
        <Card style={{ gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text className="text-[17px] font-extrabold text-text-secondary" style={{ flex: 1 }}>
              자극 부위
            </Text>
            {/* numeric — 홈 히어로의 "N/6"과 같은 지표다 */}
            <Text style={{ fontSize: 15, fontWeight: "800", color: c.textPrimary, fontVariant: ["tabular-nums"] }}>
              {weekMuscleData.hit}
              <Text style={{ color: c.textSecondary }}>/{weekMuscleData.total}</Text>
            </Text>
          </View>
          <MuscleMap muscles={weekMuscleData.muscles} scale={0.55} />
          {/* 색만으로 전달 금지 — 상태를 아이콘 + 텍스트로 함께 표시한다. */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border }}>
            <Icon
              name={weekMuscleData.muscles.length === 0 ? "dumbbell" : weekMuscleData.missing ? "target" : "check"}
              size={13}
              color={weekMuscleData.muscles.length === 0 ? c.textMuted : weekMuscleData.missing ? c.warning : c.success}
            />
            {/* caption 12/600. 의미색은 아이콘이 지고 본문은 text-secondary —
                라이트에서 warning/success 는 카드 위 3.5:1 미만이라 본문 색으로 쓰지 않는다. */}
            <Text style={{ flex: 1, fontSize: 12, fontWeight: "600", color: c.textSecondary }}>
              {weekMuscleData.muscles.length === 0
                ? "이 주엔 기록이 없어요"
                : weekMuscleData.missing
                  ? `${weekMuscleData.missing.label}${eunNeun(weekMuscleData.missing.label)} 빠졌어요`
                  : "전신 골고루 자극했어요!"}
            </Text>
          </View>
        </Card>

        {/* 종목별 성장 그래프 */}
        {exerciseNames.length > 0 && (
          <Card style={{ gap: 8 }}>
            <Text className="text-[17px] font-extrabold text-text-secondary">
              종목별 성장 그래프
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginHorizontal: -4 }}
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
                      "rounded-full px-4 justify-center",
                      isActive ? "bg-primary" : "bg-surface-alt",
                    ].join(" ")}
                    style={{ minHeight: 44 }}
                    onPress={() => setSelectedExercise(name)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isActive }}
                    accessibilityLabel={`${name} 성장 그래프 보기`}
                    activeOpacity={0.7}>
                    <Text
                      className={[
                        "text-[12px] font-semibold",
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
                    color: (opacity = 1) => rgbaFrom(c.primary, opacity),
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
            className="bg-surface rounded-[16px] border border-border p-4"
            style={[{ gap: 8 }, SHADOW]}>
            <Text
              style={{
                fontSize: 17,
                fontWeight: "800",
                color: c.textSecondary,
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
                  paddingVertical: 12,
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
                        fontSize: 14,
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
                  style={{ fontSize: 15, fontWeight: "800", color: c.textPrimary, fontVariant: ['tabular-nums'] }}>
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

// 통계 화면 전용 ErrorBoundary — 차트/집계 로직에서 예외가 나도(예: 잘못된 데이터로
// 차트 렌더 실패) 앱 전체가 아닌 이 화면만 폴백된다. 운동/홈 탭은 계속 사용 가능.
/**
 * Renders the statistics screen within an error boundary.
 */
export default function StatsScreenRoute() {
  return (
    <ErrorBoundary screenName="통계">
      <StatsScreen />
    </ErrorBoundary>
  );
}

/**
 * Renders a styled statistics card with a label, value, and unit.
 *
 * @param label - The statistic's label.
 * @param value - The statistic's displayed value.
 * @param unit - The value's unit.
 * @param color - The value and unit text color.
 * @param bg - The card background color.
 */
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
  const c = useColors();
  return (
    <View
      style={{
        flex: 1,
        borderRadius: 16,
        padding: 16,
        alignItems: "center",
        gap: 4,
        backgroundColor: bg,
        // DESIGN.md: 의미색은 텍스트가 아니라 비텍스트 요소에 싣는다.
        // 값은 text-primary로 읽고, 카테고리 식별은 틴트 배경 + 이 보더가 담당한다.
        // (다크에서는 그림자를 쓰지 않으므로 이 보더가 카드 경계 역할도 겸한다)
        borderWidth: 1,
        borderColor: color,
      }}>
      <Text className="text-[11px] font-bold text-text-secondary">
        {label}
      </Text>
      <Text style={{ fontSize: 22, fontWeight: "900", color: c.textPrimary, fontVariant: ['tabular-nums'] }}>{value}</Text>
      <Text style={{ fontSize: 11, fontWeight: "700", color: c.textSecondary }}>
        {unit}
      </Text>
    </View>
  );
}
