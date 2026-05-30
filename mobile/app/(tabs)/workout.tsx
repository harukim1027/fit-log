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
} from "react-native";
import { useRouter } from "expo-router";
import { Header, Card } from "../../components/ui";
import { useEffect, useState, useMemo } from "react";
import { Icon, PlayIcon, FlameIcon } from "../../components/AppIcons";
import { useRoutineStore, Routine } from "../../store/routineStore";
import { Calendar } from "react-native-calendars";
import { useWorkoutStore, calculateCaloriesBurned, CompareMode } from "../../store/workoutStore";
import { useAuthStore } from "../../store/authStore";
import RestTimer from "../../components/RestTimer";
import WorkoutCompleteOverlay from "../../components/WorkoutCompleteOverlay";
import { WorkoutSession } from "../../types/workout";

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

type Tab = "today" | "history";

const SHADOW = {
  shadowColor: "#4EBFA0",
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.20,
  shadowRadius: 24,
  elevation: 4,
};
const SHADOW_SM = {
  shadowColor: "#4EBFA0",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.16,
  shadowRadius: 14,
  elevation: 3,
};

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

const CAL_THEME = {
  backgroundColor: '#EFFAF4',
  calendarBackground: '#FFFFFF',
  textSectionTitleColor: '#7E9A90',
  selectedDayBackgroundColor: '#6FD3B6',
  selectedDayTextColor: "#fff",
  todayTextColor: '#2E9E83',
  todayBackgroundColor: '#6FD3B6' + "18",
  dayTextColor: '#34514A',
  textDisabledColor: '#B4CFC5',
  dotColor: '#FF9DB0',
  selectedDotColor: "#fff",
  arrowColor: '#6FD3B6',
  monthTextColor: '#34514A',
  textDayFontWeight: "600" as const,
  textMonthFontWeight: "800" as const,
  textDayHeaderFontWeight: "600" as const,
  textDayFontSize: 14,
  textMonthFontSize: 16,
  textDayHeaderFontSize: 12,
};

const todayStr = () => new Date().toISOString().split('T')[0];

const COMPARE_MODES: { mode: CompareMode; label: string }[] = [
  { mode: 'recent', label: '최근 1회' },
  { mode: 'pr',     label: '최고기록' },
  { mode: 'week',   label: '1주전' },
  { mode: 'month',  label: '1달전' },
];

const fmtDate = (iso: string) => iso.replace(/-/g, '.');

