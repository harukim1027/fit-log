import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWaterStore } from '../store/waterStore';
import { Colors } from '../constants/colors';

const PRESETS = [150, 200, 250, 500];

export default function WaterTracker() {
  const { total, target, addWater, resetWater } = useWaterStore();
  const progress = Math.min(total / target, 1);
  const cups = Math.floor(total / 250);

  return (
    <View style={s.card}>
      <View style={s.header}>
        <View style={s.titleRow}>
          <Text style={s.icon}>💧</Text>
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
          <View key={i} style={[s.cup, i < cups && s.cupFilled]}>
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
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  icon: { fontSize: 18 },
  title: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  progressRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4, marginBottom: 8 },
  totalText: { fontSize: 22, fontWeight: '700', color: '#4BA3E3' },
  targetText: { fontSize: 14, color: Colors.textSecondary },
  progressBg: { height: 8, backgroundColor: Colors.surfaceAlt, borderRadius: 4, overflow: 'hidden', marginBottom: 12 },
  progressFill: { height: '100%', backgroundColor: '#4BA3E3', borderRadius: 4 },
  cupsRow: { flexDirection: 'row', gap: 6, marginBottom: 14 },
  cup: { flex: 1, alignItems: 'center' },
  cupFilled: {},
  cupEmoji: { fontSize: 20 },
  presets: { flexDirection: 'row', gap: 8 },
  presetBtn: { flex: 1, backgroundColor: '#4BA3E3' + '15', borderRadius: 10, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#4BA3E3' + '30' },
  presetText: { fontSize: 13, fontWeight: '600', color: '#4BA3E3' },
});
