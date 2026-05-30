import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Modal,
  LayoutAnimation,
  UIManager,
  Image,
  ActivityIndicator,
} from "react-native";
import { Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "../../components/ui";
import { useRouter } from "expo-router";
import { useState, useEffect, useRef } from "react";
import { Icon, FlameIcon } from "../../components/AppIcons";
import apiClient from "../../lib/apiClient";
import { useWorkoutStore } from "../../store/workoutStore";
import { useExerciseStore } from "../../store/exerciseStore";
import { useSettingsStore } from "../../store/settingsStore";
import { EXERCISE_CATEGORIES, lookupEnglish, EXERCISE_MAPPING } from "../../constants";
import { WorkoutSet, ExerciseSetting } from "../../types/workout";
import MuscleMap, { MUSCLE_MAP } from "../../components/MuscleMap";

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const CATEGORY_TO_BODYPART: Record<string, string> = {
  가슴: "chest", 등: "back", 어깨: "shoulders", 팔: "upper arms",
  하체: "upper legs", 복근: "waist", 유산소: "cardio",
};
const BODYPART_TO_CATEGORY: Record<string, string> = {
  chest: "가슴", back: "등", shoulders: "어깨",
  "upper arms": "팔", "lower arms": "팔",
  "upper legs": "하체", "lower legs": "하체",
  waist: "복근", cardio: "유산소",
};

type PresetExercise = { name: string; category: string };

const PRESET_EXERCISES: PresetExercise[] = [
  { name: "벤치프레스", category: "가슴" },
  { name: "인클라인 벤치프레스", category: "가슴" },
  { name: "딥스", category: "가슴" },
  { name: "케이블 플라이", category: "가슴" },
  { name: "데드리프트", category: "등" },
  { name: "바벨 로우", category: "등" },
  { name: "풀업", category: "등" },
  { name: "시티드 로우", category: "등" },
  { name: "랫풀다운", category: "등" },
  { name: "오버헤드프레스", category: "어깨" },
  { name: "사이드 레터럴 레이즈", category: "어깨" },
  { name: "프론트 레이즈", category: "어깨" },
  { name: "바벨 컬", category: "팔" },
  { name: "해머 컬", category: "팔" },
  { name: "트라이셉스 익스텐션", category: "팔" },
  { name: "케이블 푸시다운", category: "팔" },
  { name: "스쿼트", category: "하체" },
  { name: "레그프레스", category: "하체" },
  { name: "런지", category: "하체" },
  { name: "레그 컬", category: "하체" },
  { name: "레그 익스텐션", category: "하체" },
  { name: "플랭크", category: "복근" },
  { name: "크런치", category: "복근" },
  { name: "레그 레이즈", category: "복근" },
  { name: "러닝머신", category: "유산소" },
  { name: "자전거", category: "유산소" },
  { name: "로잉머신", category: "유산소" },
  { name: "일립티컬", category: "유산소" },
  { name: "줄넘기", category: "유산소" },
];

const WEIGHT_PRESETS = [5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100];

const isKorean = (text: string) => /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(text);

// 모든 매핑에서 영어 terms 수집 (startsWith 방식)
function lookupAllEnglish(query: string): string[] {
  const q = query.trim();
  if (!q) return [];
  const results: string[] = [];
  for (const [ko, en] of Object.entries(EXERCISE_MAPPING)) {
    if (ko === q || ko.startsWith(q) || q.startsWith(ko)) {
      if (!results.includes(en)) results.push(en);
    }
  }
  return results;
}

// 영어 검색어로 역방향 매핑 (영어 포함)
function lookupByEnglishContains(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: string[] = [];
  for (const en of Object.values(EXERCISE_MAPPING)) {
    if (en.toLowerCase().includes(q) && !results.includes(en)) results.push(en);
  }
  return results;
}

const PRESET_SETTING_KEYS = [
  "시트높이", "등받이각도", "그립종류", "발판위치", "바높이", "인클라인각도", "기타",
];

const SHADOW = {
  shadowColor: "#4EBFA0",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.09,
  shadowRadius: 10,
  elevation: 3,
};

const BODY_PARTS = ["가슴", "등", "어깨", "팔", "하체", "복근", "유산소", "전신"];

type SelectedExercise = {
  name: string;
  category: string;
  gifUrl?: string;
  caloriesPerMinute?: number;
  targetMuscles?: string[];
  restSeconds?: number;
  targetReps?: string;
  note?: string;
};

type CustomKey = { id: string; name: string };

export default function AddWorkoutModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addExercise, addSet, activeSession } = useWorkoutStore();
  const { results, isSearching, searchExercises, clearResults, saveCustomExercise } = useExerciseStore();

  const scrollRef = useRef<ScrollView>(null);
  const setsSectionY = useRef(0);
  const customFormY = useRef(0);
  const setWeightRefs = useRef<(TextInput | null)[]>([]);
  const customKeyInputRef = useRef<TextInput>(null);
  const customNameRef = useRef<TextInput>(null);
  const tipRef = useRef<TextInput>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchIdRef = useRef(0);
  const lastFocusedSetIndex = useRef(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<SelectedExercise | null>(null);
  const [exerciseListCollapsed, setExerciseListCollapsed] = useState(false);
  const [customExercises, setCustomExercises] = useState<SelectedExercise[]>([]);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customCat, setCustomCat] = useState("");
  const [customTargetParts, setCustomTargetParts] = useState<string[]>([]);
  const [customRestSeconds, setCustomRestSeconds] = useState("60");
  const [customTargetReps, setCustomTargetReps] = useState("");
  const [customNote, setCustomNote] = useState("");

  const { weightUnit, showBodypartSelector, loadSettings } = useSettingsStore();
  const [unit, setUnit] = useState<'kg' | 'lbs'>(weightUnit);
  const [isSingleArm, setIsSingleArm] = useState(false);
  const [differentSides, setDifferentSides] = useState(false);

  const [sets, setSets] = useState([{ weight: "", weightR: "", reps: "" }]);

  const [settings, setSettings] = useState<ExerciseSetting[]>([]);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [settingKey, setSettingKey] = useState(PRESET_SETTING_KEYS[0]);
  const [settingValue, setSettingValue] = useState("");
  const [customSettingKeys, setCustomSettingKeys] = useState<CustomKey[]>([]);
  const [isCustomKeyMode, setIsCustomKeyMode] = useState(false);
  const [customKeyName, setCustomKeyName] = useState("");

  const [tip, setTip] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const successScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadSettings().then(() => setUnit(useSettingsStore.getState().weightUnit));
    apiClient.get<CustomKey[]>("/workout-settings")
      .then(res => setCustomSettingKeys(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const searchId = ++searchIdRef.current;
    const q = searchQuery.trim();
    if (!q) { clearResults(); return; }
    clearResults();

    if (isKorean(q)) {
      // 모든 매핑에서 startsWith로 영어 terms 수집 → API 검색
      const englishTerms = lookupAllEnglish(q);
      if (englishTerms.length > 0) {
        searchTimer.current = setTimeout(() => {
          if (searchIdRef.current !== searchId) return;
          // 첫번째 term으로 API 검색
          searchExercises(englishTerms[0]);
        }, 400);
      }
    } else {
      // 영어 역방향 매핑으로 보완 + API 검색
      const byMap = lookupByEnglishContains(q);
      searchTimer.current = setTimeout(() => {
        if (searchIdRef.current !== searchId) return;
        // API 검색 + 역방향 매핑으로 추가 프리셋 필터에서도 반영
        searchExercises(byMap.length > 0 ? byMap[0] : q);
      }, 400);
    }

    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchQuery]);

  useEffect(() => {
    if (selectedCategory) setSearchQuery("");
  }, [selectedCategory]);

  const isEnglishSearch = Boolean(searchQuery.trim() && !isKorean(searchQuery));

  const filteredPresets: SelectedExercise[] = isEnglishSearch
    ? PRESET_EXERCISES.filter(ex => {
        // 영어로 검색할 때: 역방향 매핑으로 영어 포함된 운동도 표시
        const enTerms = lookupByEnglishContains(searchQuery.trim());
        if (enTerms.length > 0) {
          return enTerms.some(en => {
            const koMatch = Object.entries(EXERCISE_MAPPING).find(([, v]) => v === en);
            return koMatch && ex.name === koMatch[0];
          });
        }
        return false;
      })
    : PRESET_EXERCISES.filter(ex => {
        const matchesCat = !selectedCategory || ex.category === selectedCategory;
        const q = searchQuery.trim();
        const matchesQuery = !q || ex.name.includes(q) || ex.name.startsWith(q);
        return matchesCat && matchesQuery;
      });

  const filteredCustom = customExercises.filter(
    e => !selectedCategory || e.category === selectedCategory
  );

  const handleSelectExercise = (ex: SelectedExercise) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedExercise(ex);
    setExerciseListCollapsed(true);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: setsSectionY.current, animated: true });
    }, 320);
    setTimeout(() => setWeightRefs.current[0]?.focus(), 520);
  };

  const handleChangeExercise = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedExercise(null);
    setExerciseListCollapsed(false);
    setSets([{ weight: "", weightR: "", reps: "" }]);
    setSettings([]);
    setTip("");
    setIsSingleArm(false);
    setDifferentSides(false);
    setWeightRefs.current = [];
    setShowCustomForm(false);
  };

  const handleAddCustomExercise = () => {
    if (!customName.trim()) return Alert.alert("종목명을 입력해주세요");
    if (!customCat) return Alert.alert("카테고리를 선택해주세요");
    const newEx: SelectedExercise = {
      name: customName.trim(),
      category: customCat,
      targetMuscles: customTargetParts.length > 0 ? customTargetParts : undefined,
      restSeconds: parseInt(customRestSeconds) || undefined,
      targetReps: customTargetReps.trim() || undefined,
      note: customNote.trim() || undefined,
    };
    setCustomExercises(prev => [...prev, newEx]);
    setCustomName("");
    setCustomCat("");
    setCustomTargetParts([]);
    setCustomRestSeconds("60");
    setCustomTargetReps("");
    setCustomNote("");
    setShowCustomForm(false);
    handleSelectExercise(newEx);
    saveCustomExercise(customName.trim(), customCat);
  };

  const handleAddSet = () => {
    const newIndex = sets.length;
    setSets(prev => [...prev, { weight: "", weightR: "", reps: "" }]);
    setTimeout(() => setWeightRefs.current[newIndex]?.focus(), 100);
  };

  const applyWeightPreset = (w: number) => {
    const idx = lastFocusedSetIndex.current;
    setSets(prev => prev.map((s, i) => i === idx ? { ...s, weight: String(w) } : s));
  };

  const adjustWeight = (idx: number, delta: number) => {
    setSets(prev => prev.map((s, i) => {
      if (i !== idx) return s;
      const cur = parseFloat(s.weight) || 0;
      const next = Math.max(0, cur + delta);
      return { ...s, weight: String(next % 1 === 0 ? next : next.toFixed(1)) };
    }));
  };

  const adjustReps = (idx: number, delta: number) => {
    setSets(prev => prev.map((s, i) => {
      if (i !== idx) return s;
      const cur = parseInt(s.reps) || 0;
      return { ...s, reps: String(Math.max(0, cur + delta)) };
    }));
  };

  const openSettingsSheet = () => {
    setIsCustomKeyMode(false); setCustomKeyName(""); setSettingKey(PRESET_SETTING_KEYS[0]); setSettingValue(""); setShowSettingsSheet(true);
  };
  const closeSettingsSheet = () => { setShowSettingsSheet(false); setIsCustomKeyMode(false); setCustomKeyName(""); setSettingValue(""); };

  const handleAddSetting = async () => {
    const key = isCustomKeyMode ? customKeyName.trim() : settingKey;
    if (!key) return Alert.alert("항목명을 입력해주세요");
    if (!settingValue.trim()) return Alert.alert("값을 입력해주세요");
    if (isCustomKeyMode && key && !customSettingKeys.some(k => k.name === key)) {
      try {
        const res = await apiClient.post<CustomKey>("/workout-settings", { name: key });
        setCustomSettingKeys(prev => [...prev, res.data]);
      } catch {}
    }
    setSettings(prev => [...prev, { key, value: settingValue.trim() }]);
    closeSettingsSheet();
  };

  const deleteCustomKey = async (id: string) => {
    try {
      await apiClient.delete(`/workout-settings/${id}`);
      setCustomSettingKeys(prev => prev.filter(k => k.id !== id));
      if (customSettingKeys.find(k => k.id === id)?.name === settingKey) setSettingKey(PRESET_SETTING_KEYS[0]);
    } catch { Alert.alert("삭제 실패", "잠시 후 다시 시도해주세요"); }
  };

  const removeSetting = (idx: number) => setSettings(prev => prev.filter((_, i) => i !== idx));

  const toKg = (val: string) => {
    const n = parseFloat(val);
    if (isNaN(n)) return 0;
    return unit === 'lbs' ? Math.round(n * 0.453592 * 10) / 10 : n;
  };

  const handleAdd = () => {
    if (!activeSession) return Alert.alert("운동 세션을 먼저 시작해주세요");
    if (!selectedExercise) return Alert.alert("운동 종목을 선택해주세요");
    const validSets = sets.filter(s => s.weight && s.reps);
    if (validSets.length === 0) return Alert.alert("최소 1세트를 입력해주세요");
    const exId = Date.now().toString();
    addExercise({
      id: exId,
      name: selectedExercise.name,
      category: selectedExercise.category,
      settings: settings.length > 0 ? settings : undefined,
      tip: tip.trim() || undefined,
      isSingleArm,
      differentSides: isSingleArm ? differentSides : false,
      targetMuscles: selectedExercise.targetMuscles,
      restSeconds: selectedExercise.restSeconds,
      targetReps: selectedExercise.targetReps,
      note: selectedExercise.note,
    });
    validSets.forEach((st, i) => {
      const weightKg = toKg(st.weight);
      const weightRKg = (isSingleArm && differentSides && st.weightR) ? toKg(st.weightR) : undefined;
      const workoutSet: WorkoutSet = {
        id: exId + "-" + i,
        weight: weightKg,
        weightR: weightRKg,
        reps: parseInt(st.reps),
        completed: false,
      };
      addSet(exId, workoutSet);
    });
    setIsSuccess(true);
    Animated.spring(successScale, { toValue: 1, damping: 8, stiffness: 200, useNativeDriver: true }).start();
    setTimeout(() => router.back(), 650);
  };

  return (
    <View className="flex-1 bg-background">
      <Header title="운동 추가" showClose />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}>
        <ScrollView
          ref={scrollRef}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: 16 }}>

          {exerciseListCollapsed && selectedExercise ? (
            <>
              {/* 선택된 종목 요약 */}
              <View className="flex-row items-center bg-surface rounded-[18px] p-4 mb-[14px] gap-3" style={SHADOW}>
                {selectedExercise.gifUrl ? (
                  <Image source={{ uri: selectedExercise.gifUrl }}
                    style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: '#E7F7F0' }}
                    resizeMode="cover" />
                ) : null}
                <View className="flex-1">
                  <Text className="text-[11px] text-text-muted font-semibold mb-[3px]">선택된 종목</Text>
                  <Text className="text-base font-bold text-text-primary mb-1">{selectedExercise.name}</Text>
                  {selectedExercise.caloriesPerMinute ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <FlameIcon size={11} color="#FF9DB0" />
                      <Text className="text-xs font-semibold" style={{ color: '#FF9DB0' }}>
                        약 {Math.round(selectedExercise.caloriesPerMinute * 30)} kcal (30분 기준)
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View className="items-end gap-[6px]">
                  <Text className="text-[11px] px-[10px] py-[3px] rounded-[10px]"
                    style={{ color: '#FF9DB0', backgroundColor: '#FF9DB028' }}>
                    {selectedExercise.category}
                  </Text>
                  <TouchableOpacity
                    className="rounded-[20px] px-[14px] py-[7px]"
                    style={{ backgroundColor: '#6FD3B618' }}
                    onPress={handleChangeExercise}>
                    <Text className="text-[13px] font-bold" style={{ color: '#6FD3B6' }}>변경</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {MUSCLE_MAP[selectedExercise.name] && (
                <View className="bg-surface rounded-[20px] p-[14px] mb-[14px]" style={SHADOW}>
                  <MuscleMap muscles={MUSCLE_MAP[selectedExercise.name]} />
                </View>
              )}
            </>
          ) : (
            <>
              <Text className="text-[13px] font-bold text-text-secondary mb-3">운동 종목 선택</Text>

              {/* 검색창 */}
              <View className="flex-row items-center bg-surface rounded-[14px] px-3 py-[10px] mb-3 gap-2" style={SHADOW}>
                <Icon name="search" size={16} color="#B4CFC5" />
                <TextInput
                  className="flex-1 text-[15px] text-text-primary p-0"
                  placeholder="한글 검색 또는 영어로 API 검색..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#B4CFC5"
                  returnKeyType="search"
                  autoCorrect={false}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <Text style={{ fontSize: 16, color: '#B4CFC5', fontWeight: '600' }}>✕</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* ✏️ 직접 추가 카드 — 검색창 바로 아래 */}
              {!showCustomForm ? (
                <TouchableOpacity
                  className="flex-row items-center gap-3 bg-surface rounded-[16px] p-[14px] mb-3"
                  style={SHADOW}
                  onPress={() => {
                    setShowCustomForm(true);
                    setTimeout(() => {
                      scrollRef.current?.scrollTo({ y: customFormY.current, animated: true });
                      setTimeout(() => customNameRef.current?.focus(), 150);
                    }, 100);
                  }}
                  activeOpacity={0.7}>
                  <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: '#6FD3B618', alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="pencil" size={16} color="#6FD3B6" />
                  </View>
                  <View>
                    <Text className="text-[15px] font-bold" style={{ color: '#2E9E83' }}>직접 추가하기</Text>
                    <Text className="text-[11px] text-text-muted">목록에 없는 운동을 직접 추가해요</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View
                  className="bg-surface rounded-[20px] p-4 mb-3"
                  style={SHADOW}
                  onLayout={e => { customFormY.current = e.nativeEvent.layout.y; }}>
                  <View className="flex-row justify-between items-center mb-[14px]">
                    <Text className="text-[15px] font-bold text-text-primary">직접 추가</Text>
                    <TouchableOpacity onPress={() => { setShowCustomForm(false); setCustomName(""); setCustomCat(""); }}>
                      <Text style={{ fontSize: 16, color: '#B4CFC5', fontWeight: '600' }}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {/* 종목명 */}
                  <TextInput
                    ref={customNameRef}
                    className="bg-surface-alt rounded-[12px] p-3 text-[15px] text-text-primary mb-3"
                    placeholder="종목명 입력 (예: 케이블 플라이)"
                    value={customName}
                    onChangeText={setCustomName}
                    placeholderTextColor="#B4CFC5"
                    returnKeyType="done"
                  />

                  {/* 카테고리 */}
                  <Text className="text-[12px] font-bold text-text-muted mb-2">카테고리</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} keyboardShouldPersistTaps="handled">
                    {EXERCISE_CATEGORIES.map(cat => {
                      const isActive = customCat === cat;
                      return (
                        <TouchableOpacity key={cat}
                          className="rounded-[20px] px-4 py-2 mr-2"
                          style={[SHADOW, { backgroundColor: isActive ? '#FF9DB028' : '#FFFFFF' }]}
                          onPress={() => setCustomCat(cat)}>
                          <Text className="text-[13px]"
                            style={{ color: isActive ? '#FF9DB0' : '#7E9A90', fontWeight: isActive ? '700' : '600' }}>
                            {cat}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  {/* 타겟 부위 다중 선택 */}
                  <Text className="text-[12px] font-bold text-text-muted mb-2">타겟 부위 (다중 선택)</Text>
                  <View className="flex-row flex-wrap gap-2 mb-3">
                    {BODY_PARTS.map(part => {
                      const on = customTargetParts.includes(part);
                      return (
                        <TouchableOpacity
                          key={part}
                          style={{
                            borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6,
                            backgroundColor: on ? '#6FD3B6' : '#E7F7F0',
                          }}
                          onPress={() => setCustomTargetParts(prev =>
                            on ? prev.filter(p => p !== part) : [...prev, part]
                          )}>
                          <Text style={{ fontSize: 12, fontWeight: '700', color: on ? '#fff' : '#7E9A90' }}>{part}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* 쉬는 시간 */}
                  <Text className="text-[12px] font-bold text-text-muted mb-2">쉬는 시간 (초)</Text>
                  <View className="flex-row items-center gap-2 mb-3">
                    <TouchableOpacity
                      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#E7F7F0', alignItems: 'center', justifyContent: 'center' }}
                      onPress={() => setCustomRestSeconds(s => String(Math.max(0, parseInt(s) - 15)))}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#7E9A90', marginTop: -2 }}>−</Text>
                    </TouchableOpacity>
                    <TextInput
                      className="flex-1 bg-surface-alt rounded-[12px] p-3 text-[15px] text-text-primary text-center"
                      value={customRestSeconds}
                      onChangeText={setCustomRestSeconds}
                      keyboardType="numeric"
                      placeholder="60"
                      placeholderTextColor="#B4CFC5"
                    />
                    <Text className="text-[12px] text-text-muted font-bold">초</Text>
                    <TouchableOpacity
                      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#6FD3B6', alignItems: 'center', justifyContent: 'center' }}
                      onPress={() => setCustomRestSeconds(s => String(parseInt(s) + 15))}>
                      <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff', marginTop: -2 }}>+</Text>
                    </TouchableOpacity>
                  </View>

                  {/* 목표 횟수 */}
                  <Text className="text-[12px] font-bold text-text-muted mb-2">목표 횟수</Text>
                  <TextInput
                    className="bg-surface-alt rounded-[12px] p-3 text-[15px] text-text-primary mb-3"
                    placeholder="예: 12회 3세트, 15-20회, 실패할때까지"
                    value={customTargetReps}
                    onChangeText={setCustomTargetReps}
                    placeholderTextColor="#B4CFC5"
                  />

                  {/* 운동 메모 */}
                  <Text className="text-[12px] font-bold text-text-muted mb-2">운동 메모</Text>
                  <TextInput
                    className="bg-surface-alt rounded-[12px] p-3 text-[14px] text-text-primary mb-4"
                    style={{ minHeight: 72, lineHeight: 20 }}
                    placeholder="예: 무릎 조심, 허리 중립 유지"
                    value={customNote}
                    onChangeText={setCustomNote}
                    placeholderTextColor="#B4CFC5"
                    multiline
                    textAlignVertical="top"
                  />

                  <TouchableOpacity
                    className="bg-primary rounded-[20px] p-3 items-center mt-1"
                    onPress={handleAddCustomExercise}
                    activeOpacity={0.8}>
                    <Text className="text-[14px] font-bold text-white">목록에 추가하기</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 카테고리 탭 */}
              {!isEnglishSearch && showBodypartSelector && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} keyboardShouldPersistTaps="handled">
                  {EXERCISE_CATEGORIES.map(cat => {
                    const isActive = selectedCategory === cat;
                    return (
                      <TouchableOpacity key={cat}
                        className="rounded-[20px] px-4 py-2 mr-2"
                        style={[SHADOW, { backgroundColor: isActive ? '#FF9DB028' : '#FFFFFF' }]}
                        onPress={() => setSelectedCategory(isActive ? null : cat)}>
                        <Text className="text-[13px]"
                          style={{ color: isActive ? '#FF9DB0' : '#7E9A90', fontWeight: isActive ? '700' : '600' }}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {/* 검색 중 */}
              {isSearching && (
                <View className="flex-row items-center gap-2 py-[10px] px-1">
                  <ActivityIndicator size="small" color="#6FD3B6" />
                  <Text className="text-[13px] text-text-muted">검색 중...</Text>
                </View>
              )}

              <View className="mb-2">
                {/* 직접 추가한 운동 */}
                {filteredCustom.map(ex => (
                  <TouchableOpacity key={"custom-" + ex.name}
                    className="flex-row items-center bg-surface rounded-[16px] p-3 mb-2 gap-[10px]"
                    style={SHADOW}
                    onPress={() => handleSelectExercise(ex)}
                    activeOpacity={0.7}>
                    <View className="flex-1">
                      <Text className="text-[15px] font-semibold text-text-primary">{ex.name}</Text>
                      <Text className="text-[11px] text-text-muted mt-[2px]">직접 추가</Text>
                    </View>
                    <Text className="text-[12px] px-[10px] py-1 rounded-[10px]"
                      style={{ color: '#FF9DB0', backgroundColor: '#FF9DB028' }}>
                      {ex.category}
                    </Text>
                  </TouchableOpacity>
                ))}

                {/* Preset 목록 */}
                {results.length === 0 && filteredPresets.map(ex => (
                  <TouchableOpacity key={"preset-" + ex.name}
                    className="flex-row items-center bg-surface rounded-[16px] p-3 mb-2 gap-[10px]"
                    style={SHADOW}
                    onPress={() => handleSelectExercise(ex)}
                    activeOpacity={0.7}>
                    <View className="flex-1">
                      <Text className="text-[15px] font-semibold text-text-primary">{ex.name}</Text>
                    </View>
                    <Text className="text-[12px] px-[10px] py-1 rounded-[10px]"
                      style={{ color: '#FF9DB0', backgroundColor: '#FF9DB028' }}>
                      {ex.category}
                    </Text>
                  </TouchableOpacity>
                ))}

                {/* API 검색 결과 */}
                {results.map(ex => {
                  const displayName = ex.nameKo || ex.name;
                  const displayCat = ex.bodyPartKo || BODYPART_TO_CATEGORY[ex.bodyPart] || ex.bodyPart;
                  return (
                    <TouchableOpacity key={ex.id}
                      className="flex-row items-center bg-surface rounded-[16px] p-3 mb-2 gap-[10px]"
                      style={SHADOW}
                      onPress={() => handleSelectExercise({ name: displayName, category: displayCat, gifUrl: ex.gifUrl, caloriesPerMinute: ex.caloriesPerMinute })}
                      activeOpacity={0.7}>
                      {ex.gifUrl ? (
                        <Image source={{ uri: ex.gifUrl }}
                          style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: '#E7F7F0' }}
                          resizeMode="cover" />
                      ) : null}
                      <View className="flex-1">
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text className="text-[15px] font-semibold text-text-primary">{displayName}</Text>
                          {ex.isCustom && (
                            <View style={{ backgroundColor: '#6FD3B620', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 10, fontWeight: '800', color: '#2E9E83' }}>내 운동</Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-[11px] text-text-muted mt-[2px]">
                          {displayCat}{ex.equipmentKo ? ` · ${ex.equipmentKo}` : ""}{ex.caloriesPerMinute ? ` · ${ex.caloriesPerMinute} kcal/분` : ""}
                        </Text>
                      </View>
                      <Text className="text-[12px] px-[10px] py-1 rounded-[10px]"
                        style={{ color: '#FF9DB0', backgroundColor: '#FF9DB028' }}>
                        {displayCat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}

                {!isSearching && results.length === 0 && filteredPresets.length === 0 && filteredCustom.length === 0 && searchQuery.trim() && (
                  <View className="items-center py-6">
                    <Text className="text-[14px] text-text-muted">검색 결과가 없어요</Text>
                  </View>
                )}
              </View>
            </>
          )}

          {/* 세트 기록 */}
          {selectedExercise && (
            <View
              className="bg-surface rounded-[20px] p-4 mb-4"
              style={SHADOW}
              onLayout={e => { setsSectionY.current = e.nativeEvent.layout.y; }}>
              {/* 헤더 */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text className="text-[15px] font-bold text-text-primary">
                  {selectedExercise.name} 세트 기록
                </Text>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {(['kg', 'lbs'] as const).map(u => (
                    <TouchableOpacity key={u}
                      style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: unit === u ? '#6FD3B6' : '#E7F7F0' }}
                      onPress={() => setUnit(u)}>
                      <Text style={{ fontSize: 12, fontWeight: '700', color: unit === u ? '#fff' : '#7E9A90' }}>{u}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* 한팔 토글 */}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#7E9A90' }}>한팔 기준</Text>
                <TouchableOpacity
                  style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: isSingleArm ? '#6FD3B6' : '#E7F7F0', justifyContent: 'center', paddingHorizontal: 2 }}
                  onPress={() => { setIsSingleArm(v => !v); setDifferentSides(false); }}
                  activeOpacity={0.8}>
                  <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', transform: [{ translateX: isSingleArm ? 20 : 0 }], shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 3, elevation: 2 }} />
                </TouchableOpacity>
              </View>
              {isSingleArm && (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-end', marginBottom: 10 }}
                  onPress={() => setDifferentSides(v => !v)}>
                  <View style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, borderColor: differentSides ? '#6FD3B6' : '#D6F0E6', backgroundColor: differentSides ? '#6FD3B6' : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                    {differentSides && <Icon name="check" size={10} color="#fff" />}
                  </View>
                  <Text style={{ fontSize: 12, color: '#7E9A90', fontWeight: '600' }}>좌우 다른 무게</Text>
                </TouchableOpacity>
              )}

              {/* 무게 프리셋 가로 스크롤 */}
              <View style={{ marginBottom: 10 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#B4CFC5', marginBottom: 6 }}>무게 프리셋 ({unit})</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {WEIGHT_PRESETS.map(w => (
                    <TouchableOpacity
                      key={w}
                      onPress={() => applyWeightPreset(w)}
                      style={{ backgroundColor: '#E7F7F0', borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginRight: 6 }}>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: '#2E9E83' }}>{w}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* 컬럼 헤더 */}
              <View className="flex-row mb-2">
                <Text className="text-[11px] text-text-muted font-semibold text-center" style={{ flex: 0.4 }}>세트</Text>
                {isSingleArm && differentSides ? (
                  <>
                    <Text className="text-[11px] text-text-muted font-semibold text-center" style={{ flex: 1.2 }}>L ({unit})</Text>
                    <Text className="text-[11px] text-text-muted font-semibold text-center" style={{ flex: 1.2 }}>R ({unit})</Text>
                  </>
                ) : (
                  <Text className="text-[11px] text-text-muted font-semibold text-center" style={{ flex: 1.2 }}>
                    무게({unit}){isSingleArm ? ' · 한팔' : ''}
                  </Text>
                )}
                <Text className="text-[11px] text-text-muted font-semibold text-center" style={{ flex: 1.2 }}>횟수</Text>
              </View>

              {sets.map((st, i) => (
                <View key={i} style={{ marginBottom: 10 }}>
                  <View className="flex-row items-center gap-1">
                    <Text className="text-[14px] text-text-secondary text-center font-bold" style={{ flex: 0.4 }}>{i + 1}</Text>

                    {/* 무게 +/- */}
                    <View style={{ flex: 1.2, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <TouchableOpacity
                        onPress={() => adjustWeight(i, -5)}
                        style={{ width: 30, height: 44, borderRadius: 999, backgroundColor: '#E7F7F0', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#7E9A90', marginTop: -2 }}>−</Text>
                      </TouchableOpacity>
                      <TextInput
                        ref={el => { setWeightRefs.current[i] = el; }}
                        style={{ flex: 1, backgroundColor: '#E7F7F0', borderRadius: 12, height: 44, textAlign: 'center', fontSize: 15, fontWeight: '700', color: '#34514A' }}
                        value={st.weight}
                        onFocus={() => { lastFocusedSetIndex.current = i; }}
                        onChangeText={v => setSets(prev => prev.map((s, idx) => idx === i ? { ...s, weight: v } : s))}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#B4CFC5"
                        returnKeyType="next"
                      />
                      <TouchableOpacity
                        onPress={() => adjustWeight(i, 5)}
                        style={{ width: 30, height: 44, borderRadius: 999, backgroundColor: '#6FD3B6', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff', marginTop: -2 }}>+</Text>
                      </TouchableOpacity>
                    </View>

                    {isSingleArm && differentSides && (
                      <TextInput
                        style={{ flex: 1.2, backgroundColor: '#E7F7F0', borderRadius: 12, height: 44, textAlign: 'center', fontSize: 15, fontWeight: '700', color: '#34514A', borderWidth: 1.5, borderColor: '#FFD36E40' }}
                        value={st.weightR}
                        onChangeText={v => setSets(prev => prev.map((s, idx) => idx === i ? { ...s, weightR: v } : s))}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#B4CFC5"
                        returnKeyType="next"
                      />
                    )}

                    {/* 횟수 +/- */}
                    <View style={{ flex: 1.2, flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <TouchableOpacity
                        onPress={() => adjustReps(i, -1)}
                        style={{ width: 30, height: 44, borderRadius: 999, backgroundColor: '#E7F7F0', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#7E9A90', marginTop: -2 }}>−</Text>
                      </TouchableOpacity>
                      <TextInput
                        style={{ flex: 1, backgroundColor: '#E7F7F0', borderRadius: 12, height: 44, textAlign: 'center', fontSize: 15, fontWeight: '700', color: '#34514A' }}
                        value={st.reps}
                        onChangeText={v => setSets(prev => prev.map((s, idx) => idx === i ? { ...s, reps: v } : s))}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor="#B4CFC5"
                        returnKeyType={i === sets.length - 1 ? "done" : "next"}
                        onSubmitEditing={i === sets.length - 1 ? Keyboard.dismiss : undefined}
                      />
                      <TouchableOpacity
                        onPress={() => adjustReps(i, 1)}
                        style={{ width: 30, height: 44, borderRadius: 999, backgroundColor: '#FFAE96', alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontSize: 16, fontWeight: '800', color: '#fff', marginTop: -2 }}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
              <TouchableOpacity
                className="items-center p-[10px] rounded-[20px] mt-1"
                style={{ backgroundColor: '#FF9DB018' }}
                onPress={handleAddSet}>
                <Text className="text-[13px] font-bold" style={{ color: '#FF9DB0' }}>+ 세트 추가</Text>
              </TouchableOpacity>

              {/* 기구 설정 */}
              <View className="h-px bg-surface-alt my-[14px]" />
              <View className="flex-row justify-between items-center mb-[10px]">
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                  <Icon name="settings" size={14} color="#34514A" />
                  <Text className="text-[14px] font-bold text-text-primary">기구 설정</Text>
                </View>
                <TouchableOpacity
                  className="flex-row items-center gap-1 rounded-[20px] px-3 py-[6px]"
                  style={{ backgroundColor: '#6FD3B618' }}
                  onPress={openSettingsSheet}>
                  <Icon name="plus" size={16} color="#6FD3B6" />
                  <Text className="text-[13px] font-bold" style={{ color: '#6FD3B6' }}>설정 추가</Text>
                </TouchableOpacity>
              </View>
              {settings.length > 0 ? (
                <View className="flex-row flex-wrap gap-2">
                  {settings.map((s, i) => (
                    <TouchableOpacity key={i}
                      className="flex-row items-center gap-[5px] rounded-[20px] px-3 py-[6px]"
                      style={{ backgroundColor: '#6FD3B618' }}
                      onPress={() => removeSetting(i)}
                      activeOpacity={0.7}>
                      <Text className="text-xs font-semibold" style={{ color: '#6FD3B6' }}>{s.key}: {s.value}</Text>
                      <Text style={{ fontSize: 11, color: '#6FD3B6', fontWeight: '700' }}>✕</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text className="text-xs text-text-muted italic">시트높이, 각도 등 기구 설정을 기록하세요</Text>
              )}

              {/* 운동 팁 — 헤더 클릭 시 포커스 */}
              <View className="h-px bg-surface-alt my-[14px]" />
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}
                onPress={() => tipRef.current?.focus()}
                activeOpacity={0.7}>
                <Icon name="bulb" size={14} color="#7E9A90" />
                <Text className="text-[14px] font-bold text-text-primary">운동 팁</Text>
                <Text style={{ fontSize: 11, color: '#B4CFC5', fontWeight: '600' }}>탭하여 입력</Text>
              </TouchableOpacity>
              <TextInput
                ref={tipRef}
                className="bg-surface-alt rounded-[12px] p-3 text-text-primary text-[14px] mt-[10px]"
                style={{ minHeight: 80, lineHeight: 20 }}
                placeholder="자유롭게 팁이나 메모를 남겨보세요"
                value={tip}
                onChangeText={setTip}
                placeholderTextColor="#B4CFC5"
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                returnKeyType="done"
                blurOnSubmit
              />
            </View>
          )}
        </ScrollView>

        {/* 고정 푸터 */}
        <View
          className="px-5 pt-3 border-t border-surface-alt bg-background"
          style={{ paddingBottom: Math.max(insets.bottom, 12) }}>
          <TouchableOpacity
            className="bg-workout rounded-[24px] py-4 items-center"
            onPress={handleAdd}
            disabled={isSuccess}
            activeOpacity={0.8}>
            {isSuccess ? (
              <Animated.View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, transform: [{ scale: successScale }] }}>
                <Icon name="check" size={20} color="#fff" />
                <Text className="text-base font-bold text-white">추가 완료!</Text>
              </Animated.View>
            ) : (
              <Text className="text-base font-bold text-white">운동 추가</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* 기구 설정 시트 */}
      <Modal visible={showSettingsSheet} transparent animationType="slide" onRequestClose={closeSettingsSheet}>
        <TouchableOpacity
          className="flex-1 justify-end"
          style={{ backgroundColor: 'rgba(30, 80, 65, 0.4)' }}
          activeOpacity={1}
          onPress={closeSettingsSheet}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%" }}>
            <View className="bg-surface rounded-t-[28px] p-6 pb-9">
              <View className="w-10 h-1 bg-text-muted rounded-full self-center mb-5" />
              <Text className="text-[18px] font-extrabold text-text-primary mb-5">기구 설정 추가</Text>

              <Text className="text-xs font-bold text-text-secondary mb-[10px]">항목 선택</Text>
              <View className="flex-row flex-wrap gap-2 mb-1">
                {PRESET_SETTING_KEYS.map(k => {
                  const isActive = !isCustomKeyMode && settingKey === k;
                  return (
                    <TouchableOpacity key={k}
                      className="rounded-[20px] px-[14px] py-2"
                      style={{ backgroundColor: isActive ? '#6FD3B628' : '#E7F7F0' }}
                      onPress={() => { setSettingKey(k); setIsCustomKeyMode(false); setCustomKeyName(""); }}>
                      <Text className="text-[13px]" style={{ color: isActive ? '#6FD3B6' : '#7E9A90', fontWeight: isActive ? '700' : '600' }}>{k}</Text>
                    </TouchableOpacity>
                  );
                })}
                {customSettingKeys.map(k => {
                  const isActive = !isCustomKeyMode && settingKey === k.name;
                  return (
                    <View key={k.id} className="flex-row items-center gap-[2px]">
                      <TouchableOpacity
                        className="rounded-[20px] px-[14px] py-2 border"
                        style={{ backgroundColor: isActive ? '#6FD3B628' : '#E7F7F0', borderColor: '#6FD3B650' }}
                        onPress={() => { setSettingKey(k.name); setIsCustomKeyMode(false); setCustomKeyName(""); }}>
                        <Text className="text-[13px]" style={{ color: isActive ? '#6FD3B6' : '#7E9A90', fontWeight: isActive ? '700' : '600' }}>{k.name}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ marginLeft: -6, marginTop: -8 }}
                        onPress={() => deleteCustomKey(k.id)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                        <Text style={{ fontSize: 13, color: '#B4CFC5', fontWeight: '600' }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>

              <View className="flex-row items-center my-3">
                <View className="flex-1 h-px bg-surface-alt" />
              </View>
              <TouchableOpacity
                className="flex-row items-center gap-[6px] self-start rounded-[20px] px-[14px] py-2"
                style={{ backgroundColor: isCustomKeyMode ? '#6FD3B618' : '#E7F7F0' }}
                onPress={() => { setIsCustomKeyMode(true); setSettingKey(""); setTimeout(() => customKeyInputRef.current?.focus(), 100); }}>
                <Icon name="plus" size={15} color={isCustomKeyMode ? '#6FD3B6' : '#7E9A90'} />
                <Text className="text-[13px]" style={{ color: isCustomKeyMode ? '#6FD3B6' : '#7E9A90', fontWeight: isCustomKeyMode ? '700' : '600' }}>직접 입력</Text>
              </TouchableOpacity>

              {isCustomKeyMode && (
                <TextInput
                  ref={customKeyInputRef}
                  className="bg-surface-alt rounded-[14px] p-[13px] text-[15px] text-text-primary mt-[10px] border-[1.5px]"
                  style={{ borderColor: '#6FD3B660' }}
                  placeholder="항목명 입력 (예: 케이블각도, 풀리높이)"
                  value={customKeyName}
                  onChangeText={setCustomKeyName}
                  placeholderTextColor="#B4CFC5"
                  returnKeyType="next"
                />
              )}

              <Text className="text-xs font-bold text-text-secondary mb-[10px] mt-4">값 입력</Text>
              <TextInput
                className="bg-surface-alt rounded-[14px] p-[14px] text-[15px] text-text-primary mb-4"
                placeholder="예: 3단계, 45도, 오버핸드"
                value={settingValue}
                onChangeText={setSettingValue}
                placeholderTextColor="#B4CFC5"
                returnKeyType="done"
                onSubmitEditing={handleAddSetting}
              />

              <TouchableOpacity
                className="bg-primary rounded-[24px] p-[15px] items-center"
                onPress={handleAddSetting}
                activeOpacity={0.8}>
                <Text className="text-[15px] font-bold text-white">추가하기</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
