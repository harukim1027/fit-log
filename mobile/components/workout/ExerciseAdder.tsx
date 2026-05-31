import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, Alert,
  Keyboard, KeyboardAvoidingView, Platform, Modal, LayoutAnimation,
  UIManager, Image, ActivityIndicator, Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "../ui";
import { Icon, FlameIcon } from "../AppIcons";
import apiClient from "../../lib/apiClient";
import { useExerciseStore } from "../../store/exerciseStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useWorkoutStore } from "../../store/workoutStore";
import { EXERCISE_CATEGORIES, EXERCISE_MAPPING } from "../../constants";
import { ExerciseSetting } from "../../types/workout";
import MuscleMap, { MUSCLE_MAP } from "../MuscleMap";

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SHADOW = {
  shadowColor: "#4EBFA0",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.09,
  shadowRadius: 10,
  elevation: 3,
};

const BODYPART_TO_CATEGORY: Record<string, string> = {
  chest: "가슴", back: "등", shoulders: "어깨",
  "upper arms": "팔", "lower arms": "팔",
  "upper legs": "하체", "lower legs": "하체",
  waist: "복근", cardio: "유산소",
};

const BODY_PARTS = ["가슴", "등", "어깨", "팔", "하체", "복근", "유산소", "전신"];

const WEIGHT_PRESETS = [5, 10, 15, 20, 25, 30, 40, 50, 60, 70, 80, 90, 100];

const PRESET_SETTING_KEYS = [
  "시트높이", "등받이각도", "그립종류", "발판위치", "바높이", "인클라인각도", "기타",
];

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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isKorean = (text: string) => /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(text);

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

function lookupByEnglishContains(query: string): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const results: string[] = [];
  for (const en of Object.values(EXERCISE_MAPPING)) {
    if (en.toLowerCase().includes(q) && !results.includes(en)) results.push(en);
  }
  return results;
}

// ─── Types ────────────────────────────────────────────────────────────────────

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

export type ExerciseAddResult = {
  name: string;
  category: string;
  gifUrl?: string;
  targetMuscles?: string[];
  settings?: ExerciseSetting[];
  tip?: string;
  restSeconds?: number;
  targetReps?: string;
  // session mode
  sets?: Array<{ weight: number; weightR?: number; reps: number }>;
  isSingleArm?: boolean;
  differentSides?: boolean;
  // routine mode
  defaultSets?: number;
  defaultWeight?: number;
};

