import React from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useEffect, useState, useMemo } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Calendar } from "react-native-calendars";
import { useWorkoutStore, calculateCaloriesBurned } from "../../store/workoutStore";
import { useAuthStore } from "../../store/authStore";
import RestTimer from "../../components/RestTimer";
import { Colors } from "../../constants/colors";
import { WorkoutSession } from "../../types/workout";

type Tab = "today" | "history";

const CARD_SHADOW = {
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
  backgroundColor: Colors.background,
  calendarBackground: Colors.surface,
  textSectionTitleColor: Colors.textSecondary,
  selectedDayBackgroundColor: Colors.primary,
  selectedDayTextColor: "#fff",
  todayTextColor: Colors.primary,
  todayBackgroundColor: Colors.primary + "18",
  dayTextColor: Colors.textPrimary,
  textDisabledColor: Colors.textMuted,
  dotColor: Colors.workout,
  selectedDotColor: "#fff",
  arrowColor: Colors.primary,
  monthTextColor: Colors.textPrimary,
  textDayFontWeight: "600" as const,
  textMonthFontWeight: "800" as const,
  textDayHeaderFontWeight: "600" as const,
  textDayFontSize: 14,
  textMonthFontSize: 16,
  textDayHeaderFontSize: 12,
};

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
    sessions,
    isLoading,
  } = useWorkoutStore();
  const { user } = useAuthStore();
  const [tab, setTab] = useState<Tab>("today");

  // Calendar state
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    new Date().toISOString().substring(0, 7)
  );

  useEffect(() => {
    fetchSessions();
  }, []);

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

  // ── Calendar computations ───────────────────────────────
  const markedDates = useMemo(() => {
    const result: Record<string, any> = {};
    sessions.forEach((s) => {
      const key = SESSION_DATE_KEY(s);
      result[key] = { marked: true, dotColor: Colors.workout };
    });
    if (selectedDate) {
      result[selectedDate] = {
        ...(result[selectedDate] ?? {}),
        selected: true,
        selectedColor: Colors.primary,
        dotColor: result[selectedDate]?.marked ? "#fff" : Colors.workout,
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
      <SafeAreaView
        style={[
          s.container,
          { alignItems: "center", justifyContent: "center" },
        ]}
        edges={["top"]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={["top"]}>
      <View style={s.header}>
        <Text style={s.title}>운동 💪</Text>
      </View>

      <View style={s.tabRow}>
        <TouchableOpacity
          style={[s.tab, tab === "today" && s.tabActive]}
          onPress={() => setTab("today")}>
          <Text style={[s.tabText, tab === "today" && s.tabTextActive]}>
            오늘 운동
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, tab === "history" && s.tabActive]}
          onPress={() => setTab("history")}>
          <Text style={[s.tabText, tab === "history" && s.tabTextActive]}>
            히스토리
          </Text>
        </TouchableOpacity>
      </View>

      {tab === "today" ? (
        <ScrollView
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.content}>
          {!activeSession ? (
            <View style={s.emptyContainer}>
              <Text style={s.emptyEmoji}>🏋️‍♀️</Text>
              <Text style={s.emptyTitle}>오늘 운동을 시작해볼까요?</Text>
              <Text style={s.emptyDesc}>
                운동을 기록하고 성장을 확인해보세요
              </Text>
              <TouchableOpacity
                style={s.startBtn}
                onPress={startSession}
                activeOpacity={0.8}>
                <Ionicons name="play" size={20} color="#fff" />
                <Text style={s.startBtnText}>운동 시작</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={s.sessionHeader}>
                <View>
                  <Text style={s.sessionTitle}>운동 중 🔥</Text>
                  <Text style={s.sessionSub}>
                    {activeSession.exercises.length}종목 · 총 볼륨{" "}
                    {getTotalVolume(activeSession).toLocaleString()}kg
                  </Text>
                </View>
                <TouchableOpacity style={s.endBtn} onPress={handleEnd}>
                  <Text style={s.endBtnText}>저장 및 종료</Text>
                </TouchableOpacity>
              </View>

              <RestTimer />

              <TouchableOpacity
                style={s.addExBtn}
                onPress={() => router.push("/modal/add-workout")}
                activeOpacity={0.8}>
                <Ionicons name="add-circle" size={20} color={Colors.workout} />
                <Text style={s.addExText}>운동 종목 추가</Text>
              </TouchableOpacity>

              {activeSession.exercises.length === 0 ? (
                <View style={s.emptyContainer}>
                  <Text style={s.emptyEmoji}>🎯</Text>
                  <Text style={s.emptyDesc}>운동 종목을 추가해주세요</Text>
                </View>
              ) : (
                activeSession.exercises.map((ex) => (
                  <View key={ex.id} style={s.exerciseCard}>
                    <View style={s.exHeader}>
                      <Text style={s.exName}>{ex.name}</Text>
                      <Text style={s.exCategory}>{ex.category}</Text>
                    </View>
                    <View style={s.setHeaderRow}>
                      <Text style={[s.setHeaderText, { flex: 0.5 }]}>세트</Text>
                      <Text style={[s.setHeaderText, { flex: 1 }]}>
                        무게(kg)
                      </Text>
                      <Text style={[s.setHeaderText, { flex: 1 }]}>횟수</Text>
                      <Text style={[s.setHeaderText, { flex: 0.5 }]}>볼륨</Text>
                      <View style={{ width: 24 }} />
                    </View>
                    {ex.sets.map((st, idx) => (
                      <TouchableOpacity
                        key={st.id}
                        style={[s.setRow, st.completed && s.setRowDone]}
                        onPress={() =>
                          updateSet(ex.id, st.id, { completed: !st.completed })
                        }
                        activeOpacity={0.7}>
                        <View
                          style={[
                            s.setNumWrap,
                            st.completed && s.setNumWrapDone,
                          ]}>
                          {st.completed ? (
                            <Ionicons name="checkmark" size={14} color="#fff" />
                          ) : (
                            <Text style={s.setNumText}>{idx + 1}</Text>
                          )}
                        </View>
                        <Text
                          style={[
                            s.setText,
                            { flex: 1 },
                            st.completed && s.textDone,
                          ]}>
                          {st.weight}
                        </Text>
                        <Text
                          style={[
                            s.setText,
                            { flex: 1 },
                            st.completed && s.textDone,
                          ]}>
                          {st.reps}
                        </Text>
                        <Text
                          style={[
                            s.setText,
                            { flex: 0.5 },
                            st.completed && s.textDone,
                          ]}>
                          {st.weight * st.reps}
                        </Text>
                        <TouchableOpacity
                          onPress={() => removeSet(ex.id, st.id)}>
                          <Ionicons
                            name="close-circle-outline"
                            size={18}
                            color={Colors.textMuted}
                          />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                    {ex.sets.length === 0 && (
                      <Text style={s.noSetText}>세트를 추가해주세요</Text>
                    )}
                    {ex.settings && ex.settings.length > 0 && (
                      <View style={s.settingTagsWrap}>
                        {ex.settings.map((st, i) => (
                          <View key={i} style={s.settingTag}>
                            <Text style={s.settingTagText}>
                              {st.key}: {st.value}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {!!ex.tip && (
                      <View style={s.tipBox}>
                        <Text style={s.tipText}>💡 {ex.tip}</Text>
                      </View>
                    )}
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.content}>
          {/* 이번 달 요약 */}
          <View style={s.summaryCard}>
            <View style={s.summaryLeft}>
              <Text style={s.summaryMonth}>
                {visibleMonth.split("-")[0]}년{" "}
                {parseInt(visibleMonth.split("-")[1])}월
              </Text>
              <Text style={s.summaryDetail}>
                {monthSessions.length}회 운동 · {monthVolume.toLocaleString()}kg
                {monthCalories > 0 ? ` · 🔥 ${monthCalories.toLocaleString()} kcal` : ""}
              </Text>
            </View>
            <Text style={s.summaryEmoji}>📆</Text>
          </View>

          {/* 달력 */}
          <View style={s.calendarCard}>
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
          </View>

          {/* 선택한 날짜 상세 */}
          {selectedDate && (
            <>
              <Text style={s.selectedLabel}>
                {formatSelectedDate(selectedDate)}
              </Text>
              {selectedSessions.length === 0 ? (
                <View style={s.noWorkoutCard}>
                  <Text style={s.noWorkoutEmoji}>🙈</Text>
                  <Text style={s.noWorkoutText}>운동 기록이 없어요</Text>
                </View>
              ) : (
                selectedSessions.map((session) => (
                  <HistoryCard
                    key={session.id}
                    session={session}
                    getVolume={getTotalVolume}
                  />
                ))
              )}
            </>
          )}

          {/* 전체 비어있을 때 */}
          {sessions.length === 0 && (
            <View style={s.emptyContainer}>
              <Text style={s.emptyEmoji}>📅</Text>
              <Text style={s.emptyTitle}>운동 기록이 없어요</Text>
              <Text style={s.emptyDesc}>운동을 시작하고 기록을 쌓아보세요</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function HistoryCard({
  session,
  getVolume,
}: {
  session: WorkoutSession;
  getVolume: (s: WorkoutSession) => number;
}) {
  const [expanded, setExpanded] = useState(true);
  const volume = getVolume(session);

  return (
    <View style={h.card}>
      {/* 헤더: 종목 수 + 토글 */}
      <TouchableOpacity
        style={h.header}
        onPress={() => setExpanded((v) => !v)}
        activeOpacity={0.7}>
        <Text style={h.summary}>{session.exercises.length}종목</Text>
        <View style={h.headerRight}>
          {!!session.caloriesBurned && (
            <Text style={h.headerCal}>🔥 {session.caloriesBurned} kcal</Text>
          )}
          <Text style={h.headerVol}>{volume.toLocaleString()}kg</Text>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={Colors.textMuted}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={h.body}>
          {session.exercises.map((ex, idx) => {
            const exVol = ex.sets.reduce(
              (sum, st) => sum + st.weight * st.reps,
              0
            );
            return (
              <View
                key={ex.id}
                style={[h.exBlock, idx > 0 && h.exBlockDivider]}>
                {/* 종목명 + 카테고리 */}
                <View style={h.exHeader}>
                  <Text style={h.exName}>{ex.name}</Text>
                  <View style={h.catTag}>
                    <Text style={h.catTagText}>{ex.category}</Text>
                  </View>
                </View>

                {/* 세트 테이블 */}
                <View style={h.setsTable}>
                  {ex.sets.map((st, i) => (
                    <View key={st.id} style={h.setRow}>
                      <Text style={h.setLabel}>{i + 1}세트</Text>
                      <Text style={h.setVal}>
                        {st.weight}kg × {st.reps}회
                      </Text>
                      <Text style={h.setResult}>
                        = {(st.weight * st.reps).toLocaleString()}kg
                      </Text>
                    </View>
                  ))}
                </View>

                {/* 기구 설정 태그 */}
                {ex.settings && ex.settings.length > 0 && (
                  <View style={h.settingTagsWrap}>
                    {ex.settings.map((st, i) => (
                      <View key={i} style={h.settingTag}>
                        <Text style={h.settingTagText}>
                          {st.key}: {st.value}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* 팁 */}
                {!!ex.tip && (
                  <View style={h.tipRow}>
                    <Ionicons
                      name="chatbubble-ellipses-outline"
                      size={13}
                      color={Colors.textSecondary}
                    />
                    <Text style={h.tipText}>{ex.tip}</Text>
                  </View>
                )}
              </View>
            );
          })}

          {/* 총 볼륨 + 칼로리 푸터 */}
          <View style={h.footer}>
            {!!session.caloriesBurned && (
              <View style={h.footerRow}>
                <Text style={h.footerLabel}>칼로리 소모</Text>
                <Text style={h.footerCal}>🔥 {session.caloriesBurned} kcal</Text>
              </View>
            )}
            <View style={h.footerRow}>
              <Text style={h.footerLabel}>총 볼륨</Text>
              <Text style={h.footerVol}>{volume.toLocaleString()}kg</Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: "700", color: Colors.textPrimary },
  tabRow: {
    flexDirection: "row",
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 16,
    padding: 4,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  tab: { flex: 1, paddingVertical: 9, alignItems: "center", borderRadius: 14 },
  tabActive: { backgroundColor: Colors.surface, ...CARD_SHADOW },
  tabText: { fontSize: 14, fontWeight: "500", color: Colors.textMuted },
  tabTextActive: { color: Colors.textPrimary, fontWeight: "700" },
  content: { padding: 20, paddingBottom: 40 },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 10,
  },
  emptyEmoji: { fontSize: 64 },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  emptyDesc: { fontSize: 14, color: Colors.textSecondary, textAlign: "center" },
  startBtn: {
    flexDirection: "row",
    backgroundColor: Colors.workout,
    borderRadius: 24,
    paddingHorizontal: 36,
    paddingVertical: 14,
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    ...CARD_SHADOW,
  },
  startBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  sessionTitle: { fontSize: 22, fontWeight: "700", color: Colors.textPrimary },
  sessionSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  endBtn: {
    backgroundColor: Colors.success + "28",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  endBtnText: { fontSize: 14, fontWeight: "700", color: Colors.success },
  addExBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    ...CARD_SHADOW,
  },
  addExText: { fontSize: 14, fontWeight: "600", color: Colors.workout },
  exerciseCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    ...CARD_SHADOW,
  },
  exHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  exName: { fontSize: 16, fontWeight: "700", color: Colors.textPrimary },
  exCategory: {
    fontSize: 12,
    color: Colors.workout,
    backgroundColor: Colors.workout + "28",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  setHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceAlt,
  },
  setHeaderText: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "600",
    textAlign: "center",
  },
  setRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  setRowDone: { opacity: 0.6 },
  setNumWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
    flex: 0.5,
  },
  setNumWrapDone: { backgroundColor: Colors.success },
  setNumText: { fontSize: 12, fontWeight: "600", color: Colors.textSecondary },
  textDone: { textDecorationLine: "line-through", color: Colors.textMuted },
  setText: { fontSize: 14, color: Colors.textPrimary, textAlign: "center" },
  noSetText: {
    fontSize: 13,
    color: Colors.textMuted,
    textAlign: "center",
    paddingVertical: 8,
  },
  settingTagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingTop: 12,
  },
  settingTag: {
    backgroundColor: Colors.primary + "22",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  settingTagText: { fontSize: 11, color: Colors.primary, fontWeight: "600" },
  tipBox: {
    backgroundColor: Colors.warning + "22",
    borderRadius: 12,
    padding: 10,
    marginTop: 10,
  },
  tipText: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },

  // Calendar tab
  summaryCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    ...CARD_SHADOW,
  },
  summaryLeft: { gap: 4 },
  summaryMonth: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  summaryDetail: { fontSize: 18, fontWeight: "700", color: Colors.textPrimary },
  summaryEmoji: { fontSize: 36 },
  calendarCard: {
    backgroundColor: Colors.surface,
    borderRadius: 22,
    overflow: "hidden",
    marginBottom: 20,
    ...CARD_SHADOW,
  },
  selectedLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  noWorkoutCard: {
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 24,
    alignItems: "center",
    gap: 8,
    ...CARD_SHADOW,
  },
  noWorkoutEmoji: { fontSize: 36 },
  noWorkoutText: { fontSize: 14, color: Colors.textMuted },
});

const h = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 22,
    marginBottom: 12,
    overflow: "hidden",
    ...CARD_SHADOW,
  },

  // 헤더
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 13,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceAlt,
  },
  summary: { fontSize: 13, fontWeight: "600", color: Colors.textSecondary },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  headerVol: { fontSize: 13, fontWeight: "700", color: Colors.workout },
  headerCal: { fontSize: 12, fontWeight: "700", color: Colors.danger },

  // 바디
  body: { paddingHorizontal: 18, paddingBottom: 4 },

  // 종목 블록
  exBlock: { paddingVertical: 16 },
  exBlockDivider: { borderTopWidth: 1, borderTopColor: Colors.surfaceAlt },

  // 종목명 + 카테고리
  exHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  exName: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.textPrimary,
    flexShrink: 1,
  },
  catTag: {
    backgroundColor: Colors.workout + "28",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  catTagText: { fontSize: 11, fontWeight: "700", color: Colors.workout },

  // 세트 테이블
  setsTable: { gap: 6, marginBottom: 10 },
  setRow: { flexDirection: "row", alignItems: "center" },
  setLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textMuted,
    width: 40,
  },
  setVal: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textPrimary,
    flex: 1,
  },
  setResult: { fontSize: 13, fontWeight: "500", color: Colors.textSecondary },

  // 기구 설정 태그
  settingTagsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
    marginBottom: 8,
  },
  settingTag: {
    backgroundColor: Colors.primary + "22",
    borderRadius: 20,
    paddingHorizontal: 9,
    paddingVertical: 3,
  },
  settingTagText: { fontSize: 10, fontWeight: "600", color: Colors.primary },

  // 팁
  tipRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: Colors.warning + "28",
    borderRadius: 12,
    padding: 10,
    marginBottom: 4,
  },
  tipText: {
    fontSize: 12,
    color: Colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },

  // 총 볼륨 + 칼로리 푸터
  footer: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceAlt,
    paddingVertical: 14,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
  },
  footerLabel: { fontSize: 12, fontWeight: "600", color: Colors.textMuted },
  footerVol: { fontSize: 17, fontWeight: "800", color: Colors.workout },
  footerCal: { fontSize: 15, fontWeight: "700", color: Colors.danger },
});
