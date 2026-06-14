import React, { useState, useEffect, useRef } from "react";
import { showCuteAlert } from "../../components/CuteAlert";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Modal,
} from "react-native";
import { useKeyboardHeight } from "../../hooks/useKeyboardHeight";
import { useWorkoutStore } from "../../store/workoutStore";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Header, SortableList } from "../../components/ui";
import { Icon } from "../../components/AppIcons";
import {
  useRoutineStore,
  Routine,
  RoutineExercise,
} from "../../store/routineStore";
import ExerciseAdder, {
  ExerciseAddResult,
} from "../../components/workout/ExerciseAdder";
import { useColors } from "../../constants/colors";
import { BackgroundBlobs } from "../../components/BackgroundBlobs";

const fmtRest = (sec: number): string => {
  if (sec < 60) return `${sec}초`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return s === 0 ? `${m}분` : `${m}분 ${s}초`;
};

const fmtMeta = (targetReps?: string, restSeconds?: number): string | null => {
  const parts: string[] = [];
  if (targetReps?.trim()) parts.push(targetReps.trim());
  if (restSeconds && restSeconds > 0) parts.push(fmtRest(restSeconds));
  return parts.length > 0 ? parts.join(" · ") : null;
};

type ExerciseDraft = RoutineExercise & { key: string };
type CombineExercise = ExerciseDraft & {
  fromRoutineName: string;
  isDuplicate: boolean;
};
type Mode = "list" | "create" | "edit" | "combine-select" | "combine-edit";
type SubMode = "main" | "addExercise" | "editExercise";

// 루틴 목록 아이템 높이 (드래그 계산용)
const ROUTINE_ITEM_H = 102; // 카드 높이 ~92 + marginBottom 10
const EXERCISE_ITEM_H = 80; // 카드 높이 ~72 + marginBottom 8

