/**
 * @file components/home/CoachInsightCard.tsx
 * @description 홈 "오늘의 코치 한마디" 카드. 회복 카드 아래 배치.
 *
 * 회복 카드(24~72h 단기 회복)와 달리 1~4주 누적 패턴을 한 문장으로 보여준다.
 * 서버가 하루 1회만 LLM을 호출(캐시), 카드 X 닫으면 그날은 안 보인다(로컬 dismiss).
 */
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColors } from '../../constants/colors';
import { getCoachToday, CoachInsight } from '../../lib/apiClient';
import { useWorkoutStore } from '../../store/workoutStore';

const DISMISS_KEY = 'coach_dismiss_date';
const todayKST = () =>
  new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);

export function CoachInsightCard() {
  const c = useColors();
  const router = useRouter();
  const startSession = useWorkoutStore((s) => s.startSession);
  const activeSession = useWorkoutStore((s) => s.activeSession);

  const [insight, setInsight] = useState<CoachInsight | null>(null);
  const [loading, setLoading] = useState(true);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      // 오늘 dismiss 했으면 표시 안 함
      const dismissed = await AsyncStorage.getItem(DISMISS_KEY);
      if (dismissed === todayKST()) {
        if (alive) {
          setHidden(true);
          setLoading(false);
        }
        return;
      }
      try {
        const data = await getCoachToday();
        if (alive) setInsight(data);
      } catch {
        if (alive) setInsight(null); // 에러 시 조용히 숨김
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const dismiss = async () => {
    setHidden(true);
    await AsyncStorage.setItem(DISMISS_KEY, todayKST());
  };

  const onAction = () => {
    switch (insight?.actionTarget) {
      case 'workout_start':
        if (!activeSession) startSession();
        router.push('/(tabs)/workout');
        break;
      case 'add_exercise':
        router.push('/modal/add-exercises');
        break;
      case 'history':
        router.push('/(tabs)/workout');
        break;
    }
  };

  if (hidden) return null;

  // 로딩: 자리만 잡는 얇은 카드 (깜빡임 최소화)
  if (loading) {
    return (
      <View
        style={{
          padding: 16,
          backgroundColor: c.surface,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: c.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
        }}>
        <ActivityIndicator size="small" color={c.primary} />
        <Text style={{ fontSize: 13, color: c.textMuted }}>코치가 분석 중…</Text>
      </View>
    );
  }

  if (!insight) return null; // 에러/빈 상태

  return (
    <View
      style={{
        padding: 16,
        backgroundColor: c.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: '900', color: c.primary, flex: 1 }}>
          💬 오늘의 코치 한마디
        </Text>
        <TouchableOpacity onPress={dismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: c.textMuted }}>✕</Text>
        </TouchableOpacity>
      </View>

      <Text style={{ fontSize: 15, fontWeight: '700', color: c.textPrimary, lineHeight: 22 }}>
        {insight.message}
      </Text>

      {!!insight.actionLabel && !!insight.actionTarget && (
        <TouchableOpacity
          onPress={onAction}
          style={{
            marginTop: 12,
            alignSelf: 'flex-start',
            backgroundColor: c.primary,
            paddingHorizontal: 16,
            paddingVertical: 9,
            borderRadius: 12,
          }}>
          <Text style={{ fontSize: 13, fontWeight: '800', color: c.onAccent }}>
            {insight.actionLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
