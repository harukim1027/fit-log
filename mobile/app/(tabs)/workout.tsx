import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Header, Card } from "../../components/ui";
import { useEffect, useState, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import { useWorkoutStore, calculateCaloriesBurned, CompareMode } from "../../store/workoutStore";
import { useAuthStore } from "../../store/authStore";
import RestTimer from "../../components/RestTimer";
import { WorkoutSession } from "../../types/workout";

type Tab = "today" | "history";

const SHADOW = {
  shadowColor: "#B4A0D8",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.09,
  shadowRadius: 12,
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
  backgroundColor: '#FFF8F2',
  calendarBackground: '#FFFFFF',
  textSectionTitleColor: '#8B80A8',
  selectedDayBackgroundColor: '#B4A7E8',
  selectedDayTextColor: "#fff",
  todayTextColor: '#B4A7E8',
  todayBackgroundColor: '#B4A7E8' + "18",
  dayTextColor: '#3D3256',
  textDisabledColor: '#C4B8D4',
  dotColor: '#F4B8A8',
  selectedDotColor: "#fff",
  arrowColor: '#B4A7E8',
  monthTextColor: '#3D3256',
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
    endSession,
    getTotalVolume,
    removeSet,
    updateSet,
    fetchSessions,
    fetchExerciseHistory,
    sessions,
    isLoading,
    exerciseHistoryCache,
  } = useWorkoutStore();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>("today");
  const [compareModes, setCompareModes] = useState<Record<string, CompareMode>>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    new Date().toISOString().substring(0, 7)
  );

  useEffect(() => {
    fetchSessions();
  }, []);

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
          Alert.alert("운동 완료 🎉", `🔥 ${calories} kcal 소모`);
        },
      },
    ]);
  };

  const markedDates = useMemo(() => {
    const result: Record<string, any> = {};
    sessions.forEach((s) => {
      const key = SESSION_DATE_KEY(s);
      result[key] = { marked: true, dotColor: '#F4B8A8' };
    });
    if (selectedDate) {
      result[selectedDate] = {
        ...(result[selectedDate] ?? {}),
        selected: true,
        selectedColor: '#B4A7E8',
        dotColor: result[selectedDate]?.marked ? "#fff" : '#F4B8A8',
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
        <ActivityIndicator size="large" color="#B4A7E8" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <Header title="운동 💪" />

      {/* 탭 */}
      <View className="flex-row bg-surface-alt rounded-2xl p-1 mx-5 mb-4">
        {(["today", "history"] as Tab[]).map((t) => {
          const isActive = tab === t;
          return (
            <TouchableOpacity
              key={t}
              className={[
                "flex-1 py-2 items-center rounded-xl",
                isActive ? "bg-surface" : "",
              ].join(" ")}
              style={isActive ? SHADOW : undefined}
              onPress={() => setTab(t)}>
              <Text
                className={[
                  "text-sm",
                  isActive ? "text-text-primary font-bold" : "text-text-muted font-medium",
                ].join(" ")}>
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
            <View className="items-center justify-center py-[60px] gap-2">
              <Text className="text-[64px]">🏋️‍♀️</Text>
              <Text className="text-[20px] font-bold text-text-primary text-center">
                오늘 운동을 시작해볼까요?
              </Text>
              <Text className="text-sm text-text-secondary text-center">
                운동을 기록하고 성장을 확인해보세요
              </Text>
              <TouchableOpacity
                className="flex-row bg-workout rounded-3xl px-9 py-3 items-center gap-2 mt-2"
                style={SHADOW}
                onPress={startSession}
                activeOpacity={0.8}>
                <Ionicons name="play" size={20} color="#fff" />
                <Text className="text-base font-bold text-white">운동 시작</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View className="flex-row justify-between items-start mb-4">
                <View>
                  <Text className="text-[22px] font-bold text-text-primary">운동 중 🔥</Text>
                  <Text className="text-sm text-text-secondary mt-1">
                    {activeSession.exercises.length}종목 · 총 볼륨{" "}
                    {getTotalVolume(activeSession).toLocaleString()}kg
                  </Text>
                </View>
                <TouchableOpacity
                  className="bg-success/30 rounded-[20px] px-4 py-2"
                  onPress={handleEnd}>
                  <Text className="text-sm font-bold text-success">저장 및 종료</Text>
                </TouchableOpacity>
              </View>

              <RestTimer />

              <TouchableOpacity
                className="flex-row items-center gap-2 bg-surface rounded-2xl p-3 mb-4"
                style={SHADOW}
                onPress={() => router.push("/modal/add-workout")}
                activeOpacity={0.8}>
                <Ionicons name="add-circle" size={20} color="#F4B8A8" />
                <Text className="text-sm font-semibold text-workout">운동 종목 추가</Text>
              </TouchableOpacity>

              {activeSession.exercises.length === 0 ? (
                <View className="items-center justify-center py-[60px] gap-2">
                  <Text className="text-[64px]">🎯</Text>
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
                      {/* 종목명 + 카테고리 */}
                      <View className="flex-row justify-between items-center mb-3">
                        <View className="flex-row items-center gap-2 flex-1">
                          <Text className="text-base font-bold text-text-primary">{ex.name}</Text>
                          {isPR && (
                            <View className="bg-stats/60 rounded-xl px-2 py-0.5">
                              <Text style={{ fontSize: 11, fontWeight: '700', color: '#B86A00' }}>🏆 PR</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-xs text-workout bg-workout/30 px-2 py-1 rounded-xl">
                          {ex.category}
                        </Text>
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
                                  color: isSelected ? '#fff' : '#C4B8D4',
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
                          <Ionicons name="information-circle-outline" size={14} color="#C4B8D4" />
                          <Text className="text-xs text-text-muted">이 기준의 기록이 없어요</Text>
                        </View>
                      )}

                      {/* 세트 헤더 */}
                      <View className="flex-row items-center mb-1 pb-2 border-b border-border">
                        <Text className="text-[11px] text-text-muted font-semibold text-center" style={{ flex: 0.5 }}>세트</Text>
                        <Text className="text-[11px] text-text-muted font-semibold text-center flex-1">무게(kg)</Text>
                        <Text className="text-[11px] text-text-muted font-semibold text-center flex-1">횟수</Text>
                        <Text className="text-[11px] text-text-muted font-semibold text-center" style={{ flex: 0.5 }}>볼륨</Text>
                        <View style={{ width: 24 }} />
                      </View>

                      {/* 세트 행들 */}
                      {ex.sets.map((st, idx) => {
                        const prev = prevSets[idx];
                        const curVol = st.weight * st.reps;
                        const prevVol = prev != null ? prev.weight * prev.reps : undefined;
                        const isSetPR = allTimePRWeight > 0 && st.weight > allTimePRWeight;
                        return (
                          <TouchableOpacity
                            key={st.id}
                            className={[
                              "flex-row items-start py-2",
                              st.completed ? "opacity-60" : "",
                            ].join(" ")}
                            onPress={() => updateSet(ex.id, st.id, { completed: !st.completed })}
                            activeOpacity={0.7}>
                            <View
                              className={[
                                "w-[26px] h-[26px] rounded-full items-center justify-center mr-2 mt-0.5",
                                st.completed ? "bg-success" : "bg-surface-alt",
                              ].join(" ")}
                              style={{ flex: 0.5 }}>
                              {st.completed ? (
                                <Ionicons name="checkmark" size={14} color="#fff" />
                              ) : (
                                <Text className="text-xs font-semibold text-text-secondary">{idx + 1}</Text>
                              )}
                            </View>
                            <View className="items-center py-0.5 flex-1">
                              <View className="flex-row items-center gap-0.5">
                                <Text
                                  className={[
                                    "text-sm text-center",
                                    st.completed ? "line-through text-text-muted" : "text-text-primary",
                                  ].join(" ")}>
                                  {st.weight}
                                </Text>
                                {isSetPR && <Text style={{ fontSize: 10 }}>🏆</Text>}
                              </View>
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
                              <Ionicons name="close-circle-outline" size={18} color="#C4B8D4" />
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
                        <View className="bg-warning/20 rounded-xl p-2 mt-2">
                          <Text className="text-xs text-text-secondary leading-5">💡 {ex.tip}</Text>
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
              <Text className="text-[18px] font-bold text-text-primary">
                {monthSessions.length}회 운동 · {monthVolume.toLocaleString()}kg
                {monthCalories > 0 ? ` · 🔥 ${monthCalories.toLocaleString()} kcal` : ""}
              </Text>
            </View>
            <Text className="text-[36px]">📆</Text>
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
                  <Text className="text-[36px]">🙈</Text>
                  <Text className="text-sm text-text-muted">운동 기록이 없어요</Text>
                </Card>
              ) : (
                selectedSessions.map((session) => (
                  <HistoryCard
                    key={session.id}
                    session={session}
                    getVolume={getTotalVolume}
                    allSessions={sessions}
                  />
                ))
              )}
            </>
          )}

          {sessions.length === 0 && (
            <View className="items-center justify-center py-[60px] gap-2">
              <Text className="text-[64px]">📅</Text>
              <Text className="text-[20px] font-bold text-text-primary text-center">운동 기록이 없어요</Text>
              <Text className="text-sm text-text-secondary text-center">운동을 시작하고 기록을 쌓아보세요</Text>
            </View>
          )}
        </ScrollView>
      )}
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
        color: up ? '#E05555' : '#4A90D9',
      }}>
      {up ? `↑+${diff}` : `↓${diff}`}{unit}
    </Text>
  );
}

function HistoryCard({
  session,
  getVolume,
  allSessions,
}: {
  session: WorkoutSession;
  getVolume: (s: WorkoutSession) => number;
  allSessions: WorkoutSession[];
}) {
  const [expanded, setExpanded] = useState(true);
  const volume = getVolume(session);

  const getPrevMaxWeight = (exName: string) => {
    for (const s of allSessions) {
      if (s.date >= session.date) continue;
      const match = s.exercises.find((e) => e.name === exName);
      if (match && match.sets.length > 0) {
        return Math.max(...match.sets.map((st) => st.weight));
      }
    }
    return null;
  };

  return (
    <Card bare className="overflow-hidden mb-3">
      <TouchableOpacity
        className="flex-row justify-between items-center px-[18px] py-[13px] border-b border-surface-alt"
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}>
        <Text className="text-sm font-semibold text-text-secondary">
          {session.exercises.length}종목
        </Text>
        <View className="flex-row items-center gap-2">
          {!!session.caloriesBurned && (
            <Text className="text-xs font-bold text-danger">🔥 {session.caloriesBurned} kcal</Text>
          )}
          <Text className="text-sm font-bold text-workout">{volume.toLocaleString()}kg</Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color="#C4B8D4"
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View className="px-[18px] pb-1">
          {session.exercises.map((ex, idx) => {
            const prevMaxWeight = getPrevMaxWeight(ex.name);
            const curMaxWeight = ex.sets.length > 0 ? Math.max(...ex.sets.map((st) => st.weight)) : 0;
            const delta = prevMaxWeight != null ? curMaxWeight - prevMaxWeight : null;
            const changeIcon = delta == null ? null : delta > 0 ? "↑" : delta < 0 ? "↓" : "→";
            const changeColor = delta == null ? '#C4B8D4' : delta > 0 ? '#A8DCC8' : delta < 0 ? '#F4ADAD' : '#C4B8D4';

            return (
              <View
                key={ex.id}
                className={[
                  "py-4",
                  idx > 0 ? "border-t border-surface-alt" : "",
                ].join(" ")}>
                <View className="flex-row items-center justify-between mb-3">
                  <Text className="text-[18px] font-extrabold text-text-primary shrink">
                    {ex.name}
                  </Text>
                  <View className="flex-row items-center gap-1">
                    {changeIcon && (
                      <Text className="text-sm font-bold" style={{ color: changeColor }}>
                        {changeIcon} {Math.abs(delta!)}kg
                      </Text>
                    )}
                    <View className="bg-workout/30 rounded-xl px-2 py-1">
                      <Text className="text-[11px] font-bold text-workout">{ex.category}</Text>
                    </View>
                  </View>
                </View>

                <View className="gap-1 mb-2">
                  {ex.sets.map((st, i) => (
                    <View key={st.id} className="flex-row items-center">
                      <Text className="text-xs font-semibold text-text-muted w-10">{i + 1}세트</Text>
                      <Text className="text-sm font-semibold text-text-primary flex-1">
                        {st.weight}kg × {st.reps}회
                      </Text>
                      <Text className="text-sm font-medium text-text-secondary">
                        = {(st.weight * st.reps).toLocaleString()}kg
                      </Text>
                    </View>
                  ))}
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
                    <Ionicons name="chatbubble-ellipses-outline" size={13} color="#8B80A8" />
                    <Text className="text-xs text-text-secondary flex-1 leading-5">{ex.tip}</Text>
                  </View>
                )}
              </View>
            );
          })}

          <View className="gap-1 border-t border-surface-alt py-3">
            {!!session.caloriesBurned && (
              <View className="flex-row justify-end items-center gap-2">
                <Text className="text-xs font-semibold text-text-muted">칼로리 소모</Text>
                <Text className="text-[15px] font-bold text-danger">🔥 {session.caloriesBurned} kcal</Text>
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
