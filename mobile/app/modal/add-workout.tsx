import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "../../components/ui";
import { useRouter } from "expo-router";
import { useState, useEffect, useRef } from "react";
import { Ionicons } from "@expo/vector-icons";
import apiClient from "../../lib/apiClient";
import { useWorkoutStore } from "../../store/workoutStore";
import { useExerciseStore } from "../../store/exerciseStore";
import { Colors, EXERCISE_CATEGORIES, lookupEnglish } from "../../constants";
import { WorkoutSet, ExerciseSetting } from "../../types/workout";
import MuscleMap, { MUSCLE_MAP } from "../../components/MuscleMap";

if (Platform.OS === "android") {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const CATEGORY_TO_BODYPART: Record<string, string> = {
  가슴: "chest",
  등: "back",
  어깨: "shoulders",
  팔: "upper arms",
  하체: "upper legs",
  복근: "waist",
  유산소: "cardio",
};

const BODYPART_TO_CATEGORY: Record<string, string> = {
  chest: "가슴",
  back: "등",
  shoulders: "어깨",
  "upper arms": "팔",
  "lower arms": "팔",
  "upper legs": "하체",
  "lower legs": "하체",
  waist: "복근",
  cardio: "유산소",
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

const isKorean = (text: string) => /[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(text);


const PRESET_SETTING_KEYS = [
  "시트높이",
  "등받이각도",
  "그립종류",
  "발판위치",
  "바높이",
  "인클라인각도",
  "기타",
];

const CARD_SHADOW = {
  shadowColor: "#B4A0D8",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.09,
  shadowRadius: 10,
  elevation: 3,
};

type SelectedExercise = {
  name: string;
  category: string;
  gifUrl?: string;
  caloriesPerMinute?: number;
};

type CustomKey = { id: string; name: string };

export default function AddWorkoutModal() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { addExercise, addSet, activeSession } = useWorkoutStore();
  const { results, isSearching, searchExercises, clearResults } =
    useExerciseStore();

  const scrollRef = useRef<ScrollView>(null);
  const setsSectionY = useRef(0);
  const setWeightRefs = useRef<(TextInput | null)[]>([]);
  const customKeyInputRef = useRef<TextInput>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchIdRef = useRef(0);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] =
    useState<SelectedExercise | null>(null);
  const [exerciseListCollapsed, setExerciseListCollapsed] = useState(false);
  const [customExercises, setCustomExercises] = useState<SelectedExercise[]>(
    []
  );
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customCat, setCustomCat] = useState("");

  const [sets, setSets] = useState([{ weight: "", reps: "" }]);

  const [settings, setSettings] = useState<ExerciseSetting[]>([]);
  const [showSettingsSheet, setShowSettingsSheet] = useState(false);
  const [settingKey, setSettingKey] = useState(PRESET_SETTING_KEYS[0]);
  const [settingValue, setSettingValue] = useState("");
  const [customSettingKeys, setCustomSettingKeys] = useState<CustomKey[]>([]);
  const [isCustomKeyMode, setIsCustomKeyMode] = useState(false);
  const [customKeyName, setCustomKeyName] = useState("");

  const [tip, setTip] = useState("");

  useEffect(() => {
    apiClient
      .get<CustomKey[]>("/workout-settings")
      .then((res) => setCustomSettingKeys(res.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const searchId = ++searchIdRef.current;
    const q = searchQuery.trim();

    if (!q) {
      clearResults();
      return;
    }

    clearResults();

    if (isKorean(q)) {
      // 한글 → 매핑 테이블로 영어 변환 후 API 검색
      const english = lookupEnglish(q);
      if (english) {
        searchTimer.current = setTimeout(() => {
          if (searchIdRef.current !== searchId) return;
          searchExercises(english);
        }, 400);
      }
      // 매핑 없으면 preset 필터링 결과가 fallback으로 표시됨
    } else {
      // 영어 → 직접 API 검색
      searchTimer.current = setTimeout(() => {
        if (searchIdRef.current !== searchId) return;
        searchExercises(q);
      }, 400);
    }

    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, [searchQuery]);

  // 카테고리 탭 변경 시 검색창 초기화
  useEffect(() => {
    if (selectedCategory) setSearchQuery("");
  }, [selectedCategory]);

  const isEnglishSearch = Boolean(searchQuery.trim() && !isKorean(searchQuery));

  // 영어 검색이 아닐 때 preset 표시 (한글 검색 중에는 번역 대기 중 fallback으로 표시)
  const filteredPresets: SelectedExercise[] = isEnglishSearch
    ? []
    : PRESET_EXERCISES.filter((ex) => {
        const matchesCat = !selectedCategory || ex.category === selectedCategory;
        const matchesQuery = !searchQuery.trim() || ex.name.includes(searchQuery.trim());
        return matchesCat && matchesQuery;
      });

  const filteredCustom = customExercises.filter(
    (e) => !selectedCategory || e.category === selectedCategory
  );

  const handleSelectExercise = (ex: SelectedExercise) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedExercise(ex);
    setExerciseListCollapsed(true);
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: setsSectionY.current, animated: true });
    }, 320);
    setTimeout(() => {
      setWeightRefs.current[0]?.focus();
    }, 520);
  };

  const handleChangeExercise = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setSelectedExercise(null);
    setExerciseListCollapsed(false);
    setSets([{ weight: "", reps: "" }]);
    setSettings([]);
    setTip("");
    setWeightRefs.current = [];
    setShowCustomForm(false);
  };

  const handleAddCustomExercise = () => {
    if (!customName.trim()) return Alert.alert("종목명을 입력해주세요");
    if (!customCat) return Alert.alert("카테고리를 선택해주세요");
    const newEx: SelectedExercise = {
      name: customName.trim(),
      category: customCat,
    };
    setCustomExercises((prev) => [...prev, newEx]);
    setCustomName("");
    setCustomCat("");
    setShowCustomForm(false);
    handleSelectExercise(newEx);
  };

  const handleAddSet = () => {
    const newIndex = sets.length;
    setSets((prev) => [...prev, { weight: "", reps: "" }]);
    setTimeout(() => {
      setWeightRefs.current[newIndex]?.focus();
    }, 100);
  };

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

    if (
      isCustomKeyMode &&
      key &&
      !customSettingKeys.some((k) => k.name === key)
    ) {
      try {
        const res = await apiClient.post<CustomKey>("/workout-settings", {
          name: key,
        });
        setCustomSettingKeys((prev) => [...prev, res.data]);
      } catch {}
    }

    setSettings((prev) => [...prev, { key, value: settingValue.trim() }]);
    closeSettingsSheet();
  };

  const deleteCustomKey = async (id: string) => {
    try {
      await apiClient.delete(`/workout-settings/${id}`);
      setCustomSettingKeys((prev) => prev.filter((k) => k.id !== id));
      if (customSettingKeys.find((k) => k.id === id)?.name === settingKey) {
        setSettingKey(PRESET_SETTING_KEYS[0]);
      }
    } catch {
      Alert.alert("삭제 실패", "잠시 후 다시 시도해주세요");
    }
  };

  const removeSetting = (idx: number) =>
    setSettings((prev) => prev.filter((_, i) => i !== idx));

  const handleAdd = () => {
    if (!activeSession) return Alert.alert("운동 세션을 먼저 시작해주세요");
    if (!selectedExercise) return Alert.alert("운동 종목을 선택해주세요");
    const validSets = sets.filter((s) => s.weight && s.reps);
    if (validSets.length === 0) return Alert.alert("최소 1세트를 입력해주세요");
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
        id: exId + "-" + i,
        weight: parseFloat(st.weight),
        reps: parseInt(st.reps),
        completed: false,
      };
      addSet(exId, workoutSet);
    });
    router.back();
  };

  return (
    <View style={s.container}>
      <Header title="운동 추가" showClose />

      {/* ── 스크롤 + 고정 푸터 ── */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}>
        <ScrollView
          ref={scrollRef}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={s.content}>
          {/* ── 종목 선택: 접힌 상태 ── */}
          {exerciseListCollapsed && selectedExercise ? (
            <>
              <View style={s.selectedExSummary}>
                {selectedExercise.gifUrl ? (
                  <Image
                    source={{ uri: selectedExercise.gifUrl }}
                    style={s.selectedGif}
                    resizeMode="cover"
                  />
                ) : null}
                <View style={s.selectedExInfo}>
                  <Text style={s.selectedExLabel}>선택된 종목</Text>
                  <Text style={s.selectedExName}>{selectedExercise.name}</Text>
                  {selectedExercise.caloriesPerMinute ? (
                    <Text style={s.calEstimate}>
                      🔥 약{" "}
                      {Math.round(selectedExercise.caloriesPerMinute * 30)} kcal
                      (30분 기준)
                    </Text>
                  ) : null}
                </View>
                <View style={s.selectedExRight}>
                  <Text style={s.selectedExCat}>
                    {selectedExercise.category}
                  </Text>
                  <TouchableOpacity
                    style={s.changeExBtn}
                    onPress={handleChangeExercise}>
                    <Text style={s.changeExText}>변경</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {MUSCLE_MAP[selectedExercise.name] && (
                <View style={s.muscleCard}>
                  <MuscleMap muscles={MUSCLE_MAP[selectedExercise.name]} />
                </View>
              )}
            </>
          ) : (
            <>
              <Text style={s.sectionLabel}>운동 종목 선택</Text>

              {/* ── 검색창 ── */}
              <View style={s.searchBar}>
                <Ionicons name="search" size={16} color={Colors.textMuted} />
                <TextInput
                  style={s.searchInput}
                  placeholder="한글 검색 또는 영어로 API 검색..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor={Colors.textMuted}
                  returnKeyType="search"
                  autoCorrect={false}
                />
                {searchQuery ? (
                  <TouchableOpacity onPress={() => setSearchQuery("")}>
                    <Ionicons
                      name="close-circle"
                      size={16}
                      color={Colors.textMuted}
                    />
                  </TouchableOpacity>
                ) : null}
              </View>

              {/* 카테고리 탭 (영어 검색 중엔 숨김) */}
              {!isEnglishSearch && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={s.catScroll}
                  keyboardShouldPersistTaps="handled">
                  {EXERCISE_CATEGORIES.map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        s.catChip,
                        selectedCategory === cat && s.catChipActive,
                      ]}
                      onPress={() =>
                        setSelectedCategory(selectedCategory === cat ? null : cat)
                      }>
                      <Text
                        style={[
                          s.catText,
                          selectedCategory === cat && s.catTextActive,
                        ]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              {/* API 검색 중 인라인 표시 */}
              {isSearching && (
                <View style={s.loadingRow}>
                  <ActivityIndicator size="small" color={Colors.primary} />
                  <Text style={s.loadingText}>검색 중...</Text>
                </View>
              )}

              <View style={s.exerciseList}>
                {/* 사용자가 직접 추가한 운동 */}
                {filteredCustom.map((ex) => (
                  <TouchableOpacity
                    key={"custom-" + ex.name}
                    style={s.exItem}
                    onPress={() => handleSelectExercise(ex)}
                    activeOpacity={0.7}>
                    <View style={s.exInfo}>
                      <Text style={s.exName}>{ex.name}</Text>
                      <Text style={s.exCalHint}>직접 추가</Text>
                    </View>
                    <Text style={s.exCat}>{ex.category}</Text>
                  </TouchableOpacity>
                ))}

                {/* Preset 목록: API 결과가 없을 때만 표시 (번역 대기 중 fallback 포함) */}
                {results.length === 0 && filteredPresets.map((ex) => (
                  <TouchableOpacity
                    key={"preset-" + ex.name}
                    style={s.exItem}
                    onPress={() => handleSelectExercise(ex)}
                    activeOpacity={0.7}>
                    <View style={s.exInfo}>
                      <Text style={s.exName}>{ex.name}</Text>
                    </View>
                    <Text style={s.exCat}>{ex.category}</Text>
                  </TouchableOpacity>
                ))}

                {/* API 결과: 영어 직접 검색 또는 한글 매핑 후 검색 */}
                {results.map((ex) => {
                  const displayName = ex.nameKo || ex.name;
                  const displayCat =
                    ex.bodyPartKo ||
                    BODYPART_TO_CATEGORY[ex.bodyPart] ||
                    ex.bodyPart;
                  return (
                    <TouchableOpacity
                      key={ex.id}
                      style={s.exItem}
                      onPress={() =>
                        handleSelectExercise({
                          name: displayName,
                          category: displayCat,
                          gifUrl: ex.gifUrl,
                          caloriesPerMinute: ex.caloriesPerMinute,
                        })
                      }
                      activeOpacity={0.7}>
                      {ex.gifUrl ? (
                        <Image
                          source={{ uri: ex.gifUrl }}
                          style={s.exGif}
                          resizeMode="cover"
                        />
                      ) : null}
                      <View style={s.exInfo}>
                        <Text style={s.exName}>{displayName}</Text>
                        <Text style={s.exCalHint}>
                          {displayCat}
                          {ex.equipmentKo ? ` · ${ex.equipmentKo}` : ""}
                          {ex.caloriesPerMinute
                            ? ` · 🔥 ${ex.caloriesPerMinute} kcal/분`
                            : ""}
                        </Text>
                      </View>
                      <Text style={s.exCat}>{displayCat}</Text>
                    </TouchableOpacity>
                  );
                })}

                {/* 검색 결과 없음 (로딩 완료 후 아무것도 없을 때) */}
                {!isSearching && results.length === 0 &&
                  filteredPresets.length === 0 && filteredCustom.length === 0 &&
                  searchQuery.trim() && (
                  <View style={s.emptySearch}>
                    <Text style={s.emptySearchText}>검색 결과가 없어요</Text>
                  </View>
                )}
              </View>

              {!showCustomForm ? (
                <TouchableOpacity
                  style={s.directAddBtn}
                  onPress={() => setShowCustomForm(true)}>
                  <Ionicons
                    name="add-circle-outline"
                    size={18}
                    color={Colors.primary}
                  />
                  <Text style={s.directAddText}>직접 추가</Text>
                </TouchableOpacity>
              ) : (
                <View style={s.customForm}>
                  <View style={s.customFormHeader}>
                    <Text style={s.customFormTitle}>직접 추가</Text>
                    <TouchableOpacity
                      onPress={() => {
                        setShowCustomForm(false);
                        setCustomName("");
                        setCustomCat("");
                      }}>
                      <Ionicons
                        name="close"
                        size={20}
                        color={Colors.textMuted}
                      />
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
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={s.catScroll}
                    keyboardShouldPersistTaps="handled">
                    {EXERCISE_CATEGORIES.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          s.catChip,
                          customCat === cat && s.catChipActive,
                        ]}
                        onPress={() => setCustomCat(cat)}>
                        <Text
                          style={[
                            s.catText,
                            customCat === cat && s.catTextActive,
                          ]}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <TouchableOpacity
                    style={s.customAddBtn}
                    onPress={handleAddCustomExercise}
                    activeOpacity={0.8}>
                    <Text style={s.customAddBtnText}>목록에 추가하기</Text>
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}

          {/* ── 세트 기록 ── */}
          {selectedExercise && (
            <View
              style={s.setSection}
              onLayout={(e) => {
                setsSectionY.current = e.nativeEvent.layout.y;
              }}>
              <Text style={s.setSectionTitle}>
                {selectedExercise.name} 세트 기록 🏋️
              </Text>
              <View style={s.setHeaderRow}>
                <Text style={[s.setHeader, { flex: 0.5 }]}>세트</Text>
                <Text style={[s.setHeader, { flex: 1 }]}>무게(kg)</Text>
                <Text style={[s.setHeader, { flex: 1 }]}>횟수</Text>
              </View>
              {sets.map((st, i) => (
                <View key={i} style={s.setRow}>
                  <Text style={[s.setNum, { flex: 0.5 }]}>{i + 1}</Text>
                  <TextInput
                    ref={(el) => {
                      setWeightRefs.current[i] = el;
                    }}
                    style={[s.setInput, { flex: 1 }]}
                    value={st.weight}
                    onChangeText={(v) =>
                      setSets((prev) =>
                        prev.map((s, idx) =>
                          idx === i ? { ...s, weight: v } : s
                        )
                      )
                    }
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                    returnKeyType="next"
                  />
                  <TextInput
                    style={[s.setInput, { flex: 1 }]}
                    value={st.reps}
                    onChangeText={(v) =>
                      setSets((prev) =>
                        prev.map((s, idx) =>
                          idx === i ? { ...s, reps: v } : s
                        )
                      )
                    }
                    keyboardType="numeric"
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                    returnKeyType={i === sets.length - 1 ? "done" : "next"}
                    onSubmitEditing={
                      i === sets.length - 1 ? Keyboard.dismiss : undefined
                    }
                  />
                </View>
              ))}
              <TouchableOpacity style={s.addSetBtn} onPress={handleAddSet}>
                <Text style={s.addSetText}>+ 세트 추가</Text>
              </TouchableOpacity>

              {/* ── 설정 ── */}
              <View style={s.divider} />
              <View style={s.settingsHeader}>
                <Text style={s.settingsTitle}>⚙️ 기구 설정</Text>
                <TouchableOpacity
                  style={s.addSettingBtn}
                  onPress={openSettingsSheet}>
                  <Ionicons name="add" size={16} color={Colors.primary} />
                  <Text style={s.addSettingText}>설정 추가</Text>
                </TouchableOpacity>
              </View>
              {settings.length > 0 ? (
                <View style={s.tagsWrap}>
                  {settings.map((st, i) => (
                    <TouchableOpacity
                      key={i}
                      style={s.tag}
                      onPress={() => removeSetting(i)}
                      activeOpacity={0.7}>
                      <Text style={s.tagText}>
                        {st.key}: {st.value}
                      </Text>
                      <Ionicons name="close" size={12} color={Colors.primary} />
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <Text style={s.settingsEmpty}>
                  시트높이, 각도 등 기구 설정을 기록하세요
                </Text>
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
        </ScrollView>

        {/* ── 고정 푸터 ── */}
        <View
          style={[s.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity
            style={s.addBtn}
            onPress={handleAdd}
            activeOpacity={0.8}>
            <Text style={s.addBtnText}>운동 추가</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ── 기구 설정 시트 ── */}
      <Modal
        visible={showSettingsSheet}
        transparent
        animationType="slide"
        onRequestClose={closeSettingsSheet}>
        <TouchableOpacity
          style={sh.overlay}
          activeOpacity={1}
          onPress={closeSettingsSheet}>
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ width: "100%" }}>
            <View style={sh.sheet}>
              <View style={sh.handle} />
              <Text style={sh.title}>기구 설정 추가</Text>

              <Text style={sh.label}>항목 선택</Text>
              <View style={sh.keyGrid}>
                {PRESET_SETTING_KEYS.map((k) => (
                  <TouchableOpacity
                    key={k}
                    style={[
                      sh.keyChip,
                      !isCustomKeyMode && settingKey === k && sh.keyChipActive,
                    ]}
                    onPress={() => {
                      setSettingKey(k);
                      setIsCustomKeyMode(false);
                      setCustomKeyName("");
                    }}>
                    <Text
                      style={[
                        sh.keyText,
                        !isCustomKeyMode &&
                          settingKey === k &&
                          sh.keyTextActive,
                      ]}>
                      {k}
                    </Text>
                  </TouchableOpacity>
                ))}
                {customSettingKeys.map((k) => (
                  <View key={k.id} style={sh.savedKeyWrap}>
                    <TouchableOpacity
                      style={[
                        sh.keyChip,
                        sh.keyChipSaved,
                        !isCustomKeyMode &&
                          settingKey === k.name &&
                          sh.keyChipActive,
                      ]}
                      onPress={() => {
                        setSettingKey(k.name);
                        setIsCustomKeyMode(false);
                        setCustomKeyName("");
                      }}>
                      <Text
                        style={[
                          sh.keyText,
                          !isCustomKeyMode &&
                            settingKey === k.name &&
                            sh.keyTextActive,
                        ]}>
                        {k.name}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={sh.savedKeyDelete}
                      onPress={() => deleteCustomKey(k.id)}
                      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
                      <Ionicons
                        name="close-circle"
                        size={15}
                        color={Colors.textMuted}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>

              <View style={sh.directDivider}>
                <View style={sh.directLine} />
              </View>
              <TouchableOpacity
                style={[
                  sh.directKeyBtn,
                  isCustomKeyMode && sh.directKeyBtnActive,
                ]}
                onPress={() => {
                  setIsCustomKeyMode(true);
                  setSettingKey("");
                  setTimeout(() => customKeyInputRef.current?.focus(), 100);
                }}>
                <Ionicons
                  name="add-circle-outline"
                  size={15}
                  color={
                    isCustomKeyMode ? Colors.primary : Colors.textSecondary
                  }
                />
                <Text
                  style={[
                    sh.directKeyText,
                    isCustomKeyMode && sh.directKeyTextActive,
                  ]}>
                  직접 입력
                </Text>
              </TouchableOpacity>

              {isCustomKeyMode && (
                <TextInput
                  ref={customKeyInputRef}
                  style={sh.customKeyInput}
                  placeholder="항목명 입력 (예: 케이블각도, 풀리높이)"
                  value={customKeyName}
                  onChangeText={setCustomKeyName}
                  placeholderTextColor={Colors.textMuted}
                  returnKeyType="next"
                />
              )}

              <Text style={[sh.label, { marginTop: 16 }]}>값 입력</Text>
              <TextInput
                style={sh.valueInput}
                placeholder="예: 3단계, 45도, 오버핸드"
                value={settingValue}
                onChangeText={setSettingValue}
                placeholderTextColor={Colors.textMuted}
                returnKeyType="done"
                onSubmitEditing={handleAddSetting}
              />

              <TouchableOpacity
                style={sh.addBtn}
                onPress={handleAddSetting}
                activeOpacity={0.8}>
                <Text style={sh.addBtnText}>추가하기</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },

  content: { padding: 20, paddingBottom: 16 },

  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.surfaceAlt,
    backgroundColor: Colors.background,
  },
  addBtn: {
    backgroundColor: Colors.workout,
    borderRadius: 24,
    paddingVertical: 16,
    alignItems: "center",
  },
  addBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },

  // 선택된 종목 요약
  selectedExSummary: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    gap: 12,
    ...CARD_SHADOW,
  },
  selectedGif: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
  },
  selectedExInfo: { flex: 1 },
  selectedExLabel: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "600",
    marginBottom: 3,
  },
  selectedExName: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 4,
  },
  calEstimate: {
    fontSize: 12,
    color: Colors.workout,
    fontWeight: "600",
  },
  selectedExRight: { alignItems: "flex-end", gap: 6 },
  selectedExCat: {
    fontSize: 11,
    color: Colors.workout,
    backgroundColor: Colors.workout + "28",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
  },
  changeExBtn: {
    backgroundColor: Colors.primary + "18",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  changeExText: { fontSize: 13, color: Colors.primary, fontWeight: "700" },

  // 검색창
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
    gap: 8,
    ...CARD_SHADOW,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.textPrimary,
    padding: 0,
  },

  // 종목 목록
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  catScroll: { marginBottom: 12 },
  catChip: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    ...CARD_SHADOW,
  },
  catChipActive: { backgroundColor: Colors.workout + "28" },
  catText: { fontSize: 13, color: Colors.textSecondary, fontWeight: "600" },
  catTextActive: { color: Colors.workout, fontWeight: "700" },
  exerciseList: { marginBottom: 8 },
  exItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 12,
    marginBottom: 8,
    gap: 10,
    ...CARD_SHADOW,
  },
  exGif: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
  },
  exInfo: { flex: 1 },
  exName: { fontSize: 15, fontWeight: "600", color: Colors.textPrimary },
  exCalHint: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  exCat: {
    fontSize: 12,
    color: Colors.workout,
    backgroundColor: Colors.workout + "28",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },

  // 직접 추가
  directAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  directAddText: { fontSize: 14, fontWeight: "600", color: Colors.primary },
  customForm: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    ...CARD_SHADOW,
  },
  customFormHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  customFormTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  customNameInput: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 12,
  },
  customAddBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 12,
    alignItems: "center",
    marginTop: 4,
  },
  customAddBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },

  // 세트 섹션
  setSection: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    ...CARD_SHADOW,
  },
  setSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginBottom: 14,
  },
  setHeaderRow: { flexDirection: "row", marginBottom: 8 },
  setHeader: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "600",
    textAlign: "center",
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  setNum: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    fontWeight: "700",
  },
  setInput: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    padding: 10,
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: "600",
    textAlign: "center",
  },
  addSetBtn: {
    alignItems: "center",
    padding: 10,
    borderRadius: 20,
    backgroundColor: Colors.workout + "18",
    marginTop: 4,
  },
  addSetText: { fontSize: 13, color: Colors.workout, fontWeight: "700" },

  // 설정
  divider: {
    height: 1,
    backgroundColor: Colors.surfaceAlt,
    marginVertical: 14,
  },
  settingsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  settingsTitle: { fontSize: 14, fontWeight: "700", color: Colors.textPrimary },
  addSettingBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: Colors.primary + "18",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  addSettingText: { fontSize: 13, color: Colors.primary, fontWeight: "700" },
  tagsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: Colors.primary + "18",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  tagText: { fontSize: 12, color: Colors.primary, fontWeight: "600" },
  settingsEmpty: { fontSize: 12, color: Colors.textMuted, fontStyle: "italic" },
  tipInput: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    padding: 12,
    color: Colors.textPrimary,
    fontSize: 14,
    minHeight: 80,
    lineHeight: 20,
    marginTop: 10,
  },

  muscleCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 14,
    marginBottom: 14,
    ...CARD_SHADOW,
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  loadingText: { fontSize: 13, color: Colors.textMuted },
  emptySearch: { alignItems: "center", paddingVertical: 24 },
  emptySearchText: { fontSize: 14, color: Colors.textMuted },
});

