import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useDietStore } from '../../store/dietStore';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/colors';

export default function HomeScreen() {
    const router = useRouter();
  const { getTotalCalories, targetCalories, getTodayDiet } = useDietStore();
  const { activeSession, getTodaySession, startSession } = useWorkoutStore();
  const { user } = useAuthStore();

  getTodayDiet();
  const consumed = getTotalCalories();
  const target = targetCalories;
  const progress = Math.min(consumed / target, 1);
  const todaySession = getTodaySession();
  const exerciseCount = todaySession?.exercises.length ?? 0;

  return (
    <SafeAreaView style={s.container}>
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.header}>
        <View>
          <Text style={s.greeting}>{user?.name ?? ''}님 안녕하세요 👋</Text>
          <Text style={s.date}>{new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}</Text>
        </View>
      </View>
      <View style={s.card}>
        <Text style={s.cardTitle}>오늘의 칼로리</Text>
        <View style={s.ringArea}>
          <Text style={s.ringCalorie}>{consumed}</Text>
          <Text style={s.ringLabel}>/ {target} kcal</Text>
        </View>
        <View style={s.progressBg}>
          <View style={[s.progressFill, { width: (progress * 100) + '%' }]} />
        </View>
        <View style={s.macroRow}>
          <MacroChip label="섭취" value={consumed + " kcal"} color={Colors.diet} />
          <MacroChip label="목표" value={target + " kcal"} color={Colors.primary} />
          <MacroChip label="잔여" value={Math.max(target - consumed, 0) + " kcal"} color={Colors.textSecondary} />
        </View>
      </View>
      <View style={s.card}>
        <Text style={s.cardTitle}>오늘의 운동</Text>
        {todaySession ? (
          <View style={s.row}>
            <Ionicons name="checkmark-circle" size={24} color={Colors.success} />
            <Text style={s.workoutText}>{exerciseCount}가지 운동 완료</Text>
          </View>
        ) : activeSession ? (
          <View style={s.row}>
            <Ionicons name="timer-outline" size={24} color={Colors.warning} />
            <Text style={s.workoutText}>운동 중... {activeSession.exercises.length}종목</Text>
          </View>
        ) : (
          <Text style={s.emptyText}>오늘 운동 기록이 없어요</Text>
        )}
      </View>
      <Text style={s.sectionTitle}>빠른 기록</Text>
      <View style={s.quickRow}>
        <QuickButton label="식단 추가" icon="nutrition" color={Colors.diet} onPress={() => router.push('/modal/add-food')} />
        <QuickButton label="운동 시작" icon="barbell" color={Colors.workout} onPress={() => { if (!activeSession) startSession(); router.push('/(tabs)/workout'); }} />
      </View>
    </ScrollView>
    </SafeAreaView>
  );
}

function MacroChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={mc.chip}>
      <Text style={[mc.label, { color }]}>{label}</Text>
      <Text style={mc.value}>{value}</Text>
    </View>
  );
}

function QuickButton({ label, icon, color, onPress }: { label: string; icon: any; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity style={[qb.btn, { borderColor: color + '40' }]} onPress={onPress} activeOpacity={0.7}>
      <View style={[qb.iconWrap, { backgroundColor: color + '20' }]}>
        <Ionicons name={icon} size={28} color={color} />
      </View>
      <Text style={qb.label}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  header: { marginBottom: 24, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { fontSize: 26, fontWeight: '700', color: Colors.textPrimary },
  date: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary, marginBottom: 16 },
  ringArea: { alignItems: 'center', marginBottom: 12 },
  ringCalorie: { fontSize: 40, fontWeight: '700', color: Colors.textPrimary },
  ringLabel: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  progressBg: { height: 8, backgroundColor: Colors.surfaceAlt, borderRadius: 4, overflow: 'hidden', marginBottom: 16 },
  progressFill: { height: '100%', backgroundColor: Colors.diet, borderRadius: 4 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  workoutText: { fontSize: 16, color: Colors.textPrimary, fontWeight: '500' },
  emptyText: { fontSize: 14, color: Colors.textMuted },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary, marginBottom: 12, marginTop: 8 },
  quickRow: { flexDirection: 'row', gap: 12 },
});
const mc = StyleSheet.create({
  chip: { alignItems: 'center', flex: 1 },
  label: { fontSize: 11, fontWeight: '600', marginBottom: 2 },
  value: { fontSize: 13, color: Colors.textPrimary, fontWeight: '500' },
});
const qb = StyleSheet.create({
  btn: { flex: 1, backgroundColor: Colors.surface, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1 },
  iconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
});