export default function WorkoutScreen() {
  const router = useRouter();
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
  } = useWorkoutStore();
  const { user } = useAuthStore();
  const {
    routines, publicRoutines, loaded: routinesLoaded,
    loadRoutines, deleteRoutine, shareRoutine, unshareRoutine,
    fetchPublicRoutines, copyRoutine, searchByCode,
  } = useRoutineStore();
  const [tab, setTab] = useState<Tab>("today");
  const [compareModes, setCompareModes] = useState<Record<string, CompareMode>>({});
  const [completeCalories, setCompleteCalories] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    new Date().toISOString().substring(0, 7)
  );
  const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
  const [editExName, setEditExName] = useState('');
  const [communityExpanded, setCommunityExpanded] = useState(false);
  const [communitySort, setCommunitySort] = useState<'latest' | 'popular'>('latest');
  const [codeInput, setCodeInput] = useState('');
  const [codeResult, setCodeResult] = useState<import('../../store/routineStore').Routine | null>(null);
  const [codeSearching, setCodeSearching] = useState(false);
  const [copyingId, setCopyingId] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
    loadRoutines();
  }, []);

  useEffect(() => {
    if (communityExpanded) fetchPublicRoutines(communitySort).catch(() => {});
  }, [communityExpanded, communitySort]);

  const handleShareToggle = (routine: import('../../store/routineStore').Routine) => {
    if (routine.isPublic && routine.shareCode) {
      Alert.alert(
        '공유 중',
        `공유 코드: ${routine.shareCode}`,
        [
          { text: '비공개로 변경', style: 'destructive', onPress: () => unshareRoutine(routine.id).catch(() => Alert.alert('오류', '변경에 실패했어요')) },
          { text: '닫기', style: 'cancel' },
        ],
      );
    } else {
      Alert.alert('루틴 공개', '이 루틴을 다른 사람과 공유할까요?\n공유 코드가 생성돼요.', [
        { text: '취소', style: 'cancel' },
        { text: '공개하기', onPress: () => shareRoutine(routine.id).catch(() => Alert.alert('오류', '공유 설정에 실패했어요')) },
      ]);
    }
  };

  const handleCopy = async (id: string) => {
    setCopyingId(id);
    try {
      await copyRoutine(id);
      Alert.alert('완료', '내 루틴으로 가져왔어요!');
    } catch {
      Alert.alert('오류', '가져오기에 실패했어요');
    } finally {
      setCopyingId(null);
    }
  };

  const handleCodeSearch = async () => {
    if (codeInput.trim().length !== 6) return Alert.alert('코드 오류', '6자리 코드를 입력해주세요');
    setCodeSearching(true);
    setCodeResult(null);
    try {
      const result = await searchByCode(codeInput);
      setCodeResult(result);
    } catch {
      Alert.alert('루틴을 찾을 수 없어요', '코드를 다시 확인해주세요');
    } finally {
      setCodeSearching(false);
    }
  };

  useEffect(() => {
    if (!activeSession?.exercises.length) return;
    activeSession.exercises.forEach(ex => {
      const mode = compareModes[ex.name] ?? 'recent';
      const key = `${ex.name}:${mode}`;
      const data = exerciseHistoryCache.get(key);
      console.log(
        `[ExHistory] ${key}:`,
        data
          ? `comparisonSession=${JSON.stringify(data.comparisonSession)}`
          : '캐시없음 (로딩중)'
      );
    });
  }, [exerciseHistoryCache, activeSession?.exercises?.length]);

  const handleEnd = () => {
    const weightKg = user?.weight ?? 70;
    const durationMinutes = sessionStartTime
      ? Math.max(Math.round((Date.now() - sessionStartTime) / 60000), 1)
      : 30;
    const calories = activeSession
      ? calculateCaloriesBurned(activeSession, weightKg, durationMinutes)
      : 0;

    Alert.alert("운동 종료", "오늘 운동을 저장하고 종료할까요?", [
      { text: "취소", style: "cancel" },
      {
        text: "저장 및 종료",
        onPress: async () => {
          await endSession(calories);
          setCompleteCalories(calories);
        },
      },
    ]);
  };

  const markedDates = useMemo(() => {
    const result: Record<string, any> = {};
    sessions.forEach((s) => {
      const key = SESSION_DATE_KEY(s);
      result[key] = { marked: true, dotColor: '#FF9DB0' };
    });
    if (selectedDate) {
      result[selectedDate] = {
        ...(result[selectedDate] ?? {}),
        selected: true,
        selectedColor: '#6FD3B6',
        dotColor: result[selectedDate]?.marked ? "#fff" : '#FF9DB0',
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
    () => selectedDate ? sessions.filter((s) => SESSION_DATE_KEY(s) === selectedDate) : [],
    [sessions, selectedDate]
  );

  if (isLoading) {
    return (
      <View className="flex-1 bg-background items-center justify-center">
        <ActivityIndicator size="large" color="#2E9E83" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Header title="운동" />

      {/* 세그먼트 탭 (알약) */}
      <View style={{ flexDirection: 'row', backgroundColor: '#E7F7F0', borderRadius: 999, padding: 4, marginHorizontal: 18, marginBottom: 14, gap: 4 }}>
        {(["today", "history"] as Tab[]).map((t) => {
          const isActive = tab === t;
          return (
            <TouchableOpacity
              key={t}
              style={[{ flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 999 }, isActive ? { backgroundColor: '#fff', ...SHADOW_SM } : undefined]}
              onPress={() => setTab(t)}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: isActive ? '#2E9E83' : '#B4CFC5' }}>
                {t === "today" ? "오늘 운동" : "히스토리"}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {tab === "today" ? (
        <ScrollView
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          {!activeSession ? (
            <>
              {/* 상단: 제목 + 운동 시작 버튼 */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: '#34514A' }}>내 루틴</Text>
                <TouchableOpacity
                  style={[{ backgroundColor: '#FFAE96', borderRadius: 999, paddingHorizontal: 18, paddingVertical: 9 }, SHADOW_SM]}
                  onPress={startSession}
                  activeOpacity={0.8}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>운동 시작</Text>
                </TouchableOpacity>
              </View>

              {routines.length === 0 ? (
                /* 빈 상태 온보딩 UI */
                <View style={{ alignItems: 'center', paddingTop: 40, paddingBottom: 20, gap: 8 }}>
                  <Text style={{ fontSize: 28 }}>🏋️</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: '#34514A', marginTop: 4 }}>아직 루틴이 없어요</Text>
                  <Text style={{ fontSize: 14, color: '#7E9A90', textAlign: 'center', lineHeight: 22 }}>
                    루틴을 만들면 매번 운동을{'\n'}빠르게 시작할 수 있어요
                  </Text>
                  <TouchableOpacity
                    style={[{ backgroundColor: '#6FD3B6', borderRadius: 999, paddingHorizontal: 32, paddingVertical: 14, marginTop: 8 }, SHADOW]}
                    onPress={() => router.push('/modal/routine-manage' as any)}
                    activeOpacity={0.8}>
                    <Text style={{ fontSize: 15, fontWeight: '800', color: '#fff' }}>루틴 만들기 +</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  {/* 루틴 카드 목록 */}
                  {routines.map(routine => (
                    <View key={routine.id} style={[{ backgroundColor: '#fff', borderRadius: 24, padding: 16, marginBottom: 10 }, SHADOW]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 17, fontWeight: '900', color: '#34514A' }}>{routine.name}</Text>
                          <Text style={{ fontSize: 12, color: '#7E9A90', fontWeight: '600', marginTop: 3 }}>
                            {routine.exercises.length}종목 · 예상 {routine.exercises.reduce((s, e) => s + e.defaultSets, 0) * 3}분
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <TouchableOpacity onPress={() => handleShareToggle(routine)}>
                            <Text style={{ fontSize: 16 }}>{routine.isPublic ? '🔓' : '🔒'}</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => router.push({ pathname: '/modal/routine-manage', params: { editId: routine.id } } as any)}>
                            <Icon name="pencil" size={17} color="#7E9A90" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => Alert.alert('루틴 삭제', `"${routine.name}"을 삭제할까요?`, [
                              { text: '취소', style: 'cancel' },
                              { text: '삭제', style: 'destructive', onPress: () => deleteRoutine(routine.id) },
                            ])}>
                            <Icon name="trash" size={17} color="#B4CFC5" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={{ backgroundColor: '#FFAE96', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 }}
                            onPress={() => startSessionWithRoutine(routine)}
                            activeOpacity={0.8}>
                            <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>시작</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {routine.exercises.slice(0, 5).map((ex, i) => (
                          <View key={i} style={{ backgroundColor: '#E7F7F0', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#2E9E83' }}>{ex.name}</Text>
                          </View>
                        ))}
                        {routine.exercises.length > 5 && (
                          <View style={{ backgroundColor: '#F0F0F0', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: '#B4CFC5' }}>+{routine.exercises.length - 5}</Text>
                          </View>
                        )}
                      </View>
                      {routine.isPublic && routine.shareCode && (
                        <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={{ backgroundColor: '#E7F7F0', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#2E9E83', letterSpacing: 2 }}>
                              🔓 {routine.shareCode}
                            </Text>
                          </View>
                          <Text style={{ fontSize: 11, color: '#7E9A90' }}>공유 중</Text>
                        </View>
                      )}
                    </View>
                  ))}

                  {/* 루틴 만들기 + */}
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 999, borderWidth: 1.5, borderColor: '#D6F0E6', marginTop: 4 }}
                    onPress={() => router.push('/modal/routine-manage' as any)}
                    activeOpacity={0.8}>
                    <Icon name="plus" size={16} color="#6FD3B6" />
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#7E9A90' }}>루틴 만들기 +</Text>
                  </TouchableOpacity>

                  {/* 커뮤니티 루틴 섹션 */}
                  <TouchableOpacity
                    style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 10 }}
                    onPress={() => setCommunityExpanded(v => !v)}
                    activeOpacity={0.8}>
                    <Text style={{ fontSize: 17, fontWeight: '900', color: '#34514A' }}>커뮤니티 루틴</Text>
                    <Text style={{ fontSize: 13, color: '#7E9A90', fontWeight: '700' }}>
                      {communityExpanded ? '접기 ▲' : '더 보기 ▼'}
                    </Text>
                  </TouchableOpacity>

                  {communityExpanded && (
                    <>
                      {/* 정렬 탭 */}
                      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                        {(['latest', 'popular'] as const).map(s => (
                          <TouchableOpacity
                            key={s}
                            style={{
                              paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999,
                              backgroundColor: communitySort === s ? '#6FD3B6' : '#E7F7F0',
                            }}
                            onPress={() => setCommunitySort(s)}>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: communitySort === s ? '#fff' : '#7E9A90' }}>
                              {s === 'latest' ? '최신순' : '인기순'}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>

                      {/* 코드 검색 */}
                      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, alignItems: 'center' }}>
                        <TextInput
                          style={{
                            flex: 1, backgroundColor: '#F5FBF8', borderRadius: 14,
                            paddingHorizontal: 14, paddingVertical: 10,
                            fontSize: 15, fontWeight: '800', color: '#34514A',
                            borderWidth: 1.5, borderColor: '#D6F0E6', letterSpacing: 2,
                          }}
                          placeholder="6자리 코드 입력"
                          placeholderTextColor="#B4CFC5"
                          value={codeInput}
                          onChangeText={t => { setCodeInput(t.toUpperCase()); setCodeResult(null); }}
                          maxLength={6}
                          autoCapitalize="characters"
                        />
                        <TouchableOpacity
                          style={{ backgroundColor: '#6FD3B6', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 10 }}
                          onPress={handleCodeSearch}
                          activeOpacity={0.8}>
                          {codeSearching
                            ? <ActivityIndicator size="small" color="#fff" />
                            : <Text style={{ fontSize: 13, fontWeight: '800', color: '#fff' }}>검색</Text>}
                        </TouchableOpacity>
                      </View>

                      {/* 코드 검색 결과 */}
                      {codeResult && (
                        <View style={[{ backgroundColor: '#fff', borderRadius: 20, padding: 14, marginBottom: 10, borderWidth: 2, borderColor: '#6FD3B6' }, SHADOW_SM]}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: 15, fontWeight: '900', color: '#34514A' }}>{codeResult.name}</Text>
                              <Text style={{ fontSize: 11, color: '#7E9A90', marginTop: 2 }}>by {codeResult.authorName ?? '익명'}</Text>
                            </View>
                            <TouchableOpacity
                              style={{ backgroundColor: '#FFAE96', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 7 }}
                              onPress={() => handleCopy(codeResult!.id)}
                              disabled={copyingId === codeResult.id}>
                              {copyingId === codeResult.id
                                ? <ActivityIndicator size="small" color="#fff" />
                                : <Text style={{ fontSize: 12, fontWeight: '800', color: '#fff' }}>가져오기</Text>}
                            </TouchableOpacity>
                          </View>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                            {codeResult.exercises.slice(0, 4).map((ex, i) => (
                              <View key={i} style={{ backgroundColor: '#E7F7F0', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
                                <Text style={{ fontSize: 11, fontWeight: '700', color: '#2E9E83' }}>{ex.name}</Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      {/* 커뮤니티 루틴 목록 */}
                      {publicRoutines.length === 0 ? (
                        <View style={{ alignItems: 'center', paddingVertical: 24 }}>
                          <Text style={{ fontSize: 13, color: '#B4CFC5', fontWeight: '600' }}>아직 공유된 루틴이 없어요</Text>
                        </View>
                      ) : (
                        publicRoutines.map(r => (
                          <View key={r.id} style={[{ backgroundColor: '#fff', borderRadius: 20, padding: 14, marginBottom: 10 }, SHADOW_SM]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                              <View style={{ flex: 1 }}>
                                <Text style={{ fontSize: 15, fontWeight: '900', color: '#34514A' }}>{r.name}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
                                  <Text style={{ fontSize: 11, color: '#7E9A90' }}>by {r.authorName ?? '익명'}</Text>
                                  <Text style={{ fontSize: 11, color: '#B4CFC5' }}>·</Text>
                                  <Text style={{ fontSize: 11, color: '#B4CFC5' }}>복사 {r.copyCount ?? 0}회</Text>
                                </View>
                              </View>
                              <TouchableOpacity
                                style={{ backgroundColor: '#E7F7F0', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 }}
                                onPress={() => handleCopy(r.id)}
                                disabled={copyingId === r.id}>
                                {copyingId === r.id
                                  ? <ActivityIndicator size="small" color="#2E9E83" />
                                  : <Text style={{ fontSize: 12, fontWeight: '800', color: '#2E9E83' }}>내 루틴으로</Text>}
                              </TouchableOpacity>
                            </View>
                            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                              {r.exercises.slice(0, 4).map((ex, i) => (
                                <View key={i} style={{ backgroundColor: '#E7F7F0', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
                                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#2E9E83' }}>{ex.name}</Text>
                                </View>
                              ))}
                              {r.exercises.length > 4 && (
                                <View style={{ backgroundColor: '#F0F0F0', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3 }}>
                                  <Text style={{ fontSize: 11, fontWeight: '700', color: '#B4CFC5' }}>+{r.exercises.length - 4}</Text>
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
              <View style={[{ backgroundColor: '#fff', borderRadius: 30, padding: 18, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, SHADOW]}>
                <View>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: '#34514A' }}>운동 중</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#7E9A90', marginTop: 3 }}>
                    {activeSession.exercises.length}종목 · 총 볼륨 {getTotalVolume(activeSession).toLocaleString()}kg
                  </Text>
                </View>
                <TouchableOpacity
                  style={{ backgroundColor: '#E7F7F0', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9 }}
                  onPress={handleEnd}>
                  <Text style={{ fontSize: 12, fontWeight: '800', color: '#2E9E83' }}>저장 및 종료</Text>
                </TouchableOpacity>
              </View>

              <RestTimer exerciseName={activeSession.exercises[activeSession.exercises.length - 1]?.name} />

              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E7F7F0', borderRadius: 999, paddingHorizontal: 18, paddingVertical: 12, marginBottom: 12, alignSelf: 'stretch', justifyContent: 'center' }}
                onPress={() => router.push("/modal/add-workout")}
                activeOpacity={0.8}>
                <Icon name="plus" size={18} color="#2E9E83" />
                <Text style={{ fontSize: 14, fontWeight: '800', color: '#2E9E83' }}>운동 종목 추가</Text>
              </TouchableOpacity>

              {activeSession.exercises.length === 0 ? (
                <View className="items-center justify-center py-[60px] gap-2">
                  <Icon name="target" size={64} color="#B4CFC5" />
                  <Text className="text-sm text-text-secondary text-center">운동 종목을 추가해주세요</Text>
                </View>
              ) : (
                activeSession.exercises.map((ex) => {
                  const mode = compareModes[ex.name] ?? 'recent';
                  const cacheKey = `${ex.name}:${mode}`;
                  const cachedHistory = exerciseHistoryCache.get(cacheKey);
                  const comparisonSession = cachedHistory?.comparisonSession ?? null;
                  const prevSets = comparisonSession?.sets ?? [];

                  const allTimePRWeight = cachedHistory?.pr?.weight ??
                    sessions.reduce((max, s) => {
                      const match = s.exercises.find((e) => e.name === ex.name);
                      if (!match) return max;
                      return Math.max(max, ...match.sets.map((st) => st.weight));
                    }, 0);
                  const currentMax = ex.sets.length > 0 ? Math.max(...ex.sets.map((st) => st.weight)) : 0;
                  const isPR = currentMax > 0 && currentMax > allTimePRWeight;

                  const getDateLabel = () => {
                    if (!comparisonSession) return null;
                    const d = fmtDate(comparisonSession.date);
                    return mode === 'pr' ? `${d} ${comparisonSession.maxWeight}kg` : d;
                  };
                  const dateLabel = getDateLabel();

                  return (
                    <Card key={ex.id} className="mb-3">
                      {/* 종목명 + 카테고리 + 수정 버튼 */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
                          {editingExerciseId === ex.id ? (
                            <TextInput
                              style={{ fontSize: 16, fontWeight: '900', color: '#34514A', flex: 1, borderBottomWidth: 1.5, borderBottomColor: '#6FD3B6', paddingBottom: 2 }}
                              value={editExName}
                              onChangeText={setEditExName}
                              autoFocus
                              returnKeyType="done"
                              onSubmitEditing={() => {
                                if (editExName.trim()) updateExercise(ex.id, { name: editExName.trim() } as any);
                                setEditingExerciseId(null);
                              }}
                            />
                          ) : (
                            <Text style={{ fontSize: 16, fontWeight: '900', color: '#34514A' }}>{ex.name}</Text>
                          )}
                          {isPR && (
                            <View style={{ backgroundColor: '#FFF6D9', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                              <Icon name="trophy" size={11} color="#D9A100" />
                              <Text style={{ fontSize: 11, fontWeight: '800', color: '#D9A100' }}>PR</Text>
                            </View>
                          )}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <TouchableOpacity
                            onPress={() => {
                              if (editingExerciseId === ex.id) {
                                if (editExName.trim()) updateExercise(ex.id, { name: editExName.trim() } as any);
                                setEditingExerciseId(null);
                              } else {
                                setEditExName(ex.name);
                                setEditingExerciseId(ex.id);
                              }
                            }}>
                            <Icon name={editingExerciseId === ex.id ? 'check' : 'pencil'} size={16} color={editingExerciseId === ex.id ? '#6FD3B6' : '#B4CFC5'} />
                          </TouchableOpacity>
                          <View style={{ backgroundColor: '#E7F7F0', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 }}>
                            <Text style={{ fontSize: 11, fontWeight: '800', color: '#2E9E83' }}>{ex.category}</Text>
                          </View>
                        </View>
                      </View>

                      {/* 한팔 기준 토글 */}
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#7E9A90' }}>한팔 기준{ex.isSingleArm ? ' (볼륨 ×2)' : ''}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          {ex.isSingleArm && (
                            <TouchableOpacity
                              style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}
                              onPress={() => updateExercise(ex.id, { differentSides: !ex.differentSides })}>
                              <View style={{
                                width: 15, height: 15, borderRadius: 4,
                                borderWidth: 1.5, borderColor: ex.differentSides ? '#6FD3B6' : '#D6F0E6',
                                backgroundColor: ex.differentSides ? '#6FD3B6' : 'transparent',
                                alignItems: 'center', justifyContent: 'center',
                              }}>
                                {ex.differentSides && <Icon name="check" size={9} color="#fff" />}
                              </View>
                              <Text style={{ fontSize: 11, color: '#7E9A90', fontWeight: '600' }}>좌우 다른 무게</Text>
                            </TouchableOpacity>
                          )}
                          <TouchableOpacity
                            style={{
                              width: 40, height: 22, borderRadius: 11,
                              backgroundColor: ex.isSingleArm ? '#6FD3B6' : '#E7F7F0',
                              justifyContent: 'center', paddingHorizontal: 2,
                            }}
                            onPress={() => updateExercise(ex.id, { isSingleArm: !ex.isSingleArm, differentSides: false })}
                            activeOpacity={0.8}>
                            <View style={{
                              width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff',
                              transform: [{ translateX: ex.isSingleArm ? 18 : 0 }],
                              shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 2, elevation: 1,
                            }} />
                          </TouchableOpacity>
                        </View>
                      </View>

                      {/* 비교 기준 선택 */}
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
                                setCompareModes(prev => ({ ...prev, [ex.name]: m }));
                                fetchExerciseHistory(ex.name, m);
                              }}
                              activeOpacity={0.7}>
                              <Text
                                style={{
                                  fontSize: 11,
                                  fontWeight: '600',
                                  color: isSelected ? '#fff' : '#B4CFC5',
                                }}>
                                {label}
                              </Text>
                              {isSelected && dateLabel != null && (
                                <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.8)', marginTop: 1 }}>
                                  {dateLabel}
                                </Text>
                              )}
                              {isSelected && cachedHistory && !comparisonSession && (
                                <Text style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', marginTop: 1 }}>
                                  기록없음
                                </Text>
                              )}
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      {/* 기록 없음 안내 */}
                      {cachedHistory && !comparisonSession && (
                        <View className="flex-row items-center gap-1 mb-2 px-2 py-[7px] bg-surface-alt rounded-lg">
                          <Icon name="info" size={12} color="#B4CFC5" />
                          <Text className="text-xs text-text-muted">이 기준의 기록이 없어요</Text>
                        </View>
                      )}

                      {/* 세트 헤더 */}
                      <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: 8, marginBottom: 4, borderBottomWidth: 1, borderStyle: 'dashed', borderBottomColor: '#D6F0E6' }}>
                        <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#B4CFC5', textAlign: 'center', width: 28 }}>세트</Text>
                        <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#B4CFC5', textAlign: 'center', flex: 1 }}>
                          무게(kg){ex.isSingleArm && ex.differentSides ? ' L/R' : ''}
                        </Text>
                        <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#B4CFC5', textAlign: 'center', flex: 1 }}>횟수</Text>
                        <Text style={{ fontSize: 10.5, fontWeight: '800', color: '#B4CFC5', textAlign: 'center', flex: 0.8 }}>볼륨</Text>
                        <View style={{ width: 22 }} />
                      </View>

                      {/* 세트 행들 */}
                      {ex.sets.map((st, idx) => {
                        const prev = prevSets[idx];
                        const curVol = ex.isSingleArm
                          ? (ex.differentSides && st.weightR != null
                            ? (st.weight + st.weightR) * st.reps
                            : st.weight * st.reps * 2)
                          : st.weight * st.reps;
                        const prevVol = prev != null ? prev.weight * prev.reps : undefined;
                        const isSetPR = allTimePRWeight > 0 && st.weight > allTimePRWeight;
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
                                update: { type: 'spring', springDamping: 0.65 },
                              });
                              updateSet(ex.id, st.id, { completed: !st.completed });
                            }}
                            activeOpacity={0.7}>
                            <View
                              style={{ width: 28, height: 28, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginRight: 2, marginTop: 2, backgroundColor: st.completed ? '#6FD3B6' : '#E7F7F0', flexShrink: 0 }}>
                              {st.completed ? (
                                <Icon name="check" size={13} color="#fff" />
                              ) : ex.isSingleArm ? (
                                <Text style={{ fontSize: 9, fontWeight: '900', color: '#6FD3B6' }}>L</Text>
                              ) : (
                                <Text style={{ fontSize: 11, fontWeight: '800', color: '#7E9A90' }}>{idx + 1}</Text>
                              )}
                            </View>
                            <View className="items-center py-0.5 flex-1">
                              <View className="flex-row items-center gap-0.5">
                                <Text
                                  className={[
                                    "text-sm text-center",
                                    st.completed ? "line-through text-text-muted" : "text-text-primary",
                                  ].join(" ")}>
                                  {ex.isSingleArm && ex.differentSides && st.weightR != null
                                    ? `${st.weight} / ${st.weightR}`
                                    : st.weight}
                                </Text>
                                {isSetPR && <Icon name="trophy" size={10} color="#D9A100" />}
                              </View>
                              {ex.isSingleArm && !ex.differentSides && (
                                <Text style={{ fontSize: 9, color: '#B4CFC5', fontWeight: '700' }}>×2</Text>
                              )}
                              <DiffBadge value={st.weight} prevValue={prev?.weight} unit="kg" />
                            </View>
                            <View className="items-center py-0.5 flex-1">
                              <Text
                                className={[
                                  "text-sm text-center",
                                  st.completed ? "line-through text-text-muted" : "text-text-primary",
                                ].join(" ")}>
                                {st.reps}
                              </Text>
                              <DiffBadge value={st.reps} prevValue={prev?.reps} unit="회" />
                            </View>
                            <View className="items-center py-0.5" style={{ flex: 0.5 }}>
                              <Text
                                className={[
                                  "text-sm text-center",
                                  st.completed ? "line-through text-text-muted" : "text-text-primary",
                                ].join(" ")}>
                                {curVol}
                              </Text>
                              <DiffBadge value={curVol} prevValue={prevVol} unit="kg" />
                            </View>
                            <TouchableOpacity
                              style={{ marginTop: 3 }}
                              onPress={() => removeSet(ex.id, st.id)}>
                              <Icon name="trash" size={15} color="#B4CFC5" />
                            </TouchableOpacity>
                          </TouchableOpacity>
                        );
                      })}
                      {ex.sets.length === 0 && (
                        <Text className="text-sm text-text-muted text-center py-2">세트를 추가해주세요</Text>
                      )}

                      {ex.settings && ex.settings.length > 0 && (
                        <View className="flex-row flex-wrap gap-1 pt-3">
                          {ex.settings.map((st, i) => (
                            <View key={i} className="bg-primary/20 rounded-[20px] px-2 py-1">
                              <Text className="text-[11px] text-primary font-semibold">
                                {st.key}: {st.value}
                              </Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {!!ex.tip && (
                        <View className="flex-row items-start gap-1 bg-warning/20 rounded-xl p-2 mt-2">
                          <Icon name="bulb" size={13} color="#7E9A90" />
                          <Text className="text-xs text-text-secondary leading-5 flex-1">{ex.tip}</Text>
                        </View>
                      )}
                    </Card>
                  );
                })
              )}
            </>
          )}
        </ScrollView>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>

          {/* 이번 달 요약 */}
          <Card className="flex-row justify-between items-center mb-3 p-[18px]">
            <View className="gap-1">
              <Text className="text-sm font-semibold text-text-secondary">
                {visibleMonth.split("-")[0]}년 {parseInt(visibleMonth.split("-")[1])}월
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Text className="text-[18px] font-bold text-text-primary">
                  {monthSessions.length}회 운동 · {monthVolume.toLocaleString()}kg
                </Text>
                {monthCalories > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                    <FlameIcon size={14} color="#FF9DB0" />
                    <Text className="text-[15px] font-bold text-text-primary">{monthCalories.toLocaleString()} kcal</Text>
                  </View>
                )}
              </View>
            </View>
            <Icon name="calendar" size={36} color="#7E9A90" />
          </Card>

          {/* 달력 */}
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
              theme={CAL_THEME}
            />
          </Card>

          {/* 선택한 날짜 상세 */}
          {selectedDate && (
            <>
              <Text className="text-[15px] font-bold text-text-primary mb-3">
                {formatSelectedDate(selectedDate)}
              </Text>
              {selectedSessions.length === 0 ? (
                <Card className="items-center gap-2">
                  <Icon name="person" size={36} color="#B4CFC5" />
                  <Text className="text-sm text-text-muted">운동 기록이 없어요</Text>
                </Card>
              ) : (
                selectedSessions.map((session) => (
                  <HistoryCard
                    key={session.id}
                    session={session}
                    getVolume={getTotalVolume}
                    allSessions={sessions}
                    onDelete={deleteSession}
                  />
                ))
              )}
            </>
          )}

          {sessions.length === 0 && (
            <View className="items-center justify-center py-[60px] gap-2">
              <Icon name="calendar" size={64} color="#B4CFC5" />
              <Text className="text-[20px] font-bold text-text-primary text-center">운동 기록이 없어요</Text>
              <Text className="text-sm text-text-secondary text-center">운동을 시작하고 기록을 쌓아보세요</Text>
            </View>
          )}
        </ScrollView>
      )}

      <WorkoutCompleteOverlay
        visible={completeCalories !== null}
        calories={completeCalories ?? 0}
        onDismiss={() => setCompleteCalories(null)}
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
  if (prevValue == null || value === prevValue) return null;
  const diff = value - prevValue;
  const up = diff > 0;
  return (
    <Text
      style={{
        fontSize: 10,
        fontWeight: '700',
        lineHeight: 14,
        color: up ? '#E76C86' : '#3F8DD6',
      }}>
      {up ? `↑+${diff}` : `↓${diff}`}{unit}
    </Text>
  );
}

function ExerciseHistoryRow({
  ex,
  idx,
  allPrevMax,
  allTimePR,
}: {
  ex: WorkoutSession['exercises'][0];
  idx: number;
  allPrevMax: number | null;
  allTimePR: number;
}) {
  const curMaxWeight = ex.sets.length > 0 ? Math.max(...ex.sets.map(st => st.weight)) : 0;
  const delta = allPrevMax != null ? curMaxWeight - allPrevMax : null;
  const isSessionPR = curMaxWeight > 0 && curMaxWeight >= allTimePR && allTimePR > 0;

  const prScale = useRef(new Animated.Value(0)).current;
  const growthOp = useRef(new Animated.Value(0)).current;
  const compOp = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    prScale.setValue(0);
    growthOp.setValue(0);
    compOp.setValue(0);
    Animated.parallel([
      Animated.timing(compOp, { toValue: 1, duration: 400, delay: idx * 80, useNativeDriver: true }),
      ...(isSessionPR ? [Animated.spring(prScale, { toValue: 1, damping: 5, stiffness: 180, useNativeDriver: true } as any)] : []),
      ...(delta != null && delta > 0 ? [Animated.timing(growthOp, { toValue: 1, duration: 350, delay: 300 + idx * 80, useNativeDriver: true })] : []),
    ]).start();
  }, []);

  const prevPct = allPrevMax != null && curMaxWeight > 0
    ? `${Math.round(Math.min(100, (allPrevMax / curMaxWeight) * 100))}%` as `${number}%`
    : '0%' as const;

  return (
    <View className={['py-4', idx > 0 ? 'border-t border-surface-alt' : ''].join(' ')}>
      {/* 종목 헤더 */}
      <View className="flex-row items-center justify-between mb-2">
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          <Text className="text-[17px] font-extrabold text-text-primary shrink">{ex.name}</Text>
          {ex.isSingleArm && (
            <View style={{ backgroundColor: '#6FD3B620', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 3 }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: '#2E9E83' }}>한팔</Text>
            </View>
          )}
          {isSessionPR && (
            <Animated.View style={{ transform: [{ scale: prScale }] }}>
              <View style={{ backgroundColor: '#FFF6D9', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <Icon name="trophy" size={11} color="#D9A100" />
                <Text style={{ fontSize: 11, fontWeight: '800', color: '#D9A100' }}>PR</Text>
              </View>
            </Animated.View>
          )}
        </View>
        <View className="bg-workout/30 rounded-xl px-2 py-1">
          <Text className="text-[11px] font-bold text-workout">{ex.category}</Text>
        </View>
      </View>

      {/* 이전 → 오늘 비교 바 (fade-in) */}
      {allPrevMax != null && curMaxWeight > 0 && (
        <Animated.View style={{ marginBottom: 10, gap: 4, opacity: compOp }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 9, color: '#B4CFC5', fontWeight: '700', width: 24, textAlign: 'right' }}>이전</Text>
            <View style={{ flex: 1, height: 5, backgroundColor: '#E7F7F0', borderRadius: 999, overflow: 'hidden' }}>
              <View style={{ height: '100%', borderRadius: 999, backgroundColor: '#B4CFC5', width: prevPct }} />
            </View>
            <Text style={{ fontSize: 10, color: '#B4CFC5', fontWeight: '600', width: 38 }}>{allPrevMax}kg</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontSize: 9, color: '#2E9E83', fontWeight: '700', width: 24, textAlign: 'right' }}>오늘</Text>
            <View style={{ flex: 1, height: 5, backgroundColor: '#E7F7F0', borderRadius: 999, overflow: 'hidden' }}>
              <View style={{ height: '100%', borderRadius: 999, backgroundColor: isSessionPR ? '#FFD36E' : '#6FD3B6', width: '100%' }} />
            </View>
            <Text style={{ fontSize: 10, color: '#2E9E83', fontWeight: '700', width: 38 }}>{curMaxWeight}kg</Text>
          </View>
        </Animated.View>
      )}

      {/* 성장 메시지 */}
      {delta != null && delta > 0 && (
        <Animated.View style={{ opacity: growthOp, marginBottom: 6 }}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: '#2E9E83' }}>
            💪 +{delta}kg 성장했어요!
          </Text>
        </Animated.View>
      )}
      {delta != null && delta < 0 && (
        <Text style={{ fontSize: 11, fontWeight: '600', color: '#E76C86', marginBottom: 4 }}>
          ↓ {Math.abs(delta)}kg
        </Text>
      )}

      {/* 세트 목록 */}
      <View className="gap-1 mb-2">
        {ex.sets.map((st, i) => {
          const vol = ex.isSingleArm
            ? (ex.differentSides && st.weightR != null
              ? (st.weight + st.weightR) * st.reps
              : st.weight * st.reps * 2)
            : st.weight * st.reps;
          return (
            <View key={st.id} className="flex-row items-center">
              <Text className="text-xs font-semibold text-text-muted w-10">{i + 1}세트</Text>
              <Text className="text-sm font-semibold text-text-primary flex-1">
                {ex.isSingleArm && ex.differentSides && st.weightR != null
                  ? `L${st.weight}/R${st.weightR}kg`
                  : `${st.weight}kg`}
                {ex.isSingleArm ? '(한팔)' : ''} × {st.reps}회
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
              <Text className="text-[10px] font-semibold text-primary">{st.key}: {st.value}</Text>
            </View>
          ))}
        </View>
      )}

      {!!ex.tip && (
        <View className="flex-row items-start gap-1 bg-warning/30 rounded-xl p-2 mb-1">
          <Icon name="bulb" size={11} color="#7E9A90" />
          <Text className="text-xs text-text-secondary flex-1 leading-5">{ex.tip}</Text>
        </View>
      )}
    </View>
  );
}

function HistoryCard({
  session,
  getVolume,
  allSessions,
  onDelete,
}: {
  session: WorkoutSession;
  getVolume: (s: WorkoutSession) => number;
  allSessions: WorkoutSession[];
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const volume = getVolume(session);

  const handleMore = () => {
    Alert.alert(
      session.date,
      `${session.exercises.length}종목 · ${volume.toLocaleString()}kg`,
      [
        {
          text: '삭제',
          style: 'destructive',
          onPress: () => Alert.alert('운동 기록 삭제', '이 기록을 삭제할까요?', [
            { text: '취소', style: 'cancel' },
            { text: '삭제', style: 'destructive', onPress: () => onDelete(session.id) },
          ]),
        },
        { text: '취소', style: 'cancel' },
      ],
    );
  };

  const getAllTimePrevMax = (exName: string): number | null => {
    let max = 0;
    for (const s of allSessions) {
      if (s.date >= session.date) continue;
      const match = s.exercises.find(e => e.name === exName);
      if (match) match.sets.forEach(st => { if (st.weight > max) max = st.weight; });
    }
    return max > 0 ? max : null;
  };

  const getAllTimePR = (exName: string): number => {
    let max = 0;
    for (const s of allSessions) {
      const match = s.exercises.find(e => e.name === exName);
      if (match) match.sets.forEach(st => { if (st.weight > max) max = st.weight; });
    }
    return max;
  };

  return (
    <Card bare className="overflow-hidden mb-3">
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingLeft: 18, paddingRight: 8, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: '#E7F7F0' }}>
        <TouchableOpacity
          style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
          onPress={() => {
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            setExpanded(v => !v);
          }}
          activeOpacity={0.7}>
          <Text className="text-sm font-semibold text-text-secondary">
            {session.exercises.length}종목
          </Text>
          <View className="flex-row items-center gap-2">
            {!!session.caloriesBurned && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                <FlameIcon size={11} color="#E76C86" />
                <Text className="text-xs font-bold text-danger">{session.caloriesBurned} kcal</Text>
              </View>
            )}
            <Text className="text-sm font-bold text-workout">{volume.toLocaleString()}kg</Text>
            <Text style={{ fontSize: 12, color: '#B4CFC5', fontWeight: '700' }}>{expanded ? '▲' : '▼'}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleMore} style={{ paddingHorizontal: 8, paddingVertical: 4 }}>
          <Text style={{ fontSize: 18, color: '#B4CFC5', fontWeight: '900', letterSpacing: 1 }}>···</Text>
        </TouchableOpacity>
      </View>

      {expanded && (
        <View className="px-[18px] pb-1">
          {session.exercises.map((ex, idx) => (
            <ExerciseHistoryRow
              key={ex.id}
              ex={ex}
              idx={idx}
              allPrevMax={getAllTimePrevMax(ex.name)}
              allTimePR={getAllTimePR(ex.name)}
            />
          ))}

          <View className="gap-1 border-t border-surface-alt py-3">
            {!!session.caloriesBurned && (
              <View className="flex-row justify-end items-center gap-2">
                <Text className="text-xs font-semibold text-text-muted">칼로리 소모</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <FlameIcon size={13} color="#E76C86" />
                  <Text className="text-[15px] font-bold text-danger">{session.caloriesBurned} kcal</Text>
                </View>
              </View>
            )}
            <View className="flex-row justify-end items-center gap-2">
              <Text className="text-xs font-semibold text-text-muted">총 볼륨</Text>
              <Text className="text-[17px] font-extrabold text-workout">{volume.toLocaleString()}kg</Text>
            </View>
          </View>
        </View>
      )}
    </Card>
  );
}
