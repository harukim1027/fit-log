import React, { useRef } from "react";
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
import { useRouter } from "expo-router";
import { Header, Card, SortableList, NumberPad } from "../../components/ui";
import { useEffect, useState, useMemo } from "react";
import { Icon, PlayIcon, FlameIcon } from "../../components/AppIcons";
import { useRoutineStore } from "../../store/routineStore";
import { Calendar } from "react-native-calendars";
import {
  useWorkoutStore,
  calculateCaloriesBurned,
  CompareMode,
} from "../../store/workoutStore";
import { useAuthStore } from "../../store/authStore";
import { useColors } from "../../constants/colors";
import { BackgroundBlobs } from "../../components/BackgroundBlobs";
import RestTimer from "../../components/RestTimer";
import WorkoutCompleteOverlay from "../../components/WorkoutCompleteOverlay";
import { WorkoutSession } from "../../types/workout";
import WorkoutTimer from "../../components/WorkoutTimer";

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

type Tab = "today" | "history";


const SESSION_DATE_KEY = (s: WorkoutSession) =>
  new Date(s.date).toISOString().split("T")[0];

const formatSelectedDate = (dateStr: string) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("ko-KR", {
    month: "long",
    day: "numeric",
    weekday: "short",
  });
};

// CAL_THEME은 컴포넌트 안에서 useColors()로 makeCalTheme(c)으로 생성
function makeCalTheme(c: import("../../constants/colors").ThemeColors) {
  return {
    backgroundColor: c.background,
    calendarBackground: c.surface,
    textSectionTitleColor: c.textSecondary,
    selectedDayBackgroundColor: c.primary,
    selectedDayTextColor: c.onAccent,
    todayTextColor: c.primary,
    todayBackgroundColor: c.primary + '18',
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

const fmtExerciseMeta = (targetReps?: string, restSeconds?: number): string | null => {
  const parts: string[] = [];
  if (targetReps?.trim()) parts.push(targetReps.trim());
  if (restSeconds && restSeconds > 0) parts.push(fmtRestSeconds(restSeconds));
  return parts.length > 0 ? parts.join(' · ') : null;
};

export default function WorkoutScreen() {
  const router = useRouter();
  const c = useColors();
  const SHADOW = {
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 4,
  };
  const SHADOW_SM = {
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 3,
  };
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
    exerciseHistoryCache,
    workoutElapsed,
    workoutPaused,
    setWorkoutElapsed,
    setWorkoutPaused,
    addSet,
    addExercise,
    removeExercise,
    updateSession,
    reorderSessionExercises,
  } = useWorkoutStore();
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
  } = useRoutineStore();

  // Refs to parent ScrollViews so we can synchronously disable scrolling when
  // a SortableList drag starts (prevents the ScrollView from stealing the gesture).
  const todayScrollRef = useRef<any>(null);
  const historyScrollRef = useRef<any>(null);

  const [tab, setTab] = useState<Tab>("today");
  const [compareModes, setCompareModes] = useState<Record<string, CompareMode>>(
    {}
  );
  const [completeCalories, setCompleteCalories] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    new Date().toISOString().substring(0, 7)
  );
  const [activeEditExId, setActiveEditExId] = useState<string | null>(null);
  const [draftExName, setDraftExName] = useState("");
  const [draftSets, setDraftSets] = useState<Array<{id: string; weight: string; reps: string; completed: boolean; isNew?: boolean}>>([]);
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
  const [timerPinned, setTimerPinned] = useState(false);
  const [timerState, setTimerState] = useState({
    seconds: 0,
    remaining: 0,
    running: false,
    paused: false,
  });
  const [detailExpanded, setDetailExpanded] = useState<Record<string, boolean>>({});
  const [addingSettingFor, setAddingSettingFor] = useState<string | null>(null);
  const [newSettingKey, setNewSettingKey] = useState("시트높이");
  const [newSettingVal, setNewSettingVal] = useState("");
  const [showRoutineSheet, setShowRoutineSheet] = useState(false);
  const [expandedRoutineInSheet, setExpandedRoutineInSheet] = useState<string | null>(null);
  const [addedFromRoutine, setAddedFromRoutine] = useState<Set<string>>(new Set());

  type PadConfig = { value: string; decimal: boolean; suffix: string; onConfirm: (v: string) => void };
  const [padConfig, setPadConfig] = useState<PadConfig | null>(null);
  const openPad = (value: string, decimal: boolean, suffix: string, onConfirm: (v: string) => void) =>
    setPadConfig({ value, decimal, suffix, onConfirm });

  const SETTING_KEYS = ["시트높이", "등받이각도", "그립종류", "발판위치", "바높이", "인클라인각도", "기타"];

  useEffect(() => {
    fetchSessions();
    loadRoutines();
  }, []);

  useEffect(() => {
    if (communityExpanded) fetchPublicRoutines(communitySort).catch(() => {});
  }, [communityExpanded, communitySort]);

  const handleShareToggle = (
    routine: import("../../store/routineStore").Routine
  ) => {
    if (routine.isPublic && routine.shareCode) {
      Alert.alert("공유 중", `공유 코드: ${routine.shareCode}`, [
        {
          text: "비공개로 변경",
          style: "destructive",
          onPress: () =>
            unshareRoutine(routine.id).catch(() =>
              Alert.alert("오류", "변경에 실패했어요")
            ),
        },
        { text: "닫기", style: "cancel" },
      ]);
    } else {
      Alert.alert(
        "루틴 공개",
        "이 루틴을 다른 사람과 공유할까요?\n공유 코드가 생성돼요.",
        [
          { text: "취소", style: "cancel" },
          {
            text: "공개하기",
            onPress: () =>
              shareRoutine(routine.id).catch(() =>
                Alert.alert("오류", "공유 설정에 실패했어요")
              ),
          },
        ]
      );
    }
  };

  const handleCopy = async (id: string) => {
    setCopyingId(id);
    try {
      await copyRoutine(id);
      Alert.alert("완료", "내 루틴으로 가져왔어요!");
    } catch {
      Alert.alert("오류", "가져오기에 실패했어요");
    } finally {
      setCopyingId(null);
    }
  };

  const handleCodeSearch = async () => {
    if (codeInput.trim().length !== 6)
      return Alert.alert("코드 오류", "6자리 코드를 입력해주세요");
    setCodeSearching(true);
    setCodeResult(null);
    try {
      const result = await searchByCode(codeInput);
      setCodeResult(result);
    } catch {
      Alert.alert("루틴을 찾을 수 없어요", "코드를 다시 확인해주세요");
    } finally {
      setCodeSearching(false);
    }
  };

  const enterEdit = (ex: WorkoutSession['exercises'][0]) => {
    setDraftExName(ex.name);
    setDraftSets(ex.sets.map(s => ({
      id: s.id,
      weight: String(s.weight),
      reps: String(s.reps),
      completed: s.completed,
    })));
    setActiveEditExId(ex.id);
  };

  const commitEdit = (ex: WorkoutSession['exercises'][0]) => {
    if (draftExName.trim() && draftExName.trim() !== ex.name) {
      updateExercise(ex.id, { name: draftExName.trim() } as any);
    }
    const originalIds = new Set(ex.sets.map(s => s.id));
    const keptIds = new Set(draftSets.filter(s => !s.isNew).map(s => s.id));
    ex.sets.forEach(s => { if (!keptIds.has(s.id)) removeSet(ex.id, s.id); });
    draftSets.filter(s => !s.isNew && originalIds.has(s.id)).forEach(ds => {
      updateSet(ex.id, ds.id, {
        weight: parseFloat(ds.weight) || 0,
        reps: parseInt(ds.reps) || 0,
        completed: ds.completed,
      });
    });
    draftSets.filter(s => s.isNew).forEach((ds, i) => {
      addSet(ex.id, {
        id: `${ex.id}-edit-${Date.now()}-${i}`,
        weight: parseFloat(ds.weight) || 0,
        reps: parseInt(ds.reps) || 0,
        completed: ds.completed,
      });
    });
    setActiveEditExId(null);
    setDraftSets([]);
  };

  useEffect(() => {
    if (!activeSession?.exercises.length) return;
    activeSession.exercises.forEach((ex) => {
      const mode = compareModes[ex.name] ?? "recent";
      const key = `${ex.name}:${mode}`;
      const data = exerciseHistoryCache.get(key);
      console.log(
        `[ExHistory] ${key}:`,
        data
          ? `comparisonSession=${JSON.stringify(data.comparisonSession)}`
          : "캐시없음 (로딩중)"
      );
    });
  }, [exerciseHistoryCache, activeSession?.exercises?.length]);

  const handleEditExercise = (ex: WorkoutSession['exercises'][0]) => {
    router.push({
      pathname: '/modal/add-workout',
      params: { editMode: 'true', exerciseId: ex.id, exerciseData: JSON.stringify(ex) },
    } as any);
  };

  const handleEnd = () => {
    const weightKg = user?.weight ?? 70;
    const durationMinutes = sessionStartTime
      ? Math.max(Math.round((Date.now() - sessionStartTime) / 60000), 1)
      : 30;
    const calories = activeSession
      ? calculateCaloriesBurned(activeSession, weightKg, durationMinutes)
      : 0;
    const fromRoutineId = activeSession?.fromRoutineId;
    const sessionSnapshot = activeSession ? { ...activeSession, exercises: [...activeSession.exercises] } : null;

    Alert.alert("운동 종료", "오늘 운동을 저장하고 종료할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "저장 및 종료",
        onPress: async () => {
          await endSession(calories);
          setCompleteCalories(calories);

          if (fromRoutineId && sessionSnapshot) {
            const routine = routines.find(r => r.id === fromRoutineId);
            if (routine) {
              const changes: string[] = [];
              sessionSnapshot.exercises.forEach(ex => {
                const re = routine.exercises.find(r => r.name === ex.name);
                if (!re) changes.push(`${ex.name} 추가`);
                else if (ex.sets.length !== re.defaultSets) changes.push(`${ex.name} 세트 변경`);
              });
              routine.exercises.forEach(re => {
                if (!sessionSnapshot.exercises.find(ex => ex.name === re.name)) changes.push(`${re.name} 제거`);
              });
              if (changes.length > 0) {
                const summary = changes.slice(0, 3).join(', ');
                Alert.alert(
                  '루틴에도 반영할까요?',
                  `변경 내역: ${summary}\n다음에도 동일하게 시작할 수 있어요`,
                  [
                    { text: '이번만', style: 'cancel' },
                    { text: '루틴에 반영', onPress: () =>
                      useRoutineStore.getState().updateRoutineFromSession(fromRoutineId, sessionSnapshot)
                    },
                  ]
                );
              }
            }
          }
        },
      },
    ]);
  };

  const markedDates = useMemo(() => {
    const result: Record<string, any> = {};
    sessions.forEach((s) => {
      const key = SESSION_DATE_KEY(s);
      result[key] = { marked: true, dotColor: c.danger };
    });
    if (selectedDate) {
      result[selectedDate] = {
        ...(result[selectedDate] ?? {}),
        selected: true,
        selectedColor: c.primary,
        dotColor: result[selectedDate]?.marked ? c.surface : c.danger,
      };
    }
    return result;
  }, [sessions, selectedDate]);

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

  const timerProps = activeSession
    ? {
        exerciseName:
          activeSession.exercises[activeSession.exercises.length - 1]?.name,
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
      <BackgroundBlobs />
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
            <TouchableOpacity
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
                  fontSize: 13,
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
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}>
        <ScrollView
          ref={todayScrollRef}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
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
                  style={{ fontSize: 18, fontWeight: "900", color: c.textPrimary }}>
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
                  activeOpacity={0.8}>
                  <Text
                    style={{ fontSize: 13, fontWeight: "800", color: c.onAccent }}>
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
                      fontSize: 20,
                      fontWeight: "900",
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
                    onPress={() => router.push("/modal/routine-manage" as any)}
                    activeOpacity={0.8}>
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
                    onDragStart={() => todayScrollRef.current?.setNativeProps?.({ scrollEnabled: false })}
                    onDragRelease={() => todayScrollRef.current?.setNativeProps?.({ scrollEnabled: true })}
                    onDragEnd={(ordered) => reorderRoutines(ordered.map((r) => r.id))}
                    renderItem={(routine, _idx, isActive) => (
                      <View
                        style={[
                          {
                            backgroundColor: c.surface,
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
                                fontWeight: "900",
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
                              {routine.exercises.length}종목 · 예상{" "}
                              {routine.exercises.reduce(
                                (s, e) => s + e.defaultSets,
                                0
                              ) * 3}
                              분
                            </Text>
                          </View>
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 10,
                            }}>
                            <View style={{ opacity: isActive ? 1.0 : 0.3 }}>
                              <Icon name="menu" size={16} color={c.textSecondary} />
                            </View>
                            <TouchableOpacity
                              onPress={() => handleShareToggle(routine)}>
                              <Icon name={routine.isPublic ? "unlock" : "lock"} size={16} color={c.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() =>
                                router.push({
                                  pathname: "/modal/routine-manage",
                                  params: { editId: routine.id },
                                } as any)
                              }>
                              <Icon name="pencil" size={17} color={c.textSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() =>
                                Alert.alert(
                                  "루틴 삭제",
                                  `"${routine.name}"을 삭제할까요?`,
                                  [
                                    { text: "취소", style: "cancel" },
                                    {
                                      text: "삭제",
                                      style: "destructive",
                                      onPress: () => deleteRoutine(routine.id),
                                    },
                                  ]
                                )
                              }>
                              <Icon name="trash" size={17} color={c.textMuted} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={{
                                backgroundColor: c.warning,
                                borderRadius: 999,
                                paddingHorizontal: 14,
                                paddingVertical: 7,
                              }}
                              onPress={() => startSessionWithRoutine(routine)}
                              activeOpacity={0.8}>
                              <Text
                                style={{
                                  fontSize: 13,
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
                                {ex.name}
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
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                <Icon name="unlock" size={11} color={c.success} />
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: "800",
                                    color: c.success,
                                    letterSpacing: 2,
                                  }}>
                                  {routine.shareCode}
                                </Text>
                              </View>
                            </View>
                            <Text style={{ fontSize: 11, color: c.textSecondary }}>
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
                    onPress={() => router.push("/modal/routine-manage" as any)}
                    activeOpacity={0.8}>
                    <Icon name="plus" size={16} color={c.primary} />
                    <Text
                      style={{
                        fontSize: 14,
                        fontWeight: "700",
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
                    activeOpacity={0.8}>
                    <Text
                      style={{
                        fontSize: 17,
                        fontWeight: "900",
                        color: c.textPrimary,
                      }}>
                      커뮤니티 루틴
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        color: c.textSecondary,
                        fontWeight: "700",
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
                          <TouchableOpacity
                            key={s}
                            style={{
                              paddingHorizontal: 16,
                              paddingVertical: 7,
                              borderRadius: 999,
                              backgroundColor:
                                communitySort === s ? c.primary : c.surfaceAlt,
                            }}
                            onPress={() => setCommunitySort(s)}>
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: "800",
                                color: communitySort === s ? c.surface : c.textSecondary,
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
                            borderRadius: 14,
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
                            borderRadius: 14,
                            paddingHorizontal: 16,
                            paddingVertical: 10,
                          }}
                          onPress={handleCodeSearch}
                          activeOpacity={0.8}>
                          {codeSearching ? (
                            <ActivityIndicator size="small" color={c.surface} />
                          ) : (
                            <Text
                              style={{
                                fontSize: 13,
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
                              borderRadius: 20,
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
                                  fontWeight: "900",
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
                            <TouchableOpacity
                              style={{
                                backgroundColor: c.warning,
                                borderRadius: 999,
                                paddingHorizontal: 14,
                                paddingVertical: 7,
                              }}
                              onPress={() => handleCopy(codeResult!.id)}
                              disabled={copyingId === codeResult.id}>
                              {copyingId === codeResult.id ? (
                                <ActivityIndicator size="small" color={c.surface} />
                              ) : (
                                <Text
                                  style={{
                                    fontSize: 12,
                                    fontWeight: "800",
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
                          style={{ alignItems: "center", paddingVertical: 24 }}>
                          <Text
                            style={{
                              fontSize: 13,
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
                                borderRadius: 20,
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
                                    fontWeight: "900",
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
                                    style={{ fontSize: 11, color: c.textSecondary }}>
                                    by {r.authorName ?? "익명"}
                                  </Text>
                                  <Text
                                    style={{ fontSize: 11, color: c.textMuted }}>
                                    ·
                                  </Text>
                                  <Text
                                    style={{ fontSize: 11, color: c.textMuted }}>
                                    복사 {r.copyCount ?? 0}회
                                  </Text>
                                </View>
                              </View>
                              <TouchableOpacity
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
                                      fontWeight: "800",
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
                elapsed={workoutElapsed}
                paused={workoutPaused}
                onPausedChange={setWorkoutPaused}
                onEnd={handleEnd}
              />
              {activeSession.fromRoutineId && (() => {
                const rn = routines.find(r => r.id === activeSession.fromRoutineId);
                return rn ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, paddingHorizontal: 4 }}>
                    <Text style={{ fontSize: 12, color: c.textMuted, fontWeight: '600' }}>기반 루틴:</Text>
                    <View style={{ backgroundColor: c.surfaceAlt, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <Icon name="list" size={11} color={c.success} />
                        <Text style={{ fontSize: 11, fontWeight: '800', color: c.success }}>{rn.name}</Text>
                      </View>
                    </View>
                  </View>
                ) : null;
              })()}
              {!timerPinned && timerProps && (
                <RestTimer {...timerProps} pinned={false} />
              )}
              {/* 종목 추가 버튼들 */}
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
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
                  activeOpacity={0.8}>
                  <Icon name="plus" size={16} color={c.success} />
                  <Text style={{ fontSize: 13, fontWeight: "800", color: c.success }}>
                    직접 추가
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
                      backgroundColor: c.warning + '18',
                      borderRadius: 999,
                      paddingVertical: 12,
                    }}
                    onPress={() => {
                      setExpandedRoutineInSheet(null);
                      setAddedFromRoutine(new Set());
                      setShowRoutineSheet(true);
                    }}
                    activeOpacity={0.8}>
                    <Icon name="list" size={14} color={c.warning} />
                    <Text style={{ fontSize: 13, fontWeight: "800", color: c.warning }}>
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
                  onDragStart={() => todayScrollRef.current?.setNativeProps?.({ scrollEnabled: false })}
                  onDragRelease={() => todayScrollRef.current?.setNativeProps?.({ scrollEnabled: true })}
                  onDragEnd={reorderSessionExercises}
                  renderItem={(ex, _idx, isActive) => {
                  const mode = compareModes[ex.name] ?? "recent";
                  const cacheKey = `${ex.name}:${mode}`;
                  const cachedHistory = exerciseHistoryCache.get(cacheKey);
                  const comparisonSession =
                    cachedHistory?.comparisonSession ?? null;
                  const prevSets = comparisonSession?.sets ?? [];

                  const allTimePRWeight =
                    cachedHistory?.pr?.weight ??
                    sessions.reduce((max, s) => {
                      const match = s.exercises.find((e) => e.name === ex.name);
                      if (!match) return max;
                      return Math.max(
                        max,
                        ...match.sets.map((st) => st.weight)
                      );
                    }, 0);
                  const currentMax =
                    ex.sets.length > 0
                      ? Math.max(...ex.sets.map((st) => st.weight))
                      : 0;
                  const isPR = currentMax > 0 && currentMax > allTimePRWeight;

                  const getDateLabel = () => {
                    if (!comparisonSession) return null;
                    const d = fmtDate(comparisonSession.date);
                    return mode === "pr"
                      ? `${d} ${comparisonSession.maxWeight}kg`
                      : d;
                  };
                  const dateLabel = getDateLabel();

                  return (
                    <View style={{ marginBottom: 12 }}>
                    <Card className="mb-0">
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 8,
                        }}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                            flex: 1,
                          }}>
                          {activeEditExId === ex.id ? (
                            <TextInput
                              style={{
                                fontSize: 16,
                                fontWeight: "900",
                                color: c.textPrimary,
                                flex: 1,
                                borderBottomWidth: 1.5,
                                borderBottomColor: c.primary,
                                paddingBottom: 2,
                              }}
                              value={draftExName}
                              onChangeText={setDraftExName}
                              returnKeyType="done"
                              onSubmitEditing={() => {
                                if (draftExName.trim() && draftExName.trim() !== ex.name)
                                  updateExercise(ex.id, { name: draftExName.trim() } as any);
                              }}
                            />
                          ) : (
                            <TouchableOpacity
                              style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'nowrap' }}
                              onPress={() => handleEditExercise(ex)}
                              activeOpacity={0.7}>
                              <Text
                                style={{ fontSize: 16, fontWeight: "900", color: c.textPrimary, flexShrink: 1 }}
                                numberOfLines={1}>
                                {ex.name}
                              </Text>
                              {fmtExerciseMeta(ex.targetReps, ex.restSeconds) !== null && (
                                <Text style={{ fontSize: 12, color: c.textSecondary, fontWeight: "600", flexShrink: 0 }}>
                                  {fmtExerciseMeta(ex.targetReps, ex.restSeconds)}
                                </Text>
                              )}
                            </TouchableOpacity>
                          )}
                          {isPR && (
                            <View
                              style={{
                                backgroundColor: c.stats + '20',
                                borderRadius: 999,
                                paddingHorizontal: 9,
                                paddingVertical: 4,
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 4,
                              }}>
                              <Icon name="trophy" size={11} color={c.stats} />
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontWeight: "800",
                                  color: c.stats,
                                }}>
                                PR
                              </Text>
                            </View>
                          )}
                        </View>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                          }}>
                          <TouchableOpacity
                            onPress={() => {
                              if (activeEditExId === ex.id) {
                                commitEdit(ex);
                              } else {
                                enterEdit(ex);
                              }
                            }}>
                            <Icon
                              name={activeEditExId === ex.id ? "check" : "pencil"}
                              size={16}
                              color={activeEditExId === ex.id ? c.primary : c.textMuted}
                            />
                          </TouchableOpacity>
                          <View
                            style={{
                              backgroundColor: c.surfaceAlt,
                              borderRadius: 999,
                              paddingHorizontal: 10,
                              paddingVertical: 5,
                            }}>
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: "800",
                                color: c.success,
                              }}>
                              {ex.category}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "center",
                          marginBottom: 6,
                        }}>
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: "600",
                            color: c.textSecondary,
                          }}>
                          한팔 기준{ex.isSingleArm ? " (볼륨 ×2)" : ""}
                        </Text>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                          }}>
                          {ex.isSingleArm && (
                            <TouchableOpacity
                              style={{
                                flexDirection: "row",
                                alignItems: "center",
                                gap: 4,
                              }}
                              onPress={() =>
                                updateExercise(ex.id, {
                                  differentSides: !ex.differentSides,
                                })
                              }>
                              <View
                                style={{
                                  width: 15,
                                  height: 15,
                                  borderRadius: 4,
                                  borderWidth: 1.5,
                                  borderColor: ex.differentSides
                                    ? c.primary
                                    : c.border,
                                  backgroundColor: ex.differentSides
                                    ? c.primary
                                    : "transparent",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}>
                                {ex.differentSides && (
                                  <Icon name="check" size={9} color={c.surface} />
                                )}
                              </View>
                              <Text
                                style={{
                                  fontSize: 11,
                                  color: c.textSecondary,
                                  fontWeight: "600",
                                }}>
                                좌우 다른 무게
                              </Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={{
                              width: 40,
                              height: 22,
                              borderRadius: 11,
                              backgroundColor: ex.isSingleArm
                                ? c.primary
                                : c.surfaceAlt,
                              justifyContent: "center",
                              paddingHorizontal: 2,
                            }}
                            onPress={() =>
                              updateExercise(ex.id, {
                                isSingleArm: !ex.isSingleArm,
                                differentSides: false,
                              })
                            }
                            activeOpacity={0.8}>
                            <View
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: 9,
                                backgroundColor: c.surface,
                                transform: [
                                  { translateX: ex.isSingleArm ? 18 : 0 },
                                ],
                                shadowColor: "#000",
                                shadowOpacity: 0.12,
                                shadowRadius: 2,
                                elevation: 1,
                              }}
                            />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View className="flex-row gap-1 mb-2">
                        {COMPARE_MODES.map(({ mode: m, label }) => {
                          const isSelected = mode === m;
                          return (
                            <TouchableOpacity
                              key={m}
                              className={[
                                "flex-1 items-center py-1 rounded-xl min-h-9 justify-center",
                                isSelected ? "bg-primary" : "bg-surface-alt",
                              ].join(" ")}
                              onPress={() => {
                                setCompareModes((prev) => ({
                                  ...prev,
                                  [ex.name]: m,
                                }));
                                fetchExerciseHistory(ex.name, m);
                              }}
                              activeOpacity={0.7}>
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontWeight: "600",
                                  color: isSelected ? c.surface : c.textMuted,
                                }}>
                                {label}
                              </Text>
                              {isSelected && dateLabel != null && (
                                <Text
                                  style={{
                                    fontSize: 9,
                                    color: "rgba(255,255,255,0.8)",
                                    marginTop: 1,
                                  }}>
                                  {dateLabel}
                                </Text>
                              )}
                              {isSelected &&
                                cachedHistory &&
                                !comparisonSession && (
                                  <Text
                                    style={{
                                      fontSize: 9,
                                      color: "rgba(255,255,255,0.7)",
                                      marginTop: 1,
                                    }}>
                                    기록없음
                                  </Text>
                                )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {cachedHistory && !comparisonSession && (
                        <View className="flex-row items-center gap-1 mb-2 px-2 py-[7px] bg-surface-alt rounded-lg">
                          <Icon name="info" size={12} color={c.textMuted} />
                          <Text className="text-xs text-text-muted">
                            이 기준의 기록이 없어요
                          </Text>
                        </View>
                      )}

                      {activeEditExId === ex.id ? (
                        <View style={{marginTop: 8}}>
                          {draftSets.map((ds, idx) => (
                            <View key={ds.id} style={{flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8}}>
                              <TouchableOpacity
                                style={{width: 28, height: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center', backgroundColor: ds.completed ? c.primary : c.surfaceAlt, flexShrink: 0}}
                                onPress={() => setDraftSets(prev => prev.map((s, i) => i === idx ? {...s, completed: !s.completed} : s))}>
                                {ds.completed
                                  ? <Icon name="check" size={13} color={c.surface} />
                                  : <Text style={{fontSize: 11, fontWeight: '800', color: c.textSecondary}}>{idx + 1}</Text>}
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={{flex: 1, backgroundColor: c.surfaceAlt, borderRadius: 10, height: 38, alignItems: 'center', justifyContent: 'center'}}
                                onPress={() => openPad(ds.weight, true, 'kg', v => setDraftSets(prev => prev.map((s, i) => i === idx ? {...s, weight: v} : s)))}>
                                <Text style={{fontSize: 14, fontWeight: '700', color: ds.weight ? c.textPrimary : c.textMuted}}>{ds.weight || '0'}</Text>
                              </TouchableOpacity>
                              <Text style={{fontSize: 11, color: c.textSecondary, fontWeight: '600'}}>kg×</Text>
                              <TouchableOpacity
                                style={{flex: 1, backgroundColor: c.surfaceAlt, borderRadius: 10, height: 38, alignItems: 'center', justifyContent: 'center'}}
                                onPress={() => openPad(ds.reps, false, '회', v => setDraftSets(prev => prev.map((s, i) => i === idx ? {...s, reps: v} : s)))}>
                                <Text style={{fontSize: 14, fontWeight: '700', color: ds.reps ? c.textPrimary : c.textMuted}}>{ds.reps || '0'}</Text>
                              </TouchableOpacity>
                              <Text style={{fontSize: 11, color: c.textSecondary, fontWeight: '600'}}>회</Text>
                              <TouchableOpacity onPress={() => setDraftSets(prev => prev.filter((_, i) => i !== idx))}>
                                <Icon name="trash" size={14} color={c.textMuted} />
                              </TouchableOpacity>
                            </View>
                          ))}
                          <TouchableOpacity
                            style={{alignItems: 'center', paddingVertical: 8, borderRadius: 14, backgroundColor: c.primary + '18', marginTop: 2, marginBottom: 4}}
                            onPress={() => {
                              const last = draftSets[draftSets.length - 1];
                              setDraftSets(prev => [...prev, {id: `new-${Date.now()}`, weight: last?.weight ?? '', reps: last?.reps ?? '', completed: false, isNew: true}]);
                            }}>
                            <Text style={{fontSize: 13, fontWeight: '700', color: c.success}}>+ 세트 추가</Text>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        <>
                        <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          paddingBottom: 8,
                          marginBottom: 4,
                          borderBottomWidth: 1,
                          borderStyle: "dashed",
                          borderBottomColor: c.border,
                        }}>
                        <Text
                          style={{
                            fontSize: 10.5,
                            fontWeight: "800",
                            color: c.textMuted,
                            textAlign: "center",
                            width: 28,
                          }}>
                          세트
                        </Text>
                        <Text
                          style={{
                            fontSize: 10.5,
                            fontWeight: "800",
                            color: c.textMuted,
                            textAlign: "center",
                            flex: 1,
                          }}>
                          무게(kg)
                          {ex.isSingleArm && ex.differentSides ? " L/R" : ""}
                        </Text>
                        <Text
                          style={{
                            fontSize: 10.5,
                            fontWeight: "800",
                            color: c.textMuted,
                            textAlign: "center",
                            flex: 1,
                          }}>
                          횟수
                        </Text>
                        <Text
                          style={{
                            fontSize: 10.5,
                            fontWeight: "800",
                            color: c.textMuted,
                            textAlign: "center",
                            flex: 0.8,
                          }}>
                          볼륨
                        </Text>
                        <View style={{ width: 22 }} />
                      </View>

                      {ex.sets.map((st, idx) => {
                        const prev = prevSets[idx];
                        const curVol = ex.isSingleArm
                          ? ex.differentSides && st.weightR != null
                            ? (st.weight + st.weightR) * st.reps
                            : st.weight * st.reps * 2
                          : st.weight * st.reps;
                        const prevVol =
                          prev != null ? prev.weight * prev.reps : undefined;
                        const isSetPR =
                          allTimePRWeight > 0 && st.weight > allTimePRWeight;
                        return (
                          <TouchableOpacity
                            key={st.id}
                            className={[
                              "flex-row items-start py-2",
                              st.completed ? "opacity-60" : "",
                            ].join(" ")}
                            onPress={() => {
                              LayoutAnimation.configureNext({
                                duration: 220,
                                update: { type: "spring", springDamping: 0.65 },
                              });
                              updateSet(ex.id, st.id, {
                                completed: !st.completed,
                              });
                            }}
                            activeOpacity={0.7}>
                            <View
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: 999,
                                alignItems: "center",
                                justifyContent: "center",
                                marginRight: 2,
                                marginTop: 2,
                                backgroundColor: st.completed
                                  ? c.primary
                                  : c.surfaceAlt,
                                flexShrink: 0,
                              }}>
                              {st.completed ? (
                                <Icon name="check" size={13} color={c.surface} />
                              ) : ex.isSingleArm ? (
                                <Text
                                  style={{
                                    fontSize: 9,
                                    fontWeight: "900",
                                    color: c.primary,
                                  }}>
                                  L
                                </Text>
                              ) : (
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: "800",
                                    color: c.textSecondary,
                                  }}>
                                  {idx + 1}
                                </Text>
                              )}
                            </View>
                            <View className="items-center py-0.5 flex-1">
                              <View className="flex-row items-center gap-0.5">
                                <Text
                                  className={[
                                    "text-sm text-center",
                                    st.completed
                                      ? "line-through text-text-muted"
                                      : "text-text-primary",
                                  ].join(" ")}>
                                  {ex.isSingleArm &&
                                  ex.differentSides &&
                                  st.weightR != null
                                    ? `${st.weight} / ${st.weightR}`
                                    : st.weight}
                                </Text>
                                {isSetPR && (
                                  <Icon
                                    name="trophy"
                                    size={10}
                                    color={c.stats}
                                  />
                                )}
                              </View>
                              {ex.isSingleArm && !ex.differentSides && (
                                <Text
                                  style={{
                                    fontSize: 9,
                                    color: c.textMuted,
                                    fontWeight: "700",
                                  }}>
                                  ×2
                                </Text>
                              )}
                              <DiffBadge
                                value={st.weight}
                                prevValue={prev?.weight}
                                unit="kg"
                              />
                            </View>
                            <View className="items-center py-0.5 flex-1">
                              <Text
                                className={[
                                  "text-sm text-center",
                                  st.completed
                                    ? "line-through text-text-muted"
                                    : "text-text-primary",
                                ].join(" ")}>
                                {st.reps}
                              </Text>
                              <DiffBadge
                                value={st.reps}
                                prevValue={prev?.reps}
                                unit="회"
                              />
                            </View>
                            <View
                              className="items-center py-0.5"
                              style={{ flex: 0.5 }}>
                              <Text
                                className={[
                                  "text-sm text-center",
                                  st.completed
                                    ? "line-through text-text-muted"
                                    : "text-text-primary",
                                ].join(" ")}>
                                {curVol}
                              </Text>
                              <DiffBadge
                                value={curVol}
                                prevValue={prevVol}
                                unit="kg"
                              />
                            </View>
                            <TouchableOpacity
                              style={{ marginTop: 3 }}
                              onPress={() => removeSet(ex.id, st.id)}>
                              <Icon name="trash" size={15} color={c.textMuted} />
                            </TouchableOpacity>
                          </TouchableOpacity>
                        );
                      })}
                      {ex.sets.length === 0 && (
                        <Text className="text-sm text-text-muted text-center py-2">
                          세트를 추가해주세요
                        </Text>
                      )}
                        </>
                      )}

                      {/* 상세 설정 토글 */}
                      <TouchableOpacity
                        onPress={() => setDetailExpanded(prev => ({ ...prev, [ex.id]: !prev[ex.id] }))}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingTop: 10, marginTop: 6, borderTopWidth: 1, borderTopColor: c.surfaceAlt }}
                        activeOpacity={0.7}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: c.textSecondary, flex: 1 }}>
                          {detailExpanded[ex.id] ? '▲ 접기' : '▼ 상세 설정'}
                        </Text>
                        {!!(ex.settings?.length || ex.tip || ex.targetReps || ex.restSeconds) && !detailExpanded[ex.id] && (
                          <View style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.warning }} />
                        )}
                      </TouchableOpacity>

                      {detailExpanded[ex.id] && (
                        <View style={{ gap: 14, marginTop: 10 }}>
                          {/* 기구 설정 */}
                          <View>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: c.textMuted, marginBottom: 8 }}>기구 설정</Text>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                              {(ex.settings ?? []).map((st, si) => (
                                <View key={si} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: c.surfaceAlt, borderRadius: 999, paddingLeft: 10, paddingRight: 4, paddingVertical: 4, gap: 4 }}>
                                  <Text style={{ fontSize: 11, fontWeight: '700', color: c.success }}>{st.key}: {st.value}</Text>
                                  <TouchableOpacity
                                    onPress={() => updateExercise(ex.id, { settings: (ex.settings ?? []).filter((_, idx) => idx !== si) })}
                                    hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}>
                                    <Text style={{ fontSize: 14, color: c.textMuted, fontWeight: '700' }}>×</Text>
                                  </TouchableOpacity>
                                </View>
                              ))}
                              <TouchableOpacity
                                style={{ backgroundColor: c.surfaceAlt, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: c.border }}
                                onPress={() => setAddingSettingFor(addingSettingFor === ex.id ? null : ex.id)}>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: c.textSecondary }}>+ 추가</Text>
                              </TouchableOpacity>
                            </View>
                            {addingSettingFor === ex.id && (
                              <View style={{ marginTop: 8, gap: 6 }}>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                                  <View style={{ flexDirection: 'row', gap: 4 }}>
                                    {SETTING_KEYS.map(k => (
                                      <TouchableOpacity
                                        key={k}
                                        style={{ backgroundColor: newSettingKey === k ? c.primary : c.surfaceAlt, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}
                                        onPress={() => setNewSettingKey(k)}>
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: newSettingKey === k ? c.surface : c.textSecondary }}>{k}</Text>
                                      </TouchableOpacity>
                                    ))}
                                  </View>
                                </ScrollView>
                                <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                                  <TextInput
                                    style={{ flex: 1, backgroundColor: c.surfaceAlt, borderRadius: 10, height: 36, paddingHorizontal: 10, fontSize: 13, fontWeight: '700', color: c.textPrimary }}
                                    placeholder="값 입력"
                                    placeholderTextColor={c.textMuted}
                                    value={newSettingVal}
                                    onChangeText={setNewSettingVal}
                                  />
                                  <TouchableOpacity
                                    style={{ backgroundColor: c.primary, borderRadius: 10, height: 36, paddingHorizontal: 14, justifyContent: 'center' }}
                                    onPress={() => {
                                      if (!newSettingVal.trim()) return;
                                      updateExercise(ex.id, { settings: [...(ex.settings ?? []), { key: newSettingKey, value: newSettingVal.trim() }] });
                                      setNewSettingVal('');
                                      setAddingSettingFor(null);
                                    }}>
                                    <Icon name="check" size={14} color={c.surface} />
                                  </TouchableOpacity>
                                </View>
                              </View>
                            )}
                          </View>

                          {/* 목표 횟수 */}
                          <View>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: c.textMuted, marginBottom: 6 }}>목표 횟수</Text>
                            <TextInput
                              style={{ backgroundColor: c.surfaceAlt, borderRadius: 12, padding: 10, fontSize: 13, fontWeight: '700', color: c.textPrimary }}
                              value={ex.targetReps ?? ''}
                              onChangeText={v => updateExercise(ex.id, { targetReps: v })}
                              placeholder="예: 12회, 15-20회"
                              placeholderTextColor={c.textMuted}
                              returnKeyType="done"
                            />
                          </View>

                          {/* 쉬는 시간 */}
                          <View>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: c.textMuted, marginBottom: 6 }}>쉬는 시간</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                              <TouchableOpacity
                                style={{ backgroundColor: c.surfaceAlt, borderRadius: 10, width: 42, height: 36, alignItems: 'center', justifyContent: 'center' }}
                                onPress={() => updateExercise(ex.id, { restSeconds: Math.max(0, (ex.restSeconds ?? 60) - 10) })}>
                                <Text style={{ fontSize: 13, fontWeight: '800', color: c.textSecondary }}>-10</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={{ flex: 1, backgroundColor: c.surfaceAlt, borderRadius: 10, height: 36, alignItems: 'center', justifyContent: 'center' }}
                                onPress={() => openPad(String(ex.restSeconds ?? 60), false, '초', v => { const n = parseInt(v); if (!isNaN(n) && n >= 0) updateExercise(ex.id, { restSeconds: n }); })}>
                                <Text style={{ fontSize: 14, fontWeight: '700', color: c.textPrimary }}>{ex.restSeconds ?? 60}</Text>
                              </TouchableOpacity>
                              <Text style={{ fontSize: 12, color: c.textSecondary, fontWeight: '700' }}>초</Text>
                              <TouchableOpacity
                                style={{ backgroundColor: c.primary + '18', borderRadius: 10, width: 42, height: 36, alignItems: 'center', justifyContent: 'center' }}
                                onPress={() => updateExercise(ex.id, { restSeconds: (ex.restSeconds ?? 60) + 10 })}>
                                <Text style={{ fontSize: 13, fontWeight: '800', color: c.success }}>+10</Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* 운동 팁 */}
                          <View>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: c.textMuted, marginBottom: 6 }}>운동 팁</Text>
                            <TextInput
                              style={{ backgroundColor: c.surfaceAlt, borderRadius: 12, padding: 10, fontSize: 13, color: c.textPrimary, minHeight: 60 }}
                              value={ex.tip ?? ''}
                              onChangeText={v => updateExercise(ex.id, { tip: v })}
                              placeholder="예: 무릎이 발끝을 넘지 않게"
                              placeholderTextColor={c.textMuted}
                              multiline
                              numberOfLines={3}
                              textAlignVertical="top"
                            />
                          </View>
                        </View>
                      )}
                    </Card>
                    </View>
                  );
                  }}
                />
              )}
            </>
          )}
        </ScrollView>
        </KeyboardAvoidingView>
      ) : (
        <ScrollView
          ref={historyScrollRef}
          keyboardShouldPersistTaps="handled"
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

          {selectedDate && (
            <>
              <Text className="text-[15px] font-bold text-text-primary mb-3">
                {formatSelectedDate(selectedDate)}
              </Text>
              {selectedSessions.length === 0 ? (
                <Card className="items-center gap-2">
                  <Icon name="person" size={36} color={c.textMuted} />
                  <Text className="text-sm text-text-muted">
                    운동 기록이 없어요
                  </Text>
                </Card>
              ) : (
                selectedSessions.map((session) => (
                  <HistoryCard
                    key={session.id}
                    session={session}
                    getVolume={getTotalVolume}
                    allSessions={sessions}
                    onDelete={deleteSession}
                    onUpdate={(exercises) => updateSession(session.id, exercises)}
                    onExerciseDragStart={() => historyScrollRef.current?.setNativeProps?.({ scrollEnabled: false })}
                    onExerciseDragRelease={() => historyScrollRef.current?.setNativeProps?.({ scrollEnabled: true })}
                  />
                ))
              )}
            </>
          )}

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
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }}
          activeOpacity={1}
          onPress={() => setShowRoutineSheet(false)}
        />
        <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '75%', paddingBottom: 34 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: c.surfaceAlt }}>
            <Text style={{ flex: 1, fontSize: 17, fontWeight: '900', color: c.textPrimary }}>루틴에서 가져오기</Text>
            <TouchableOpacity onPress={() => setShowRoutineSheet(false)}>
              <Text style={{ fontSize: 20, color: c.textMuted, fontWeight: '700' }}>×</Text>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }} keyboardShouldPersistTaps="handled">
            {routines.map((routine) => {
              const isExpanded = expandedRoutineInSheet === routine.id;
              const currentNames = new Set(activeSession?.exercises.map(e => e.name) ?? []);
              return (
                <View key={routine.id} style={{ backgroundColor: c.surface, borderRadius: 20, overflow: 'hidden', marginBottom: 10 }}>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 }}
                    onPress={() => setExpandedRoutineInSheet(isExpanded ? null : routine.id)}
                    activeOpacity={0.8}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '900', color: c.textPrimary }}>{routine.name}</Text>
                      <Text style={{ fontSize: 11, color: c.textSecondary, marginTop: 2 }}>
                        {routine.exercises.length}종목
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={{ backgroundColor: c.warning, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 }}
                      onPress={() => {
                        let added = 0;
                        routine.exercises.forEach((re, i) => {
                          if (currentNames.has(re.name)) return;
                          const exId = `${Date.now()}-${i}`;
                          addExercise({ id: exId, name: re.name, category: re.category, settings: re.settings, tip: re.tip, isSingleArm: false, differentSides: false, targetMuscles: re.targetMuscles, restSeconds: re.restSeconds, targetReps: re.targetReps });
                          for (let s = 0; s < (re.defaultSets || 3); s++) {
                            addSet(exId, { id: `${exId}-${s}`, weight: re.defaultWeight ?? 0, reps: 0, completed: false });
                          }
                          setAddedFromRoutine(prev => new Set([...prev, re.name]));
                          added++;
                        });
                        if (added === 0) Alert.alert('알림', '이미 모든 종목이 추가되어 있어요');
                        else { setShowRoutineSheet(false); }
                      }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: c.onAccent }}>전체 추가</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 12, color: c.textMuted, fontWeight: '700' }}>{isExpanded ? '▲' : '▼'}</Text>
                  </TouchableOpacity>
                  {isExpanded && (
                    <View style={{ borderTopWidth: 1, borderTopColor: c.surfaceAlt }}>
                      {routine.exercises.map((re, i) => {
                        const alreadyIn = currentNames.has(re.name) || addedFromRoutine.has(re.name);
                        return (
                          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: i < routine.exercises.length - 1 ? 1 : 0, borderBottomColor: c.surfaceAlt }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 13, fontWeight: '700', color: c.textPrimary }}>{re.name}</Text>
                              <Text style={{ fontSize: 10, color: c.textSecondary, marginTop: 1 }}>
                                {re.defaultSets}세트 {re.targetReps ? `· ${re.targetReps}` : ''} {re.defaultWeight ? `· ${re.defaultWeight}kg` : ''}
                              </Text>
                            </View>
                            {alreadyIn ? (
                              <View style={{ backgroundColor: c.surfaceAlt, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: c.success }}>추가됨</Text>
                              </View>
                            ) : (
                              <TouchableOpacity
                                style={{ backgroundColor: c.surfaceAlt, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}
                                onPress={() => {
                                  const exId = `${Date.now()}-${i}`;
                                  addExercise({ id: exId, name: re.name, category: re.category, settings: re.settings, tip: re.tip, isSingleArm: false, differentSides: false, targetMuscles: re.targetMuscles, restSeconds: re.restSeconds, targetReps: re.targetReps });
                                  for (let s = 0; s < (re.defaultSets || 3); s++) {
                                    addSet(exId, { id: `${exId}-${s}`, weight: re.defaultWeight ?? 0, reps: 0, completed: false });
                                  }
                                  setAddedFromRoutine(prev => new Set([...prev, re.name]));
                                }}>
                                <Text style={{ fontSize: 11, fontWeight: '800', color: c.success }}>+ 추가</Text>
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

      <NumberPad
        visible={padConfig !== null}
        value={padConfig?.value ?? '0'}
        decimal={padConfig?.decimal ?? true}
        suffix={padConfig?.suffix}
        onConfirm={v => { padConfig?.onConfirm(v); setPadConfig(null); }}
        onCancel={() => setPadConfig(null)}
      />
    </View>
  );
}

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
        fontSize: 10,
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
  const curMaxWeight =
    ex.sets.length > 0 ? Math.max(...ex.sets.map((st) => st.weight)) : 0;
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
                backgroundColor: c.primary + '20',
                borderRadius: 999,
                paddingHorizontal: 7,
                paddingVertical: 3,
              }}>
              <Text
                style={{ fontSize: 10, fontWeight: "700", color: c.success }}>
                한팔
              </Text>
            </View>
          )}
          {isSessionPR && (
            <Animated.View style={{ transform: [{ scale: prScale }] }}>
              <View
                style={{
                  backgroundColor: c.stats + '20',
                  borderRadius: 999,
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 3,
                }}>
                <Icon name="trophy" size={11} color={c.stats} />
                <Text
                  style={{ fontSize: 11, fontWeight: "800", color: c.stats }}>
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

      {allPrevMax != null && curMaxWeight > 0 && (
        <Animated.View style={{ marginBottom: 10, gap: 4, opacity: compOp }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text
              style={{
                fontSize: 9,
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
                fontSize: 10,
                color: c.textMuted,
                fontWeight: "600",
                width: 38,
              }}>
              {allPrevMax}kg
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text
              style={{
                fontSize: 9,
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
                fontSize: 10,
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
        <Animated.View style={{ opacity: growthOp, marginBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Icon name="dumbbell" size={12} color={c.success} />
          <Text style={{ fontSize: 12, fontWeight: "800", color: c.success }}>
            +{delta}kg 성장했어요!
          </Text>
        </Animated.View>
      )}
      {delta != null && delta < 0 && (
        <Text
          style={{
            fontSize: 11,
            fontWeight: "600",
            color: c.danger,
            marginBottom: 4,
          }}>
          ↓ {Math.abs(delta)}kg
        </Text>
      )}

      <View className="gap-1 mb-2">
        {ex.sets.map((st, i) => {
          const vol = ex.isSingleArm
            ? ex.differentSides && st.weightR != null
              ? (st.weight + st.weightR) * st.reps
              : st.weight * st.reps * 2
            : st.weight * st.reps;
          return (
            <View key={st.id} className="flex-row items-center">
              <Text className="text-xs font-semibold text-text-muted w-10">
                {i + 1}세트
              </Text>
              <Text className="text-sm font-semibold text-text-primary flex-1">
                {ex.isSingleArm && ex.differentSides && st.weightR != null
                  ? `L${st.weight}/R${st.weightR}kg`
                  : `${st.weight}kg`}
                {ex.isSingleArm ? "(한팔)" : ""} × {st.reps}회
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

type DraftSet = { id: string; weight: string; reps: string; completed: boolean };
type DraftExercise = Omit<WorkoutSession['exercises'][0], 'sets'> & { sets: DraftSet[] };

function HistoryCard({
  session,
  getVolume,
  allSessions,
  onDelete,
  onUpdate,
  onExerciseDragStart,
  onExerciseDragRelease,
}: {
  session: WorkoutSession;
  getVolume: (s: WorkoutSession) => number;
  allSessions: WorkoutSession[];
  onDelete: (id: string) => void;
  onUpdate: (exercises: WorkoutSession['exercises']) => Promise<void>;
  onExerciseDragStart?: () => void;
  onExerciseDragRelease?: () => void;
}) {
  const c = useColors();
  const [expanded, setExpanded] = useState(false);
  const [exExpanded, setExExpanded] = useState<Record<string, boolean>>({});
  const [orderedExercises, setOrderedExercises] = useState(session.exercises);
  const [editMode, setEditMode] = useState(false);
  const skipNextSync = useRef(false);

  useEffect(() => {
    if (skipNextSync.current) { skipNextSync.current = false; return; }
    setOrderedExercises(session.exercises);
  }, [session.exercises]);
  const [saving, setSaving] = useState(false);
  const [draftExercises, setDraftExercises] = useState<DraftExercise[]>([]);
  type HistoryPadConfig = { value: string; decimal: boolean; suffix: string; onConfirm: (v: string) => void };
  const [historyPadConfig, setHistoryPadConfig] = useState<HistoryPadConfig | null>(null);
  const openPad = (value: string, decimal: boolean, suffix: string, onConfirm: (v: string) => void) =>
    setHistoryPadConfig({ value, decimal, suffix, onConfirm });
  const volume = getVolume(session);

  const durationText = (() => {
    const m = session.durationMinutes ?? 0;
    if (m <= 0) return null;
    const h = Math.floor(m / 60);
    const rem = m % 60;
    if (h > 0) return `${h}시간${rem > 0 ? ` ${rem}분` : ''}`;
    return `${m}분`;
  })();

  const bodyParts = [...new Set(session.exercises.map(ex => ex.category).filter(Boolean))];

  const enterHistoryEdit = () => {
    setDraftExercises(session.exercises.map(ex => ({
      ...ex,
      sets: ex.sets.map(s => ({
        id: s.id,
        weight: String(s.weight),
        reps: String(s.reps),
        completed: s.completed,
      })),
    })));
    setEditMode(true);
    setExpanded(true);
  };

  const updateDraftSet = (exIdx: number, setIdx: number, data: Partial<DraftSet>) => {
    setDraftExercises(prev => prev.map((ex, ei) =>
      ei !== exIdx ? ex : {...ex, sets: ex.sets.map((s, si) => si !== setIdx ? s : {...s, ...data})}
    ));
  };

  const removeDraftSet = (exIdx: number, setIdx: number) => {
    setDraftExercises(prev => prev.map((ex, ei) =>
      ei !== exIdx ? ex : {...ex, sets: ex.sets.filter((_, si) => si !== setIdx)}
    ));
  };

  const addDraftSet = (exIdx: number) => {
    setDraftExercises(prev => prev.map((ex, ei) => {
      if (ei !== exIdx) return ex;
      const last = ex.sets[ex.sets.length - 1];
      return {...ex, sets: [...ex.sets, {id: `draft-${Date.now()}`, weight: last?.weight ?? '0', reps: last?.reps ?? '0', completed: false}]};
    }));
  };

  const removeDraftExercise = (exIdx: number) => {
    setDraftExercises(prev => prev.filter((_, i) => i !== exIdx));
  };

  const updateDraftExName = (exIdx: number, name: string) => {
    setDraftExercises(prev => prev.map((ex, i) => i !== exIdx ? ex : {...ex, name}));
  };

  const addDraftExercise = () => {
    setDraftExercises(prev => [...prev, {
      id: `new-ex-${Date.now()}`,
      name: '',
      category: '',
      sets: [{id: `new-set-${Date.now()}`, weight: '0', reps: '0', completed: false}],
      settings: [],
      tip: '',
      isSingleArm: false,
      differentSides: false,
    }]);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const exercises: WorkoutSession['exercises'] = draftExercises.map(ex => ({
        ...ex,
        sets: ex.sets.map(s => ({
          ...s,
          weight: parseFloat(s.weight) || 0,
          reps: parseInt(s.reps) || 0,
        })),
      }));
      skipNextSync.current = true;
      await onUpdate(exercises);
      setEditMode(false);
    } catch {
      Alert.alert('오류', '저장에 실패했어요');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert("운동 기록 삭제", "이 기록을 삭제할까요?", [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: () => onDelete(session.id) },
    ]);
  };

  const getExMaxWeight = (ex: WorkoutSession['exercises'][0]) =>
    ex.sets.length > 0 ? Math.max(...ex.sets.map(s => s.weight)) : 0;

  const getExVolume = (ex: WorkoutSession['exercises'][0]) =>
    ex.sets.reduce((sum, s) => sum + s.weight * s.reps * (ex.isSingleArm ? 2 : 1), 0);

  const getPrevSessionInfo = (exName: string): { maxWeight: number; date: string } | null => {
    let best: { maxWeight: number; date: string } | null = null;
    for (const s of allSessions) {
      if (s.date >= session.date) continue;
      const match = s.exercises.find(e => e.name === exName);
      if (!match) continue;
      const mx = match.sets.length > 0 ? Math.max(...match.sets.map(st => st.weight)) : 0;
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
        match.sets.forEach((st) => {
          if (st.weight > max) max = st.weight;
        });
    }
    return max > 0 ? max : null;
  };

  const getAllTimePR = (exName: string): number => {
    let max = 0;
    for (const s of allSessions) {
      const match = s.exercises.find((e) => e.name === exName);
      if (match)
        match.sets.forEach((st) => {
          if (st.weight > max) max = st.weight;
        });
    }
    return max;
  };

  return (
    <>
    <Card bare className="overflow-hidden mb-3">
      {/* ── 세션 요약 (항상 표시) ── */}
      <TouchableOpacity
        onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setExpanded(v => !v); }}
        activeOpacity={0.8}
        style={{ padding: 16 }}>
        {/* 통계 행 */}
        <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginBottom: 8 }}>
          {durationText && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Icon name="timer" size={12} color={c.textPrimary} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: c.textPrimary }}>{durationText}</Text>
            </View>
          )}
          {!!session.caloriesBurned && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <FlameIcon size={12} color={c.danger} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: c.danger }}>{session.caloriesBurned}kcal</Text>
            </View>
          )}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
            <Icon name="dumbbell" size={12} color={c.success} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: c.success }}>{volume.toLocaleString()}kg</Text>
          </View>
          <Text style={{ fontSize: 11, fontWeight: '600', color: c.textMuted, marginLeft: 'auto' as any }}>
            {session.exercises.length}종목 {expanded ? '▲' : '▼'}
          </Text>
        </View>
        {/* 종목 이름 목록 */}
        <Text style={{ fontSize: 13, fontWeight: '600', color: c.textSecondary, lineHeight: 20 }}>
          {session.exercises.slice(0, 4).map(ex => ex.name).join(' · ')}
          {session.exercises.length > 4 ? ` +${session.exercises.length - 4}` : ''}
        </Text>
        {/* 부위 태그 */}
        {bodyParts.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 }}>
            {bodyParts.map(bp => (
              <View key={bp} style={{ backgroundColor: c.surfaceAlt, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: c.success }}>{bp}</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>

      {/* 수정 / 삭제 버튼 */}
      <View style={{ flexDirection: 'row', borderTopWidth: 1, borderTopColor: c.surfaceAlt }}>
        <TouchableOpacity
          onPress={() => { if (editMode) { setEditMode(false); } else { enterHistoryEdit(); setExpanded(true); } }}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, borderRightWidth: 1, borderRightColor: c.surfaceAlt }}>
          <Icon name={editMode ? 'close' : 'pencil'} size={13} color={editMode ? c.danger : c.primary} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: editMode ? c.danger : c.primary }}>
            {editMode ? '취소' : '수정'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleDelete}
          style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingVertical: 10, backgroundColor: c.danger + '0A' }}>
          <Icon name="trash" size={13} color={c.danger} />
          <Text style={{ fontSize: 13, fontWeight: '700', color: c.danger }}>삭제</Text>
        </TouchableOpacity>
      </View>

      {/* ── L1 펼친 상태 ── */}
      {expanded && (
        editMode ? (
          <View style={{ paddingHorizontal: 18, paddingBottom: 8 }}>
            {draftExercises.map((ex, exIdx) => (
              <View key={ex.id} style={{ paddingVertical: 12, borderTopWidth: exIdx > 0 ? 1 : 0, borderTopColor: c.surfaceAlt }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 8 }}>
                  <TextInput
                    style={{ flex: 1, fontSize: 15, fontWeight: '800', color: c.textPrimary, backgroundColor: c.surfaceAlt, borderRadius: 10, paddingHorizontal: 10, height: 36 }}
                    value={ex.name}
                    onChangeText={v => updateDraftExName(exIdx, v)}
                    placeholder="종목명"
                    placeholderTextColor={c.textMuted}
                  />
                  <TouchableOpacity onPress={() => removeDraftExercise(exIdx)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Icon name="trash" size={16} color={c.danger} />
                  </TouchableOpacity>
                </View>
                {ex.sets.map((ds, setIdx) => (
                  <View key={ds.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 }}>
                    <TouchableOpacity
                      style={{ width: 26, height: 26, borderRadius: 999, backgroundColor: ds.completed ? c.primary : c.surfaceAlt, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                      onPress={() => updateDraftSet(exIdx, setIdx, { completed: !ds.completed })}>
                      {ds.completed
                        ? <Icon name="check" size={12} color={c.surface} />
                        : <Text style={{ fontSize: 11, fontWeight: '800', color: c.textSecondary }}>{setIdx + 1}</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: c.surfaceAlt, borderRadius: 10, height: 36, alignItems: 'center', justifyContent: 'center' }}
                      onPress={() => openPad(ds.weight, true, 'kg', v => updateDraftSet(exIdx, setIdx, { weight: v }))}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: ds.weight ? c.textPrimary : c.textMuted }}>{ds.weight || '0'}</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 11, color: c.textSecondary, fontWeight: '600' }}>kg×</Text>
                    <TouchableOpacity
                      style={{ flex: 1, backgroundColor: c.surfaceAlt, borderRadius: 10, height: 36, alignItems: 'center', justifyContent: 'center' }}
                      onPress={() => openPad(ds.reps, false, '회', v => updateDraftSet(exIdx, setIdx, { reps: v }))}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: ds.reps ? c.textPrimary : c.textMuted }}>{ds.reps || '0'}</Text>
                    </TouchableOpacity>
                    <Text style={{ fontSize: 11, color: c.textSecondary, fontWeight: '600' }}>회</Text>
                    <TouchableOpacity onPress={() => removeDraftSet(exIdx, setIdx)}>
                      <Icon name="trash" size={14} color={c.textMuted} />
                    </TouchableOpacity>
                  </View>
                ))}
                <TouchableOpacity
                  style={{ alignItems: 'center', paddingVertical: 7, borderRadius: 12, backgroundColor: c.primary + '18', marginBottom: 2 }}
                  onPress={() => addDraftSet(exIdx)}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: c.success }}>+ 세트 추가</Text>
                </TouchableOpacity>
              </View>
            ))}
            <TouchableOpacity
              style={{ alignItems: 'center', paddingVertical: 9, borderRadius: 12, borderWidth: 1.5, borderColor: c.primary, marginBottom: 4 }}
              onPress={addDraftExercise}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: c.success }}>+ 종목 추가</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={{ alignItems: 'center', paddingVertical: 12, borderRadius: 16, backgroundColor: c.primary, marginVertical: 8 }}
              onPress={handleSaveEdit}
              disabled={saving}>
              {saving ? <ActivityIndicator size="small" color={c.surface} /> : <Text style={{ fontSize: 14, fontWeight: '800', color: c.onAccent }}>저장하기</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View>
            <SortableList
              data={orderedExercises}
              keyExtractor={(ex) => ex.id}
              itemHeight={64}
              onDragStart={() => { setExExpanded({}); onExerciseDragStart?.(); }}
              onDragRelease={() => { onExerciseDragRelease?.(); }}
              onDragEnd={(reordered) => {
                skipNextSync.current = true;
                setOrderedExercises(reordered);
                onUpdate(reordered);
              }}
              renderItem={(ex, _idx, isActive) => {
                const maxW = getExMaxWeight(ex);
                const exVol = getExVolume(ex);
                const allTimePR = getAllTimePR(ex.name);
                const isPR = maxW > 0 && maxW >= allTimePR && allTimePR > 0;
                const prevInfo = getPrevSessionInfo(ex.name);
                const isOpen = exExpanded[ex.id] ?? false;

                return (
                <View style={{ borderTopWidth: 1, borderTopColor: c.surfaceAlt }}>
                  {/* L1 종목 요약 행 */}
                  <TouchableOpacity
                    onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setExExpanded(prev => ({ ...prev, [ex.id]: !prev[ex.id] })); }}
                    activeOpacity={0.8}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 11, gap: 8 }}>
                    <Text style={{ fontSize: 14, color: c.textMuted, fontWeight: '700', marginRight: 4, opacity: isActive ? 1 : 0.35 }}>≡</Text>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: c.textPrimary }}>{ex.name}</Text>
                        {isPR && (
                          <View style={{ backgroundColor: c.stats + '20', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <Icon name="trophy" size={9} color={c.stats} />
                            <Text style={{ fontSize: 10, fontWeight: '800', color: c.stats }}>PR</Text>
                          </View>
                        )}
                        <View style={{ backgroundColor: c.surfaceAlt, borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: c.success }}>{ex.category}</Text>
                        </View>
                      </View>
                      <Text style={{ fontSize: 11, color: c.textSecondary, fontWeight: '600', marginTop: 2 }}>
                        {maxW > 0 ? `최고 ${maxW}kg · ` : ''}{ex.sets.length}세트 · {exVol.toLocaleString()}kg
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: c.textMuted, fontWeight: '700' }}>{isOpen ? '▲' : '▼'}</Text>
                  </TouchableOpacity>

                  {/* L2 종목 상세 */}
                  {isOpen && (
                    <View style={{ backgroundColor: c.surface, paddingHorizontal: 16, paddingBottom: 14 }}>
                      {/* 목표 횟수 · 쉬는시간 */}
                      {(ex.targetReps?.trim() || (ex.restSeconds && ex.restSeconds > 0)) && (
                        <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8 }}>
                          {ex.targetReps?.trim() ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Icon name="target" size={12} color={c.textSecondary} />
                              <Text style={{ fontSize: 12, color: c.textSecondary, fontWeight: '600' }}>목표 {ex.targetReps}</Text>
                            </View>
                          ) : null}
                          {ex.restSeconds && ex.restSeconds > 0 ? (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Icon name="timer" size={12} color={c.textSecondary} />
                              <Text style={{ fontSize: 12, color: c.textSecondary, fontWeight: '600' }}>쉬는시간 {fmtRestSeconds(ex.restSeconds)}</Text>
                            </View>
                          ) : null}
                        </View>
                      )}

                      {/* 기구 설정 태그 */}
                      {ex.settings && ex.settings.length > 0 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                          {ex.settings.map((st, i) => (
                            <View key={i} style={{ backgroundColor: c.surfaceAlt, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
                              <Text style={{ fontSize: 11, fontWeight: '700', color: c.success }}>{st.key}: {st.value}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* 세트 테이블 헤더 */}
                      <View style={{ flexDirection: 'row', paddingBottom: 6, marginBottom: 2, borderBottomWidth: 1, borderBottomColor: c.surfaceAlt }}>
                        {['세트', '무게(kg)', '횟수', '볼륨'].map(h => (
                          <Text key={h} style={{ flex: h === '세트' ? 0.6 : 1, fontSize: 10, fontWeight: '800', color: c.textMuted, textAlign: 'center' }}>{h}</Text>
                        ))}
                      </View>

                      {/* 세트 행들 */}
                      {ex.sets.map((st, si) => {
                        const vol = ex.isSingleArm
                          ? (ex.differentSides && st.weightR != null ? (st.weight + st.weightR) * st.reps : st.weight * st.reps * 2)
                          : st.weight * st.reps;
                        return (
                          <View key={st.id} style={{ flexDirection: 'row', paddingVertical: 5 }}>
                            <Text style={{ flex: 0.6, fontSize: 12, textAlign: 'center', color: c.textMuted, fontWeight: '700' }}>{si + 1}</Text>
                            <Text style={{ flex: 1, fontSize: 13, textAlign: 'center', fontWeight: '700', color: c.textPrimary }}>
                              {ex.isSingleArm && ex.differentSides && st.weightR != null ? `${st.weight}/${st.weightR}` : st.weight}
                            </Text>
                            <Text style={{ flex: 1, fontSize: 13, textAlign: 'center', fontWeight: '700', color: c.textPrimary }}>{st.reps}</Text>
                            <Text style={{ flex: 1, fontSize: 13, textAlign: 'center', fontWeight: '600', color: c.textSecondary }}>{vol}</Text>
                          </View>
                        );
                      })}

                      {/* 종목 합계 */}
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.surfaceAlt }}>
                        {maxW > 0 && <Text style={{ fontSize: 12, fontWeight: '700', color: c.textPrimary }}>최고 {maxW}kg</Text>}
                        <Text style={{ fontSize: 12, fontWeight: '700', color: c.textPrimary }}>총 {ex.sets.length}세트</Text>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: c.success }}>볼륨 {exVol.toLocaleString()}kg</Text>
                      </View>

                      {/* 이전 대비 */}
                      {prevInfo && maxW > 0 && (() => {
                        const diff = maxW - prevInfo.maxWeight;
                        const color = diff > 0 ? c.success : diff < 0 ? c.danger : c.textSecondary;
                        const label = diff > 0 ? `+${diff}kg ↑` : diff < 0 ? `${diff}kg ↓` : '변동없음';
                        return (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color }}>이전 대비 {label}</Text>
                            <Text style={{ fontSize: 10, color: c.textMuted }}>({fmtDate(prevInfo.date)})</Text>
                          </View>
                        );
                      })()}

                      {/* 운동 팁 */}
                      {!!ex.tip && (
                        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 5, marginTop: 8, backgroundColor: c.stats + '18', borderRadius: 10, padding: 10 }}>
                          <Icon name="bulb" size={12} color={c.stats} />
                          <Text style={{ fontSize: 12, color: c.textSecondary, flex: 1, lineHeight: 18 }}>{ex.tip}</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
                );
              }}
            />

            {/* 세션 합계 */}
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 16, padding: 14, borderTopWidth: 1, borderTopColor: c.surfaceAlt }}>
              {!!session.caloriesBurned && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <FlameIcon size={12} color={c.danger} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: c.danger }}>{session.caloriesBurned}kcal</Text>
                </View>
              )}
              <Text style={{ fontSize: 15, fontWeight: '800', color: c.success }}>총 {volume.toLocaleString()}kg</Text>
            </View>
          </View>
        )
      )}
    </Card>
    <NumberPad
      visible={historyPadConfig !== null}
      value={historyPadConfig?.value ?? '0'}
      decimal={historyPadConfig?.decimal ?? true}
      suffix={historyPadConfig?.suffix}
      onConfirm={v => { historyPadConfig?.onConfirm(v); setHistoryPadConfig(null); }}
      onCancel={() => setHistoryPadConfig(null)}
    />
    </>
  );
}
