import React, { useState, useEffect, useRef } from "react";
import { showCuteAlert } from "../CuteAlert";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  KeyboardAvoidingView, Platform, Modal, LayoutAnimation,
  UIManager, Image, ActivityIndicator, Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header, NumberPad } from "../ui";
import { BackgroundBlobs } from "../BackgroundBlobs";
import { Icon, FlameIcon } from "../AppIcons";
import { SetInputRow } from "./SetInputRow";
import apiClient from "../../lib/apiClient";
import { useExerciseStore } from "../../store/exerciseStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useWorkoutStore } from "../../store/workoutStore";
import { EXERCISE_CATEGORIES, EXERCISE_MAPPING } from "../../constants";
import { ExerciseSetting } from "../../types/workout";
import MuscleMap, { MUSCLE_MAP } from "../MuscleMap";
import { useColors } from "../../constants/colors";

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const BODYPART_TO_CATEGORY: Record<string, string> = {
  chest: "가슴", back: "등", shoulders: "어깨",
  "upper arms": "팔", "lower arms": "팔",
  "upper legs": "하체", "lower legs": "하체",
  waist: "복근", cardio: "유산소",
};

const CATEGORY_TARGETS: Record<string, string[]> = {
  '가슴': ['상부', '중부', '하부', '내측', '직접 입력'],
  '등': ['상부 승모', '중부 승모', '광배', '척추기립근', '직접 입력'],
  '어깨': ['전면', '측면', '후면', '직접 입력'],
  '팔': ['이두', '삼두', '전완', '직접 입력'],
  '하체': ['대퇴사두', '햄스트링', '둔근', '종아리', '직접 입력'],
  '복근': ['상복부', '하복부', '측복부', '직접 입력'],
  '유산소': ['전신', '직접 입력'],
  '기타': ['직접 입력'],
};


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
  sets?: Array<{ weight: number; weightR?: number; reps: number; completed?: boolean; unit?: 'kg' | 'lbs' }>;
  isSingleArm?: boolean;
  differentSides?: boolean;
  // routine mode
  defaultSets?: number;
  defaultWeight?: number;
  defaultReps?: number;
  routineSets?: Array<{ setNumber: number; targetWeight: number; targetReps: number; unit: 'kg' | 'lbs' }>;
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
    sets?: Array<{ weight: number; reps: number; weightR?: number; completed?: boolean; unit?: 'kg' | 'lbs' }>;
    defaultSets?: number;
    defaultWeight?: number;
    defaultReps?: number;
    routineSets?: Array<{ setNumber: number; targetWeight: number; targetReps: number; unit: 'kg' | 'lbs' }>;
  };
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExerciseAdder({ mode, onAdd, onClose, editMode = false, initialExercise }: ExerciseAdderProps) {
  const c = useColors();
  const SHADOW = {
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 3,
  };
  const insets = useSafeAreaInsets();
  const { results, isSearching, searchExercises, clearResults, saveCustomExercise } = useExerciseStore();
  const { weightUnit, showBodypartSelector, loadSettings } = useSettingsStore();
  const { exerciseHistoryCache, fetchExerciseHistory } = useWorkoutStore();

  // Refs
  const scrollRef = useRef<ScrollView>(null);
  const setsSectionY = useRef(0);
  const customFormY = useRef(0);
  const customKeyInputRef = useRef<TextInput>(null);
  const customNameRef = useRef<TextInput>(null);
  const tipRef = useRef<TextInput>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchIdRef = useRef(0);

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
  const [customTargetInput, setCustomTargetInput] = useState('');
  const [showCustomTargetInput, setShowCustomTargetInput] = useState(false);
  const [customRestSeconds, setCustomRestSeconds] = useState("60");
  const [customTargetReps, setCustomTargetReps] = useState("");
  const [customNote, setCustomNote] = useState("");

  // Session mode state
  const [unit, setUnit] = useState<"kg" | "lbs">(weightUnit);
  const [isSingleArm, setIsSingleArm] = useState(false);
  const [differentSides, setDifferentSides] = useState(false);
  const [sets, setSets] = useState([{ weight: "", weightR: "", reps: "", completed: false }]);

  // Routine mode state
  const [defaultSets, setDefaultSets] = useState("3");
  const [defaultWeight, setDefaultWeight] = useState("");
  const [defaultReps, setDefaultReps] = useState("");
  const [perSetMode, setPerSetMode] = useState(false);
  const [routineSets, setRoutineSets] = useState<Array<{ weight: string; reps: string }>>([]);

  // Number pad
  type PadConfig = { value: string; decimal: boolean; suffix: string; onConfirm: (v: string) => void };
  const [padConfig, setPadConfig] = useState<PadConfig | null>(null);
  const openPad = (value: string, decimal: boolean, suffix: string, onConfirm: (v: string) => void) =>
    setPadConfig({ value, decimal, suffix, onConfirm });

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
          const savedUnit = ex.sets[0]?.unit ?? 'kg';
          setUnit(savedUnit);
          setSets(ex.sets.map(s => ({ weight: String(s.weight), weightR: String(s.weightR ?? ''), reps: String(s.reps), completed: s.completed ?? false })));
        }
      } else if (mode === 'routine') {
        if (ex.defaultSets) setDefaultSets(String(ex.defaultSets));
        if (ex.defaultWeight) setDefaultWeight(String(ex.defaultWeight));
        if (ex.defaultReps) setDefaultReps(String(ex.defaultReps));
        setIsSingleArm(ex.isSingleArm ?? false);
        setDifferentSides(ex.differentSides ?? false);
        if (ex.routineSets && ex.routineSets.length > 0) {
          setPerSetMode(true);
          setRoutineSets(ex.routineSets.map(s => ({ weight: String(s.targetWeight), reps: String(s.targetReps) })));
        }
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
  };

  const handleChangeExercise = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedExercise(null);
    setExerciseListCollapsed(false);
    setSets([{ weight: "", weightR: "", reps: "", completed: false }]);
    setSettings([]);
    setTip("");
    setRestSeconds("60");
    setTargetReps("");
    setDefaultSets("3");
    setDefaultWeight("");
    setIsSingleArm(false);
    setDifferentSides(false);
    setPerSetMode(false);
    setRoutineSets([]);
    setShowCustomForm(false);
  };

  const handleAddCustomExercise = () => {
    if (!customName.trim()) { showCuteAlert({ icon: 'pencil', tone: 'info', title: '종목명을 입력해주세요', buttons: [{ label: '확인', style: 'primary' }] }); return; }
    if (!customCat) { showCuteAlert({ icon: 'pencil', tone: 'info', title: '카테고리를 선택해주세요', buttons: [{ label: '확인', style: 'primary' }] }); return; }
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
    const last = sets[sets.length - 1] ?? { weight: '', weightR: '', reps: '', completed: false };
    setSets(prev => [...prev, { weight: last.weight, weightR: last.weightR, reps: last.reps, completed: false }]);
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

  const adjustRoutineSetWeight = (idx: number, delta: number) => {
    setRoutineSets(prev => prev.map((s, i) => {
      if (i !== idx) return s;
      const cur = parseFloat(s.weight) || 0;
      const next = Math.max(0, cur + delta);
      return { ...s, weight: String(next % 1 === 0 ? next : next.toFixed(1)) };
    }));
  };

  const adjustRoutineSetReps = (idx: number, delta: number) => {
    setRoutineSets(prev => prev.map((s, i) => {
      if (i !== idx) return s;
      const cur = parseInt(s.reps) || 0;
      return { ...s, reps: String(Math.max(0, cur + delta)) };
    }));
  };

  const togglePerSetMode = () => {
    if (!perSetMode) {
      const count = Math.max(1, parseInt(defaultSets) || 3);
      const seed = Array.from({ length: count }, () => ({ weight: defaultWeight, reps: defaultReps }));
      setRoutineSets(seed);
      if (mode === 'session') {
        setSets(seed.map(s => ({ weight: s.weight, weightR: '', reps: s.reps, completed: false })));
      }
    }
    setPerSetMode(v => !v);
  };

  const adjustSets = (delta: number) => {
    const cur = Math.max(1, parseInt(defaultSets) || 1);
    const next = Math.max(1, cur + delta);
    setDefaultSets(String(next));
    if (perSetMode) {
      if (mode === 'routine') {
        setRoutineSets(prev => {
          if (prev.length < next) {
            const last = prev[prev.length - 1] ?? { weight: defaultWeight, reps: defaultReps };
            return [...prev, ...Array.from({ length: next - prev.length }, () => ({ ...last }))];
          }
          return prev.slice(0, next);
        });
      } else {
        setSets(prev => {
          if (prev.length < next) {
            const last = prev[prev.length - 1] ?? { weight: '', weightR: '', reps: '', completed: false };
            return [...prev, ...Array.from({ length: next - prev.length }, () => ({ ...last }))];
          }
          return prev.slice(0, next);
        });
      }
    }
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
    if (!key) { showCuteAlert({ icon: 'pencil', tone: 'info', title: '항목명을 입력해주세요', buttons: [{ label: '확인', style: 'primary' }] }); return; }
    if (!settingValue.trim()) { showCuteAlert({ icon: 'pencil', tone: 'info', title: '값을 입력해주세요', buttons: [{ label: '확인', style: 'primary' }] }); return; }
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
      showCuteAlert({ icon: 'alert', tone: 'danger', title: '삭제 실패', message: '잠시 후 다시 시도해주세요', buttons: [{ label: '확인', style: 'primary' }] });
    }
  };

  const removeSetting = (idx: number) => setSettings(prev => prev.filter((_, i) => i !== idx));

  // ─── Submit handler ───────────────────────────────────────────────────────

  const handleAdd = () => {
    if (!selectedExercise) { showCuteAlert({ icon: 'pencil', tone: 'info', title: '운동 종목을 선택해주세요', buttons: [{ label: '확인', style: 'primary' }] }); return; }

    if (mode === "session") {
      let finalSets: Array<{ weight: number; weightR?: number; reps: number; completed?: boolean; unit: 'kg' | 'lbs' }>;
      if (!perSetMode) {
        const count = Math.max(1, parseInt(defaultSets) || 3);
        const r = parseInt(defaultReps) || 0;
        if (r === 0) { showCuteAlert({ icon: 'pencil', tone: 'info', title: '횟수를 입력해주세요', buttons: [{ label: '확인', style: 'primary' }] }); return; }
        const w = parseFloat(defaultWeight) || 0;
        finalSets = Array.from({ length: count }, () => ({ weight: w, reps: r, completed: false, unit }));
      } else {
        const validSets = sets.filter(s => s.reps && parseInt(s.reps) > 0);
        if (validSets.length === 0) { showCuteAlert({ icon: 'pencil', tone: 'info', title: '최소 1세트를 입력해주세요', buttons: [{ label: '확인', style: 'primary' }] }); return; }
        finalSets = validSets.map(st => ({
          weight: parseFloat(st.weight) || 0,
          weightR: (isSingleArm && differentSides && st.weightR) ? parseFloat(st.weightR) || 0 : undefined,
          reps: parseInt(st.reps),
          completed: st.completed,
          unit,
        }));
      }
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
        sets: finalSets,
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
        isSingleArm,
        differentSides: isSingleArm ? differentSides : false,
        defaultSets: perSetMode ? routineSets.length : Math.max(1, parseInt(defaultSets) || 3),
        defaultWeight: perSetMode ? undefined : (parseFloat(defaultWeight) || undefined),
        defaultReps: perSetMode ? undefined : (parseInt(defaultReps) || undefined),
        routineSets: perSetMode && routineSets.length > 0 ? routineSets.map((s, i) => ({
          setNumber: i + 1,
          targetWeight: parseFloat(s.weight) || 0,
          targetReps: parseInt(s.reps) || 0,
          unit,
        })) : undefined,
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
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <BackgroundBlobs />
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
              <View style={[{ flexDirection: "row", alignItems: "center", backgroundColor: c.surface, borderRadius: 18, padding: 16, marginBottom: 14, gap: 12 }, SHADOW]}>
                {selectedExercise.gifUrl ? (
                  <Image source={{ uri: selectedExercise.gifUrl }}
                    style={{ width: 56, height: 56, borderRadius: 12, backgroundColor: c.surfaceAlt }}
                    resizeMode="cover" />
                ) : null}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 11, color: c.textMuted, fontWeight: "600", marginBottom: 3 }}>선택된 종목</Text>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: c.textPrimary, marginBottom: 2 }}>{selectedExercise.name}</Text>
                  {(selectedExercise.targetMuscles?.length ?? 0) > 0 && (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 4 }}>
                      {selectedExercise.targetMuscles!.map((m, mi) => (
                        <View key={mi} style={{ backgroundColor: c.primary + '18', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 10, fontWeight: '700', color: c.primary }}>{m}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {selectedExercise.caloriesPerMinute ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                      <FlameIcon size={11} color={c.danger} />
                      <Text style={{ fontSize: 11, fontWeight: "600", color: c.danger }}>
                        약 {Math.round(selectedExercise.caloriesPerMinute * 30)} kcal (30분)
                      </Text>
                    </View>
                  ) : null}
                </View>
                <TouchableOpacity
                  style={{ backgroundColor: c.primary + "18", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 }}
                  onPress={handleChangeExercise}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: c.primary }}>변경</Text>
                </TouchableOpacity>
              </View>

              {/* MuscleMap */}
              {MUSCLE_MAP[selectedExercise.name] && (
                <View style={[{ backgroundColor: c.surface, borderRadius: 20, padding: 14, marginBottom: 14 }, SHADOW]}>
                  <MuscleMap muscles={MUSCLE_MAP[selectedExercise.name]} />
                </View>
              )}

              {/* Previous record (session mode) */}
              {mode === "session" && prevRecord && prevRecord.comparisonSession && (
                <View style={[{ backgroundColor: c.warning + "18", borderRadius: 16, padding: 12, marginBottom: 14, flexDirection: "row", alignItems: "center", gap: 8 }, SHADOW]}>
                  <Icon name="refresh" size={14} color={c.warning} />
                  <Text style={{ fontSize: 12, fontWeight: "700", color: c.warning }}>
                    이전 기록: {prevRecord.comparisonSession.maxWeight} kg × {prevRecord.comparisonSession.totalSets} 세트
                  </Text>
                </View>
              )}
            </>
          ) : (
            <>
              <Text style={{ fontSize: 13, fontWeight: "700", color: c.textSecondary, marginBottom: 12 }}>운동 종목 선택</Text>

              {/* Search bar */}
              <View style={[{ flexDirection: "row", alignItems: "center", backgroundColor: c.surface, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12, gap: 8 }, SHADOW]}>
                <Icon name="search" size={16} color={c.textMuted} />
                <TextInput
                  style={{ flex: 1, fontSize: 15, color: c.textPrimary }}
                  placeholder="한글 검색 또는 영어로 API 검색..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor={c.textMuted}
                  returnKeyType="search"
                  autoCorrect={false}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <Icon name="close" size={16} color={c.textMuted} />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* 직접 추가 card */}
              {!showCustomForm ? (
                <TouchableOpacity
                  style={[{ flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: c.surface, borderRadius: 16, padding: 14, marginBottom: 12 }, SHADOW]}
                  onPress={() => {
                    setShowCustomForm(true);
                    setTimeout(() => {
                      scrollRef.current?.scrollTo({ y: customFormY.current, animated: true });
                      setTimeout(() => customNameRef.current?.focus(), 150);
                    }, 100);
                  }}
                  activeOpacity={0.7}>
                  <View style={{ width: 34, height: 34, borderRadius: 12, backgroundColor: c.primary + "18", alignItems: "center", justifyContent: "center" }}>
                    <Icon name="pencil" size={16} color={c.primary} />
                  </View>
                  <View>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: c.primary }}>종목 추가하기</Text>
                    <Text style={{ fontSize: 11, color: c.textMuted }}>목록에 없는 운동을 직접 추가해요</Text>
                  </View>
                </TouchableOpacity>
              ) : (
                <View
                  style={[{ backgroundColor: c.surface, borderRadius: 20, padding: 16, marginBottom: 12 }, SHADOW]}
                  onLayout={e => { customFormY.current = e.nativeEvent.layout.y; }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <Text style={{ fontSize: 15, fontWeight: "700", color: c.textPrimary }}>종목 추가</Text>
                    <TouchableOpacity onPress={() => { setShowCustomForm(false); setCustomName(""); setCustomCat(""); }}>
                      <Icon name="close" size={16} color={c.textMuted} />
                    </TouchableOpacity>
                  </View>

                  <TextInput
                    ref={customNameRef}
                    style={{ backgroundColor: c.surfaceAlt, borderRadius: 12, padding: 12, fontSize: 15, color: c.textPrimary, marginBottom: 12 }}
                    placeholder="종목명 입력 (예: 케이블 플라이)"
                    value={customName}
                    onChangeText={setCustomName}
                    placeholderTextColor={c.textMuted}
                    returnKeyType="done"
                  />

                  <Text style={{ fontSize: 12, fontWeight: "700", color: c.textMuted, marginBottom: 8 }}>카테고리</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} keyboardShouldPersistTaps="handled">
                    {EXERCISE_CATEGORIES.map(cat => {
                      const on = customCat === cat;
                      return (
                        <TouchableOpacity key={cat}
                          style={[{ borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, backgroundColor: on ? c.danger + "28" : c.surface }, SHADOW]}
                          onPress={() => { setCustomCat(cat); setCustomTargetParts([]); setCustomTargetInput(''); setShowCustomTargetInput(false); }}>
                          <Text style={{ fontSize: 13, color: on ? c.danger : c.textSecondary, fontWeight: on ? "700" : "600" }}>{cat}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <Text style={{ fontSize: 12, fontWeight: "700", color: c.textMuted, marginBottom: 8 }}>타겟 부위 (다중 선택)</Text>
                  {!customCat ? (
                    <Text style={{ fontSize: 12, color: c.textMuted, marginBottom: 16 }}>카테고리를 먼저 선택해주세요</Text>
                  ) : (
                    <View style={{ marginBottom: 16 }}>
                      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: showCustomTargetInput ? 10 : 0 }}>
                        {(CATEGORY_TARGETS[customCat] ?? ['직접 입력']).map(part => {
                          if (part === '직접 입력') {
                            return (
                              <TouchableOpacity key="custom"
                                style={{ borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: showCustomTargetInput ? c.primary : c.surfaceAlt }}
                                onPress={() => setShowCustomTargetInput(v => !v)}>
                                <Text style={{ fontSize: 12, fontWeight: "700", color: showCustomTargetInput ? c.surface : c.textSecondary }}>+ 직접 입력</Text>
                              </TouchableOpacity>
                            );
                          }
                          const on = customTargetParts.includes(part);
                          return (
                            <TouchableOpacity key={part}
                              style={{ borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: on ? c.primary : c.surfaceAlt }}
                              onPress={() => setCustomTargetParts(prev => on ? prev.filter(p => p !== part) : [...prev, part])}>
                              <Text style={{ fontSize: 12, fontWeight: "700", color: on ? c.surface : c.textSecondary }}>{part}</Text>
                            </TouchableOpacity>
                          );
                        })}
                        {/* 직접 입력으로 추가된 항목 태그 */}
                        {customTargetParts.filter(p => !(CATEGORY_TARGETS[customCat] ?? []).includes(p)).map(p => (
                          <TouchableOpacity key={p}
                            style={{ borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6, backgroundColor: c.primary, flexDirection: 'row', alignItems: 'center', gap: 4 }}
                            onPress={() => setCustomTargetParts(prev => prev.filter(x => x !== p))}>
                            <Text style={{ fontSize: 12, fontWeight: "700", color: c.surface }}>{p}</Text>
                            <Text style={{ fontSize: 10, color: c.surface, opacity: 0.7 }}>×</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                      {showCustomTargetInput && (
                        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 8 }}>
                          <TextInput
                            style={{ flex: 1, backgroundColor: c.surfaceAlt, borderRadius: 12, padding: 10, fontSize: 13, color: c.textPrimary }}
                            placeholder="타겟 부위 직접 입력"
                            placeholderTextColor={c.textMuted}
                            value={customTargetInput}
                            onChangeText={setCustomTargetInput}
                            returnKeyType="done"
                            onSubmitEditing={() => {
                              const v = customTargetInput.trim();
                              if (v && !customTargetParts.includes(v)) setCustomTargetParts(prev => [...prev, v]);
                              setCustomTargetInput('');
                              setShowCustomTargetInput(false);
                            }}
                          />
                          <TouchableOpacity
                            style={{ backgroundColor: c.primary, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10 }}
                            onPress={() => {
                              const v = customTargetInput.trim();
                              if (v && !customTargetParts.includes(v)) setCustomTargetParts(prev => [...prev, v]);
                              setCustomTargetInput('');
                              setShowCustomTargetInput(false);
                            }}>
                            <Text style={{ fontSize: 13, fontWeight: '700', color: c.surface }}>추가</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  )}

                  <Text style={{ fontSize: 11, color: c.textMuted, marginBottom: 12, textAlign: "center" }}>
                    세트, 쉬는 시간, 팁은 다음 단계에서 설정해요
                  </Text>

                  <TouchableOpacity
                    style={{ backgroundColor: c.primary, borderRadius: 20, padding: 12, alignItems: "center" }}
                    onPress={handleAddCustomExercise}
                    activeOpacity={0.8}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: c.surface }}>다음 단계 →</Text>
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
                        style={[{ borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, backgroundColor: on ? c.danger + "28" : c.surface }, SHADOW]}
                        onPress={() => setSelectedCategory(on ? null : cat)}>
                        <Text style={{ fontSize: 13, color: on ? c.danger : c.textSecondary, fontWeight: on ? "700" : "600" }}>{cat}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              {isSearching && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 10 }}>
                  <ActivityIndicator size="small" color={c.primary} />
                  <Text style={{ fontSize: 13, color: c.textSecondary }}>검색 중...</Text>
                </View>
              )}

              {/* Custom exercises */}
              {filteredCustom.map(ex => (
                <TouchableOpacity key={"custom-" + ex.name}
                  style={[{ flexDirection: "row", alignItems: "center", backgroundColor: c.surface, borderRadius: 16, padding: 12, marginBottom: 8, gap: 10 }, SHADOW]}
                  onPress={() => handleSelectExercise(ex)}
                  activeOpacity={0.7}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: c.textPrimary }}>{ex.name}</Text>
                    {(ex.targetMuscles?.length ?? 0) > 0 ? (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {ex.targetMuscles!.map((m, mi) => (
                          <View key={mi} style={{ backgroundColor: c.primary + '18', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 10, fontWeight: '700', color: c.primary }}>{m}</Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>내 종목</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}

              {/* Preset exercises */}
              {results.length === 0 && filteredPresets.map(ex => (
                <TouchableOpacity key={"preset-" + ex.name}
                  style={[{ flexDirection: "row", alignItems: "center", backgroundColor: c.surface, borderRadius: 16, padding: 12, marginBottom: 8, gap: 10 }, SHADOW]}
                  onPress={() => handleSelectExercise(ex)}
                  activeOpacity={0.7}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: c.textPrimary }}>{ex.name}</Text>
                    <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>{ex.category}</Text>
                  </View>
                </TouchableOpacity>
              ))}

              {/* API search results */}
              {results.map(ex => {
                const displayName = ex.nameKo || ex.name;
                const displayCat = ex.bodyPartKo || BODYPART_TO_CATEGORY[ex.bodyPart] || ex.bodyPart;
                return (
                  <TouchableOpacity key={ex.id}
                    style={[{ flexDirection: "row", alignItems: "center", backgroundColor: c.surface, borderRadius: 16, padding: 12, marginBottom: 8, gap: 10 }, SHADOW]}
                    onPress={() => handleSelectExercise({ name: displayName, category: displayCat, gifUrl: ex.gifUrl, caloriesPerMinute: ex.caloriesPerMinute })}
                    activeOpacity={0.7}>
                    {ex.gifUrl ? (
                      <Image source={{ uri: ex.gifUrl }}
                        style={{ width: 48, height: 48, borderRadius: 10, backgroundColor: c.surfaceAlt }}
                        resizeMode="cover" />
                    ) : null}
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={{ fontSize: 15, fontWeight: "600", color: c.textPrimary }}>{displayName}</Text>
                        {ex.isCustom && (
                          <View style={{ backgroundColor: c.primary + "20", borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 10, fontWeight: "800", color: c.primary }}>내 운동</Text>
                          </View>
                        )}
                      </View>
                      <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>
                        {displayCat}{ex.equipmentKo ? ` · ${ex.equipmentKo}` : ""}{ex.caloriesPerMinute ? ` · ${ex.caloriesPerMinute} kcal/분` : ""}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}

              {!isSearching && results.length === 0 && filteredPresets.length === 0 && filteredCustom.length === 0 && searchQuery.trim() && (
                <View style={{ alignItems: "center", paddingVertical: 24 }}>
                  <Text style={{ fontSize: 14, color: c.textMuted }}>검색 결과가 없어요</Text>
                </View>
              )}
            </>
          )}

          {/* ── Configuration phase ── */}
          {selectedExercise && (
            <View
              style={[{ backgroundColor: c.surface, borderRadius: 20, padding: 16, marginBottom: 16 }, SHADOW]}
              onLayout={e => { setsSectionY.current = e.nativeEvent.layout.y; }}>

              {/* ── SESSION MODE: Set recording ── */}
              {mode === "session" && (
                <>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: c.textPrimary }}>세트 설정</Text>
                    <View style={{ flexDirection: "row", gap: 4 }}>
                      {(["kg", "lbs"] as const).map(u => (
                        <TouchableOpacity key={u}
                          style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: unit === u ? c.primary : c.surfaceAlt }}
                          onPress={() => setUnit(u)}>
                          <Text style={{ fontSize: 12, fontWeight: "700", color: unit === u ? c.surface : c.textSecondary }}>{u}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* 한팔 기준 토글 */}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: c.textSecondary }}>한팔 기준</Text>
                    <TouchableOpacity
                      style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: isSingleArm ? c.primary : c.surfaceAlt, justifyContent: "center", paddingHorizontal: 2 }}
                      onPress={() => { setIsSingleArm(v => !v); setDifferentSides(false); }}
                      activeOpacity={0.8}>
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: c.surface, transform: [{ translateX: isSingleArm ? 20 : 0 }], shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 3, elevation: 2 }} />
                    </TouchableOpacity>
                  </View>
                  {isSingleArm && (
                    <TouchableOpacity
                      style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-end", marginBottom: 10 }}
                      onPress={() => setDifferentSides(v => !v)}>
                      <View style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, borderColor: differentSides ? c.primary : c.border, backgroundColor: differentSides ? c.primary : "transparent", alignItems: "center", justifyContent: "center" }}>
                        {differentSides && <Icon name="check" size={10} color={c.surface} />}
                      </View>
                      <Text style={{ fontSize: 12, color: c.textSecondary, fontWeight: "600" }}>좌우 다른 무게</Text>
                    </TouchableOpacity>
                  )}

                  {/* 세트수 stepper */}
                  <Text style={{ fontSize: 12, fontWeight: "700", color: c.textSecondary, marginBottom: 8 }}>세트수</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <TouchableOpacity
                      style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center" }}
                      onPress={() => adjustSets(-1)}>
                      <Text style={{ fontSize: 18, fontWeight: "800", color: c.textSecondary }}>−</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flex: 1, height: 44, backgroundColor: c.surfaceAlt, borderRadius: 14, alignItems: "center", justifyContent: "center" }}
                      onPress={() => openPad(defaultSets, false, '세트', v => {
                        const n = Math.max(1, parseInt(v) || 1);
                        setDefaultSets(String(n));
                        if (perSetMode) adjustSets(n - (Math.max(1, parseInt(defaultSets) || 1)));
                      })}>
                      <Text style={{ fontSize: 16, fontWeight: "800", color: c.textPrimary }}>
                        {defaultSets || '3'}<Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted }}> 세트</Text>
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center" }}
                      onPress={() => adjustSets(1)}>
                      <Text style={{ fontSize: 18, fontWeight: "800", color: c.textPrimary }}>+</Text>
                    </TouchableOpacity>
                  </View>

                  {/* 세트별 개별 설정 토글 */}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: c.surfaceAlt, borderRadius: 14, padding: 12, marginBottom: 14 }}>
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: c.textPrimary }}>세트별 개별 설정</Text>
                      <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>각 세트마다 다른 무게/횟수 입력</Text>
                    </View>
                    <TouchableOpacity
                      style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: perSetMode ? c.primary : c.surfaceHigh, justifyContent: "center", paddingHorizontal: 2 }}
                      onPress={togglePerSetMode}
                      activeOpacity={0.8}>
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: c.surface, transform: [{ translateX: perSetMode ? 20 : 0 }], shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 3, elevation: 2 }} />
                    </TouchableOpacity>
                  </View>

                  {!perSetMode ? (
                    <>
                      {/* 기본무게 · 목표횟수 */}
                      <Text style={{ fontSize: 12, fontWeight: "700", color: c.textSecondary, marginBottom: 10 }}>기본무게 · 목표횟수</Text>
                      <SetInputRow
                        weight={defaultWeight}
                        reps={defaultReps}
                        unit={unit}
                        onWeightStep={delta => setDefaultWeight(w => String(Math.max(0, (parseFloat(w) || 0) + delta)))}
                        onRepsStep={delta => setDefaultReps(r => String(Math.max(0, (parseInt(r) || 0) + delta)))}
                        onWeightPad={() => openPad(defaultWeight, true, unit, setDefaultWeight)}
                        onRepsPad={() => openPad(defaultReps, false, '회', setDefaultReps)}
                        containerStyle={{ marginBottom: 14 }}
                      />
                    </>
                  ) : (
                    <>
                      {/* 세트별 개별 입력 */}
                      {sets.map((st, i) => (
                        <View key={i} style={{ backgroundColor: st.completed ? c.success + '14' : c.surfaceAlt, borderRadius: 12, padding: 10, marginBottom: 6 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
                              onPress={() => setSets(prev => prev.map((s, idx) => idx === i ? { ...s, completed: !s.completed } : s))}>
                              {st.completed
                                ? <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: c.success, alignItems: 'center', justifyContent: 'center' }}>
                                    <Icon name="check" size={12} color={c.surface} />
                                  </View>
                                : <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}>
                                    <Text style={{ fontSize: 10, fontWeight: '700', color: c.textMuted }}>{i + 1}</Text>
                                  </View>
                              }
                              <Text style={{ fontSize: 11, fontWeight: '700', color: c.textSecondary }}>세트 {i + 1}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', opacity: sets.length > 1 ? 0.7 : 0.2 }}
                              onPress={() => { if (sets.length > 1) setSets(prev => prev.filter((_, idx) => idx !== i)); }}>
                              <Icon name="trash" size={13} color={c.textMuted} />
                            </TouchableOpacity>
                          </View>
                          <SetInputRow
                            weight={st.weight}
                            reps={st.reps}
                            unit={unit}
                            valueBg={c.surface}
                            onWeightStep={delta => adjustWeight(i, delta)}
                            onRepsStep={delta => adjustReps(i, delta)}
                            onWeightPad={() => openPad(st.weight, true, unit, v => setSets(prev => prev.map((s, idx) => idx === i ? { ...s, weight: v } : s)))}
                            onRepsPad={() => openPad(st.reps, false, '회', v => setSets(prev => prev.map((s, idx) => idx === i ? { ...s, reps: v } : s)))}
                          />

                          {isSingleArm && differentSides && (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10, paddingHorizontal: 4 }}>
                              <Text style={{ fontSize: 10, fontWeight: "700", color: c.warning, marginRight: 4 }}>R 무게</Text>
                              <TouchableOpacity
                                onPress={() => setSets(prev => prev.map((s, idx) => idx === i ? { ...s, weightR: String(Math.max(0, (parseFloat(s.weightR ?? '') || 0) - 5)) } : s))}
                                style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.surface, alignItems: "center", justifyContent: "center" }}>
                                <Text style={{ fontSize: 12, fontWeight: "800", color: c.textSecondary }}>-5</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => openPad(st.weightR ?? '', true, unit, v => setSets(prev => prev.map((s, idx) => idx === i ? { ...s, weightR: v } : s)))}
                                style={{ paddingHorizontal: 10, height: 36, backgroundColor: c.surface, borderRadius: 12, alignItems: "center", justifyContent: "center", minWidth: 70, borderWidth: 1.5, borderColor: c.warning + "40" }}>
                                <Text style={{ fontSize: 14, fontWeight: "800", color: c.textPrimary }}>
                                  {st.weightR || '0'}<Text style={{ fontSize: 11, fontWeight: "600", color: c.textMuted }}>{' '}{unit}</Text>
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => setSets(prev => prev.map((s, idx) => idx === i ? { ...s, weightR: String((parseFloat(s.weightR ?? '') || 0) + 5) } : s))}
                                style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: c.warning + "80", alignItems: "center", justifyContent: "center" }}>
                                <Text style={{ fontSize: 12, fontWeight: "800", color: c.surface }}>+5</Text>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      ))}
                      <TouchableOpacity
                        style={{ alignItems: "center", padding: 10, borderRadius: 20, marginTop: 2, backgroundColor: c.danger + "18" }}
                        onPress={handleAddSet}>
                        <Text style={{ fontSize: 13, fontWeight: "700", color: c.danger }}>+ 세트 추가</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </>
              )}

              {/* ── ROUTINE MODE: Target setting ── */}
              {mode === "routine" && (
                <>
                  {/* 헤더 + kg/lbs 토글 */}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                    <Text style={{ fontSize: 15, fontWeight: "800", color: c.textPrimary }}>세트 설정</Text>
                    <View style={{ flexDirection: "row", gap: 4 }}>
                      {(["kg", "lbs"] as const).map(u => (
                        <TouchableOpacity key={u}
                          style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 999, backgroundColor: unit === u ? c.primary : c.surfaceAlt }}
                          onPress={() => setUnit(u)}>
                          <Text style={{ fontSize: 12, fontWeight: "700", color: unit === u ? c.surface : c.textSecondary }}>{u}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* 한팔 토글 */}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: c.textSecondary }}>한팔 기준</Text>
                    <TouchableOpacity
                      style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: isSingleArm ? c.primary : c.surfaceAlt, justifyContent: "center", paddingHorizontal: 2 }}
                      onPress={() => { setIsSingleArm(v => !v); setDifferentSides(false); }}
                      activeOpacity={0.8}>
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: c.surface, transform: [{ translateX: isSingleArm ? 20 : 0 }], shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 3, elevation: 2 }} />
                    </TouchableOpacity>
                  </View>
                  {isSingleArm && (
                    <TouchableOpacity
                      style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-end", marginBottom: 10 }}
                      onPress={() => setDifferentSides(v => !v)}>
                      <View style={{ width: 16, height: 16, borderRadius: 4, borderWidth: 1.5, borderColor: differentSides ? c.primary : c.border, backgroundColor: differentSides ? c.primary : "transparent", alignItems: "center", justifyContent: "center" }}>
                        {differentSides && <Icon name="check" size={10} color={c.surface} />}
                      </View>
                      <Text style={{ fontSize: 12, color: c.textSecondary, fontWeight: "600" }}>좌우 다른 무게</Text>
                    </TouchableOpacity>
                  )}

                  {/* 세트수 */}
                  <Text style={{ fontSize: 12, fontWeight: "700", color: c.textSecondary, marginBottom: 8 }}>세트수</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <TouchableOpacity
                      style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center" }}
                      onPress={() => adjustSets(-1)}>
                      <Text style={{ fontSize: 18, fontWeight: "800", color: c.textSecondary }}>−</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ flex: 1, height: 44, backgroundColor: c.surfaceAlt, borderRadius: 14, alignItems: "center", justifyContent: "center" }}
                      onPress={() => openPad(defaultSets, false, '세트', v => {
                        const n = Math.max(1, parseInt(v) || 1);
                        setDefaultSets(String(n));
                        if (perSetMode) adjustSets(n - (Math.max(1, parseInt(defaultSets) || 1)));
                      })}>
                      <Text style={{ fontSize: 16, fontWeight: "800", color: c.textPrimary }}>
                        {defaultSets || '3'}<Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted }}> 세트</Text>
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center" }}
                      onPress={() => adjustSets(1)}>
                      <Text style={{ fontSize: 18, fontWeight: "800", color: c.textPrimary }}>+</Text>
                    </TouchableOpacity>
                  </View>

                  {/* 세트별 개별 설정 토글 */}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: c.surfaceAlt, borderRadius: 14, padding: 12, marginBottom: 14 }}>
                    <View>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: c.textPrimary }}>세트별 개별 설정</Text>
                      <Text style={{ fontSize: 11, color: c.textMuted, marginTop: 2 }}>각 세트마다 다른 무게/횟수 입력</Text>
                    </View>
                    <TouchableOpacity
                      style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: perSetMode ? c.primary : c.surfaceHigh, justifyContent: "center", paddingHorizontal: 2 }}
                      onPress={togglePerSetMode}
                      activeOpacity={0.8}>
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: c.surface, transform: [{ translateX: perSetMode ? 20 : 0 }], shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 3, elevation: 2 }} />
                    </TouchableOpacity>
                  </View>

                  {!perSetMode ? (
                    <>
                      {/* 기본무게 · 목표횟수 */}
                      <Text style={{ fontSize: 12, fontWeight: "700", color: c.textSecondary, marginBottom: 10 }}>기본무게 · 목표횟수</Text>
                      <SetInputRow
                        weight={defaultWeight}
                        reps={defaultReps}
                        unit={unit}
                        onWeightStep={delta => setDefaultWeight(w => String(Math.max(0, (parseFloat(w) || 0) + delta)))}
                        onRepsStep={delta => setDefaultReps(r => String(Math.max(0, (parseInt(r) || 0) + delta)))}
                        onWeightPad={() => openPad(defaultWeight, true, unit, setDefaultWeight)}
                        onRepsPad={() => openPad(defaultReps, false, '회', setDefaultReps)}
                        containerStyle={{ marginBottom: 14 }}
                      />
                    </>
                  ) : (
                    <>
                      {/* 세트별 목표 리스트 */}
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <Text style={{ fontSize: 13, fontWeight: "700", color: c.textPrimary }}>세트별 목표</Text>
                        {routineSets.length > 0 && (
                          <TouchableOpacity
                            style={{ backgroundColor: c.primary + "18", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}
                            onPress={() => {
                              const first = routineSets[0];
                              setRoutineSets(prev => prev.map(() => ({ ...first })));
                            }}>
                            <Text style={{ fontSize: 12, fontWeight: "700", color: c.primary }}>1세트 값 전체 적용</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {routineSets.map((rs, i) => (
                        <View key={i} style={{ backgroundColor: c.surfaceAlt, borderRadius: 12, padding: 10, marginBottom: 6 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: c.textSecondary }}>{i + 1}세트</Text>
                            <TouchableOpacity
                              style={{ width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center', opacity: routineSets.length > 1 ? 0.7 : 0.2 }}
                              onPress={() => {
                                if (routineSets.length > 1) {
                                  const next = routineSets.filter((_, idx) => idx !== i);
                                  setRoutineSets(next);
                                  setDefaultSets(String(next.length));
                                }
                              }}>
                              <Icon name="trash" size={13} color={c.textMuted} />
                            </TouchableOpacity>
                          </View>
                          <SetInputRow
                            weight={rs.weight}
                            reps={rs.reps}
                            unit={unit}
                            valueBg={c.surface}
                            onWeightStep={delta => adjustRoutineSetWeight(i, delta)}
                            onRepsStep={delta => adjustRoutineSetReps(i, delta)}
                            onWeightPad={() => openPad(rs.weight, true, unit, v => setRoutineSets(prev => prev.map((s, idx) => idx === i ? { ...s, weight: v } : s)))}
                            onRepsPad={() => openPad(rs.reps, false, '회', v => setRoutineSets(prev => prev.map((s, idx) => idx === i ? { ...s, reps: v } : s)))}
                          />
                        </View>
                      ))}

                      <TouchableOpacity
                        style={{ alignItems: "center", padding: 10, borderRadius: 14, marginBottom: 4, backgroundColor: c.primary + "18" }}
                        onPress={() => {
                          const last = routineSets[routineSets.length - 1] ?? { weight: "", reps: "" };
                          const next = [...routineSets, { ...last }];
                          setRoutineSets(next);
                          setDefaultSets(String(next.length));
                        }}>
                        <Text style={{ fontSize: 13, fontWeight: "700", color: c.primary }}>+ 세트 추가</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </>
              )}

              {/* ── Common: Rest time & Target reps ── */}
              <View style={{ height: 1, backgroundColor: c.surfaceAlt, marginVertical: 14 }} />

              <Text style={{ fontSize: 12, fontWeight: "700", color: c.textSecondary, marginBottom: 8 }}>쉬는 시간 (초)</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <TouchableOpacity
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center" }}
                  onPress={() => setRestSeconds(s => String(Math.max(0, parseInt(s) - 10)))}>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: c.textSecondary, marginTop: -2 }}>−</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: c.surfaceAlt, borderRadius: 12, paddingVertical: 10, alignItems: "center", justifyContent: "center" }}
                  onPress={() => openPad(restSeconds, false, '초', setRestSeconds)}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: c.textPrimary }}>
                    {restSeconds || '60'}<Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted }}>{' '}초</Text>
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.primary, alignItems: "center", justifyContent: "center" }}
                  onPress={() => setRestSeconds(s => String(parseInt(s) + 10))}>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: c.surface, marginTop: -2 }}>+</Text>
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 12, fontWeight: "700", color: c.textSecondary, marginBottom: 8 }}>목표 횟수 (선택)</Text>
              <TextInput
                style={{ backgroundColor: c.surfaceAlt, borderRadius: 12, padding: 12, fontSize: 14, color: c.textPrimary, marginBottom: 14 }}
                placeholder="예: 12회 3세트, 15-20회, 실패할때까지"
                value={targetReps}
                onChangeText={setTargetReps}
                placeholderTextColor={c.textMuted}
              />

              {/* Equipment settings */}
              <View style={{ height: 1, backgroundColor: c.surfaceAlt, marginBottom: 14 }} />
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Icon name="settings" size={14} color={c.textPrimary} />
                  <Text style={{ fontSize: 14, fontWeight: "700", color: c.textPrimary }}>기구 설정</Text>
                </View>
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: c.primary + "18", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}
                  onPress={openSettingsSheet}>
                  <Icon name="plus" size={14} color={c.primary} />
                  <Text style={{ fontSize: 13, fontWeight: "700", color: c.primary }}>설정 추가</Text>
                </TouchableOpacity>
              </View>
              {settings.length > 0 ? (
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 14 }}>
                  {settings.map((s, i) => (
                    <TouchableOpacity key={i}
                      style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: c.primary + "18", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 }}
                      onPress={() => removeSetting(i)}
                      activeOpacity={0.7}>
                      <Text style={{ fontSize: 12, fontWeight: "600", color: c.primary }}>{s.key}: {s.value}</Text>
                      <Icon name="close" size={11} color={c.primary} />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={{ fontSize: 12, color: c.textMuted, marginBottom: 14 }}>시트높이, 각도 등 기구 설정을 기록하세요</Text>
              )}

              {/* Tip */}
              <View style={{ height: 1, backgroundColor: c.surfaceAlt, marginBottom: 14 }} />
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
                onPress={() => tipRef.current?.focus()}
                activeOpacity={0.7}>
                <Icon name="bulb" size={14} color={c.textSecondary} />
                <Text style={{ fontSize: 14, fontWeight: "700", color: c.textPrimary }}>운동 팁</Text>
                <Text style={{ fontSize: 11, color: c.textMuted, fontWeight: "600" }}>탭하여 입력</Text>
              </TouchableOpacity>
              <TextInput
                ref={tipRef}
                style={{ backgroundColor: c.surfaceAlt, borderRadius: 12, padding: 12, fontSize: 14, color: c.textPrimary, marginTop: 10, minHeight: 80, lineHeight: 20 }}
                placeholder="자유롭게 팁이나 메모를 남겨보세요"
                value={tip}
                onChangeText={setTip}
                placeholderTextColor={c.textMuted}
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
        <View style={{ paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.surfaceAlt, backgroundColor: c.background, paddingBottom: Math.max(insets.bottom, 12) }}>
          <TouchableOpacity
            style={{ backgroundColor: c.primary, borderRadius: 24, paddingVertical: 16, alignItems: "center" }}
            onPress={handleAdd}
            disabled={isSuccess}
            activeOpacity={0.8}>
            {isSuccess ? (
              <Animated.View style={{ flexDirection: "row", alignItems: "center", gap: 8, transform: [{ scale: successScale }] }}>
                <Icon name="check" size={20} color={c.surface} />
                <Text style={{ fontSize: 16, fontWeight: "800", color: c.surface }}>추가 완료!</Text>
              </Animated.View>
            ) : (
              <Text style={{ fontSize: 16, fontWeight: "800", color: c.surface }}>
                {editMode ? "수정 완료" : mode === "session" ? "운동 추가" : "루틴에 추가"}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Number pad */}
      <NumberPad
        visible={padConfig !== null}
        value={padConfig?.value ?? '0'}
        decimal={padConfig?.decimal ?? true}
        suffix={padConfig?.suffix}
        onConfirm={v => { padConfig?.onConfirm(v); setPadConfig(null); }}
        onCancel={() => setPadConfig(null)}
      />

      {/* Equipment settings modal */}
      <Modal visible={showSettingsSheet} transparent animationType="slide" onRequestClose={closeSettingsSheet}>
        <TouchableOpacity
          style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(30,80,65,0.4)" }}
          activeOpacity={1}
          onPress={closeSettingsSheet}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ width: "100%" }}>
            <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 }}>
              <View style={{ width: 40, height: 4, backgroundColor: c.textMuted, borderRadius: 999, alignSelf: "center", marginBottom: 20 }} />
              <Text style={{ fontSize: 18, fontWeight: "800", color: c.textPrimary, marginBottom: 20 }}>기구 설정 추가</Text>

              <Text style={{ fontSize: 12, fontWeight: "700", color: c.textSecondary, marginBottom: 10 }}>항목 선택</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
                {PRESET_SETTING_KEYS.map(k => {
                  const on = !isCustomKeyMode && settingKey === k;
                  return (
                    <TouchableOpacity key={k}
                      style={{ borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: on ? c.primary + "28" : c.surfaceAlt }}
                      onPress={() => { setSettingKey(k); setIsCustomKeyMode(false); setCustomKeyName(""); }}>
                      <Text style={{ fontSize: 13, color: on ? c.primary : c.textSecondary, fontWeight: on ? "700" : "600" }}>{k}</Text>
                    </TouchableOpacity>
                  );
                })}
                {customSettingKeys.map(k => {
                  const on = !isCustomKeyMode && settingKey === k.name;
                  return (
                    <View key={k.id} style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                      <TouchableOpacity
                        style={{ borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: c.primary + "50", backgroundColor: on ? c.primary + "28" : c.surfaceAlt }}
                        onPress={() => { setSettingKey(k.name); setIsCustomKeyMode(false); setCustomKeyName(""); }}>
                        <Text style={{ fontSize: 13, color: on ? c.primary : c.textSecondary, fontWeight: on ? "700" : "600" }}>{k.name}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={{ marginLeft: -6, marginTop: -8 }}
                        onPress={() => deleteCustomKey(k.id)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                        <Icon name="close" size={13} color={c.textMuted} />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>

              <View style={{ height: 1, backgroundColor: c.surfaceAlt, marginVertical: 12 }} />
              <TouchableOpacity
                style={{ flexDirection: "row", alignItems: "center", gap: 6, alignSelf: "flex-start", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: isCustomKeyMode ? c.primary + "18" : c.surfaceAlt }}
                onPress={() => { setIsCustomKeyMode(true); setSettingKey(""); setTimeout(() => customKeyInputRef.current?.focus(), 100); }}>
                <Icon name="plus" size={15} color={isCustomKeyMode ? c.primary : c.textSecondary} />
                <Text style={{ fontSize: 13, color: isCustomKeyMode ? c.primary : c.textSecondary, fontWeight: isCustomKeyMode ? "700" : "600" }}>직접 입력</Text>
              </TouchableOpacity>

              {isCustomKeyMode && (
                <TextInput
                  ref={customKeyInputRef}
                  style={{ backgroundColor: c.surfaceAlt, borderRadius: 14, padding: 13, fontSize: 15, color: c.textPrimary, marginTop: 10, borderWidth: 1.5, borderColor: c.primary + "60" }}
                  placeholder="항목명 입력 (예: 케이블각도, 풀리높이)"
                  value={customKeyName}
                  onChangeText={setCustomKeyName}
                  placeholderTextColor={c.textMuted}
                  returnKeyType="next"
                />
              )}

              <Text style={{ fontSize: 12, fontWeight: "700", color: c.textSecondary, marginTop: 16, marginBottom: 10 }}>값 입력</Text>
              <TextInput
                style={{ backgroundColor: c.surfaceAlt, borderRadius: 14, padding: 14, fontSize: 15, color: c.textPrimary, marginBottom: 16 }}
                placeholder="예: 3단계, 45도, 오버핸드"
                value={settingValue}
                onChangeText={setSettingValue}
                placeholderTextColor={c.textMuted}
                returnKeyType="done"
                onSubmitEditing={handleAddSetting}
              />

              <TouchableOpacity
                style={{ backgroundColor: c.primary, borderRadius: 24, padding: 15, alignItems: "center" }}
                onPress={handleAddSetting}
                activeOpacity={0.8}>
                <Text style={{ fontSize: 15, fontWeight: "800", color: c.surface }}>추가하기</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
