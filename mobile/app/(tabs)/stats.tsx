import React from "react";
import { calcSessionVolume, toKg, buildExerciseGrowthData } from "../../utils/workout";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
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
import { LineChart } from "react-native-chart-kit";
import {
  RestBarChart,
  BarDatum,
} from "../../components/stats/RestBarChart";
import { Dimensions } from "react-native";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { useRouter } from "expo-router";
import { localDateStr, getWeekRangeByOffset, weekDates } from "../../utils/date";
import MuscleMap, { MUSCLE_MAP, CATEGORY_TO_SLUGS, MAJOR_MUSCLES, MAJOR_MUSCLE_LABELS } from "../../components/MuscleMap";
import { eunNeun } from "../../utils/korean";
import { type, layout, leaderRow, segment, weekNavLabel } from "../../constants/typography";

// 섹션 좌우 여백(18×2)만 뺀다. 카드가 사라져 안쪽 패딩이 없다.
// 전에는 ScrollView 20×2 + Card 16×2 = 72 를 뺐다.
const W = Dimensions.get("window").width - layout.sectionPaddingH * 2;

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
  /**
   * 조회 범위. **이 화면의 모든 수치가 이것을 따른다.**
   *
   * 전에는 전체 기간 카드 4개가 주간 네비게이션 **위**에 있어서, 아래 ◀▶ 로
   * 주를 옮겨도 안 바뀌는 그 숫자들이 "그 주 수치"로 오해됐다. 범위를
   * 최상단 스위처 하나로 올려 아래 전부가 같은 범위를 말하게 한다.
   */
  const [range, setRange] = React.useState<"week" | "all">("week");
  /** 주 범위. range 가 "all" 이어도 값은 유지한다 — "주간"으로 돌아오면 보던 주로 복귀. */
  const [weekOffset, setWeekOffset] = React.useState(0);
  const router = useRouter();
  const scrollRef = React.useRef<ScrollView>(null);
  /** 인체 맵 펼침. 기본은 접힘 — 상시로 두면 292pt 를 먹는다. */
  const [mapOpen, setMapOpen] = React.useState(false);
  /** 최고 기록 더 보기. 기본 3개만 — 목록이 길면 아래 성장 그래프가 밀린다. */
  const [prExpanded, setPrExpanded] = React.useState(false);

  /**
   * 범위를 바꾸면 맨 위로 올린다.
   *
   * 섹션 구성이 달라진다 — "전체"에서는 비교문과 ◀▶ 네비가 사라진다.
   * 스크롤 위치를 그대로 두면 같은 y 좌표에 다른 섹션이 와서, 사용자는
   * 자기가 보던 것이 무엇으로 바뀌었는지 알 수 없다. 위로 올리면 스위처가
   * 시야에 들어와 "무엇이 바뀌었는지"가 먼저 읽힌다.
   */
  const changeRange = (next: "week" | "all") => {
    if (next === range) return;
    setRange(next);
    scrollRef.current?.scrollTo({ y: 0, animated: false });
  };

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
  const muscleData = React.useMemo(() => {
    const inRange = range === "all"
      ? sessions
      : sessions.filter((s) => {
          const d = new Date(s.date + "T00:00:00");
          return d >= weekStart && d <= weekEnd;
        });

    // 부위별 **세션 수**. 같은 세션에서 한 부위를 여러 종목으로 쳐도 1로 센다 —
    // "몇 번 다뤘나"를 묻는 지표라 종목 수가 아니라 세션 수가 맞다.
    const count: Record<string, number> = {};
    const all = new Set<string>();
    for (const sess of inRange) {
      const perSession = new Set<string>();
      for (const ex of sess.exercises) {
        const slugs = MUSCLE_MAP[ex.name] ?? CATEGORY_TO_SLUGS[ex.category ?? ""] ?? [];
        for (const sl of slugs) { perSession.add(sl); all.add(sl); }
      }
      for (const sl of perSession) count[sl] = (count[sl] ?? 0) + 1;
    }

    const parts = MAJOR_MUSCLES.map((m) => ({
      slug: m,
      label: MAJOR_MUSCLE_LABELS[m] ?? m,
      on: all.has(m),
      count: count[m] ?? 0,
    }));
    const missing = parts.filter((pt) => !pt.on);
    return {
      muscles: Array.from(all),
      parts,
      hit: parts.length - missing.length,
      // 힌트는 parts 에서 파생시킨다 — 목록과 어긋날 수 없게.
      missing,
      total: parts.length,
    };
  }, [sessions, range, weekStart, weekEnd]);

  /**
   * 미자극 부위 안내. **전부 나열한다** — 하나만 말하면 목록에 취소선이 둘인데
   * 문구는 하나만 짚어 어긋나 보인다. 조사는 마지막 부위 기준으로 고른다.
   */
  const muscleHint = (() => {
    if (muscleData.muscles.length === 0) return "아직 기록이 없어요";
    if (muscleData.missing.length === 0) return "전신 골고루 자극했어요!";
    const names = muscleData.missing.map((m) => m.label);
    // 시점 표현은 이번 주일 때만 붙인다. 다른 주나 전체 범위에서는 바로 위
    // 주 네비게이션 라벨과 범위 스위처가 이미 어느 구간인지 말한다.
    const when = range === "week" && weekOffset === 0 ? "이번 주 " : "";
    return `${names.join("·")}${eunNeun(names[names.length - 1])} ${when}아직이에요`;
  })();
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

  /**
   * 종목별 최고 중량. **범위 스위처를 따른다** — "주간"이면 그 주에 든 최고,
   * "전체"면 전체 기간 최고다. 상위 몇 개만 자르지 않고 전부 만든 뒤 화면에서
   * 3개까지 보이고 나머지는 "N개 더 보기"로 편다.
   */
  const rangePrs = React.useMemo(() => {
    const inRange = range === "all"
      ? sessions
      : sessions.filter((s) => {
          const d = new Date(s.date + "T00:00:00");
          return d >= weekStart && d <= weekEnd;
        });
    const map: Record<string, number> = {};
    for (const sess of inRange)
      for (const ex of sess.exercises)
        for (const st of ex.sets) {
          if (st.weight <= 0 || st.reps <= 0) continue;
          const w = toKg(st.weight, st.unit);
          if (w > (map[ex.name] ?? 0)) map[ex.name] = w;
        }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [sessions, range, weekStart, weekEnd]);

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

  /**
   * 성장 요약문. "6주간 100kg → 140kg" — 차트를 읽지 않아도 결론이 온다.
   * 점이 둘 미만이면 비교할 게 없어 문구를 내지 않는다.
   */
  const growthSummary = React.useMemo(() => {
    const d = exerciseGrowthData;
    if (!d || d.length < 2) return null;
    const first = d[0], last = d[d.length - 1];
    const weeks = Math.max(
      1,
      Math.round(
        (new Date(last.date + "T00:00:00").getTime() - new Date(first.date + "T00:00:00").getTime()) /
          (7 * 24 * 60 * 60 * 1000),
      ),
    );
    const a = Math.round(first.maxWeight * 10) / 10;
    const b = Math.round(last.maxWeight * 10) / 10;
    if (a === b) return `${weeks}주간 ${a}kg 유지 중이에요`;
    return `${weeks}주간 ${a}kg → ${b}kg`;
  }, [exerciseGrowthData]);

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

  /**
   * "전체" 범위의 막대 — **최근 8주 주별 볼륨**.
   *
   * 요일 7칸과 칸 수가 비슷해 범위를 바꿔도 차트 폭이 흔들리지 않는다.
   *
   * ★ 기록이 8주보다 적으면 있는 만큼만 그린다. 빈 칸을 8개까지 채우면
   *   "기록이 없다"가 아니라 "차트가 깨졌다"로 보인다.
   */
  const allWeekBars: BarDatum[] = React.useMemo(() => {
    if (sessions.length === 0) return [];
    const oldest = sessions.reduce((m, s) => (s.date < m ? s.date : m), sessions[0].date);
    const bars: BarDatum[] = [];
    for (let off = -7; off <= 0; off++) {
      const { start, end } = getWeekRangeByOffset(off);
      // 가장 오래된 기록보다 앞선 주는 만들지 않는다.
      if (localDateStr(end) < oldest) continue;
      const vol = sessions
        .filter((s) => {
          const d = new Date(s.date + "T00:00:00");
          return d >= start && d <= end;
        })
        .reduce((sum, s) => sum + calcSessionVolume(s), 0);
      bars.push({
        label: `${start.getMonth() + 1}/${start.getDate()}`,
        value: Math.round(vol),
        type: vol > 0 ? "workout" : "empty",
      });
    }
    return bars;
  }, [sessions]);

  /** 선택한 주에 세운 신기록 수 — 그 주 최고가 그 이전 전체 최고를 넘은 종목. */
  const weekPRCount = React.useMemo(() => {
    const inWeek = sessions.filter((s) => weekDateSet.has(s.date));
    const before = sessions.filter((s) => !weekDateSet.has(s.date) && s.date < (weekDays[0]?.dateStr ?? ""));
    const prevMax: Record<string, number> = {};
    for (const sess of before)
      for (const ex of sess.exercises)
        for (const st of ex.sets) {
          if (st.weight <= 0 || st.reps <= 0) continue;
          const w = toKg(st.weight, st.unit);
          if (w > (prevMax[ex.name] ?? 0)) prevMax[ex.name] = w;
        }
    const hit = new Set<string>();
    for (const sess of inWeek)
      for (const ex of sess.exercises)
        for (const st of ex.sets) {
          if (st.weight <= 0 || st.reps <= 0) continue;
          if (toKg(st.weight, st.unit) > (prevMax[ex.name] ?? 0)) hit.add(ex.name);
        }
    return hit.size;
  }, [sessions, weekDateSet, weekDays]);

  /** 화면 전체가 보는 값들. range 하나로 갈린다. */
  const isWeek = range === "week";
  const rangeVolume = isWeek
    ? volumeBarsAll.reduce((sum, b) => sum + b.value, 0)
    : totalVolume;
  const rangeBurn = isWeek
    ? burnBarsAll.reduce((sum, b) => sum + b.value, 0)
    : sessions.reduce((sum, s) => sum + (s.caloriesBurned ?? 0), 0);
  const rangeWorkoutDays = isWeek
    ? volumeBarsAll.filter((b) => b.type === "workout").length
    : new Set(sessions.map((s) => s.date)).size;
  /**
   * "주간"은 그 주에 세운 **신규** PR 수, "전체"는 기록이 있는 종목 수다.
   * 전체 기간에는 비교할 이전 구간이 없어 "신규"가 성립하지 않는다 —
   * 라벨도 그에 맞춰 갈린다.
   *
   * 전에는 prs.length 를 썼는데 그 배열이 slice(0, 5) 라 6종목 이상이어도
   * 항상 5로 보였다.
   */
  const rangePR = isWeek ? weekPRCount : rangePrs.length;
  const rangeVolumeBars = isWeek ? volumeBars : allWeekBars.filter((b) => b.type !== "empty");
  const rangeBurnBars = isWeek ? burnBars : [];

  /**
   * 지난 주 대비. "주간"에서만 쓴다 — "전체"는 비교할 이전 범위가 없다.
   * 지난 주 볼륨이 0이면 비율이 무한대가 되므로 문구를 내지 않는다.
   */
  const prevWeekVolume = React.useMemo(() => {
    const { start, end } = getWeekRangeByOffset(weekOffset - 1);
    return sessions
      .filter((s) => {
        const d = new Date(s.date + "T00:00:00");
        return d >= start && d <= end;
      })
      .reduce((sum, s) => sum + calcSessionVolume(s), 0);
  }, [sessions, weekOffset]);
  const volumeDeltaPct =
    isWeek && prevWeekVolume > 0
      ? Math.round(((rangeVolume - prevWeekVolume) / prevWeekVolume) * 100)
      : null;


  return (
    <View className="flex-1 bg-background">
      {/* rightElement 를 두지 않는다. 테마·프로필·로그아웃 셋은 설정 탭으로
          옮겼다. 통계는 보는 화면인데 헤더에 설정 진입점 세 개가 있었다.
          Header 가 좌우 슬롯 폭을 고정하므로 제거해도 레이아웃은 깨지지 않고
          제목 슬롯만 넓어진다. */}
      <Header title="통계" subtitle={user?.name ?? undefined} />
      <ScrollView
        ref={scrollRef}
        /* 카드가 사라져 좌우 여백은 각 섹션이 자기 paddingHorizontal 로 갖는다.
           섹션 사이도 gap 이 아니라 각 섹션의 paddingTop + 1px 룰이 만든다 —
           gap 과 겹치면 이중 여백이 된다. 그래서 둘 다 뺐다. */
        contentContainerStyle={{ paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">

        {/* ── 기록이 아예 없을 때 ──────────────────────────────────────
            섹션마다 "운동 기록이 없어요"를 반복하지 않는다. 전에는 볼륨·
            칼로리·성장 세 곳이 각자 같은 말을 했다. 보여 줄 것이 없으면
            화면 하나가 한 번만 말하고 다음 행동을 준다. */}
        {sessions.length === 0 ? (
          <View style={{ paddingTop: 48, paddingHorizontal: layout.sectionPaddingH, alignItems: "center" }}>
            <Icon name="chart" size={40} color={c.textMuted} />
            <Text style={{ ...type.kpiValue, color: c.textPrimary, marginTop: 14 }}>첫 운동을 기록해보세요</Text>
            <Text style={{ ...type.body, color: c.textSecondary, marginTop: 6, textAlign: "center" }}>
              운동을 저장하면 여기에 그래프가 쌓여요
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => router.push("/(tabs)/workout")}
              accessibilityRole="button"
              accessibilityLabel="운동 시작"
              style={{
                flexDirection: "row", alignItems: "center", gap: 8,
                marginTop: 20, minHeight: 44, paddingHorizontal: 20,
                borderRadius: 999, backgroundColor: c.primary,
              }}>
              <Icon name="play" size={16} color={c.onAccent} />
              <Text style={{ fontSize: 14, fontWeight: "800", color: c.onAccent }}>운동 시작</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
        {/* ── 범위 스위처 — 아래 전부가 이것을 따른다 ── */}
          <View style={{ paddingHorizontal: layout.sectionPaddingH, paddingTop: 12 }}>
            <View style={{ flexDirection: "row", gap: segment.gap, padding: segment.padding, borderRadius: segment.radius, backgroundColor: c.surfaceAlt }}>
              {(["week", "all"] as const).map((r) => {
                const on = range === r;
                return (
                  <TouchableOpacity
                    key={r}
                    activeOpacity={0.7}
                    onPress={() => changeRange(r)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    accessibilityLabel={r === "week" ? "주간 범위" : "전체 기간 범위"}
                    style={{
                      flex: 1, height: segment.buttonHeight, borderRadius: segment.buttonRadius,
                      alignItems: "center", justifyContent: "center",
                      backgroundColor: on ? c.surface : "transparent",
                    }}>
                    <Text style={{ ...segment.label, color: on ? c.primary : c.textSecondary }}>
                      {r === "week" ? "주간" : "전체"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* ── 주 네비게이션 — "전체"에서는 숨긴다 ──
              전체 기간엔 이동할 주가 없다. 비활성으로 남기면 "왜 안 눌리지"가
              된다. weekOffset 값은 유지하므로 "주간"으로 돌아오면 보던 주로
              복귀한다. */}
          {isWeek && (
            <View style={{ paddingTop: 14, paddingHorizontal: layout.sectionPaddingH, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setWeekOffset((o) => o - 1)}
                accessibilityRole="button"
                accessibilityLabel="이전 주"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ width: 40, height: 32, alignItems: "center", justifyContent: "center" }}>
                <Icon name="chevronLeft" size={18} color={c.textSecondary} />
              </TouchableOpacity>
              <Text style={{ ...weekNavLabel, color: c.textPrimary, fontVariant: ["tabular-nums"] }}>
                {formatWeekRange(weekOffset)}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setWeekOffset((o) => Math.min(0, o + 1))}
                disabled={weekOffset >= 0}
                accessibilityRole="button"
                accessibilityLabel="다음 주"
                accessibilityState={{ disabled: weekOffset >= 0 }}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={{ width: 40, height: 32, alignItems: "center", justifyContent: "center", opacity: weekOffset >= 0 ? 0.3 : 1 }}>
                <Icon name="chevronRight" size={18} color={c.textSecondary} />
              </TouchableOpacity>
            </View>
          )}

          {/* ── ① 볼륨 ──────────────────────────────────────────────────────
              StatCard 4장(무지개 틴트 배경)을 여기 KPI 줄로 흡수했다. 요약
              숫자가 카드로 떠 있으면 아래 차트와 같은 무게가 되어 무엇이
              주인공인지 안 읽힌다. */}
          <View style={{ paddingTop: layout.sectionPaddingTop, paddingHorizontal: layout.sectionPaddingH }}>
            <Text style={{ ...type.kicker, color: c.textSecondary }}>
              {isWeek ? "이번 주 볼륨" : "전체 볼륨"}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: layout.bigMarginTop }}>
              <Text style={{ ...type.big, color: c.textPrimary, fontVariant: ["tabular-nums"] }}>
                {rangeVolume >= 1000 ? (rangeVolume / 1000).toFixed(1) : Math.round(rangeVolume)}
              </Text>
              <Text style={{ ...type.bigUnit, color: c.textSecondary, marginLeft: layout.bigUnitMarginLeft }}>
                {rangeVolume >= 1000 ? "t" : "kg"}
              </Text>
            </View>
            {/* 비교문은 "주간"에서만. 색만으로 전달하지 않으려고 ▲/▼ 기호를 함께 쓴다. */}
            {volumeDeltaPct !== null && (
              <Text
                style={{
                  ...type.body,
                  marginTop: layout.bodyMarginTop,
                  color: volumeDeltaPct >= 0 ? c.success : c.textSecondary,
                }}>
                {volumeDeltaPct >= 0 ? "▲" : "▼"} 지난주보다 {Math.abs(volumeDeltaPct)}%{" "}
                {volumeDeltaPct >= 0 ? "늘었어요" : "줄었어요"}
              </Text>
            )}

            <View style={{ flexDirection: "row", gap: layout.kpiRowGap, marginTop: layout.kpiRowMarginTop }}>
              <View>
                <Text style={{ ...type.kpiLabel, color: c.textSecondary }}>운동일</Text>
                <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: layout.kpiValueMarginTop }}>
                  <Text style={{ ...type.kpiValue, color: c.textPrimary, fontVariant: ["tabular-nums"] }}>{rangeWorkoutDays}</Text>
                  <Text style={{ ...type.kpiLabel, color: c.textSecondary }}>일</Text>
                </View>
              </View>
              <View>
                <Text style={{ ...type.kpiLabel, color: c.textSecondary }}>소모</Text>
                <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: layout.kpiValueMarginTop }}>
                  <Text style={{ ...type.kpiValue, color: c.textPrimary, fontVariant: ["tabular-nums"] }}>{rangeBurn.toLocaleString()}</Text>
                  <Text style={{ ...type.kpiLabel, color: c.textSecondary }}>kcal</Text>
                </View>
              </View>
              <View>
                <Text style={{ ...type.kpiLabel, color: c.textSecondary }}>{isWeek ? "신규 PR" : "PR 종목"}</Text>
                <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: layout.kpiValueMarginTop }}>
                  <Text style={{ ...type.kpiValue, color: c.textPrimary, fontVariant: ["tabular-nums"] }}>{rangePR}</Text>
                  <Text style={{ ...type.kpiLabel, color: c.textSecondary }}>개</Text>
                </View>
              </View>
            </View>

            {/* 막대 색 통일: 볼륨 primary. 전에는 c.danger(빨강)로 그리면서 카드
                보더는 success(초록)라 두 색이 같은 것을 가리키지 않았다. */}
            {rangeVolumeBars.length > 0 ? (
              <View style={{ marginTop: layout.chartMarginTop }}>
                <RestBarChart
                  data={rangeVolumeBars}
                  color={c.primary}
                  width={W}
                  suffix="kg"
                  c={c}
                />
              </View>
            ) : (
              <Text style={{ ...type.body, color: c.textSecondary, marginTop: layout.chartMarginTop }}>
                {isWeek ? "이 주엔 기록이 없어요" : "최근 8주 기록이 없어요"}
              </Text>
            )}
          </View>

          {/* ── ② 칼로리 — "주간"에서만. 전체 범위에서는 위 KPI 의 "소모" 하나로 충분하다. ── */}
          {isWeek && rangeBurnBars.length > 0 && (
            <>
              <SectionRule c={c} />
              <View style={{ paddingTop: layout.sectionPaddingTop, paddingHorizontal: layout.sectionPaddingH }}>
                <Text style={{ ...type.kicker, color: c.textSecondary }}>칼로리 소모</Text>
                <View style={{ flexDirection: "row", alignItems: "baseline", marginTop: layout.bigMarginTop }}>
                  <Text style={{ ...type.big, color: c.textPrimary, fontVariant: ["tabular-nums"] }}>
                    {rangeBurn.toLocaleString()}
                  </Text>
                  <Text style={{ ...type.bigUnit, color: c.textSecondary, marginLeft: layout.bigUnitMarginLeft }}>kcal</Text>
                </View>
                <Text style={{ ...type.body, color: c.textSecondary, marginTop: layout.bodyMarginTop }}>
                  운동일 평균 {avgBurn.toLocaleString()}kcal
                </Text>
                {/* 칼로리는 coral(=danger) 로 통일한다 — 요약 아이콘 색과 1:1. */}
                <View style={{ marginTop: layout.chartMarginTop }}>
                  <RestBarChart
                    data={rangeBurnBars}
                    color={c.danger}
                    width={W}
                    suffix="kcal"
                    c={c}
                  />
                </View>
              </View>
            </>
          )}

          <SectionRule c={c} />

          {/* ── ③ 자극 부위 ────────────────────────────────────────────────
              홈과 같은 인라인 + 취소선이지만 **빈도 숫자가 붙는 것**이 다르다.
              홈은 "뭘 빠뜨렸나"(행동), 통계는 "얼마나 했나"(분석)를 답한다.
              숫자가 없으면 두 화면이 같은 말을 두 번 하게 된다.

              인체 맵은 접어 둔다. 상시로 두면 292pt(뷰포트의 27%)를 먹는데,
              그림은 매번 보는 것이 아니라 궁금할 때 보는 것이다. */}
          <View style={{ paddingTop: layout.sectionPaddingTop, paddingHorizontal: layout.sectionPaddingH }}>
            <Text style={{ ...type.kicker, color: c.textSecondary }}>
              자극 부위 · {muscleData.hit}/{muscleData.total}
            </Text>

            <View
              style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: layout.muscleInlineGap, marginTop: layout.muscleInlineMarginTop }}
              accessibilityLabel={`자극 부위 ${muscleData.hit}/${muscleData.total}. ${muscleData.parts.map((pt) => (pt.on ? `${pt.label} ${pt.count}회` : `${pt.label} 아직`)).join(", ")}`}>
              {muscleData.parts.map((pt, idx) => (
                <React.Fragment key={pt.slug}>
                  {idx > 0 && <Text style={{ fontSize: 11, color: c.textMuted }}>·</Text>}
                  <View style={{ flexDirection: "row", alignItems: "baseline", gap: 3 }}>
                    {/* 미자극은 취소선이 주 신호다. 시안은 색을 textMuted 로 뒀지만
                        화면 배경 위 대비가 라이트 2.28 / 다크 3.34 로 미달이라
                        textSecondary(5.39 / 6.06)로 올렸다. 바로 아래 힌트가 이
                        이름들을 그대로 말하는데 목록에서 안 읽히면 모순이다.
                        자극됨(textPrimary)과 색 차가 줄어도 구분은 취소선이 진다. */}
                    <Text
                      style={{
                        ...type.body,
                        color: pt.on ? c.textPrimary : c.textSecondary,
                        textDecorationLine: pt.on ? "none" : "line-through",
                      }}>
                      {pt.label}
                    </Text>
                    {/* 빈도. 부위명(12/700)과 같은 크기면 "가슴3"이 한 덩어리로
                        읽힌다. 반 단계 작은 kpiLabel(11/700)을 재사용해 이름에
                        종속돼 보이게 하고, 새 크기를 늘리지 않는다. */}
                    {pt.on && (
                      <Text style={{ ...type.kpiLabel, color: c.textSecondary, fontVariant: ["tabular-nums"] }}>
                        {pt.count}
                      </Text>
                    )}
                  </View>
                </React.Fragment>
              ))}
            </View>

            {/* 색만으로 전달 금지 — 상태를 아이콘 + 텍스트로 함께 표시한다. */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: layout.muscleHintMarginTop }}>
              <Icon
                name={muscleData.muscles.length === 0 ? "dumbbell" : muscleData.missing.length > 0 ? "target" : "check"}
                size={13}
                color={muscleData.muscles.length === 0 ? c.textMuted : muscleData.missing.length > 0 ? c.warning : c.success}
              />
              {/* 의미색은 아이콘이 지고 본문은 text-secondary —
                  라이트에서 warning/success 는 배경 위 3.5:1 미만이라 본문 색으로 쓰지 않는다. */}
              <Text style={{ ...type.body, flex: 1, color: c.textSecondary }}>{muscleHint}</Text>
            </View>

            {/* 인체 맵 펼침 */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setMapOpen((v) => !v)}
              accessibilityRole="button"
              accessibilityState={{ expanded: mapOpen }}
              accessibilityLabel={mapOpen ? "인체 맵 접기" : "인체 맵 보기"}
              style={{ flexDirection: "row", alignItems: "center", gap: 2, marginTop: 10, minHeight: 44 }}>
              <Text style={{ ...type.kpiLabel, color: c.primary }}>
                {mapOpen ? "인체 맵 접기" : "인체 맵 보기"}
              </Text>
              <Icon name={mapOpen ? "chevronUp" : "chevronRight"} size={12} color={c.primary} />
            </TouchableOpacity>
            {mapOpen && (
              <View style={{ marginTop: 4 }}>
                <MuscleMap muscles={muscleData.muscles} scale={0.55} />
              </View>
            )}
          </View>

          <SectionRule c={c} />

          {/* ── ④ 최고 기록 — 점선 리더 행 ────────────────────────────────
              종목명과 값 사이를 점선으로 이으면 눈이 행을 따라간다. 전에는 각
              행이 surfaceAlt 블록이라 목록 전체가 또 하나의 카드 덩어리였다.
              순위 배지도 없앴다 — 정렬 순서가 이미 순위를 말한다. */}
          {rangePrs.length > 0 && (
            <>
              <View style={{ paddingTop: layout.sectionPaddingTop, paddingHorizontal: layout.sectionPaddingH }}>
                <Text style={{ ...type.kicker, color: c.textSecondary }}>최고 기록</Text>
                <View style={{ marginTop: 6 }}>
                  {(prExpanded ? rangePrs : rangePrs.slice(0, 3)).map(([name, maxW], idx) => (
                    <View
                      key={name}
                      style={{ flexDirection: "row", alignItems: "baseline", gap: leaderRow.gap, paddingVertical: leaderRow.paddingVertical }}
                      accessibilityLabel={`${idx + 1}위 ${name} ${Math.round(maxW * 10) / 10}킬로그램`}>
                      {/* 순위 색을 sun → primary → textMuted 로 내림차순으로 둔다.
                          전에는 1등 stats / 2등 textMuted / 3등 warning 이라
                          2·3등이 역전돼 있었다 — 3등이 2등보다 진했다. */}
                      <Text
                        style={{
                          ...type.kpiLabel,
                          color: idx === 0 ? c.tagSun : idx === 1 ? c.primary : c.textMuted,
                          fontVariant: ["tabular-nums"],
                        }}>
                        {idx + 1}
                      </Text>
                      <Text numberOfLines={1} style={{ ...leaderRow.name, color: c.textPrimary }}>{name}</Text>
                      {/* 점선 리더. 시안 .pd = border-bottom 1 dotted. */}
                      <View
                        style={{
                          flex: 1,
                          borderBottomWidth: 1,
                          borderStyle: "dotted",
                          borderColor: c.border,
                          marginHorizontal: leaderRow.dotsMarginH,
                          marginBottom: leaderRow.dotsMarginBottom,
                        }}
                      />
                      <Text style={{ ...leaderRow.value, color: c.textPrimary, fontVariant: ["tabular-nums"] }}>
                        {Math.round(maxW * 10) / 10}
                        <Text style={{ ...leaderRow.valueUnit, color: c.textSecondary }}>kg</Text>
                      </Text>
                    </View>
                  ))}
                </View>
                {rangePrs.length > 3 && (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    onPress={() => setPrExpanded((v) => !v)}
                    accessibilityRole="button"
                    accessibilityState={{ expanded: prExpanded }}
                    accessibilityLabel={prExpanded ? "최고 기록 접기" : `최고 기록 ${rangePrs.length - 3}개 더 보기`}
                    style={{ flexDirection: "row", alignItems: "center", gap: 2, minHeight: 44 }}>
                    <Text style={{ ...type.kpiLabel, color: c.primary }}>
                      {prExpanded ? "접기" : `${rangePrs.length - 3}개 더 보기`}
                    </Text>
                    <Icon name={prExpanded ? "chevronUp" : "chevronRight"} size={12} color={c.primary} />
                  </TouchableOpacity>
                )}
              </View>
              <SectionRule c={c} />
            </>
          )}

          {/* ── ⑤ 종목별 성장 ─────────────────────────────────────────────
              범위 스위처를 따르지 않는다 — 성장은 기간을 가로질러 보는 것이라
              한 주로 자르면 점이 한둘이라 선이 안 그려진다. 키커에 종목명을
              넣어 무엇의 성장인지 제목에서 읽히게 했다. */}
          {exerciseNames.length > 0 && (
            <View style={{ paddingTop: layout.sectionPaddingTop, paddingHorizontal: layout.sectionPaddingH, paddingBottom: layout.sectionPaddingBottom }}>
              <Text style={{ ...type.kicker, color: c.textSecondary }}>
                종목별 성장{activeExercise ? ` · ${activeExercise}` : ""}
              </Text>

              {/* 요약문 — 차트를 읽지 않아도 결론이 한 줄로 온다. */}
              {growthSummary && (
                <Text style={{ ...type.body, color: c.textSecondary, marginTop: layout.bodyMarginTop + 3 }}>
                  {growthSummary}
                </Text>
              )}

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={{ marginHorizontal: -layout.sectionPaddingH, marginTop: 12 }}
                contentContainerStyle={{ paddingHorizontal: layout.sectionPaddingH, gap: 8, flexDirection: "row" }}>
                {exerciseNames.map((name) => {
                  const isActive = activeExercise === name;
                  return (
                    <TouchableOpacity
                      key={name}
                      style={{
                        minHeight: 44, justifyContent: "center", paddingHorizontal: 14,
                        borderRadius: 999,
                        backgroundColor: isActive ? c.primary : c.surfaceAlt,
                      }}
                      onPress={() => setSelectedExercise(name)}
                      accessibilityRole="button"
                      accessibilityState={{ selected: isActive }}
                      accessibilityLabel={`${name} 성장 그래프 보기`}
                      activeOpacity={0.7}>
                      <Text style={{ ...type.body, color: isActive ? c.onAccent : c.textSecondary }}>{name}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {exerciseGrowthData ? (
                <View style={{ overflow: "hidden", marginTop: layout.chartMarginTop }}>
                  <LineChart
                    data={{
                      labels: exerciseGrowthData.map((d) => d.date.slice(5)),
                      datasets: [{ data: exerciseGrowthData.map((d) => d.maxWeight) }],
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
                    style={{ marginLeft: -10 }}
                    withInnerLines={false}
                    yAxisSuffix="kg"
                  />
                </View>
              ) : (
                /* 기록이 0인 경우는 위 온보딩 블록이 가져간다. 여기 오는 것은
                   "종목은 있는데 그 종목 기록이 1회뿐"인 경우뿐이다. */
                <Text style={{ ...type.body, color: c.textSecondary, marginTop: layout.chartMarginTop }}>
                  2회 이상 기록이 있어야 그래프가 표시돼요
                </Text>
              )}
            </View>
          )}

          </>
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
/**
 * 섹션 사이 1px 룰. 카드 보더를 대신해 덩어리를 나눈다.
 *
 * 색은 `c.border` 다. 화면 배경 위 대비가 라이트 1.16 / 다크 1.64 로 낮지만
 * 기존 카드 보더(surface 위 1.26 / 1.43)보다 나쁘지 않고 다크에서는 오히려
 * 높다. 더 진한 값을 쓰면 구분선이 아니라 보더로 읽혀 카드를 없앤 목적과
 * 반대가 된다. 근거는 design-system/README.md 에 있다.
 */
function SectionRule({ c }: { c: ReturnType<typeof useColors> }) {
  return (
    <View
      style={{
        height: layout.ruleHeight,
        marginTop: layout.ruleMarginTop,
        marginHorizontal: layout.ruleMarginH,
        backgroundColor: c.border,
      }}
    />
  );
}

