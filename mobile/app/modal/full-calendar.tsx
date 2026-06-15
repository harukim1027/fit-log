/**
 * @file app/modal/full-calendar.tsx
 * @description 월간 "기록 캘린더" 풀스크린 모달.
 * 각 날짜 셀에 운동 시간/소모 칼로리 + 부위별 완료 세트 수를 색 막대로 표시.
 */
import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useShallow } from "zustand/react/shallow";
import { useWorkoutStore } from "../../store/workoutStore";
import { useColors } from "../../constants/colors";
import { Icon } from "../../components/AppIcons";
import { getMuscleSetCountsForDate } from "../../utils/workout";
import { useCategoryColor } from "../../store/categoryColorStore";
import { DEFAULT_CATEGORY_COLORS } from "../../constants/categoryColors";
import { WorkoutSession } from "../../types/workout";

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

const pad2 = (n: number) => String(n).padStart(2, "0");

export default function FullCalendarScreen() {
  const router = useRouter();
  const c = useColors();
  const { sessions, fetchSessions, setHistoryJumpDate } = useWorkoutStore(
    useShallow((s) => ({
      sessions: s.sessions,
      fetchSessions: s.fetchSessions,
      setHistoryJumpDate: s.setHistoryJumpDate,
    }))
  );
  const [monthOffset, setMonthOffset] = useState(0);
  const getColor = useCategoryColor();

  useEffect(() => {
    if (sessions.length === 0) fetchSessions();
  }, []);

  // 표시 대상 월 (0=이번달, -1=지난달)
  const target = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth() + monthOffset, 1);
  }, [monthOffset]);

  const monthData = useMemo(() => {
    const year = target.getFullYear();
    const month = target.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    const result: {
      date: number;
      dateStr: string;
      sessions: WorkoutSession[];
      duration: number;
      calories: number;
      muscleCounts: Record<string, number>;
    }[] = [];
    for (let d = 1; d <= lastDay; d++) {
      const dateStr = `${year}-${pad2(month + 1)}-${pad2(d)}`;
      const daySessions = sessions.filter((s) => s.date.slice(0, 10) === dateStr);
      result.push({
        date: d,
        dateStr,
        sessions: daySessions,
        duration: daySessions.reduce((sum, s) => sum + (s.durationMinutes ?? 0), 0),
        calories: daySessions.reduce((sum, s) => sum + (s.caloriesBurned ?? 0), 0),
        muscleCounts: getMuscleSetCountsForDate(daySessions),
      });
    }
    return result;
  }, [target, sessions]);

  // 1일의 요일 (월=0 ~ 일=6) → 앞쪽 빈칸 개수
  const firstDayOfWeek = (target.getDay() + 6) % 7;
  const emptySlots = Array(firstDayOfWeek).fill(null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={["top", "bottom"]}>
      {/* 헤더 */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingVertical: 14,
        }}>
        <Text style={{ fontSize: 22, fontWeight: "900", color: c.textPrimary }}>
          기록 캘린더
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="close" size={26} color={c.textPrimary} />
        </TouchableOpacity>
      </View>

      {/* 월 네비게이션 */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 24,
          marginBottom: 12,
        }}>
        <TouchableOpacity
          onPress={() => setMonthOffset((o) => o - 1)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Text style={{ fontSize: 22, fontWeight: "800", color: c.textSecondary }}>◀</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: "800", color: c.textPrimary }}>
          {target.getFullYear()}년 {target.getMonth() + 1}월
        </Text>
        <TouchableOpacity
          onPress={() => setMonthOffset((o) => Math.min(0, o + 1))}
          disabled={monthOffset >= 0}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={{ opacity: monthOffset >= 0 ? 0.3 : 1 }}>
          <Text style={{ fontSize: 22, fontWeight: "800", color: c.textSecondary }}>▶</Text>
        </TouchableOpacity>
      </View>

      {/* 부위 색 범례 */}
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: 10,
          paddingHorizontal: 16,
          marginBottom: 10,
          justifyContent: "center",
        }}>
        {Object.keys(DEFAULT_CATEGORY_COLORS).map((m) => (
          <View
            key={m}
            style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
            <View
              style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: getColor(m) }}
            />
            <Text style={{ fontSize: 11, color: c.textSecondary }}>{m}</Text>
          </View>
        ))}
      </View>

      {/* 요일 헤더 */}
      <View style={{ flexDirection: "row", paddingHorizontal: 8 }}>
        {WEEKDAYS.map((d) => (
          <Text
            key={d}
            style={{
              flex: 1,
              textAlign: "center",
              fontSize: 12,
              fontWeight: "700",
              color: c.textMuted,
            }}>
            {d}
          </Text>
        ))}
      </View>

      {/* 달력 그리드 */}
      <ScrollView contentContainerStyle={{ padding: 8, paddingBottom: 32 }}>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {emptySlots.map((_, i) => (
            <View key={`empty-${i}`} style={{ width: "14.28%", minHeight: 96 }} />
          ))}
          {monthData.map((day) => {
            const entries = Object.entries(day.muscleCounts);
            const worked = day.sessions.length > 0;
            // 운동한 날만 탭 가능 → 히스토리 탭의 해당 날짜로 점프
            const Cell: any = worked ? TouchableOpacity : View;
            const cellProps = worked
              ? {
                  activeOpacity: 0.7,
                  onPress: () => {
                    setHistoryJumpDate(day.dateStr);
                    router.back();
                  },
                }
              : {};
            return (
              <Cell
                key={day.date}
                {...cellProps}
                style={{
                  width: "14.28%",
                  minHeight: 96,
                  padding: 4,
                  borderTopWidth: 1,
                  borderTopColor: c.surfaceAlt,
                  backgroundColor: worked ? c.surface : "transparent",
                }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "700",
                    color: worked ? c.textPrimary : c.textMuted,
                    marginBottom: 2,
                  }}>
                  {day.date}
                </Text>
                {worked && (
                  <>
                    <Text style={{ fontSize: 9, color: c.textSecondary }}>
                      {Math.floor(day.duration / 60)}h {day.duration % 60}m
                    </Text>
                    {day.calories > 0 && (
                      <Text style={{ fontSize: 9, color: c.danger, marginBottom: 2 }}>
                        {day.calories} kcal
                      </Text>
                    )}
                    {entries.slice(0, 3).map(([m, count]) => (
                      <View
                        key={m}
                        style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                        <View
                          style={{ width: 2, height: 10, backgroundColor: getColor(m) }}
                        />
                        <Text style={{ fontSize: 8, color: c.textSecondary }} numberOfLines={1}>
                          {m}
                        </Text>
                        <Text
                          style={{ fontSize: 8, fontWeight: "700", color: c.textPrimary }}>
                          {count}
                        </Text>
                      </View>
                    ))}
                    {entries.length > 3 && (
                      <Text style={{ fontSize: 8, color: c.textMuted }}>
                        +{entries.length - 3}
                      </Text>
                    )}
                  </>
                )}
              </Cell>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
