import React, { useEffect, useRef, useMemo } from "react";
import { View, Text, ScrollView, TouchableOpacity, Animated } from "react-native";
import { useRouter } from "expo-router";
import { useWorkoutStore } from "../../store/workoutStore";
import { useAuthStore } from "../../store/authStore";
import { Icon, FaceAvatar, SparkIcon } from "../../components/AppIcons";
import { useColors } from "../../constants/colors";
import { BackgroundBlobs } from "../../components/BackgroundBlobs";
import { ThemeToggle, LabelTag } from "../../components/ui";
import MuscleMap, { MUSCLE_MAP, MUSCLE_LABELS, CATEGORY_TO_SLUGS } from "../../components/MuscleMap";
import type { Slug } from "react-native-body-highlighter";
import type { WorkoutSession } from "../../types/workout";

const MAJOR_MUSCLES = ['chest', 'upper-back', 'deltoids', 'abs', 'quadriceps', 'gluteal'];

function eunNeun(s: string) {
  const code = s.charCodeAt(s.length - 1) - 0xAC00;
  return code >= 0 && code % 28 !== 0 ? '은' : '는';
}

function getWeekBounds() {
  const now = new Date();
  const day = now.getDay();
  const mon = new Date(now);
  mon.setDate(now.getDate() - ((day + 6) % 7));
  mon.setHours(0, 0, 0, 0);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 7);
  return { start: mon, end: sun };
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

