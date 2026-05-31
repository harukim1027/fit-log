import React, { useEffect, useRef } from "react";
import { View, Text, ScrollView, TouchableOpacity, Animated } from "react-native";
import { useRouter } from "expo-router";
import { useDietStore } from "../../store/dietStore";
import { useWorkoutStore } from "../../store/workoutStore";
import { useAuthStore } from "../../store/authStore";
import CalorieRing from "../../components/CalorieRing";
import WaterTracker from "../../components/WaterTracker";
import { useWaterStore } from "../../store/waterStore";
import { Icon, BoltIcon, FlameIcon, SaladIcon, FaceAvatar, SparkIcon } from "../../components/AppIcons";
import { useColors } from "../../constants/colors";
import { BackgroundBlobs } from "../../components/BackgroundBlobs";
import { ThemeToggle } from "../../components/ui";

export default function HomeScreen() {
  const router = useRouter();
  const c = useColors();
  const { getTotalCalories, targetCalories, getTodayDiet, fetchDiet, summary } = useDietStore();
  const { activeSession, sessionStartTime, getTodaySession, startSession, fetchSessions, getTotalVolume } = useWorkoutStore();
  const { user } = useAuthStore();
  const { fetchTotal } = useWaterStore();

  const SHADOW = {
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.20,
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

  const fadeAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(0))).current;
  const slideAnims = useRef([0, 1, 2, 3].map(() => new Animated.Value(24))).current;

  useEffect(() => {
    fetchDiet();
    fetchSessions();
    fetchTotal();
    Animated.stagger(90, fadeAnims.map((fade, i) =>
      Animated.parallel([
        Animated.spring(fade, { toValue: 1, useNativeDriver: true, damping: 20, stiffness: 120 }),
        Animated.spring(slideAnims[i], { toValue: 0, useNativeDriver: true, damping: 20, stiffness: 120 }),
      ])
    )).start();
  }, []);

  getTodayDiet();
  const consumed = getTotalCalories();
  const target = targetCalories;
  const remaining = Math.max(target - consumed, 0);
  const todaySession = getTodaySession();
  const exerciseCount = todaySession?.exercises.length ?? 0;
  const sessionDuration = todaySession?.durationMinutes ??
    (activeSession && sessionStartTime ? Math.round((Date.now() - sessionStartTime) / 60000) : 0);
  const sessionVolume = todaySession ? getTotalVolume(todaySession) : 0;

  const getMotivation = (mins: number) => {
    if (mins === 0) return "오늘 운동을 시작해볼까요? 🏋️";
    if (mins <= 20) return "좋은 시작이에요! 계속 해봐요 🔥";
    if (mins <= 40) return "잘 하고 있어요! 💪";
    if (mins <= 60) return "훌륭해요! 오늘도 최선을 다했네요 🌟";
    return "대단해요! 오늘의 챔피언 🏆";
  };
  const protein = summary?.protein ?? 0;
  const carbs = summary?.carbs ?? 0;
  const fat = summary?.fat ?? 0;
  const totalMacro = (protein + carbs + fat) || 1;

  const today = new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <BackgroundBlobs />

      {/* 헤더 */}
      <View style={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 }}>
            <SparkIcon size={13} color={c.textSecondary} />
            <Text style={{ fontSize: 13, fontWeight: '700', color: c.textSecondary }}>{today}</Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '900', color: c.textPrimary, letterSpacing: -0.5, lineHeight: 28 }}>
            {user?.name ? `${user.name}님,` : '안녕하세요,'}{'\n'}오늘도 토닥토닥!
          </Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <ThemeToggle size={38} />
          <TouchableOpacity
            style={[{ width: 50, height: 50, borderRadius: 18, backgroundColor: c.primary, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '6deg' }] }, SHADOW_SM]}
            onPress={() => router.push("/modal/set-target" as any)}>
            <FaceAvatar size={30} color={c.onAccent} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 18, paddingBottom: 40, gap: 14 }}>

        {/* ── 칼로리 히어로 카드 ── */}
        <Animated.View style={{ opacity: fadeAnims[0], transform: [{ translateY: slideAnims[0] }] }}>
          <View style={[{ backgroundColor: c.surface, borderRadius: 30, padding: 18 }, SHADOW]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: c.textSecondary }}>오늘의 칼로리</Text>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: c.surfaceAlt, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999 }}
                onPress={() => router.push("/modal/set-target" as any)}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: c.success }}>목표 수정</Text>
                <Icon name="chevronRight" size={12} color={c.success} />
              </TouchableOpacity>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={{ position: 'relative', width: 150, height: 150, flexShrink: 0 }}>
                <CalorieRing consumed={consumed} target={target} size={150} />
                <View style={{
                  position: 'absolute', top: 6, right: -4,
                  backgroundColor: c.warning, borderRadius: 14,
                  paddingHorizontal: 10, paddingVertical: 6,
                  transform: [{ rotate: '7deg' }],
                  shadowColor: c.warning, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 3,
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                }}>
                  <FlameIcon size={12} color={c.onAccent} />
                  <Text style={{ color: c.onAccent, fontSize: 11, fontWeight: '800' }}>{remaining} 남음</Text>
                </View>
              </View>

              <View style={{ flex: 1, paddingLeft: 6, gap: 9 }}>
                <MacroRow label="탄수화물" value={carbs} max={totalMacro} color={c.carb} iconColor={c.warning} />
                <MacroRow label="단백질" value={protein} max={totalMacro} color={c.protein} iconColor={c.primary} />
                <MacroRow label="지방" value={fat} max={totalMacro} color={c.fat} iconColor={c.danger} />
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ── 오늘의 운동 카드 ── */}
        <Animated.View style={{ opacity: fadeAnims[1], transform: [{ translateY: slideAnims[1] }] }}>
          <View style={[{ backgroundColor: c.surface, borderRadius: 30, padding: 18 }, SHADOW]}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: c.textSecondary, marginBottom: 12 }}>오늘의 운동</Text>
            {todaySession || activeSession ? (
              <View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 10 }}>
                  <View style={[{ width: 60, height: 60, borderRadius: 20, backgroundColor: c.warning + '18', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }], flexShrink: 0 }, SHADOW_SM]}>
                    <Icon name="dumbbell" size={28} color={c.warning} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 32, fontWeight: '900', color: c.textPrimary, letterSpacing: -1 }}>
                      {sessionDuration}<Text style={{ fontSize: 16, fontWeight: '700', color: c.textSecondary }}>분</Text>
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: '700', color: c.success, marginTop: 1 }}>
                      {getMotivation(sessionDuration)}
                    </Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {sessionVolume > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.surfaceAlt, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }}>
                      <Icon name="dumbbell" size={12} color={c.success} />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: c.success }}>{sessionVolume.toLocaleString()}kg</Text>
                    </View>
                  )}
                  {(todaySession?.caloriesBurned ?? 0) > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.warning + '20', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }}>
                      <FlameIcon size={12} color={c.warning} />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: c.warning }}>{todaySession!.caloriesBurned} kcal</Text>
                    </View>
                  )}
                  {activeSession && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: c.surfaceAlt, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 }}>
                      <Icon name="clock" size={12} color={c.textSecondary} />
                      <Text style={{ fontSize: 12, fontWeight: '800', color: c.textSecondary }}>진행 중</Text>
                    </View>
                  )}
                </View>
              </View>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 10, gap: 6 }}>
                <Icon name="dumbbell" size={38} color={c.textMuted} />
                <Text style={{ fontSize: 12, fontWeight: '700', color: c.textMuted }}>오늘 운동 기록이 없어요</Text>
              </View>
            )}
          </View>
        </Animated.View>

        {/* ── 물 카드 ── */}
        <Animated.View style={{ opacity: fadeAnims[2], transform: [{ translateY: slideAnims[2] }] }}>
          <WaterTracker />
        </Animated.View>

        {/* ── 빠른 기록 ── */}
        <Animated.View style={{ opacity: fadeAnims[3], transform: [{ translateY: slideAnims[3] }] }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10, marginLeft: 2 }}>
            <BoltIcon size={15} color={c.stats} />
            <Text style={{ fontSize: 14, fontWeight: '900', color: c.textPrimary }}>빠른 기록</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 13 }}>
            <TouchableOpacity
              style={[{ flex: 1, backgroundColor: c.surface, borderRadius: 26, padding: 18, alignItems: 'center', gap: 9, transform: [{ rotate: '-2deg' }] }, SHADOW]}
              onPress={() => router.push("/modal/add-food")}
              activeOpacity={0.8}>
              <View style={{ width: 56, height: 56, borderRadius: 20, backgroundColor: c.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
                <SaladIcon size={32} />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: c.textPrimary }}>식단 추가</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[{ flex: 1, backgroundColor: c.surface, borderRadius: 26, padding: 18, alignItems: 'center', gap: 9, transform: [{ rotate: '2deg' }] }, SHADOW]}
              onPress={() => { if (!activeSession) startSession(); router.push("/(tabs)/workout"); }}
              activeOpacity={0.8}>
              <View style={{ width: 56, height: 56, borderRadius: 20, backgroundColor: c.warning + '18', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="dumbbell" size={30} color={c.warning} />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: c.textPrimary }}>운동 시작</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

      </ScrollView>
    </View>
  );
}

function MacroRow({ label, value, max, color, iconColor }: { label: string; value: number; max: number; color: string; iconColor: string }) {
  const c = useColors();
  const pct = Math.min(value / max, 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
      <View style={{ width: 30, height: 30, borderRadius: 11, backgroundColor: color + '28', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: iconColor }} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: c.textSecondary }}>{label}</Text>
          <Text style={{ fontSize: 12, fontWeight: '900', color: c.textPrimary }}>{value}g</Text>
        </View>
        <View style={{ height: 7, borderRadius: 999, backgroundColor: c.surfaceAlt, overflow: 'hidden' }}>
          <View style={{ height: '100%', borderRadius: 999, backgroundColor: color, width: `${pct * 100}%` as `${number}%` }} />
        </View>
      </View>
    </View>
  );
}
