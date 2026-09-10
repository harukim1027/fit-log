/**
 * @file app/routine/edit.tsx
 * @description 루틴 작성·편집. `?id=` 가 있으면 편집, 없으면 새 루틴.
 *
 * 전에는 `routine-manage.tsx` 의 `mode === "create" | "edit"` 였다.
 * 두 모드가 같은 JSX 를 썼으므로 라우트 하나로 합치고 `id` 유무로 가른다.
 *
 * ── 작성 내용은 routineStore.draft 에 있다 ────────────────────────────────
 * 종목 추가(`/routine/exercise`)를 다녀오는 동안 이 화면은 **스택에 살아
 * 있지만** 상태를 콜백으로 주고받을 수 없다. draft 를 구독하면 종목 화면이
 * `addDraftExercise` 를 부르고 돌아오는 것만으로 반영된다.
 */
import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation, usePreventRemove } from "@react-navigation/native";
import { useRoutineStore, getNextRoutineColor } from "../../store/routineStore";
import { useWorkoutStore } from "../../store/workoutStore";
import { useColors } from "../../constants/colors";
import { useThemeStore } from "../../store/themeStore";
import { useKeyboardHeight } from "../../hooks/useKeyboardHeight";
import { SortableList } from "../../components/ui";
import { Header, IconButton } from "../../design-system";
import { Icon } from "../../components/AppIcons";
import { showCuteAlert } from "../../components/CuteAlert";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import { RoutineColorPicker } from "../../components/RoutineColorPicker";
import { fmtMeta, onFill, EXERCISE_ITEM_H, LIGHT_SHADOW_SM, SCRIM } from "./_helpers";