const sh = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(61, 50, 86, 0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.textMuted,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: Colors.textPrimary,
    marginBottom: 20,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  keyGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  keyChip: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  keyChipSaved: { borderWidth: 1, borderColor: Colors.primary + "50" },
  keyChipActive: { backgroundColor: Colors.primary + "28" },
  keyText: { fontSize: 13, color: Colors.textSecondary, fontWeight: "600" },
  keyTextActive: { color: Colors.primary, fontWeight: "700" },
  savedKeyWrap: { flexDirection: "row", alignItems: "center", gap: 2 },
  savedKeyDelete: { marginLeft: -6, marginTop: -8 },
  directDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
  },
  directLine: { flex: 1, height: 1, backgroundColor: Colors.surfaceAlt },
  directKeyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  directKeyBtnActive: { backgroundColor: Colors.primary + "18" },
  directKeyText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: "600",
  },
  directKeyTextActive: { color: Colors.primary, fontWeight: "700" },
  customKeyInput: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 14,
    padding: 13,
    fontSize: 15,
    color: Colors.textPrimary,
    marginTop: 10,
    borderWidth: 1.5,
    borderColor: Colors.primary + "60",
  },
  valueInput: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 14,
    padding: 14,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 24,
    padding: 15,
    alignItems: "center",
  },
  addBtnText: { fontSize: 15, fontWeight: "700", color: "#fff" },
});