export default function HomeScreen() {
  const router = useRouter();
  const c = useColors();
  const { sessions, activeSession, startSession, fetchSessions, getTotalVolume } = useWorkoutStore();
  const { user } = useAuthStore();

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

  const SHADOW = {
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 4,
  };
  const SHADOW_SM = {
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.14,
    shadowRadius: 14,
    elevation: 3,
  };

  const { prEntry, weekMuscles } = useMemo(() => {
    const { start, end } = getWeekBounds();
    const weekSessions = sessions.filter((s) => {
      const d = new Date(s.date + "T00:00:00");
      return d >= start && d < end;
    });
    const prevSessions = sessions.filter((s) => {
      const d = new Date(s.date + "T00:00:00");
      return d < start;
    });

    const prevMax: Record<string, number> = {};
    for (const sess of prevSessions) {
      for (const ex of sess.exercises) {
        const max = Math.max(0, ...ex.sets.map((st) => st.weight));
        if (max > (prevMax[ex.name] ?? 0)) prevMax[ex.name] = max;
      }
    }

    let prEntry: { name: string; weight: number; reps: number; date: string } | null = null;
    for (const sess of [...weekSessions].sort((a, b) => b.date.localeCompare(a.date))) {
      for (const ex of sess.exercises) {
        const best = ex.sets.reduce(
          (b, st) => (st.weight > b.weight ? st : b),
          { weight: 0, reps: 0, id: "", completed: false }
        );
        if (best.weight > 0 && best.weight > (prevMax[ex.name] ?? 0)) {
          if (!prEntry) prEntry = { name: ex.name, weight: best.weight, reps: best.reps, date: sess.date };
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
    const weekMuscles = Array.from(weekMuscleSet);

    return { prEntry, weekMuscles };
  }, [sessions]);

  const recentSession = useMemo(() => {
    const completed = sessions.filter((s) => !activeSession || s.id !== activeSession.id);
    return completed.sort((a, b) => b.date.localeCompare(a.date))[0] ?? null;
  }, [sessions, activeSession]);

  const today = new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });

  const weekMuscleSet = new Set(weekMuscles);
  const missingMajor = MAJOR_MUSCLES.find(m => !weekMuscleSet.has(m));
  const muscleHint = weekMuscles.length === 0
    ? "이번 주 첫 운동을 기록해보세요"
    : missingMajor
      ? `${MUSCLE_LABELS[missingMajor as Slug] ?? missingMajor}${eunNeun(MUSCLE_LABELS[missingMajor as Slug] ?? missingMajor)} 이번 주 아직이에요!`
      : "전신 골고루 자극했어요!";

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <BackgroundBlobs />

      {/* 헤더 */}
      <View style={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 10, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 3 }}>
            <SparkIcon size={13} color={c.textSecondary} />
            <Text style={{ fontSize: 13, fontWeight: "700", color: c.textSecondary }}>{today}</Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: "900", color: c.textPrimary, letterSpacing: -0.5 }}>
            {user?.name ? `${user.name}님, 안녕!` : "안녕하세요!"}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ThemeToggle size={38} />
          <TouchableOpacity
            style={[{ width: 50, height: 50, borderRadius: 18, backgroundColor: c.primary, alignItems: "center", justifyContent: "center", transform: [{ rotate: "6deg" }] }, SHADOW_SM]}
            onPress={() => router.push("/modal/set-target" as any)}>
            <FaceAvatar size={30} color={c.onAccent} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 18, paddingBottom: 40, gap: 14 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">

        {/* ── 빠른 액션 ── */}
        <Animated.View style={{ opacity: fadeAnims[0], transform: [{ translateY: slideAnims[0] }] }}>
          <View style={{ flexDirection: "row", gap: 12 }}>
            <TouchableOpacity
              style={[{ flex: 1, backgroundColor: c.surface, borderRadius: 20, padding: 16, alignItems: "center", gap: 10, borderWidth: 1, borderColor: c.border, transform: [{ rotate: "-1.5deg" }] }, SHADOW_SM]}
              onPress={() => { if (!activeSession) startSession(); router.push("/(tabs)/workout"); }}
              activeOpacity={0.8}>
              <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: c.primary + "22", alignItems: "center", justifyContent: "center" }}>
                <Icon name="dumbbell" size={26} color={c.primary} />
              </View>
              <Text style={{ fontSize: 12, fontWeight: "800", color: c.textPrimary }}>운동 시작</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[{ flex: 1, backgroundColor: c.surface, borderRadius: 20, padding: 16, alignItems: "center", gap: 10, borderWidth: 1, borderColor: c.border, transform: [{ rotate: "1.5deg" }] }, SHADOW_SM]}
              onPress={() => router.push("/modal/routine-manage" as any)}
              activeOpacity={0.8}>
              <View style={{ width: 46, height: 46, borderRadius: 16, backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center" }}>
                <Icon name="list" size={24} color={c.textSecondary} />
              </View>
              <Text style={{ fontSize: 12, fontWeight: "800", color: c.textPrimary }}>루틴 관리</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── 최근 기록 ── */}
        <Animated.View style={{ opacity: fadeAnims[1], transform: [{ translateY: slideAnims[1] }], overflow: 'visible' }}>
          <View style={{ position: 'relative', overflow: 'visible', height: 20, marginBottom: 16, marginTop: 14 }}>
            <LabelTag label="최근 기록" color={c.tagMint} />
            <TouchableOpacity
              style={{ position: 'absolute', right: 0, top: 0, flexDirection: "row", alignItems: "center", gap: 3 }}
              onPress={() => router.push("/(tabs)/stats")}>
              <Text style={{ fontSize: 12, fontWeight: "800", color: c.primary }}>전체 보기</Text>
              <Icon name="chevronRight" size={12} color={c.primary} />
            </TouchableOpacity>
          </View>

          {prEntry && (
            <View style={[{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surface, borderRadius: 16, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: c.border }, SHADOW_SM]}>
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: c.warning + "28", alignItems: "center", justifyContent: "center", transform: [{ rotate: "-6deg" }] }}>
                <Icon name="trophy" size={20} color={c.warning} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "800", color: c.textPrimary }}>{prEntry.name} PR 경신!</Text>
                <Text style={{ fontSize: 11, fontWeight: "600", color: c.textSecondary, marginTop: 1 }}>
                  {formatDate(prEntry.date)} · {prEntry.weight}kg × {prEntry.reps}
                </Text>
              </View>
              <Text style={{ fontSize: 14, fontWeight: "900", color: c.primary }}>{prEntry.weight}kg</Text>
            </View>
          )}

          {recentSession ? (
            <View style={[{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: c.border }, SHADOW_SM]}>
              <View style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: c.primary + "20", alignItems: "center", justifyContent: "center", transform: [{ rotate: "-6deg" }] }}>
                <Icon name="dumbbell" size={20} color={c.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: "800", color: c.textPrimary }}>{sessionTitle(recentSession)}</Text>
                <Text style={{ fontSize: 11, fontWeight: "600", color: c.textSecondary, marginTop: 1 }}>
                  {formatDate(recentSession.date)} · {recentSession.exercises.length}종목 · {getTotalVolume(recentSession).toLocaleString()}kg
                </Text>
              </View>
              <Text style={{ fontSize: 12, fontWeight: "700", color: c.textSecondary }}>{recentSession.durationMinutes}분</Text>
            </View>
          ) : (
            <View style={[{ backgroundColor: c.surface, borderRadius: 16, padding: 24, alignItems: "center", borderWidth: 1, borderColor: c.border }, SHADOW_SM]}>
              <Icon name="dumbbell" size={32} color={c.textMuted} />
              <Text style={{ fontSize: 12, fontWeight: "700", color: c.textMuted, marginTop: 8 }}>아직 운동 기록이 없어요</Text>
            </View>
          )}
        </Animated.View>

        {/* ── 이번 주 자극 부위 ── */}
        <Animated.View style={{ opacity: fadeAnims[2], transform: [{ translateY: slideAnims[2] }], overflow: 'visible' }}>
          <View style={[{ backgroundColor: c.surface, borderRadius: 24, padding: 16, paddingTop: 28, borderWidth: 1, borderColor: c.border, overflow: 'visible' }, SHADOW_SM]}>
            <LabelTag label="이번 주 자극 부위" color={c.tagSun} />
            <MuscleMap muscles={weekMuscles} scale={0.55} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: c.border }}>
              <Icon
                name={weekMuscles.length === 0 ? "dumbbell" : missingMajor ? "target" : "check"}
                size={13}
                color={weekMuscles.length === 0 ? c.textMuted : missingMajor ? c.warning : c.success}
              />
              <Text style={{ fontSize: 12, fontWeight: '700', color: weekMuscles.length === 0 ? c.textMuted : missingMajor ? c.warning : c.success }}>
                {muscleHint}
              </Text>
            </View>
          </View>
        </Animated.View>

      </ScrollView>
    </View>
  );
}
