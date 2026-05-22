import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutStore } from '../../store/workoutStore';
import { Colors } from '../../constants/colors';

export default function WorkoutScreen() {
    const router = useRouter();
  const { activeSession, startSession, endSession, getTotalVolume, removeSet, fetchSessions, isLoading } = useWorkoutStore();

  useEffect(() => { fetchSessions(); }, []);

  const handleEnd = () => {
    Alert.alert('운동 종료', '오늘 운동을 저장하고 종료할까요?', [
      { text: '취소', style: 'cancel' },
      { text: '저장 및 종료', onPress: async () => { await endSession(); } },
    ]);
  };

  if (isLoading) {
    return (
      <View style={s.emptyContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!activeSession) {
    return (
      <View style={s.emptyContainer}>
        <Ionicons name="barbell-outline" size={64} color={Colors.textMuted} />
        <Text style={s.emptyTitle}>오늘 운동을 시작해볼까요?</Text>
        <Text style={s.emptyDesc}>운동을 기록하고 성장을 확인해보세요</Text>
        <TouchableOpacity style={s.startBtn} onPress={startSession} activeOpacity={0.8}>
          <Ionicons name="play" size={20} color="#fff" />
          <Text style={s.startBtnText}>운동 시작</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const volume = getTotalVolume(activeSession);

  return (
    <SafeAreaView style={s.container}>
    <ScrollView contentContainerStyle={s.content}>
      <View style={s.sessionHeader}>
        <View>
          <Text style={s.title}>운동 중 🔥</Text>
          <Text style={s.sessionSub}>{activeSession.exercises.length}종목 · 총 볼륨 {volume.toLocaleString()}kg</Text>
        </View>
        <TouchableOpacity style={s.endBtn} onPress={handleEnd}>
          <Text style={s.endBtnText}>저장 및 종료</Text>
        </TouchableOpacity>
      </View>

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
              <View key={st.id} style={s.setRow}>
                <Text style={[s.setText, { flex: 0.5 }]}>{idx + 1}</Text>
                <Text style={[s.setText, { flex: 1 }]}>{st.weight}</Text>
                <Text style={[s.setText, { flex: 1 }]}>{st.reps}</Text>
                <Text style={[s.setText, { flex: 0.5 }]}>{st.weight * st.reps}</Text>
                <TouchableOpacity onPress={() => removeSet(ex.id, st.id)}>
                  <Ionicons name="close-circle-outline" size={18} color={Colors.textMuted} />
                </TouchableOpacity>
              </View>
            ))}
            {ex.sets.length === 0 && <Text style={s.noSetText}>세트를 추가해주세요</Text>}
          </View>
        ))
      )}
    </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  emptyContainer: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', padding: 40, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
  emptyDesc: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  startBtn: { flexDirection: 'row', backgroundColor: Colors.workout, borderRadius: 14, paddingHorizontal: 32, paddingVertical: 14, alignItems: 'center', gap: 8, marginTop: 8 },
  startBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  sessionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '700', color: Colors.textPrimary },
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
  setText: { fontSize: 14, color: Colors.textPrimary, textAlign: 'center' },
  noSetText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', paddingVertical: 8 },
});
