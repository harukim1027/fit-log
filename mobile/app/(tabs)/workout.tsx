import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutStore } from '../../store/workoutStore';
import RestTimer from '../../components/RestTimer';
import { Colors } from '../../constants/colors';
import { WorkoutSession } from '../../types/workout';

type Tab = 'today' | 'history';

export default function WorkoutScreen() {
  const router = useRouter();
  const { activeSession, startSession, endSession, getTotalVolume, removeSet, updateSet, fetchSessions, sessions, isLoading } = useWorkoutStore();
  const [tab, setTab] = useState<Tab>('today');

  useEffect(() => { fetchSessions(); }, []);

  const handleEnd = () => {
    Alert.alert('운동 종료', '오늘 운동을 저장하고 종료할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '저장 및 종료', onPress: async () => { await endSession(); } },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[s.container, { alignItems: 'center', justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>운동</Text>
      </View>

      <View style={s.tabRow}>
        <TouchableOpacity style={[s.tab, tab === 'today' && s.tabActive]} onPress={() => setTab('today')}>
          <Text style={[s.tabText, tab === 'today' && s.tabTextActive]}>오늘 운동</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === 'history' && s.tabActive]} onPress={() => setTab('history')}>
          <Text style={[s.tabText, tab === 'history' && s.tabTextActive]}>히스토리</Text>
        </TouchableOpacity>
      </View>

      {tab === 'today' ? (
        <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
          {!activeSession ? (
            <View style={s.emptyContainer}>
              <Ionicons name="barbell-outline" size={64} color={Colors.textMuted} />
              <Text style={s.emptyTitle}>오늘 운동을 시작해볼까요?</Text>
              <Text style={s.emptyDesc}>운동을 기록하고 성장을 확인해보세요</Text>
              <TouchableOpacity style={s.startBtn} onPress={startSession} activeOpacity={0.8}>
                <Ionicons name="play" size={20} color="#fff" />
                <Text style={s.startBtnText}>운동 시작</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={s.sessionHeader}>
                <View>
                  <Text style={s.sessionTitle}>운동 중 🔥</Text>
                  <Text style={s.sessionSub}>{activeSession.exercises.length}종목 · 총 볼륨 {getTotalVolume(activeSession).toLocaleString()}kg</Text>
                </View>
                <TouchableOpacity style={s.endBtn} onPress={handleEnd}>
                  <Text style={s.endBtnText}>저장 및 종료</Text>
                </TouchableOpacity>
              </View>

              <RestTimer />

              <TouchableOpacity style={s.addExBtn} onPress={() => router.push('/modal/add-workout')} activeOpacity={0.8}>
                <Ionicons name="add-circle" size={20} color={Colors.workout} />
                <Text style={s.addExText}>운동 종목 추가</Text>
              </TouchableOpacity>

              {activeSession.exercises.length === 0 ? (
                <View style={s.noExercise}>
                  <Text style={s.noExerciseText}>운동 종목을 추가해주세요</Text>
                </View>
              ) : (
                activeSession.exercises.map(ex => (
                  <View key={ex.id} style={s.exerciseCard}>
                    <View style={s.exHeader}>
                      <Text style={s.exName}>{ex.name}</Text>
                      <Text style={s.exCategory}>{ex.category}</Text>
                    </View>
                    <View style={s.setHeaderRow}>
                      <Text style={[s.setHeaderText, { flex: 0.5 }]}>세트</Text>
                      <Text style={[s.setHeaderText, { flex: 1 }]}>무게(kg)</Text>
                      <Text style={[s.setHeaderText, { flex: 1 }]}>횟수</Text>
                      <Text style={[s.setHeaderText, { flex: 0.5 }]}>볼륨</Text>
                      <View style={{ width: 24 }} />
                    </View>
                    {ex.sets.map((st, idx) => (
                      <TouchableOpacity
                        key={st.id}
                        style={[s.setRow, st.completed && s.setRowDone]}
                        onPress={() => updateSet(ex.id, st.id, { completed: !st.completed })}
                        activeOpacity={0.7}
                      >
                        <View style={[s.setNumWrap, st.completed && s.setNumWrapDone]}>
                          {st.completed
                            ? <Ionicons name="checkmark" size={14} color="#fff" />
                            : <Text style={s.setNumText}>{idx + 1}</Text>
                          }
                        </View>
                        <Text style={[s.setText, { flex: 1 }, st.completed && s.textDone]}>{st.weight}</Text>
                        <Text style={[s.setText, { flex: 1 }, st.completed && s.textDone]}>{st.reps}</Text>
                        <Text style={[s.setText, { flex: 0.5 }, st.completed && s.textDone]}>{st.weight * st.reps}</Text>
                        <TouchableOpacity onPress={() => removeSet(ex.id, st.id)}>
                          <Ionicons name="close-circle-outline" size={18} color={Colors.textMuted} />
                        </TouchableOpacity>
                      </TouchableOpacity>
                    ))}
                    {ex.sets.length === 0 && <Text style={s.noSetText}>세트를 추가해주세요</Text>}
                  </View>
                ))
              )}
            </>
          )}
        </ScrollView>
      ) : (
        <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
          {sessions.length === 0 ? (
            <View style={s.emptyContainer}>
              <Ionicons name="calendar-outline" size={64} color={Colors.textMuted} />
              <Text style={s.emptyTitle}>운동 기록이 없어요</Text>
              <Text style={s.emptyDesc}>운동을 시작하고 기록을 쌓아보세요</Text>
            </View>
          ) : (
            sessions.slice().reverse().map(session => (
              <HistoryCard key={session.id} session={session} getVolume={getTotalVolume} />
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function HistoryCard({ session, getVolume }: { session: WorkoutSession; getVolume: (s: WorkoutSession) => number }) {
  const [expanded, setExpanded] = useState(false);
  const volume = getVolume(session);
  const date = new Date(session.date).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' });

  return (
    <View style={h.card}>
      <TouchableOpacity style={h.header} onPress={() => setExpanded(!expanded)} activeOpacity={0.7}>
        <View>
          <Text style={h.date}>{date}</Text>
          <Text style={h.meta}>{session.exercises.length}종목 · {volume.toLocaleString()}kg</Text>
        </View>
        <View style={h.right}>
          <View style={h.tagRow}>
            {session.exercises.slice(0, 2).map(ex => (
              <Text key={ex.id} style={h.tag}>{ex.name}</Text>
            ))}
            {session.exercises.length > 2 && <Text style={h.tagMore}>+{session.exercises.length - 2}</Text>}
          </View>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={Colors.textMuted} />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={h.detail}>
          {session.exercises.map(ex => (
            <View key={ex.id} style={h.exRow}>
              <View style={h.exHeader}>
                <Text style={h.exName}>{ex.name}</Text>
                <Text style={h.exCat}>{ex.category}</Text>
              </View>
              {ex.sets.map((st, idx) => (
                <Text key={st.id} style={h.setText}>
                  {idx + 1}세트 · {st.weight}kg × {st.reps}회 = {st.weight * st.reps}kg
                </Text>
              ))}
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  title: { fontSize: 26, fontWeight: '700', color: Colors.textPrimary },
  tabRow: { flexDirection: 'row', backgroundColor: Colors.surfaceAlt, borderRadius: 12, padding: 4, marginHorizontal: 20, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: Colors.surface },
  tabText: { fontSize: 14, fontWeight: '500', color: Colors.textMuted },
  tabTextActive: { color: Colors.textPrimary, fontWeight: '600' },
  content: { padding: 20, paddingBottom: 40 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  emptyDesc: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  startBtn: { flexDirection: 'row', backgroundColor: Colors.workout, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14, alignItems: 'center', gap: 8, marginTop: 8 },
  startBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  sessionTitle: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary },
  sessionSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },
  endBtn: { backgroundColor: Colors.success + '20', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: Colors.success + '40' },
  endBtnText: { fontSize: 14, fontWeight: '600', color: Colors.success },
  addExBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: Colors.workout + '40' },
  addExText: { fontSize: 14, fontWeight: '600', color: Colors.workout },
  noExercise: { alignItems: 'center', paddingVertical: 40 },
  noExerciseText: { fontSize: 14, color: Colors.textMuted },
  exerciseCard: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border },
  exHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  exName: { fontSize: 16, fontWeight: '600', color: Colors.textPrimary },
  exCategory: { fontSize: 12, color: Colors.workout, backgroundColor: Colors.workout + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  setHeaderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: Colors.border },
  setHeaderText: { fontSize: 11, color: Colors.textMuted, fontWeight: '600', textAlign: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8 },
  setRowDone: { opacity: 0.6 },
  setNumWrap: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', marginRight: 8, flex: 0.5 },
  setNumWrapDone: { backgroundColor: Colors.success },
  setNumText: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  textDone: { textDecorationLine: 'line-through', color: Colors.textMuted },
  setText: { fontSize: 14, color: Colors.textPrimary, textAlign: 'center' },
  noSetText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingVertical: 8 },
});

const h = StyleSheet.create({
  card: { backgroundColor: Colors.surface, borderRadius: 16, marginBottom: 12, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16 },
  date: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  meta: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 6 },
  tagRow: { flexDirection: 'row', gap: 4 },
  tag: { fontSize: 11, color: Colors.workout, backgroundColor: Colors.workout + '20', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 5 },
  tagMore: { fontSize: 11, color: Colors.textMuted },
  detail: { borderTopWidth: 1, borderTopColor: Colors.border, padding: 16, gap: 12 },
  exRow: { gap: 6 },
  exHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  exCat: { fontSize: 11, color: Colors.workout, backgroundColor: Colors.workout + '20', paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  setText: { fontSize: 13, color: Colors.textSecondary },
});