function RoutineEditScreen() {
  const c = useColors();
  const router = useRouter();
  const navigation = useNavigation();
  const isDark = useThemeStore((s) => s.mode) === "dark";
  const SHADOW = isDark ? null : LIGHT_SHADOW_SM;
  const keyboardHeight = useKeyboardHeight();
  const params = useLocalSearchParams<{ id?: string }>();

  const {
    routines,
    loaded,
    loadRoutines,
    addRoutine,
    updateRoutine,
    draft,
    beginDraft,
    patchDraft,
    setDraftExercises,
    removeDraftExercise,
    clearDraft,
    isDraftDirty,
  } = useRoutineStore();

  const sessions = useWorkoutStore((s) => s.sessions);
  const [showHistorySheet, setShowHistorySheet] = React.useState(false);
  const [nameError, setNameError] = React.useState("");
  const [exercisesError, setExercisesError] = React.useState("");
  const nameRef = useRef<TextInput>(null);
  const editScrollRef = useRef<ScrollView>(null);
  const editScrollOffset = useRef(0);

  /**
   * 초안 준비.
   *
   * deps 가 [] 라 **마운트당 한 번**만 돈다. 종목 화면을 다녀와도 이 화면은
   * 스택에 남아 언마운트되지 않으므로 다시 돌지 않는다 — 돌면 추가한 종목이
   * 초안 재생성으로 날아간다.
   *
   * 이미 같은 대상의 초안이 열려 있으면 그대로 쓴다(재진입 방어).
   */
  useEffect(() => {
    const wanted = params.id ?? null;
    if (draft && draft.id === wanted && draft.kind !== "combine") return;

    if (!wanted) {
      beginDraft({
        kind: "create",
        id: null,
        name: "",
        color: getNextRoutineColor(routines),
        exercises: [],
        sourceIds: [],
      });
      setTimeout(() => nameRef.current?.focus(), 300);
      return;
    }

    const seed = (list: typeof routines) => {
      const r = list.find((x) => x.id === wanted);
      if (!r) return false;
      beginDraft({
        kind: "edit",
        id: r.id,
        name: r.name,
        color: r.color ?? getNextRoutineColor(list),
        exercises: r.exercises.map((e, i) => ({ ...e, key: `${e.name}-${i}-${Date.now()}` })),
        sourceIds: [],
      });
      return true;
    };

    if (seed(routines)) return;
    /**
     * 스토어에 없다. 목록을 거치지 않고 이 라우트로 바로 들어온 경우다
     * (운동 탭의 루틴 편집 버튼). 한 번 불러 보고 그래도 없으면 되돌린다 —
     * 빈 폼을 보여 주면 사용자가 편집한 줄 알고 저장해 새 루틴이 생긴다.
     */
    loadRoutines().then(() => {
      if (!seed(useRoutineStore.getState().routines)) {
        showCuteAlert({
          icon: "alert",
          tone: "danger",
          title: "루틴을 찾을 수 없어요",
          buttons: [{ label: "확인", style: "primary", onPress: () => router.back() }],
        });
      }
    });
  }, []);

  /**
   * 지난 운동 세션에서 종목을 가져온다. 이미 있는 이름은 건너뛴다.
   * 세트 정보는 세션의 실제 세트에서 뽑는다 — 그 날 한 대로 시작할 수 있게.
   */
  const loadFromSession = (session: (typeof sessions)[0]) => {
    if (!draft) return;
    const drafts = session.exercises.map((ex, i) => ({
      name: ex.name,
      category: ex.category,
      defaultSets: ex.sets.length || 3,
      defaultWeight: ex.sets[0]?.weight,
      defaultUnit: (ex.sets[0]?.unit as "kg" | "lbs" | undefined) ?? "kg",
      defaultReps: ex.sets[0]?.reps,
      restSeconds: ex.restSeconds,
      targetReps: ex.targetReps,
      settings: ex.settings,
      tip: ex.tip,
      targetMuscles: ex.targetMuscles,
      isSingleArm: ex.isSingleArm,
      key: `${ex.name}-hist-${i}-${Date.now()}`,
    }));
    const existing = new Set(draft.exercises.map((e) => e.name));
    setDraftExercises([...draft.exercises, ...drafts.filter((d) => !existing.has(d.name))]);
    setShowHistorySheet(false);
  };

  const setName = (v: string) => patchDraft({ name: v });
  const setColor = (v: string) => patchDraft({ color: v });

  /**
   * 미저장 가드. **이 하나가 전부다.**
   *
   * 전에는 버튼 가드(모드 복귀)와 usePreventRemove(라우트 이탈) 둘이
   * 필요했다. 라우트가 갈리면서 헤더 뒤로·안드로이드 뒤로가기·스와이프가
   * 전부 같은 pop 경로를 타므로 하나면 된다.
   */
  usePreventRemove(isDraftDirty(), ({ data }) => {
    showCuteAlert({
      icon: "alert",
      tone: "danger",
      title: "작성 중인 내용이 있어요",
      message: "닫으면 입력한 내용이 사라져요.",
      buttons: [
        { label: "계속 작성", style: "soft" },
        {
          label: "닫기",
          style: "primary",
          onPress: () => {
            clearDraft();
            navigation.dispatch(data.action);
          },
        },
      ],
    });
  });

  const handleSave = async () => {
    if (!draft) return;
    let hasError = false;
    if (!draft.name.trim()) { setNameError("루틴 이름을 입력해주세요"); hasError = true; }
    else setNameError("");
    if (draft.exercises.length === 0) { setExercisesError("종목을 1개 이상 추가해주세요"); hasError = true; }
    else setExercisesError("");
    if (hasError) return;

    const payload = draft.exercises.map(({ gifUrl, key, ...rest }) => rest);
    try {
      if (draft.kind === "create")
        await addRoutine({ name: draft.name.trim(), exercises: payload, color: draft.color });
      else if (draft.id)
        await updateRoutine(draft.id, { name: draft.name.trim(), exercises: payload, color: draft.color });
      // 저장됐으므로 초안을 버린다. 순서가 중요하다 — 먼저 비워야
      // usePreventRemove 가 dirty 로 보고 확인창을 띄우지 않는다.
      clearDraft();
      router.back();
    } catch {
      showCuteAlert({ icon: "alert", tone: "danger", title: "저장 실패", message: "잠시 후 다시 시도해주세요", buttons: [{ label: "확인", style: "primary" }] });
    }
  };

  // 초안이 아직 없다(비동기 로드 중). 빈 폼 대신 아무것도 그리지 않는다.
  if (!draft) return <View style={{ flex: 1, backgroundColor: c.background }} />;

  return (
  <View style={{ flex: 1 }}>
    <SafeAreaView
      style={{ flex: 1, backgroundColor: c.background }}
      edges={["bottom"]}>
      <Header
        title={draft.kind === "create" ? "새 루틴" : "루틴 수정"}
        showBack
      />
      <ScrollView
        ref={editScrollRef}
        onScroll={(e) => { editScrollOffset.current = e.nativeEvent.contentOffset.y; }}
        scrollEventThrottle={16}
        // "handled": 빈 영역/색상 휠 탭 시 키보드 닫힘, 팔레트 칩 onPress는 유지
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={{ padding: 20, paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 20 }}
        style={{ flex: 1 }}>
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
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
                borderRadius: 12,
                padding: 14,
                fontSize: 14,
                fontWeight: "600",
                color: c.textPrimary,
                marginBottom: nameError ? 6 : 20,
                borderWidth: nameError ? 1.5 : 0,
                borderColor: nameError ? c.danger : undefined,
              },
              SHADOW,
            ]}
            value={draft.name}
            onChangeText={(v) => { setName(v); if (v.trim()) setNameError(''); }}
            placeholder="예: 상체 루틴, 하체 데이"
            placeholderTextColor={c.textMuted}
            returnKeyType="next"
          />
          {!!nameError && (
            <Text style={{ fontSize: 11, color: c.danger, marginBottom: 14, marginTop: 2 }}>{nameError}</Text>
          )}

          {/* 루틴 색상 — 추천 팔레트 + 자유 색상 휠 */}
          <View style={{ marginBottom: 20 }}>
            <RoutineColorPicker value={draft.color} onChange={setColor} />
          </View>

          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color: c.textSecondary,
              marginBottom: 8,
            }}>
            종목 목록{" "}<Text style={{ color: c.danger }}>*</Text>
          </Text>
          {!!exercisesError && (
            <Text style={{ fontSize: 11, color: c.danger, marginBottom: 8, marginTop: -4 }}>{exercisesError}</Text>
          )}

          {draft.exercises.length === 0 ? (
            <View
              style={{ alignItems: "center", paddingVertical: 20, gap: 4, borderWidth: exercisesError ? 1.5 : 0, borderColor: exercisesError ? c.danger : undefined, borderRadius: 12 }}>
              <Text
                style={{ fontSize: 14, color: exercisesError ? c.danger : c.textMuted, fontWeight: "600" }}>
                아직 종목이 없어요
              </Text>
            </View>
          ) : (
            <SortableList
              data={draft.exercises}
              keyExtractor={(ex) => ex.key}
              itemHeight={EXERCISE_ITEM_H}
              scrollRef={editScrollRef}
              scrollOffsetRef={editScrollOffset}
              onDragStart={() => editScrollRef.current?.setNativeProps?.({ scrollEnabled: false })}
              onDragRelease={() => editScrollRef.current?.setNativeProps?.({ scrollEnabled: true })}
              onDragEnd={setDraftExercises}
              renderItem={(ex, idx) => (
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => router.push({ pathname: "/routine/exercise", params: { index: String(idx) } })}
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
                          fontSize: 14,
                          fontWeight: "600",
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
                            fontWeight: "700",
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
                        fontWeight: "700",
                        marginTop: 1,
                      }}>
                      {ex.defaultSets}세트
                      {ex.defaultWeight ? ` · ${ex.defaultWeight}${ex.defaultUnit ?? 'kg'}` : ""}
                    </Text>
                    {(ex.targetMuscles?.length ?? 0) > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                        {ex.targetMuscles!.map((m, mi) => (
                          <View key={mi} style={{ backgroundColor: c.primary + '18', borderRadius: 999, paddingHorizontal: 7, paddingVertical: 2 }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: c.primary }}>{m}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                    {ex.tip ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 1 }}>
                        <Icon name="bulb" size={9} color={c.textMuted} />
                        <Text
                          style={{ fontSize: 11, color: c.textMuted }}
                          numberOfLines={1}>
                          {ex.tip}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                  <IconButton
                    accessibilityLabel={`${ex.name} 삭제`}
                    onPress={() => removeDraftExercise(idx)}>
                    <Icon name="trash" size={15} color={c.textMuted} />
                  </IconButton>
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
              activeOpacity={0.7}>
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
            onPress={() => router.push("/routine/exercise")}
            activeOpacity={0.7}>
            <Icon name="plus" size={18} color={c.primary} />
            <Text
              style={{ fontSize: 14, fontWeight: "800", color: c.primary }}>
              종목 추가
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={{ backgroundColor: c.warning, borderRadius: 999, paddingVertical: 16, alignItems: "center" }}
            onPress={handleSave}
            activeOpacity={0.7}>
            <Text style={{ fontSize: 14, fontWeight: "800", color: c.onAccent }}>루틴 저장</Text>
          </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>

    {/* 히스토리에서 불러오기 시트 */}
    {/* 읽기 전용 목록이라 닫아도 잃을 것이 없다. 뒤로가기는 그냥 닫는다. */}
    <Modal
      visible={showHistorySheet}
      transparent
      animationType="slide"
      onRequestClose={() => setShowHistorySheet(false)}>
      <View style={{ flex: 1, backgroundColor: SCRIM, justifyContent: 'flex-end' }}>
        <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%', paddingBottom: 32 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: c.border }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: c.textPrimary }}>운동 기록에서 불러오기</Text>
            <IconButton
              accessibilityLabel="닫기"
              onPress={() => setShowHistorySheet(false)}>
              <Icon name="close" size={20} color={c.textMuted} />
            </IconButton>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {sessions.slice(0, 30).map(session => (
              <TouchableOpacity
                key={session.id}
                style={{ backgroundColor: c.surfaceAlt, borderRadius: 16, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
                onPress={() => loadFromSession(session)}
                activeOpacity={0.7}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '600', color: c.textPrimary, marginBottom: 4 }}>{session.date}</Text>
                  <Text style={{ fontSize: 12, color: c.textSecondary }} numberOfLines={1}>
                    {session.exercises.map(e => e.name).join(' · ')}
                  </Text>
                </View>
                <View style={{ backgroundColor: c.primary + '20', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, marginLeft: 12 }}>
                  <Text style={{ fontSize: 12, fontWeight: '600', color: c.primary }}>{session.exercises.length}종목</Text>
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

export default function RoutineEditRoute() {
  return (
    <ErrorBoundary screenName="루틴 편집">
      <RoutineEditScreen />
    </ErrorBoundary>
  );
}
