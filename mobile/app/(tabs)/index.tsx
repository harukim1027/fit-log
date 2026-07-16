import React, { useEffect, useRef, useMemo, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Animated } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { useRouter } from "expo-router";
import { useWorkoutStore } from "../../store/workoutStore";
import { useAuthStore } from "../../store/authStore";
import { useShallow } from "zustand/react/shallow";
import { Icon, FaceAvatar, FlameIcon } from "../../components/AppIcons";
import { useColors } from "../../constants/colors";
import { ThemeToggle } from "../../components/ui";
import MuscleMap, { MUSCLE_MAP, MUSCLE_LABELS, CATEGORY_TO_SLUGS } from "../../components/MuscleMap";
import type { Slug } from "react-native-body-highlighter";
import type { WorkoutSession } from "../../types/workout";
import { toKg } from "../../utils/workout";

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

/**
 * Formats a volume in kilograms, using tons for volumes of at least 1,000 kilograms.
 *
 * @param kg - The volume in kilograms
 * @returns The formatted volume with a `t` or `kg` suffix
 */
function fmtVol(kg: number): string {
  return kg >= 1000 ? `${(kg / 1000).toFixed(1)}t` : `${Math.round(kg)}kg`;
}

/**
 * Creates a darker version of a hexadecimal color.
 *
 * @param hex - The hexadecimal color value.
 * @param amt - The amount by which to darken the color, from 0 to 1.
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

/**
 * Renders the home screen with weekly activity, recent workout records, and muscle coverage.
 *
 * Provides workout filtering, navigation to workout and statistics screens, and a control for
 * starting or resuming a workout.
 */
