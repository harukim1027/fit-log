/**
 * @file components/home/RecoveryStatusCard.tsx
 * @description 홈 상단 "오늘 추천 부위" 카드 — 부위별 회복 상태를 신호등으로 표시.
 * 신호등 색상은 status별 고정(categoryColor와 별개). 표시만 하며 운동을 막지 않는다.
 */
import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useWorkoutStore } from '../../store/workoutStore';
import { useRecoverySettingsStore } from '../../store/recoverySettingsStore';
import { getAllCategoryRecoveries, RecoveryStatus } from '../../utils/recovery';
import { useColors } from '../../constants/colors';

const STATUS_LABEL: Record<RecoveryStatus, string> = {
  ready: '운동 가능',
  caution: '주의',
  rest: '휴식 필요',
};

// 신호등 색상 (status 고정값)
const STATUS_DOT: Record<RecoveryStatus, string> = {
  ready: '#4FA98C', // 🟢 초록
  caution: '#E89B4F', // 🟡 주황
  rest: '#EF5E80', // 🔴 빨강
};

const STATUS_ORDER: Record<RecoveryStatus, number> = { ready: 0, caution: 1, rest: 2 };

export function RecoveryStatusCard() {
  const c = useColors();
  const router = useRouter();
  const sessions = useWorkoutStore((s) => s.sessions);
  const getRecoveryHours = useRecoverySettingsStore((s) => s.getHours);
  // 커스텀 회복 시간이 바뀌면 재계산되도록 구독 (getHours는 안정 참조라 deps에 부족)
  const customHours = useRecoverySettingsStore((s) => s.customHours);

  const recoveries = useMemo(
    () => getAllCategoryRecoveries(sessions, getRecoveryHours),
    [sessions, getRecoveryHours, customHours],
  );

  const sorted = useMemo(
    () => [...recoveries].sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]),
    [recoveries],
  );

  const readyCount = recoveries.filter((r) => r.status === 'ready').length;

  return (
    <View
      style={{
        padding: 16,
        backgroundColor: c.surface,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: c.border,
      }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}>
        <View>
          <Text style={{ fontSize: 16, fontWeight: '900', color: c.textPrimary }}>
            오늘 추천 부위
          </Text>
          <Text style={{ fontSize: 12, color: c.textSecondary, marginTop: 2 }}>
            {readyCount}개 부위가 운동 가능해요
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/modal/recovery-settings')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: c.primary }}>설정</Text>
        </TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {sorted.map((rec) => (
          <View
            key={rec.category}
            style={{
              padding: 12,
              borderRadius: 12,
              backgroundColor: c.surfaceAlt,
              marginRight: 8,
              minWidth: 80,
              alignItems: 'center',
            }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <View
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: 4,
                  backgroundColor: STATUS_DOT[rec.status],
                }}
              />
              <Text style={{ fontSize: 13, fontWeight: '800', color: c.textPrimary }}>
                {rec.category}
              </Text>
            </View>
            <Text style={{ fontSize: 10, color: c.textSecondary }}>
              {STATUS_LABEL[rec.status]}
            </Text>
            {rec.hoursSinceLastWorkout !== null && (
              <Text style={{ fontSize: 9, color: c.textMuted, marginTop: 2 }}>
                {Math.floor(rec.hoursSinceLastWorkout)}h 전
              </Text>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
