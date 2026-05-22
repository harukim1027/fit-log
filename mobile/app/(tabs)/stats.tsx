import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDietStore } from '../../store/dietStore';
import { useWorkoutStore } from '../../store/workoutStore';
import { useAuthStore } from '../../store/authStore';
import { Colors } from '../../constants/colors';

export default function StatsScreen() {
  const { dailyDiets, targetCalories } = useDietStore();
  const { sessions } = useWorkoutStore();
  const { user, logout } = useAuthStore();

  const last7 = [...Array(7)].map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return d.toISOString().split('T')[0];
  });

  const avgCalories = last7.reduce((sum, date) => {
    const diet = dailyDiets.find(d => d.date === date);
    if (!diet) return sum;
    return sum + diet.meals.reduce((s, m) => s + m.foods.reduce((f, food) => f + food.calories, 0), 0);
  }, 0) / 7;

  const totalVolume = sessions.reduce((sum, s) =>
    sum + s.exercises.reduce((es, ex) =>
      es + ex.sets.reduce((ss, st) => ss + st.weight * st.reps, 0), 0), 0);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>

        <View style={s.header}>
          <View>
            <Text style={s.title}>통계</Text>
            <Text style={s.subtitle}>{user?.name ?? ''}</Text>
          </View>
          <TouchableOpacity style={s.logoutBtn} onPress={logout}>
            <Ionicons name="log-out-outline" size={20} color={Colors.danger} />
            <Text style={s.logoutText}>로그아웃</Text>
          </TouchableOpacity>
        </View>

        <View style={s.summaryRow}>
          <StatCard label="7일 평균" value={String(Math.round(avgCalories))} unit="kcal" color={Colors.diet} />
          <StatCard label="총 운동" value={String(sessions.length)} unit="회" color={Colors.workout} />
          <StatCard label="총 볼륨" value={String(Math.round(totalVolume / 100) / 10)} unit="ton" color={Colors.stats} />
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>주간 칼로리</Text>
          <View style={s.barChart}>
            {last7.map(date => {
              const diet = dailyDiets.find(d => d.date === date);
              const cal = diet?.meals.reduce((s, m) => s + m.foods.reduce((f, food) => f + food.calories, 0), 0) ?? 0;
              const h = Math.min((cal / targetCalories) * 80, 80);
              const day = new Date(date).toLocaleDateString('ko-KR', { weekday: 'short' });
              return (
                <View key={date} style={s.barCol}>
                  <Text style={s.barValue}>{cal > 0 ? cal : ''}</Text>
                  <View style={s.barBg}>
                    <View style={[s.barFill, { height: h, backgroundColor: cal > targetCalories ? Colors.danger : Colors.diet }]} />
                  </View>
                  <Text style={s.barDay}>{day}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={s.card}>
          <Text style={s.cardTitle}>최근 운동</Text>
          {sessions.length === 0 ? (
            <Text style={s.emptyText}>운동 기록이 없어요</Text>
          ) : (
            sessions.slice(-5).reverse().map(session => {
              const vol = session.exercises.reduce((sum, ex) =>
                sum + ex.sets.reduce((s, st) => s + st.weight * st.reps, 0), 0);
              return (
                <View key={session.id} style={s.sessionRow}>
                  <View>
                    <Text style={s.sessionDate}>{new Date(session.date).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })}</Text>
                    <Text style={s.sessionDetail}>{session.exercises.length}종목 · {vol.toLocaleString()}kg</Text>
                  </View>
                  <View style={s.exTagRow}>
                    {session.exercises.slice(0, 2).map(ex => (
                      <Text key={ex.id} style={s.exTag}>{ex.name}</Text>
                    ))}
                    {session.exercises.length > 2 && <Text style={s.exTagMore}>+{session.exercises.length - 2}</Text>}
                  </View>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ label, value, unit, color }: { label: string; value: string; unit: string; color: string }) {
  return (
    <View style={[sc.card, { borderColor: color + '30' }]}>
      <Text style={sc.label}>{label}</Text>
      <Text style={[sc.value, { color }]}>{value}</Text>
      <Text style={sc.unit}>{unit}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 26, fontWeight: '700', color: Colors.textPrimary },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: Colors.danger + '10', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.danger + '30' },
  logoutText: { fontSize: 14, fontWeight: '600', color: Colors.danger },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  cardTitle: { fontSize: 15, fontWeight: '600', color: Colors.textSecondary, marginBottom: 16 },
  barChart: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 120 },
  barCol: { alignItems: 'center', flex: 1 },
  barValue: { fontSize: 9, color: Colors.textMuted, marginBottom: 4 },
  barBg: { width: 20, height: 80, backgroundColor: Colors.surfaceAlt, borderRadius: 4, justifyContent: 'flex-end', overflow: 'hidden' },
  barFill: { width: '100%', borderRadius: 4 },
  barDay: { fontSize: 11, color: Colors.textSecondary, marginTop: 6 },
  emptyText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingVertical: 12 },
  sessionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderTopWidth: 1, borderTopColor: Colors.border },
  sessionDate: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  sessionDetail: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  exTagRow: { flexDirection: 'row', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end', maxWidth: 160 },
  exTag: { fontSize: 11, color: Colors.workout, backgroundColor: Colors.workout + '20', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  exTagMore: { fontSize: 11, color: Colors.textMuted },
});
const sc = StyleSheet.create({
  card: { flex: 1, backgroundColor: Colors.surface, borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 1 },
  label: { fontSize: 11, color: Colors.textSecondary, marginBottom: 6, fontWeight: '500' },
  value: { fontSize: 22, fontWeight: '700' },
  unit: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
});
