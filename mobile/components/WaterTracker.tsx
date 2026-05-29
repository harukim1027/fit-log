import { View, Text, TouchableOpacity } from 'react-native';
import { useWaterStore } from '../store/waterStore';
import { WaterMascot, WaterDrop, Icon } from './AppIcons';

const PRESETS = [150, 200, 250, 500];

const SHADOW = {
  shadowColor: "#4EBFA0",
  shadowOffset: { width: 0, height: 10 },
  shadowOpacity: 0.20,
  shadowRadius: 24,
  elevation: 4,
};

export default function WaterTracker() {
  const { total, target, addWater, resetWater } = useWaterStore();
  const progress = Math.min(total / target, 1);
  const cups = Math.floor(total / 250);

  return (
    <View style={[{ backgroundColor: '#fff', borderRadius: 30, padding: 18 }, SHADOW]}>
      {/* 상단: 마스코트 + 수치 + 새로고침 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <WaterMascot size={56} />
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
            <Text style={{ fontSize: 20, fontWeight: '900', color: '#3F8DD6' }}>{total}</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#7E9A90' }}>/ {target}ml</Text>
          </View>
          <Text style={{ fontSize: 12, fontWeight: '700', color: '#7E9A90', marginTop: 2 }}>
            오늘 {cups}잔째 · {progress >= 1 ? '목표 달성!' : '잘하고 있어요!'}
          </Text>
        </View>
        <TouchableOpacity onPress={() => resetWater()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Icon name="refresh" size={18} color="#B4CFC5" />
        </TouchableOpacity>
      </View>

      {/* 진행 바 */}
      <View style={{ height: 8, borderRadius: 999, backgroundColor: '#E7F7F0', overflow: 'hidden', marginTop: 12, marginBottom: 12 }}>
        <View style={{ height: '100%', borderRadius: 999, backgroundColor: '#8FC7F5', width: `${progress * 100}%` as `${number}%` }} />
      </View>

      {/* 물방울 컵 8개 */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
        {[...Array(8)].map((_, i) => (
          <View key={i} style={{ flex: 1, alignItems: 'center' }}>
            <WaterDrop size={22} filled={i < cups} />
          </View>
        ))}
      </View>

      {/* 프리셋 알약 */}
      <View style={{ flexDirection: 'row', gap: 7 }}>
        {PRESETS.map(amt => (
          <TouchableOpacity
            key={amt}
            style={{ flex: 1, backgroundColor: '#EAF4FF', borderRadius: 999, paddingVertical: 9, alignItems: 'center' }}
            onPress={() => addWater(amt)}
            activeOpacity={0.7}>
            <Text style={{ fontSize: 12, fontWeight: '800', color: '#3F8DD6' }}>+{amt}ml</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}
