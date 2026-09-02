import React, { useState, useEffect, useRef } from "react";
import { showCuteAlert } from "../CuteAlert";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  Platform, Modal, LayoutAnimation,
  UIManager, Image, ActivityIndicator, Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { NumberPad } from "../ui";
import { Header, IconButton } from "../../design-system";
import { Icon, FlameIcon } from "../AppIcons";
import { SetInputRow } from "./SetInputRow";
import apiClient from "../../lib/apiClient";
import { useExerciseStore } from "../../store/exerciseStore";
import { useSettingsStore } from "../../store/settingsStore";
import { useWorkoutStore } from "../../store/workoutStore";
import { EXERCISE_CATEGORIES, EXERCISE_MAPPING } from "../../constants";
import { ExerciseSetting } from "../../types/workout";
import MuscleMap, { MUSCLE_MAP } from "../MuscleMap";
import { TargetMuscleSelector } from "./TargetMuscleSelector";
import { SettingSelector, DEFAULT_SETTING_KEYS } from "./SettingSelector";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useColors } from "../../constants/colors";
import { useKeyboardHeight } from "../../hooks/useKeyboardHeight";
import { useUnsavedGuard } from "../../hooks/useUnsavedGuard";

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

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

/** 조회 실패 시 폴백으로 쓸 목록 캐시. routineStore 의 'routines:v2' 와 같은 역할. */
const SETTING_KEYS_CACHE = 'workoutSettingKeys:v1';

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
  sets?: Array<{ weight: number; reps: number; completed?: boolean; unit?: 'kg' | 'lbs' }>;
  isSingleArm?: boolean;
  // routine mode
  defaultSets?: number;
  defaultWeight?: number;
  defaultUnit?: 'kg' | 'lbs';
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
    sets?: Array<{ weight: number; reps: number; completed?: boolean; unit?: 'kg' | 'lbs' }>;
    defaultSets?: number;
    defaultWeight?: number;
    defaultUnit?: 'kg' | 'lbs';
    defaultReps?: number;
    routineSets?: Array<{ setNumber: number; targetWeight: number; targetReps: number; unit: 'kg' | 'lbs' }>;
  };
  /**
   * 작성 중인 내용이 있는지 부모에 알린다.
   *
   * 이 컴포넌트는 화면을 통째로 대체하는 자리에도 쓰이는데
   * (`routine-manage`의 `subMode === "addExercise"`), 그때 부모가 안드로이드
   * 뒤로가기를 막으려면 자식의 dirty를 알아야 한다. 자체 닫기 버튼은
   * 아래 `useUnsavedGuard`가 직접 처리하므로 이 콜백과 무관하다.
   */
  onDirtyChange?: (dirty: boolean) => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ExerciseAdder({ mode, onAdd, onClose, editMode = false, initialExercise, onDirtyChange }: ExerciseAdderProps) {
  const c = useColors();
  const SHADOW = {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 3,
  };
  const insets = useSafeAreaInsets();
  const { results, isSearching, searchExercises, clearResults, saveCustomExercise } = useExerciseStore();
  const { weightUnit, loadSettings } = useSettingsStore();
  const { exerciseHistoryCache, fetchExerciseHistory } = useWorkoutStore();

  // Refs
  const scrollRef = useRef<ScrollView>(null);
  const setsSectionY = useRef(0);
  const customFormY = useRef(0);
  const customNameRef = useRef<TextInput>(null);
  const tipRef = useRef<TextInput>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchIdRef = useRef(0);

  // Validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

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
  
  const [sets, setSets] = useState([{ weight: '', reps: '', completed: false }]);

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

  /**
   * ── 미저장 이탈 가드 ─────────────────────────────────────────────────────
   *
   * "작성 중인가"를 **초기 상태 대비 변경**으로 판정한다. editMode에서는
   * `initialExercise`가 복원된 상태가 초기값이므로, "값이 있는가"로 보면
   * 열자마자 dirty가 되어 아무것도 안 고치고 닫아도 확인창이 뜬다.
   *
   * 초기 서명을 상태에서 읽지 않고 `initialExercise`에서 **동기적으로** 만든다.
   * 복원 useEffect(:299)의 setState는 다음 렌더에야 반영돼서, 상태를 스냅샷으로
   * 잡으려면 "몇 번째 렌더에서 찍을 것인가"를 맞춰야 한다. 아래 makeSignature는
   * 복원 로직과 같은 규칙을 그대로 쓰므로 그 타이밍 문제가 없다.
   * **복원 useEffect를 고치면 여기도 같이 고칠 것.**
   *
   * unit(kg/lbs)은 일부러 뺐다. editMode가 아닐 때 설정 스토어가 로드되면서
   * 나중에 바뀌는 값이라(:289) 사용자가 아무것도 안 했는데 dirty가 된다.
   *
   * settingsDirty(기구 설정 시트의 입력)도 뺀다. 그쪽은 시트 자체 가드가
   * 이미 물어본다. 시트에서 "추가하기"로 확정된 결과인 `settings`만 본다.
   */
  const makeSignature = (v: {
    exName: string | null;
    settings: ExerciseSetting[];
    tip: string;
    restSeconds: string;
    targetReps: string;
    isSingleArm: boolean;
    sets: Array<{ weight: string; reps: string; completed: boolean }>;
    defaultSets: string;
    defaultWeight: string;
    defaultReps: string;
    perSetMode: boolean;
    routineSets: Array<{ weight: string; reps: string }>;
    customForm: unknown;
  }) =>
    JSON.stringify({
      exName: v.exName,
      settings: v.settings,
      tip: v.tip.trim(),
      restSeconds: v.restSeconds,
      targetReps: v.targetReps.trim(),
      isSingleArm: v.isSingleArm,
      // 모드별로 실제 저장되는 쪽만 본다.
      sets: mode === "session" ? v.sets : null,
      routine:
        mode === "routine"
          ? {
              defaultSets: v.defaultSets,
              defaultWeight: v.defaultWeight,
              defaultReps: v.defaultReps,
              perSetMode: v.perSetMode,
              routineSets: v.routineSets,
            }
          : null,
      customForm: v.customForm,
    });

  // 복원 useEffect(:299)와 같은 규칙으로 만든 초기 서명. editMode가 아니면
  // 각 useState의 초깃값 그대로다.
  const initialSignature = useRef(
    (() => {
      const ex = editMode ? initialExercise : undefined;
      return makeSignature({
        exName: ex?.name ?? null,
        settings: ex?.settings ?? [],
        tip: ex?.tip ?? "",
        restSeconds: String(ex?.restSeconds ?? 60),
        targetReps: ex?.targetReps ?? "",
        isSingleArm: ex?.isSingleArm ?? false,
        sets:
          ex?.sets && ex.sets.length > 0
            ? ex.sets.map((st) => ({
                weight: String(st.weight),
                reps: String(st.reps),
                completed: st.completed ?? false,
              }))
            : [{ weight: "", reps: "", completed: false }],
        defaultSets: ex?.defaultSets != null ? String(ex.defaultSets) : "3",
        defaultWeight: ex?.defaultWeight != null ? String(ex.defaultWeight) : "",
        defaultReps: ex?.defaultReps != null ? String(ex.defaultReps) : "",
        perSetMode: !!(ex?.routineSets && ex.routineSets.length > 0),
        routineSets:
          ex?.routineSets && ex.routineSets.length > 0
            ? ex.routineSets.map((st) => ({
                weight: String(st.targetWeight),
                reps: String(st.targetReps),
              }))
            : [],
        customForm: null,
      });
    })(),
  ).current;

  const currentSignature = makeSignature({
    exName: selectedExercise?.name ?? null,
    settings,
    tip,
    restSeconds,
    targetReps,
    isSingleArm,
    sets,
    defaultSets,
    defaultWeight,
    defaultReps,
    perSetMode,
    routineSets,
    // 커스텀 종목 폼은 열려 있고 뭔가 적혀 있을 때만 센다. 폼을 여는 것 자체는
    // 모드 전환이지 작성이 아니다.
    customForm: showCustomForm
      ? {
          name: customName.trim(),
          cat: customCat,
          parts: customTargetParts,
          rest: customRestSeconds,
          reps: customTargetReps.trim(),
          note: customNote.trim(),
        }
      : null,
  });

  const isDirty = currentSignature !== initialSignature;

  // 부모가 안드로이드 뒤로가기를 막아야 하는 자리(routine-manage의 addExercise)를
  // 위해 올린다. 콜백을 ref로 두고 isDirty만 의존해 매 렌더 통지를 막는다.
  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;
  useEffect(() => {
    onDirtyChangeRef.current?.(isDirty);
  }, [isDirty]);

  const guardUnsaved = useUnsavedGuard(isDirty);

  // Equipment settings sheet
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  /**
   * 시트에 작성 중인 내용이 있는가. SettingSelector가 onDirtyChange로 알려 준다.
   *
   * 시트가 닫히면 Modal이 자식을 통째로 언마운트하므로 이 값은 그대로 남는다.
   * 열고 닫는 두 함수에서 직접 false로 되돌린다.
   */
  const [settingsDirty, setSettingsDirty] = useState(false);
  const [customSettingKeys, setCustomSettingKeys] = useState<CustomKey[]>([]);
  /**
   * 서버도 캐시도 못 읽어 하드코딩 목록으로 버티는 중인가.
   *
   * 이때의 항목에는 서버 id가 없어 지울 대상이 없다. 그래서 삭제 콜백을
   * 넘기지 않고, SettingSelector 는 콜백이 없으면 길게 누르기를 붙이지 않는다.
   */
  const [settingsFallback, setSettingsFallback] = useState(false);

  // Success animation (session mode)
  const [isSuccess, setIsSuccess] = useState(false);
  const successScale = useRef(new Animated.Value(0)).current;

  const keyboardHeight = useKeyboardHeight();

  /**
   * 기구 설정 항목 목록을 가져온다.
   *
   * 예전에는 기본 6개가 클라이언트 상수라 네트워크와 무관하게 항상 보였다.
   * 사용자 소유 데이터로 옮기면서 조회가 실패하면 목록이 텅 비게 됐으므로
   * 3단 폴백을 둔다. `store/routineStore.ts`의 loadRoutines 와 같은 방식이다.
   *
   *   1. 성공             → 표시 + AsyncStorage 캐시
   *   2. 실패 + 캐시      → 캐시 표시
   *   3. 실패 + 캐시 없음 → DEFAULT_SETTING_KEYS 를 **표시 전용**으로
   *
   * 3의 항목은 서버 id가 없어 삭제할 수 없다. settingsFallback 으로 표시해
   * 삭제 콜백을 넘기지 않는다.
   *
   * 예전 `.catch(() => {})` 는 실패를 조용히 삼켜 폴백이 돌았는지도 알 수 없었다.
   */
  const loadSettingKeys = async () => {
    try {
      const res = await apiClient.get<CustomKey[]>("/workout-settings");
      setCustomSettingKeys(res.data);
      setSettingsFallback(false);
      await AsyncStorage.setItem(SETTING_KEYS_CACHE, JSON.stringify(res.data));
    } catch {
      try {
        const raw = await AsyncStorage.getItem(SETTING_KEYS_CACHE);
        if (raw) {
          setCustomSettingKeys(JSON.parse(raw));
          setSettingsFallback(false);
          console.warn("[workout-settings] 조회 실패 — 캐시로 폴백");
          return;
        }
      } catch {}
      setCustomSettingKeys(
        DEFAULT_SETTING_KEYS.map((name) => ({ id: `fallback:${name}`, name })),
      );
      setSettingsFallback(true);
      console.warn("[workout-settings] 조회·캐시 모두 실패 — 기본 목록 표시 전용");
    }
  };

  useEffect(() => {
    loadSettings().then(() => {
      // editMode에서는 두 번째 useEffect가 이미 initialExercise의 unit을 세팅했으므로 덮어쓰지 않는다
      // loadSettings()는 비동기라 resolve 시점이 editMode unit 세팅 이후 → 여기서 덮어쓰면 lbs → kg으로 초기화됨
      if (editMode && initialExercise) return;
      setUnit(useSettingsStore.getState().weightUnit);
    });
    loadSettingKeys();
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
        if (ex.sets && ex.sets.length > 0) {
          const savedUnit = ex.sets[0]?.unit ?? 'kg';
          setUnit(savedUnit);
          setSets(ex.sets.map(s => ({ weight: String(s.weight), reps: String(s.reps), completed: s.completed ?? false })));
        }
      } else if (mode === 'routine') {
        if (ex.defaultSets != null) setDefaultSets(String(ex.defaultSets));
        if (ex.defaultWeight != null) setDefaultWeight(String(ex.defaultWeight));
        if (ex.defaultReps != null) setDefaultReps(String(ex.defaultReps));
        setIsSingleArm(ex.isSingleArm ?? false);
        if (ex.routineSets && ex.routineSets.length > 0) {
          setPerSetMode(true);
          const savedUnit = ex.routineSets[0]?.unit ?? ex.defaultUnit ?? 'kg';
          setUnit(savedUnit);
          setRoutineSets(ex.routineSets.map(s => ({ weight: String(s.targetWeight), reps: String(s.targetReps) })));
        } else if (ex.defaultUnit) {
          setUnit(ex.defaultUnit);
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
      searchTimer.current = setTimeout(() => {
        if (searchIdRef.current !== searchId) return;
        // 영문 매핑 있으면 영문으로, 없으면 한글 그대로 API 검색 (nameKo 필드)
        searchExercises(englishTerms.length > 0 ? englishTerms[0] : q);
      }, 300);
    } else {
      const byMap = lookupByEnglishContains(q);
      searchTimer.current = setTimeout(() => {
        if (searchIdRef.current !== searchId) return;
        searchExercises(byMap.length > 0 ? byMap[0] : q);
      }, 300);
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
    setSets([{ weight: "", reps: "", completed: false }]);
    setSettings([]);
    setTip("");
    setRestSeconds("60");
    setTargetReps("");
    setDefaultSets("3");
    setDefaultWeight("");
    setIsSingleArm(false);
    setPerSetMode(false);
    setRoutineSets([]);
    setShowCustomForm(false);
  };

  const handleAddCustomExercise = () => {
    const newErrs: Record<string, string> = {};
    if (!customName.trim()) newErrs.customName = '종목명을 입력해주세요';
    if (!customCat) newErrs.customCat = '카테고리를 선택해주세요';
    if (Object.keys(newErrs).length > 0) { setErrors(prev => ({ ...prev, ...newErrs })); return; }
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
    const last = sets[sets.length - 1] ?? { weight: '', reps: '', completed: false };
    setSets(prev => [...prev, { weight: last.weight, reps: last.reps, completed: false }]);
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
    setErrors(prev => ({ ...prev, sets: '' }));
  };

  const togglePerSetMode = () => {
    if (!perSetMode) {
      const count = Math.max(1, parseInt(defaultSets) || 3);
      const seed = Array.from({ length: count }, () => ({ weight: defaultWeight, reps: defaultReps }));
      setRoutineSets(seed);
      if (mode === 'session') {
        setSets(seed.map(s => ({ weight: s.weight, reps: s.reps, completed: false })));
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
    setSettingsDirty(false);
    setShowSettingsSheet(true);
  };
  /** 실제로 닫는다. 저장이 끝난 경로(handleAddSetting)는 이쪽을 그대로 부른다. */
  const closeSettingsSheet = () => {
    setSettingsDirty(false);
    setShowSettingsSheet(false);
  };

  /**
   * 사용자가 닫기를 **요청**했을 때의 경로 — 오버레이 탭, 안드로이드 뒤로가기.
   *
   * 이 시트는 값 입력이 목적이라, 작성 중에 닫으면 입력값과 이번에 만든
   * 초안 항목이 함께 사라진다(둘 다 "추가하기" 전에는 어디에도 저장되지 않는다).
   * 그래서 파괴적 액션과 같은 확인을 거친다 — DESIGN.md의 삭제 확인 형태와 같은
   * showCuteAlert + danger 톤이다.
   */
  const requestCloseSettingsSheet = () => {
    if (!settingsDirty) {
      closeSettingsSheet();
      return;
    }
    showCuteAlert({
      icon: "alert",
      tone: "danger",
      title: "작성 중인 내용이 있어요",
      message: "닫으면 입력한 값과\n새로 만든 항목이 사라져요.",
      buttons: [
        { label: "계속 작성", style: "soft" },
        { label: "닫기", style: "primary", onPress: closeSettingsSheet },
      ],
    });
  };

  /**
   * SettingSelector에서 항목 추가 시 호출.
   * 프리셋/기존 커스텀 키에 없는 새 키(=직접 입력)면 서버에 저장해 다음에도 재사용.
   */
  const handleAddSetting = async (key: string, value: string) => {
    // 기본 항목도 이제 customSettingKeys 로 들어오므로 목록 하나만 보면 된다.
    // 예전에는 DEFAULT_SETTING_KEYS 도 함께 봐야 했다(그때는 클라이언트 상수였다).
    const isNewCustomKey = !customSettingKeys.some(k => k.name === key);
    if (isNewCustomKey) {
      try {
        const res = await apiClient.post<CustomKey>("/workout-settings", { name: key });
        setCustomSettingKeys(prev => {
          const next = [...prev, res.data];
          AsyncStorage.setItem(SETTING_KEYS_CACHE, JSON.stringify(next)).catch(() => {});
          return next;
        });
      } catch {}
    }
    setSettings(prev => [...prev, { key, value }]);
    closeSettingsSheet();
  };

  /**
   * 기본 항목 되돌리기 — 빠진 기본 항목만 서버가 채우고 전체 목록을 돌려준다.
   *
   * 실패를 조용히 삼키지 않는다. 눌렀는데 아무 일도 안 일어나면 사용자는
   * 버튼이 고장 난 것인지 원래 그런 것인지 알 수 없다.
   */
  const restoreDefaultKeys = async () => {
    try {
      const res = await apiClient.post<CustomKey[]>("/workout-settings/restore");
      setCustomSettingKeys(res.data);
      await AsyncStorage.setItem(SETTING_KEYS_CACHE, JSON.stringify(res.data));
    } catch {
      showCuteAlert({
        icon: 'alert',
        tone: 'danger',
        title: '되돌리기 실패',
        message: '잠시 후 다시 시도해주세요',
        buttons: [{ label: '확인', style: 'primary' }],
      });
    }
  };

  const deleteCustomKey = async (id: string) => {
    try {
      await apiClient.delete(`/workout-settings/${id}`);
      setCustomSettingKeys(prev => {
        const next = prev.filter(k => k.id !== id);
        AsyncStorage.setItem(SETTING_KEYS_CACHE, JSON.stringify(next)).catch(() => {});
        return next;
      });
    } catch {
      showCuteAlert({ icon: 'alert', tone: 'danger', title: '삭제 실패', message: '잠시 후 다시 시도해주세요', buttons: [{ label: '확인', style: 'primary' }] });
    }
  };

  const removeSetting = (idx: number) => setSettings(prev => prev.filter((_, i) => i !== idx));

  // ─── Submit handler ───────────────────────────────────────────────────────

  const handleAdd = () => {
    if (!selectedExercise) {
      setErrors(prev => ({ ...prev, exercise: '운동 종목을 선택해주세요' }));
      return;
    }

    if (mode === "session") {
      let finalSets: Array<{ weight: number; reps: number; completed?: boolean; unit: 'kg' | 'lbs' }>;
      if (!perSetMode) {
        const count = Math.max(1, parseInt(defaultSets) || 3);
        const r = parseInt(defaultReps) || 0;
        if (r === 0) { setErrors(prev => ({ ...prev, reps: '횟수를 입력해주세요' })); return; }
        const w = parseFloat(defaultWeight) || 0;
        finalSets = Array.from({ length: count }, () => ({ weight: w, reps: r, completed: false, unit }));
      } else {
        const validSets = sets.filter(s => s.reps && parseInt(s.reps) > 0);
        if (validSets.length === 0) { setErrors(prev => ({ ...prev, sets: '최소 1세트를 입력해주세요' })); return; }
        finalSets = validSets.map(st => ({
          weight: parseFloat(st.weight) || 0,
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
        sets: finalSets,
      });
      setIsSuccess(true);
      Animated.spring(successScale, { toValue: 1, damping: 8, stiffness: 200, useNativeDriver: true }).start();
      setTimeout(onClose, 650);
    } else {
      // 루틴 모드도 session 모드와 동일하게 횟수 검증 — reps가 비면 0으로 저장돼
      // 다음에 이 루틴으로 운동을 시작할 때 횟수가 0으로 나오는 버그를 원천 차단한다.
      if (!perSetMode) {
        if ((parseInt(defaultReps) || 0) === 0) {
          setErrors(prev => ({ ...prev, reps: '횟수를 입력해주세요' }));
          return;
        }
      } else {
        if (!routineSets.some(s => (parseInt(s.reps) || 0) > 0)) {
          setErrors(prev => ({ ...prev, sets: '세트 횟수를 입력해주세요' }));
          return;
        }
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
        defaultSets: perSetMode ? routineSets.length : Math.max(1, parseInt(defaultSets) || 3),
        defaultWeight: perSetMode ? undefined : (parseFloat(defaultWeight) || undefined),
        defaultUnit: perSetMode ? undefined : unit,
        defaultReps: perSetMode ? undefined : (parseInt(defaultReps) || 0),
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

  // ─── Prefill last weight/reps from previous record (session mode) ──────────
  // 운동을 종료하면 activeSession이 비워지므로, 다음에 같은 종목을 다시 추가할 때
  // 입력란이 0으로 보인다. 직전 기록의 마지막 세트 값을 미리 채워 "마지막 무게/횟수"가
  // 항상 남아 있도록 한다. (히스토리는 비동기 로드라 도착 시점에 한 번만 채운다)
  // editMode에서는 위 useEffect가 기존 값을 세팅하므로 건드리지 않는다.
  const prefilledForRef = useRef<string | null>(null);
  useEffect(() => {
    if (mode !== "session" || editMode) return;
    if (!selectedExercise) {
      prefilledForRef.current = null;
      return;
    }
    if (prefilledForRef.current === selectedExercise.name) return;
    const rec = prevRecord?.comparisonSession;
    if (!rec || !rec.sets || rec.sets.length === 0) return;
    prefilledForRef.current = selectedExercise.name;
    const lastSet = rec.sets[rec.sets.length - 1];
    const prevUnit = (lastSet.unit as "kg" | "lbs") ?? "kg";
    setUnit(prevUnit);
    setDefaultSets(String(rec.sets.length));
    setDefaultWeight(lastSet.weight != null ? String(lastSet.weight) : "");
    setDefaultReps(lastSet.reps != null ? String(lastSet.reps) : "");
    setSets(
      rec.sets.map((s) => ({
        weight: s.weight != null ? String(s.weight) : "",
        reps: s.reps != null ? String(s.reps) : "",
        completed: false,
      })),
    );
    // 직전 기록의 세트가 서로 다르면(세트별 개별값) 개별설정 모드를 켜서
    // 저장 시 uniform(defaultWeight×N)으로 뭉개지지 않게 한다.
    const nonUniform = rec.sets.some(
      (s) => s.weight !== rec.sets[0].weight || s.reps !== rec.sets[0].reps,
    );
    setPerSetMode(nonUniform);
    // 종목 상세(한팔기준·기구 설정·운동 팁·쉬는 시간·목표 횟수)도 직전 기록에서 복원한다.
    // (카탈로그 선택 시 세팅된 기본값을 직전 기록 값으로 덮어써 "마지막 설정"이 유지되게 함)
    setIsSingleArm(rec.isSingleArm ?? false);
    setSettings(rec.settings ?? []);
    setTip(rec.tip ?? "");
    if (rec.restSeconds != null) setRestSeconds(String(rec.restSeconds));
    if (rec.targetReps) setTargetReps(rec.targetReps);
  }, [prevRecord, selectedExercise?.name, mode, editMode]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {/* 회귀 방지: onClose 를 그대로 넘기지 말 것. 작성 중이면 한 번 되묻는다.
          부모가 라우트를 벗어나든(add-workout) 모드만 되돌리든(routine-manage)
          이 가드는 동일하게 앞단에서 걸린다. */}
      <Header
        title={editMode ? "운동 수정" : "운동 추가"}
        showClose
        onClose={() => guardUnsaved(onClose)}
      />

      <View style={{ flex: 1 }}>
        <ScrollView
          ref={scrollRef}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="always"
          contentContainerStyle={{ padding: 20, paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 20 }}>

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
                <TouchableOpacity activeOpacity={0.8}
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
                  // 검색바 한 행이 [돋보기 16][입력 flex:1][지우기 16]이다.
                  // box로 키우면 행 높이가 40 → 64로 늘고 입력 폭도 28 줄어든다.
                  // 이 파일에는 overflow 지정이 0건이라 hitSlop이 잘리지 않는다.
                  <IconButton
                    accessibilityLabel="검색어 지우기"
                    onPress={() => setSearchQuery("")}
                    touchTargetMode="hitSlop">
                    <Icon name="close" size={16} color={c.textMuted} />
                  </IconButton>
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
                    {/* [제목][닫기] 헤더 행. box면 행 높이가 20 → 44로 늘어
                        아래 폼 전체가 24pt 밀린다. */}
                    <IconButton
                      accessibilityLabel="종목 추가 폼 닫기"
                      onPress={() => { setShowCustomForm(false); setCustomName(""); setCustomCat(""); }}
                      touchTargetMode="hitSlop">
                      <Icon name="close" size={16} color={c.textMuted} />
                    </IconButton>
                  </View>

                  <TextInput
                    ref={customNameRef}
                    style={{ backgroundColor: c.surfaceAlt, borderRadius: 12, padding: 12, fontSize: 15, color: c.textPrimary, marginBottom: errors.customName ? 4 : 12, borderWidth: errors.customName ? 1.5 : 0, borderColor: errors.customName ? c.danger : undefined }}
                    placeholder="종목명 입력 (예: 케이블 플라이) *"
                    value={customName}
                    onChangeText={(v) => { setCustomName(v); if (v.trim()) setErrors(prev => ({ ...prev, customName: '' })); }}
                    placeholderTextColor={c.textMuted}
                    returnKeyType="done"
                  />
                  {!!errors.customName && (
                    <Text style={{ fontSize: 11, color: c.danger, marginBottom: 8 }}>{errors.customName}</Text>
                  )}

                  <Text style={{ fontSize: 12, fontWeight: "700", color: errors.customCat ? c.danger : c.textMuted, marginBottom: 8 }}>카테고리 <Text style={{ color: c.danger }}>*</Text></Text>
                  {!!errors.customCat && (
                    <Text style={{ fontSize: 11, color: c.danger, marginBottom: 6 }}>{errors.customCat}</Text>
                  )}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} keyboardShouldPersistTaps="handled">
                    {EXERCISE_CATEGORIES.map(cat => {
                      const on = customCat === cat;
                      return (
                        <TouchableOpacity activeOpacity={0.8} key={cat}
                          style={[{ borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, backgroundColor: on ? c.danger + "28" : c.surface }, SHADOW]}
                          onPress={() => { setCustomCat(cat); setCustomTargetParts([]); setErrors(prev => ({ ...prev, customCat: '' })); }}>
                          <Text style={{ fontSize: 13, color: on ? c.danger : c.textSecondary, fontWeight: on ? "700" : "600" }}>{cat}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>

                  <View style={{ marginBottom: 16 }}>
                    <TargetMuscleSelector
                      showCategory={false}
                      category={customCat}
                      targetMuscles={customTargetParts}
                      onTargetMusclesChange={setCustomTargetParts}
                    />
                  </View>

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

              {/* Category tabs — 카테고리 필터 (항상 표시, 영어 검색 시 제외) */}
              {!isEnglishSearch && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }} keyboardShouldPersistTaps="handled">
                  {/* 전체 칩 — 명시적으로 필터 해제 */}
                  <TouchableOpacity activeOpacity={0.8} key="__all__"
                    style={[{ borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, backgroundColor: selectedCategory === null ? c.danger + "28" : c.surface }, SHADOW]}
                    onPress={() => setSelectedCategory(null)}>
                    <Text style={{ fontSize: 13, color: selectedCategory === null ? c.danger : c.textSecondary, fontWeight: selectedCategory === null ? "700" : "600" }}>전체</Text>
                  </TouchableOpacity>
                  {EXERCISE_CATEGORIES.map(cat => {
                    const on = selectedCategory === cat;
                    return (
                      <TouchableOpacity activeOpacity={0.8} key={cat}
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
                        <TouchableOpacity activeOpacity={0.8} key={u}
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
                      onPress={() => setIsSingleArm(v => !v)}
                      activeOpacity={0.8}>
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: c.surface, transform: [{ translateX: isSingleArm ? 20 : 0 }], shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 3, elevation: 2 }} />
                    </TouchableOpacity>
                  </View>

                  {/* 세트수 stepper */}
                  <Text style={{ fontSize: 12, fontWeight: "700", color: c.textSecondary, marginBottom: 8 }}>세트수</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <TouchableOpacity activeOpacity={0.8}
                      style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center" }}
                      onPress={() => adjustSets(-1)}>
                      <Text style={{ fontSize: 18, fontWeight: "800", color: c.textSecondary }}>−</Text>
                    </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.8}
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
                    <TouchableOpacity activeOpacity={0.8}
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
                      <Text style={{ fontSize: 12, fontWeight: "700", color: errors.reps ? c.danger : c.textSecondary, marginBottom: 10 }}>
                        무게 · 횟수 <Text style={{ color: c.danger }}>*</Text>
                      </Text>
                      <SetInputRow
                        weight={defaultWeight}
                        reps={defaultReps}
                        unit={unit}
                        onWeightStep={delta => setDefaultWeight(w => String(Math.max(0, (parseFloat(w) || 0) + delta)))}
                        onRepsStep={delta => { setDefaultReps(r => String(Math.max(0, (parseInt(r) || 0) + delta))); setErrors(prev => ({ ...prev, reps: '' })); }}
                        onWeightPad={() => openPad(defaultWeight, true, unit, setDefaultWeight)}
                        onRepsPad={() => openPad(defaultReps, false, '회', (v) => { setDefaultReps(v); if (parseInt(v) > 0) setErrors(prev => ({ ...prev, reps: '' })); })}
                        containerStyle={{ marginBottom: errors.reps ? 4 : 14 }}
                      />
                      {!!errors.reps && (
                        <Text style={{ fontSize: 11, color: c.danger, marginBottom: 10 }}>{errors.reps}</Text>
                      )}
                    </>
                  ) : (
                    <>
                      {/* 세트별 개별 입력 */}
                      {sets.map((st, i) => (
                        <View key={i} style={{ backgroundColor: st.completed ? c.success + '14' : c.surfaceAlt, borderRadius: 12, padding: 10, marginBottom: 6 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                            <TouchableOpacity activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}
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
                            {/* 세트마다 반복되는 행이라 box(28 → 44)는 세트 수만큼
                                누적된다(5세트면 +80pt). 그래서 hitSlop.
                                onPress 안에 있던 sets.length 가드를 disabled로 옮겼다 —
                                시각만 흐리고 눌리던 상태가 실제 비활성이 되고
                                accessibilityState.disabled도 함께 붙는다.
                                기존 시각(활성 0.7 / 비활성 0.2)은 style로 유지한다.
                                IconButton의 style이 마지막이라 disabled의 0.5를 덮는다. */}
                            <IconButton
                              accessibilityLabel={`${i + 1}세트 삭제`}
                              disabled={sets.length <= 1}
                              onPress={() => setSets(prev => prev.filter((_, idx) => idx !== i))}
                              touchTargetMode="hitSlop"
                              style={{ width: 28, height: 28, borderRadius: 8, opacity: sets.length > 1 ? 0.7 : 0.2 }}>
                              <Icon name="trash" size={13} color={c.textMuted} />
                            </IconButton>
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

                        </View>
                      ))}
                      <TouchableOpacity activeOpacity={0.8}
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
                        <TouchableOpacity activeOpacity={0.8} key={u}
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
                      onPress={() => setIsSingleArm(v => !v)}
                      activeOpacity={0.8}>
                      <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: c.surface, transform: [{ translateX: isSingleArm ? 20 : 0 }], shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 3, elevation: 2 }} />
                    </TouchableOpacity>
                  </View>

                  {/* 세트수 */}
                  <Text style={{ fontSize: 12, fontWeight: "700", color: c.textSecondary, marginBottom: 8 }}>세트수</Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
                    <TouchableOpacity activeOpacity={0.8}
                      style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center" }}
                      onPress={() => adjustSets(-1)}>
                      <Text style={{ fontSize: 18, fontWeight: "800", color: c.textSecondary }}>−</Text>
                    </TouchableOpacity>
                    <TouchableOpacity activeOpacity={0.8}
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
                    <TouchableOpacity activeOpacity={0.8}
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
                        onRepsStep={delta => { setDefaultReps(r => String(Math.max(0, (parseInt(r) || 0) + delta))); setErrors(prev => ({ ...prev, reps: '' })); }}
                        onWeightPad={() => openPad(defaultWeight, true, unit, setDefaultWeight)}
                        onRepsPad={() => openPad(defaultReps, false, '회', (v) => { setDefaultReps(v); if (parseInt(v) > 0) setErrors(prev => ({ ...prev, reps: '' })); })}
                        containerStyle={{ marginBottom: 14 }}
                      />

                    </>
                  ) : (
                    <>
                      {/* 세트별 목표 리스트 */}
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <Text style={{ fontSize: 13, fontWeight: "700", color: c.textPrimary }}>세트별 목표</Text>
                        {routineSets.length > 0 && (
                          <TouchableOpacity activeOpacity={0.8}
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
                            {/* 세션 모드의 세트 삭제와 같은 판단 — 반복 행이라 hitSlop. */}
                            <IconButton
                              accessibilityLabel={`${i + 1}세트 삭제`}
                              disabled={routineSets.length <= 1}
                              onPress={() => {
                                const next = routineSets.filter((_, idx) => idx !== i);
                                setRoutineSets(next);
                                setDefaultSets(String(next.length));
                              }}
                              touchTargetMode="hitSlop"
                              style={{ width: 28, height: 28, borderRadius: 8, opacity: routineSets.length > 1 ? 0.7 : 0.2 }}>
                              <Icon name="trash" size={13} color={c.textMuted} />
                            </IconButton>
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

                      <TouchableOpacity activeOpacity={0.8}
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

              {/* ── Common: 타겟 부위 (수정 시에도 변경 가능) ── */}
              <View style={{ height: 1, backgroundColor: c.surfaceAlt, marginVertical: 14 }} />
              <TargetMuscleSelector
                category={selectedExercise.category}
                onCategoryChange={(cat) =>
                  setSelectedExercise((prev) => (prev ? { ...prev, category: cat } : prev))
                }
                targetMuscles={selectedExercise.targetMuscles ?? []}
                onTargetMusclesChange={(m) =>
                  setSelectedExercise((prev) => (prev ? { ...prev, targetMuscles: m } : prev))
                }
              />

              {/* ── Common: Rest time & Target reps ── */}
              <View style={{ height: 1, backgroundColor: c.surfaceAlt, marginVertical: 14 }} />

              <Text style={{ fontSize: 12, fontWeight: "700", color: c.textSecondary, marginBottom: 8 }}>쉬는 시간 (초)</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14 }}>
                <TouchableOpacity activeOpacity={0.8}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: c.surfaceAlt, alignItems: "center", justifyContent: "center" }}
                  onPress={() => setRestSeconds(s => String(Math.max(0, parseInt(s) - 10)))}>
                  <Text style={{ fontSize: 16, fontWeight: "800", color: c.textSecondary, marginTop: -2 }}>−</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.8}
                  style={{ flex: 1, backgroundColor: c.surfaceAlt, borderRadius: 12, paddingVertical: 10, alignItems: "center", justifyContent: "center" }}
                  onPress={() => openPad(restSeconds, false, '초', setRestSeconds)}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: c.textPrimary }}>
                    {restSeconds || '60'}<Text style={{ fontSize: 12, fontWeight: "600", color: c.textMuted }}>{' '}초</Text>
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.8}
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
                onFocus={() => { setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100); }}
              />

              {/* Equipment settings */}
              <View style={{ height: 1, backgroundColor: c.surfaceAlt, marginBottom: 14 }} />
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                  <Icon name="settings" size={14} color={c.textPrimary} />
                  <Text style={{ fontSize: 14, fontWeight: "700", color: c.textPrimary }}>기구 설정</Text>
                </View>
                <TouchableOpacity activeOpacity={0.8}
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
                      {/* ×는 값이 아니라 "누르면 지워진다"는 표시다. 라벨과 같은
                          primary면 둘이 같은 무게로 읽혀 값의 일부처럼 보인다.
                          textMuted는 이 칩 배경(primary+"18") 위에서 라이트 2.19:1 /
                          다크 2.59:1로 아이콘 기준 3:1에 못 미쳐 쓰지 않는다.
                          textSecondary는 5.18 / 4.70으로 현재 primary(3.70 / 3.55)보다
                          오히려 높다. */}
                      <Icon name="close" size={11} color={c.textSecondary} />
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
                onFocus={() => { setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100); }}
              />
            </View>
          )}
        </ScrollView>

        {/* Footer button */}
        <View style={{ paddingHorizontal: 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: c.surfaceAlt, backgroundColor: c.background, paddingBottom: Math.max(insets.bottom, 12) }}>
          {(errors.exercise || errors.sets || errors.reps) ? (
            <Text style={{ fontSize: 12, color: c.danger, marginBottom: 8, textAlign: 'center' }}>
              {errors.exercise || errors.sets || errors.reps}
            </Text>
          ) : null}
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
      </View>

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
      <Modal visible={showSettingsSheet} transparent animationType="slide" onRequestClose={requestCloseSettingsSheet}>
        {/* 회귀 방지: 오버레이는 시트를 **감싸지 않는다**. 형제로 둔다.
            감싸면 시트 본문의 빈 곳(패딩, 제목, 라벨, 칩 사이, 그래버)을 눌러도
            터치가 오버레이까지 올라가 닫혀 버린다 — 값을 입력하던 중이면 그대로
            날아갔다. 안쪽에 빈 onPress 블로커를 덧대는 방식은 쓰지 않는다.
            빼먹기 쉽고 실제로 여기서 빠져 있었다.
            같은 구조를 workout.tsx의 루틴 시트와 NumberPad가 이미 쓴다. */}
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(30,80,65,0.4)" }}>
          <TouchableOpacity
            style={{ flex: 1 }}
            activeOpacity={1}
            accessibilityRole="button"
            accessibilityLabel="기구 설정 닫기"
            onPress={requestCloseSettingsSheet}
          />
          <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 36 }}>
            <View style={{ width: 40, height: 4, backgroundColor: c.textMuted, borderRadius: 999, alignSelf: "center", marginBottom: 20 }} />
            <Text style={{ fontSize: 18, fontWeight: "800", color: c.textPrimary, marginBottom: 20 }}>기구 설정 추가</Text>

            <SettingSelector
              key={showSettingsSheet ? "open" : "closed"}
              variant="sheet"
              extraKeys={customSettingKeys}
              onDeleteExtraKey={settingsFallback ? undefined : deleteCustomKey}
              onRestoreDefaults={settingsFallback ? undefined : restoreDefaultKeys}
              onAdd={handleAddSetting}
              onDirtyChange={setSettingsDirty}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}
