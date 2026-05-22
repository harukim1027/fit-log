import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert, Keyboard, KeyboardAvoidingView, Platform, TouchableWithoutFeedback } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useWorkoutStore } from '../../store/workoutStore';
import { Colors, EXERCISE_CATEGORIES } from '../../constants';
import { WorkoutSet } from '../../types/workout';

const PRESET_EXERCISES = [
  { name: '벤치프레스', category: '가슴' },
  { name: '인클라인 벤치프레스', category: '가슴' },
  { name: '딥스', category: '가슴' },
  { name: '데드리프트', category: '등' },
  { name: '바벨 로우', category: '등' },
  { name: '풀업', category: '등' },
  { name: '오버헤드프레스', category: '어깨' },
  { name: '사이드 레터럴 레이즈', category: '어깨' },
  { name: '바벨 컬', category: '팔' },
  { name: '트라이셉스 익스텐션', category: '팔' },
  { name: '스쿼트', category: '하체' },
  { name: '레그프레스', category: '하체' },
  { name: '런지', category: '하체' },
  { name: '플랭크', category: '복근' },
  { name: '크런치', category: '복근' },
];

export default function AddWorkoutModal() {
  const router = useRouter();
  const { addExercise, addSet, activeSession } = useWorkoutStore();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<typeof PRESET_EXERCISES[0] | null>(null);
  const [sets, setSets] = useState([{ weight: '', reps: '' }]);

  const filtered = PRESET_EXERCISES.filter(e => !selectedCategory || e.category === selectedCategory);

  const handleAdd = () => {
    if (!activeSession) return Alert.alert('운동 세션을 먼저 시작해주세요');
    if (!selectedExercise) return Alert.alert('운동 종목을 선택해주세요');
    const validSets = sets.filter(s => s.weight && s.reps);
    if (validSets.length === 0) return Alert.alert('최소 1세트를 입력해주세요');
    const exId = Date.now().toString();
    addExercise({ id: exId, name: selectedExercise.name, category: selectedExercise.category });
    validSets.forEach((st, i) => {
      const workoutSet: WorkoutSet = {
        id: exId + '-' + i,
        weight: parseFloat(st.weight),
        reps: parseInt(st.reps),
        completed: false,
      };
      addSet(exId, workoutSet);
    });
    router.back();
  };

  return (
    <SafeAreaView style={s.container} edges={['bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
          <View style={{ flex: 1 }}>

      <ScrollView keyboardDismissMode="on-drag" keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
        <Text style={s.subtitle}>운동 종목 선택</Text>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll} keyboardShouldPersistTaps="handled">
          {EXERCISE_CATEGORIES.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[s.catChip, selectedCategory === cat && s.catChipActive]}
              onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
            >
              <Text style={[s.catText, selectedCategory === cat && s.catTextActive]}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <View style={s.exerciseList}>
          {filtered.map(ex => (
            <TouchableOpacity
              key={ex.name}
              style={[s.exItem, selectedExercise?.name === ex.name && s.exItemSelected]}
              onPress={() => setSelectedExercise(ex)}
              activeOpacity={0.7}
            >
              <Text style={s.exName}>{ex.name}</Text>
              <Text style={s.exCat}>{ex.category}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedExercise && (
          <View style={s.setSection}>
            <Text style={s.setTitle}>{selectedExercise.name} 세트 기록</Text>
            <View style={s.setHeaderRow}>
              <Text style={[s.setHeader, { flex: 0.5 }]}>세트</Text>
              <Text style={[s.setHeader, { flex: 1 }]}>무게(kg)</Text>
              <Text style={[s.setHeader, { flex: 1 }]}>횟수</Text>
            </View>
            {sets.map((st, i) => (
              <View key={i} style={s.setRow}>
                <Text style={[s.setNum, { flex: 0.5 }]}>{i + 1}</Text>
                <TextInput
                  style={[s.setInput, { flex: 1 }]}
                  value={st.weight}
                  onChangeText={v => setSets(prev => prev.map((s, idx) => idx === i ? { ...s, weight: v } : s))}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  
                  returnKeyType="next"
                />
                <TextInput
                  style={[s.setInput, { flex: 1 }]}
                  value={st.reps}
                  onChangeText={v => setSets(prev => prev.map((s, idx) => idx === i ? { ...s, reps: v } : s))}
                  keyboardType="numeric"
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  
                  returnKeyType="done"
                  onSubmitEditing={() => Keyboard.dismiss()}
                />
              </View>
            ))}
            <TouchableOpacity style={s.addSetBtn} onPress={() => setSets(s => [...s, { weight: '', reps: '' }])}>
              <Text style={s.addSetText}>+ 세트 추가</Text>
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity style={s.addBtn} onPress={handleAdd} activeOpacity={0.8}>
          <Text style={s.addBtnText}>운동 추가</Text>
        </TouchableOpacity>
      </ScrollView>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, marginBottom: 16 },
  catScroll: { marginBottom: 12 },
  catChip: { backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, borderWidth: 1, borderColor: Colors.border },
  catChipActive: { backgroundColor: Colors.workout + '20', borderColor: Colors.workout },
  catText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '500' },
  catTextActive: { color: Colors.workout },
  exerciseList: { marginBottom: 16 },
  exItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: Colors.border },
  exItemSelected: { borderColor: Colors.workout, backgroundColor: Colors.workout + '10' },
  exName: { fontSize: 15, fontWeight: '500', color: Colors.textPrimary },
  exCat: { fontSize: 12, color: Colors.workout, backgroundColor: Colors.workout + '20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  setSection: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.border },
  setTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary, marginBottom: 12 },
  setHeaderRow: { flexDirection: 'row', marginBottom: 8 },
  setHeader: { fontSize: 11, color: Colors.textMuted, fontWeight: '600', textAlign: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  setNum: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center' },
  setInput: { backgroundColor: Colors.surfaceAlt, borderRadius: 8, padding: 10, color: Colors.textPrimary, fontSize: 15, fontWeight: '600', textAlign: 'center', borderWidth: 1, borderColor: Colors.border },
  addSetBtn: { alignItems: 'center', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: Colors.workout + '40', marginTop: 4 },
  addSetText: { fontSize: 13, color: Colors.workout, fontWeight: '600' },
  addBtn: { backgroundColor: Colors.workout, borderRadius: 14, padding: 16, alignItems: 'center' },
  addBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