export default function RoutineManageModal() {
  const c = useColors();
  const keyboardHeight = useKeyboardHeight();
  const SHADOW = {
    shadowColor: c.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.13,
    shadowRadius: 14,
    elevation: 3,
  };
  const params = useLocalSearchParams<{ editId?: string }>();
  const {
    routines,
    loadRoutines,
    addRoutine,
    updateRoutine,
    deleteRoutine,
    combineRoutines,
    reorderRoutines,
  } = useRoutineStore();

  const [mode, setMode] = useState<Mode>("list");
  const [subMode, setSubMode] = useState<SubMode>("main");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [routineName, setRoutineName] = useState("");
  const [exercises, setExercises] = useState<ExerciseDraft[]>([]);
  const [nameError, setNameError] = useState("");
  const [exercisesError, setExercisesError] = useState("");
  const [editingExerciseIdx, setEditingExerciseIdx] = useState<number | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [combineExercises, setCombineExercises] = useState<CombineExercise[]>(
    []
  );
  const [combineName, setCombineName] = useState("");

  const router = useRouter();
  const { sessions, startSessionWithRoutine, activeSession } = useWorkoutStore();
  const [showHistorySheet, setShowHistorySheet] = useState(false);

  const loadFromSession = (session: (typeof sessions)[0]) => {
    const drafts: ExerciseDraft[] = session.exercises.map((ex, i) => ({
      name: ex.name,
      category: ex.category,
      defaultSets: ex.sets.length || 3,
      defaultWeight: ex.sets[0]?.weight,
      defaultUnit: (ex.sets[0]?.unit as 'kg' | 'lbs' | undefined) ?? 'kg',
      defaultReps: ex.sets[0]?.reps,
      restSeconds: ex.restSeconds,
      targetReps: ex.targetReps,
      settings: ex.settings,
      tip: ex.tip,
      targetMuscles: ex.targetMuscles,
      isSingleArm: ex.isSingleArm,
      key: `${ex.name}-hist-${i}-${Date.now()}`,
    }));
    setExercises(prev => {
      const existingNames = new Set(prev.map(e => e.name));
      return [...prev, ...drafts.filter(d => !existingNames.has(d.name))];
    });
    setShowHistorySheet(false);
  };

  const nameRef = useRef<TextInput>(null);
  const listScrollRef = useRef<ScrollView>(null);
  const editScrollRef = useRef<ScrollView>(null);
  const combineScrollRef = useRef<ScrollView>(null);
  // SortableList 자동 스크롤용 — 각 ScrollView의 현재 offset(y) 추적
  const listScrollOffset = useRef(0);
  const editScrollOffset = useRef(0);
  const combineScrollOffset = useRef(0);

  useEffect(() => {
    loadRoutines().then(() => {
      if (params.editId) {
        const r = useRoutineStore
          .getState()
          .routines.find((x) => x.id === params.editId);
        if (r) openEdit(r);
      }
    });
  }, []);

  useEffect(() => {
    if (mode === "create") {
      setRoutineName("");
      setExercises([]);
      setTimeout(() => nameRef.current?.focus(), 300);
    }
  }, [mode]);

  const toKey = (ex: RoutineExercise, i: number): ExerciseDraft => ({
    ...ex,
    key: `${ex.name}-${i}-${Date.now()}`,
  });

  const openEdit = (r: Routine) => {
    setEditingId(r.id);
    setRoutineName(r.name);
    setExercises(r.exercises.map((e, i) => toKey(e, i)));
    setMode("edit");
  };

  const handleExerciseAdd = (data: ExerciseAddResult) => {
    setExercisesError('');
    setExercises((prev) => [
      ...prev,
      {
        name: data.name,
        category: data.category,
        defaultSets: data.defaultSets ?? 3,
        defaultWeight: data.routineSets ? undefined : data.defaultWeight,
        defaultUnit: data.routineSets ? undefined : data.defaultUnit,
        defaultReps: data.routineSets ? undefined : data.defaultReps,
        sets: data.routineSets,
        restSeconds: data.restSeconds,
        targetReps: data.targetReps,
        settings: data.settings,
        tip: data.tip,
        targetMuscles: data.targetMuscles,
        gifUrl: data.gifUrl,
        isSingleArm: data.isSingleArm,
        key: `${data.name}-${Date.now()}`,
      },
    ]);
    setSubMode("main");
  };

  const handleExerciseEdit = (data: ExerciseAddResult) => {
    if (editingExerciseIdx === null) return;
    setExercisesError('');
    setExercises((prev) =>
      prev.map((ex, i) =>
        i !== editingExerciseIdx ? ex : {
          ...ex,
          name: data.name,
          category: data.category,
          defaultSets: data.defaultSets ?? ex.defaultSets,
          defaultWeight: data.routineSets ? undefined : data.defaultWeight,
          defaultUnit: data.routineSets ? undefined : data.defaultUnit,
          defaultReps: data.routineSets ? undefined : data.defaultReps,
          sets: data.routineSets,
          restSeconds: data.restSeconds,
          targetReps: data.targetReps,
          settings: data.settings,
          tip: data.tip,
          targetMuscles: data.targetMuscles,
          gifUrl: data.gifUrl,
          isSingleArm: data.isSingleArm,
        }
      )
    );
    setSubMode("main");
    setEditingExerciseIdx(null);
  };

  const handleSave = async () => {
    let hasError = false;
    if (!routineName.trim()) { setNameError('루틴 이름을 입력해주세요'); hasError = true; }
    else setNameError('');
    if (exercises.length === 0) { setExercisesError('종목을 1개 이상 추가해주세요'); hasError = true; }
    else setExercisesError('');
    if (hasError) return;
    const payload = exercises.map(({ gifUrl, key, ...rest }) => rest);
    try {
      if (mode === "create")
        await addRoutine({ name: routineName.trim(), exercises: payload });
      else if (editingId)
        await updateRoutine(editingId, {
          name: routineName.trim(),
          exercises: payload,
        });
      setMode("list");
    } catch (e) {
      showCuteAlert({ icon: 'alert', tone: 'danger', title: '저장 실패', message: '잠시 후 다시 시도해주세요', buttons: [{ label: '확인', style: 'primary' }] });
    }
  };


  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const enterCombineEdit = () => {
    const selected = routines.filter((r) => selectedIds.has(r.id));
    const seen = new Set<string>();
    const merged: CombineExercise[] = [];
    selected.forEach((r) => {
      r.exercises.forEach((ex, i) => {
        merged.push({
          ...ex,
          key: `${r.id}-${i}-${Date.now()}`,
          fromRoutineName: r.name,
          isDuplicate: seen.has(ex.name),
        });
        seen.add(ex.name);
      });
    });
    setCombineExercises(merged);
    setCombineName(selected.map((r) => r.name).join(" + "));
    setMode("combine-edit");
  };

  const handleCombineSave = async () => {
    if (!combineName.trim()) { showCuteAlert({ icon: 'pencil', tone: 'info', title: '루틴 이름을 입력해주세요', buttons: [{ label: '확인', style: 'primary' }] }); return; }
    if (combineExercises.length === 0) { showCuteAlert({ icon: 'pencil', tone: 'info', title: '최소 1개 종목이 필요해요', buttons: [{ label: '확인', style: 'primary' }] }); return; }
    const payload = combineExercises.map(
      ({ gifUrl, key, fromRoutineName, isDuplicate, ...rest }) => rest
    );
    await combineRoutines(Array.from(selectedIds), combineName.trim(), payload);
    setSelectedIds(new Set());
    setMode("list");
  };

  // ── 서브모드 ──
  if (subMode === "addExercise") {
    return (
      <ExerciseAdder
        mode="routine"
        onAdd={handleExerciseAdd}
        onClose={() => setSubMode("main")}
      />
    );
  }

  if (subMode === "editExercise" && editingExerciseIdx !== null) {
    const ex = exercises[editingExerciseIdx];
    return (
      <ExerciseAdder
        mode="routine"
        editMode
        initialExercise={{
          name: ex.name,
          category: ex.category,
          settings: ex.settings,
          tip: ex.tip,
          restSeconds: ex.restSeconds,
          targetReps: ex.targetReps,
          targetMuscles: ex.targetMuscles,
          isSingleArm: ex.isSingleArm,
          defaultSets: ex.defaultSets,
          defaultWeight: ex.defaultWeight,
          defaultUnit: ex.defaultUnit ?? 'kg',
          defaultReps: ex.defaultReps,
          routineSets: ex.sets,
        }}
        onAdd={handleExerciseEdit}
        onClose={() => { setSubMode("main"); setEditingExerciseIdx(null); }}
      />
    );
  }

  // ── 루틴 목록 ──
  if (mode === "list") {
    return (
      <View style={{ flex: 1 }}>
        <SafeAreaView
          style={{ flex: 1, backgroundColor: c.background }}
          edges={["bottom"]}>
          <BackgroundBlobs />
          <Header title="루틴 관리" showClose />
          <ScrollView
            ref={listScrollRef}
            onScroll={(e) => { listScrollOffset.current = e.nativeEvent.contentOffset.y; }}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
            <TouchableOpacity
              style={[
                {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  backgroundColor: c.surface,
                  borderRadius: 20,
                  padding: 16,
                  marginBottom: 10,
                  justifyContent: "center",
                },
                SHADOW,
              ]}
              onPress={() => setMode("create")}
              activeOpacity={0.8}>
              <Icon name="plus" size={20} color={c.primary} />
              <Text
                style={{ fontSize: 15, fontWeight: "800", color: c.primary }}>
                새 루틴 만들기
              </Text>
            </TouchableOpacity>

            {routines.length >= 2 && (
              <TouchableOpacity
                style={[
                  {
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                    backgroundColor: c.surface,
                    borderRadius: 20,
                    padding: 14,
                    marginBottom: 16,
                    justifyContent: "center",
                  },
                  SHADOW,
                ]}
                onPress={() => {
                  setSelectedIds(new Set());
                  setMode("combine-select");
                }}
                activeOpacity={0.8}>
                <Icon name="merge" size={16} color="#A78BFA" />
                <Text
                  style={{ fontSize: 13, fontWeight: "800", color: "#A78BFA" }}>
                  루틴 결합하기
                </Text>
              </TouchableOpacity>
            )}

            {routines.length === 0 ? (
              <View style={{ alignItems: "center", paddingTop: 48, gap: 8 }}>
                <Icon name="dumbbell" size={56} color={c.textMuted} />
                <Text
                  style={{ fontSize: 16, fontWeight: "700", color: c.textPrimary }}>
                  루틴이 없어요
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: c.textSecondary,
                    textAlign: "center",
                  }}>
                  위 버튼을 눌러 첫 루틴을 만들어보세요
                </Text>
              </View>
            ) : (
              <>
                {routines.length >= 2 && (
                  <Text
                    style={{
                      fontSize: 11,
                      color: c.textMuted,
                      fontWeight: "600",
                      marginBottom: 8,
                      textAlign: "center",
                    }}>
                    ≡ 카드를 꾹 눌러 순서를 변경하세요
                  </Text>
                )}
                <SortableList
                  data={routines}
                  keyExtractor={(r) => r.id}
                  itemHeight={ROUTINE_ITEM_H}
                  scrollRef={listScrollRef}
                  scrollOffsetRef={listScrollOffset}
                  onDragStart={() => listScrollRef.current?.setNativeProps?.({ scrollEnabled: false })}
                  onDragRelease={() => listScrollRef.current?.setNativeProps?.({ scrollEnabled: true })}
                  onDragEnd={(ordered) =>
                    reorderRoutines(ordered.map((r) => r.id))
                  }
                  renderItem={(r) => (
                    <View
                      style={[
                        {
                          backgroundColor: c.surface,
                          borderRadius: 20,
                          marginBottom: 10,
                          flex: 1,
                          flexDirection: "row",
                          overflow: "hidden",
                        },
                        SHADOW,
                      ]}>
                      {/* 메인 콘텐츠 */}
                      <View style={{ flex: 1, padding: 16 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          justifyContent: "space-between",
                          alignItems: "flex-start",
                          marginBottom: 6,
                        }}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text
                            style={{
                              fontSize: 16,
                              fontWeight: "800",
                              color: c.textPrimary,
                            }}
                            numberOfLines={1}>
                            {r.name}
                          </Text>
                          <Text
                            style={{
                              fontSize: 12,
                              color: c.textSecondary,
                              marginTop: 3,
                              fontWeight: "600",
                            }}>
                            {r.exercises.length}종목 · 예상{" "}
                            {r.exercises.reduce(
                              (s, e) => s + e.defaultSets,
                              0
                            ) * 3}
                            분
                          </Text>
                        </View>
                        <View
                          style={{
                            flexDirection: "row",
                            gap: 10,
                            alignItems: "center",
                          }}>
                          <TouchableOpacity onPress={() => openEdit(r)}>
                            <Icon name="pencil" size={18} color={c.textSecondary} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => setDeleteTarget(r.id)}>
                            <Icon name="trash" size={18} color={c.textMuted} />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          flexWrap: "wrap",
                          gap: 5,
                        }}>
                        {r.exercises.slice(0, 4).map((ex, i) => (
                          <View
                            key={i}
                            style={{
                              backgroundColor: c.surfaceAlt,
                              borderRadius: 999,
                              paddingHorizontal: 9,
                              paddingVertical: 3,
                            }}>
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: "700",
                                color: c.success,
                              }}>
                              {ex.name} {ex.defaultSets}s
                            </Text>
                          </View>
                        ))}
                        {r.exercises.length > 4 && (
                          <View
                            style={{
                              backgroundColor: c.surfaceHigh,
                              borderRadius: 999,
                              paddingHorizontal: 9,
                              paddingVertical: 3,
                            }}>
                            <Text
                              style={{
                                fontSize: 10,
                                fontWeight: "700",
                                color: c.textMuted,
                              }}>
                              +{r.exercises.length - 4}
                            </Text>
                          </View>
                        )}
                      </View>
                      {/* 시작 버튼 */}
                      <TouchableOpacity
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: 6,
                          marginTop: 10,
                        }}
                        onPress={() => {
                          if (activeSession) {
                            showCuteAlert({ icon: 'alert', tone: 'warn', title: '운동 중', message: '진행 중인 운동이 있어요.\n종료 후 시작해주세요.', buttons: [{ label: '확인', style: 'primary' }] });
                            return;
                          }
                          startSessionWithRoutine(r);
                          router.dismiss();
                          setTimeout(() => router.push('/(tabs)/workout' as any), 50);
                        }}
                        activeOpacity={0.8}>
                        <Text style={{ fontSize: 13, fontWeight: "800", color: c.warning }}>
                          시작
                        </Text>
                        <View style={{ backgroundColor: c.warning, borderRadius: 999, width: 28, height: 28, alignItems: "center", justifyContent: "center" }}>
                          <Icon name="play" size={14} color={c.onAccent} />
                        </View>
                      </TouchableOpacity>
                      </View>
                      {/* 드래그 핸들 — 우측 중앙 스트립 */}
                      <View style={{ width: 44, alignItems: "center", justifyContent: "center", borderLeftWidth: 1, borderLeftColor: c.border }}>
                        <Icon name="menu" size={22} color={c.textMuted} />
                      </View>
                    </View>
                  )}
                />
              </>
            )}
          </ScrollView>
        </SafeAreaView>
        {/* 삭제 확인 오버레이 — Modal 위에 z-index로 렌더링 */}
        {deleteTarget !== null && (() => {
          const targetName = routines.find((r) => r.id === deleteTarget)?.name ?? '';
          return (
            <View style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 999,
              alignItems: 'center', justifyContent: 'center',
            }}>
              <View style={{
                backgroundColor: c.surface, borderRadius: 16, padding: 24,
                marginHorizontal: 32, width: '80%',
              }}>
                <Text style={{ fontSize: 17, fontWeight: '700', color: c.textPrimary, marginBottom: 8 }}>루틴 삭제</Text>
                <Text style={{ fontSize: 14, color: c.textSecondary, marginBottom: 24 }}>
                  {`"${targetName}" 루틴을 삭제할까요?`}
                </Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <TouchableOpacity
                    onPress={() => setDeleteTarget(null)}
                    style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: c.surfaceAlt, alignItems: 'center' }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: c.textSecondary }}>취소</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => { deleteRoutine(deleteTarget); setDeleteTarget(null); }}
                    style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: c.danger, alignItems: 'center' }}>
                    <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>삭제</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          );
        })()}
      </View>
    );
  }

  // ── 루틴 결합 선택 ──
  if (mode === "combine-select") {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: c.background }}
        edges={["bottom"]}>
        <Header title="루틴 결합" showClose onClose={() => setMode("list")} />
        <Text
          style={{
            fontSize: 13,
            color: c.textSecondary,
            fontWeight: "600",
            textAlign: "center",
            paddingVertical: 8,
          }}>
          결합할 루틴을 2개 이상 선택하세요
        </Text>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          {routines.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={[
                {
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 12,
                  backgroundColor: selectedIds.has(r.id) ? c.border : c.surface,
                  borderRadius: 20,
                  padding: 16,
                  marginBottom: 10,
                  borderWidth: selectedIds.has(r.id) ? 2 : 0,
                  borderColor: c.primary,
                },
                SHADOW,
              ]}
              onPress={() => toggleSelect(r.id)}
              activeOpacity={0.8}>
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: selectedIds.has(r.id)
                    ? c.primary
                    : c.surfaceAlt,
                  alignItems: "center",
                  justifyContent: "center",
                }}>
                {selectedIds.has(r.id) && (
                  <Icon name="check" size={14} color={c.surface} />
                )}
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{ fontSize: 15, fontWeight: "800", color: c.textPrimary }}>
                  {r.name}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: c.textSecondary,
                    fontWeight: "600",
                    marginTop: 2,
                  }}>
                  {r.exercises.length}종목
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {selectedIds.size >= 2 && (
          <View
            style={{ position: "absolute", bottom: 32, left: 20, right: 20 }}>
            <TouchableOpacity
              style={{
                backgroundColor: "#A78BFA",
                borderRadius: 999,
                paddingVertical: 16,
                alignItems: "center",
              }}
              onPress={enterCombineEdit}
              activeOpacity={0.8}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: c.onAccent }}>
                {selectedIds.size}개 루틴 결합하기 →
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ── 루틴 결합 편집 ──
  if (mode === "combine-edit") {
    return (
      <View style={{ flex: 1 }}>
        <SafeAreaView
          style={{ flex: 1, backgroundColor: c.background }}
          edges={["bottom"]}>
          <Header
            title="루틴 결합 편집"
            showClose
            onClose={() => setMode("combine-select")}
          />
          <ScrollView
            ref={combineScrollRef}
            onScroll={(e) => { combineScrollOffset.current = e.nativeEvent.contentOffset.y; }}
            scrollEventThrottle={16}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
            contentContainerStyle={{ padding: 20, paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 20 }}
            style={{ flex: 1 }}>
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: c.textSecondary,
                  marginBottom: 8,
                }}>
                새 루틴 이름
              </Text>
              <TextInput
                style={[
                  {
                    backgroundColor: c.surface,
                    borderRadius: 14,
                    padding: 14,
                    fontSize: 16,
                    fontWeight: "700",
                    color: c.textPrimary,
                    marginBottom: 20,
                  },
                  SHADOW,
                ]}
                value={combineName}
                onChangeText={setCombineName}
                placeholder="결합된 루틴 이름"
                placeholderTextColor={c.textMuted}
                returnKeyType="done"
              />
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "700",
                  color: c.textSecondary,
                  marginBottom: 6,
                }}>
                종목 목록 ({combineExercises.length}개) — 꾹 눌러 순서 변경
              </Text>
              <SortableList
                data={combineExercises}
                keyExtractor={(ex) => ex.key}
                itemHeight={EXERCISE_ITEM_H}
                scrollRef={combineScrollRef}
                scrollOffsetRef={combineScrollOffset}
                onDragStart={() => combineScrollRef.current?.setNativeProps?.({ scrollEnabled: false })}
                onDragRelease={() => combineScrollRef.current?.setNativeProps?.({ scrollEnabled: true })}
                onDragEnd={setCombineExercises}
                renderItem={(ex) => (
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: ex.isDuplicate ? "#FFF3CD" : c.surfaceAlt,
                      borderRadius: 16,
                      padding: 12,
                      marginBottom: 8,
                      gap: 10,
                      flex: 1,
                    }}>
                    <Icon name="menu" size={16} color={c.textMuted} />
                    {ex.gifUrl && (
                      <Image
                        source={{ uri: ex.gifUrl }}
                        style={{ width: 36, height: 36, borderRadius: 8 }}
                        resizeMode="cover"
                      />
                    )}
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 5,
                          flexWrap: "wrap",
                        }}>
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "700",
                            color: c.textPrimary,
                            flexShrink: 1,
                          }}>
                          {ex.name}
                        </Text>
                        {ex.isDuplicate && (
                          <View
                            style={{
                              backgroundColor: "#FFC107",
                              borderRadius: 999,
                              paddingHorizontal: 5,
                              paddingVertical: 1,
                            }}>
                            <Text
                              style={{
                                fontSize: 9,
                                fontWeight: "800",
                                color: c.onAccent,
                              }}>
                              중복
                            </Text>
                          </View>
                        )}
                        {fmtMeta(ex.targetReps, ex.restSeconds) !== null && (
                          <Text
                            style={{
                              fontSize: 11,
                              color: c.textSecondary,
                              fontWeight: "600",
                            }}>
                            {fmtMeta(ex.targetReps, ex.restSeconds)}
                          </Text>
                        )}
                      </View>
                      <Text
                        style={{
                          fontSize: 10,
                          color: c.textSecondary,
                          fontWeight: "600",
                          marginTop: 1,
                        }}>
                        {ex.fromRoutineName} · {ex.defaultSets}세트
                      </Text>
                      {(ex.targetMuscles?.length ?? 0) > 0 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                          {ex.targetMuscles!.map((m, mi) => (
                            <View key={mi} style={{ backgroundColor: c.primary + '18', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: c.primary }}>{m}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() =>
                        setCombineExercises((prev) =>
                          prev.filter((e) => e.key !== ex.key)
                        )
                      }
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Icon name="close" size={15} color={c.textMuted} />
                    </TouchableOpacity>
                  </View>
                )}
              />
              <TouchableOpacity
                style={{
                  backgroundColor: "#A78BFA",
                  borderRadius: 999,
                  paddingVertical: 16,
                  alignItems: "center",
                  marginTop: 8,
                }}
                onPress={handleCombineSave}
                activeOpacity={0.8}>
                <Text
                  style={{ fontSize: 16, fontWeight: "800", color: c.onAccent }}>
                  결합 루틴 저장
                </Text>
              </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </View>
    );
  }

  // ── 루틴 생성/수정 ──
  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: c.background }}
        edges={["bottom"]}>
        <BackgroundBlobs />
        <Header
          title={mode === "create" ? "새 루틴" : "루틴 수정"}
          showClose
          onClose={() => setMode("list")}
        />
        <ScrollView
          ref={editScrollRef}
          onScroll={(e) => { editScrollOffset.current = e.nativeEvent.contentOffset.y; }}
          scrollEventThrottle={16}
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="on-drag"
          contentContainerStyle={{ padding: 20, paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 20 }}
          style={{ flex: 1 }}>
            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: c.textSecondary,
                marginBottom: 8,
              }}>
              루틴 이름{" "}<Text style={{ color: c.danger }}>*</Text>
            </Text>
            <TextInput
              ref={nameRef}
              style={[
                {
                  backgroundColor: c.surface,
                  borderRadius: 14,
                  padding: 14,
                  fontSize: 16,
                  fontWeight: "700",
                  color: c.textPrimary,
                  marginBottom: nameError ? 6 : 20,
                  borderWidth: nameError ? 1.5 : 0,
                  borderColor: nameError ? c.danger : undefined,
                },
                SHADOW,
              ]}
              value={routineName}
              onChangeText={(v) => { setRoutineName(v); if (v.trim()) setNameError(''); }}
              placeholder="예: 상체 루틴, 하체 데이"
              placeholderTextColor={c.textMuted}
              returnKeyType="next"
            />
            {!!nameError && (
              <Text style={{ fontSize: 11, color: c.danger, marginBottom: 14, marginTop: 2 }}>{nameError}</Text>
            )}

            <Text
              style={{
                fontSize: 13,
                fontWeight: "700",
                color: c.textSecondary,
                marginBottom: 8,
              }}>
              종목 목록{" "}<Text style={{ color: c.danger }}>*</Text>
            </Text>
            {!!exercisesError && (
              <Text style={{ fontSize: 11, color: c.danger, marginBottom: 8, marginTop: -4 }}>{exercisesError}</Text>
            )}

            {exercises.length === 0 ? (
              <View
                style={{ alignItems: "center", paddingVertical: 20, gap: 4, borderWidth: exercisesError ? 1.5 : 0, borderColor: exercisesError ? c.danger : undefined, borderRadius: 14 }}>
                <Text
                  style={{ fontSize: 13, color: exercisesError ? c.danger : c.textMuted, fontWeight: "600" }}>
                  아직 종목이 없어요
                </Text>
              </View>
            ) : (
              <SortableList
                data={exercises}
                keyExtractor={(ex) => ex.key}
                itemHeight={EXERCISE_ITEM_H}
                scrollRef={editScrollRef}
                scrollOffsetRef={editScrollOffset}
                onDragStart={() => editScrollRef.current?.setNativeProps?.({ scrollEnabled: false })}
                onDragRelease={() => editScrollRef.current?.setNativeProps?.({ scrollEnabled: true })}
                onDragEnd={setExercises}
                renderItem={(ex, idx) => (
                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => { setEditingExerciseIdx(idx); setSubMode("editExercise"); }}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: c.surfaceAlt,
                      borderRadius: 16,
                      padding: 12,
                      marginBottom: 8,
                      flex: 1,
                      gap: 8,
                    }}>
                    {ex.gifUrl && (
                      <Image
                        source={{ uri: ex.gifUrl }}
                        style={{
                          width: 38,
                          height: 38,
                          borderRadius: 10,
                          backgroundColor: c.border,
                        }}
                        resizeMode="cover"
                      />
                    )}
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 6,
                        }}>
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: "700",
                            color: c.textPrimary,
                            flexShrink: 1,
                          }}
                          numberOfLines={1}>
                          {ex.name}
                        </Text>
                        {fmtMeta(ex.targetReps, ex.restSeconds) !== null && (
                          <Text
                            style={{
                              fontSize: 11,
                              color: c.textSecondary,
                              fontWeight: "600",
                              flexShrink: 0,
                            }}>
                            {fmtMeta(ex.targetReps, ex.restSeconds)}
                          </Text>
                        )}
                      </View>
                      <Text
                        style={{
                          fontSize: 11,
                          color: c.textSecondary,
                          fontWeight: "600",
                          marginTop: 1,
                        }}>
                        {ex.defaultSets}세트
                        {ex.defaultWeight ? ` · ${ex.defaultWeight}${ex.defaultUnit ?? 'kg'}` : ""}
                      </Text>
                      {(ex.targetMuscles?.length ?? 0) > 0 && (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                          {ex.targetMuscles!.map((m, mi) => (
                            <View key={mi} style={{ backgroundColor: c.primary + '18', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
                              <Text style={{ fontSize: 10, fontWeight: '700', color: c.primary }}>{m}</Text>
                            </View>
                          ))}
                        </View>
                      )}
                      {ex.tip ? (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 }}>
                          <Icon name="bulb" size={9} color={c.textMuted} />
                          <Text
                            style={{ fontSize: 9, color: c.textMuted }}
                            numberOfLines={1}>
                            {ex.tip}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      onPress={() =>
                        setExercises((prev) =>
                          prev.filter((e) => e.key !== ex.key)
                        )
                      }
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Icon name="trash" size={15} color={c.textMuted} />
                    </TouchableOpacity>
                    {/* 드래그 핸들 — 우측 */}
                    <View style={{ width: 32, alignItems: "center", justifyContent: "center" }}>
                      <Icon name="menu" size={18} color={c.textMuted} />
                    </View>
                  </TouchableOpacity>
                )}
              />
            )}

            {sessions.length > 0 && (
              <TouchableOpacity
                style={[{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: c.surface, borderRadius: 16, padding: 14, marginBottom: 10 }, SHADOW]}
                onPress={() => setShowHistorySheet(true)}
                activeOpacity={0.8}>
                <Icon name="chart" size={18} color={c.secondary} />
                <Text style={{ fontSize: 14, fontWeight: "800", color: c.secondary }}>
                  히스토리에서 불러오기
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                {
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  backgroundColor: c.surface,
                  borderRadius: 16,
                  padding: 14,
                  marginBottom: 20,
                },
                SHADOW,
              ]}
              onPress={() => setSubMode("addExercise")}
              activeOpacity={0.8}>
              <Icon name="plus" size={18} color={c.primary} />
              <Text
                style={{ fontSize: 14, fontWeight: "800", color: c.primary }}>
                종목 추가
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{ backgroundColor: c.warning, borderRadius: 999, paddingVertical: 16, alignItems: "center" }}
              onPress={handleSave}
              activeOpacity={0.8}>
              <Text style={{ fontSize: 16, fontWeight: "800", color: c.onAccent }}>루틴 저장</Text>
            </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>

      {/* 히스토리에서 불러오기 시트 */}
      <Modal visible={showHistorySheet} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%', paddingBottom: 32 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: c.border }}>
              <Text style={{ fontSize: 17, fontWeight: '900', color: c.textPrimary }}>운동 기록에서 불러오기</Text>
              <TouchableOpacity onPress={() => setShowHistorySheet(false)}>
                <Icon name="close" size={20} color={c.textMuted} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {sessions.slice(0, 30).map(session => (
                <TouchableOpacity
                  key={session.id}
                  style={{ backgroundColor: c.surfaceAlt, borderRadius: 16, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                  onPress={() => loadFromSession(session)}
                  activeOpacity={0.75}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, fontWeight: '800', color: c.textPrimary, marginBottom: 4 }}>{session.date}</Text>
                    <Text style={{ fontSize: 12, color: c.textSecondary }} numberOfLines={1}>
                      {session.exercises.map(e => e.name).join(' · ')}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: c.primary + '20', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, marginLeft: 12 }}>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: c.primary }}>{session.exercises.length}종목</Text>
                  </View>
                </TouchableOpacity>
              ))}
              {sessions.length === 0 && (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <Text style={{ fontSize: 14, color: c.textMuted }}>아직 운동 기록이 없어요</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}
