/**
 * @file app/routine/index.tsx
 * @description 루틴 목록. 중첩 스택의 첫 단계다.
 *
 * 전에는 `modal/routine-manage.tsx` 의 `mode === "list"` 분기였다.
 * 모드 전환(`setMode("create")` 등)이 전부 `router.push` 가 되면서
 * 뒤로가기·스와이프가 "한 단계 취소"로 정확히 동작한다.
 *
 * 미저장 가드가 없다 — 이 화면에는 작성 중인 것이 없다.
 * (작성은 `edit`, 합치기는 `combine` 이 각자 자기 dirty 만 본다.)
 */
import React, { useEffect, useRef, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useRoutineStore } from "../../store/routineStore";
import { useWorkoutStore } from "../../store/workoutStore";
import { useColors } from "../../constants/colors";
import { useThemeStore } from "../../store/themeStore";
import { SortableList } from "../../components/ui";
import { Header, IconButton } from "../../design-system";
import { Icon } from "../../components/AppIcons";
import { showCuteAlert } from "../../components/CuteAlert";
import { ErrorBoundary } from "../../components/ErrorBoundary";
import {
  estimateMinutes,
  setCount,
  onFill,
  ROUTINE_ITEM_H,
  LIGHT_SHADOW_SM,
  SCRIM,
} from "./_helpers";

function RoutineListScreen() {
  const c = useColors();
  const router = useRouter();
  const isDark = useThemeStore((s) => s.mode) === "dark";
  // DESIGN.md: 그림자는 라이트 모드에서만. 다크는 surface 명도 차 + 보더로 계층을 만든다.
  const SHADOW = isDark ? null : LIGHT_SHADOW_SM;

  const { routines, loadRoutines, deleteRoutine, reorderRoutines } = useRoutineStore();
  const startSessionWithRoutine = useWorkoutStore((s) => s.startSessionWithRoutine);
  const activeSession = useWorkoutStore((s) => s.activeSession);

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const listScrollRef = useRef<ScrollView>(null);
  const listScrollOffset = useRef(0);

  useEffect(() => {
    loadRoutines();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView
        style={{ flex: 1, backgroundColor: c.background }}
        edges={["bottom"]}>
        {/* 모든 단계가 라우트라 전부 showBack 이다. Header 가 플래그와
            accessibilityLabel 을 묶어 두어 스크린리더도 "뒤로 가기"로 읽는다. */}
        <Header title="루틴 관리" showBack />
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
                borderRadius: 16,
                padding: 16,
                marginBottom: 10,
                justifyContent: "center",
              },
              SHADOW,
            ]}
            onPress={() => router.push("/routine/edit")}
            activeOpacity={0.7}>
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
                  borderRadius: 16,
                  padding: 14,
                  marginBottom: 16,
                  justifyContent: "center",
                },
                SHADOW,
              ]}
              /* 선택 상태 초기화가 없다 — combine 라우트가 자기 상태로 갖는다.
                 전에는 같은 컴포넌트라 진입 전에 비워 줘야 했다. */
              onPress={() => router.push("/routine/combine")}
              activeOpacity={0.7}>
              <Icon name="merge" size={16} color={c.secondary} />
              <Text
                /* 의미색은 아이콘이 지고 텍스트는 text-primary — secondary는 라이트 배경 위 2.71:1로 미달 */
                  style={{ fontSize: 14, fontWeight: "800", color: c.textPrimary }}>
                루틴 결합하기
              </Text>
            </TouchableOpacity>
          )}

          {routines.length === 0 ? (
            <View style={{ alignItems: "center", paddingTop: 48, gap: 8 }}>
              <Icon name="dumbbell" size={56} color={c.textMuted} />
              <Text
                style={{ fontSize: 17, fontWeight: "800", color: c.textPrimary }}>
                루틴이 없어요
              </Text>
              <Text
                style={{
                  fontSize: 14,
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
                    fontWeight: "700",
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
                        borderRadius: 16,
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
                            fontSize: 17,
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
                          {r.exercises.length}종목 · 예상 {estimateMinutes(r)}분
                        </Text>
                      </View>
                      <View
                        style={{
                          flexDirection: "row",
                          // 18 두 개가 44 두 개가 되면서 묶음이 46 → 88pt가 된다.
                          // gap 10을 없애 증가분을 20 줄인다. 아이콘 사이 간격은
                          // 박스가 각각 13씩 여백을 갖게 되어 시각적으로는 유지된다.
                          gap: 0,
                          alignItems: "center",
                        }}>
                        <IconButton
                          accessibilityLabel={`${r.name} 편집`}
                          onPress={() => router.push({ pathname: "/routine/edit", params: { id: r.id } })}>
                          <Icon name="pencil" size={18} color={c.textSecondary} />
                        </IconButton>
                        <IconButton
                          accessibilityLabel={`${r.name} 삭제`}
                          onPress={() => setDeleteTarget(r.id)}>
                          <Icon name="trash" size={18} color={c.textMuted} />
                        </IconButton>
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
                              fontSize: 11,
                              fontWeight: "700",
                              color: c.success,
                            }}>
                            {ex.name} {setCount(ex)}세트
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
                              fontSize: 11,
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
                      activeOpacity={0.7}>
                      <Text style={{ fontSize: 14, fontWeight: "800", color: c.warning }}>
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
            backgroundColor: SCRIM, zIndex: 999,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <View style={{
              backgroundColor: c.surface, borderRadius: 16, padding: 24,
              marginHorizontal: 32, width: '80%',
            }}>
              <Text style={{ fontSize: 17, fontWeight: '800', color: c.textPrimary, marginBottom: 8 }}>루틴 삭제</Text>
              <Text style={{ fontSize: 14, color: c.textSecondary, marginBottom: 24 }}>
                {`"${targetName}" 루틴을 삭제할까요?`}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity activeOpacity={0.7}
                  onPress={() => setDeleteTarget(null)}
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: c.surfaceAlt, alignItems: 'center' }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: c.textSecondary }}>취소</Text>
                </TouchableOpacity>
                <TouchableOpacity activeOpacity={0.7}
                  onPress={() => { deleteRoutine(deleteTarget); setDeleteTarget(null); }}
                  style={{ flex: 1, paddingVertical: 12, borderRadius: 10, backgroundColor: c.danger, alignItems: 'center' }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', color: onFill(c.danger) }}>삭제</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      })()}
    </View>
  );
}

export default function RoutineListRoute() {
  return (
    <ErrorBoundary screenName="루틴 관리">
      <RoutineListScreen />
    </ErrorBoundary>
  );
}
