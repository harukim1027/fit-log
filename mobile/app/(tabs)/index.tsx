import React, { useCallback, useEffect, useRef, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Animated,
  Modal,
  FlatList,
  useWindowDimensions,
} from "react-native";
import Svg, { Circle } from "react-native-svg";
import { Calendar } from "react-native-calendars";
import { useRouter } from "expo-router";
import { useWorkoutStore } from "../../store/workoutStore";
import { useAuthStore } from "../../store/authStore";
import { useShallow } from "zustand/react/shallow";
import { Icon, FaceAvatar, FlameIcon } from "../../components/AppIcons";
import { useColors, lightColors, darkColors } from "../../constants/colors";
import { useThemeStore } from "../../store/themeStore";
import { ThemeToggle } from "../../components/ui";
import MuscleMap, { MUSCLE_MAP, MUSCLE_LABELS, CATEGORY_TO_SLUGS } from "../../components/MuscleMap";
import type { Slug } from "react-native-body-highlighter";
import type { WorkoutSession } from "../../types/workout";
import { toKg } from "../../utils/workout";
import { ErrorBoundary } from "../../components/ErrorBoundary";

const MAJOR_MUSCLES = ['chest', 'upper-back', 'deltoids', 'abs', 'quadriceps', 'gluteal'];
// 필터 칩에 노출할 카테고리 (전체 + 주요 부위)
const FILTER_CATEGORIES = ['가슴', '등', '하체', '어깨', '팔'];

function eunNeun(s: string) {
  const code = s.charCodeAt(s.length - 1) - 0xAC00;
  return code >= 0 && code % 28 !== 0 ? '은' : '는';
}

