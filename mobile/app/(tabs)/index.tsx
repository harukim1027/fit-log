import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useDietStore } from '../../store/dietStore';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/colors';
import CalorieRing from '../../components/CalorieRing';
import WaterTracker from '../../components/WaterTracker';
import { useWaterStore } from '../../store/waterStore';

export default function HomeScreen() {
  const router = useRouter();
  const { getTotalCalories, targetCalories, getTodayDiet, fetchDiet, summary } = useDietStore();
  const { activeSession, getTodaySession, startSession, fetchSessions } = useWorkoutStore();
  const { user } = useAuthStore();

  const { fetchTotal } = useWaterStore();

  useEffect(() => {
    fetchDiet();
    fetchSessions();
    fetchTotal();
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

  return (
    <SafeAreaView style={s.container}>
      <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
        <View style={s.header}>
          <View>
            <Text style={s.greeting}>{user?.name ?? ''}님 안녕하세요 👋</Text>
            <Text style={s.date}>{new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}</Text>
          </View>
          <TouchableOpacity style={s.settingBtn} onPress={() => router.push('/modal/set-target' as any)}>
            <Ionicons name="settings-outline" size={22} color={Colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={s.card}>
          <View style={s.cardTitleRow}>
            <Text style={s.cardTitle}>오늘의 칼로리</Text>
            <TouchableOpacity onPress={() => router.push('/modal/set-target' as any)}>
              <Text style={s.editText}>목표 수정</Text>
            </TouchableOpacity>
          </View>

          <View style={s.ringRow}>
            <CalorieRing consumed={consumed} target={target} size={160} />
            <View style={s.ringInfo}>
              <InfoRow label="섭취" value={consumed + ' kcal'} color={Colors.diet} />
              <InfoRow label="목표" value={target + ' kcal'} color={Colors.primary} />
              <InfoRow label="잔여" value={remaining + ' kcal'} color={remaining === 0 ? Colors.danger : Colors.textSecondary} />
            </View>
          </View>

          <View style={s.macroRow}>
            <MacroChip label="탄수화물" value={carbs + 'g'} color="#FFB347" />
            <MacroChip label="단백질" value={protein + 'g'} color="#6C63FF" />
            <MacroChip label="지방" value={fat + 'g'} color="#FF6584" />
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

        <WaterTracker />

        <Text style={s.sectionTitle}>빠른 기록</Text>
        <View style={s.quickRow}>
          <QuickButton label="식단 추가" icon="nutrition" color={Colors.diet} onPress={() => router.push('/modal/add-food')} />
          <QuickButton label="운동 시작" icon="barbell" color={Colors.workout} onPress={() => { if (!activeSession) startSession(); router.push('/(tabs)/workout'); }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={ir.row}>
      <Text style={ir.label}>{label}</Text>
      <Text style={[ir.value, { color }]}>{value}</Text>
    </View>
  );
}

function MacroChip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={mc.chip}>
      <View style={[mc.dot, { backgroundColor: color }]} />
      <Text style={mc.label}>{label}</Text>
      <Text style={[mc.value, { color }]}>{value}</Text>
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
  settingBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.surface, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border },
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  cardTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary },
  editText: { fontSize: 13, color: Colors.primary },
  ringRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  ringInfo: { flex: 1, paddingLeft: 20, gap: 12 },
  macroRow: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 16, borderTopWidth: 1, borderTopColor: Colors.border },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  workoutText: { fontSize: 16, color: Colors.textPrimary, fontWeight: '500' },
  emptyText: { fontSize: 14, color: Colors.textMuted },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.textSecondary, marginBottom: 12, marginTop: 8 },
  quickRow: { flexDirection: 'row', gap: 12 },
});
const ir = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 13, color: Colors.textSecondary },
  value: { fontSize: 14, fontWeight: '700' },
});
const mc = StyleSheet.create({
  chip: { alignItems: 'center', flex: 1 },
  dot: { width: 8, height: 8, borderRadius: 4, marginBottom: 4 },
  label: { fontSize: 11, color: Colors.textSecondary, marginBottom: 2 },
  value: { fontSize: 14, fontWeight: '700' },
});
const qb = StyleSheet.create({
  btn: { flex: 1, backgroundColor: Colors.surface, borderRadius: 16, padding: 20, alignItems: 'center', borderWidth: 1 },
  iconWrap: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
});
