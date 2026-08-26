import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useWaterStore } from '../store/waterStore';
import { WaterMascot, WaterDrop, Icon } from './AppIcons';
import { IconButton } from '../design-system';
import { useColors } from '../constants/colors';
import { NumberPad } from './ui/NumberPad';

const PRESETS = [150, 200, 250, 500];

export default function WaterTracker() {
  const c = useColors();
  const { total, target, addWater, resetWater } = useWaterStore();
  const [padVisible, setPadVisible] = useState(false);
  const progress = Math.min(total / target, 1);
  const cups = Math.floor(total / 250);

  const SHADOW = {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  };

  return (
    <View style={[{ backgroundColor: c.surface, borderRadius: 30, padding: 18 }, SHADOW]}>
      {/* 상단: 마스코트 + 수치 + 새로고침 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <WaterMascot size={56} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: c.primary }}>{total}</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: c.textSecondary }}>/ {target}ml</Text>
          </View>
          <Text style={{ fontSize: 12, fontWeight: '700', color: c.textSecondary, marginTop: 2 }}>
            오늘 {cups}잔째 · {progress >= 1 ? '목표 달성!' : '잘하고 있어요!'}
          </Text>
        </View>
        {/* hitSlop 모드. box(44)로 하면 이 행의 flex: 1 텍스트 블록이 26pt 줄어든다
            (18 → 44). 그 블록은 "오늘 N잔째 · 잘하고 있어요!" 한 줄을 담고 있어
            폭을 내주면 잘린다. 세로는 마스코트 56이 잡고 있어 어차피 안 변한다.

            기존 hitSlop 10 은 18 + 20 = 38 로 44에 못 미쳤다.
            계획서가 이 건을 "44 미달 0"으로 셌던 이유가 그 hitSlop 이다.

            조상에 overflow: hidden 이 없다 — 카드는 borderRadius 30 만 있고,
            overflow: hidden 을 가진 진행 바는 조상이 아니라 형제다.
            (계획서가 이 자리를 filled 로 오분류했던 것도 그 진행 바의
             backgroundColor 를 6줄 아래에서 빨아들였기 때문이다. 실제로는 plain.) */}
        <IconButton
          accessibilityLabel="물 기록 초기화"
          onPress={() => resetWater()}
          touchTargetMode="hitSlop">
          <Icon name="refresh" size={18} color={c.textMuted} />
        </IconButton>
      </View>

      {/* 진행 바 */}
      <View style={{ height: 8, borderRadius: 999, backgroundColor: c.surfaceAlt, overflow: 'hidden', marginTop: 12, marginBottom: 12 }}>
        <View style={{ height: '100%', borderRadius: 999, backgroundColor: c.secondary, width: `${progress * 100}%` as `${number}%` }} />
      </View>

      {/* 물방울 컵 8개 */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
        {[...Array(8)].map((_, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <WaterDrop size={22} filled={i < cups} />
          </View>
        ))}
      </View>

      {/* 프리셋 알약 + 직접 입력 */}
      <View style={{ flexDirection: 'row', gap: 7 }}>
        {PRESETS.map(amt => (
          <TouchableOpacity
            key={amt}
            style={{ flex: 1, backgroundColor: c.surfaceAlt, borderRadius: 999, paddingVertical: 9, alignItems: 'center' }}
            onPress={() => addWater(amt)}
            activeOpacity={0.7}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: c.primary }}>+{amt}ml</Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: c.primary + '18', borderRadius: 999, paddingVertical: 9, alignItems: 'center' }}
          onPress={() => setPadVisible(true)}
          activeOpacity={0.7}>
          <Text style={{ fontSize: 12, fontWeight: '800', color: c.primary }}>직접</Text>
        </TouchableOpacity>
      </View>

      <NumberPad
        visible={padVisible}
        value=""
        suffix="ml"
        decimal={false}
        max={5000}
        onConfirm={(v) => { addWater(parseInt(v) || 0); setPadVisible(false); }}
        onCancel={() => setPadVisible(false)}
      />
    </View>
  );
}
