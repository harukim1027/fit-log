/**
 * @file app/modal/recovery-settings.tsx
 * @description 부위별 회복 시간(시간 단위) 설정 화면. -/+ 4시간 단위로 조정,
 * 기본값과 다르면 행별 "초기화", 하단 "전체 기본값 복원". setHours/reset 즉시 반영.
 */
import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useColors } from '../../constants/colors';
import { Icon } from '../../components/AppIcons';
import { useRecoverySettingsStore } from '../../store/recoverySettingsStore';
import { DEFAULT_RECOVERY_HOURS } from '../../constants/recoveryHours';

const STEP = 4;
const MIN = 4;
const MAX = 168;

export default function RecoverySettingsScreen() {
  const c = useColors();
  const router = useRouter();
  const customHours = useRecoverySettingsStore((s) => s.customHours);
  const getHours = useRecoverySettingsStore((s) => s.getHours);
  const setHours = useRecoverySettingsStore((s) => s.setHours);
  const reset = useRecoverySettingsStore((s) => s.reset);

  const categories = Object.keys(DEFAULT_RECOVERY_HOURS);
  const hasAnyCustom = Object.keys(customHours).length > 0;

  const adjust = (cat: string, delta: number) => {
    const next = Math.min(MAX, Math.max(MIN, getHours(cat) + delta));
    setHours(cat, next);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }} edges={['top', 'bottom']}>
      {/* 헤더 */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          paddingVertical: 14,
        }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Icon name="close" size={26} color={c.textPrimary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '900', color: c.textPrimary }}>회복 시간 설정</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <Text style={{ fontSize: 13, color: c.textMuted, marginBottom: 16, lineHeight: 19 }}>
          부위별 회복 시간을 조정할 수 있어요. 일반 가이드라인일 뿐이며, 권장이지 금지가 아니에요.
        </Text>

        {categories.map((cat) => {
          const hours = getHours(cat);
          const isCustom = customHours[cat] != null;
          return (
            <View
              key={cat}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: c.surface,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: c.border,
                padding: 14,
                marginBottom: 10,
              }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '800', color: c.textPrimary }}>{cat}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <Text style={{ fontSize: 12, color: c.textSecondary }}>{hours}시간</Text>
                  {isCustom && (
                    <TouchableOpacity onPress={() => reset(cat)} hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: c.primary }}>초기화</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => adjust(cat, -STEP)}
                  disabled={hours <= MIN}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: c.danger + '20',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: hours <= MIN ? 0.4 : 1,
                  }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: c.danger }}>−</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => adjust(cat, STEP)}
                  disabled={hours >= MAX}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: c.success + '20',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: hours >= MAX ? 0.4 : 1,
                  }}>
                  <Text style={{ fontSize: 18, fontWeight: '900', color: c.success }}>＋</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        })}

        {hasAnyCustom && (
          <TouchableOpacity
            onPress={() => categories.forEach((cat) => reset(cat))}
            style={{
              marginTop: 8,
              paddingVertical: 14,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: c.border,
              alignItems: 'center',
            }}>
            <Text style={{ fontSize: 14, fontWeight: '800', color: c.textSecondary }}>
              전체 기본값으로 복원
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