export default function HomeScreen() {
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
  const [filter, setFilter] = useState<string>('전체');

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

  // 유리처럼 부유해 보이지 않게 — 옅은 검정 그림자로 바닥에 붙은 느낌
  const SHADOW_SM = {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
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

  // ── 이번 주(일~토) 스트립 데이터 ──
  const weekDays = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayYMD = toYMD(today);
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - today.getDay());
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
        ymd,
        isToday: ymd === todayYMD,
        isFuture: ymd > todayYMD,
        hasSession: daySessions.length > 0,
        pct,
      };
    });
  }, [sessions]);

  // 이번 주 운동한 일수 / 목표
  const doneDays = weekDays.filter((d) => d.hasSession).length;
  const weekGoal = user?.weeklyGoal ?? 4;

  const { prEntry, prSessionDate, weekMuscles } = useMemo(() => {
    const today = new Date();
    const day = today.getDay();
    const mon = new Date(today);
    mon.setDate(today.getDate() - ((day + 6) % 7));
    mon.setHours(0, 0, 0, 0);
    const start = mon;

    const weekSessions = sessions.filter((s) => new Date(s.date + "T00:00:00") >= start);
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
  }, [sessions]);

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

  const monthTitle = `${new Date().getFullYear()}년 ${new Date().getMonth() + 1}월`;

  const startWorkout = () => {
    if (!activeSession) startSession();
    router.push("/(tabs)/workout");
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {/* ── 헤더: 월 타이틀(표시용) + 테마토글 + 아바타 ── */}
      <View style={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 6, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={{ fontSize: 22, fontWeight: "900", color: c.textPrimary, letterSpacing: -0.5 }}>{monthTitle}</Text>
          <Icon name="chevronDown" size={18} color={c.textPrimary} />
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <ThemeToggle size={38} />
          <TouchableOpacity
            style={[{ width: 46, height: 46, borderRadius: 16, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }, SHADOW_SM]}
            onPress={() => router.push("/modal/set-target" as any)}>
            <FaceAvatar size={28} color={c.onAccent} />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── 주간 스트립 (일~토, 완료도 링) ── */}
      <View style={{ flexDirection: "row", paddingHorizontal: 14, paddingTop: 6, paddingBottom: 10, gap: 2 }}>
        {weekDays.map((d) => {
          const R = 16, CIRC = 2 * Math.PI * R;
          const isSun = d.dow === '일';
          return (
            <View key={d.ymd} style={{ flex: 1, alignItems: "center", gap: 6 }}>
              <Text style={{ fontSize: 12, fontWeight: "700", color: isSun ? c.tagCoral : c.textSecondary }}>{d.dow}</Text>
              <View style={{ width: 40, height: 40, alignItems: "center", justifyContent: "center" }}>
                {d.isToday ? (
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
                <Text style={{
                  fontSize: 15,
                  fontWeight: "800",
                  color: d.isToday ? c.onAccent : d.isFuture ? c.textMuted : c.textPrimary,
                }}>
                  {d.num}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 4, paddingBottom: 120, gap: 14 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag">

        {/* ── 요약 알약 + 필터 칩 ── */}
        <Animated.View style={{ opacity: fadeAnims[0], transform: [{ translateY: slideAnims[0] }], gap: 12 }}>
          <TouchableOpacity
            style={[{ flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.surface, borderRadius: 18, paddingHorizontal: 18, paddingVertical: 15, borderWidth: 1, borderColor: c.border }, SHADOW_SM]}
            onPress={() => router.push("/(tabs)/stats")}
            activeOpacity={0.85}>
            <FlameIcon size={18} />
            <Text style={{ fontSize: 15, fontWeight: "800", color: c.textPrimary, flex: 1, letterSpacing: -0.3 }}>이번 주 운동</Text>
            <Text style={{ fontSize: 15, fontWeight: "800", color: c.primary, fontVariant: ["tabular-nums"] }}>{doneDays}/{weekGoal}</Text>
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
                  activeOpacity={0.8}
                  style={{
                    paddingHorizontal: 15,
                    paddingVertical: 9,
                    borderRadius: 999,
                    backgroundColor: on ? c.textPrimary : c.surface,
                    borderWidth: 1,
                    borderColor: on ? c.textPrimary : c.border,
                  }}>
                  <Text style={{ fontSize: 13.5, fontWeight: "700", color: on ? c.background : c.textSecondary, letterSpacing: -0.2 }}>{label}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Animated.View>

        {/* ── 최근 기록 (상단 색 워시 카드 그리드) ── */}
        <Animated.View style={{ opacity: fadeAnims[1], transform: [{ translateY: slideAnims[1] }] }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 4, paddingBottom: 10 }}>
            <Icon name="trophy" size={17} color={c.tagSun} />
            <Text style={{ fontSize: 17, fontWeight: "800", color: c.textPrimary, letterSpacing: -0.4 }}>최근 기록</Text>
            <Text style={{ fontSize: 15, fontWeight: "700", color: c.textMuted }}>{recentSessions.length}</Text>
            <View style={{ flex: 1 }} />
            <TouchableOpacity style={{ flexDirection: "row", alignItems: "center", gap: 2 }} onPress={() => router.push("/(tabs)/stats")}>
              <Text style={{ fontSize: 12, fontWeight: "800", color: c.primary }}>전체 보기</Text>
              <Icon name="chevronRight" size={12} color={c.primary} />
            </TouchableOpacity>
          </View>

          {recentSessions.length > 0 ? (
            <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
              {recentSessions.map((s) => {
                const cat = s.exercises[0]?.category;
                const wash = categoryColor(cat);
                const isPR = !!prSessionDate && s.date === prSessionDate;
                const badge = isPR ? "PR" : `${s.exercises.length}종목`;
                return (
                  <View key={s.id} style={[{ width: "48%", marginBottom: 11, backgroundColor: c.surface, borderRadius: 16, overflow: "hidden" }, SHADOW_SM]}>
                    {/* 상단 색 워시 헤더 */}
                    <View style={{ backgroundColor: wash, paddingHorizontal: 13, paddingTop: 13, paddingBottom: 26 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={{ fontSize: 12.5, fontWeight: "800", color: "#FFFFFF" }}>{formatDate(s.date)}</Text>
                        <View style={{ backgroundColor: darken(wash, 0.2), borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 11, fontWeight: "800", color: "#FFFFFF" }}>{badge}</Text>
                        </View>
                      </View>
                      <Text style={{ position: "absolute", right: 12, top: 10, color: "#FFFFFF", fontWeight: "900", fontSize: 14 }}>⋮</Text>
                    </View>
                    {/* 본문(헤더 위로 겹침) */}
                    <View style={{ paddingHorizontal: 12, paddingBottom: 12, marginTop: -14 }}>
                      <View style={{ backgroundColor: c.surface, borderRadius: 13, padding: 11, gap: 3 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                          <Icon name="dumbbell" size={15} color={wash} />
                          <Text style={{ flex: 1, fontSize: 15, fontWeight: "800", color: c.textPrimary, lineHeight: 19 }} numberOfLines={2}>
                            {sessionTitle(s)}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: "800", color: wash, fontVariant: ["tabular-nums"] }}>
                          {fmtVol(getTotalVolume(s))}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          ) : (
            <View style={[{ backgroundColor: c.surface, borderRadius: 16, padding: 24, alignItems: "center", borderWidth: 1, borderColor: c.border }, SHADOW_SM]}>
              <Icon name="dumbbell" size={32} color={c.textMuted} />
              <Text style={{ fontSize: 12, fontWeight: "700", color: c.textMuted, marginTop: 8 }}>
                {filter === '전체' ? "아직 운동 기록이 없어요" : `${filter} 운동 기록이 없어요`}
              </Text>
            </View>
          )}
        </Animated.View>

        {/* ── 이번 주 자극 부위 (MuscleMap 재사용) ── */}
        <Animated.View style={{ opacity: fadeAnims[2], transform: [{ translateY: slideAnims[2] }], overflow: 'visible' }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 7, paddingHorizontal: 4, paddingBottom: 10 }}>
            <Icon name="dumbbell" size={17} color={c.primary} />
            <Text style={{ fontSize: 17, fontWeight: "800", color: c.textPrimary, letterSpacing: -0.4 }}>이번 주 자극 부위</Text>
            <Text style={{ fontSize: 15, fontWeight: "700", color: c.textMuted, fontVariant: ["tabular-nums"] }}>{majorHit}/{MAJOR_MUSCLES.length}</Text>
          </View>
          <View style={[{ backgroundColor: c.surface, borderRadius: 20, padding: 16, borderWidth: 1, borderColor: c.border, overflow: 'visible' }, SHADOW_SM]}>
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

      {/* ── FAB (+): 운동 시작/이어하기 ── */}
      <TouchableOpacity
        onPress={startWorkout}
        activeOpacity={0.85}
        style={{
          position: "absolute",
          right: 20,
          bottom: 28,
          width: 60,
          height: 60,
          borderRadius: 999,
          backgroundColor: c.primary,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.35,
          shadowRadius: 16,
          elevation: 8,
        }}>
        <Icon name="plus" size={30} color={c.onAccent} />
      </TouchableOpacity>
    </View>
  );
}