// 로컬 타임존 기준 YYYY-MM-DD (session.date와 동일 포맷)
function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// 선택 날짜가 속한 주의 시작(일요일 00:00)과 끝(토요일 23:59:59.999) 반환.
// 홈의 모든 "이번 주" 계산(스트립/요약/PR/자극부위)이 이 일~토 기준을 공유한다.
function getWeekRange(dateYMD: string): { start: Date; end: Date } {
  const anchor = new Date(dateYMD + 'T00:00:00');
  anchor.setHours(0, 0, 0, 0);
  const start = new Date(anchor);
  start.setDate(anchor.getDate() - anchor.getDay()); // 일요일로 이동
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  const diff = Math.floor((Date.now() - d.getTime()) / 86400000);
  if (diff === 0) return "오늘";
  if (diff === 1) return "어제";
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

function sessionTitle(sess: WorkoutSession): string {
  const names = sess.exercises.slice(0, 2).map((e) => e.category || e.name);
  return names.join(" & ") || "운동";
}

// 볼륨 포맷: 1000kg 이상은 t(톤) 축약
function fmtVol(kg: number): string {
  return kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${Math.round(kg)}kg`;
}

/**
 * Darkens a hexadecimal color by the specified amount.
 *
 * @param hex - The hexadecimal color value.
 * @param amt - The darkening amount from `0` to `1`.
 * @returns The darkened hexadecimal color value.
 */
function darken(hex: string, amt: number): string {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map((x) => x + x).join('') : m;
  const n = parseInt(full, 16);
  const r = Math.round(((n >> 16) & 255) * (1 - amt));
  const g = Math.round(((n >> 8) & 255) * (1 - amt));
  const b = Math.round((n & 255) * (1 - amt));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// WCAG 2.1 상대 휘도 — 카테고리 워시 위 전경색을 대비로 고르기 위해서만 쓴다.
function relLuminance(hex: string): number {
  const m = hex.replace('#', '');
  const full = m.length === 3 ? m.split('').map((x) => x + x).join('') : m;
  const ch = [0, 2, 4]
    .map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((x) => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4)));
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relLuminance(a), relLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// 카테고리 워시(가슴=코랄, 등=코발트 …) 위에 올릴 전경색.
// 워시는 채도가 제각각이라 흰색을 고정하면 밝은 워시(태그선/민트)에서 대비가 무너진다.
// 색을 새로 만들지 않고 colors.ts의 onAccent 두 값(라이트 #FFFFFF / 다크 #021526) 중
// 대비가 높은 쪽만 고른다 — DESIGN.md의 "하드코딩 금지 + 색은 colors.ts 단일 출처" 준수.
function onWash(bg: string): string {
  return contrastRatio(bg, darkColors.onAccent) >= contrastRatio(bg, lightColors.onAccent)
    ? darkColors.onAccent
    : lightColors.onAccent;
}

// DESIGN.md Governance에 shadow.light가 unresolved로 기록돼 있어 확정 토큰이 없다.
// 값이 정해지면 이 상수를 토큰 참조로 교체할 것.
const LIGHT_SHADOW_SM = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 2,
};

// 모달 스크림. 계층 토큰이 아니라 화면 전체를 덮는 암막이라 별도 상수로 둔다.
const SCRIM = "rgba(0,0,0,0.5)";

/**
 * Renders the home screen with workout summaries, recent sessions, weekly muscle coverage, and workout controls.
 */
function HomeScreen() {
  const router = useRouter();
  const c = useColors();
  const { sessions, activeSession, startSession, fetchSessions, getTotalVolume } = useWorkoutStore(
    useShallow((s) => ({
      sessions: s.sessions,
      activeSession: s.activeSession,
      startSession: s.startSession,
      fetchSessions: s.fetchSessions,
      getTotalVolume: s.getTotalVolume,
    }))
  );
  const { user } = useAuthStore();
  const isDark = useThemeStore((s) => s.mode) === 'dark';
  const [filter, setFilter] = useState<string>('전체');
  // 홈에서 조회 중인 날짜 (기본 오늘). 헤더 ▼ 또는 주간 스트립 탭으로 변경.
  const [selectedDate, setSelectedDate] = useState<string>(() => toYMD(new Date()));
  const [showCalendar, setShowCalendar] = useState(false);
  const weekListRef = useRef<FlatList<string>>(null);
  const { width: winWidth } = useWindowDimensions();

  const fadeAnims = useRef([0, 1, 2].map(() => new Animated.Value(0))).current;
  const slideAnims = useRef([0, 1, 2].map(() => new Animated.Value(24))).current;

  useEffect(() => {
    fetchSessions();
    Animated.stagger(80, fadeAnims.map((fade, i) =>
      Animated.parallel([
        Animated.spring(fade, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 120 }),
        Animated.spring(slideAnims[i], { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 120 }),
      ])
    )).start();
  }, []);

  // DESIGN.md: 그림자는 라이트 모드에서만. 다크에서는 거의 보이지 않으므로
  // surface 명도 차이 + 1px 보더(CARD_EDGE)로 계층을 만든다.
  const SHADOW_SM = isDark ? null : LIGHT_SHADOW_SM;
  // 카드 경계 — 다크에서 그림자를 대신하는 유일한 수단.
  const CARD_EDGE = { borderWidth: 1, borderColor: c.border };

  // 캘린더 팝업 테마 (운동 화면과 동일 토큰 규칙)
  const calTheme = {
    calendarBackground: c.surface,
    textSectionTitleColor: c.textSecondary,
    selectedDayBackgroundColor: c.primary,
    selectedDayTextColor: c.onAccent,
    todayTextColor: c.primary,
    dayTextColor: c.textPrimary,
    textDisabledColor: c.textMuted,
    arrowColor: c.primary,
    monthTextColor: c.textPrimary,
    textDayFontWeight: "600" as const,
    textMonthFontWeight: "800" as const,
    textDayHeaderFontWeight: "600" as const,
  };

  // ── 카테고리 → 워시 색 (기존 코발트/태그 토큰만 사용) ──
  const categoryColor = (cat?: string): string => {
    switch (cat) {
      case '가슴': return c.tagCoral;
      case '등': return c.primary;
      case '하체': return c.tagMint;
      case '어깨': return c.tagSun;
      case '팔': return c.warning;
      case '복근': return c.secondary;
      default: return c.primary;
    }
  };

  // ── 이동 가능한 주 목록 (일요일 시작 YMD 오름차순, 마지막 = 이번 주) ──
  // 미래 주는 넣지 않는다. 미래 날짜는 이미 disabled라 7칸이 전부 비활성인
  // 스트립과 "이번 주 운동 0/4"라는 오해 소지 있는 요약만 남는다.
  // 과거 한계는 최초 세션이 속한 주다. User에 가입일 필드가 없어 sessions로 잡는다.
  const weeks = useMemo(() => {
    const curStart = getWeekRange(toYMD(new Date())).start;
    let firstStart = curStart;
    if (sessions.length > 0) {
      let earliest = sessions[0].date;
      for (const s of sessions) if (s.date < earliest) earliest = s.date;
      firstStart = getWeekRange(earliest).start;
    }
    // ∨ 달력에는 하한(minDate)이 없어 최초 세션보다 이전 날짜도 고를 수 있다.
    // 그 주가 목록에 없으면 weekIndex가 마지막으로 폴백해 헤더는 고른 주를,
    // 스트립은 이번 주를 가리키고 "오늘로"까지 숨는다. 범위를 넓혀 막는다.
    const selStart = getWeekRange(selectedDate).start;
    if (selStart < firstStart) firstStart = selStart;
    const out: string[] = [];
    const cur = new Date(firstStart);
    // 세션이 0개면 firstStart === curStart라 이번 주 하나만 담긴다.
    while (cur <= curStart) {
      out.push(toYMD(cur));
      cur.setDate(cur.getDate() + 7);
    }
    return out;
  }, [sessions, selectedDate]);

  // 표시 중인 주의 인덱스. selectedDate가 단일 출처라 별도 상태를 두지 않는다.
  const weekIndex = useMemo(() => {
    const startYMD = toYMD(getWeekRange(selectedDate).start);
    const i = weeks.indexOf(startYMD);
    return i >= 0 ? i : weeks.length - 1;
  }, [weeks, selectedDate]);

  const isCurrentWeek = weekIndex === weeks.length - 1;

  // ── 임의의 주(일~토) 스트립 데이터 생성 ──
  // FlatList의 각 셀이 자기 주를 그려야 해서 selectedDate 고정이 아니라 인자를 받는다.
  const weekDaysOf = useCallback((weekStartYMD: string) => {
    const realToday = new Date();
    realToday.setHours(0, 0, 0, 0);
    const realTodayYMD = toYMD(realToday);
    const sunday = new Date(weekStartYMD + 'T00:00:00');
    const DOW = ['일', '월', '화', '수', '목', '금', '토'];

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const ymd = toYMD(d);
      const daySessions = sessions.filter((s) => s.date === ymd);
      let total = 0, done = 0;
      for (const s of daySessions) {
        for (const ex of s.exercises) {
          for (const st of ex.sets) {
            total++;
            if (st.completed) done++;
          }
        }
      }
      // 세트가 없어도 세션이 있으면 완료로 간주(빈 링 방지)
      const pct = total > 0 ? done / total : daySessions.length > 0 ? 1 : 0;
      return {
        dow: DOW[i],
        num: d.getDate(),
        month: d.getMonth() + 1,             // a11y 라벨용 ("8월 26일 …")
        ymd,
        isSelected: ymd === selectedDate,   // 채운 알약 = 조회 중인 날짜
        isToday: ymd === realTodayYMD,       // 실제 오늘(작은 점 마커)
        isFuture: ymd > realTodayYMD,        // 미래는 데이터 없음/선택 불가
        hasSession: daySessions.length > 0,
        pct,
      };
    });
  }, [sessions, selectedDate]);

  // 주간 요약·PR·자극부위가 쓰는 "표시 중인 주"
  const weekDays = useMemo(
    () => weekDaysOf(weeks[weekIndex] ?? toYMD(getWeekRange(selectedDate).start)),
    [weekDaysOf, weeks, weekIndex, selectedDate]
  );

  // ── 주 이동 ──
  // selectedDate를 옮기는 것만으로 스트립·헤더·주간 집계가 전부 따라온다.
  // 착지일은 "같은 요일 유지, 단 오늘로 clamp".
  //   - 같은 요일: 주를 넘겨도 읽던 위치(예: 수요일)가 보존돼 주 간 비교가 쉽다.
  //   - clamp: 지난주 토요일을 보다 이번 주로 오면 같은 요일이 미래가 되는데,
  //     미래 날짜는 disabled라 "비활성인데 선택됨" 모순이 생긴다. 과거 주는
  //     전부 오늘 이전이라 clamp가 걸리지 않고 이번 주에서만 작동한다.
  const dayInWeek = (weekStartYMD: string) => {
    const dow = new Date(selectedDate + 'T00:00:00').getDay();
    const d = new Date(weekStartYMD + 'T00:00:00');
    d.setDate(d.getDate() + dow);
    const todayYMD = toYMD(new Date());
    const ymd = toYMD(d);
    return ymd > todayYMD ? todayYMD : ymd;
  };

  const goToWeek = (index: number) => {
    const clamped = Math.max(0, Math.min(weeks.length - 1, index));
    setSelectedDate(dayInWeek(weeks[clamped]));
  };

  // 목록 위치를 weekIndex에 맞춘다. 두 경우에 필요하다.
  //   1) sessions가 비동기라 첫 렌더에는 weeks가 [이번 주] 하나뿐이다. 로드 후
  //      weeks가 앞으로 늘어나면 initialScrollIndex(0)가 가리키던 칸이 최초 주로
  //      밀려 이번 주가 아닌 곳이 보인다.
  //   2) "오늘로"와 accessibilityActions는 selectedDate만 바꾸므로 목록이 따라와야 한다.
  // 스와이프로 온 경우엔 이미 인덱스가 같아 no-op이다.
  useEffect(() => {
    if (weeks.length === 0) return;
    weekListRef.current?.scrollToIndex({ index: weekIndex, animated: false });
  }, [weekIndex, weeks.length]);

  // 이번 주 운동한 일수 / 목표
  const doneDays = weekDays.filter((d) => d.hasSession).length;
  const weekGoal = user?.weeklyGoal ?? 4;

  const { prEntry, prSessionDate, weekMuscles } = useMemo(() => {
    const { start, end } = getWeekRange(selectedDate);

    const weekSessions = sessions.filter((s) => {
      const dd = new Date(s.date + "T00:00:00");
      return dd >= start && dd <= end;
    });
    const prevSessions = sessions.filter((s) => new Date(s.date + "T00:00:00") < start);

    // PR 비교: 통계 화면과 동일하게 kg 환산 + 완료 세트(weight>0 && reps>0) 기준
    const prevMax: Record<string, number> = {};
    for (const sess of prevSessions) {
      for (const ex of sess.exercises) {
        for (const st of ex.sets) {
          if (st.weight <= 0 || st.reps <= 0) continue;
          const wKg = toKg(st.weight, st.unit);
          if (wKg > (prevMax[ex.name] ?? 0)) prevMax[ex.name] = wKg;
        }
      }
    }

    let prEntry: { name: string; weight: number; reps: number; date: string } | null = null;
    for (const sess of [...weekSessions].sort((a, b) => b.date.localeCompare(a.date))) {
      for (const ex of sess.exercises) {
        let best: { weightKg: number; reps: number } | null = null;
        for (const st of ex.sets) {
          if (st.weight <= 0 || st.reps <= 0) continue;
          const wKg = toKg(st.weight, st.unit);
          if (!best || wKg > best.weightKg) best = { weightKg: wKg, reps: st.reps };
        }
        if (best && best.weightKg > (prevMax[ex.name] ?? 0)) {
          if (!prEntry) prEntry = { name: ex.name, weight: best.weightKg, reps: best.reps, date: sess.date };
        }
      }
    }

    const weekMuscleSet = new Set<string>();
    for (const sess of weekSessions) {
      for (const ex of sess.exercises) {
        const slugs = MUSCLE_MAP[ex.name] ?? CATEGORY_TO_SLUGS[ex.category ?? ''] ?? [];
        for (const s of slugs) weekMuscleSet.add(s);
      }
    }

    return { prEntry, prSessionDate: prEntry?.date ?? null, weekMuscles: Array.from(weekMuscleSet) };
  }, [sessions, selectedDate]);

  // ── 최근 기록 (완료 세션, 필터 적용) ──
  const recentSessions = useMemo(() => {
    const completed = sessions
      .filter((s) => !activeSession || s.id !== activeSession.id)
      .sort((a, b) => b.date.localeCompare(a.date));
    const filtered = filter === '전체'
      ? completed
      : completed.filter((s) => s.exercises.some((e) => e.category === filter));
    return filtered.slice(0, 6);
  }, [sessions, activeSession, filter]);
  const recentTotal = useMemo(
    () => sessions.filter((s) => !activeSession || s.id !== activeSession.id).length,
    [sessions, activeSession]
  );

  const weekMuscleSet = new Set(weekMuscles);
  const majorHit = MAJOR_MUSCLES.filter((m) => weekMuscleSet.has(m)).length;
  const missingMajor = MAJOR_MUSCLES.find(m => !weekMuscleSet.has(m));
  const muscleHint = weekMuscles.length === 0
    ? "이번 주 첫 운동을 기록해보세요"
    : missingMajor
      ? `${MUSCLE_LABELS[missingMajor as Slug] ?? missingMajor}${eunNeun(MUSCLE_LABELS[missingMajor as Slug] ?? missingMajor)} 이번 주 아직이에요!`
      : "전신 골고루 자극했어요!";

  // 주 단위 뷰이므로 라벨도 주 범위로 말한다. 같은 달이면 뒤쪽 "N월"을 생략한다.
  const weekRangeTitle = (() => {
    const { start, end } = getWeekRange(selectedDate);
    const sM = start.getMonth() + 1, sD = start.getDate();
    const eM = end.getMonth() + 1, eD = end.getDate();
    return sM === eM
      ? `${sM}월 ${sD}일 - ${eD}일`
      : `${sM}월 ${sD}일 - ${eM}월 ${eD}일`;
  })();

  const startWorkout = () => {
    if (!activeSession) startSession();
    router.push("/(tabs)/workout");
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {/* ── 헤더: 주 범위 + (이번 주가 아니면) 오늘로 + 테마토글 + 아바타 ── */}
      <View style={{ paddingHorizontal: 16, paddingTop: 60, paddingBottom: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        {/* 걸친 주("8월 30일 - 9월 5일") + "오늘로"가 동시에 뜨면 375에서 빠듯하다.
            flexShrink로 제목이 먼저 줄고, numberOfLines로 우측 아이콘을 밀지 않는다. */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 1 }}>
          <TouchableOpacity
            style={{ flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1 }}
            onPress={() => setShowCalendar(true)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="날짜 선택 달력 열기">
            {/* display 22/900 */}
            <Text
              numberOfLines={1}
              style={{ fontSize: 22, fontWeight: "900", color: c.textPrimary, letterSpacing: -0.5, flexShrink: 1 }}>
              {weekRangeTitle}
            </Text>
            <Icon name="chevronDown" size={18} color={c.textPrimary} />
          </TouchableOpacity>
          {/* 달력 모달의 "오늘로"와 같은 스펙 (14/800, primary, minHeight 44) */}
          {!isCurrentWeek && (
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="오늘 날짜로 이동"
              onPress={() => setSelectedDate(toYMD(new Date()))}
              style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 4 }}>
              <Text style={{ fontSize: 14, fontWeight: "800", color: c.primary }}>오늘로</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ThemeToggle size={38} />
          <TouchableOpacity activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="프로필 편집"
            style={[{ width: 46, height: 46, borderRadius: 16, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }, SHADOW_SM]}
            onPress={() => router.push("/modal/edit-profile" as any)}>
            <FaceAvatar size={28} color={c.onAccent} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 주간 스트립 (일~토, 완료도 링). 좌우 스와이프로 주 이동 ── */}
      <View style={{ paddingTop: 6, paddingBottom: 10 }}>
        <FlatList
          ref={weekListRef}
          data={weeks}
          keyExtractor={(w) => w}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          // DESIGN.md §5: FlatList는 렌더 예산을 명시한다. 한 셀이 화면 한 폭이라
          // 한 번에 1장만 보이고, 좌우 인접 주만 미리 그려 두면 충분하다.
          initialNumToRender={1}
          maxToRenderPerBatch={3}
          windowSize={3}
          initialScrollIndex={weekIndex}
          // getItemLayout이 있어야 initialScrollIndex와 scrollToIndex가
          // 측정 없이 바로 동작한다(onScrollToIndexFailed 불필요).
          getItemLayout={(_, i) => ({ length: winWidth, offset: winWidth * i, index: i })}
          onMomentumScrollEnd={(e) => {
            const i = Math.round(e.nativeEvent.contentOffset.x / winWidth);
            if (i !== weekIndex) goToWeek(i);
          }}
          renderItem={({ item }) => (
            <View style={{ width: winWidth, flexDirection: "row", paddingHorizontal: 16, gap: 2 }}>
              {weekDaysOf(item).map((d) => {
                const R = 16, CIRC = 2 * Math.PI * R;
                const isSun = d.dow === '일';
                return (
                  <TouchableOpacity
                    key={d.ymd}
                    style={{ flex: 1, alignItems: "center", gap: 6 }}
                    activeOpacity={d.isFuture ? 1 : 0.7}
                    disabled={d.isFuture}
                    accessibilityRole="button"
                    accessibilityState={{ selected: d.isSelected, disabled: d.isFuture }}
                    // VoiceOver가 켜지면 좌우 스와이프는 요소 간 이동에 가로채여
                    // 주 이동이 불가능해진다. 그 대체 경로를 액션 로터로 연다.
                    // 회귀 방지: 이 액션을 스트립 컨테이너로 올리지 말 것.
                    // 컨테이너는 accessible={false}여야 날짜 셀이 개별 포커스를
                    // 받는데, 포커스할 수 없는 요소의 액션은 도달할 수 없다.
                    accessibilityActions={[
                      { name: 'increment', label: '다음 주' },
                      { name: 'decrement', label: '이전 주' },
                    ]}
                    onAccessibilityAction={(e) => {
                      if (e.nativeEvent.actionName === 'increment') goToWeek(weekIndex + 1);
                      else if (e.nativeEvent.actionName === 'decrement') goToWeek(weekIndex - 1);
                    }}
                    accessibilityLabel={
                      `${d.month}월 ${d.num}일 ${d.dow}요일` +
                      (d.isToday ? ', 오늘' : '') +
                      (d.hasSession ? ', 운동 기록 있음' : '') +
                      (d.isFuture ? ', 선택할 수 없음' : d.isSelected ? ', 선택됨' : '')
                    }
                    onPress={() => setSelectedDate(d.ymd)}>
                    {/* caption 12/600 */}
                    <Text style={{ fontSize: 12, fontWeight: "600", color: isSun ? c.tagCoral : c.textSecondary }}>{d.dow}</Text>
                    <View style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
                      {d.isSelected ? (
                        <View style={{ position: "absolute", width: 36, height: 36, borderRadius: 999, backgroundColor: c.primary }} />
                      ) : !d.isFuture && d.pct > 0 ? (
                        <Svg width={40} height={40} style={{ position: "absolute" }}>
                          <Circle cx={20} cy={20} r={R} fill="none" stroke={c.surfaceHigh} strokeWidth={3.5} />
                          <Circle
                            cx={20} cy={20} r={R} fill="none" stroke={c.primary} strokeWidth={3.5}
                            strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={CIRC * (1 - d.pct)}
                            transform="rotate(-90 20 20)"
                          />
                        </Svg>
                      ) : null}
                      {/* numeric 15/800 + tabular-nums — 주간 스트립이 넘어가도 자릿수가 흔들리지 않게 */}
                      <Text style={{
                        fontSize: 15,
                        fontWeight: "800",
                        fontVariant: ["tabular-nums"],
                        color: d.isSelected ? c.onAccent : d.isFuture ? c.textMuted : c.textPrimary,
                      }}>
                        {d.num}
                      </Text>
                      {/* 실제 오늘(선택 안 된 상태) 표시 점 */}
                      {d.isToday && !d.isSelected && (
                        <View style={{ position: "absolute", bottom: 0, width: 4, height: 4, borderRadius: 2, backgroundColor: c.primary }} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        /* 좌우 여백은 여기 한 번만 (space.16). 섹션 사이는 부모 gap(space.20)이 만든다. */
        /* 하단 여백은 ActiveWorkoutBar가 뜰 때만 필요하다. 그 바는 화면 하단
           116~174pt를 차지하고 콘텐츠 영역은 탭바 위에서 끝나므로 실제 가려지는
           높이는 약 68pt다. 평상시 40은 stats·workout과 같은 값이다.
           회귀 방지: 상수 120으로 되돌리지 말 것 — 운동 중이 아닐 때 80pt가 죽는다. */
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: activeSession ? 80 : 40, gap: 20 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">

        {/* ── 요약 알약 + 필터 칩 ── */}
        <Animated.View style={{ opacity: fadeAnims[0], transform: [{ translateY: slideAnims[0] }], gap: 12 }}>
          <TouchableOpacity
            style={[{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.surface, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16 }, CARD_EDGE, SHADOW_SM]}
            onPress={() => router.push("/(tabs)/stats")}
            accessibilityRole="button"
            accessibilityLabel={`이번 주 운동 ${doneDays}일, 목표 ${weekGoal}일. 통계 보기`}
            activeOpacity={0.7}>
            <FlameIcon size={18} />
            {/* body-strong 14/800 */}
            <Text style={{ fontSize: 14, fontWeight: "800", color: c.textPrimary, flex: 1, letterSpacing: -0.3 }}>이번 주 운동</Text>
            {/* numeric 15/800 */}
            <Text style={{ fontSize: 15, fontWeight: "800", color: c.primary, fontVariant: ["tabular-nums"] }}>{doneDays}/{weekGoal}</Text>
            <Icon name="chevronRight" size={16} color={c.textMuted} />
          </TouchableOpacity>

          {/* 회귀 방지: 홈 화면에 진입 경로 필수. 재작업 시 이 버튼 삭제 금지.
              routine-manage.tsx로 가는 유일한 홈 화면 진입점.
              activeSession 여부와 무관하게 항상 표시한다 — 운동 중에도 루틴을 편집할 수 있어야 한다.
              (운동 시작 FAB만 activeSession일 때 숨는다) */}
          <TouchableOpacity
            style={[{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.surface, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 16 }, CARD_EDGE, SHADOW_SM]}
            onPress={() => router.push("/modal/routine-manage" as any)}
            accessibilityRole="button"
            accessibilityLabel="루틴 관리 열기"
            activeOpacity={0.7}>
            <Icon name="list" size={18} color={c.textSecondary} />
            {/* body-strong 14/800 — 위 요약 카드와 같은 폼팩터 */}
            <Text style={{ fontSize: 14, fontWeight: "800", color: c.textPrimary, flex: 1, letterSpacing: -0.3 }}>루틴 관리</Text>
            <Icon name="chevronRight" size={16} color={c.textMuted} />
          </TouchableOpacity>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 4 }}>
            {['전체', ...FILTER_CATEGORIES].map((cat) => {
              const on = filter === cat;
              const label = cat === '전체' ? `전체 ${recentTotal}` : cat;
              return (
                <TouchableOpacity
                  key={cat}
                  onPress={() => setFilter(cat)}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                  accessibilityLabel={`${cat} 필터`}
                  style={{
                    minHeight: 44,
                    justifyContent: "center",
                    paddingHorizontal: 16,
                    borderRadius: 999,
                    backgroundColor: on ? c.textPrimary : c.surface,
                    borderWidth: 1,
                    borderColor: on ? c.textPrimary : c.border,
                  }}>
                  {/* caption 12/600 */}
                  <Text style={{ fontSize: 12, fontWeight: "600", color: on ? c.background : c.textSecondary, letterSpacing: -0.2 }}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* ── 최근 기록 (상단 색 워시 카드 그리드) ── */}
        <Animated.View style={{ opacity: fadeAnims[1], transform: [{ translateY: slideAnims[1] }] }}>
          {/* 섹션 헤더는 카드와 좌우를 맞춘다 — 개별 paddingHorizontal 없이 부모 여백만 쓴다 */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 12 }}>
            <Icon name="trophy" size={17} color={c.tagSun} />
            {/* title 17/800 */}
            <Text style={{ fontSize: 17, fontWeight: "800", color: c.textPrimary, letterSpacing: -0.4 }}>최근 기록</Text>
            {/* numeric 15/800 */}
            <Text style={{ fontSize: 15, fontWeight: "800", color: c.textSecondary, fontVariant: ["tabular-nums"] }}>{recentSessions.length}</Text>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="운동 기록 전체 보기"
              style={{ flexDirection: "row", alignItems: "center", gap: 2, minHeight: 44 }}
              onPress={() => router.push("/(tabs)/stats")}>
              {/* micro 11/700 */}
              <Text style={{ fontSize: 11, fontWeight: "700", color: c.primary }}>전체 보기</Text>
              <Icon name="chevronRight" size={12} color={c.primary} />
            </TouchableOpacity>
          </View>

          {recentSessions.length > 0 ? (
            /* 세로 간격은 부모 rowGap(space.12)이 만든다 — 카드마다 marginBottom 금지 */
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 }}>
              {recentSessions.map((s) => {
                const cat = s.exercises[0]?.category;
                const wash = categoryColor(cat);
                // 배지 알약은 워시를 40% 어둡게 — 이 지점부터 모든 카테고리에서
                // 전경색 대비가 5.15:1 이상으로 확보된다(0.2에서는 4.36까지 떨어짐).
                const badgeBg = darken(wash, 0.4);
                const isPR = !!prSessionDate && s.date === prSessionDate;
                const badge = isPR ? "PR" : `${s.exercises.length}종목`;
                return (
                  <View key={s.id} style={[{ width: "48%", backgroundColor: c.surface, borderRadius: 16, overflow: "hidden" }, CARD_EDGE, SHADOW_SM]}>
                    {/* 상단 색 워시 밴드 — 카테고리 식별용 색 면.
                        본문 텍스트는 올리지 않는다: 워시는 채도가 제각각이라 흰색·먹색 어느 쪽으로도
                        4.5:1을 보장할 수 없다(등/라이트 #1E7AEA가 최대 4.42). 텍스트는 전부 아래 L2 블록으로 내렸다. */}
                    <View style={{ backgroundColor: wash, paddingHorizontal: 12, paddingTop: 12, paddingBottom: 26 }}>
                      <View style={{ alignSelf: "flex-start", backgroundColor: badgeBg, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                        {/* micro 11/700 */}
                        <Text style={{ fontSize: 11, fontWeight: "700", color: onWash(badgeBg) }}>{badge}</Text>
                      </View>
                    </View>
                    {/* 본문 — 카드(L1) 위에 겹치는 중첩 블록이라 surface-alt(L2)로 한 계단 올린다 */}
                    <View style={{ paddingHorizontal: 12, paddingBottom: 12, marginTop: -14 }}>
                      <View style={{ backgroundColor: c.surfaceAlt, borderRadius: 12, padding: 12, gap: 6 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Icon name="dumbbell" size={15} color={wash} />
                          {/* body-strong 14/800 */}
                          <Text style={{ flex: 1, fontSize: 14, fontWeight: "800", color: c.textPrimary, lineHeight: 20 }} numberOfLines={2}>
                            {sessionTitle(s)}
                          </Text>
                        </View>
                        <View style={{ flexDirection: "row", alignItems: "baseline", gap: 6 }}>
                          {/* numeric 15/800 — 숫자가 라벨보다 커야 "숫자가 주인공" 원칙에 맞는다 */}
                          <Text style={{ fontSize: 15, fontWeight: "800", color: c.textPrimary, fontVariant: ["tabular-nums"] }}>
                            {fmtVol(getTotalVolume(s))}
                          </Text>
                          {/* caption 12/600 — 워시 위에 있던 날짜를 여기로 내렸다 */}
                          <Text style={{ fontSize: 12, fontWeight: "600", color: c.textSecondary }}>
                            {formatDate(s.date)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={[{ backgroundColor: c.surface, borderRadius: 16, padding: 24, alignItems: "center" }, CARD_EDGE, SHADOW_SM]}>
              <Icon name="dumbbell" size={32} color={c.textMuted} />
              {/* caption 12/600 */}
              <Text style={{ fontSize: 12, fontWeight: "600", color: c.textSecondary, marginTop: 12 }}>
                {filter === '전체' ? "아직 운동 기록이 없어요" : `${filter} 운동 기록이 없어요`}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* ── 이번 주 자극 부위 (MuscleMap 재사용) ── */}
        <Animated.View style={{ opacity: fadeAnims[2], transform: [{ translateY: slideAnims[2] }], overflow: 'visible' }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingBottom: 12 }}>
            <Icon name="dumbbell" size={17} color={c.primary} />
            {/* title 17/800 */}
            <Text style={{ fontSize: 17, fontWeight: "800", color: c.textPrimary, letterSpacing: -0.4 }}>이번 주 자극 부위</Text>
            {/* numeric 15/800 */}
            <Text style={{ fontSize: 15, fontWeight: "800", color: c.textSecondary, fontVariant: ["tabular-nums"] }}>{majorHit}/{MAJOR_MUSCLES.length}</Text>
          </View>
          <View style={[{ backgroundColor: c.surface, borderRadius: 16, padding: 16, overflow: 'visible' }, CARD_EDGE, SHADOW_SM]}>
            <MuscleMap muscles={weekMuscles} scale={0.55} />
            {/* 색만으로 전달 금지 — 상태를 아이콘 + 텍스트로 함께 표시한다 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.border }}>
              <Icon
                name={weekMuscles.length === 0 ? "dumbbell" : missingMajor ? "target" : "check"}
                size={13}
                color={weekMuscles.length === 0 ? c.textMuted : missingMajor ? c.warning : c.success}
              />
              {/* caption 12/600. 의미색은 아이콘이 지고 본문은 text-secondary —
                  라이트 테마에서 warning/success는 카드 위 3.5:1 미만이라 본문 색으로 쓰지 않는다. */}
              <Text style={{ fontSize: 12, fontWeight: '600', color: c.textSecondary }}>
                {muscleHint}
              </Text>
            </View>
          </View>
        </Animated.View>

      </ScrollView>

      {/* ── FAB: "▶ 운동 시작" 확장 알약 ──
          운동 중(activeSession)일 땐 숨김 → 하단 ActiveWorkoutBar가 "계속하기" 역할.
          홈에서 실수로 새 세션 시작하는 것을 방지. */}
      {!activeSession && (
        <TouchableOpacity
          onPress={startWorkout}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="운동 시작"
          style={[
            {
              position: "absolute",
              right: 16,
              bottom: 28,
              minHeight: 52,
              borderRadius: 999,
              paddingLeft: 18,
              paddingRight: 20,
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              backgroundColor: c.primary,
            },
            // DESIGN.md: 그림자는 라이트 모드에서만. 다크에서 컬러 글로우를 쓰던 것을 제거했다.
            // 다크에서는 primary 자체가 배경(#171B21) 대비 4.58:1이라 글로우 없이도 충분히 도드라진다.
            !isDark && {
              shadowColor: c.primary,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.35,
              shadowRadius: 14,
              elevation: 6,
            },
          ]}>
          <Icon name="play" size={18} color={c.onAccent} />
          {/* body-strong 14/800 — workout.tsx의 재시도 버튼과 동일 역할 */}
          <Text style={{ fontSize: 14, fontWeight: "800", color: c.onAccent }}>운동 시작</Text>
        </TouchableOpacity>
      )}

      {/* ── 날짜 선택 캘린더 (헤더 ▼ / 주간 스트립에서 오픈) ── */}
      <Modal
        visible={showCalendar}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCalendar(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: SCRIM, justifyContent: "center" }}
          activeOpacity={1}
          accessibilityRole="button"
          accessibilityLabel="달력 닫기"
          onPress={() => setShowCalendar(false)}>
          {/* 달력 영역 탭은 닫힘 전파 차단 */}
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ marginHorizontal: 16 }}>
            {/* 시트/모달 컨테이너는 surface. surfaceHigh는 계단이 아니라 인라인 요소
                채움용이고(트랙·링·그래버), 라이트에서는 캔버스보다 어두워 시트가
                가라앉아 보인다. radius는 radius.sheet(24). */}
            <View style={[{ backgroundColor: c.surface, borderRadius: 24, padding: 12, overflow: "hidden" }, CARD_EDGE]}>
              <Calendar
                current={selectedDate}
                maxDate={toYMD(new Date())}
                onDayPress={(day) => {
                  setSelectedDate(day.dateString);
                  setShowCalendar(false);
                }}
                markedDates={{ [selectedDate]: { selected: true, selectedColor: c.primary } }}
                theme={calTheme}
              />
              <TouchableOpacity activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="오늘 날짜로 이동"
                onPress={() => { setSelectedDate(toYMD(new Date())); setShowCalendar(false); }}
                style={{ alignSelf: "center", marginTop: 6, minHeight: 44, justifyContent: "center", paddingHorizontal: 16 }}>
                {/* body-strong 14/800 */}
                <Text style={{ fontSize: 14, fontWeight: "800", color: c.primary }}>오늘로</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// 화면별 ErrorBoundary로 감싼다 — 홈 렌더 중 예외가 나도 앱 전체가 죽지 않고
// 이 화면만 폴백 UI로 대체된다(다른 탭은 계속 사용 가능). 바운더리는 반드시
/**
 * Renders the home screen with error isolation.
 *
 * @returns The home screen wrapped in an error boundary.
 */
export default function HomeScreenRoute() {
  return (
    <ErrorBoundary screenName="홈">
      <HomeScreen />
    </ErrorBoundary>
  );
}
