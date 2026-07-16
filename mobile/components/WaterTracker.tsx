import { useState } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useWaterStore } from '../store/waterStore';
import { WaterMascot, WaterDrop, Icon } from './AppIcons';
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
        <TouchableOpacity activeOpacity={0.8} onPress={() => resetWater()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="refresh" size={18} color={c.textMuted} />
        </TouchableOpacity>
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
