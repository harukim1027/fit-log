import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  Alert, Keyboard, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutStore } from '../../store/workoutStore';
import { Colors, EXERCISE_CATEGORIES } from '../../constants';
import { WorkoutSet, ExerciseSetting } from '../../types/workout';

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

const SETTING_KEYS = ['시트높이', '등받이각도', '그립종류', '발판위치', '바높이', '인클라인각도', '기타'];

const CARD_SHADOW = {
  shadowColor: '#B4A0D8',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.09,
  shadowRadius: 10,
  elevation: 3,
};

type PresetExercise = { name: string; category: string };

export default function AddWorkoutModal() {
  const router = useRouter();
  const { addExercise, addSet, activeSession } = useWorkoutStore();

  // Exercise selection
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<PresetExercise | null>(null);
  const [customExercises, setCustomExercises] = useState<PresetExercise[]>([]);

  // Direct add form
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState('');
  const [customCat, setCustomCat] = useState('');

  // Sets
  const [sets, setSets] = useState([{ weight: '', reps: '' }]);

  // Settings
  const [settings, setSettings] = useState<ExerciseSetting[]>([]);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [settingKey, setSettingKey] = useState(SETTING_KEYS[0]);
  const [settingValue, setSettingValue] = useState('');

  // Tip
  const [tip, setTip] = useState('');

  const allExercises = [...customExercises, ...PRESET_EXERCISES];
  const filtered = allExercises.filter(e => !selectedCategory || e.category === selectedCategory);

  const handleAddCustom = () => {
    if (!customName.trim()) return Alert.alert('종목명을 입력해주세요');
    if (!customCat) return Alert.alert('카테고리를 선택해주세요');
    const newEx: PresetExercise = { name: customName.trim(), category: customCat };
    setCustomExercises(prev => [...prev, newEx]);
    setSelectedExercise(newEx);
    setShowCustomForm(false);
    setCustomName('');
    setCustomCat('');
  };

  const handleAddSetting = () => {
    if (!settingValue.trim()) return Alert.alert('값을 입력해주세요');
    setSettings(prev => [...prev, { key: settingKey, value: settingValue.trim() }]);
    setSettingValue('');
    setShowSettingsSheet(false);
  };

  const removeSetting = (idx: number) => {
    setSettings(prev => prev.filter((_, i) => i !== idx));
  };

  const handleAdd = () => {
    if (!activeSession) return Alert.alert('운동 세션을 먼저 시작해주세요');
    if (!selectedExercise) return Alert.alert('운동 종목을 선택해주세요');
    const validSets = sets.filter(s => s.weight && s.reps);
    if (validSets.length === 0) return Alert.alert('최소 1세트를 입력해주세요');
    const exId = Date.now().toString();
    addExercise({
      id: exId,
      name: selectedExercise.name,
      category: selectedExercise.category,
      settings: settings.length > 0 ? settings : undefined,
      tip: tip.trim() || undefined,
    });
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
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={{ flex: 1 }}>

            <ScrollView
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={s.content}
            >
              {/* ── 종목 선택 ── */}
              <Text style={s.sectionLabel}>운동 종목 선택</Text>

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

              {/* ── 직접 추가 ── */}
              {!showCustomForm ? (
                <TouchableOpacity style={s.directAddBtn} onPress={() => setShowCustomForm(true)}>
                  <Ionicons name="add-circle-outline" size={18} color={Colors.primary} />
                  <Text style={s.directAddText}>직접 추가</Text>
                </TouchableOpacity>
              ) : (
                <View style={s.customForm}>
                  <View style={s.customFormHeader}>
                    <Text style={s.customFormTitle}>직접 추가</Text>
                    <TouchableOpacity onPress={() => { setShowCustomForm(false); setCustomName(''); setCustomCat(''); }}>
                      <Ionicons name="close" size={20} color={Colors.textMuted} />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={s.customNameInput}
                    placeholder="종목명 입력 (예: 케이블 플라이)"
                    value={customName}
                    onChangeText={setCustomName}
                    placeholderTextColor={Colors.textMuted}
                    returnKeyType="done"
                  />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.catScroll} keyboardShouldPersistTaps="handled">
                    {EXERCISE_CATEGORIES.map(cat => (
                      <TouchableOpacity
                        key={cat}
                        style={[s.catChip, customCat === cat && s.catChipActive]}
                        onPress={() => setCustomCat(cat)}
                      >
                        <Text style={[s.catText, customCat === cat && s.catTextActive]}>{cat}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <TouchableOpacity style={s.customAddBtn} onPress={handleAddCustom} activeOpacity={0.8}>
                    <Text style={s.customAddBtnText}>목록에 추가하기</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* ── 세트 기록 ── */}
              {selectedExercise && (
                <View style={s.setSection}>
                  <Text style={s.setSectionTitle}>{selectedExercise.name} 세트 기록 🏋️</Text>
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
                        onSubmitEditing={Keyboard.dismiss}
                      />
                    </View>
                  ))}
                  <TouchableOpacity style={s.addSetBtn} onPress={() => setSets(prev => [...prev, { weight: '', reps: '' }])}>
                    <Text style={s.addSetText}>+ 세트 추가</Text>
                  </TouchableOpacity>

                  {/* ── 설정 ── */}
                  <View style={s.divider} />
                  <View style={s.settingsHeader}>
                    <Text style={s.settingsTitle}>⚙️ 기구 설정</Text>
                    <TouchableOpacity style={s.addSettingBtn} onPress={() => setShowSettingsSheet(true)}>
                      <Ionicons name="add" size={16} color={Colors.primary} />
                      <Text style={s.addSettingText}>설정 추가</Text>
                    </TouchableOpacity>
                  </View>

                  {settings.length > 0 ? (
                    <View style={s.tagsWrap}>
                      {settings.map((st, i) => (
                        <TouchableOpacity key={i} style={s.tag} onPress={() => removeSetting(i)} activeOpacity={0.7}>
                          <Text style={s.tagText}>{st.key}: {st.value}</Text>
                          <Ionicons name="close" size={12} color={Colors.primary} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  ) : (
                    <Text style={s.settingsEmpty}>시트높이, 각도 등 기구 설정을 기록하세요</Text>
                  )}

                  {/* ── 팁 ── */}
                  <View style={s.divider} />
                  <Text style={s.settingsTitle}>💡 운동 팁</Text>
                  <TextInput
                    style={s.tipInput}
                    placeholder="자유롭게 팁이나 메모를 남겨보세요"
                    value={tip}
                    onChangeText={setTip}
                    placeholderTextColor={Colors.textMuted}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                  />
                </View>
              )}

              <TouchableOpacity style={s.addBtn} onPress={handleAdd} activeOpacity={0.8}>
                <Text style={s.addBtnText}>운동 추가</Text>
              </TouchableOpacity>
            </ScrollView>

          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>

      {/* ── 설정 바텀시트 ── */}
      <Modal
        visible={showSettingsSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettingsSheet(false)}
      >
        <TouchableOpacity
          style={sh.overlay}
          activeOpacity={1}
          onPress={() => setShowSettingsSheet(false)}
        >
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ width: '100%' }}>
            <TouchableWithoutFeedback>
              <View style={sh.sheet}>
                <View style={sh.handle} />
                <Text style={sh.title}>기구 설정 추가</Text>

                <Text style={sh.label}>항목 선택</Text>
                <View style={sh.keyGrid}>
                  {SETTING_KEYS.map(k => (
                    <TouchableOpacity
                      key={k}
                      style={[sh.keyChip, settingKey === k && sh.keyChipActive]}
                      onPress={() => setSettingKey(k)}
                    >
                      <Text style={[sh.keyText, settingKey === k && sh.keyTextActive]}>{k}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={sh.label}>값 입력</Text>
                <TextInput
                  style={sh.valueInput}
                  placeholder="예: 3단계, 45도, 오버핸드"
                  value={settingValue}
                  onChangeText={setSettingValue}
                  placeholderTextColor={Colors.textMuted}
                  returnKeyType="done"
                  autoFocus
                />

                <TouchableOpacity style={sh.addBtn} onPress={handleAddSetting} activeOpacity={0.8}>
                  <Text style={sh.addBtnText}>추가하기</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  content: { padding: 20, paddingBottom: 40 },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 12 },
  catScroll: { marginBottom: 12 },
  catChip: { backgroundColor: Colors.surface, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginRight: 8, ...CARD_SHADOW },
  catChipActive: { backgroundColor: Colors.workout + '28' },
  catText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  catTextActive: { color: Colors.workout, fontWeight: '700' },
  exerciseList: { marginBottom: 8 },
  exItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: Colors.surface, borderRadius: 16, padding: 14, marginBottom: 8, ...CARD_SHADOW },
  exItemSelected: { backgroundColor: Colors.workout + '18' },
  exName: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  exCat: { fontSize: 12, color: Colors.workout, backgroundColor: Colors.workout + '28', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },

  // Direct add
  directAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 12, paddingHorizontal: 4, marginBottom: 16 },
  directAddText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  customForm: { backgroundColor: Colors.surface, borderRadius: 20, padding: 16, marginBottom: 16, ...CARD_SHADOW },
  customFormHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  customFormTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  customNameInput: { backgroundColor: Colors.surfaceAlt, borderRadius: 12, padding: 12, fontSize: 15, color: Colors.textPrimary, marginBottom: 12 },
  customAddBtn: { backgroundColor: Colors.primary, borderRadius: 20, padding: 12, alignItems: 'center', marginTop: 4 },
  customAddBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Set section
  setSection: { backgroundColor: Colors.surface, borderRadius: 20, padding: 16, marginBottom: 16, ...CARD_SHADOW },
  setSectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, marginBottom: 14 },
  setHeaderRow: { flexDirection: 'row', marginBottom: 8 },
  setHeader: { fontSize: 11, color: Colors.textMuted, fontWeight: '600', textAlign: 'center' },
  setRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  setNum: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', fontWeight: '700' },
  setInput: { backgroundColor: Colors.surfaceAlt, borderRadius: 12, padding: 10, color: Colors.textPrimary, fontSize: 15, fontWeight: '600', textAlign: 'center' },
  addSetBtn: { alignItems: 'center', padding: 10, borderRadius: 20, backgroundColor: Colors.workout + '18', marginTop: 4 },
  addSetText: { fontSize: 13, color: Colors.workout, fontWeight: '700' },

  // Settings
  divider: { height: 1, backgroundColor: Colors.surfaceAlt, marginVertical: 14 },
  settingsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  settingsTitle: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  addSettingBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.primary + '18', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  addSettingText: { fontSize: 13, color: Colors.primary, fontWeight: '700' },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: Colors.primary + '18', borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  tagText: { fontSize: 12, color: Colors.primary, fontWeight: '600' },
  settingsEmpty: { fontSize: 12, color: Colors.textMuted, fontStyle: 'italic' },

  // Tip
  tipInput: { backgroundColor: Colors.surfaceAlt, borderRadius: 12, padding: 12, color: Colors.textPrimary, fontSize: 14, minHeight: 80, lineHeight: 20, marginTop: 10 },

  // Add button
  addBtn: { backgroundColor: Colors.workout, borderRadius: 24, padding: 16, alignItems: 'center', marginTop: 4 },
  addBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

const sh = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(61, 50, 86, 0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 },
  handle: { width: 40, height: 4, backgroundColor: Colors.textMuted, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  title: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary, marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '700', color: Colors.textSecondary, marginBottom: 10 },
  keyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 },
  keyChip: { backgroundColor: Colors.surfaceAlt, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8 },
  keyChipActive: { backgroundColor: Colors.primary + '28' },
  keyText: { fontSize: 13, color: Colors.textSecondary, fontWeight: '600' },
  keyTextActive: { color: Colors.primary, fontWeight: '700' },
  valueInput: { backgroundColor: Colors.surfaceAlt, borderRadius: 14, padding: 14, fontSize: 15, color: Colors.textPrimary, marginBottom: 16 },
  addBtn: { backgroundColor: Colors.primary, borderRadius: 24, padding: 15, alignItems: 'center' },
  addBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
