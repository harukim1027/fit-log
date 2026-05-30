import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, TextInput,
  Alert, KeyboardAvoidingView, Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import { Header } from "../../components/ui";
import { Icon } from "../../components/AppIcons";
import { useRoutineStore, Routine, RoutineExercise } from "../../store/routineStore";
import { EXERCISE_CATEGORIES } from "../../constants";

const SHADOW = {
  shadowColor: "#4EBFA0",
  shadowOffset: { width: 0, height: 6 },
  shadowOpacity: 0.13,
  shadowRadius: 14,
  elevation: 3,
};

const PRESET_EXERCISES = [
  { name: "벤치프레스", category: "가슴" },
  { name: "스쿼트", category: "하체" },
  { name: "데드리프트", category: "등" },
  { name: "오버헤드프레스", category: "어깨" },
  { name: "풀업", category: "등" },
  { name: "바벨 로우", category: "등" },
  { name: "런지", category: "하체" },
  { name: "딥스", category: "가슴" },
];

type Mode = 'list' | 'create' | 'edit';

export default function RoutineManageModal() {
  const router = useRouter();
  const params = useLocalSearchParams<{ editId?: string }>();
  const { routines, loadRoutines, addRoutine, updateRoutine, deleteRoutine } = useRoutineStore();

  const [mode, setMode] = useState<Mode>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [routineName, setRoutineName] = useState('');
  const [exercises, setExercises] = useState<RoutineExercise[]>([]);
  const [exName, setExName] = useState('');
  const [exCat, setExCat] = useState('');
  const [exSets, setExSets] = useState('3');
  const nameRef = useRef<TextInput>(null);

  useEffect(() => {
    loadRoutines().then(() => {
      if (params.editId) {
        const r = useRoutineStore.getState().routines.find(x => x.id === params.editId);
        if (r) openEdit(r);
      }
    });
  }, []);

  useEffect(() => {
    if (mode === 'create') {
      setRoutineName('');
      setExercises([]);
      setTimeout(() => nameRef.current?.focus(), 300);
    }
  }, [mode]);

  const openEdit = (r: Routine) => {
    setEditingId(r.id);
    setRoutineName(r.name);
    setExercises(r.exercises);
    setMode('edit');
  };

  const addExercise = () => {
    if (!exName.trim()) return Alert.alert("종목명을 입력해주세요");
    if (!exCat) return Alert.alert("카테고리를 선택해주세요");
    const sets = parseInt(exSets) || 3;
    setExercises(prev => [...prev, { name: exName.trim(), category: exCat, defaultSets: sets }]);
    setExName('');
    setExCat('');
    setExSets('3');
  };

  const removeExercise = (idx: number) =>
    setExercises(prev => prev.filter((_, i) => i !== idx));

  const handleSave = async () => {
    if (!routineName.trim()) return Alert.alert("루틴 이름을 입력해주세요");
    if (exercises.length === 0) return Alert.alert("최소 1개 종목을 추가해주세요");
    if (mode === 'create') {
      await addRoutine({ name: routineName.trim(), exercises });
    } else if (editingId) {
      await updateRoutine(editingId, { name: routineName.trim(), exercises });
    }
    setMode('list');
  };

  const handleDelete = (id: string, name: string) => {
    Alert.alert("루틴 삭제", `"${name}" 루틴을 삭제할까요?`, [
      { text: "취소", style: "cancel" },
      { text: "삭제", style: "destructive", onPress: () => deleteRoutine(id) },
    ]);
  };

  if (mode === 'list') {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#EFFAF4' }} edges={["bottom"]}>
        <Header title="루틴 관리" showClose />
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
          <TouchableOpacity
            style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 16, justifyContent: 'center' }, SHADOW]}
            onPress={() => setMode('create')}
            activeOpacity={0.8}>
            <Icon name="plus" size={20} color="#6FD3B6" />
            <Text style={{ fontSize: 15, fontWeight: '800', color: '#6FD3B6' }}>새 루틴 만들기</Text>
          </TouchableOpacity>

          {routines.length === 0 ? (
            <View style={{ alignItems: 'center', paddingTop: 48, gap: 8 }}>
              <Icon name="dumbbell" size={56} color="#B4CFC5" />
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#34514A' }}>루틴이 없어요</Text>
              <Text style={{ fontSize: 13, color: '#7E9A90', textAlign: 'center' }}>
                위 버튼을 눌러 첫 루틴을 만들어보세요
              </Text>
            </View>
          ) : (
            routines.map(r => (
              <View key={r.id} style={[{ backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 10 }, SHADOW]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: '#34514A' }}>{r.name}</Text>
                    <Text style={{ fontSize: 12, color: '#7E9A90', marginTop: 3, fontWeight: '600' }}>
                      {r.exercises.length}종목 · 예상 {r.exercises.reduce((s, e) => s + e.defaultSets, 0) * 3}분
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity onPress={() => openEdit(r)}>
                      <Icon name="pencil" size={18} color="#7E9A90" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(r.id, r.name)}>
                      <Icon name="trash" size={18} color="#B4CFC5" />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {r.exercises.map((ex, i) => (
                    <View key={i} style={{ backgroundColor: '#E7F7F0', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#2E9E83' }}>
                        {ex.name} {ex.defaultSets}세트
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#EFFAF4' }} edges={["bottom"]}>
      <Header
        title={mode === 'create' ? '새 루틴' : '루틴 수정'}
        showClose
        onClose={() => setMode('list')}
      />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
          {/* 루틴 이름 */}
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#7E9A90', marginBottom: 8 }}>루틴 이름</Text>
          <TextInput
            ref={nameRef}
            style={[{ backgroundColor: '#fff', borderRadius: 14, padding: 14, fontSize: 16, fontWeight: '700', color: '#34514A', marginBottom: 20 }, SHADOW]}
            value={routineName}
            onChangeText={setRoutineName}
            placeholder="예: 상체 루틴, 하체 데이"
            placeholderTextColor="#B4CFC5"
            returnKeyType="next"
          />

          {/* 종목 목록 */}
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#7E9A90', marginBottom: 8 }}>종목 목록</Text>
          {exercises.map((ex, i) => (
            <View key={i} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#E7F7F0', borderRadius: 14, padding: 12, marginBottom: 8, gap: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#34514A' }}>{ex.name}</Text>
                <Text style={{ fontSize: 11, color: '#7E9A90', fontWeight: '600' }}>{ex.category} · {ex.defaultSets}세트</Text>
              </View>
              <TouchableOpacity onPress={() => removeExercise(i)}>
                <Icon name="trash" size={16} color="#B4CFC5" />
              </TouchableOpacity>
            </View>
          ))}

          {/* 종목 추가 폼 */}
          <View style={[{ backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 20 }, SHADOW]}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#34514A', marginBottom: 10 }}>종목 추가</Text>
            <TextInput
              style={{ backgroundColor: '#E7F7F0', borderRadius: 12, padding: 12, fontSize: 14, color: '#34514A', marginBottom: 8 }}
              value={exName}
              onChangeText={setExName}
              placeholder="종목명 (예: 벤치프레스)"
              placeholderTextColor="#B4CFC5"
            />

            {/* 빠른 선택 */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} keyboardShouldPersistTaps="handled">
              {PRESET_EXERCISES.map(p => (
                <TouchableOpacity
                  key={p.name}
                  style={{ backgroundColor: exName === p.name ? '#6FD3B620' : '#E7F7F0', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginRight: 6 }}
                  onPress={() => { setExName(p.name); setExCat(p.category); }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: exName === p.name ? '#2E9E83' : '#7E9A90' }}>{p.name}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* 카테고리 */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} keyboardShouldPersistTaps="handled">
              {EXERCISE_CATEGORIES.map(c => (
                <TouchableOpacity
                  key={c}
                  style={{ backgroundColor: exCat === c ? '#FF9DB028' : '#E7F7F0', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6, marginRight: 6 }}
                  onPress={() => setExCat(c)}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: exCat === c ? '#E76C86' : '#7E9A90' }}>{c}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* 기본 세트 수 */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Text style={{ fontSize: 13, color: '#7E9A90', fontWeight: '700' }}>기본 세트 수</Text>
              {[2, 3, 4, 5].map(n => (
                <TouchableOpacity
                  key={n}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: exSets === String(n) ? '#6FD3B6' : '#E7F7F0', alignItems: 'center', justifyContent: 'center' }}
                  onPress={() => setExSets(String(n))}>
                  <Text style={{ fontSize: 14, fontWeight: '800', color: exSets === String(n) ? '#fff' : '#7E9A90' }}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={{ backgroundColor: '#6FD3B6', borderRadius: 999, paddingVertical: 12, alignItems: 'center' }}
              onPress={addExercise}
              activeOpacity={0.8}>
              <Text style={{ fontSize: 14, fontWeight: '800', color: '#fff' }}>종목 추가</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={{ backgroundColor: '#FFAE96', borderRadius: 999, paddingVertical: 16, alignItems: 'center' }}
            onPress={handleSave}
            activeOpacity={0.8}>
            <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff' }}>루틴 저장</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
