import React, { useRef } from "react";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import { calcExerciseVolume, getMuscleSetCounts, getMuscleColor } from "../../utils/workout";
import { localDateStr, localMonthStr } from "../../utils/date";
import {
  scheduleRestEndNotification,
  cancelRestEndNotification,
} from "../../lib/workoutNotification";
import {
  startRestLiveActivity,
  updateRestLiveActivity,
  endRestLiveActivity,
} from "../../lib/liveActivity";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  UIManager,
  Animated,
  Pressable,
  Modal,
  KeyboardAvoidingView,
} from "react-native";
import * as Haptics from "expo-haptics";
import { showCuteAlert } from "../../components/CuteAlert";
import { useRouter } from "expo-router";
import {
  Card,
  SortableList,
  NumberPad,
  SetIndicator,
} from "../../components/ui";
import { Header, IconButton } from "../../design-system";
import { useEffect, useState, useMemo, useCallback } from "react";
import { Icon, PlayIcon, FlameIcon } from "../../components/AppIcons";
import { useRoutineStore } from "../../store/routineStore";
import { useRestDayStore } from "../../store/restDayStore";
import { useShallow } from "zustand/react/shallow";
import { Calendar } from "react-native-calendars";
import {
  useWorkoutStore,
  calculateCaloriesBurned,
  CompareMode,
  buildSetsFromRoutineExercise,
} from "../../store/workoutStore";
import { useAuthStore } from "../../store/authStore";
import { useColors } from "../../constants/colors";
import { useThemeStore } from "../../store/themeStore";
import RestTimer from "../../components/RestTimer";
import WorkoutCompleteOverlay from "../../components/WorkoutCompleteOverlay";
import { SetInputRow } from "../../components/workout/SetInputRow";
import { TargetMuscleSelector } from "../../components/workout/TargetMuscleSelector";
import { SettingSelector } from "../../components/workout/SettingSelector";
import { WorkoutSession } from "../../types/workout";
import WorkoutTimer from "../../components/WorkoutTimer";
import { ErrorBoundary } from "../../components/ErrorBoundary";

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

type Tab = "today" | "history";

// 휴식 타이머 초기 상태 — 세션 시작/종료 시 이 값으로 리셋한다.
const INITIAL_TIMER_STATE = {
  seconds: 0,
  remaining: 0,
  running: false,
  paused: false,
};

const SESSION_DATE_KEY = (s: WorkoutSession) => s.date;

const formatSelectedDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
};

// DESIGN.md Governance에 shadow.light가 unresolved로 기록돼 있어 확정 토큰이 없다.
// 값이 정해지면 이 상수를 토큰 참조로 교체할 것. (index.tsx와 동일 패턴)
const LIGHT_SHADOW_SM = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 2,
};

// 토글 노브처럼 작은 요소용 얕은 그림자. 라이트 전용.
const LIGHT_SHADOW_XS = {
  shadowColor: "#000",
  shadowOpacity: 0.12,
  shadowRadius: 2,
  elevation: 1,
};

// 오버레이 암막. 계층 토큰이 아니라 화면을 덮는 막이라 별도 상수로 둔다.
const SCRIM = "rgba(0,0,0,0.3)";
const SCRIM_STRONG = "rgba(0,0,0,0.55)";

// CAL_THEME은 컴포넌트 안에서 useColors()로 makeCalTheme(c)으로 생성
function makeCalTheme(c: import("../../constants/colors").ThemeColors) {
  return {
    backgroundColor: c.background,
    calendarBackground: c.surface,
    textSectionTitleColor: c.textSecondary,
    selectedDayBackgroundColor: c.primary,
    selectedDayTextColor: c.onAccent,
    todayTextColor: c.primary,
    todayBackgroundColor: c.primary + "18",
    dayTextColor: c.textPrimary,
    textDisabledColor: c.textMuted,
    dotColor: c.danger,
    selectedDotColor: c.onAccent,
    arrowColor: c.primary,
    monthTextColor: c.textPrimary,
    textDayFontWeight: "600" as const,
    textMonthFontWeight: "800" as const,
    textDayHeaderFontWeight: "600" as const,
    textDayFontSize: 14,
    textMonthFontSize: 16,
    textDayHeaderFontSize: 12,
  };
}

const COMPARE_MODES: { mode: CompareMode; label: string }[] = [
  { mode: "recent", label: "최근 1회" },
  { mode: "pr", label: "최고기록" },
  { mode: "week", label: "1주전" },
  { mode: "month", label: "1달전" },
];

const fmtDate = (iso: string) => iso.replace(/-/g, ".");

