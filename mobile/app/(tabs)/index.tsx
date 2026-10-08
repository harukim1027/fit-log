import React, { useCallback, useEffect, useRef, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  FlatList,
  useWindowDimensions,
} from "react-native";
import type { TextStyle } from "react-native";
import Svg, { Circle, Line, Polyline } from "react-native-svg";
import { Calendar } from "react-native-calendars";
import { useRouter } from "expo-router";
import { useWorkoutStore } from "../../store/workoutStore";
import { useAuthStore } from "../../store/authStore";
import { useRoutineStore } from "../../store/routineStore";
import { useRestDayStore } from "../../store/restDayStore";
import { useShallow } from "zustand/react/shallow";
import { Icon } from "../../components/AppIcons";
import { useColors } from "../../constants/colors";
import { localDateStr, getWeekRange } from "../../utils/date";
import { useThemeStore } from "../../store/themeStore";
import { ThemeToggle } from "../../components/ui";
import { MUSCLE_MAP, CATEGORY_TO_SLUGS, MAJOR_MUSCLES, MAJOR_MUSCLE_LABELS } from "../../components/MuscleMap";
import type { WorkoutSession } from "../../types/workout";
import { eunNeun } from "../../utils/korean";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { showCuteAlert } from "../../components/CuteAlert";
import { IconButton } from "../../design-system";

// toYMD·getWeekRange 는 utils/date.ts 로 옮겼다. 통계에도 같은 이름의 함수가
// 따로 있었고 주 시작 요일이 서로 달랐다(홈 일요일 / 통계 월요일).
// 주 시작 규칙은 이제 utils/date.ts 한 곳에만 있다.

// ── 타입 7역할 (DESIGN.md §3) ────────────────────────────────────────────────
// 새 크기를 만들지 않는다. 위계가 더 필요하면 굵기로 먼저 해결한다.
/** 숫자는 항상 고정폭이다 — 스트립·타일이 바뀌어도 자릿수가 흔들리지 않게. */
const TABULAR: TextStyle["fontVariant"] = ["tabular-nums"];

const T = {
  display:     { fontSize: 22, fontWeight: "900" as const, letterSpacing: -0.4 },
  title:       { fontSize: 17, fontWeight: "800" as const, letterSpacing: -0.2 },
  numeric:     { fontSize: 15, fontWeight: "800" as const, fontVariant: TABULAR },
  body:        { fontSize: 14, fontWeight: "600" as const },
  bodyStrong:  { fontSize: 14, fontWeight: "800" as const },
  caption:     { fontSize: 12, fontWeight: "600" as const },
  micro:       { fontSize: 11, fontWeight: "700" as const, letterSpacing: 0.2 },
};

/** "10월 8일(수)" — 헤더. 주 범위는 캘린더 카드가 따로 말한다. */
function headerDate(ymd: string): string {
  const d = new Date(ymd + "T00:00:00");
  const DOW = ["일", "월", "화", "수", "목", "금", "토"];
  return `${d.getMonth() + 1}월 ${d.getDate()}일(${DOW[d.getDay()]})`;
}

