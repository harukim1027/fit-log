import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWaterStore } from '../store/waterStore';
import { Colors } from '../constants/colors';

const PRESETS = [150, 200, 250, 500];

const CARD_SHADOW = {
  shadowColor: '#B4A0D8',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.09,
  shadowRadius: 12,
  elevation: 3,
};

export default function WaterTracker() {
  const { total, target, addWater, resetWater } = useWaterStore();
  const progress = Math.min(total / target, 1);
  const cups = Math.floor(total / 250);

  return (
    <View style={s.card}>
      <View style={s.header}>
        <View style={s.titleRow}>
          <View style={s.iconBg}>
            <Text style={s.icon}>💧</Text>
          </View>
          <Text style={s.title}>물 섭취</Text>
        </View>
        <TouchableOpacity onPress={() => resetWater()}>
          <Ionicons name="refresh-outline" size={18} color={Colors.textMuted} />
        </TouchableOpacity>
      </View>

      <View style={s.progressRow}>
        <Text style={s.totalText}>{total}ml</Text>
        <Text style={s.targetText}>/ {target}ml</Text>
      </View>

      <View style={s.progressBg}>
        <View style={[s.progressFill, { width: (progress * 100) + '%' }]} />
      </View>

      <View style={s.cupsRow}>
        {[...Array(8)].map((_, i) => (
          <View key={i} style={s.cup}>
            <Text style={s.cupEmoji}>{i < cups ? '💧' : '🫙'}</Text>
          </View>
        ))}
      </View>

      <View style={s.presets}>
        {PRESETS.map(amt => (
          <TouchableOpacity key={amt} style={s.presetBtn} onPress={() => addWater(amt)} activeOpacity={0.7}>
            <Text style={s.presetText}>+{amt}ml</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: 22, padding: 20, marginBottom: 16, ...CARD_SHADOW },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconBg: { width: 34, height: 34, borderRadius: 12, backgroundColor: Colors.water + '30', alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 16 },
  title: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  progressRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 10 },
  totalText: { fontSize: 22, fontWeight: '700', color: Colors.water },
  targetText: { fontSize: 14, color: Colors.textSecondary },
  progressBg: { height: 12, backgroundColor: Colors.surfaceAlt, borderRadius: 6, overflow: 'hidden', marginBottom: 14 },
  progressFill: { height: '100%', backgroundColor: Colors.water, borderRadius: 6 },
  cupsRow: { flexDirection: 'row', gap: 4, marginBottom: 14 },
  cup: { flex: 1, alignItems: 'center' },
  cupEmoji: { fontSize: 20 },
  presets: { flexDirection: 'row', gap: 8 },
  presetBtn: { flex: 1, backgroundColor: Colors.water + '22', borderRadius: 20, paddingVertical: 9, alignItems: 'center' },
  presetText: { fontSize: 12, fontWeight: '700', color: Colors.water },
});
