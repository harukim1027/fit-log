/**
 * @file components/workout/ActiveWorkoutBar.tsx
 * @description 운동 중(activeSession != null)일 때 탭바 위에 전역 표시되는 미니 바.
 *   다른 탭(홈/통계 등)에 있어도 "운동 진행 중 · 경과 시간 · 계속하기"를 보여주고,
 *   탭하면 운동 탭으로 이동한다. 운동 탭에 있을 때는 중복 방지로 숨긴다.
 *   (tabs)/_layout 한 곳에서만 렌더 — 각 화면에 개별 배치하지 않는다.
 */
import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { useRouter, usePathname } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useShallow } from "zustand/react/shallow";
import { useWorkoutStore } from "../../store/workoutStore";
import { useColors } from "../../constants/colors";
import { Icon } from "../AppIcons";

export function ActiveWorkoutBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { activeSession, sessionStartTime } = useWorkoutStore(
    useShallow((s) => ({ activeSession: s.activeSession, sessionStartTime: s.sessionStartTime }))
  );

  const [elapsed, setElapsed] = useState(0);

  // 경과 시간: sessionStartTime(ms) 기준 매초 갱신 (앱의 durationMinutes 계산과 동일 기준)
  useEffect(() => {
    if (!sessionStartTime) { setElapsed(0); return; }
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - sessionStartTime) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [sessionStartTime]);

  // 운동 탭에 있을 땐 표시 안 함 (중복 방지)
  const isOnWorkoutTab = !!pathname && pathname.includes("workout");
  if (!activeSession || isOnWorkoutTab) return null;

  const totalSets = activeSession.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const completedSets = activeSession.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((st) => st.completed).length,
    0
  );

  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  const timeStr = h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;

  return (
    <TouchableOpacity
      onPress={() => router.push("/(tabs)/workout")}
      activeOpacity={0.9}
      accessibilityRole="button"
      accessibilityLabel="운동 진행 중, 운동 화면으로 이동"
      style={{
        position: "absolute",
        // 탭바(높이 72 + 하단 안전영역) 위로 띄움
        bottom: insets.bottom + 82,
        left: 12,
        right: 12,
        backgroundColor: c.primary,
        borderRadius: 16,
        paddingHorizontal: 14,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
        zIndex: 999,
      }}>
      <View style={{
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: "rgba(255,255,255,0.22)",
        alignItems: "center", justifyContent: "center",
      }}>
        <Icon name="dumbbell" size={20} color="#fff" />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: "#fff", fontWeight: "900", fontSize: 14, fontVariant: ["tabular-nums"] }}>
          운동 진행 중 · {timeStr}
        </Text>
        <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 11, marginTop: 2, fontVariant: ["tabular-nums"] }}>
          {activeSession.exercises.length}종목 · {completedSets}/{totalSets}세트
        </Text>
      </View>
      <View style={{
        paddingHorizontal: 12, paddingVertical: 6,
        backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 999,
      }}>
        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 12 }}>계속하기</Text>
      </View>
    </TouchableOpacity>
  );
}