function shortDate(ymd: string): string {
  const d = new Date(ymd + "T00:00:00");
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function dowLabel(ymd: string): string {
  const DOW = ["일", "월", "화", "수", "목", "금", "토"];
  return `${DOW[new Date(ymd + "T00:00:00").getDay()]}요일`;
}

function sessionTitle(sess: WorkoutSession): string {
  const names = sess.exercises.slice(0, 2).map((e) => e.category || e.name);
  return names.join(" & ") || "운동";
}

/** 볼륨 포맷: 1000kg 이상은 t(톤) 축약. 값과 단위를 분리해 돌려준다. */
function splitVol(kg: number): { value: string; unit: string } {
  return kg >= 1000
    ? { value: (kg / 1000).toFixed(1), unit: "t" }
    : { value: String(Math.round(kg)), unit: "kg" };
}

/**
 * 사용자 루틴 색을 **연한 배경으로만** 쓰기 위한 알파 접미.
 *
 * 루틴 색은 사용자가 고른 값이라 colors.ts 토큰이 아니다. 그래서 글자색으로
 * 쓰면 대비를 보장할 수 없다(라이트 흰 카드 위 3.19~4.42까지 떨어진다).
 * DESIGN.md 의 "의미색은 비텍스트에 싣는다"를 그대로 적용해 **배경에만** 얹고
 * 글자는 언제나 textPrimary 로 둔다. 점(dot)도 쓰지 않는다 — 점은 색만으로
 * 뜻을 전달하는 장치라 색각 이상 사용자에게 아무것도 전하지 못한다.
 *
 * 라이트는 18%('2E'), 다크는 25%('40'). 다크가 더 진한 이유는 캔버스가
 * 어두워 같은 알파로는 색이 묻히기 때문이다.
 */
function routineWash(color: string | undefined, isDark: boolean, fallback: string): string {
  const base = color && /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;
  return base + (isDark ? "40" : "2E");
}

/**
 * 휴식 표기용 빗금. **모든 화면에서 같은 모양을 쓴다**(캘린더 막대 · 다음 운동 카드).
 * surfaceHigh 4px / 투명 4px, 135°.
 *
 * RN 에는 repeating-linear-gradient 가 없어 SVG Pattern 으로 그린다.
 * 패턴 타일을 8×8 로 두고 대각선 두 줄을 그어 4/4 간격을 만든다.
 */
function Hatch({ width, height, color }: { width: number; height: number; color: string }) {
  // SVG `<Pattern>` 은 쓰지 않는다 — react-native-svg 에서 patternTransform 이
  // 적용되지 않아 빗금이 아예 그려지지 않았다(실측). 선을 직접 반복해 긋고
  // 모서리는 **부모 View 의 overflow:"hidden" + borderRadius** 가 잘라 준다.
  //
  // 135° 는 x 가 커질수록 y 가 작아지는 방향이다. 수직 간격 8(= 채움 4 + 빈 4)을
  // 만들려면 x 축 간격은 8 × √2 ≈ 11.31 이다.
  const STEP = 11.31;
  const lines: number[] = [];
  for (let x = -height; x < width + height; x += STEP) lines.push(x);
  return (
    <Svg width={width} height={height} style={{ position: "absolute", left: 0, top: 0 }}>
      {lines.map((x) => (
        <Line key={x} x1={x} y1={height} x2={x + height} y2={0} stroke={color} strokeWidth={4} />
      ))}
    </Svg>
  );
}

/**
 * 목표 스테퍼의 [−] / [+] 한 칸.
 *
 * **가로는 box(44), 세로는 32 + hitSlop 6** 이다.
 *   가로를 box 로 잡은 이유: hitSlop 으로 44를 만들면 두 버튼의 슬롭이
 *   겹칠 수 있고, 겹친 구간은 나중에 렌더된 쪽이 가져간다(IconButton 밀집
 *   행에서 겪은 문제와 같다). 44 박스면 구조적으로 겹칠 수가 없다.
 *
 * 박스 전체가 아니라 이 버튼만 터치에 반응한다 — 점선 박스가 통째로
 * 반응하면 스크롤하려고 손을 얹은 것도 탭이 된다.
 */
function GoalStep({
  dir, disabled, onPress, c,
}: {
  dir: 1 | -1;
  disabled: boolean;
  onPress: () => void;
  c: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      disabled={disabled}
      onPress={onPress}
      hitSlop={{ top: 6, bottom: 6, left: 0, right: 0 }}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      accessibilityLabel={dir > 0 ? "주간 목표 늘리기" : "주간 목표 줄이기"}
      style={{
        width: 44, height: 32, alignItems: "center", justifyContent: "center",
        opacity: disabled ? 0.5 : 1,
      }}>
      {/* 조작 가능하다는 신호는 **보더**가 진다. 글리프에 primary 를 쓰면
          WCAG large-text(18.66 bold)에 못 미쳐 4.5:1 이 필요한데 primary on
          surface 는 라이트 4.18 / 다크 3.99 로 미달이다. DESIGN.md 대로
          의미색을 비텍스트(보더)에 싣고 글자는 text-primary 로 둔다. */}
      <View
        style={{
          width: 26, height: 24, borderRadius: 8, borderWidth: 1,
          borderColor: disabled ? c.border : c.primary,
          alignItems: "center", justifyContent: "center",
        }}>
        <Text style={{ ...T.numeric, color: c.textPrimary, lineHeight: 18 }}>
          {dir > 0 ? "+" : "−"}
        </Text>
      </View>
    </TouchableOpacity>
  );
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

function HomeScreen() {
  const router = useRouter();
  const c = useColors();
  const { sessions, activeSession, startSession, fetchSessions, getTotalVolume, setHistoryJumpDate } = useWorkoutStore(
    useShallow((s) => ({
      sessions: s.sessions,
      activeSession: s.activeSession,
      startSession: s.startSession,
      fetchSessions: s.fetchSessions,
      setHistoryJumpDate: s.setHistoryJumpDate,
      getTotalVolume: s.getTotalVolume,
    }))
  );
  const { routines, loadRoutines } = useRoutineStore(
    useShallow((s) => ({ routines: s.routines, loadRoutines: s.loadRoutines }))
  );
  const { restDays, fetchRestDays } = useRestDayStore(
    useShallow((s) => ({ restDays: s.restDays, fetchRestDays: s.fetchRestDays }))
  );
  const { user, updateProfile } = useAuthStore();
  const isDark = useThemeStore((s) => s.mode) === "dark";
  // 홈에서 조회 중인 날짜 (기본 오늘). 헤더 캘린더 또는 주간 스트립 탭으로 변경.
  const [selectedDate, setSelectedDate] = useState<string>(() => localDateStr(new Date()));
  const [showCalendar, setShowCalendar] = useState(false);
  /** 운동량 섹션의 범위. 주간이 기본이다. */
  const [range, setRange] = useState<"week" | "month">("week");
  const weekListRef = useRef<FlatList<string>>(null);
  const { width: winWidth } = useWindowDimensions();
  // 주 목록의 과거 하한을 늘리기만 하는 앵커 (달력이 범위 밖을 고른 경우)
  const [pastAnchor, setPastAnchor] = useState<string | null>(null);
  // 스와이프로 온 이동은 목록이 이미 그 자리에 있으므로 동기화를 건너뛴다.
  const skipSyncRef = useRef(false);

  useEffect(() => {
    fetchSessions();
    loadRoutines().catch(() => {});
    fetchRestDays().catch(() => {});
  }, []);

  // DESIGN.md: 그림자는 라이트 모드에서만. 다크에서는 거의 보이지 않으므로
  // surface 명도 차이 + 1px 보더(CARD_EDGE)로 계층을 만든다.
  const SHADOW_SM = isDark ? null : LIGHT_SHADOW_SM;
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

  /** 세션 → 루틴. 루틴 색과 이름의 단일 출처다. */
  const routineOf = useCallback(
    (s: WorkoutSession) => (s.fromRoutineId ? routines.find((r) => r.id === s.fromRoutineId) : undefined),
    [routines]
  );

  // ── 이동 가능한 주 목록 (일요일 시작 YMD 오름차순, 마지막 = 이번 주) ──
  // 미래 주는 넣지 않는다. 미래 날짜는 이미 disabled라 7칸이 전부 비활성인
  // 스트립과 오해 소지 있는 요약만 남는다.
  // 회귀 방지: 이 useMemo의 의존성에 selectedDate를 넣지 말 것.
  // 넣으면 앞으로 이동할 때마다 하한이 따라 올라와 배열이 줄고, 지나온 주가
  // 사라져 뒤로 돌아갈 수 없다(연속 이동이 멈추던 원인).
  const weeks = useMemo(() => {
    const curStart = getWeekRange(localDateStr(new Date())).start;
    let firstStart: Date;
    if (sessions.length > 0) {
      let earliest = sessions[0].date;
      for (const s of sessions) if (s.date < earliest) earliest = s.date;
      firstStart = getWeekRange(earliest).start;
    } else {
      // 볼 기록이 없어도 좌우 이동이 죽은 컨트롤이 되지 않도록 최근 4주를 연다.
      firstStart = new Date(curStart);
      firstStart.setDate(firstStart.getDate() - 7 * 4);
    }
    if (pastAnchor) {
      const a = new Date(pastAnchor + "T00:00:00");
      if (a < firstStart) firstStart = a;
    }
    const out: string[] = [];
    const cur = new Date(firstStart);
    while (cur <= curStart) {
      out.push(localDateStr(cur));
      cur.setDate(cur.getDate() + 7);
    }
    return out;
  }, [sessions, pastAnchor]);

  // 달력에는 하한(minDate)이 없어 범위보다 이전 날짜를 고를 수 있다. 그 주가
  // 목록에 없으면 weekIndex가 마지막으로 폴백해 헤더는 고른 주를, 스트립은
  // 이번 주를 가리킨다. 그때만 하한을 늘린다 — 줄이지는 않는다.
  useEffect(() => {
    if (weeks.length === 0) return;
    const s = localDateStr(getWeekRange(selectedDate).start);
    if (s < weeks[0]) setPastAnchor(s);
  }, [selectedDate, weeks]);

  const weekIndex = useMemo(() => {
    const startYMD = localDateStr(getWeekRange(selectedDate).start);
    const i = weeks.indexOf(startYMD);
    return i >= 0 ? i : weeks.length - 1;
  }, [weeks, selectedDate]);

  const isCurrentWeek = weekIndex === weeks.length - 1;

  /** 주간 캘린더 카드 안쪽 폭. 화면 여백 16×2 + 카드 패딩 16×2. */
  const STRIP_W = Math.max(1, winWidth - 64);
  /** 한 칸의 높이 — 요일(16) + 6 + 날짜원(30) + 6 + 막대(24). 열 점선이 이 높이를 쓴다. */
  const STRIP_H = 82;

  // ── 임의의 주(일~토) 한 칸의 데이터 ──
  const weekDaysOf = useCallback((weekStartYMD: string) => {
    const realTodayYMD = localDateStr(new Date());
    const sunday = new Date(weekStartYMD + "T00:00:00");
    const DOW = ["일", "월", "화", "수", "목", "금", "토"];

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      const ymd = localDateStr(d);
      const daySessions = sessions.filter((s) => s.date === ymd);
      const first = daySessions[0];
      const routine = first ? routineOf(first) : undefined;
      return {
        dow: DOW[i],
        num: d.getDate(),
        month: d.getMonth() + 1,
        ymd,
        isSelected: ymd === selectedDate,
        isToday: ymd === realTodayYMD,
        isFuture: ymd > realTodayYMD,
        hasSession: daySessions.length > 0,
        isRest: restDays.includes(ymd),
        /** 막대에 쓸 이름 — **부위**다. 루틴명은 micro 11px 한 칸(약 45pt)에서
            "가슴 &…" 로 잘린다. 색이 루틴을 말하고 글자는 부위를 말한다. */
        barLabel: first ? first.exercises[0]?.category ?? "운동" : null,
        barColor: routine?.color,
        volume: daySessions.reduce((sum, s) => sum + getTotalVolume(s), 0),
      };
    });
  }, [sessions, selectedDate, restDays, routineOf, getTotalVolume]);

  const weekDays = useMemo(
    () => weekDaysOf(weeks[weekIndex] ?? localDateStr(getWeekRange(selectedDate).start)),
    [weekDaysOf, weeks, weekIndex, selectedDate]
  );

  // ── 주 이동 ──
  // 착지일은 "같은 요일 유지, 단 오늘로 clamp".
  const dayInWeek = (weekStartYMD: string) => {
    const dow = new Date(selectedDate + "T00:00:00").getDay();
    const d = new Date(weekStartYMD + "T00:00:00");
    d.setDate(d.getDate() + dow);
    const todayYMD = localDateStr(new Date());
    const ymd = localDateStr(d);
    return ymd > todayYMD ? todayYMD : ymd;
  };

  const goToWeek = (index: number) => {
    const clamped = Math.max(0, Math.min(weeks.length - 1, index));
    setSelectedDate(dayInWeek(weeks[clamped]));
  };

  // 목록 위치를 weekIndex에 맞춘다. sessions가 비동기라 첫 렌더에는 weeks가
  // [이번 주] 하나뿐이고, 로드 후 앞으로 늘어나면 보이는 칸이 밀린다.
  useEffect(() => {
    if (weeks.length === 0) return;
    if (skipSyncRef.current) {
      skipSyncRef.current = false;
      return;
    }
    weekListRef.current?.scrollToIndex({ index: weekIndex, animated: false });
  }, [weekIndex, weeks.length]);

  // ── 주간 목표 ──
  const doneDays = weekDays.filter((d) => d.hasSession).length;
  // 회귀 방지: `?? 4`를 지우지 말 것. 서버 `weeklyGoal`에 default 4가 붙었지만
  // 그건 **새로 만들어지는 행에만** 적용된다 — 이미 있는 사용자는 NULL로 남는다.
  // 폴백을 빼면 그 사용자들에게 분모가 사라져 "0/"으로 보인다.
  const serverWeekGoal = user?.weeklyGoal ?? 4;

  /**
   * 목표 스테퍼의 낙관적 값. null 이면 서버 값을 그대로 쓴다.
   * updateProfile 은 PATCH 가 끝난 뒤에 스토어를 갱신해서, 그대로 쓰면
   * [+]를 눌러도 왕복이 끝날 때까지 분모가 안 바뀌어 "안 눌렸나?" 싶다.
   */
  const [goalDraft, setGoalDraft] = useState<number | null>(null);
  const goalTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const weekGoal = goalDraft ?? serverWeekGoal;

  useEffect(() => () => { if (goalTimer.current) clearTimeout(goalTimer.current); }, []);

  /**
   * 주간 목표 조정. 1~7.
   *
   * PATCH 를 400ms 지연시키는 이유: [+]를 세 번 누르면 요청도 세 번 나간다.
   * 실패하면 **되돌리고 알린다.** 조용히 되돌리면 사용자는 자기가 누른 게
   * 안 먹은 건지 원래대로 돌아온 건지 구분할 수 없다.
   */
  const adjustWeekGoal = (delta: number) => {
    const next = Math.max(1, Math.min(7, weekGoal + delta));
    if (next === weekGoal) return;
    setGoalDraft(next);
    if (goalTimer.current) clearTimeout(goalTimer.current);
    goalTimer.current = setTimeout(() => {
      updateProfile({ weeklyGoal: next })
        .then(() => setGoalDraft(null))
        .catch(() => {
          setGoalDraft(null);
          showCuteAlert({
            icon: "alert",
            tone: "danger",
            title: "목표를 저장하지 못했어요",
            message: "잠시 후 다시 시도해 주세요.",
            buttons: [{ label: "확인", style: "primary" }],
          });
        });
    }, 400);
  };

  /**
   * 목표를 채운 주가 연속 몇 주인가. 표시 중인 주부터 과거로 센다.
   * 0이면 문구를 내지 않는다 — 없는 성과를 말하지 않는다.
   */
  const goalStreak = useMemo(() => {
    let n = 0;
    for (let i = weekIndex; i >= 0; i--) {
      const days = weekDaysOf(weeks[i]).filter((d) => d.hasSession).length;
      if (days >= weekGoal && weekGoal > 0) n++;
      else break;
    }
    return n;
  }, [weekIndex, weeks, weekDaysOf, weekGoal]);

  // ── 운동량 집계 (주간 / 월간) ──
  const rangeStats = useMemo(() => {
    const inWeek = (s: WorkoutSession) => {
      const { start, end } = getWeekRange(selectedDate);
      const d = new Date(s.date + "T00:00:00");
      return d >= start && d <= end;
    };
    const sel = new Date(selectedDate + "T00:00:00");
    const inMonth = (s: WorkoutSession) => {
      const d = new Date(s.date + "T00:00:00");
      return d.getFullYear() === sel.getFullYear() && d.getMonth() === sel.getMonth();
    };
    const pick = range === "week" ? inWeek : inMonth;
    const cur = sessions.filter(pick);

    // 이전 구간 — 볼륨 증감 알약의 분모
    const prevStart = new Date(getWeekRange(selectedDate).start);
    prevStart.setDate(prevStart.getDate() - 7);
    const prevWeekYMD = localDateStr(prevStart);
    const prev = sessions.filter((s) => {
      const d = new Date(s.date + "T00:00:00");
      if (range === "week") {
        const { start, end } = getWeekRange(prevWeekYMD);
        return d >= start && d <= end;
      }
      const pm = new Date(sel.getFullYear(), sel.getMonth() - 1, 1);
      return d.getFullYear() === pm.getFullYear() && d.getMonth() === pm.getMonth();
    });

    const volume = cur.reduce((sum, s) => sum + getTotalVolume(s), 0);
    const prevVolume = prev.reduce((sum, s) => sum + getTotalVolume(s), 0);
    const days = new Set(cur.map((s) => s.date)).size;
    const kcal = cur.reduce((sum, s) => sum + (s.caloriesBurned ?? 0), 0);

    // 추이 그래프: 주간은 요일 7칸, 월간은 그 달의 주차.
    let points: { label: string; value: number; isNow: boolean }[];
    if (range === "week") {
      points = weekDays.map((d) => ({ label: d.dow, value: d.volume, isNow: d.ymd === selectedDate }));
    } else {
      const buckets = new Map<string, number>();
      for (const s of cur) {
        const k = localDateStr(getWeekRange(s.date).start);
        buckets.set(k, (buckets.get(k) ?? 0) + getTotalVolume(s));
      }
      const selWeek = localDateStr(getWeekRange(selectedDate).start);
      points = Array.from(buckets.keys())
        .sort()
        .map((k, i) => ({ label: `${i + 1}주`, value: buckets.get(k) ?? 0, isNow: k === selWeek }));
    }

    return { volume, prevVolume, days, kcal, points };
  }, [sessions, selectedDate, range, weekDays, getTotalVolume]);

  // ── 자극 부위 ──
  const weekMuscleSet = useMemo(() => {
    const { start, end } = getWeekRange(selectedDate);
    const set = new Set<string>();
    for (const sess of sessions) {
      const d = new Date(sess.date + "T00:00:00");
      if (d < start || d > end) continue;
      for (const ex of sess.exercises) {
        const slugs = MUSCLE_MAP[ex.name] ?? CATEGORY_TO_SLUGS[ex.category ?? ""] ?? [];
        for (const s of slugs) set.add(s);
      }
    }
    return set;
  }, [sessions, selectedDate]);

  const missingMuscles = MAJOR_MUSCLES
    .filter((m) => !weekMuscleSet.has(m))
    .map((m) => MAJOR_MUSCLE_LABELS[m] ?? m);

  // ── 다음 운동 ──
  /** 목록 순서(orderIndex)의 첫 루틴. 사용자가 끌어 정한 순서가 곧 우선순위다. */
  const nextRoutine = routines[0];
  const nextRoutineSets = nextRoutine
    ? nextRoutine.exercises.reduce((sum, ex) => {
        const n = Number(ex.defaultSets);
        return sum + (Number.isFinite(n) && n > 0 ? n : Array.isArray(ex.sets) ? ex.sets.length : 3);
      }, 0)
    : 0;

  /** 표시 중인 주의 휴식일 중 아직 지나지 않은 첫 날. 없으면 그 주의 마지막 휴식일. */
  const restInfo = useMemo(() => {
    const todayYMD = localDateStr(new Date());
    const inWeek = weekDays.filter((d) => d.isRest).map((d) => d.ymd);
    if (inWeek.length === 0) return null;
    const upcoming = inWeek.find((d) => d >= todayYMD) ?? inWeek[inWeek.length - 1];
    return { ymd: upcoming, ordinal: inWeek.indexOf(upcoming) + 1, total: inWeek.length };
  }, [weekDays]);

  // ── 이번 주 기록 ──
  const recentSessions = useMemo(() => {
    const { start, end } = getWeekRange(selectedDate);
    return sessions
      .filter((s) => !activeSession || s.id !== activeSession.id)
      .filter((s) => {
        const d = new Date(s.date + "T00:00:00");
        return d >= start && d <= end;
      })
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 6);
  }, [sessions, activeSession, selectedDate]);

  /**
   * 운동 탭의 히스토리로 보낸다. `historyJumpDate`를 세우면 workout.tsx의
   * effect가 히스토리 세그먼트로 전환하고 그 날짜를 선택한다.
   */
  const goToHistory = (date?: string) => {
    setHistoryJumpDate(date ?? recentSessions[0]?.date ?? selectedDate);
    router.push("/(tabs)/workout");
  };

  const weekRangeLabel = (() => {
    const { start, end } = getWeekRange(selectedDate);
    return `${shortDate(localDateStr(start))} ~ ${shortDate(localDateStr(end))}`;
  })();

  /**
   * 운동 시작. activeSession 이 있으면 **새로 만들지 않고** 그 세션으로 간다.
   * 회귀 방지: 홈에서 실수로 두 번째 세션이 생기는 것을 막는 유일한 장치다.
   */
  const startWorkout = () => {
    if (!activeSession) startSession();
    router.push("/(tabs)/workout");
  };

  // ── 바로가기 5개 ──
  // 회귀 방지: "루틴"은 app/routine 으로 가는 홈 화면의 진입점이다. 지우지 말 것.
  const shortcuts: { key: string; label: string; icon: "list" | "calendar" | "chart" | "target" | "chat"; onPress: () => void }[] = [
    { key: "routine", label: "루틴", icon: "list", onPress: () => router.push("/routine" as any) },
    { key: "history", label: "기록", icon: "calendar", onPress: () => goToHistory() },
    { key: "stats", label: "통계", icon: "chart", onPress: () => router.push("/(tabs)/stats" as any) },
    { key: "goal", label: "목표", icon: "target", onPress: () => router.push("/modal/edit-profile" as any) },
    // 커뮤니티 섹션은 운동 탭의 루틴 영역 안에 있다. 그 섹션만 여는 라우트
    // 파라미터가 없어 탭까지만 보낸다.
    { key: "community", label: "커뮤니티", icon: "chat", onPress: () => router.push("/(tabs)/workout" as any) },
  ];

  const chartW = STRIP_W;
  const chartH = 92;

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {/* ── 1. 헤더 ── */}
      <View
        style={{
          paddingHorizontal: 16, paddingTop: 60, paddingBottom: 8,
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
        }}>
        <Text numberOfLines={1} style={{ ...T.title, color: c.textPrimary, flexShrink: 1 }}>
          {headerDate(selectedDate)}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 0 }}>
          <IconButton accessibilityLabel="날짜 선택 달력 열기" onPress={() => setShowCalendar(true)}>
            <Icon name="calendar" size={20} color={c.textSecondary} />
          </IconButton>
          <ThemeToggle size={44} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        /* 하단 여백은 ActiveWorkoutBar가 뜰 때만 더 필요하다.
           회귀 방지: 상수 120으로 되돌리지 말 것 — 운동 중이 아닐 때 80pt가 죽는다. */
        contentContainerStyle={{ paddingBottom: activeSession ? 80 : 40 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">

        {/* ── 2. 주간 목표 요약 (캔버스 위, 카드 없음) ── */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 12 }}>
          <Text style={{ ...T.caption, color: c.textSecondary }}>주간 목표</Text>
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "baseline" }}>
              <Text
                style={{ ...T.display, color: c.textPrimary, fontVariant: TABULAR }}
                accessibilityLabel={`주간 목표 ${weekGoal}일 중 ${doneDays}일 완료`}>
                {doneDays}/{weekGoal}
              </Text>
              {/* 단위는 micro + textMuted, 값과 2px 띄운다 (DESIGN.md §3) */}
              <Text style={{ ...T.micro, color: c.textMuted, marginLeft: 2 }}>일</Text>
            </View>
            {goalStreak > 0 && (
              <Text style={{ ...T.body, color: c.textSecondary, marginLeft: 10, flexShrink: 1 }} numberOfLines={1}>
                {goalStreak}주 연속 달성
              </Text>
            )}
            <View style={{ flex: 1 }} />
            {/* 목표 조정 — 이 자리 말고 목표를 바꾸는 길은 설정 → 프로필 3홉뿐이라
                사실상 유일한 실용 경로다. 리디자인 전부터 있던 동작이라 유지한다. */}
            <View style={{ flexDirection: "row", alignItems: "center", flexShrink: 0 }}>
              <GoalStep dir={-1} disabled={weekGoal <= 1} onPress={() => adjustWeekGoal(-1)} c={c} />
              <GoalStep dir={1} disabled={weekGoal >= 7} onPress={() => adjustWeekGoal(1)} c={c} />
            </View>
          </View>
        </View>

        {/* ── 3. 주간 캘린더 카드 ── */}
        <View style={{ paddingHorizontal: 16 }}>
          <View style={[{ backgroundColor: c.surface, borderRadius: 16, padding: 16 }, CARD_EDGE, SHADOW_SM]}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ ...T.body, color: c.textSecondary, flex: 1 }}>{weekRangeLabel}</Text>
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="날짜 선택 달력 열기"
                onPress={() => setShowCalendar(true)}
                style={{ flexDirection: "row", alignItems: "center", gap: 2, minHeight: 44, justifyContent: "center" }}>
                <Text style={{ ...T.caption, color: c.textSecondary }}>캘린더</Text>
                <Icon name="chevronRight" size={12} color={c.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* 7열. 좌우 스와이프로 주를 넘긴다 — 리디자인 전부터 있던 이동 수단이다. */}
            <FlatList
              ref={weekListRef}
              data={weeks}
              keyExtractor={(w) => w}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              // DESIGN.md §5: FlatList는 렌더 예산을 명시한다.
              initialNumToRender={1}
              maxToRenderPerBatch={3}
              windowSize={3}
              initialScrollIndex={weekIndex}
              getItemLayout={(_, i) => ({ length: STRIP_W, offset: STRIP_W * i, index: i })}
              onMomentumScrollEnd={(e) => {
                const i = Math.round(e.nativeEvent.contentOffset.x / STRIP_W);
                if (i !== weekIndex) {
                  skipSyncRef.current = true;
                  goToWeek(i);
                }
              }}
              renderItem={({ item }) => (
                <View style={{ width: STRIP_W, flexDirection: "row" }}>
                  {weekDaysOf(item).map((d, i) => (
                    <View key={d.ymd} style={{ flex: 1, flexDirection: "row" }}>
                      {/* 열 사이 1px 점선.
                          RN iOS 는 1px 폭 View 의 borderStyle:"dashed" 를 그리지 않는다
                          (보더가 박스보다 넓어 점이 이어져 버린다). SVG 로 긋는다. */}
                      {i > 0 && (
                        <Svg width={1} height={STRIP_H}>
                          <Line
                            x1={0.5} y1={0} x2={0.5} y2={STRIP_H}
                            stroke={c.border} strokeWidth={1} strokeDasharray="3 4"
                          />
                        </Svg>
                      )}
                      <TouchableOpacity
                        style={{ flex: 1, alignItems: "center", gap: 6, paddingHorizontal: 2 }}
                        activeOpacity={d.isFuture ? 1 : 0.7}
                        disabled={d.isFuture}
                        accessibilityRole="button"
                        accessibilityState={{ selected: d.isSelected, disabled: d.isFuture }}
                        // VoiceOver가 켜지면 좌우 스와이프는 요소 간 이동에 가로채여
                        // 주 이동이 불가능해진다. 그 대체 경로를 액션 로터로 연다.
                        // 회귀 방지: 이 액션을 스트립 컨테이너로 올리지 말 것.
                        accessibilityActions={[
                          { name: "increment", label: "다음 주" },
                          { name: "decrement", label: "이전 주" },
                        ]}
                        onAccessibilityAction={(e) => {
                          if (e.nativeEvent.actionName === "increment") goToWeek(weekIndex + 1);
                          else if (e.nativeEvent.actionName === "decrement") goToWeek(weekIndex - 1);
                        }}
                        accessibilityLabel={
                          `${d.month}월 ${d.num}일 ${d.dow}요일` +
                          (d.isToday ? ", 오늘" : "") +
                          (d.isRest ? ", 휴식" : d.barLabel ? `, ${d.barLabel}` : "") +
                          (d.isFuture ? ", 선택할 수 없음" : d.isSelected ? ", 선택됨" : "")
                        }
                        onPress={() => setSelectedDate(d.ymd)}>
                        {/* 요일 — 일요일도 빨간색을 쓰지 않는다 */}
                        <Text style={{ ...T.caption, color: c.textSecondary }}>{d.dow}</Text>
                        {/* 날짜 원 30×30 */}
                        <View
                          style={{
                            width: 30, height: 30, borderRadius: 15,
                            alignItems: "center", justifyContent: "center",
                            backgroundColor: d.isToday ? c.textPrimary : "transparent",
                            borderWidth: d.isSelected && !d.isToday ? 1 : 0,
                            borderColor: c.textPrimary,
                          }}>
                          <Text
                            style={{
                              ...T.body,
                              fontVariant: TABULAR,
                              fontWeight: d.isToday ? "800" : "600",
                              color: d.isToday ? c.background : d.isFuture ? c.textMuted : c.textPrimary,
                            }}>
                            {d.num}
                          </Text>
                        </View>
                        {/* 막대 — 루틴 색 연한 배경 + 이름. 휴식은 빗금 + "휴식". */}
                        <View style={{ width: "100%", height: 24, borderRadius: 10, overflow: "hidden", justifyContent: "center" }}>
                          {d.isRest ? (
                            <>
                              <Hatch width={STRIP_W / 7} height={24} color={c.surfaceHigh} />
                              <Text numberOfLines={1} style={{ ...T.micro, color: c.textSecondary, textAlign: "center" }}>휴식</Text>
                            </>
                          ) : d.barLabel ? (
                            <View
                              style={{
                                position: "absolute", left: 0, right: 0, top: 0, bottom: 0,
                                borderRadius: 10,
                                backgroundColor: routineWash(d.barColor, isDark, c.primary),
                                justifyContent: "center",
                              }}>
                              <Text numberOfLines={1} style={{ ...T.micro, color: c.textPrimary, textAlign: "center" }}>
                                {d.barLabel}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            />

            {/* 버튼 2개 */}
            <View style={{ flexDirection: "row", gap: 12, marginTop: 16 }}>
              {/* 회귀 방지: app/routine 으로 가는 홈 화면 진입점. 삭제 금지.
                  activeSession 여부와 무관하게 항상 보인다 — 운동 중에도 루틴을 편집할 수 있어야 한다. */}
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="루틴 관리 열기"
                onPress={() => router.push("/routine" as any)}
                style={{ flex: 1, height: 48, borderRadius: 999, backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ ...T.bodyStrong, color: c.textPrimary }}>루틴 관리</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={activeSession ? "진행 중인 운동 이어하기" : "운동 시작"}
                onPress={startWorkout}
                style={{ flex: 1, height: 48, borderRadius: 999, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }}>
                <Text style={{ ...T.bodyStrong, color: c.onAccent }}>
                  {activeSession ? "운동 이어하기" : "운동 시작"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* ── 4. 시트 (카드 위로 18 겹침) ── */}
        <View
          style={{
            marginTop: -18,
            backgroundColor: c.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            borderTopWidth: 1,
            borderTopColor: c.border,
            paddingHorizontal: 16,
            paddingTop: 24,
            gap: 24,
          }}>

          {/* 4-1. 바로가기 5개 — 한 줄, 가로 스크롤 없음, 아이콘 뒤 배경 없음 */}
          <View style={{ flexDirection: "row" }}>
            {shortcuts.map((s) => (
              <TouchableOpacity
                key={s.key}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={s.label}
                onPress={s.onPress}
                style={{ flex: 1, alignItems: "center", gap: 6, minHeight: 44, justifyContent: "center" }}>
                <Icon name={s.icon} size={32} color={c.secondary} />
                <Text numberOfLines={1} style={{ ...T.caption, color: c.textPrimary }}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* 4-2. 운동량 */}
          <View>
            {/* 밑줄 탭 */}
            <View style={{ flexDirection: "row", gap: 16, marginBottom: 16 }}>
              {(["week", "month"] as const).map((r) => {
                const on = range === r;
                return (
                  <TouchableOpacity
                    key={r}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    onPress={() => setRange(r)}
                    style={{ minHeight: 44, justifyContent: "center", borderBottomWidth: on ? 2 : 0, borderBottomColor: c.textPrimary }}>
                    <Text style={on ? { ...T.bodyStrong, color: c.textPrimary } : { ...T.body, color: c.textSecondary }}>
                      {r === "week" ? "주간" : "월간"}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* 지표 타일 3개 */}
            <View style={{ flexDirection: "row", gap: 12 }}>
              {(() => {
                const vol = splitVol(rangeStats.volume);
                const delta = rangeStats.volume - rangeStats.prevVolume;
                const d = splitVol(Math.abs(delta));
                const avgKcal = rangeStats.days > 0 ? Math.round(rangeStats.kcal / rangeStats.days) : 0;
                const weeksInRange = range === "week" ? 1 : Math.max(1, rangeStats.points.length);
                const tiles = [
                  {
                    key: "vol",
                    label: "볼륨",
                    value: vol.value,
                    unit: vol.unit,
                    // ▲/▼ 는 색이 아니라 글리프가 방향을 말한다. 색은 비텍스트(아이콘)만.
                    pill: delta === 0 ? "변화 없음" : `${delta > 0 ? "▲" : "▼"} ${d.value}${d.unit}`,
                    selected: true,
                  },
                  {
                    key: "days",
                    label: "운동일",
                    value: String(rangeStats.days),
                    unit: "일",
                    pill: range === "week" ? `목표 ${weekGoal}일` : `주 평균 ${(rangeStats.days / weeksInRange).toFixed(1)}일`,
                    selected: false,
                  },
                  {
                    key: "kcal",
                    label: "소모",
                    value: rangeStats.kcal.toLocaleString(),
                    unit: "kcal",
                    pill: `평균 ${avgKcal.toLocaleString()}`,
                    selected: false,
                  },
                ];
                return tiles.map((t) => (
                  <View
                    key={t.key}
                    style={{
                      flex: 1, backgroundColor: c.surfaceAlt, borderRadius: 16,
                      paddingVertical: 12, paddingHorizontal: 8, alignItems: "center", gap: 4,
                      borderWidth: t.selected ? 1 : 0, borderColor: c.primary,
                    }}>
                    <Text style={{ ...T.caption, color: c.textSecondary }}>{t.label}</Text>
                    <View style={{ flexDirection: "row", alignItems: "baseline" }}>
                      <Text style={{ ...T.display, color: c.textPrimary, fontVariant: TABULAR }} numberOfLines={1}>
                        {t.value}
                      </Text>
                      <Text style={{ ...T.micro, color: c.textMuted, marginLeft: 2 }}>{t.unit}</Text>
                    </View>
                    <View style={{ backgroundColor: c.surface, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                      <Text numberOfLines={1} style={{ ...T.micro, color: c.textSecondary }}>{t.pill}</Text>
                    </View>
                  </View>
                ));
              })()}
            </View>

            {/* 추이 선 그래프 */}
            {rangeStats.points.length >= 2 && (() => {
              const pts = rangeStats.points;
              const max = Math.max(1, ...pts.map((p) => p.value));
              const padX = 14, padTop = 18, padBottom = 20;
              const innerW = chartW - padX * 2;
              const innerH = chartH - padTop - padBottom;
              const xy = pts.map((p, i) => ({
                ...p,
                x: padX + (pts.length === 1 ? innerW / 2 : (innerW * i) / (pts.length - 1)),
                y: padTop + innerH * (1 - p.value / max),
              }));
              return (
                <View style={{ marginTop: 16, height: chartH }} accessibilityRole="image"
                  accessibilityLabel={`${range === "week" ? "요일별" : "주차별"} 볼륨 추이`}>
                  <Svg width={chartW} height={chartH}>
                    {/* 가로 점선 3개 */}
                    {[0, 0.5, 1].map((t) => (
                      <Line
                        key={t}
                        x1={padX} x2={chartW - padX}
                        y1={padTop + innerH * t} y2={padTop + innerH * t}
                        stroke={c.border} strokeWidth={1} strokeDasharray="3 4"
                      />
                    ))}
                    <Polyline
                      points={xy.map((p) => `${p.x},${p.y}`).join(" ")}
                      fill="none" stroke={c.primary} strokeWidth={2.5}
                      strokeLinecap="round" strokeLinejoin="round"
                    />
                    {xy.map((p) => (
                      <Circle
                        key={p.label}
                        cx={p.x} cy={p.y} r={p.isNow ? 5.5 : 3}
                        fill={p.isNow ? c.primary : c.surface}
                        stroke={c.primary} strokeWidth={2}
                      />
                    ))}
                  </Svg>
                  {/* 값·라벨은 RN Text 로 그린다 — SVG Text 에는 tabular-nums 가 없다.
                      점 위(값)와 바닥(요일/주차)에 각각 절대 배치한다. */}
                  {xy.map((p) => (
                    <Text
                      key={`v-${p.label}`}
                      numberOfLines={1}
                      style={{
                        ...T.micro, color: c.textSecondary, fontVariant: TABULAR,
                        position: "absolute", left: p.x - 20, top: p.y - 16, width: 40, textAlign: "center",
                      }}>
                      {p.value > 0 ? splitVol(p.value).value : ""}
                    </Text>
                  ))}
                  {xy.map((p) => (
                    <Text
                      key={`l-${p.label}`}
                      numberOfLines={1}
                      style={{
                        ...T.micro, color: c.textMuted,
                        position: "absolute", left: p.x - 20, bottom: 2, width: 40, textAlign: "center",
                      }}>
                      {p.label}
                    </Text>
                  ))}
                </View>
              );
            })()}
          </View>

          {/* 4-3. 안 한 부위 배너 — 빠진 부위가 있을 때만 */}
          {missingMuscles.length > 0 && (
            <View
              style={{
                flexDirection: "row", alignItems: "center", gap: 12,
                backgroundColor: c.surfaceAlt, borderRadius: 16, padding: 16,
              }}>
              <View
                style={{
                  width: 64, height: 64, borderRadius: 16, backgroundColor: c.surface,
                  alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                <Icon name="target" size={28} color={c.secondary} />
              </View>
              <View style={{ flex: 1, gap: 8 }}>
                <Text style={{ ...T.body, color: c.textSecondary }}>
                  <Text style={{ ...T.bodyStrong, color: c.textPrimary }}>{missingMuscles.join("·")}</Text>
                  {`${eunNeun(missingMuscles[missingMuscles.length - 1])} 이번 주 아직이에요`}
                </Text>
                <TouchableOpacity
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="루틴에 추가하러 가기"
                  onPress={() => router.push("/routine" as any)}
                  style={{
                    alignSelf: "flex-start", height: 32, borderRadius: 999,
                    paddingHorizontal: 12, backgroundColor: c.surface,
                    alignItems: "center", justifyContent: "center",
                  }}>
                  <Text style={{ ...T.micro, color: c.textPrimary }}>+ 루틴에 추가</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* 4-4. 다음 운동 */}
          <View>
            <Text style={{ ...T.title, color: c.textPrimary, marginBottom: 12 }}>다음 운동</Text>
            <View style={{ flexDirection: "row", gap: 12 }}>
              {/* 다음 루틴 */}
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={nextRoutine ? `다음 루틴 ${nextRoutine.name}` : "루틴 만들기"}
                onPress={() => router.push("/routine" as any)}
                style={{ flex: 1, minHeight: 124, borderRadius: 16, backgroundColor: c.surfaceAlt, padding: 16, justifyContent: "space-between" }}>
                <View style={{ gap: 6 }}>
                  <Text style={{ ...T.caption, color: c.textSecondary }}>다음 루틴</Text>
                  {nextRoutine ? (
                    <>
                      {/* 루틴 이름은 색 글자가 아니라 **연한 배경 태그**로 보여준다 */}
                      <View
                        style={{
                          alignSelf: "flex-start", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
                          backgroundColor: routineWash(nextRoutine.color, isDark, c.primary),
                        }}>
                        <Text numberOfLines={1} style={{ ...T.title, color: c.textPrimary }}>{nextRoutine.name}</Text>
                      </View>
                      <Text style={{ ...T.caption, color: c.textSecondary }}>
                        {`${nextRoutine.exercises.length}종목 · ${nextRoutineSets}세트`}
                      </Text>
                    </>
                  ) : (
                    <Text style={{ ...T.title, color: c.textPrimary }}>루틴 만들기</Text>
                  )}
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Icon name="dumbbell" size={22} color={c.secondary} />
                </View>
              </TouchableOpacity>

              {/* 휴식 — 캘린더 막대와 같은 빗금 + "휴식" 표기 */}
              <View style={{ flex: 1, minHeight: 124, borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: c.border }}>
                <Hatch width={(STRIP_W - 12) / 2} height={124} color={c.surfaceHigh} />
                <View style={{ flex: 1, padding: 16, justifyContent: "space-between" }}>
                  <View style={{ gap: 6 }}>
                    <Text style={{ ...T.caption, color: c.textSecondary }}>휴식</Text>
                    <Text style={{ ...T.title, color: c.textPrimary }}>
                      {restInfo ? dowLabel(restInfo.ymd) : "미지정"}
                    </Text>
                    <Text style={{ ...T.caption, color: c.textSecondary }}>
                      {restInfo ? `이번 주 ${restInfo.ordinal}번째` : "운동 탭에서 지정"}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Icon name="clock" size={22} color={c.secondary} />
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* 4-5. 이번 주 기록 */}
          <View style={{ paddingBottom: 24 }}>
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12 }}>
              <Text style={{ ...T.title, color: c.textPrimary, flex: 1 }}>
                {isCurrentWeek ? "이번 주 기록" : "기록"}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="운동 기록 전체 보기"
                onPress={() => goToHistory()}
                style={{ flexDirection: "row", alignItems: "center", gap: 2, minHeight: 44, justifyContent: "center" }}>
                <Text style={{ ...T.caption, color: c.textSecondary }}>전체</Text>
                <Icon name="chevronRight" size={12} color={c.textSecondary} />
              </TouchableOpacity>
            </View>

            {recentSessions.length > 0 ? (
              <View>
                {recentSessions.map((s, i) => {
                  const r = routineOf(s);
                  const vol = splitVol(getTotalVolume(s));
                  const isFirst = i === 0;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel={`${shortDate(s.date)} 기록 보기`}
                      onPress={() => goToHistory(s.date)}
                      style={{ flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 10 }}>
                      <Text
                        style={{
                          ...T.caption, width: 52, flexShrink: 0,
                          color: isFirst ? c.textPrimary : c.textSecondary,
                          fontWeight: isFirst ? "800" : "600",
                        }}>
                        {isFirst ? "오늘" : shortDate(s.date)}
                      </Text>
                      {/* 태그는 **내용 폭**이다. flex:1 을 태그에 주면 빈 배경이
                          행 끝까지 늘어나 색이 면적을 차지한다 — 루틴 색은 식별
                          신호지 영역 표시가 아니다. 남는 폭은 바깥 래퍼가 먹는다. */}
                      <View style={{ flex: 1, flexDirection: "row" }}>
                        <View
                          style={{
                            flexShrink: 1, borderRadius: 10,
                            paddingHorizontal: 8, paddingVertical: 3,
                            backgroundColor: routineWash(r?.color, isDark, c.primary),
                          }}>
                          <Text numberOfLines={1} style={{ ...T.body, color: c.textPrimary }}>
                            {r?.name ?? sessionTitle(s)}
                          </Text>
                        </View>
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "baseline", flexShrink: 0 }}>
                        <Text style={{ ...T.numeric, color: c.textPrimary }}>{vol.value}</Text>
                        <Text style={{ ...T.micro, color: c.textMuted, marginLeft: 2 }}>{vol.unit}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <View style={{ backgroundColor: c.surfaceAlt, borderRadius: 16, padding: 24, alignItems: "center" }}>
                <Text style={{ ...T.caption, color: c.textSecondary }}>
                  {isCurrentWeek ? "이번 주 기록이 없어요" : "기록이 없어요"}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      {/* ── 날짜 선택 캘린더 ── */}
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
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{ marginHorizontal: 16 }}>
            {/* 시트/모달 컨테이너는 surface. surfaceHigh는 계단이 아니라 인라인 요소
                채움용이고, 라이트에서는 캔버스보다 어두워 시트가 가라앉아 보인다. */}
            <View style={[{ backgroundColor: c.surface, borderRadius: 24, padding: 12, overflow: "hidden" }, CARD_EDGE]}>
              <Calendar
                current={selectedDate}
                maxDate={localDateStr(new Date())}
                onDayPress={(day) => {
                  setSelectedDate(day.dateString);
                  setShowCalendar(false);
                }}
                markedDates={{ [selectedDate]: { selected: true, selectedColor: c.primary } }}
                theme={calTheme}
              />
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="오늘 날짜로 이동"
                onPress={() => { setSelectedDate(localDateStr(new Date())); setShowCalendar(false); }}
                style={{ alignSelf: "center", marginTop: 6, minHeight: 44, justifyContent: "center", paddingHorizontal: 16 }}>
                <Text style={{ ...T.bodyStrong, color: c.primary }}>오늘로</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// 화면별 ErrorBoundary로 감싼다 — 홈 렌더 중 예외가 나도 앱 전체가 죽지 않고
// 이 화면만 폴백 UI로 대체된다(다른 탭은 계속 사용 가능).
export default function HomeScreenRoute() {
  return (
    <ErrorBoundary screenName="홈">
      <HomeScreen />
    </ErrorBoundary>
  );
}