const fmtRestSeconds = (sec: number): string => {
  if (sec < 60) return `${sec}초`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}분` : `${m}분 ${s}초`;
};

const fmtExerciseMeta = (
  targetReps?: string,
  restSeconds?: number
): string | null => {
  const parts: string[] = [];
  if (targetReps?.trim()) parts.push(targetReps.trim());
  if (restSeconds && restSeconds > 0) parts.push(fmtRestSeconds(restSeconds));
  return parts.length > 0 ? parts.join(" · ") : null;
};

/**
 * Displays the workout tracking screen for active workouts, routines, rest timers, and workout history.
 */
function WorkoutScreen() {
  const router = useRouter();
  const c = useColors();
  const isDark = useThemeStore((s) => s.mode) === "dark";
  // DESIGN.md: 그림자는 라이트 모드에서만. 다크에서는 거의 보이지 않으므로
  // surface 명도 차이로 계층을 만든다 (그림자를 쓰던 자리는 모두 surface/accent
  // 배경을 가지고 있어 배경 대비만으로 경계가 성립한다 — 별도 보더 불필요).
  // SHADOW와 SHADOW_SM은 원래 값이 완전히 동일했다 — 둘 다 유지하되 같은 상수를 본다.
  const SHADOW = isDark ? null : LIGHT_SHADOW_SM;
  const SHADOW_SM = SHADOW;
  const calTheme = React.useMemo(() => makeCalTheme(c), [c]);
  const {
    activeSession,
    sessionStartTime,
    startSession,
    startSessionWithRoutine,
    endSession,
    deleteSession,
    getTotalVolume,
    removeSet,
    updateSet,
    updateExercise,
    fetchSessions,
    fetchExerciseHistory,
    sessions,
    isLoading,
    loadError,
    exerciseHistoryCache,
    workoutPaused,
    setWorkoutPaused,
    addSet,
    addExercise,
    removeExercise,
    updateSession,
    updateSessionDate,
    reorderSessionExercises,
    cancelSession,
    historyJumpDate,
    setHistoryJumpDate,
  } = useWorkoutStore(
    useShallow((s) => ({
      activeSession: s.activeSession,
      sessionStartTime: s.sessionStartTime,
      startSession: s.startSession,
      startSessionWithRoutine: s.startSessionWithRoutine,
      endSession: s.endSession,
      deleteSession: s.deleteSession,
      getTotalVolume: s.getTotalVolume,
      removeSet: s.removeSet,
      updateSet: s.updateSet,
      updateExercise: s.updateExercise,
      fetchSessions: s.fetchSessions,
      fetchExerciseHistory: s.fetchExerciseHistory,
      sessions: s.sessions,
      isLoading: s.isLoading,
      loadError: s.loadError,
      exerciseHistoryCache: s.exerciseHistoryCache,
      workoutPaused: s.workoutPaused,
      setWorkoutPaused: s.setWorkoutPaused,
      addSet: s.addSet,
      addExercise: s.addExercise,
      removeExercise: s.removeExercise,
      updateSession: s.updateSession,
      updateSessionDate: s.updateSessionDate,
      reorderSessionExercises: s.reorderSessionExercises,
      cancelSession: s.cancelSession,
      historyJumpDate: s.historyJumpDate,
      setHistoryJumpDate: s.setHistoryJumpDate,
    }))
  );
  const { user } = useAuthStore();
  const {
    routines,
    publicRoutines,
    loadRoutines,
    deleteRoutine,
    shareRoutine,
    unshareRoutine,
    fetchPublicRoutines,
    copyRoutine,
    searchByCode,
    reorderRoutines,
    reorderExercises: reorderRoutineExercises,
  } = useRoutineStore(
    useShallow((s) => ({
      routines: s.routines,
      publicRoutines: s.publicRoutines,
      loadRoutines: s.loadRoutines,
      deleteRoutine: s.deleteRoutine,
      shareRoutine: s.shareRoutine,
      unshareRoutine: s.unshareRoutine,
      fetchPublicRoutines: s.fetchPublicRoutines,
      copyRoutine: s.copyRoutine,
      searchByCode: s.searchByCode,
      reorderRoutines: s.reorderRoutines,
      reorderExercises: s.reorderExercises,
    }))
  );
  const { restDays, fetchRestDays, toggleRestDay } = useRestDayStore(
    useShallow((s) => ({
      restDays: s.restDays,
      fetchRestDays: s.fetchRestDays,
      toggleRestDay: s.toggleRestDay,
    }))
  );

  // Refs to parent ScrollViews so we can synchronously disable scrolling when
  // a SortableList drag starts (prevents the ScrollView from stealing the gesture).
  const todayScrollRef = useRef<any>(null);
  const todayKasRef = useRef<any>(null);
  const historyScrollRef = useRef<any>(null);
  // SortableList 자동 스크롤용 — 부모 ScrollView의 현재 offset(y) 추적
  const todayScrollOffset = useRef(0);
  const historyScrollOffset = useRef(0);

  const [tab, setTab] = useState<Tab>("today");
  const [compareModes, setCompareModes] = useState<Record<string, CompareMode>>(
    {}
  );
  const [completeCalories, setCompleteCalories] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => localMonthStr());
  const [draftUnit, setDraftUnit] = useState<"kg" | "lbs">("kg");
  const [draftSets, setDraftSets] = useState<
    Array<{
      id: string;
      weight: string;
      reps: string;
      completed: boolean;
      isNew?: boolean;
    }>
  >([]);
  const [communityExpanded, setCommunityExpanded] = useState(false);
  const [communitySort, setCommunitySort] = useState<"latest" | "popular">(
    "latest"
  );
  const [codeInput, setCodeInput] = useState("");
  const [codeResult, setCodeResult] = useState<
    import("../../store/routineStore").Routine | null
  >(null);
  const [codeSearching, setCodeSearching] = useState(false);
  const [copyingId, setCopyingId] = useState<string | null>(null);
  const [showSaveRoutineModal, setShowSaveRoutineModal] = useState(false);
  const [saveRoutineName, setSaveRoutineName] = useState("");
  const [saveRoutineExercises, setSaveRoutineExercises] = useState<
    WorkoutSession["exercises"]
  >([]);
  const [savingRoutine, setSavingRoutine] = useState(false);
  const [timerPinned, setTimerPinned] = useState(false);
  const [timerState, setTimerState] = useState(INITIAL_TIMER_STATE);
  const [currentExName, setCurrentExName] = useState("");
  const [historyExpanded, setHistoryExpanded] = useState<
    Record<string, boolean>
  >({});
  const [detailExpanded, setDetailExpanded] = useState<Record<string, boolean>>(
    {}
  );
  const [currentSetIdx, setCurrentSetIdx] = useState<Record<string, number>>(
    {}
  );
  const [addingSettingFor, setAddingSettingFor] = useState<string | null>(null);
  const [showRoutineSheet, setShowRoutineSheet] = useState(false);
  const [expandedRoutineInSheet, setExpandedRoutineInSheet] = useState<
    string | null
  >(null);
  const [addedFromRoutine, setAddedFromRoutine] = useState<Set<string>>(
    new Set()
  );

  type PadConfig = {
    value: string;
    decimal: boolean;
    suffix: string;
    onConfirm: (v: string) => void;
  };
  const [padConfig, setPadConfig] = useState<PadConfig | null>(null);

  const openPad = (
    value: string,
    decimal: boolean,
    suffix: string,
    onConfirm: (v: string) => void
  ) => setPadConfig({ value, decimal, suffix, onConfirm });

  useEffect(() => {
    fetchSessions();
    loadRoutines();
    fetchRestDays();
  }, []);

  // 기록 캘린더에서 날짜 탭 → 히스토리 탭으로 점프 (해당 날짜 선택)
  useEffect(() => {
    if (!historyJumpDate) return;
    setTab("history");
    setVisibleMonth(historyJumpDate.slice(0, 7));
    setSelectedDate(historyJumpDate);
    setHistoryJumpDate(null);
  }, [historyJumpDate]);

  // 운동 세션이 시작되면 항상 "오늘 운동" 탭으로 이동
  useEffect(() => {
    if (activeSession) setTab("today");
  }, [activeSession]);

  // 휴식 종료 예약 알림 (백그라운드에서도 타이머 종료 알림 + 30s/10s 경고)
  useEffect(() => {
    if (!activeSession) return;
    if (timerState.running && !timerState.paused && timerState.remaining > 0) {
      scheduleRestEndNotification(timerState.remaining, currentExName || undefined).catch(() => {});
    } else {
      cancelRestEndNotification().catch(() => {});
    }
  }, [timerState.running, timerState.paused]);

  // iOS Live Activity (잠금화면 + 다이나믹 아일랜드)에 휴식 타이머 표시.
  // 네이티브 미빌드/Android에서는 wrapper가 no-op이라 안전.
  const liveActivityActiveRef = useRef(false);
  useEffect(() => {
    if (!activeSession) return;
    const { running, paused, remaining } = timerState;
    if (running && remaining > 0) {
      const endDateMs = Date.now() + remaining * 1000;
      const name =
        currentExName ||
        activeSession.exercises[activeSession.exercises.length - 1]?.name ||
        "휴식";
      if (!liveActivityActiveRef.current) {
        startRestLiveActivity(name, endDateMs, paused, remaining);
        liveActivityActiveRef.current = true;
      } else {
        updateRestLiveActivity(endDateMs, paused, remaining);
      }
    } else if (liveActivityActiveRef.current) {
      endRestLiveActivity();
      liveActivityActiveRef.current = false;
    }
  }, [timerState.running, timerState.paused]);

  /**
   * 휴식 타이머 초기화.
   * timerState/timerPinned/currentExName은 workout.tsx 로컬 상태라 탭이 언마운트되지
   * 않는 한 세션이 끝나도 자동으로 비워지지 않는다(앱을 재시작해야 초기화되던 버그).
   */
  const resetTimer = useCallback(() => {
    setTimerState(INITIAL_TIMER_STATE);
    setTimerPinned(false);
    setCurrentExName("");
    cancelRestEndNotification().catch(() => {});
    endRestLiveActivity();
    liveActivityActiveRef.current = false;
  }, []);

  // 세션이 바뀔 때마다(새 세션 시작 → 새 id / 종료·취소 → null) 타이머를 리셋해
  // 이전 세션의 휴식 타이머 값이 다음 세션으로 넘어오지 않게 한다.
  useEffect(() => {
    resetTimer();
  }, [activeSession?.id, resetTimer]);

  useEffect(() => {
    if (communityExpanded) fetchPublicRoutines(communitySort).catch(() => {});
  }, [communityExpanded, communitySort]);

  const handleShareToggle = (
    routine: import("../../store/routineStore").Routine
  ) => {
    if (routine.isPublic && routine.shareCode) {
      showCuteAlert({
        icon: "mail",
        tone: "info",
        title: "공유 중",
        message: `공유 코드: ${routine.shareCode}`,
        buttons: [
          { label: "닫기", style: "soft" },
          {
            label: "비공개로 변경",
            style: "primary",
            onPress: () =>
              unshareRoutine(routine.id).catch(() =>
                showCuteAlert({
                  icon: "alert",
                  tone: "danger",
                  title: "오류",
                  message: "변경에 실패했어요",
                  buttons: [{ label: "확인", style: "primary" }],
                })
              ),
          },
        ],
      });
    } else {
      showCuteAlert({
        icon: "mail",
        tone: "info",
        title: "루틴 공개",
        message: "이 루틴을 다른 사람과 공유할까요?\n공유 코드가 생성돼요.",
        buttons: [
          { label: "취소", style: "soft" },
          {
            label: "공개하기",
            style: "primary",
            onPress: () =>
              shareRoutine(routine.id).catch(() =>
                showCuteAlert({
                  icon: "alert",
                  tone: "danger",
                  title: "오류",
                  message: "공유 설정에 실패했어요",
                  buttons: [{ label: "확인", style: "primary" }],
                })
              ),
          },
        ],
      });
    }
  };

  const handleCopy = async (id: string) => {
    setCopyingId(id);
    try {
      await copyRoutine(id);
      showCuteAlert({
        icon: "check",
        tone: "ok",
        title: "완료",
        message: "내 루틴으로 가져왔어요!",
        buttons: [{ label: "확인", style: "primary" }],
      });
    } catch {
      showCuteAlert({
        icon: "alert",
        tone: "danger",
        title: "오류",
        message: "가져오기에 실패했어요",
        buttons: [{ label: "확인", style: "primary" }],
      });
    } finally {
      setCopyingId(null);
    }
  };

  const handleCodeSearch = async () => {
    if (codeInput.trim().length !== 6) {
      showCuteAlert({
        icon: "pencil",
        tone: "warn",
        title: "코드 오류",
        message: "6자리 코드를 입력해주세요",
        buttons: [{ label: "확인", style: "primary" }],
      });
      return;
    }
    setCodeSearching(true);
    setCodeResult(null);
    try {
      const result = await searchByCode(codeInput);
      setCodeResult(result);
    } catch {
      showCuteAlert({
        icon: "alert",
        tone: "warn",
        title: "루틴을 찾을 수 없어요",
        message: "코드를 다시 확인해주세요",
        buttons: [{ label: "확인", style: "primary" }],
      });
    } finally {
      setCodeSearching(false);
    }
  };

  const handleSaveAsRoutine = async () => {
    const name = saveRoutineName.trim();
    if (!name) return;
    setSavingRoutine(true);
    try {
      await useRoutineStore.getState().addRoutine({
        name,
        exercises: saveRoutineExercises.map((ex) => ({
          name: ex.name,
          category: ex.category,
          defaultSets: ex.sets.length || 3,
          defaultWeight: ex.sets[0]?.weight,
          defaultUnit: (ex.sets[0]?.unit as 'kg' | 'lbs' | undefined) ?? 'kg',
          defaultReps: ex.sets[0]?.reps,
          restSeconds: ex.restSeconds,
          targetReps: ex.targetReps,
          settings: ex.settings,
          tip: ex.tip,
          targetMuscles: ex.targetMuscles,
          isSingleArm: ex.isSingleArm,
        })),
      });
    } finally {
      setSavingRoutine(false);
      setShowSaveRoutineModal(false);
      setSaveRoutineName("");
      setSaveRoutineExercises([]);
    }
  };

  const handleEnd = () => {
    const weightKg = user?.weight ?? 70;
    const durationMinutes = sessionStartTime
      ? Math.max(Math.round((Date.now() - sessionStartTime) / 60000), 1)
      : 30;
    const calories = activeSession
      ? calculateCaloriesBurned(activeSession, weightKg, durationMinutes)
      : 0;
    const snapshot = activeSession;

    showCuteAlert({
      icon: "check",
      tone: "ok",
      title: "운동 종료",
      message: "오늘 운동을 종료할까요?",
      showClose: true,
      buttons: [
        {
          label: "저장하지 않고 종료",
          style: "soft",
          onPress: () => cancelSession(),
        },
        {
          label: "저장 및 종료",
          style: "primary",
          onPress: async () => {
            const result = await endSession(calories);
            if (result === "empty") {
              showCuteAlert({
                icon: "alert",
                tone: "info",
                title: "저장할 운동이 없어요",
                message: "완료한 세트가 없어서 기록이 저장되지 않아요",
                buttons: [
                  { label: "확인", style: "primary", onPress: () => cancelSession() },
                ],
              });
              return;
            }
            setCompleteCalories(calories);
            if (snapshot?.fromRoutineId) {
              // 루틴으로 시작한 운동: 실제 수행한 세트(세트별 무게/횟수)를 루틴에 반영해
              // 다음에 같은 루틴으로 시작할 때 마지막 값이 세트별로 그대로 복원되게 한다.
              useRoutineStore
                .getState()
                .updateRoutineFromSession(snapshot.fromRoutineId, snapshot)
                .catch(() => {});
            } else if ((snapshot?.exercises.length ?? 0) > 0) {
              setSaveRoutineExercises(snapshot!.exercises);
              setSaveRoutineName("");
              setShowSaveRoutineModal(true);
            }
          },
        },
      ],
    });
  };

  const markedDates = useMemo(() => {
    const result: Record<string, any> = {};
    sessions.forEach((s) => {
      const key = SESSION_DATE_KEY(s);
      result[key] = { marked: true, dotColor: c.danger };
    });
    // 쉬는날: 회색 채움 + 옅은 점으로 운동한 날(빨간 점)과 구분
    restDays.forEach((date) => {
      result[date] = {
        ...(result[date] ?? {}),
        marked: true,
        dotColor: c.textMuted,
        selected: true,
        selectedColor: c.surfaceAlt,
        selectedTextColor: c.textMuted,
      };
    });
    if (selectedDate) {
      result[selectedDate] = {
        ...(result[selectedDate] ?? {}),
        selected: true,
        selectedColor: c.primary,
        selectedTextColor: c.surface,
        dotColor: result[selectedDate]?.marked ? c.surface : c.danger,
      };
    }
    return result;
  }, [sessions, restDays, selectedDate]);

  const isSelectedRestDay = useMemo(
    () => (selectedDate ? restDays.includes(selectedDate) : false),
    [restDays, selectedDate]
  );

  /**
   * 쉬는날 지정/해제 핸들러.
   * 지정 시에는 확인 다이얼로그를 띄우고, 해제는 바로 처리한다.
   */
  const handleToggleRestDay = (date: string) => {
    if (restDays.includes(date)) {
      toggleRestDay(date);
      return;
    }
    showCuteAlert({
      icon: "check",
      tone: "info",
      title: "쉬는날 지정",
      message: "이 날을 쉬는날로 표시할까요?",
      buttons: [
        { label: "취소", style: "soft" },
        {
          label: "쉬는날로 지정",
          style: "primary",
          onPress: () => toggleRestDay(date),
        },
      ],
    });
  };

  const monthSessions = useMemo(
    () => sessions.filter((s) => SESSION_DATE_KEY(s).startsWith(visibleMonth)),
    [sessions, visibleMonth]
  );

  const monthVolume = useMemo(
    () => monthSessions.reduce((sum, s) => sum + getTotalVolume(s), 0),
    [monthSessions]
  );

  const monthCalories = useMemo(
    () => monthSessions.reduce((sum, s) => sum + (s.caloriesBurned ?? 0), 0),
    [monthSessions]
  );

  const selectedSessions = useMemo(
    () =>
      selectedDate
        ? sessions.filter((s) => SESSION_DATE_KEY(s) === selectedDate)
        : [],
    [sessions, selectedDate]
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color={c.success} />
      </View>
    );
  }

  // 로드 실패 폴백 — workoutStore.fetchSessions가 throw 대신 loadError를 세팅하므로
  // 여기서 재시도 UI를 그린다. 이게 없으면 실패 시 빈 화면만 남는다.
  // DESIGN.md: 의미색(danger)은 아이콘에만 싣고 본문은 text-secondary로 둔다
  // (라이트 테마에서 danger는 흰 카드 위 3.19:1로 본문 대비 기준 미달).
  if (loadError) {
    return (
      <View
        className="flex-1 bg-background items-center justify-center"
        style={{ paddingHorizontal: 16 }}>
        {/* 카드(L1) 위에 올린다 — 라이트 테마에서 danger 아이콘이 background(#F2F6FB)
            위로는 2.94:1이라 비텍스트 3:1 기준에 미달하고, surface 위에서는 3.19:1로 통과한다. */}
        <View
          style={{
            alignItems: "center",
            alignSelf: "stretch",
            paddingVertical: 24,
            paddingHorizontal: 16,
            borderRadius: 16,
            backgroundColor: c.surface,
          }}>
          <Icon name="info" size={28} color={c.danger} />
          <Text
            accessibilityRole="alert"
            style={{
              marginTop: 12,
              fontSize: 14,
              fontWeight: "600",
              lineHeight: 20,
              color: c.textSecondary,
              textAlign: "center",
            }}>
            {loadError}
          </Text>
          <TouchableOpacity
            onPress={() => fetchSessions()}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="운동 기록 다시 불러오기"
            style={{
              marginTop: 20,
              minHeight: 44,
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 20,
              borderRadius: 999,
              backgroundColor: c.primary,
            }}>
            <Icon name="refresh" size={16} color={c.onAccent} />
            <Text style={{ fontSize: 14, fontWeight: "800", color: c.onAccent }}>
              다시 시도
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const timerProps = activeSession
    ? {
        exerciseName: currentExName || activeSession.exercises[activeSession.exercises.length - 1]?.name,
        externalSeconds: timerState.seconds,
        externalRemaining: timerState.remaining,
        externalRunning: timerState.running,
        externalPaused: timerState.paused,
        onStateChange: setTimerState,
        onPin: () => setTimerPinned(true),
        onUnpin: () => setTimerPinned(false),
      }
    : null;
  return (
    <View className="flex-1 bg-background">
      <Header title="운동" />

      {/* 탭 */}
      <View
        style={{
          flexDirection: "row",
          backgroundColor: c.surfaceAlt,
          borderRadius: 999,
          padding: 4,
          marginHorizontal: 18,
          marginBottom: 14,
          gap: 4,
        }}>
        {(["today", "history"] as Tab[]).map((t) => {
          const isActiveTab = tab === t;
          return (
            <TouchableOpacity activeOpacity={0.7}
              key={t}
              style={[
                {
                  flex: 1,
                  paddingVertical: 9,
                  alignItems: "center",
                  borderRadius: 999,
                },
                isActiveTab
                  ? { backgroundColor: c.surface, ...SHADOW_SM }
                  : undefined,
              ]}
              onPress={() => setTab(t)}>
              <Text
                style={{
                  fontSize: 14,
                  fontWeight: "800",
                  color: isActiveTab ? c.success : c.textMuted,
                }}>
                {t === "today" ? "오늘 운동" : "히스토리"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {activeSession && timerPinned && timerProps && (
        <RestTimer {...timerProps} pinned={true} />
      )}

      {tab === "today" ? (
          <KeyboardAwareScrollView
            ref={todayKasRef}
            innerRef={(ref) => { todayScrollRef.current = ref; }}
            onScroll={(e) => {
              todayScrollOffset.current = e.nativeEvent.contentOffset.y;
            }}
            scrollEventThrottle={16}
            enableOnAndroid
            enableAutomaticScroll
            extraScrollHeight={180}
            extraHeight={180}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              padding: 20,
              // pinned 타이머는 이 ScrollView 위에 일반 흐름(sibling)으로 배치돼 이미 공간을
              // 차지하므로, paddingTop으로 타이머 높이를 또 더하지 않는다 (중복 여백 제거).
              // KAS의 extraScrollHeight가 키보드 인셋을 처리하므로 하단도 정적값만 둔다.
              paddingBottom: 40,
            }}>
            {!activeSession ? (
              <>
                {/* 제목 + 운동 시작 버튼 */}
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 16,
                  }}>
                  <Text
                    style={{
                      fontSize: 17,
                      fontWeight: "800",
                      color: c.textPrimary,
                    }}>
                    내 루틴
                  </Text>
                  <TouchableOpacity
                    style={[
                      {
                        backgroundColor: c.warning,
                        borderRadius: 999,
                        paddingHorizontal: 18,
                        paddingVertical: 9,
                      },
                      SHADOW_SM,
                    ]}
                    onPress={startSession}
                    activeOpacity={0.7}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "800",
                        color: c.onAccent,
                      }}>
                      운동 시작
                    </Text>
                  </TouchableOpacity>
                </View>

                {routines.length === 0 ? (
                  <View
                    style={{
                      alignItems: "center",
                      paddingTop: 40,
                      paddingBottom: 20,
                      gap: 8,
                    }}>
                    <Icon name="dumbbell" size={28} color={c.textMuted} />
                    <Text
                      style={{
                        fontSize: 17,
                        fontWeight: "800",
                        color: c.textPrimary,
                        marginTop: 4,
                      }}>
                      아직 루틴이 없어요
                    </Text>
                    <Text
                      style={{
                        fontSize: 14,
                        color: c.textSecondary,
                        textAlign: "center",
                        lineHeight: 22,
                      }}>
                      루틴을 만들면 매번 운동을{"\n"}빠르게 시작할 수 있어요
                    </Text>
                    <TouchableOpacity
                      style={[
                        {
                          backgroundColor: c.primary,
                          borderRadius: 999,
                          paddingHorizontal: 32,
                          paddingVertical: 14,
                          marginTop: 8,
                        },
                        SHADOW,
                      ]}
                      onPress={() =>
                        router.push("/modal/routine-manage" as any)
                      }
                      activeOpacity={0.7}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "800",
                          color: c.onAccent,
                        }}>
                        루틴 만들기 +
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <SortableList
                      data={routines}
                      keyExtractor={(r) => r.id}
                      itemHeight={136}
                      scrollRef={todayScrollRef}
                      scrollOffsetRef={todayScrollOffset}
                      onDragStart={() =>
                        todayScrollRef.current?.setNativeProps?.({
                          scrollEnabled: false,
                        })
                      }
                      onDragRelease={() =>
                        todayScrollRef.current?.setNativeProps?.({
                          scrollEnabled: true,
                        })
                      }
                      onDragEnd={(ordered) =>
                        reorderRoutines(ordered.map((r) => r.id))
                      }
                      renderItem={(routine, _idx, isActive) => (
                        <View
                          style={[
                            {
                              backgroundColor: c.surface,
                              borderWidth: 1,
                              borderColor: c.border,
                              borderRadius: 24,
                              padding: 16,
                              marginBottom: 10,
                            },
                            SHADOW,
                          ]}>
                          <View
                            style={{
                              flexDirection: "row",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: 10,
                            }}>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={{
                                  fontSize: 17,
                                  fontWeight: "800",
                                  color: c.textPrimary,
                                }}>
                                {routine.name}
                              </Text>
                              <Text
                                style={{
                                  fontSize: 12,
                                  color: c.textSecondary,
                                  fontWeight: "600",
                                  marginTop: 3,
                                }}>
                                {routine.exercises.length}종목
                              </Text>
                            </View>
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                // 16·17·17 세 개가 44 세 개가 되면서 묶음이 96 → 160pt가 된다.
                                // gap 10 → 4로 증가분을 82에서 64로 줄인다. 박스가 각각
                                // 13pt씩 여백을 가져 아이콘 사이 간격은 시각적으로 유지된다.
                                // hitSlop은 쓰지 않는다 — 아이콘 중심 간격이 26~27pt뿐이라
                                // 44 hitSlop이 서로 17pt 겹치고, 겹친 구간은 뒤에 렌더된
                                // 삭제가 가져간다(연필 글리프 오른쪽 끝을 눌러도 삭제).
                                gap: 4,
                              }}>
                              <View style={{ opacity: isActive ? 1.0 : 0.3 }}>
                                <Icon
                                  name="menu"
                                  size={16}
                                  color={c.textSecondary}
                                />
                              </View>
                              <IconButton
                                accessibilityLabel={`${routine.name} ${routine.isPublic ? "공유 중지" : "공유 시작"}`}
                                onPress={() => handleShareToggle(routine)}>
                                <Icon
                                  name={routine.isPublic ? "unlock" : "lock"}
                                  size={16}
                                  color={c.textSecondary}
                                />
                              </IconButton>
                              <IconButton
                                accessibilityLabel={`${routine.name} 편집`}
                                onPress={() =>
                                  router.push({
                                    pathname: "/modal/routine-manage",
                                    params: { editId: routine.id },
                                  } as any)
                                }>
                                <Icon
                                  name="pencil"
                                  size={17}
                                  color={c.textSecondary}
                                />
                              </IconButton>
                              <IconButton
                                accessibilityLabel={`${routine.name} 삭제`}
                                onPress={() =>
                                  showCuteAlert({
                                    icon: "trash",
                                    tone: "danger",
                                    title: "루틴 삭제",
                                    message: `"${routine.name}"을 삭제할까요?`,
                                    buttons: [
                                      { label: "취소", style: "soft" },
                                      {
                                        label: "삭제",
                                        style: "primary",
                                        onPress: () =>
                                          deleteRoutine(routine.id),
                                      },
                                    ],
                                  })
                                }>
                                <Icon
                                  name="trash"
                                  size={17}
                                  color={c.textMuted}
                                />
                              </IconButton>
                              <TouchableOpacity
                                style={{
                                  backgroundColor: c.warning,
                                  borderRadius: 999,
                                  paddingHorizontal: 14,
                                  paddingVertical: 7,
                                }}
                                onPress={() => startSessionWithRoutine(routine)}
                                activeOpacity={0.7}>
                                <Text
                                  style={{
                                    fontSize: 14,
                                    fontWeight: "800",
                                    color: c.onAccent,
                                  }}>
                                  시작
                                </Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                          <View
                            style={{
                              flexDirection: "row",
                              flexWrap: "wrap",
                              gap: 6,
                            }}>
                            {routine.exercises.slice(0, 5).map((ex, i) => (
                              <View
                                key={i}
                                style={{
                                  backgroundColor: c.surfaceAlt,
                                  borderRadius: 999,
                                  paddingHorizontal: 10,
                                  paddingVertical: 4,
                                }}>
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: "700",
                                    color: c.success,
                                  }}>
                                  {ex.name} ×{ex.defaultSets}
                                </Text>
                              </View>
                            ))}
                            {routine.exercises.length > 5 && (
                              <View
                                style={{
                                  backgroundColor: c.surfaceHigh,
                                  borderRadius: 999,
                                  paddingHorizontal: 10,
                                  paddingVertical: 4,
                                }}>
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: "700",
                                    color: c.textMuted,
                                  }}>
                                  +{routine.exercises.length - 5}
                                </Text>
                              </View>
                            )}
                          </View>
                          {routine.isPublic && routine.shareCode && (
                            <View
                              style={{
                                marginTop: 8,
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 6,
                              }}>
                              <View
                                style={{
                                  backgroundColor: c.surfaceAlt,
                                  borderRadius: 999,
                                  paddingHorizontal: 10,
                                  paddingVertical: 4,
                                }}>
                                <View
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 4,
                                  }}>
                                  <Icon
                                    name="unlock"
                                    size={11}
                                    color={c.success}
                                  />
                                  <Text
                                    style={{
                                      fontSize: 11,
                                      fontWeight: "700",
                                      color: c.success,
                                      letterSpacing: 2,
                                    }}>
                                    {routine.shareCode}
                                  </Text>
                                </View>
                              </View>
                              <Text
                                style={{
                                  fontSize: 11,
                                  color: c.textSecondary,
                                }}>
                                공유 중
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    />

                    <TouchableOpacity
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        paddingVertical: 14,
                        borderRadius: 999,
                        borderWidth: 1.5,
                        borderColor: c.border,
                        marginTop: 4,
                      }}
                      onPress={() =>
                        router.push("/modal/routine-manage" as any)
                      }
                      activeOpacity={0.7}>
                      <Icon name="plus" size={16} color={c.primary} />
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: c.textSecondary,
                        }}>
                        루틴 만들기 +
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: 24,
                        marginBottom: 10,
                      }}
                      onPress={() => setCommunityExpanded((v) => !v)}
                      activeOpacity={0.7}>
                      <Text
                        style={{
                          fontSize: 17,
                          fontWeight: "800",
                          color: c.textPrimary,
                        }}>
                        커뮤니티 루틴
                      </Text>
                      <Text
                        style={{
                          fontSize: 14,
                          color: c.textSecondary,
                          fontWeight: "600",
                        }}>
                        {communityExpanded ? "접기 ▲" : "더 보기 ▼"}
                      </Text>
                    </TouchableOpacity>

                    {communityExpanded && (
                      <>
                        <View
                          style={{
                            flexDirection: "row",
                            gap: 8,
                            marginBottom: 12,
                          }}>
                          {(["latest", "popular"] as const).map((s) => (
                            <TouchableOpacity activeOpacity={0.7}
                              key={s}
                              style={{
                                paddingHorizontal: 16,
                                paddingVertical: 7,
                                borderRadius: 999,
                                backgroundColor:
                                  communitySort === s
                                    ? c.primary
                                    : c.surfaceAlt,
                              }}
                              onPress={() => setCommunitySort(s)}>
                              <Text
                                style={{
                                  fontSize: 12,
                                  fontWeight: "600",
                                  color:
                                    communitySort === s
                                      ? c.surface
                                      : c.textSecondary,
                                }}>
                                {s === "latest" ? "최신순" : "인기순"}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        <View
                          style={{
                            flexDirection: "row",
                            gap: 8,
                            marginBottom: 12,
                            alignItems: "center",
                          }}>
                          <TextInput
                            style={{
                              flex: 1,
                              backgroundColor: c.surface,
                              borderRadius: 12,
                              paddingHorizontal: 14,
                              paddingVertical: 10,
                              fontSize: 15,
                              fontWeight: "800",
                              color: c.textPrimary,
                              borderWidth: 1.5,
                              borderColor: c.border,
                              letterSpacing: 2,
                            }}
                            placeholder="6자리 코드 입력"
                            placeholderTextColor={c.textMuted}
                            value={codeInput}
                            onChangeText={(t) => {
                              setCodeInput(t.toUpperCase());
                              setCodeResult(null);
                            }}
                            maxLength={6}
                            autoCapitalize="characters"
                          />
                          <TouchableOpacity
                            style={{
                              backgroundColor: c.primary,
                              borderRadius: 12,
                              paddingHorizontal: 16,
                              paddingVertical: 10,
                            }}
                            onPress={handleCodeSearch}
                            activeOpacity={0.7}>
                            {codeSearching ? (
                              <ActivityIndicator
                                size="small"
                                color={c.surface}
                              />
                            ) : (
                              <Text
                                style={{
                                  fontSize: 14,
                                  fontWeight: "800",
                                  color: c.onAccent,
                                }}>
                                검색
                              </Text>
                            )}
                          </TouchableOpacity>
                        </View>

                        {codeResult && (
                          <View
                            style={[
                              {
                                backgroundColor: c.surface,
                                borderRadius: 16,
                                padding: 14,
                                marginBottom: 10,
                                borderWidth: 2,
                                borderColor: c.primary,
                              },
                              SHADOW_SM,
                            ]}>
                            <View
                              style={{
                                flexDirection: "row",
                                justifyContent: "space-between",
                                alignItems: "flex-start",
                                marginBottom: 8,
                              }}>
                              <View style={{ flex: 1 }}>
                                <Text
                                  style={{
                                    fontSize: 15,
                                    fontWeight: "800",
                                    color: c.textPrimary,
                                  }}>
                                  {codeResult.name}
                                </Text>
                                <Text
                                  style={{
                                    fontSize: 11,
                                    color: c.textSecondary,
                                    marginTop: 2,
                                  }}>
                                  by {codeResult.authorName ?? "익명"}
                                </Text>
                              </View>
                              <TouchableOpacity activeOpacity={0.7}
                                style={{
                                  backgroundColor: c.warning,
                                  borderRadius: 999,
                                  paddingHorizontal: 14,
                                  paddingVertical: 7,
                                }}
                                onPress={() => handleCopy(codeResult!.id)}
                                disabled={copyingId === codeResult.id}>
                                {copyingId === codeResult.id ? (
                                  <ActivityIndicator
                                    size="small"
                                    color={c.surface}
                                  />
                                ) : (
                                  <Text
                                    style={{
                                      fontSize: 12,
                                      fontWeight: "600",
                                      color: c.onAccent,
                                    }}>
                                    가져오기
                                  </Text>
                                )}
                              </TouchableOpacity>
                            </View>
                            <View
                              style={{
                                flexDirection: "row",
                                flexWrap: "wrap",
                                gap: 5,
                              }}>
                              {codeResult.exercises.slice(0, 4).map((ex, i) => (
                                <View
                                  key={i}
                                  style={{
                                    backgroundColor: c.surfaceAlt,
                                    borderRadius: 999,
                                    paddingHorizontal: 9,
                                    paddingVertical: 3,
                                  }}>
                                  <Text
                                    style={{
                                      fontSize: 11,
                                      fontWeight: "700",
                                      color: c.success,
                                    }}>
                                    {ex.name}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          </View>
                        )}

                        {publicRoutines.length === 0 ? (
                          <View
                            style={{
                              alignItems: "center",
                              paddingVertical: 24,
                            }}>
                            <Text
                              style={{
                                fontSize: 14,
                                color: c.textMuted,
                                fontWeight: "600",
                              }}>
                              아직 공유된 루틴이 없어요
                            </Text>
                          </View>
                        ) : (
                          publicRoutines.map((r) => (
                            <View
                              key={r.id}
                              style={[
                                {
                                  backgroundColor: c.surface,
                                  borderWidth: 1,
                                  borderColor: c.border,
                                  borderRadius: 16,
                                  padding: 14,
                                  marginBottom: 10,
                                },
                                SHADOW_SM,
                              ]}>
                              <View
                                style={{
                                  flexDirection: "row",
                                  justifyContent: "space-between",
                                  alignItems: "flex-start",
                                  marginBottom: 8,
                                }}>
                                <View style={{ flex: 1 }}>
                                  <Text
                                    style={{
                                      fontSize: 15,
                                      fontWeight: "800",
                                      color: c.textPrimary,
                                    }}>
                                    {r.name}
                                  </Text>
                                  <View
                                    style={{
                                      flexDirection: "row",
                                      alignItems: "center",
                                      gap: 6,
                                      marginTop: 2,
                                    }}>
                                    <Text
                                      style={{
                                        fontSize: 11,
                                        color: c.textSecondary,
                                      }}>
                                      by {r.authorName ?? "익명"}
                                    </Text>
                                    <Text
                                      style={{
                                        fontSize: 11,
                                        color: c.textMuted,
                                      }}>
                                      ·
                                    </Text>
                                    <Text
                                      style={{
                                        fontSize: 11,
                                        color: c.textMuted,
                                      }}>
                                      복사 {r.copyCount ?? 0}회
                                    </Text>
                                  </View>
                                </View>
                                <TouchableOpacity activeOpacity={0.7}
                                  style={{
                                    backgroundColor: c.surfaceAlt,
                                    borderRadius: 999,
                                    paddingHorizontal: 12,
                                    paddingVertical: 6,
                                  }}
                                  onPress={() => handleCopy(r.id)}
                                  disabled={copyingId === r.id}>
                                  {copyingId === r.id ? (
                                    <ActivityIndicator
                                      size="small"
                                      color={c.success}
                                    />
                                  ) : (
                                    <Text
                                      style={{
                                        fontSize: 12,
                                        fontWeight: "600",
                                        color: c.success,
                                      }}>
                                      내 루틴으로
                                    </Text>
                                  )}
                                </TouchableOpacity>
                              </View>
                              <View
                                style={{
                                  flexDirection: "row",
                                  flexWrap: "wrap",
                                  gap: 5,
                                }}>
                                {r.exercises.slice(0, 4).map((ex, i) => (
                                  <View
                                    key={i}
                                    style={{
                                      backgroundColor: c.surfaceAlt,
                                      borderRadius: 999,
                                      paddingHorizontal: 9,
                                      paddingVertical: 3,
                                    }}>
                                    <Text
                                      style={{
                                        fontSize: 11,
                                        fontWeight: "700",
                                        color: c.success,
                                      }}>
                                      {ex.name}
                                    </Text>
                                  </View>
                                ))}
                                {r.exercises.length > 4 && (
                                  <View
                                    style={{
                                      backgroundColor: c.surfaceHigh,
                                      borderRadius: 999,
                                      paddingHorizontal: 9,
                                      paddingVertical: 3,
                                    }}>
                                    <Text
                                      style={{
                                        fontSize: 11,
                                        fontWeight: "700",
                                        color: c.textMuted,
                                      }}>
                                      +{r.exercises.length - 4}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>
                          ))
                        )}
                      </>
                    )}
                  </>
                )}
              </>
            ) : (
              <>
                {/* 운동 중 헤더 */}
                <WorkoutTimer
                  exerciseCount={activeSession.exercises.length}
                  totalVolume={getTotalVolume(activeSession)}
                  paused={workoutPaused}
                  onPausedChange={(v) => {
                    setWorkoutPaused(v);
                  }}
                  onEnd={handleEnd}
                />
                {activeSession.fromRoutineId &&
                  (() => {
                    const rn = routines.find(
                      (r) => r.id === activeSession.fromRoutineId
                    );
                    return rn ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          marginBottom: 8,
                          paddingHorizontal: 4,
                        }}>
                        <Text
                          style={{
                            fontSize: 12,
                            color: c.textMuted,
                            fontWeight: "600",
                          }}>
                          기반 루틴:
                        </Text>
                        <View
                          style={{
                            backgroundColor: c.surfaceAlt,
                            borderRadius: 999,
                            paddingHorizontal: 10,
                            paddingVertical: 3,
                          }}>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 4,
                            }}>
                            <Icon name="list" size={11} color={c.success} />
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: "700",
                                color: c.success,
                              }}>
                              {rn.name}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ) : null;
                  })()}
                {!timerPinned && timerProps && (
                  <RestTimer {...timerProps} pinned={false} />
                )}
                {/* 종목 추가 버튼들 */}
                <View
                  style={{ flexDirection: "row", gap: 8, marginBottom: 12 }}>
                  <TouchableOpacity
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      backgroundColor: c.surfaceAlt,
                      borderRadius: 999,
                      paddingVertical: 12,
                    }}
                    onPress={() => router.push("/modal/add-workout")}
                    activeOpacity={0.7}>
                    <Icon name="plus" size={16} color={c.success} />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "800",
                        color: c.success,
                      }}>
                      종목 추가
                    </Text>
                  </TouchableOpacity>
                  {routines.length > 0 && (
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        backgroundColor: c.warning + "18",
                        borderRadius: 999,
                        paddingVertical: 12,
                      }}
                      onPress={() => {
                        setExpandedRoutineInSheet(null);
                        setAddedFromRoutine(new Set());
                        setShowRoutineSheet(true);
                      }}
                      activeOpacity={0.7}>
                      <Icon name="list" size={14} color={c.warning} />
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "800",
                          color: c.warning,
                        }}>
                        루틴에서 가져오기
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {activeSession.exercises.length === 0 ? (
                  <View className="items-center justify-center py-[60px] gap-2">
                    <Icon name="target" size={64} color={c.textMuted} />
                    <Text className="text-sm text-text-secondary text-center">
                      운동 종목을 추가해주세요
                    </Text>
                  </View>
                ) : (
                  <SortableList
                    data={activeSession.exercises}
                    keyExtractor={(ex) => ex.id}
                    itemHeight={300}
                    scrollRef={todayScrollRef}
                    scrollOffsetRef={todayScrollOffset}
                    onDragStart={() =>
                      todayScrollRef.current?.setNativeProps?.({
                        scrollEnabled: false,
                      })
                    }
                    onDragRelease={() =>
                      todayScrollRef.current?.setNativeProps?.({
                        scrollEnabled: true,
                      })
                    }
                    onDragEnd={(reordered) => {
                      reorderSessionExercises(reordered);
                      if (activeSession?.fromRoutineId) {
                        const routine = routines.find(r => r.id === activeSession.fromRoutineId);
                        if (routine) {
                          const reorderedRoutineExercises = reordered
                            .map(ex => routine.exercises.find(re => re.name === ex.name))
                            .filter((re): re is NonNullable<typeof re> => re != null);
                          if (reorderedRoutineExercises.length === routine.exercises.length) {
                            reorderRoutineExercises(activeSession.fromRoutineId, reorderedRoutineExercises).catch(() => {});
                          }
                        }
                      }
                    }}
                    renderItem={(ex, _idx, isActive) => {
                      const isExpanded = !!detailExpanded[ex.id];
                      const completedSets = (() => {
                        const idx = ex.sets.findIndex((s) => !s.completed);
                        return idx === -1 ? ex.sets.length : idx;
                      })();
                      const curIdx = Math.min(
                        completedSets,
                        Math.max(0, ex.sets.length - 1)
                      );
                      const currentSet = ex.sets[curIdx] ?? null;
                      const allDone =
                        ex.sets.length > 0 && completedSets === ex.sets.length;
                      const exVol = calcExerciseVolume(ex);

                      const handleSetTap = (i: number) => {
                        if (i === completedSets) {
                          updateSet(ex.id, ex.sets[i].id, { completed: true });
                          Haptics.impactAsync(
                            Haptics.ImpactFeedbackStyle.Medium
                          );
                          if (ex.restSeconds && ex.restSeconds > 0) {
                            setCurrentExName(ex.name);
                            setTimerState({
                              seconds: ex.restSeconds,
                              remaining: ex.restSeconds,
                              running: true,
                              paused: false,
                            });
                          }
                        } else if (
                          i === completedSets - 1 &&
                          completedSets > 0
                        ) {
                          updateSet(ex.id, ex.sets[i].id, { completed: false });
                          setTimerState((prev) => ({
                            ...prev,
                            running: false,
                            paused: false,
                          }));
                        } else if (i > completedSets) {
                          Haptics.notificationAsync(
                            Haptics.NotificationFeedbackType.Warning
                          );
                        }
                      };

                      return (
                        <View style={{ marginBottom: 8 }}>
                          <Card className="mb-0">
                            {/* Header: chevron + drag + name + pencil + category */}
                            {/* 한 줄 요약 행: 드래그 · 종목명/카테고리/메타 · 세트 원 · 펼침 */}
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 12,
                              }}>
                              <View style={{ opacity: isActive ? 1 : 0.35, flexShrink: 0 }}>
                                <Icon name="menu" size={16} color={c.textSecondary} />
                              </View>

                              {/* 좌측 텍스트 블록 (표시 전용 — 편집은 상세보기에서) */}
                              <View style={{ flex: 1 }}>
                                {/* 카테고리 배지 — 종목명 위에 배치(이름 가림 방지) */}
                                <View
                                  style={{
                                    alignSelf: "flex-start",
                                    backgroundColor: c.surfaceAlt,
                                    borderRadius: 999,
                                    paddingHorizontal: 8,
                                    paddingVertical: 2,
                                    marginBottom: 3,
                                  }}>
                                  <Text style={{ fontSize: 11, fontWeight: "700", color: c.success }}>
                                    {ex.category}
                                  </Text>
                                </View>
                                <Text
                                  style={{ fontSize: 15, fontWeight: "800", color: c.textPrimary, lineHeight: 19 }}
                                  numberOfLines={2}
                                  ellipsizeMode="tail">
                                  {ex.name}
                                </Text>
                                <Text
                                  style={{ fontSize: 12, color: c.textSecondary, marginTop: 2, fontVariant: ["tabular-nums"] }}
                                  numberOfLines={1}>
                                  {completedSets}/{ex.sets.length}세트
                                  {exVol > 0 ? ` · ${exVol.toLocaleString()}kg` : ""}
                                </Text>
                              </View>

                              {/* 세트 원 (가로·좌측정렬, 최대 6 + N) */}
                              {ex.sets.length > 0 && (
                                <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 8, flexShrink: 0 }}>
                                  {ex.sets.slice(0, 6).map((st, i) => (
                                    <SetIndicator
                                      key={st.id}
                                      size={34}
                                      state={i < completedSets ? "done" : i === completedSets ? "current" : "todo"}
                                      index={i}
                                      showLabel={true}
                                      weight={st.weight}
                                      reps={st.reps}
                                      unit={st.unit}
                                      onPress={() => handleSetTap(i)}
                                      onLongPress={() => {
                                        if (ex.sets.length <= 1) {
                                          showCuteAlert({ icon: "alert", tone: "info", title: "알림", message: "세트는 최소 1개가 필요해요", buttons: [{ label: "확인", style: "primary" }] });
                                          return;
                                        }
                                        showCuteAlert({ icon: "trash", tone: "danger", title: "세트 삭제", message: "이 세트를 삭제할까요?", buttons: [{ label: "취소", style: "soft" }, { label: "삭제", style: "primary", onPress: () => removeSet(ex.id, st.id) }] });
                                      }}
                                    />
                                  ))}
                                  {ex.sets.length > 6 && (
                                    <View style={{ height: 34, justifyContent: "center", alignItems: "center", paddingHorizontal: 2 }}>
                                      <Text style={{ fontSize: 11, fontWeight: "700", color: c.textMuted }}>
                                        +{ex.sets.length - 6}
                                      </Text>
                                    </View>
                                  )}
                                </View>
                              )}

                              {/* 펼침 chevron (기존 상세보기 토글 동작 유지) */}
                              <TouchableOpacity activeOpacity={0.7}
                                onPress={() =>
                                  setDetailExpanded((prev) => ({ ...prev, [ex.id]: !isExpanded }))
                                }
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                style={{ flexShrink: 0, paddingHorizontal: 2 }}>
                                <Text style={{ fontSize: 14, color: c.textMuted }}>
                                  {isExpanded ? "▴" : "▾"}
                                </Text>
                              </TouchableOpacity>
                            </View>
                            {/* 세트 원·펼침(▾)은 상단 한 줄 행으로 이동됨 */}

                            {/* ── 상세 정보 (토글) ── */}
                            {isExpanded && (
                              <>
                                {/* ── 종목 정보 편집 (운동명 / 카테고리 / 타겟부위) ── */}
                                <View
                                  style={{
                                    height: 1,
                                    backgroundColor: c.border,
                                    marginTop: 6,
                                    marginBottom: 10,
                                  }}
                                />
                                <View style={{ marginBottom: 4 }}>
                                  <Text style={{ fontSize: 11, fontWeight: "700", color: c.textMuted, marginBottom: 4 }}>
                                    운동명
                                  </Text>
                                  <TextInput
                                    key={ex.name}
                                    defaultValue={ex.name}
                                    placeholder="운동명"
                                    placeholderTextColor={c.textMuted}
                                    returnKeyType="done"
                                    onEndEditing={(e) => {
                                      const v = e.nativeEvent.text.trim();
                                      if (v && v !== ex.name)
                                        updateExercise(ex.id, { name: v } as any);
                                    }}
                                    style={{
                                      fontSize: 14,
                                      fontWeight: "600",
                                      color: c.textPrimary,
                                      backgroundColor: c.surfaceAlt,
                                      borderRadius: 10,
                                      paddingHorizontal: 12,
                                      paddingVertical: 9,
                                    }}
                                  />
                                </View>
                                <View
                                  style={{
                                    backgroundColor: c.surfaceAlt,
                                    borderRadius: 12,
                                    padding: 12,
                                    marginBottom: 10,
                                  }}>
                                  {/* 카테고리 칩 + 타겟부위 다중 선택 (카테고리 변경 시 타겟 리셋) */}
                                  <TargetMuscleSelector
                                    category={ex.category}
                                    onCategoryChange={(cat) =>
                                      updateExercise(ex.id, { category: cat, targetMuscles: [] } as any)
                                    }
                                    targetMuscles={ex.targetMuscles ?? []}
                                    onTargetMusclesChange={(m) =>
                                      updateExercise(ex.id, { targetMuscles: m } as any)
                                    }
                                  />
                                </View>

                                {/* ── 3. 세트 편집 테이블 ── */}
                                <View
                                  style={{
                                    height: 1,
                                    backgroundColor: c.border,
                                    marginTop: 6,
                                    marginBottom: 8,
                                  }}
                                />
                                {ex.sets.length === 0 ? (
                                  <Text
                                    style={{
                                      fontSize: 14,
                                      color: c.textMuted,
                                      textAlign: "center",
                                      paddingVertical: 8,
                                    }}>
                                    수정 버튼을 눌러 세트를 추가해보세요
                                  </Text>
                                ) : (
                                  <View>
                                    <View
                                      style={{
                                        flexDirection: "row",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        paddingHorizontal: 12,
                                        marginBottom: 4,
                                      }}>
                                      <View style={{ width: 34 }} />
                                      <Text
                                        style={{
                                          fontSize: 11,
                                          color: c.textMuted,
                                          flex: 1,
                                        }}>
                                        무게
                                      </Text>
                                      <View style={{ width: 16 }} />
                                      <Text
                                        style={{
                                          fontSize: 11,
                                          color: c.textMuted,
                                          flex: 1,
                                        }}>
                                        횟수
                                      </Text>
                                      <View
                                        style={{
                                          flexDirection: "row",
                                          gap: 3,
                                        }}>
                                        {(["kg", "lbs"] as const).map((u) => {
                                          const curUnit =
                                            ex.sets[0]?.unit ?? "kg";
                                          return (
                                            <TouchableOpacity activeOpacity={0.7}
                                              key={u}
                                              style={{
                                                paddingHorizontal: 7,
                                                paddingVertical: 3,
                                                borderRadius: 999,
                                                backgroundColor:
                                                  curUnit === u
                                                    ? c.primary
                                                    : c.surfaceAlt,
                                              }}
                                              onPress={() => {
                                                if (curUnit !== u) {
                                                  ex.sets.forEach((st) =>
                                                    updateSet(ex.id, st.id, { unit: u })
                                                  );
                                                }
                                              }}>
                                              <Text
                                                style={{
                                                  fontSize: 11,
                                                  fontWeight: "700",
                                                  color:
                                                    curUnit === u
                                                      ? c.surface
                                                      : c.textSecondary,
                                                }}>
                                                {u}
                                              </Text>
                                            </TouchableOpacity>
                                          );
                                        })}
                                      </View>
                                    </View>
                                    <View
                                      style={{
                                        width: "100%",
                                        height: 1,
                                        backgroundColor: c.border,
                                        marginBottom: 6,
                                      }}
                                    />
                                    {ex.sets.map((st, idx) => (
                                      <View
                                        key={st.id}
                                        style={{
                                          flexDirection: "row",
                                          alignItems: "center",
                                          justifyContent: "space-between",
                                          paddingHorizontal: 12,
                                          paddingVertical: 6,
                                        }}>
                                        <Text
                                          style={{
                                            fontSize: 11,
                                            fontWeight: "700",
                                            color: c.textMuted,
                                            width: 34,
                                          }}>
                                          {idx + 1}세트
                                        </Text>
                                        <View
                                          style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            gap: 12,
                                          }}>
                                          <TouchableOpacity activeOpacity={0.7}
                                            style={{
                                              width: 28,
                                              height: 28,
                                              borderRadius: 10,
                                              backgroundColor: c.danger + "20",
                                              alignItems: "center",
                                              justifyContent: "center",
                                            }}
                                            onPress={() =>
                                              updateSet(ex.id, st.id, {
                                                weight: Math.max(
                                                  0,
                                                  st.weight - 5
                                                ),
                                              })
                                            }>
                                            <Text
                                              style={{
                                                fontSize: 11,
                                                fontWeight: "700",
                                                color: c.danger,
                                              }}>
                                              -5
                                            </Text>
                                          </TouchableOpacity>
                                          <TouchableOpacity activeOpacity={0.7}
                                            style={{
                                              paddingHorizontal: 6,
                                              height: 28,
                                              backgroundColor: c.surfaceAlt,
                                              borderRadius: 10,
                                              alignItems: "center",
                                              justifyContent: "center",
                                              minWidth: 54,
                                            }}
                                            onPress={() =>
                                              openPad(
                                                String(st.weight),
                                                true,
                                                st.unit ?? "kg",
                                                (v) =>
                                                  updateSet(ex.id, st.id, {
                                                    weight: parseFloat(v) || 0,
                                                  })
                                              )
                                            }>
                                            <Text
                                              style={{
                                                fontSize: 14,
                                                fontWeight: "800",
                                                color: c.primary,
                                              }}>
                                              {st.weight}
                                              <Text
                                                style={{
                                                  fontSize: 11,
                                                  fontWeight: "700",
                                                  color: c.textMuted,
                                                }}>
                                                {" "}
                                                {st.unit ?? "kg"}
                                              </Text>
                                            </Text>
                                          </TouchableOpacity>
                                          <TouchableOpacity activeOpacity={0.7}
                                            style={{
                                              width: 28,
                                              height: 28,
                                              borderRadius: 10,
                                              backgroundColor: c.success + "20",
                                              alignItems: "center",
                                              justifyContent: "center",
                                            }}
                                            onPress={() =>
                                              updateSet(ex.id, st.id, {
                                                weight: st.weight + 5,
                                              })
                                            }>
                                            <Text
                                              style={{
                                                fontSize: 11,
                                                fontWeight: "700",
                                                color: c.success,
                                              }}>
                                              +5
                                            </Text>
                                          </TouchableOpacity>
                                        </View>
                                        <View
                                          style={{
                                            width: 1,
                                            height: 24,
                                            backgroundColor: c.border,
                                          }}
                                        />
                                        <View
                                          style={{
                                            flexDirection: "row",
                                            alignItems: "center",
                                            gap: 12,
                                          }}>
                                          <TouchableOpacity activeOpacity={0.7}
                                            style={{
                                              width: 28,
                                              height: 28,
                                              borderRadius: 10,
                                              backgroundColor: c.danger + "20",
                                              alignItems: "center",
                                              justifyContent: "center",
                                            }}
                                            onPress={() =>
                                              updateSet(ex.id, st.id, {
                                                reps: Math.max(0, st.reps - 1),
                                              })
                                            }>
                                            <Text
                                              style={{
                                                fontSize: 11,
                                                fontWeight: "700",
                                                color: c.danger,
                                              }}>
                                              -1
                                            </Text>
                                          </TouchableOpacity>
                                          <TouchableOpacity activeOpacity={0.7}
                                            style={{
                                              paddingHorizontal: 6,
                                              height: 28,
                                              backgroundColor: c.surfaceAlt,
                                              borderRadius: 10,
                                              alignItems: "center",
                                              justifyContent: "center",
                                              minWidth: 46,
                                            }}
                                            onPress={() =>
                                              openPad(
                                                String(st.reps),
                                                false,
                                                "회",
                                                (v) =>
                                                  updateSet(ex.id, st.id, {
                                                    reps: parseInt(v) || 0,
                                                  })
                                              )
                                            }>
                                            <Text
                                              style={{
                                                fontSize: 14,
                                                fontWeight: "800",
                                                color: c.primary,
                                              }}>
                                              {st.reps}
                                              <Text
                                                style={{
                                                  fontSize: 11,
                                                  fontWeight: "700",
                                                  color: c.textMuted,
                                                }}>
                                                {" "}
                                                회
                                              </Text>
                                            </Text>
                                          </TouchableOpacity>
                                          <TouchableOpacity activeOpacity={0.7}
                                            style={{
                                              width: 28,
                                              height: 28,
                                              borderRadius: 10,
                                              backgroundColor: c.success + "20",
                                              alignItems: "center",
                                              justifyContent: "center",
                                            }}
                                            onPress={() =>
                                              updateSet(ex.id, st.id, {
                                                reps: st.reps + 1,
                                              })
                                            }>
                                            <Text
                                              style={{
                                                fontSize: 11,
                                                fontWeight: "700",
                                                color: c.success,
                                              }}>
                                              +1
                                            </Text>
                                          </TouchableOpacity>
                                        </View>
                                        <IconButton
                                          accessibilityLabel={`${idx + 1}세트 삭제`}
                                          // 이 세트 행은 이미 카드 폭을 넘겨 삭제 아이콘이
                                          // 카드 밖으로 밀려 있다(실측). box로 20pt 더 키우면
                                          // 밀림이 커지기만 한다. 레이아웃을 건드리지 않는
                                          // hitSlop으로 44를 채운다.
                                          touchTargetMode="hitSlop"
                                          style={{ paddingLeft: 8 }}
                                          onPress={() => {
                                            if (ex.sets.length <= 1) {
                                              showCuteAlert({
                                                icon: "alert",
                                                tone: "info",
                                                title: "알림",
                                                message:
                                                  "세트는 최소 1개가 필요해요",
                                                buttons: [
                                                  {
                                                    label: "확인",
                                                    style: "primary",
                                                  },
                                                ],
                                              });
                                              return;
                                            }
                                            showCuteAlert({
                                              icon: "trash",
                                              tone: "danger",
                                              title: "세트 삭제",
                                              message: "이 세트를 삭제할까요?",
                                              buttons: [
                                                {
                                                  label: "취소",
                                                  style: "soft",
                                                },
                                                {
                                                  label: "삭제",
                                                  style: "primary",
                                                  onPress: () =>
                                                    removeSet(ex.id, st.id),
                                                },
                                              ],
                                            });
                                          }}>
                                          <Icon
                                            name="trash"
                                            size={16}
                                            color={c.danger}
                                          />
                                        </IconButton>
                                      </View>
                                    ))}
                                    <TouchableOpacity activeOpacity={0.7}
                                      style={{
                                        alignItems: "center",
                                        paddingVertical: 8,
                                        borderRadius: 12,
                                        backgroundColor: c.primary + "18",
                                        marginTop: 2,
                                        marginBottom: 4,
                                      }}
                                      onPress={() => {
                                        const last =
                                          ex.sets[ex.sets.length - 1];
                                        addSet(ex.id, {
                                          id: `${ex.id}-add-${Date.now()}`,
                                          weight: last?.weight ?? 0,
                                          reps: last?.reps ?? 0,
                                          completed: false,
                                          unit:
                                            last?.unit ??
                                            ex.sets[0]?.unit ??
                                            "kg",
                                        });
                                      }}>
                                      <Text
                                        style={{
                                          fontSize: 14,
                                          fontWeight: "600",
                                          color: c.success,
                                        }}>
                                        + 세트 추가
                                      </Text>
                                    </TouchableOpacity>
                                  </View>
                                )}

                                {/* ── 4. 한팔 기준 토글 ── */}
                                <View
                                  style={{
                                    height: 1,
                                    backgroundColor: c.border,
                                    marginTop: 8,
                                    marginBottom: 10,
                                  }}
                                />
                                <View
                                  style={{
                                    flexDirection: "row",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    marginBottom: 10,
                                  }}>
                                  <Text
                                    style={{
                                      fontSize: 12,
                                      fontWeight: "600",
                                      color: c.textSecondary,
                                    }}>
                                    한팔 기준
                                    {ex.isSingleArm ? " (볼륨 ×2)" : ""}
                                  </Text>
                                  <View
                                    style={{
                                      flexDirection: "row",
                                      alignItems: "center",
                                      gap: 8,
                                    }}>
                                    <TouchableOpacity
                                      style={{
                                        width: 40,
                                        height: 22,
                                        borderRadius: 10,
                                        backgroundColor: ex.isSingleArm
                                          ? c.primary
                                          : c.surfaceAlt,
                                        justifyContent: "center",
                                        paddingHorizontal: 2,
                                      }}
                                      onPress={() =>
                                        updateExercise(ex.id, {
                                          isSingleArm: !ex.isSingleArm,
                                        })
                                      }
                                      activeOpacity={0.7}>
                                      <View
                                        style={{
                                          width: 18,
                                          height: 18,
                                          borderRadius: 10,
                                          backgroundColor: c.surface,
                                          transform: [
                                            {
                                              translateX: ex.isSingleArm
                                                ? 18
                                                : 0,
                                            },
                                          ],
                                          ...(isDark ? null : LIGHT_SHADOW_XS),
                                        }}
                                      />
                                    </TouchableOpacity>
                                  </View>
                                </View>

                                {/* ── 5. 기구 설정 ── */}
                                <View style={{ marginBottom: 10 }}>
                                  <Text
                                    style={{
                                      fontSize: 11,
                                      fontWeight: "700",
                                      color: c.textMuted,
                                      marginBottom: 8,
                                    }}>
                                    기구 설정
                                  </Text>
                                  <View
                                    style={{
                                      flexDirection: "row",
                                      flexWrap: "wrap",
                                      gap: 6,
                                    }}>
                                    {(ex.settings ?? []).map((s, si) => (
                                      <View
                                        key={si}
                                        style={{
                                          flexDirection: "row",
                                          alignItems: "center",
                                          backgroundColor: c.surfaceAlt,
                                          borderRadius: 999,
                                          paddingLeft: 10,
                                          paddingRight: 4,
                                          paddingVertical: 4,
                                          gap: 4,
                                        }}>
                                        <Text
                                          style={{
                                            fontSize: 11,
                                            fontWeight: "700",
                                            color: c.success,
                                          }}>
                                          {s.key}: {s.value}
                                        </Text>
                                        <TouchableOpacity activeOpacity={0.7}
                                          onPress={() =>
                                            updateExercise(ex.id, {
                                              settings: (
                                                ex.settings ?? []
                                              ).filter((_, idx) => idx !== si),
                                            })
                                          }
                                          hitSlop={{
                                            top: 6,
                                            bottom: 6,
                                            left: 4,
                                            right: 4,
                                          }}>
                                          <Text
                                            style={{
                                              fontSize: 14,
                                              color: c.textMuted,
                                              fontWeight: "600",
                                            }}>
                                            ×
                                          </Text>
                                        </TouchableOpacity>
                                      </View>
                                    ))}
                                    <TouchableOpacity activeOpacity={0.7}
                                      style={{
                                        backgroundColor: c.surfaceAlt,
                                        borderRadius: 999,
                                        paddingHorizontal: 10,
                                        paddingVertical: 4,
                                        borderWidth: 1,
                                        borderColor: c.border,
                                      }}
                                      onPress={() =>
                                        setAddingSettingFor(
                                          addingSettingFor === ex.id
                                            ? null
                                            : ex.id
                                        )
                                      }>
                                      <Text
                                        style={{
                                          fontSize: 11,
                                          fontWeight: "700",
                                          color: c.textSecondary,
                                        }}>
                                        + 추가
                                      </Text>
                                    </TouchableOpacity>
                                  </View>
                                  {addingSettingFor === ex.id && (
                                    <View style={{ marginTop: 8 }}>
                                      <SettingSelector
                                        onAdd={(key, value) => {
                                          updateExercise(ex.id, {
                                            settings: [
                                              ...(ex.settings ?? []),
                                              { key, value },
                                            ],
                                          });
                                          setAddingSettingFor(null);
                                        }}
                                      />
                                    </View>
                                  )}
                                </View>

                                {/* ── 6. 목표 횟수 ── */}
                                <View style={{ marginBottom: 10 }}>
                                  <Text
                                    style={{
                                      fontSize: 11,
                                      fontWeight: "700",
                                      color: c.textMuted,
                                      marginBottom: 6,
                                    }}>
                                    목표 횟수
                                  </Text>
                                  <TextInput
                                    style={{
                                      backgroundColor: c.surfaceAlt,
                                      borderRadius: 12,
                                      padding: 10,
                                      fontSize: 14,
                                      fontWeight: "600",
                                      color: c.textPrimary,
                                    }}
                                    value={ex.targetReps ?? ""}
                                    onChangeText={(v) =>
                                      updateExercise(ex.id, { targetReps: v })
                                    }
                                    placeholder="예: 12회, 15-20회"
                                    placeholderTextColor={c.textMuted}
                                    returnKeyType="done"
                                  />
                                </View>

                                {/* ── 6.5. 쉬는 시간 ── */}
                                <View style={{ marginBottom: 10 }}>
                                  <Text
                                    style={{
                                      fontSize: 11,
                                      fontWeight: "700",
                                      color: c.textMuted,
                                      marginBottom: 6,
                                    }}>
                                    쉬는 시간
                                  </Text>
                                  <View
                                    style={{
                                      flexDirection: "row",
                                      alignItems: "center",
                                      gap: 8,
                                    }}>
                                    <TouchableOpacity activeOpacity={0.7}
                                      onPress={() =>
                                        updateExercise(ex.id, {
                                          restSeconds: Math.max(
                                            0,
                                            (ex.restSeconds ?? 60) - 10
                                          ),
                                        })
                                      }
                                      style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 16,
                                        backgroundColor: c.surfaceAlt,
                                        alignItems: "center",
                                        justifyContent: "center",
                                      }}>
                                      <Text
                                        style={{
                                          color: c.textPrimary,
                                          fontWeight: "800",
                                          fontSize: 18,
                                        }}>
                                        −
                                      </Text>
                                    </TouchableOpacity>

                                    <View
                                      style={{
                                        flex: 1,
                                        paddingVertical: 10,
                                        backgroundColor: c.surfaceAlt,
                                        borderRadius: 12,
                                        alignItems: "center",
                                      }}>
                                      <Text
                                        style={{
                                          fontSize: 15,
                                          fontWeight: "800",
                                          color: c.textPrimary,
                                        }}>
                                        {ex.restSeconds ?? 60} 초
                                      </Text>
                                    </View>

                                    <TouchableOpacity activeOpacity={0.7}
                                      onPress={() =>
                                        updateExercise(ex.id, {
                                          restSeconds:
                                            (ex.restSeconds ?? 60) + 10,
                                        })
                                      }
                                      style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 16,
                                        backgroundColor: c.primary,
                                        alignItems: "center",
                                        justifyContent: "center",
                                      }}>
                                      <Text
                                        style={{
                                          color: c.onAccent,
                                          fontWeight: "800",
                                          fontSize: 18,
                                        }}>
                                        +
                                      </Text>
                                    </TouchableOpacity>
                                  </View>
                                </View>

                                {/* ── 7. 운동 팁 ── */}
                                <View style={{ marginBottom: 10 }}>
                                  <Text
                                    style={{
                                      fontSize: 11,
                                      fontWeight: "700",
                                      color: c.textMuted,
                                      marginBottom: 6,
                                    }}>
                                    운동 팁
                                  </Text>
                                  <TextInput
                                    style={{
                                      backgroundColor: c.surfaceAlt,
                                      borderRadius: 12,
                                      padding: 10,
                                      fontSize: 14,
                                      color: c.textPrimary,
                                      minHeight: 60,
                                    }}
                                    value={ex.tip ?? ""}
                                    onChangeText={(v) =>
                                      updateExercise(ex.id, { tip: v })
                                    }
                                    placeholder="예: 무릎이 발끝을 넘지 않게"
                                    placeholderTextColor={c.textMuted}
                                    multiline
                                    numberOfLines={3}
                                    textAlignVertical="top"
                                  />
                                </View>

                                {/* ── 8. 이전 기록 토글 ── */}
                                {(() => {
                                  const prH = exerciseHistoryCache.get(
                                    `${ex.name}:pr`
                                  );
                                  const weekH = exerciseHistoryCache.get(
                                    `${ex.name}:week`
                                  );
                                  const monthH = exerciseHistoryCache.get(
                                    `${ex.name}:month`
                                  );
                                  const fmtSession = (
                                    h:
                                      | {
                                          comparisonSession: {
                                            maxWeight: number;
                                            sets: {
                                              weight: number;
                                              reps: number;
                                            }[];
                                          } | null;
                                        }
                                      | undefined
                                  ) => {
                                    const e = h?.comparisonSession;
                                    if (!e) return null;
                                    const best =
                                      e.sets.find(
                                        (s) => s.weight === e.maxWeight
                                      ) ?? e.sets[0];
                                    return best
                                      ? `${e.maxWeight}kg × ${best.reps}회`
                                      : `${e.maxWeight}kg`;
                                  };
                                  const rows = [
                                    {
                                      label: "PR",
                                      text: prH?.pr && prH.pr.weight > 0
                                        ? `${prH.pr.weight}kg`
                                        : null,
                                    },
                                    { label: "1주전", text: fmtSession(weekH) },
                                    {
                                      label: "1달전",
                                      text: fmtSession(monthH),
                                    },
                                  ];
                                  const isOpen = !!historyExpanded[ex.id];
                                  return (
                                    <>
                                      <TouchableOpacity
                                        style={{
                                          flexDirection: "row",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          gap: 4,
                                          paddingVertical: 8,
                                          borderTopWidth: 1,
                                          borderTopColor: c.border,
                                        }}
                                        onPress={() => {
                                          const next = !isOpen;
                                          setHistoryExpanded((prev) => ({
                                            ...prev,
                                            [ex.id]: next,
                                          }));
                                          if (next) {
                                            fetchExerciseHistory(
                                              ex.name,
                                              "week"
                                            );
                                            fetchExerciseHistory(
                                              ex.name,
                                              "month"
                                            );
                                          }
                                        }}
                                        activeOpacity={0.7}>
                                        <Text
                                          style={{
                                            fontSize: 12,
                                            fontWeight: "600",
                                            color: c.textMuted,
                                          }}>
                                          이전 기록
                                        </Text>
                                        <Text
                                          style={{
                                            fontSize: 11,
                                            color: c.textMuted,
                                          }}>
                                          {isOpen ? " ▲" : " ▼"}
                                        </Text>
                                      </TouchableOpacity>
                                      {isOpen && (
                                        <View
                                          style={{
                                            paddingHorizontal: 6,
                                            paddingBottom: 8,
                                            paddingTop: 4,
                                            gap: 6,
                                          }}>
                                          {rows.map(({ label, text }) => (
                                            <View
                                              key={label}
                                              style={{
                                                flexDirection: "row",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                              }}>
                                              <View
                                                style={{
                                                  backgroundColor: c.surfaceAlt,
                                                  borderRadius: 10,
                                                  paddingHorizontal: 8,
                                                  paddingVertical: 3,
                                                }}>
                                                <Text
                                                  style={{
                                                    fontSize: 11,
                                                    fontWeight: "700",
                                                    color: c.textSecondary,
                                                  }}>
                                                  {label}
                                                </Text>
                                              </View>
                                              <Text
                                                style={{
                                                  fontSize: 14,
                                                  fontWeight: "800",
                                                  color: text
                                                    ? c.primary
                                                    : c.textMuted,
                                                }}>
                                                {text ?? "기록 없음"}
                                              </Text>
                                            </View>
                                          ))}
                                        </View>
                                      )}
                                    </>
                                  );
                                })()}
                              </>
                            )}
                          </Card>
                        </View>
                      );
                    }}
                  />
                )}
              </>
            )}
          </KeyboardAwareScrollView>
      ) : (
        <ScrollView
          ref={historyScrollRef}
          onScroll={(e) => {
            historyScrollOffset.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <Card className="flex-row justify-between items-center mb-3 p-[18px]">
            <View className="gap-1">
              <Text className="text-sm font-semibold text-text-secondary">
                {visibleMonth.split("-")[0]}년{" "}
                {parseInt(visibleMonth.split("-")[1])}월
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 2,
                }}>
                <Text className="text-[18px] font-bold text-text-primary">
                  {monthSessions.length}회 운동 · {monthVolume.toLocaleString()}
                  kg
                </Text>
                {monthCalories > 0 && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 2,
                    }}>
                    <FlameIcon size={14} color={c.danger} />
                    <Text className="text-[15px] font-bold text-text-primary">
                      {monthCalories.toLocaleString()} kcal
                    </Text>
                  </View>
                )}
              </View>
            </View>
            <Icon name="calendar" size={36} color={c.textSecondary} />
          </Card>

          <Card bare className="overflow-hidden mb-5">
            <Calendar
              markedDates={markedDates}
              onDayPress={(day) => {
                setSelectedDate((prev) =>
                  prev === day.dateString ? null : day.dateString
                );
              }}
              onMonthChange={(month) => {
                setVisibleMonth(month.dateString.substring(0, 7));
                setSelectedDate(null);
              }}
              theme={calTheme}
            />
          </Card>

          {/* 부위별 세트 수까지 보이는 월간 기록 캘린더 */}
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              backgroundColor: c.surface,
              borderWidth: 1,
              borderColor: c.border,
              borderRadius: 16,
              paddingVertical: 13,
              marginBottom: 20,
            }}
            onPress={() => router.push("/modal/full-calendar" as any)}
            activeOpacity={0.7}>
            <Icon name="calendar" size={16} color={c.primary} />
            <Text style={{ fontSize: 14, fontWeight: "800", color: c.primary }}>
              기록 캘린더 보기
            </Text>
            <Text style={{ fontSize: 14, fontWeight: "800", color: c.primary }}>▶</Text>
          </TouchableOpacity>

          {selectedDate &&
            (() => {
              const todayDate = localDateStr();
              const isFuture = selectedDate > todayDate;
              return (
                <>
                  <Text className="text-[15px] font-bold text-text-primary mb-3">
                    {formatSelectedDate(selectedDate)}
                  </Text>
                  {isFuture ? (
                    <View
                      style={{
                        backgroundColor: c.surface,
                        borderWidth: 1,
                        borderColor: c.border,
                        borderRadius: 16,
                        padding: 20,
                        alignItems: "center",
                        gap: 8,
                      }}>
                      <Icon name="calendar" size={36} color={c.textMuted} />
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: c.textMuted,
                          textAlign: "center",
                        }}>
                        미래 날짜에는 기록할 수 없어요
                      </Text>
                    </View>
                  ) : selectedSessions.length === 0 ? (
                    <View
                      style={{
                        backgroundColor: c.surface,
                        borderWidth: 1,
                        borderColor: c.border,
                        borderRadius: 16,
                        padding: 24,
                        alignItems: "center",
                        gap: 12,
                      }}>
                      <Icon
                        name={isSelectedRestDay ? "calendar" : "dumbbell"}
                        size={36}
                        color={isSelectedRestDay ? c.primary : c.textMuted}
                      />
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: "600",
                          color: isSelectedRestDay ? c.primary : c.textMuted,
                        }}>
                        {isSelectedRestDay
                          ? "쉬는날로 지정된 날이에요"
                          : "이 날 운동 기록이 없어요"}
                      </Text>
                      <TouchableOpacity
                        style={{
                          backgroundColor: c.primary,
                          borderRadius: 999,
                          paddingHorizontal: 28,
                          paddingVertical: 11,
                        }}
                        onPress={() =>
                          router.push({
                            pathname: "/modal/add-workout",
                            params: { date: selectedDate },
                          } as any)
                        }
                        activeOpacity={0.7}>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "800",
                            color: c.surface,
                          }}>
                          운동 추가 +
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                          backgroundColor: isSelectedRestDay
                            ? c.danger + "18"
                            : c.surfaceAlt,
                          borderRadius: 999,
                          paddingHorizontal: 22,
                          paddingVertical: 10,
                        }}
                        onPress={() => handleToggleRestDay(selectedDate)}
                        activeOpacity={0.7}>
                        <Icon
                          name={isSelectedRestDay ? "trash" : "calendar"}
                          size={14}
                          color={isSelectedRestDay ? c.danger : c.textSecondary}
                        />
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: "800",
                            color: isSelectedRestDay
                              ? c.danger
                              : c.textSecondary,
                          }}>
                          {isSelectedRestDay ? "쉬는날 해제" : "쉬는날로 지정"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      {selectedSessions.map((session) => (
                        <View key={session.id}>
                          <HistoryCard
                            session={session}
                            getVolume={getTotalVolume}
                            allSessions={sessions}
                            onDelete={deleteSession}
                            onUpdate={(exercises) =>
                              updateSession(session.id, exercises)
                            }
                            onUpdateDate={(date) =>
                              updateSessionDate(session.id, date)
                            }
                            scrollRef={historyScrollRef}
                            scrollOffsetRef={historyScrollOffset}
                            onExerciseDragStart={() =>
                              historyScrollRef.current?.setNativeProps?.({
                                scrollEnabled: false,
                              })
                            }
                            onExerciseDragRelease={() =>
                              historyScrollRef.current?.setNativeProps?.({
                                scrollEnabled: true,
                              })
                            }
                          />
                          <TouchableOpacity
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              justifyContent: "center",
                              gap: 6,
                              backgroundColor: c.primary + "18",
                              borderRadius: 12,
                              paddingVertical: 11,
                              marginBottom: 12,
                            }}
                            onPress={() =>
                              router.push({
                                pathname: "/modal/add-workout",
                                params: {
                                  date: selectedDate,
                                  sessionId: session.id,
                                },
                              } as any)
                            }
                            activeOpacity={0.7}>
                            <Icon name="plus" size={14} color={c.primary} />
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "800",
                                color: c.primary,
                              }}>
                              종목 추가 +
                            </Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </>
                  )}
                </>
              );
            })()}

          {sessions.length === 0 && (
            <View className="items-center justify-center py-[60px] gap-2">
              <Icon name="calendar" size={64} color={c.textMuted} />
              <Text className="text-[20px] font-bold text-text-primary text-center">
                운동 기록이 없어요
              </Text>
              <Text className="text-sm text-text-secondary text-center">
                운동을 시작하고 기록을 쌓아보세요
              </Text>
            </View>
          )}
        </ScrollView>
      )}

      <WorkoutCompleteOverlay
        visible={completeCalories !== null}
        calories={completeCalories ?? 0}
        onDismiss={() => setCompleteCalories(null)}
      />

      {/* 루틴에서 가져오기 모달 */}
      <Modal
        visible={showRoutineSheet}
        animationType="slide"
        transparent
        onRequestClose={() => setShowRoutineSheet(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: SCRIM }}
          activeOpacity={1}
          onPress={() => setShowRoutineSheet(false)}
        />
        <View
          style={{
            backgroundColor: c.surface,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: "75%",
            paddingBottom: 34,
          }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              paddingHorizontal: 20,
              paddingTop: 18,
              paddingBottom: 14,
              borderBottomWidth: 1,
              borderBottomColor: c.surfaceAlt,
            }}>
            <Text
              style={{
                flex: 1,
                fontSize: 17,
                fontWeight: "800",
                color: c.textPrimary,
              }}>
              루틴에서 가져오기
            </Text>
            <TouchableOpacity activeOpacity={0.7} onPress={() => setShowRoutineSheet(false)}>
              <Text
                style={{ fontSize: 20, color: c.textMuted, fontWeight: "700" }}>
                ×
              </Text>
            </TouchableOpacity>
          </View>
          <ScrollView
            contentContainerStyle={{ padding: 16, gap: 10 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag">
            {routines.map((routine) => {
              const isExpanded = expandedRoutineInSheet === routine.id;
              const currentNames = new Set(
                activeSession?.exercises.map((e) => e.name) ?? []
              );
              return (
                <View
                  key={routine.id}
                  style={{
                    backgroundColor: c.surface,
                    borderWidth: 1,
                    borderColor: c.border,
                    borderRadius: 16,
                    overflow: "hidden",
                    marginBottom: 10,
                  }}>
                  <TouchableOpacity
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 14,
                      gap: 10,
                    }}
                    onPress={() =>
                      setExpandedRoutineInSheet(isExpanded ? null : routine.id)
                    }
                    activeOpacity={0.7}>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: "800",
                          color: c.textPrimary,
                        }}>
                        {routine.name}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          color: c.textSecondary,
                          marginTop: 2,
                        }}>
                        {routine.exercises.length}종목
                      </Text>
                    </View>
                    <TouchableOpacity activeOpacity={0.7}
                      style={{
                        backgroundColor: c.warning,
                        borderRadius: 999,
                        paddingHorizontal: 14,
                        paddingVertical: 7,
                      }}
                      onPress={() => {
                        let added = 0;
                        routine.exercises.forEach((re, i) => {
                          if (currentNames.has(re.name)) return;
                          const exId = `${Date.now()}-${i}`;
                          addExercise({
                            id: exId,
                            name: re.name,
                            category: re.category,
                            settings: re.settings,
                            tip: re.tip,
                            isSingleArm: false,
                            targetMuscles: re.targetMuscles,
                            restSeconds: re.restSeconds,
                            targetReps: re.targetReps,
                          });
                          // per-set 목표(sets)·기본값을 동일 규칙으로 처리 (헬퍼 공유)
                          buildSetsFromRoutineExercise(re, exId).forEach((st) =>
                            addSet(exId, st)
                          );
                          setAddedFromRoutine(
                            (prev) => new Set([...prev, re.name])
                          );
                          added++;
                        });
                        if (added === 0)
                          showCuteAlert({
                            icon: "alert",
                            tone: "info",
                            title: "알림",
                            message: "이미 모든 종목이 추가되어 있어요",
                            buttons: [{ label: "확인", style: "primary" }],
                          });
                        else {
                          setShowRoutineSheet(false);
                        }
                      }}>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "600",
                          color: c.onAccent,
                        }}>
                        전체 추가
                      </Text>
                    </TouchableOpacity>
                    <Text
                      style={{
                        fontSize: 12,
                        color: c.textMuted,
                        fontWeight: "600",
                      }}>
                      {isExpanded ? "▲" : "▼"}
                    </Text>
                  </TouchableOpacity>
                  {isExpanded && (
                    <View
                      style={{
                        borderTopWidth: 1,
                        borderTopColor: c.surfaceAlt,
                      }}>
                      {routine.exercises.map((re, i) => {
                        const alreadyIn =
                          currentNames.has(re.name) ||
                          addedFromRoutine.has(re.name);
                        return (
                          <View
                            key={i}
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              paddingHorizontal: 14,
                              paddingVertical: 10,
                              borderBottomWidth:
                                i < routine.exercises.length - 1 ? 1 : 0,
                              borderBottomColor: c.surfaceAlt,
                            }}>
                            <View style={{ flex: 1 }}>
                              <Text
                                style={{
                                  fontSize: 14,
                                  fontWeight: "600",
                                  color: c.textPrimary,
                                }}>
                                {re.name}
                              </Text>
                              <Text
                                style={{
                                  fontSize: 11,
                                  color: c.textSecondary,
                                  marginTop: 1,
                                }}>
                                {re.defaultSets}세트{" "}
                                {re.targetReps ? `· ${re.targetReps}` : ""}{" "}
                                {re.defaultWeight
                                  ? `· ${re.defaultWeight}${re.defaultUnit ?? "kg"}`
                                  : ""}
                              </Text>
                            </View>
                            {alreadyIn ? (
                              <View
                                style={{
                                  backgroundColor: c.surfaceAlt,
                                  borderRadius: 999,
                                  paddingHorizontal: 12,
                                  paddingVertical: 6,
                                }}>
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: "700",
                                    color: c.success,
                                  }}>
                                  추가됨
                                </Text>
                              </View>
                            ) : (
                              <TouchableOpacity activeOpacity={0.7}
                                style={{
                                  backgroundColor: c.surfaceAlt,
                                  borderRadius: 999,
                                  paddingHorizontal: 12,
                                  paddingVertical: 6,
                                }}
                                onPress={() => {
                                  const exId = `${Date.now()}-${i}`;
                                  addExercise({
                                    id: exId,
                                    name: re.name,
                                    category: re.category,
                                    settings: re.settings,
                                    tip: re.tip,
                                    isSingleArm: false,
                                    targetMuscles: re.targetMuscles,
                                    restSeconds: re.restSeconds,
                                    targetReps: re.targetReps,
                                  });
                                  // per-set 목표(sets)·기본값을 동일 규칙으로 처리 (헬퍼 공유)
                                  buildSetsFromRoutineExercise(re, exId).forEach(
                                    (st) => addSet(exId, st)
                                  );
                                  setAddedFromRoutine(
                                    (prev) => new Set([...prev, re.name])
                                  );
                                }}>
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: "700",
                                    color: c.success,
                                  }}>
                                  + 추가
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>
      </Modal>

      {/* ── Feature 2: 루틴으로 저장 모달 (운동 종료 시) ── */}
      {/* onRequestClose는 안드로이드 뒤로가기다. "나중에"(취소)와 같은 동작으로
          연결한다 — 저장 같은 되돌릴 수 없는 쪽에 걸지 않는다. */}
      <Modal
        visible={showSaveRoutineModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setShowSaveRoutineModal(false);
          setSaveRoutineExercises([]);
        }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}>
          <View
            style={{
              flex: 1,
              backgroundColor: SCRIM_STRONG,
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}>
            <View
              style={{
                backgroundColor: c.surface,
                borderRadius: 24,
                padding: 22,
                width: "100%",
              }}>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "800",
                  color: c.textPrimary,
                  marginBottom: 6,
                }}>
                루틴으로 저장할까요?
              </Text>
              <Text
                style={{
                  fontSize: 14,
                  color: c.textSecondary,
                  marginBottom: 16,
                }}>
                오늘 운동 종목들로 새 루틴을 만들어요
              </Text>
              <TextInput
                style={{
                  backgroundColor: c.surfaceAlt,
                  borderRadius: 12,
                  padding: 14,
                  fontSize: 15,
                  fontWeight: "800",
                  color: c.textPrimary,
                  marginBottom: 16,
                }}
                value={saveRoutineName}
                onChangeText={setSaveRoutineName}
                placeholder="루틴 이름 (예: 상체 루틴)"
                placeholderTextColor={c.textMuted}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={handleSaveAsRoutine}
              />
              <View style={{ flexDirection: "row", gap: 8 }}>
                <TouchableOpacity activeOpacity={0.7}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 12,
                    backgroundColor: c.surfaceAlt,
                    alignItems: "center",
                  }}
                  onPress={() => {
                    setShowSaveRoutineModal(false);
                    setSaveRoutineExercises([]);
                  }}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "600",
                      color: c.textSecondary,
                    }}>
                    나중에
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.7}
                  style={{
                    flex: 1,
                    paddingVertical: 14,
                    borderRadius: 12,
                    backgroundColor: c.warning,
                    alignItems: "center",
                  }}
                  onPress={handleSaveAsRoutine}
                  disabled={savingRoutine}>
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "800",
                      color: c.onAccent,
                    }}>
                    {savingRoutine ? "저장 중..." : "저장"}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <NumberPad
        visible={padConfig !== null}
        value={padConfig?.value ?? "0"}
        decimal={padConfig?.decimal ?? true}
        suffix={padConfig?.suffix}
        onConfirm={(v) => {
          padConfig?.onConfirm(v);
          setPadConfig(null);
        }}
        onCancel={() => setPadConfig(null)}
      />
    </View>
  );
}

// 운동 화면 전용 ErrorBoundary — 세션/세트 조작이나 히스토리 렌더 중 예외가 나도
// 앱 전체가 아닌 이 화면만 폴백된다(홈/통계 탭은 계속 사용 가능). 바운더리가
/**
 * Renders the workout screen within an error boundary.
 */
export default function WorkoutScreenRoute() {
  return (
    <ErrorBoundary screenName="운동">
      <WorkoutScreen />
    </ErrorBoundary>
  );
}

/**
 * Displays the difference between a current value and its previous value.
 *
 * @param value - The current numeric value.
 * @param prevValue - The previous numeric value, if available.
 * @param unit - The unit displayed after the difference.
 */
function DiffBadge({
  value,
  prevValue,
  unit,
}: {
  value: number;
  prevValue: number | undefined;
  unit: string;
}) {
  const c = useColors();
  if (prevValue == null || value === prevValue) return null;
  const diff = value - prevValue;
  const up = diff > 0;
  return (
    <Text
      style={{
        fontSize: 11,
        fontWeight: "700",
        lineHeight: 14,
        color: up ? c.danger : c.primary,
      }}>
      {up ? `↑+${diff}` : `↓${diff}`}
      {unit}
    </Text>
  );
}

function ExerciseHistoryRow({
  ex,
  idx,
  allPrevMax,
  allTimePR,
}: {
  ex: WorkoutSession["exercises"][0];
  idx: number;
  allPrevMax: number | null;
  allTimePR: number;
}) {
  const c = useColors();
  const toKgLocal = (w: number, unit?: string) =>
    unit === 'lbs' ? w / 2.20462 : w;
  const validSetsLocal = ex.sets.filter((st) => st.weight > 0 && st.reps > 0);
  const curMaxWeight = validSetsLocal.length > 0
    ? Math.max(...validSetsLocal.map((st) => toKgLocal(st.weight, st.unit)))
    : 0;
  const delta = allPrevMax != null ? curMaxWeight - allPrevMax : null;
  const isSessionPR =
    curMaxWeight > 0 && curMaxWeight >= allTimePR && allTimePR > 0;

  const prScale = useRef(new Animated.Value(0)).current;
  const growthOp = useRef(new Animated.Value(0)).current;
  const compOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    prScale.setValue(0);
    growthOp.setValue(0);
    compOp.setValue(0);
    Animated.parallel([
      Animated.timing(compOp, {
        toValue: 1,
        duration: 400,
        delay: idx * 80,
        useNativeDriver: true,
      }),
      ...(isSessionPR
        ? [
            Animated.spring(prScale, {
              toValue: 1,
              damping: 5,
              stiffness: 180,
              useNativeDriver: true,
            } as any),
          ]
        : []),
      ...(delta != null && delta > 0
        ? [
            Animated.timing(growthOp, {
              toValue: 1,
              duration: 350,
              delay: 300 + idx * 80,
              useNativeDriver: true,
            }),
          ]
        : []),
    ]).start();
  }, []);

  const prevPct =
    allPrevMax != null && curMaxWeight > 0
      ? (`${Math.round(
          Math.min(100, (allPrevMax / curMaxWeight) * 100)
        )}%` as `${number}%`)
      : ("0%" as const);

  return (
    <View
      className={["py-4", idx > 0 ? "border-t border-surface-alt" : ""].join(
        " "
      )}>
      <View className="flex-row items-center justify-between mb-2">
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
            flex: 1,
          }}>
          <Text className="text-[17px] font-extrabold text-text-primary shrink">
            {ex.name}
          </Text>
          {ex.isSingleArm && (
            <View
              style={{
                backgroundColor: c.primary + "20",
                borderRadius: 999,
                paddingHorizontal: 7,
                paddingVertical: 3,
              }}>
              <Text
                style={{ fontSize: 11, fontWeight: "700", color: c.success }}>
                한팔
              </Text>
            </View>
          )}
          {isSessionPR && (
            <Animated.View style={{ transform: [{ scale: prScale }] }}>
              <View
                style={{
                  backgroundColor: c.stats + "20",
                  borderRadius: 999,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 3,
                }}>
                <Icon name="trophy" size={11} color={c.stats} />
                <Text
                  style={{ fontSize: 11, fontWeight: "700", color: c.stats }}>
                  PR
                </Text>
              </View>
            </Animated.View>
          )}
        </View>
        <View className="bg-workout/30 rounded-xl px-2 py-1">
          <Text className="text-[11px] font-bold text-workout">
            {ex.category}
          </Text>
        </View>
      </View>
      {(ex.targetMuscles?.length ?? 0) > 0 && (
        <View
          style={{
            flexDirection: "row",
            flexWrap: "wrap",
            gap: 4,
            marginBottom: 8,
          }}>
          {ex.targetMuscles!.map((m, mi) => (
            <View
              key={mi}
              style={{
                backgroundColor: c.primary + "18",
                borderRadius: 999,
                paddingHorizontal: 7,
                paddingVertical: 2,
              }}>
              <Text
                style={{ fontSize: 11, fontWeight: "700", color: c.primary }}>
                {m}
              </Text>
            </View>
          ))}
        </View>
      )}

      {allPrevMax != null && curMaxWeight > 0 && (
        <Animated.View style={{ marginBottom: 10, gap: 4, opacity: compOp }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text
              style={{
                fontSize: 11,
                color: c.textMuted,
                fontWeight: "700",
                width: 24,
                textAlign: "right",
              }}>
              이전
            </Text>
            <View
              style={{
                flex: 1,
                height: 5,
                backgroundColor: c.surfaceAlt,
                borderRadius: 999,
                overflow: "hidden",
              }}>
              <View
                style={{
                  height: "100%",
                  borderRadius: 999,
                  backgroundColor: c.textMuted,
                  width: prevPct,
                }}
              />
            </View>
            <Text
              style={{
                fontSize: 11,
                color: c.textMuted,
                fontWeight: "700",
                width: 38,
              }}>
              {allPrevMax}kg
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text
              style={{
                fontSize: 11,
                color: c.success,
                fontWeight: "700",
                width: 24,
                textAlign: "right",
              }}>
              오늘
            </Text>
            <View
              style={{
                flex: 1,
                height: 5,
                backgroundColor: c.surfaceAlt,
                borderRadius: 999,
                overflow: "hidden",
              }}>
              <View
                style={{
                  height: "100%",
                  borderRadius: 999,
                  backgroundColor: isSessionPR ? c.stats : c.primary,
                  width: "100%",
                }}
              />
            </View>
            <Text
              style={{
                fontSize: 11,
                color: c.success,
                fontWeight: "700",
                width: 38,
              }}>
              {curMaxWeight}kg
            </Text>
          </View>
        </Animated.View>
      )}

      {delta != null && delta > 0 && (
        <Animated.View
          style={{
            opacity: growthOp,
            marginBottom: 6,
            flexDirection: "row",
            alignItems: "center",
            gap: 4,
          }}>
          <Icon name="dumbbell" size={12} color={c.success} />
          <Text style={{ fontSize: 12, fontWeight: "600", color: c.success }}>
            +{delta}kg 성장했어요!
          </Text>
        </Animated.View>
      )}
      {delta != null && delta < 0 && (
        <Text
          style={{
            fontSize: 11,
            fontWeight: "700",
            color: c.danger,
            marginBottom: 4,
          }}>
          ↓ {Math.abs(delta)}kg
        </Text>
      )}

      <View className="gap-1 mb-2">
        {ex.sets.map((st, i) => {
          const _w = st.unit === "lbs" ? st.weight / 2.20462 : st.weight;
          const vol = ex.isSingleArm ? _w * st.reps * 2 : _w * st.reps;
          return (
            <View key={st.id} className="flex-row items-center">
              <Text className="text-xs font-semibold text-text-muted w-10">
                {i + 1}세트
              </Text>
              <Text className="text-sm font-semibold text-text-primary flex-1">
                {st.weight}kg{ex.isSingleArm ? "(한팔)" : ""} × {st.reps}회
              </Text>
              <Text className="text-sm font-medium text-text-secondary">
                = {vol.toLocaleString()}kg
              </Text>
            </View>
          );
        })}
      </View>

      {ex.settings && ex.settings.length > 0 && (
        <View className="flex-row flex-wrap gap-1 mb-2">
          {ex.settings.map((st, i) => (
            <View key={i} className="bg-primary/20 rounded-[20px] px-2 py-0.5">
              <Text className="text-[10px] font-semibold text-primary">
                {st.key}: {st.value}
              </Text>
            </View>
          ))}
        </View>
      )}
      {!!ex.tip && (
        <View className="flex-row items-start gap-1 bg-warning/30 rounded-xl p-2 mb-1">
          <Icon name="bulb" size={11} color={c.textSecondary} />
          <Text className="text-xs text-text-secondary flex-1 leading-5">
            {ex.tip}
          </Text>
        </View>
      )}
    </View>
  );
}

type DraftSet = {
  id: string;
  weight: string;
  reps: string;
  completed: boolean;
  unit?: string;
};
type DraftExercise = Omit<WorkoutSession["exercises"][0], "sets"> & {
  sets: DraftSet[];
};

function HistoryCard({
  session,
  getVolume,
  allSessions,
  onDelete,
  onUpdate,
  onUpdateDate,
  onExerciseDragStart,
  onExerciseDragRelease,
  scrollRef,
  scrollOffsetRef,
}: {
  session: WorkoutSession;
  getVolume: (s: WorkoutSession) => number;
  allSessions: WorkoutSession[];
  onDelete: (id: string) => void;
  onUpdate: (exercises: WorkoutSession["exercises"]) => Promise<void>;
  onUpdateDate: (date: string) => Promise<void>;
  onExerciseDragStart?: () => void;
  onExerciseDragRelease?: () => void;
  scrollRef?: React.RefObject<any>;
  scrollOffsetRef?: React.RefObject<number>;
}) {
  const c = useColors();
  const [expanded, setExpanded] = useState(false);
  const [exExpanded, setExExpanded] = useState<Record<string, boolean>>({});
  const [orderedExercises, setOrderedExercises] = useState(session.exercises);
  const [editMode, setEditMode] = useState(false);
  const skipNextSync = useRef(false);

  useEffect(() => {
    if (skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }
    setOrderedExercises(session.exercises);
  }, [session.exercises]);
  const [saving, setSaving] = useState(false);
  const [draftExercises, setDraftExercises] = useState<DraftExercise[]>([]);
  const [showRoutineSaveModal, setShowRoutineSaveModal] = useState(false);
  const [routineSaveName, setRoutineSaveName] = useState("");
  const [routineSaving, setRoutineSaving] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [dateSaving, setDateSaving] = useState(false);

  const handleChangeDate = async (newDate: string) => {
    if (newDate === session.date) {
      setShowDateModal(false);
      return;
    }
    setDateSaving(true);
    try {
      await onUpdateDate(newDate);
      setShowDateModal(false);
    } catch {
      showCuteAlert({
        icon: "alert",
        tone: "danger",
        title: "날짜 변경 실패",
        message: "다시 시도해주세요",
        buttons: [{ label: "확인", style: "primary" }],
      });
    } finally {
      setDateSaving(false);
    }
  };

  const handleSaveSessionAsRoutine = async () => {
    const name = routineSaveName.trim();
    if (!name) return;
    setRoutineSaving(true);
    try {
      await useRoutineStore.getState().addRoutine({
        name,
        exercises: session.exercises.map((ex) => ({
          name: ex.name,
          category: ex.category,
          defaultSets: ex.sets.length || 3,
          defaultWeight: ex.sets[0]?.weight,
          defaultUnit: (ex.sets[0]?.unit as 'kg' | 'lbs' | undefined) ?? 'kg',
          defaultReps: ex.sets[0]?.reps,
          restSeconds: ex.restSeconds,
          targetReps: ex.targetReps,
          settings: ex.settings,
          tip: ex.tip,
          targetMuscles: ex.targetMuscles,
          isSingleArm: ex.isSingleArm,
        })),
      });
    } finally {
      setRoutineSaving(false);
      setShowRoutineSaveModal(false);
      setRoutineSaveName("");
    }
  };
  type HistoryPadConfig = {
    value: string;
    decimal: boolean;
    suffix: string;
    onConfirm: (v: string) => void;
  };
  const [historyPadConfig, setHistoryPadConfig] =
    useState<HistoryPadConfig | null>(null);
  const openPad = (
    value: string,
    decimal: boolean,
    suffix: string,
    onConfirm: (v: string) => void
  ) => setHistoryPadConfig({ value, decimal, suffix, onConfirm });
  const volume = getVolume(session);

  const durationText = (() => {
    const m = session.durationMinutes ?? 0;
    if (m <= 0) return null;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    if (h > 0) return `${h}시간${rem > 0 ? ` ${rem}분` : ""}`;
    return `${m}분`;
  })();

  // 부위별 완료 세트 수 (targetMuscles 우선, 없으면 category)
  const muscleCounts = getMuscleSetCounts(session);
  // 완료 세트가 1개 이상인 종목만 표시 (기존 데이터의 빈 종목 숨김)
  const visibleExercises = orderedExercises.filter((ex) =>
    ex.sets.some((s) => s.completed)
  );

  const enterHistoryEdit = () => {
    setDraftExercises(
      session.exercises.map((ex) => ({
        ...ex,
        sets: ex.sets.map((s) => ({
          id: s.id,
          weight: String(s.weight),
          reps: String(s.reps),
          completed: s.completed,
          unit: s.unit ?? 'kg',
        })),
      }))
    );
    setEditMode(true);
    setExpanded(true);
  };

  const updateDraftSet = (
    exIdx: number,
    setIdx: number,
    data: Partial<DraftSet>
  ) => {
    setDraftExercises((prev) =>
      prev.map((ex, ei) =>
        ei !== exIdx
          ? ex
          : {
              ...ex,
              sets: ex.sets.map((s, si) =>
                si !== setIdx ? s : { ...s, ...data }
              ),
            }
      )
    );
  };

  const removeDraftSet = (exIdx: number, setIdx: number) => {
    setDraftExercises((prev) =>
      prev.map((ex, ei) =>
        ei !== exIdx
          ? ex
          : { ...ex, sets: ex.sets.filter((_, si) => si !== setIdx) }
      )
    );
  };

  const addDraftSet = (exIdx: number) => {
    setDraftExercises((prev) =>
      prev.map((ex, ei) => {
        if (ei !== exIdx) return ex;
        const last = ex.sets[ex.sets.length - 1];
        return {
          ...ex,
          sets: [
            ...ex.sets,
            {
              id: `draft-${Date.now()}`,
              weight: last?.weight ?? "0",
              reps: last?.reps ?? "0",
              completed: false,
              unit: last?.unit ?? 'kg',
            },
          ],
        };
      })
    );
  };

  const removeDraftExercise = (exIdx: number) => {
    setDraftExercises((prev) => prev.filter((_, i) => i !== exIdx));
  };

  const updateDraftExName = (exIdx: number, name: string) => {
    setDraftExercises((prev) =>
      prev.map((ex, i) => (i !== exIdx ? ex : { ...ex, name }))
    );
  };

  const addDraftExercise = () => {
    setDraftExercises((prev) => [
      ...prev,
      {
        id: `new-ex-${Date.now()}`,
        name: "",
        category: "",
        sets: [
          {
            id: `new-set-${Date.now()}`,
            weight: "0",
            reps: "0",
            completed: false,
          },
        ],
        settings: [],
        tip: "",
        isSingleArm: false,
      },
    ]);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const exercises: WorkoutSession["exercises"] = draftExercises.map(
        (ex) => ({
          ...ex,
          sets: ex.sets.map((s) => ({
            ...s,
            weight: parseFloat(s.weight) || 0,
            reps: parseInt(s.reps) || 0,
            unit: (s.unit as 'kg' | 'lbs' | undefined) ?? 'kg',
          })),
        })
      );
      skipNextSync.current = true;
      await onUpdate(exercises);
      setEditMode(false);
    } catch {
      showCuteAlert({
        icon: "alert",
        tone: "danger",
        title: "오류",
        message: "저장에 실패했어요",
        buttons: [{ label: "확인", style: "primary" }],
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    showCuteAlert({
      icon: "trash",
      tone: "danger",
      title: "운동 기록 삭제",
      message: "이 기록을 삭제할까요?",
      buttons: [
        { label: "취소", style: "soft" },
        {
          label: "삭제",
          style: "primary",
          onPress: () => onDelete(session.id),
        },
      ],
    });
  };

  const toKgW = (weight: number, unit?: string) =>
    unit === 'lbs' ? weight / 2.20462 : weight;

  // 가장 무거운 세트를 kg 환산 기준으로 고르되, 표시는 그 세트의 원래 단위/값으로.
  // (lbs로 입력한 종목이 kg로 둔갑하던 버그 수정 — 비교/PR 판정은 kg로 통일)
  const getExMaxWeight = (
    ex: WorkoutSession["exercises"][0]
  ): { kg: number; weight: number; unit: "kg" | "lbs" } | null => {
    // 완료된 세트 중에서만 최고 무게 계산
    const validSets = ex.sets.filter((s) => s.completed && s.weight > 0 && s.reps > 0);
    if (validSets.length === 0) return null;
    let best = validSets[0];
    let bestKg = toKgW(best.weight, best.unit);
    for (const s of validSets) {
      const kg = toKgW(s.weight, s.unit);
      if (kg > bestKg) {
        best = s;
        bestKg = kg;
      }
    }
    return { kg: bestKg, weight: best.weight, unit: (best.unit ?? "kg") as "kg" | "lbs" };
  };

  const getExVolume = calcExerciseVolume;

  const getPrevSessionInfo = (
    exName: string
  ): { maxWeight: number; date: string } | null => {
    let best: { maxWeight: number; date: string } | null = null;
    for (const s of allSessions) {
      if (s.date >= session.date) continue;
      const match = s.exercises.find((e) => e.name === exName);
      if (!match) continue;
      const validSets = match.sets.filter((st) => st.weight > 0 && st.reps > 0);
      const mx = validSets.length > 0
        ? Math.max(...validSets.map((st) => toKgW(st.weight, st.unit)))
        : 0;
      if (!best || s.date > best.date) best = { maxWeight: mx, date: s.date };
    }
    return best;
  };

  const getAllTimePrevMax = (exName: string): number | null => {
    let max = 0;
    for (const s of allSessions) {
      if (s.date >= session.date) continue;
      const match = s.exercises.find((e) => e.name === exName);
      if (match)
        match.sets
          .filter((st) => st.completed && st.weight > 0 && st.reps > 0)
          .forEach((st) => {
            const w = toKgW(st.weight, st.unit);
            if (w > max) max = w;
          });
    }
    return max > 0 ? max : null;
  };

  const getAllTimePR = (exName: string): number => {
    let max = 0;
    for (const s of allSessions) {
      const match = s.exercises.find((e) => e.name === exName);
      if (match)
        match.sets
          .filter((st) => st.completed && st.weight > 0 && st.reps > 0)
          .forEach((st) => {
            const w = toKgW(st.weight, st.unit);
            if (w > max) max = w;
          });
    }
    return max;
  };

  return (
    <>
      <Card bare className="overflow-hidden mb-3">
        {/* ── 세션 요약 (항상 표시) ── */}
        <TouchableOpacity
          onPress={() => {
            LayoutAnimation.configureNext(
              LayoutAnimation.Presets.easeInEaseOut
            );
            setExpanded((v) => !v);
          }}
          activeOpacity={0.7}
          style={{ padding: 16 }}>
          {/* 통계 행 */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
              marginBottom: 8,
            }}>
            {durationText && (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <Icon name="timer" size={12} color={c.textPrimary} />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: c.textPrimary,
                  }}>
                  {durationText}
                </Text>
              </View>
            )}
            {!!session.caloriesBurned && (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                <FlameIcon size={12} color={c.danger} />
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: c.danger }}>
                  {session.caloriesBurned}kcal
                </Text>
              </View>
            )}
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
              <Icon name="dumbbell" size={12} color={c.success} />
              <Text
                style={{ fontSize: 14, fontWeight: "600", color: c.success }}>
                {volume.toLocaleString()}kg
              </Text>
            </View>
            <Text
              style={{
                fontSize: 11,
                fontWeight: "700",
                color: c.textMuted,
                marginLeft: "auto" as any,
              }}>
              {visibleExercises.length}종목 {expanded ? "▲" : "▼"}
            </Text>
          </View>
          {/* 종목 이름 목록 */}
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: c.textSecondary,
              lineHeight: 20,
            }}>
            {visibleExercises
              .slice(0, 4)
              .map((ex) => ex.name)
              .join(" · ")}
            {visibleExercises.length > 4
              ? ` +${visibleExercises.length - 4}`
              : ""}
          </Text>
          {/* 부위별 완료 세트 수 */}
          {Object.keys(muscleCounts).length > 0 && (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 10,
                marginTop: 8,
              }}>
              {Object.entries(muscleCounts).map(([muscle, count]) => (
                <View
                  key={muscle}
                  style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <View
                    style={{
                      width: 3,
                      height: 14,
                      backgroundColor: getMuscleColor(muscle),
                      borderRadius: 2,
                    }}
                  />
                  <Text style={{ fontSize: 12, color: c.textSecondary }}>{muscle}</Text>
                  <Text
                    style={{ fontSize: 12, fontWeight: "600", color: c.textPrimary }}>
                    {count}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </TouchableOpacity>

        {/* 수정 / 삭제 / 루틴 저장 버튼 */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 8,
            paddingHorizontal: 14,
            paddingVertical: 10,
            borderTopWidth: 1,
            borderTopColor: c.surfaceAlt,
          }}>
          <TouchableOpacity activeOpacity={0.7}
            onPress={() => setShowDateModal(true)}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              minHeight: 44,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 12,
              backgroundColor: c.surfaceAlt,
            }}>
            <Icon name="calendar" size={16} color={c.textSecondary} />
            <Text style={{ fontSize: 14, fontWeight: "600", color: c.textSecondary }}>
              날짜 변경
            </Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7}
            onPress={() => {
              setRoutineSaveName("");
              setShowRoutineSaveModal(true);
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              minHeight: 44,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 12,
              backgroundColor: c.warning + "20",
            }}>
            <Icon name="star" size={16} color={c.warning} />
            <Text style={{ fontSize: 14, fontWeight: "600", color: c.warning }}>
              루틴 저장
            </Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7}
            onPress={() => {
              if (editMode) {
                setEditMode(false);
              } else {
                enterHistoryEdit();
                setExpanded(true);
              }
            }}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              minHeight: 44,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 12,
              backgroundColor: editMode ? c.danger + "15" : c.primary + "15",
            }}>
            <Icon
              name={editMode ? "close" : "pencil"}
              size={18}
              color={editMode ? c.danger : c.primary}
            />
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color: editMode ? c.danger : c.primary,
              }}>
              {editMode ? "취소" : "수정"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7}
            onPress={handleDelete}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              minHeight: 44,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 12,
              backgroundColor: c.danger + "15",
            }}>
            <Icon name="trash" size={18} color={c.danger} />
            <Text style={{ fontSize: 14, fontWeight: "600", color: c.danger }}>
              삭제
            </Text>
          </TouchableOpacity>
        </View>

        {/* 날짜 변경 모달 */}
        {/* 안드로이드 뒤로가기 = "취소" */}
        <Modal
          visible={showDateModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDateModal(false)}>
          <View
            style={{
              flex: 1,
              backgroundColor: SCRIM_STRONG,
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}>
            <View
              style={{
                backgroundColor: c.surface,
                borderRadius: 24,
                padding: 18,
                width: "100%",
              }}>
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: "800",
                  color: c.textPrimary,
                  marginBottom: 4,
                  paddingHorizontal: 4,
                }}>
                날짜 변경
              </Text>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: c.textSecondary,
                  marginBottom: 12,
                  paddingHorizontal: 4,
                }}>
                이 운동 기록을 옮길 날짜를 선택하세요
              </Text>
              <Calendar
                current={session.date}
                markedDates={{
                  [session.date]: { selected: true, selectedColor: c.primary },
                }}
                onDayPress={(day: { dateString: string }) => {
                  if (!dateSaving) handleChangeDate(day.dateString);
                }}
                theme={{
                  backgroundColor: c.surface,
                  calendarBackground: c.surface,
                  textSectionTitleColor: c.textSecondary,
                  selectedDayBackgroundColor: c.primary,
                  selectedDayTextColor: c.surface,
                  todayTextColor: c.success,
                  dayTextColor: c.textPrimary,
                  textDisabledColor: c.textMuted,
                  arrowColor: c.primary,
                  monthTextColor: c.textPrimary,
                  dotColor: c.primary,
                }}
              />
              <TouchableOpacity activeOpacity={0.7}
                onPress={() => setShowDateModal(false)}
                disabled={dateSaving}
                style={{
                  marginTop: 10,
                  minHeight: 44,
                  borderRadius: 12,
                  backgroundColor: c.surfaceAlt,
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                <Text
                  style={{ fontSize: 14, fontWeight: "800", color: c.textSecondary }}>
                  {dateSaving ? "변경 중…" : "닫기"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* 루틴으로 저장 모달 */}
        {/* 안드로이드 뒤로가기 = "취소" */}
        <Modal
          visible={showRoutineSaveModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowRoutineSaveModal(false)}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}>
            <View
              style={{
                flex: 1,
                backgroundColor: SCRIM_STRONG,
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
              }}>
              <View
                style={{
                  backgroundColor: c.surface,
                  borderRadius: 24,
                  padding: 22,
                  width: "100%",
                }}>
                <Text
                  style={{
                    fontSize: 17,
                    fontWeight: "800",
                    color: c.textPrimary,
                    marginBottom: 6,
                  }}>
                  루틴으로 저장
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: c.textSecondary,
                    marginBottom: 16,
                  }}>
                  {session.date} · {visibleExercises.length}종목
                </Text>
                <TextInput
                  style={{
                    backgroundColor: c.surfaceAlt,
                    borderRadius: 12,
                    padding: 14,
                    fontSize: 15,
                    fontWeight: "800",
                    color: c.textPrimary,
                    marginBottom: 16,
                  }}
                  value={routineSaveName}
                  onChangeText={setRoutineSaveName}
                  placeholder="루틴 이름 (예: 상체 루틴)"
                  placeholderTextColor={c.textMuted}
                  autoFocus
                  returnKeyType="done"
                  onSubmitEditing={handleSaveSessionAsRoutine}
                />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TouchableOpacity activeOpacity={0.7}
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      borderRadius: 12,
                      backgroundColor: c.surfaceAlt,
                      alignItems: "center",
                    }}
                    onPress={() => setShowRoutineSaveModal(false)}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: c.textSecondary,
                      }}>
                      취소
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity activeOpacity={0.7}
                    style={{
                      flex: 1,
                      paddingVertical: 14,
                      borderRadius: 12,
                      backgroundColor: c.warning,
                      alignItems: "center",
                    }}
                    onPress={handleSaveSessionAsRoutine}
                    disabled={routineSaving}>
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "800",
                        color: c.onAccent,
                      }}>
                      {routineSaving ? "저장 중..." : "저장"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>

        {/* ── L1 펼친 상태 ── */}
        {expanded &&
          (editMode ? (
            <View style={{ paddingHorizontal: 18, paddingBottom: 8 }}>
              {draftExercises.map((ex, exIdx) => (
                <View
                  key={ex.id}
                  style={{
                    paddingVertical: 12,
                    borderTopWidth: exIdx > 0 ? 1 : 0,
                    borderTopColor: c.surfaceAlt,
                  }}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 8,
                      gap: 8,
                    }}>
                    <TextInput
                      style={{
                        flex: 1,
                        fontSize: 15,
                        fontWeight: "800",
                        color: c.textPrimary,
                        backgroundColor: c.surfaceAlt,
                        borderRadius: 10,
                        paddingHorizontal: 10,
                        height: 36,
                      }}
                      value={ex.name}
                      onChangeText={(v) => updateDraftExName(exIdx, v)}
                      placeholder="종목명"
                      placeholderTextColor={c.textMuted}
                    />
                    <IconButton
                      accessibilityLabel={`${ex.name || "이름 없는 종목"} 삭제`}
                      onPress={() => removeDraftExercise(exIdx)}>
                      <Icon name="trash" size={16} color={c.danger} />
                    </IconButton>
                  </View>
                  {ex.sets.map((ds, setIdx) => (
                    <View
                      key={ds.id}
                      style={{
                        backgroundColor: ds.completed
                          ? c.success + "14"
                          : c.surfaceAlt,
                        borderRadius: 12,
                        padding: 10,
                        marginBottom: 8,
                      }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 8,
                        }}>
                        <TouchableOpacity activeOpacity={0.7}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                          }}
                          onPress={() =>
                            updateDraftSet(exIdx, setIdx, {
                              completed: !ds.completed,
                            })
                          }>
                          {ds.completed ? (
                            <View
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: 12,
                                backgroundColor: c.primary,
                                alignItems: "center",
                                justifyContent: "center",
                              }}>
                              <Icon name="check" size={12} color={c.surface} />
                            </View>
                          ) : (
                            <View
                              style={{
                                width: 24,
                                height: 24,
                                borderRadius: 12,
                                borderWidth: 1.5,
                                borderColor: c.border,
                                alignItems: "center",
                                justifyContent: "center",
                              }}>
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontWeight: "700",
                                  color: c.textMuted,
                                }}>
                                {setIdx + 1}
                              </Text>
                            </View>
                          )}
                          <Text
                            style={{
                              fontSize: 11,
                              fontWeight: "700",
                              color: c.textSecondary,
                            }}>
                            세트 {setIdx + 1}
                          </Text>
                        </TouchableOpacity>
                        <IconButton
                          accessibilityLabel={`세트 ${setIdx + 1} 삭제`}
                          // 세트 개수만큼 반복되는 행이다. box로 키우면 행마다
                          // 24 → 44라 세트 수만큼 누적된다. 같은 행 왼쪽 요소와는
                          // 폭이 넉넉히 떨어져 있어 hitSlop이 겹치지 않는다.
                          touchTargetMode="hitSlop"
                          onPress={() => removeDraftSet(exIdx, setIdx)}>
                          <Icon name="trash" size={14} color={c.textMuted} />
                        </IconButton>
                      </View>
                      <SetInputRow
                        weight={ds.weight}
                        reps={ds.reps}
                        valueBg={c.surface}
                        onWeightStep={(delta) =>
                          updateDraftSet(exIdx, setIdx, {
                            weight: String(
                              Math.max(0, (parseFloat(ds.weight) || 0) + delta)
                            ),
                          })
                        }
                        onRepsStep={(delta) =>
                          updateDraftSet(exIdx, setIdx, {
                            reps: String(
                              Math.max(0, (parseInt(ds.reps) || 0) + delta)
                            ),
                          })
                        }
                        onWeightPad={() =>
                          openPad(ds.weight, true, "kg", (v) =>
                            updateDraftSet(exIdx, setIdx, { weight: v })
                          )
                        }
                        onRepsPad={() =>
                          openPad(ds.reps, false, "회", (v) =>
                            updateDraftSet(exIdx, setIdx, { reps: v })
                          )
                        }
                      />
                    </View>
                  ))}
                  <TouchableOpacity activeOpacity={0.7}
                    style={{
                      alignItems: "center",
                      paddingVertical: 7,
                      borderRadius: 12,
                      backgroundColor: c.primary + "18",
                      marginBottom: 2,
                    }}
                    onPress={() => addDraftSet(exIdx)}>
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: c.success,
                      }}>
                      + 세트 추가
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
              <TouchableOpacity activeOpacity={0.7}
                style={{
                  alignItems: "center",
                  paddingVertical: 9,
                  borderRadius: 12,
                  borderWidth: 1.5,
                  borderColor: c.primary,
                  marginBottom: 4,
                }}
                onPress={addDraftExercise}>
                <Text
                  style={{ fontSize: 14, fontWeight: "600", color: c.success }}>
                  + 종목 추가
                </Text>
              </TouchableOpacity>
              <TouchableOpacity activeOpacity={0.7}
                style={{
                  alignItems: "center",
                  paddingVertical: 12,
                  borderRadius: 16,
                  backgroundColor: c.primary,
                  marginVertical: 8,
                }}
                onPress={handleSaveEdit}
                disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color={c.surface} />
                ) : (
                  <Text
                    style={{
                      fontSize: 14,
                      fontWeight: "800",
                      color: c.onAccent,
                    }}>
                    저장하기
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <SortableList
                data={visibleExercises}
                keyExtractor={(ex) => ex.id}
                itemHeight={64}
                scrollRef={scrollRef}
                scrollOffsetRef={scrollOffsetRef}
                onDragStart={() => {
                  setExExpanded({});
                  onExerciseDragStart?.();
                }}
                onDragRelease={() => {
                  onExerciseDragRelease?.();
                }}
                onDragEnd={(reordered) => {
                  skipNextSync.current = true;
                  setOrderedExercises(reordered);
                  onUpdate(reordered);
                }}
                renderItem={(ex, _idx, isActive) => {
                  const maxInfo = getExMaxWeight(ex);
                  const maxKg = maxInfo?.kg ?? 0; // 비교/PR용 (kg 통일)
                  const exVol = getExVolume(ex);
                  const doneSetCount = ex.sets.filter((s) => s.completed).length;
                  const allTimePR = getAllTimePR(ex.name);
                  const isPR = maxKg > 0 && maxKg >= allTimePR && allTimePR > 0;
                  const prevInfo = getPrevSessionInfo(ex.name);
                  const isOpen = exExpanded[ex.id] ?? false;

                  return (
                    <View
                      style={{
                        borderTopWidth: 1,
                        borderTopColor: c.surfaceAlt,
                      }}>
                      {/* L1 종목 요약 행 */}
                      <TouchableOpacity
                        onPress={() => {
                          LayoutAnimation.configureNext(
                            LayoutAnimation.Presets.easeInEaseOut
                          );
                          setExExpanded((prev) => ({
                            ...prev,
                            [ex.id]: !prev[ex.id],
                          }));
                        }}
                        activeOpacity={0.7}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingHorizontal: 16,
                          paddingVertical: 11,
                          gap: 8,
                        }}>
                        <Text
                          style={{
                            fontSize: 14,
                            color: c.textMuted,
                            fontWeight: "600",
                            marginRight: 4,
                            opacity: isActive ? 1 : 0.35,
                          }}>
                          ≡
                        </Text>
                        <View style={{ flex: 1 }}>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                              flexWrap: "wrap",
                            }}>
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: "800",
                                color: c.textPrimary,
                              }}>
                              {ex.name}
                            </Text>
                            {isPR && (
                              <View
                                style={{
                                  backgroundColor: c.stats + "20",
                                  borderRadius: 999,
                                  paddingHorizontal: 7,
                                  paddingVertical: 2,
                                  flexDirection: "row",
                                  alignItems: "center",
                                  gap: 3,
                                }}>
                                <Icon name="trophy" size={9} color={c.stats} />
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: "700",
                                    color: c.stats,
                                  }}>
                                  PR
                                </Text>
                              </View>
                            )}
                            <View
                              style={{
                                backgroundColor: c.surfaceAlt,
                                borderRadius: 999,
                                paddingHorizontal: 7,
                                paddingVertical: 2,
                              }}>
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontWeight: "700",
                                  color: c.success,
                                }}>
                                {ex.category}
                              </Text>
                            </View>
                          </View>
                          {(ex.targetMuscles?.length ?? 0) > 0 && (
                            <View
                              style={{
                                flexDirection: "row",
                                flexWrap: "wrap",
                                gap: 4,
                                marginTop: 4,
                                marginBottom: 2,
                              }}>
                              {ex.targetMuscles!.map((m, mi) => (
                                <View
                                  key={mi}
                                  style={{
                                    backgroundColor: c.primary + "18",
                                    borderRadius: 999,
                                    paddingHorizontal: 7,
                                    paddingVertical: 2,
                                  }}>
                                  <Text
                                    style={{
                                      fontSize: 11,
                                      fontWeight: "700",
                                      color: c.primary,
                                    }}>
                                    {m}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}
                          <Text
                            style={{
                              fontSize: 11,
                              color: c.textSecondary,
                              fontWeight: "700",
                              marginTop: 2,
                            }}>
                            {maxInfo ? `최고 ${maxInfo.weight}${maxInfo.unit} · ` : ""}
                            {doneSetCount}세트 · {exVol.toLocaleString()}kg
                          </Text>
                        </View>
                        <Text
                          style={{
                            fontSize: 11,
                            color: c.textMuted,
                            fontWeight: "700",
                          }}>
                          {isOpen ? "▲" : "▼"}
                        </Text>
                      </TouchableOpacity>

                      {/* L2 종목 상세 */}
                      {isOpen && (
                        <View
                          style={{
                            backgroundColor: c.surface,
                            paddingHorizontal: 16,
                            paddingBottom: 14,
                          }}>
                          {/* 목표 횟수 · 쉬는시간 */}
                          {(ex.targetReps?.trim() ||
                            (ex.restSeconds && ex.restSeconds > 0)) && (
                            <View
                              style={{
                                flexDirection: "row",
                                gap: 12,
                                marginBottom: 8,
                              }}>
                              {ex.targetReps?.trim() ? (
                                <View
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 4,
                                  }}>
                                  <Icon
                                    name="target"
                                    size={12}
                                    color={c.textSecondary}
                                  />
                                  <Text
                                    style={{
                                      fontSize: 12,
                                      color: c.textSecondary,
                                      fontWeight: "600",
                                    }}>
                                    목표 {ex.targetReps}
                                  </Text>
                                </View>
                              ) : null}
                              {ex.restSeconds && ex.restSeconds > 0 ? (
                                <View
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 4,
                                  }}>
                                  <Icon
                                    name="timer"
                                    size={12}
                                    color={c.textSecondary}
                                  />
                                  <Text
                                    style={{
                                      fontSize: 12,
                                      color: c.textSecondary,
                                      fontWeight: "600",
                                    }}>
                                    쉬는시간 {fmtRestSeconds(ex.restSeconds)}
                                  </Text>
                                </View>
                              ) : null}
                            </View>
                          )}

                          {/* 기구 설정 태그 */}
                          {ex.settings && ex.settings.length > 0 && (
                            <View
                              style={{
                                flexDirection: "row",
                                flexWrap: "wrap",
                                gap: 4,
                                marginBottom: 10,
                              }}>
                              {ex.settings.map((st, i) => (
                                <View
                                  key={i}
                                  style={{
                                    backgroundColor: c.surfaceAlt,
                                    borderRadius: 999,
                                    paddingHorizontal: 9,
                                    paddingVertical: 3,
                                  }}>
                                  <Text
                                    style={{
                                      fontSize: 11,
                                      fontWeight: "700",
                                      color: c.success,
                                    }}>
                                    {st.key}: {st.value}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}

                          {/* 세트 테이블 헤더 */}
                          <View
                            style={{
                              flexDirection: "row",
                              paddingBottom: 6,
                              marginBottom: 2,
                              borderBottomWidth: 1,
                              borderBottomColor: c.surfaceAlt,
                            }}>
                            {["세트", "무게", "횟수", "볼륨(kg)"].map((h) => (
                              <Text
                                key={h}
                                style={{
                                  flex: h === "세트" ? 0.6 : 1,
                                  fontSize: 11,
                                  fontWeight: "700",
                                  color: c.textMuted,
                                  textAlign: "center",
                                }}>
                                {h}
                              </Text>
                            ))}
                          </View>

                          {/* 세트 행들 */}
                          {ex.sets.map((st, si) => {
                            const _w =
                              st.unit === "lbs"
                                ? st.weight / 2.20462
                                : st.weight;
                            const vol = ex.isSingleArm
                              ? _w * st.reps * 2
                              : _w * st.reps;
                            return (
                              <View
                                key={st.id}
                                style={{
                                  flexDirection: "row",
                                  paddingVertical: 5,
                                }}>
                                <Text
                                  style={{
                                    flex: 0.6,
                                    fontSize: 12,
                                    textAlign: "center",
                                    color: c.textMuted,
                                    fontWeight: "600",
                                  }}>
                                  {si + 1}
                                </Text>
                                <Text
                                  style={{
                                    flex: 1,
                                    fontSize: 14,
                                    textAlign: "center",
                                    fontWeight: "600",
                                    color: c.textPrimary,
                                  }}>
                                  {st.weight}
                                  <Text style={{ fontSize: 11, color: c.textMuted, fontWeight: "700" }}>
                                    {st.unit ?? "kg"}
                                  </Text>
                                </Text>
                                <Text
                                  style={{
                                    flex: 1,
                                    fontSize: 14,
                                    textAlign: "center",
                                    fontWeight: "600",
                                    color: c.textPrimary,
                                  }}>
                                  {st.reps}
                                </Text>
                                <Text
                                  style={{
                                    flex: 1,
                                    fontSize: 14,
                                    textAlign: "center",
                                    fontWeight: "600",
                                    color: c.textSecondary,
                                  }}>
                                  {vol}
                                </Text>
                              </View>
                            );
                          })}

                          {/* 종목 합계 */}
                          <View
                            style={{
                              flexDirection: "row",
                              flexWrap: "wrap",
                              gap: 10,
                              marginTop: 10,
                              paddingTop: 10,
                              borderTopWidth: 1,
                              borderTopColor: c.surfaceAlt,
                            }}>
                            {maxInfo && (
                              <Text
                                style={{
                                  fontSize: 12,
                                  fontWeight: "600",
                                  color: c.textPrimary,
                                }}>
                                최고 {maxInfo.weight}{maxInfo.unit}
                              </Text>
                            )}
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: "600",
                                color: c.textPrimary,
                              }}>
                              총 {doneSetCount}세트
                            </Text>
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: "600",
                                color: c.success,
                              }}>
                              볼륨 {exVol.toLocaleString()}kg
                            </Text>
                          </View>

                          {/* 이전 대비 */}
                          {prevInfo &&
                            maxKg > 0 &&
                            maxInfo &&
                            (() => {
                              // 비교는 kg로, 표시는 현재 종목 단위로 환산
                              const unit = maxInfo.unit;
                              const kgDiff = maxKg - prevInfo.maxWeight;
                              const dispDiff =
                                Math.round(
                                  (unit === "lbs" ? kgDiff * 2.20462 : kgDiff) * 10
                                ) / 10;
                              const color =
                                dispDiff > 0
                                  ? c.success
                                  : dispDiff < 0
                                  ? c.danger
                                  : c.textSecondary;
                              const label =
                                dispDiff > 0
                                  ? `+${dispDiff}${unit} ↑`
                                  : dispDiff < 0
                                  ? `${dispDiff}${unit} ↓`
                                  : "변동없음";
                              return (
                                <View
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    gap: 6,
                                    marginTop: 8,
                                  }}>
                                  <Text
                                    style={{
                                      fontSize: 11,
                                      fontWeight: "700",
                                      color,
                                    }}>
                                    이전 대비 {label}
                                  </Text>
                                  <Text
                                    style={{
                                      fontSize: 11,
                                      color: c.textMuted,
                                    }}>
                                    ({fmtDate(prevInfo.date)})
                                  </Text>
                                </View>
                              );
                            })()}

                          {/* 운동 팁 */}
                          {!!ex.tip && (
                            <View
                              style={{
                                flexDirection: "row",
                                alignItems: "flex-start",
                                gap: 5,
                                marginTop: 8,
                                backgroundColor: c.stats + "18",
                                borderRadius: 10,
                                padding: 10,
                              }}>
                              <Icon name="bulb" size={12} color={c.stats} />
                              <Text
                                style={{
                                  fontSize: 12,
                                  color: c.textSecondary,
                                  flex: 1,
                                  lineHeight: 18,
                                }}>
                                {ex.tip}
                              </Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  );
                }}
              />

              {/* 세션 합계 */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 16,
                  padding: 14,
                  borderTopWidth: 1,
                  borderTopColor: c.surfaceAlt,
                }}>
                {!!session.caloriesBurned && (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}>
                    <FlameIcon size={12} color={c.danger} />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "600",
                        color: c.danger,
                      }}>
                      {session.caloriesBurned}kcal
                    </Text>
                  </View>
                )}
                <Text
                  style={{ fontSize: 15, fontWeight: "800", color: c.success }}>
                  총 {volume.toLocaleString()}kg
                </Text>
              </View>
            </View>
          ))}
      </Card>
      <NumberPad
        visible={historyPadConfig !== null}
        value={historyPadConfig?.value ?? "0"}
        decimal={historyPadConfig?.decimal ?? true}
        suffix={historyPadConfig?.suffix}
        onConfirm={(v) => {
          historyPadConfig?.onConfirm(v);
          setHistoryPadConfig(null);
        }}
        onCancel={() => setHistoryPadConfig(null)}
      />
    </>
  );
}