type ExerciseAdderProps = {
  mode: "session" | "routine";
  onAdd: (data: ExerciseAddResult) => void;
  onClose: () => void;
  editMode?: boolean;
  initialExercise?: {
    name: string;
    category: string;
    settings?: import("../../types/workout").ExerciseSetting[];
    tip?: string;
    restSeconds?: number;
    targetReps?: string;
    targetMuscles?: string[];
    isSingleArm?: boolean;
    differentSides?: boolean;
    sets?: Array<{ weight: number; reps: number; weightR?: number }>;
    defaultSets?: number;
    defaultWeight?: number;
  };
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExerciseAdder({ mode, onAdd, onClose, editMode = false, initialExercise }: ExerciseAdderProps) {
  const insets = useSafeAreaInsets();
  const { results, isSearching, searchExercises, clearResults, saveCustomExercise } = useExerciseStore();
  const { weightUnit, showBodypartSelector, loadSettings } = useSettingsStore();
  const { exerciseHistoryCache, fetchExerciseHistory } = useWorkoutStore();

  // Refs
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

  // Exercise selection
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

  // Session mode state
  const [unit, setUnit] = useState<"kg" | "lbs">(weightUnit);
  const [isSingleArm, setIsSingleArm] = useState(false);
  const [differentSides, setDifferentSides] = useState(false);
  const [sets, setSets] = useState([{ weight: "", weightR: "", reps: "" }]);

  // Routine mode state
  const [defaultSets, setDefaultSets] = useState("3");
  const [defaultWeight, setDefaultWeight] = useState("");

  // Common settings
  const [settings, setSettings] = useState<ExerciseSetting[]>([]);
  const [tip, setTip] = useState("");
  const [restSeconds, setRestSeconds] = useState("60");
  const [targetReps, setTargetReps] = useState("");

  // Equipment settings sheet
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [settingKey, setSettingKey] = useState(PRESET_SETTING_KEYS[0]);
  const [settingValue, setSettingValue] = useState("");
  const [customSettingKeys, setCustomSettingKeys] = useState<CustomKey[]>([]);
  const [isCustomKeyMode, setIsCustomKeyMode] = useState(false);
  const [customKeyName, setCustomKeyName] = useState("");

  // Success animation (session mode)
  const [isSuccess, setIsSuccess] = useState(false);
  const successScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    loadSettings().then(() => setUnit(useSettingsStore.getState().weightUnit));
    apiClient.get<CustomKey[]>("/workout-settings")
      .then(res => setCustomSettingKeys(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (editMode && initialExercise) {
      const ex = initialExercise;
      setSelectedExercise({ name: ex.name, category: ex.category, targetMuscles: ex.targetMuscles });
      setExerciseListCollapsed(true);
      setSettings(ex.settings ?? []);
      setTip(ex.tip ?? '');
      setRestSeconds(String(ex.restSeconds ?? 60));
      setTargetReps(ex.targetReps ?? '');
      if (mode === 'session') {
        setIsSingleArm(ex.isSingleArm ?? false);
        setDifferentSides(ex.differentSides ?? false);
        if (ex.sets && ex.sets.length > 0) {
          setSets(ex.sets.map(s => ({ weight: String(s.weight), weightR: String(s.weightR ?? ''), reps: String(s.reps) })));
        }
      } else if (mode === 'routine') {
        if (ex.defaultSets) setDefaultSets(String(ex.defaultSets));
        if (ex.defaultWeight) setDefaultWeight(String(ex.defaultWeight));
      }
    }
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const searchId = ++searchIdRef.current;
    const q = searchQuery.trim();
    if (!q) { clearResults(); return; }
    clearResults();
    if (isKorean(q)) {
      const englishTerms = lookupAllEnglish(q);
      if (englishTerms.length > 0) {
        searchTimer.current = setTimeout(() => {
          if (searchIdRef.current !== searchId) return;
          searchExercises(englishTerms[0]);
        }, 400);
      }
    } else {
      const byMap = lookupByEnglishContains(q);
      searchTimer.current = setTimeout(() => {
        if (searchIdRef.current !== searchId) return;
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

  const filteredCustom = customExercises.filter(ex => {
    const matchesCat = !selectedCategory || ex.category === selectedCategory;
    const q = searchQuery.trim();
    const matchesQuery = !q || ex.name.includes(q);
    return matchesCat && matchesQuery;
  });

  // ─── Exercise selection handlers ─────────────────────────────────────────

  const handleSelectExercise = (ex: SelectedExercise) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedExercise(ex);
    setExerciseListCollapsed(true);
    setRestSeconds(ex.restSeconds ? String(ex.restSeconds) : "60");
    setTargetReps(ex.targetReps ?? "");
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: setsSectionY.current, animated: true });
    }, 320);
    if (mode === "session") {
      setTimeout(() => setWeightRefs.current[0]?.focus(), 520);
    }
  };

  const handleChangeExercise = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedExercise(null);
    setExerciseListCollapsed(false);
    setSets([{ weight: "", weightR: "", reps: "" }]);
    setSettings([]);
    setTip("");
    setRestSeconds("60");
    setTargetReps("");
    setDefaultSets("3");
    setDefaultWeight("");
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
    };
    setCustomExercises(prev => [...prev, newEx]);
    const savedName = customName.trim();
    const savedCat = customCat;
    setCustomName("");
    setCustomCat("");
    setCustomTargetParts([]);
    setShowCustomForm(false);
    handleSelectExercise(newEx);
    saveCustomExercise(savedName, savedCat);
  };

  // ─── Session mode set handlers ────────────────────────────────────────────

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

  const toKg = (val: string) => {
    const n = parseFloat(val);
    if (isNaN(n)) return 0;
    return unit === "lbs" ? Math.round(n * 0.453592 * 10) / 10 : n;
  };

  // ─── Settings sheet handlers ──────────────────────────────────────────────

  const openSettingsSheet = () => {
    setIsCustomKeyMode(false);
    setCustomKeyName("");
    setSettingKey(PRESET_SETTING_KEYS[0]);
    setSettingValue("");
    setShowSettingsSheet(true);
  };

  const closeSettingsSheet = () => {
    setShowSettingsSheet(false);
    setIsCustomKeyMode(false);
    setCustomKeyName("");
    setSettingValue("");
  };

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
    } catch {
      Alert.alert("삭제 실패", "잠시 후 다시 시도해주세요");
    }
  };

  const removeSetting = (idx: number) => setSettings(prev => prev.filter((_, i) => i !== idx));

  // ─── Submit handler ───────────────────────────────────────────────────────

  const handleAdd = () => {
    if (!selectedExercise) return Alert.alert("운동 종목을 선택해주세요");

    if (mode === "session") {
      const validSets = sets.filter(s => s.weight && s.reps);
      if (validSets.length === 0) return Alert.alert("최소 1세트를 입력해주세요");
      onAdd({
        name: selectedExercise.name,
        category: selectedExercise.category,
        gifUrl: selectedExercise.gifUrl,
        targetMuscles: selectedExercise.targetMuscles,
        settings: settings.length > 0 ? settings : undefined,
        tip: tip.trim() || undefined,
        restSeconds: parseInt(restSeconds) || undefined,
        targetReps: targetReps.trim() || undefined,
        isSingleArm,
        differentSides: isSingleArm ? differentSides : false,
        sets: validSets.map(st => ({
          weight: toKg(st.weight),
          weightR: (isSingleArm && differentSides && st.weightR) ? toKg(st.weightR) : undefined,
          reps: parseInt(st.reps),
        })),
      });
      setIsSuccess(true);
      Animated.spring(successScale, { toValue: 1, damping: 8, stiffness: 200, useNativeDriver: true }).start();
      setTimeout(onClose, 650);
    } else {
      onAdd({
        name: selectedExercise.name,
        category: selectedExercise.category,
        gifUrl: selectedExercise.gifUrl,
        targetMuscles: selectedExercise.targetMuscles,
        settings: settings.length > 0 ? settings : undefined,
        tip: tip.trim() || undefined,
        restSeconds: parseInt(restSeconds) || undefined,
        targetReps: targetReps.trim() || undefined,
        defaultSets: Math.max(1, parseInt(defaultSets) || 3),
        defaultWeight: parseFloat(defaultWeight) || undefined,
      });
    }
  };

  // ─── Previous record for session mode ────────────────────────────────────

  useEffect(() => {
    if (mode === "session" && selectedExercise) {
      fetchExerciseHistory(selectedExercise.name, "recent");
    }
  }, [selectedExercise?.name, mode]);

  const prevRecord = selectedExercise
    ? exerciseHistoryCache.get(`${selectedExercise.name}:recent`)
    : null;

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: "#EFFAF4" }}>
      <Header title={editMode ? "운동 수정" : "운동 추가"} showClose onClose={onClose} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}>
        <ScrollView
          ref={scrollRef}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: 16 }}>

          {/* ── Exercise selection phase ── */}
          {exerciseListCollapsed && selectedExercise ? (
            <>
              {/* Selected exercise summary card */}
              <View style={[{ flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 18, padding: 16, marginBottom: 14, gap: 12 }, SHADOW]}>
                {selectedExercise.gifUrl ? (
                  <Image source={{ uri: selectedExercise.gifUrl }}
                    style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: "#E7F7F0" }}
                    resizeMode="cover" />
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: "#B4CFC5", fontWeight: "600", marginBottom: 3 }}>선택된 종목</Text>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: "#34514A", marginBottom: 2 }}>{selectedExercise.name}</Text>
                  {selectedExercise.caloriesPerMinute ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                      <FlameIcon size={11} color="#FF9DB0" />
                      <Text style={{ fontSize: 11, fontWeight: "600", color: "#FF9DB0" }}>
                        약 {Math.round(selectedExercise.caloriesPerMinute * 30)} kcal (30분)
                      </Text>
                    </View>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={{ backgroundColor: "#6FD3B618", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 }}
                  onPress={handleChangeExercise}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#6FD3B6" }}>변경</Text>
                </TouchableOpacity>
              </View>

              {/* MuscleMap */}
              {MUSCLE_MAP[selectedExercise.name] && (
                <View style={[{ backgroundColor: "#fff", borderRadius: 20, padding: 14, marginBottom: 14 }, SHADOW]}>
                  <MuscleMap muscles={MUSCLE_MAP[selectedExercise.name]} />
                </View>
              )}

              {/* Previous record (session mode) */}
              {mode === "session" && prevRecord && prevRecord.comparisonSession && (
                <View style={[{ backgroundColor: "#FFF1E3", borderRadius: 16, padding: 12, marginBottom: 14, flexDirection: "row", alignItems: "center", gap: 8 }, SHADOW]}>
                  <Icon name="refresh" size={14} color="#E6932F" />
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#E6932F" }}>
                    이전 기록: {prevRecord.comparisonSession.maxWeight} kg × {prevRecord.comparisonSession.totalSets} 세트
                  </Text>
                </View>
              )}
            </>
          ) : (
            <>
              <Text style={{ fontSize: 13, fontWeight: "700", color: "#7E9A90", marginBottom: 12 }}>운동 종목 선택</Text>

              {/* Search bar */}
              <View style={[{ flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, gap: 8 }, SHADOW]}>
                <Icon name="search" size={16} color="#B4CFC5" />
                <TextInput
                  style={{ flex: 1, fontSize: 15, color: "#34514A" }}
                  placeholder="한글 검색 또는 영어로 API 검색..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor="#B4CFC5"
                  returnKeyType="search"
                  autoCorrect={false}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <Text style={{ fontSize: 16, color: "#B4CFC5", fontWeight: "600" }}>✕</Text>
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* 직접 추가 card */}
              {!showCustomForm ? (
                <TouchableOpacity
                  style={[{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#fff", borderRadius: 16, padding: 14, marginBottom: 12 }, SHADOW]}
                  onPress={() => {
                    setShowCustomForm(true);
                    setTimeout(() => {
                      scrollRef.current?.scrollTo({ y: customFormY.current, animated: true });
                      setTimeout(() => customNameRef.current?.focus(), 150);
                    }, 100);
                  }}
                  activeOpacity={0.7}>
                  <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: "#6FD3B618", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="pencil" size={16} color="#6FD3B6" />
                  </View>
                  <View>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#2E9E83" }}>직접 추가하기</Text>
                    <Text style={{ fontSize: 11, color: "#B4CFC5" }}>목록에 없는 운동을 직접 추가해요</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View
                  style={[{ backgroundColor: "#fff", borderRadius: 20, padding: 16, marginBottom: 12 }, SHADOW]}
                  onLayout={e => { customFormY.current = e.nativeEvent.layout.y; }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: "#34514A" }}>직접 추가</Text>
                    <TouchableOpacity onPress={() => { setShowCustomForm(false); setCustomName(""); setCustomCat(""); }}>
                      <Text style={{ fontSize: 16, color: "#B4CFC5", fontWeight: "600" }}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    ref={customNameRef}
                    style={{ backgroundColor: "#E7F7F0", borderRadius: 12, padding: 12, fontSize: 15, color: "#34514A", marginBottom: 12 }}
                    placeholder="종목명 입력 (예: 케이블 플라이)"
                    value={customName}
                    onChangeText={setCustomName}
                    placeholderTextColor="#B4CFC5"
                    returnKeyType="done"
                  />

                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#B4CFC5", marginBottom: 8 }}>카테고리</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} keyboardShouldPersistTaps="handled">
                    {EXERCISE_CATEGORIES.map(cat => {
                      const on = customCat === cat;
                      return (
                        <TouchableOpacity key={cat}
                          style={[{ borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, backgroundColor: on ? "#FF9DB028" : "#fff" }, SHADOW]}
                          onPress={() => setCustomCat(cat)}>
                          <Text style={{ fontSize: 13, color: on ? "#FF9DB0" : "#7E9A90", fontWeight: on ? "700" : "600" }}>{cat}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#B4CFC5", marginBottom: 8 }}>타겟 부위 (다중 선택)</Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
                    {BODY_PARTS.map(part => {
                      const on = customTargetParts.includes(part);
                      return (
                        <TouchableOpacity key={part}
                          style={{ borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: on ? "#6FD3B6" : "#E7F7F0" }}
                          onPress={() => setCustomTargetParts(prev => on ? prev.filter(p => p !== part) : [...prev, part])}>
                          <Text style={{ fontSize: 12, fontWeight: "700", color: on ? "#fff" : "#7E9A90" }}>{part}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={{ fontSize: 11, color: "#B4CFC5", marginBottom: 12, textAlign: "center" }}>
                    세트, 쉬는 시간, 팁은 다음 단계에서 설정해요
                  </Text>

                  <TouchableOpacity
                    style={{ backgroundColor: "#6FD3B6", borderRadius: 20, padding: 12, alignItems: "center" }}
                    onPress={handleAddCustomExercise}
                    activeOpacity={0.8}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#fff" }}>다음 단계 →</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Category tabs */}
              {!isEnglishSearch && showBodypartSelector && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} keyboardShouldPersistTaps="handled">
                  {EXERCISE_CATEGORIES.map(cat => {
                    const on = selectedCategory === cat;
                    return (
                      <TouchableOpacity key={cat}
                        style={[{ borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, backgroundColor: on ? "#FF9DB028" : "#fff" }, SHADOW]}
                        onPress={() => setSelectedCategory(on ? null : cat)}>
                        <Text style={{ fontSize: 13, color: on ? "#FF9DB0" : "#7E9A90", fontWeight: on ? "700" : "600" }}>{cat}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {isSearching && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 }}>
                  <ActivityIndicator size="small" color="#6FD3B6" />
                  <Text style={{ fontSize: 13, color: "#7E9A90" }}>검색 중...</Text>
                </View>
              )}

              {/* Custom exercises */}
              {filteredCustom.map(ex => (
                <TouchableOpacity key={"custom-" + ex.name}
                  style={[{ flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16, padding: 12, marginBottom: 8, gap: 10 }, SHADOW]}
                  onPress={() => handleSelectExercise(ex)}
                  activeOpacity={0.7}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: "#34514A" }}>{ex.name}</Text>
                    <Text style={{ fontSize: 11, color: "#B4CFC5", marginTop: 2 }}>직접 추가</Text>
                  </View>
                </TouchableOpacity>
              ))}

              {/* Preset exercises */}
              {results.length === 0 && filteredPresets.map(ex => (
                <TouchableOpacity key={"preset-" + ex.name}
                  style={[{ flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16, padding: 12, marginBottom: 8, gap: 10 }, SHADOW]}
                  onPress={() => handleSelectExercise(ex)}
                  activeOpacity={0.7}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: "#34514A" }}>{ex.name}</Text>
                    <Text style={{ fontSize: 11, color: "#B4CFC5", marginTop: 2 }}>{ex.category}</Text>
                  </View>
                </TouchableOpacity>
              ))}

              {/* API search results */}
              {results.map(ex => {
                const displayName = ex.nameKo || ex.name;
                const displayCat = ex.bodyPartKo || BODYPART_TO_CATEGORY[ex.bodyPart] || ex.bodyPart;
                return (
                  <TouchableOpacity key={ex.id}
                    style={[{ flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 16, padding: 12, marginBottom: 8, gap: 10 }, SHADOW]}
                    onPress={() => handleSelectExercise({ name: displayName, category: displayCat, gifUrl: ex.gifUrl, caloriesPerMinute: ex.caloriesPerMinute })}
                    activeOpacity={0.7}>
                    {ex.gifUrl ? (
                      <Image source={{ uri: ex.gifUrl }}
                        style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: "#E7F7F0" }}
                        resizeMode="cover" />
                    ) : null}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={{ fontSize: 15, fontWeight: "600", color: "#34514A" }}>{displayName}</Text>
                        {ex.isCustom && (
                          <View style={{ backgroundColor: "#6FD3B620", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 10, fontWeight: "800", color: "#2E9E83" }}>내 운동</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 11, color: "#B4CFC5", marginTop: 2 }}>
                        {displayCat}{ex.equipmentKo ? ` · ${ex.equipmentKo}` : ""}{ex.caloriesPerMinute ? ` · ${ex.caloriesPerMinute} kcal/분` : ""}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {!isSearching && results.length === 0 && filteredPresets.length === 0 && filteredCustom.length === 0 && searchQuery.trim() && (
                <View style={{ alignItems: "center", paddingVertical: 24 }}>
                  <Text style={{ fontSize: 14, color: "#B4CFC5" }}>검색 결과가 없어요</Text>
                </View>
              )}
            </>
          )}

          {/* ── Configuration phase ── */}
          {selectedExercise && (
            <View
              style={[{ backgroundColor: "#fff", borderRadius: 20, padding: 16, marginBottom: 16 }, SHADOW]}
              onLayout={e => { setsSectionY.current = e.nativeEvent.layout.y; }}>

              {/* ── SESSION MODE: Set recording ── */}
              {mode === "session" && (
                <>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: "#34514A" }}>세트 기록</Text>
                    <View style={{ flexDirection: "row", gap: 4 }}>
                      {(["kg", "lbs"] as const).map(u => (
                        <TouchableOpacity key={u}
                          style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: unit === u ? "#6FD3B6" : "#E7F7F0" }}
                          onPress={() => setUnit(u)}>
                          <Text style={{ fontSize: 12, fontWeight: "700", color: unit === u ? "#fff" : "#7E9A90" }}>{u}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* isSingleArm toggle */}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#7E9A90" }}>한팔 기준</Text>
                    <TouchableOpacity
                      style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: isSingleArm ? "#6FD3B6" : "#E7F7F0", justifyContent: "center", paddingHorizontal: 2 }}
                      onPress={() => { setIsSingleArm(v => !v); setDifferentSides(false); }}
                      activeOpacity={0.8}>
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: "#fff", transform: [{ translateX: isSingleArm ? 20 : 0 }], shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 3, elevation: 2 }} />
                    </TouchableOpacity>
                  </View>
                  {isSingleArm && (
                    <TouchableOpacity
                      style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-end", marginBottom: 10 }}
                      onPress={() => setDifferentSides(v => !v)}>
                      <View style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, borderColor: differentSides ? "#6FD3B6" : "#D6F0E6", backgroundColor: differentSides ? "#6FD3B6" : "transparent", alignItems: "center", justifyContent: "center" }}>
                        {differentSides && <Icon name="check" size={10} color="#fff" />}
                      </View>
                      <Text style={{ fontSize: 12, color: "#7E9A90", fontWeight: "600" }}>좌우 다른 무게</Text>
                    </TouchableOpacity>
                  )}

                  {/* Weight presets */}
                  <View style={{ marginBottom: 10 }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#B4CFC5", marginBottom: 6 }}>무게 프리셋 ({unit})</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                      {WEIGHT_PRESETS.map(w => (
                        <TouchableOpacity key={w}
                          onPress={() => applyWeightPreset(w)}
                          style={{ backgroundColor: "#E7F7F0", borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8, marginRight: 6 }}>
                          <Text style={{ fontSize: 12, fontWeight: "800", color: "#2E9E83" }}>{w}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>

                  {/* Column headers */}
                  <View style={{ flexDirection: "row", marginBottom: 8 }}>
                    <Text style={{ fontSize: 11, color: "#B4CFC5", fontWeight: "600", textAlign: "center", flex: 0.4 }}>세트</Text>
                    {isSingleArm && differentSides ? (
                      <>
                        <Text style={{ fontSize: 11, color: "#B4CFC5", fontWeight: "600", textAlign: "center", flex: 1.2 }}>L ({unit})</Text>
                        <Text style={{ fontSize: 11, color: "#B4CFC5", fontWeight: "600", textAlign: "center", flex: 1.2 }}>R ({unit})</Text>
                      </>
                    ) : (
                      <Text style={{ fontSize: 11, color: "#B4CFC5", fontWeight: "600", textAlign: "center", flex: 1.2 }}>
                        무게({unit}){isSingleArm ? " · 한팔" : ""}
                      </Text>
                    )}
                    <Text style={{ fontSize: 11, color: "#B4CFC5", fontWeight: "600", textAlign: "center", flex: 1.2 }}>횟수</Text>
                  </View>

                  {/* Set rows */}
                  {sets.map((st, i) => (
                    <View key={i} style={{ marginBottom: 10 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Text style={{ fontSize: 14, fontWeight: "700", color: "#7E9A90", textAlign: "center", flex: 0.4 }}>{i + 1}</Text>

                        <View style={{ flex: 1.2, flexDirection: "row", alignItems: "center", gap: 3 }}>
                          <TouchableOpacity
                            onPress={() => adjustWeight(i, -5)}
                            style={{ width: 30, height: 44, borderRadius: 999, backgroundColor: "#E7F7F0", alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ fontSize: 16, fontWeight: "800", color: "#7E9A90", marginTop: -2 }}>−</Text>
                          </TouchableOpacity>
                          <TextInput
                            ref={el => { setWeightRefs.current[i] = el; }}
                            style={{ flex: 1, backgroundColor: "#E7F7F0", borderRadius: 12, height: 44, textAlign: "center", fontSize: 15, fontWeight: "700", color: "#34514A" }}
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
                            style={{ width: 30, height: 44, borderRadius: 999, backgroundColor: "#6FD3B6", alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ fontSize: 16, fontWeight: "800", color: "#fff", marginTop: -2 }}>+</Text>
                          </TouchableOpacity>
                        </View>

                        {isSingleArm && differentSides && (
                          <TextInput
                            style={{ flex: 1.2, backgroundColor: "#E7F7F0", borderRadius: 12, height: 44, textAlign: "center", fontSize: 15, fontWeight: "700", color: "#34514A", borderWidth: 1.5, borderColor: "#FFD36E40" }}
                            value={st.weightR}
                            onChangeText={v => setSets(prev => prev.map((s, idx) => idx === i ? { ...s, weightR: v } : s))}
                            keyboardType="numeric"
                            placeholder="0"
                            placeholderTextColor="#B4CFC5"
                            returnKeyType="next"
                          />
                        )}

                        <View style={{ flex: 1.2, flexDirection: "row", alignItems: "center", gap: 3 }}>
                          <TouchableOpacity
                            onPress={() => adjustReps(i, -1)}
                            style={{ width: 30, height: 44, borderRadius: 999, backgroundColor: "#E7F7F0", alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ fontSize: 16, fontWeight: "800", color: "#7E9A90", marginTop: -2 }}>−</Text>
                          </TouchableOpacity>
                          <TextInput
                            style={{ flex: 1, backgroundColor: "#E7F7F0", borderRadius: 12, height: 44, textAlign: "center", fontSize: 15, fontWeight: "700", color: "#34514A" }}
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
                            style={{ width: 30, height: 44, borderRadius: 999, backgroundColor: "#FFAE96", alignItems: "center", justifyContent: "center" }}>
                            <Text style={{ fontSize: 16, fontWeight: "800", color: "#fff", marginTop: -2 }}>+</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={{ alignItems: "center", padding: 10, borderRadius: 20, marginTop: 2, backgroundColor: "#FF9DB018" }}
                    onPress={handleAddSet}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: "#FF9DB0" }}>+ 세트 추가</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* ── ROUTINE MODE: Target setting ── */}
              {mode === "routine" && (
                <>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: "#34514A", marginBottom: 12 }}>목표 설정</Text>

                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#7E9A90", marginBottom: 8 }}>목표 세트 수</Text>
                  <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                    {["2", "3", "4", "5"].map(n => (
                      <TouchableOpacity
                        key={n}
                        style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: defaultSets === n ? "#6FD3B6" : "#E7F7F0", alignItems: "center", justifyContent: "center" }}
                        onPress={() => setDefaultSets(n)}>
                        <Text style={{ fontSize: 16, fontWeight: "800", color: defaultSets === n ? "#fff" : "#7E9A90" }}>{n}</Text>
                      </TouchableOpacity>
                    ))}
                    <TextInput
                      style={{ flex: 1, backgroundColor: "#E7F7F0", borderRadius: 12, height: 44, textAlign: "center", fontSize: 15, fontWeight: "700", color: "#34514A" }}
                      value={!["2", "3", "4", "5"].includes(defaultSets) ? defaultSets : ""}
                      onChangeText={v => setDefaultSets(v)}
                      keyboardType="number-pad"
                      placeholder="직접"
                      placeholderTextColor="#B4CFC5"
                    />
                  </View>

                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#7E9A90", marginBottom: 8 }}>기본 무게 (kg, 선택)</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <TouchableOpacity
                      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#E7F7F0", alignItems: "center", justifyContent: "center" }}
                      onPress={() => setDefaultWeight(w => String(Math.max(0, (parseFloat(w) || 0) - 5)))}>
                      <Text style={{ fontSize: 16, fontWeight: "800", color: "#7E9A90", marginTop: -2 }}>−</Text>
                    </TouchableOpacity>
                    <TextInput
                      style={{ flex: 1, backgroundColor: "#E7F7F0", borderRadius: 12, padding: 10, fontSize: 15, fontWeight: "700", color: "#34514A", textAlign: "center" }}
                      value={defaultWeight}
                      onChangeText={setDefaultWeight}
                      keyboardType="decimal-pad"
                      placeholder="0"
                      placeholderTextColor="#B4CFC5"
                    />
                    <Text style={{ fontSize: 12, color: "#7E9A90", fontWeight: "700" }}>kg</Text>
                    <TouchableOpacity
                      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#6FD3B6", alignItems: "center", justifyContent: "center" }}
                      onPress={() => setDefaultWeight(w => String((parseFloat(w) || 0) + 5))}>
                      <Text style={{ fontSize: 16, fontWeight: "800", color: "#fff", marginTop: -2 }}>+</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              {/* ── Common: Rest time & Target reps ── */}
              <View style={{ height: 1, backgroundColor: "#E7F7F0", marginVertical: 14 }} />

              <Text style={{ fontSize: 12, fontWeight: "700", color: "#7E9A90", marginBottom: 8 }}>쉬는 시간 (초)</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <TouchableOpacity
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#E7F7F0", alignItems: "center", justifyContent: "center" }}
                  onPress={() => setRestSeconds(s => String(Math.max(0, parseInt(s) - 15)))}>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: "#7E9A90", marginTop: -2 }}>−</Text>
                </TouchableOpacity>
                <TextInput
                  style={{ flex: 1, backgroundColor: "#E7F7F0", borderRadius: 12, padding: 10, fontSize: 15, fontWeight: "700", color: "#34514A", textAlign: "center" }}
                  value={restSeconds}
                  onChangeText={setRestSeconds}
                  keyboardType="numeric"
                  placeholder="60"
                  placeholderTextColor="#B4CFC5"
                />
                <Text style={{ fontSize: 12, color: "#7E9A90", fontWeight: "700" }}>초</Text>
                <TouchableOpacity
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#6FD3B6", alignItems: "center", justifyContent: "center" }}
                  onPress={() => setRestSeconds(s => String(parseInt(s) + 15))}>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: "#fff", marginTop: -2 }}>+</Text>
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 12, fontWeight: "700", color: "#7E9A90", marginBottom: 8 }}>목표 횟수 (선택)</Text>
              <TextInput
                style={{ backgroundColor: "#E7F7F0", borderRadius: 12, padding: 12, fontSize: 14, color: "#34514A", marginBottom: 14 }}
                placeholder="예: 12회 3세트, 15-20회, 실패할때까지"
                value={targetReps}
                onChangeText={setTargetReps}
                placeholderTextColor="#B4CFC5"
              />

              {/* Equipment settings */}
              <View style={{ height: 1, backgroundColor: "#E7F7F0", marginBottom: 14 }} />
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Icon name="settings" size={14} color="#34514A" />
                  <Text style={{ fontSize: 14, fontWeight: "700", color: "#34514A" }}>기구 설정</Text>
                </View>
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "#6FD3B618", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}
                  onPress={openSettingsSheet}>
                  <Icon name="plus" size={14} color="#6FD3B6" />
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#6FD3B6" }}>설정 추가</Text>
                </TouchableOpacity>
              </View>
              {settings.length > 0 ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                  {settings.map((s, i) => (
                    <TouchableOpacity key={i}
                      style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: "#6FD3B618", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}
                      onPress={() => removeSetting(i)}
                      activeOpacity={0.7}>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#6FD3B6" }}>{s.key}: {s.value}</Text>
                      <Text style={{ fontSize: 11, color: "#6FD3B6", fontWeight: "700" }}>✕</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={{ fontSize: 12, color: "#B4CFC5", marginBottom: 14 }}>시트높이, 각도 등 기구 설정을 기록하세요</Text>
              )}

              {/* Tip */}
              <View style={{ height: 1, backgroundColor: "#E7F7F0", marginBottom: 14 }} />
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
                onPress={() => tipRef.current?.focus()}
                activeOpacity={0.7}>
                <Icon name="bulb" size={14} color="#7E9A90" />
                <Text style={{ fontSize: 14, fontWeight: "700", color: "#34514A" }}>운동 팁</Text>
                <Text style={{ fontSize: 11, color: "#B4CFC5", fontWeight: "600" }}>탭하여 입력</Text>
              </TouchableOpacity>
              <TextInput
                ref={tipRef}
                style={{ backgroundColor: "#E7F7F0", borderRadius: 12, padding: 12, fontSize: 14, color: "#34514A", marginTop: 10, minHeight: 80, lineHeight: 20 }}
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

        {/* Footer button */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E7F7F0", backgroundColor: "#EFFAF4", paddingBottom: Math.max(insets.bottom, 12) }}>
          <TouchableOpacity
            style={{ backgroundColor: mode === "session" ? "#FFAE96" : "#6FD3B6", borderRadius: 24, paddingVertical: 16, alignItems: "center" }}
            onPress={handleAdd}
            disabled={isSuccess}
            activeOpacity={0.8}>
            {isSuccess ? (
              <Animated.View style={{ flexDirection: "row", alignItems: "center", gap: 8, transform: [{ scale: successScale }] }}>
                <Icon name="check" size={20} color="#fff" />
                <Text style={{ fontSize: 16, fontWeight: "800", color: "#fff" }}>추가 완료!</Text>
              </Animated.View>
            ) : (
              <Text style={{ fontSize: 16, fontWeight: "800", color: "#fff" }}>
                {editMode ? "수정 완료" : mode === "session" ? "운동 추가" : "루틴에 추가"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Equipment settings modal */}
      <Modal visible={showSettingsSheet} transparent animationType="slide" onRequestClose={closeSettingsSheet}>
        <TouchableOpacity
          style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(30,80,65,0.4)" }}
          activeOpacity={1}
          onPress={closeSettingsSheet}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%" }}>
            <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 }}>
              <View style={{ width: 40, height: 4, backgroundColor: "#B4CFC5", borderRadius: 999, alignSelf: "center", marginBottom: 20 }} />
              <Text style={{ fontSize: 18, fontWeight: "800", color: "#34514A", marginBottom: 20 }}>기구 설정 추가</Text>

              <Text style={{ fontSize: 12, fontWeight: "700", color: "#7E9A90", marginBottom: 10 }}>항목 선택</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
                {PRESET_SETTING_KEYS.map(k => {
                  const on = !isCustomKeyMode && settingKey === k;
                  return (
                    <TouchableOpacity key={k}
                      style={{ borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: on ? "#6FD3B628" : "#E7F7F0" }}
                      onPress={() => { setSettingKey(k); setIsCustomKeyMode(false); setCustomKeyName(""); }}>
                      <Text style={{ fontSize: 13, color: on ? "#6FD3B6" : "#7E9A90", fontWeight: on ? "700" : "600" }}>{k}</Text>
                    </TouchableOpacity>
                  );
                })}
                {customSettingKeys.map(k => {
                  const on = !isCustomKeyMode && settingKey === k.name;
                  return (
                    <View key={k.id} style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                      <TouchableOpacity
                        style={{ borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: "#6FD3B650", backgroundColor: on ? "#6FD3B628" : "#E7F7F0" }}
                        onPress={() => { setSettingKey(k.name); setIsCustomKeyMode(false); setCustomKeyName(""); }}>
                        <Text style={{ fontSize: 13, color: on ? "#6FD3B6" : "#7E9A90", fontWeight: on ? "700" : "600" }}>{k.name}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ marginLeft: -6, marginTop: -8 }}
                        onPress={() => deleteCustomKey(k.id)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                        <Text style={{ fontSize: 13, color: "#B4CFC5", fontWeight: "600" }}>✕</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>

              <View style={{ height: 1, backgroundColor: "#E7F7F0", marginVertical: 12 }} />
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: isCustomKeyMode ? "#6FD3B618" : "#E7F7F0" }}
                onPress={() => { setIsCustomKeyMode(true); setSettingKey(""); setTimeout(() => customKeyInputRef.current?.focus(), 100); }}>
                <Icon name="plus" size={15} color={isCustomKeyMode ? "#6FD3B6" : "#7E9A90"} />
                <Text style={{ fontSize: 13, color: isCustomKeyMode ? "#6FD3B6" : "#7E9A90", fontWeight: isCustomKeyMode ? "700" : "600" }}>직접 입력</Text>
              </TouchableOpacity>

              {isCustomKeyMode && (
                <TextInput
                  ref={customKeyInputRef}
                  style={{ backgroundColor: "#E7F7F0", borderRadius: 14, padding: 13, fontSize: 15, color: "#34514A", marginTop: 10, borderWidth: 1.5, borderColor: "#6FD3B660" }}
                  placeholder="항목명 입력 (예: 케이블각도, 풀리높이)"
                  value={customKeyName}
                  onChangeText={setCustomKeyName}
                  placeholderTextColor="#B4CFC5"
                  returnKeyType="next"
                />
              )}

              <Text style={{ fontSize: 12, fontWeight: "700", color: "#7E9A90", marginTop: 16, marginBottom: 10 }}>값 입력</Text>
              <TextInput
                style={{ backgroundColor: "#E7F7F0", borderRadius: 14, padding: 14, fontSize: 15, color: "#34514A", marginBottom: 16 }}
                placeholder="예: 3단계, 45도, 오버핸드"
                value={settingValue}
                onChangeText={setSettingValue}
                placeholderTextColor="#B4CFC5"
                returnKeyType="done"
                onSubmitEditing={handleAddSetting}
              />

              <TouchableOpacity
                style={{ backgroundColor: "#6FD3B6", borderRadius: 24, padding: 15, alignItems: "center" }}
                onPress={handleAddSetting}
                activeOpacity={0.8}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: "#fff" }}>추가하기</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
