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

export default function HomeScreen() {
  const router = useRouter();
  const { getTotalCalories, targetCalories, getTodayDiet, fetchDiet, summary } = useDietStore();
  const { activeSession, getTodaySession, startSession, fetchSessions } = useWorkoutStore();
  const { user } = useAuthStore();
  const { fetchTotal } = useWaterStore();

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
  const protein = summary?.protein ?? 0;
  const carbs = summary?.carbs ?? 0;
  const fat = summary?.fat ?? 0;
  const totalMacro = (protein + carbs + fat) || 1;

  const today = new Date().toLocaleDateString("ko-KR", { month: "long", day: "numeric", weekday: "short" });

  return (
    <View style={{ flex: 1, backgroundColor: '#EFFAF4' }}>
      {/* 배경 블롭 */}
      <View style={{ position: 'absolute', width: 200, height: 200, borderRadius: 100, backgroundColor: '#CFF3E7', top: -50, right: -40, opacity: 0.5 }} />
      <View style={{ position: 'absolute', width: 150, height: 150, borderRadius: 75, backgroundColor: '#FFE6CC', bottom: 260, left: -50, opacity: 0.45 }} />
      <View style={{ position: 'absolute', width: 120, height: 120, borderRadius: 60, backgroundColor: '#DCEEFF', top: 330, right: -30, opacity: 0.4 }} />

      {/* 헤더 */}
      <View style={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 }}>
            <SparkIcon size={13} color="#7E9A90" />
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#7E9A90' }}>{today}</Text>
          </View>
          <Text style={{ fontSize: 22, fontWeight: '900', color: '#34514A', letterSpacing: -0.5, lineHeight: 28 }}>
            {user?.name ? `${user.name}님,` : '안녕하세요,'}{'\n'}오늘도 토닥토닥!
          </Text>
        </View>
        <TouchableOpacity
          style={[{ width: 50, height: 50, borderRadius: 18, backgroundColor: '#6FD3B6', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '6deg' }] }, SHADOW_SM]}
          onPress={() => router.push("/modal/set-target" as any)}>
          <FaceAvatar size={30} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 18, paddingBottom: 40, gap: 14 }}>

        {/* ── 칼로리 히어로 카드 ── */}
        <Animated.View style={{ opacity: fadeAnims[0], transform: [{ translateY: slideAnims[0] }] }}>
          <View style={[{ backgroundColor: '#fff', borderRadius: 30, padding: 18 }, SHADOW]}>
            {/* 상단: 제목 + 목표수정 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#7E9A90' }}>오늘의 칼로리</Text>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#E7F7F0', paddingHorizontal: 11, paddingVertical: 6, borderRadius: 999 }}
                onPress={() => router.push("/modal/set-target" as any)}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#2E9E83' }}>목표 수정</Text>
                <Icon name="chevronRight" size={12} color="#2E9E83" />
              </TouchableOpacity>
            </View>

            {/* 링 + 영양소 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              {/* 링 박스 */}
              <View style={{ position: 'relative', width: 150, height: 150, flexShrink: 0 }}>
                <CalorieRing consumed={consumed} target={target} size={150} />
                {/* 말풍선 배지 */}
                <View style={{
                  position: 'absolute', top: 6, right: -4,
                  backgroundColor: '#FFC078', borderRadius: 14,
                  paddingHorizontal: 10, paddingVertical: 6,
                  transform: [{ rotate: '7deg' }],
                  shadowColor: 'rgba(255,170,90,0.35)', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 1, shadowRadius: 12, elevation: 3,
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                }}>
                  <FlameIcon size={12} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 11, fontWeight: '800' }}>{remaining} 남음</Text>
                </View>
              </View>

              {/* 영양소 3줄 */}
              <View style={{ flex: 1, paddingLeft: 6, gap: 9 }}>
                <MacroRow label="탄수화물" value={carbs} max={totalMacro} color="#FFC078" iconColor="#E6932F" />
                <MacroRow label="단백질" value={protein} max={totalMacro} color="#6FD3B6" iconColor="#2E9E83" />
                <MacroRow label="지방" value={fat} max={totalMacro} color="#FF9DB0" iconColor="#E76C86" />
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ── 오늘의 운동 카드 ── */}
        <Animated.View style={{ opacity: fadeAnims[1], transform: [{ translateY: slideAnims[1] }] }}>
          <View style={[{ backgroundColor: '#fff', borderRadius: 30, padding: 18 }, SHADOW]}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#7E9A90', marginBottom: 12 }}>오늘의 운동</Text>
            {todaySession ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                {/* 스티커 */}
                <View style={[{ width: 60, height: 60, borderRadius: 20, backgroundColor: '#FFF1E3', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }], flexShrink: 0 }, SHADOW_SM]}>
                  <Icon name="dumbbell" size={28} color="#E6932F" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#34514A' }}>
                    {exerciseCount}가지 운동 완료!
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 5 }}>
                    {[...Array(Math.min(exerciseCount, 5))].map((_, i) => (
                      <View key={i} style={{ width: 22, height: 22, borderRadius: 999, backgroundColor: '#6FD3B6', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon name="check" size={12} color="#fff" />
                      </View>
                    ))}
                    {todaySession.caloriesBurned ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#FFEBE2', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, marginLeft: 'auto' }}>
                        <FlameIcon size={11} color="#E6932F" />
                        <Text style={{ fontSize: 11, fontWeight: '800', color: '#E6932F' }}>{todaySession.caloriesBurned} kcal</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            ) : activeSession ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                <View style={[{ width: 60, height: 60, borderRadius: 20, backgroundColor: '#FFF1E3', alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '-8deg' }], flexShrink: 0 }, SHADOW_SM]}>
                  <Icon name="clock" size={28} color="#E6932F" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: '#34514A' }}>운동 중...</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#7E9A90', marginTop: 3 }}>
                    {activeSession.exercises.length}종목 기록 중
                  </Text>
                </View>
              </View>
            ) : (
              <View style={{ alignItems: 'center', paddingVertical: 10, gap: 6 }}>
                <Icon name="dumbbell" size={38} color="#B4CFC5" />
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#B4CFC5' }}>오늘 운동 기록이 없어요</Text>
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
            <BoltIcon size={15} color="#FFD36E" />
            <Text style={{ fontSize: 14, fontWeight: '900', color: '#34514A' }}>빠른 기록</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 13 }}>
            <TouchableOpacity
              style={[{ flex: 1, backgroundColor: '#fff', borderRadius: 26, padding: 18, alignItems: 'center', gap: 9, transform: [{ rotate: '-2deg' }] }, SHADOW]}
              onPress={() => router.push("/modal/add-food")}
              activeOpacity={0.8}>
              <View style={{ width: 56, height: 56, borderRadius: 20, backgroundColor: '#E7F7F0', alignItems: 'center', justifyContent: 'center' }}>
                <SaladIcon size={32} />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#34514A' }}>식단 추가</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[{ flex: 1, backgroundColor: '#fff', borderRadius: 26, padding: 18, alignItems: 'center', gap: 9, transform: [{ rotate: '2deg' }] }, SHADOW]}
              onPress={() => { if (!activeSession) startSession(); router.push("/(tabs)/workout"); }}
              activeOpacity={0.8}>
              <View style={{ width: 56, height: 56, borderRadius: 20, backgroundColor: '#FFF1E3', alignItems: 'center', justifyContent: 'center' }}>
                <Icon name="dumbbell" size={30} color="#E6932F" />
              </View>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#34514A' }}>운동 시작</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

      </ScrollView>
    </View>
  );
}

function MacroRow({ label, value, max, color, iconColor }: { label: string; value: number; max: number; color: string; iconColor: string }) {
  const pct = Math.min(value / max, 1);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
      <View style={{ width: 30, height: 30, borderRadius: 11, backgroundColor: color + '28', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: iconColor }} />
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 4 }}>
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#7E9A90' }}>{label}</Text>
          <Text style={{ fontSize: 12, fontWeight: '900', color: '#34514A' }}>{value}g</Text>
        </View>
        <View style={{ height: 7, borderRadius: 999, backgroundColor: '#E7F7F0', overflow: 'hidden' }}>
          <View style={{ height: '100%', borderRadius: 999, backgroundColor: color, width: `${pct * 100}%` as `${number}%` }} />
        </View>
      </View>
    </View>
  );
}
