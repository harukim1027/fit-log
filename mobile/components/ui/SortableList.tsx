import React, { useRef, useState, useEffect } from "react";
import { View, PanResponder, Animated, ViewStyle, Dimensions } from "react-native";
import * as Haptics from "expo-haptics";
import { useThemeStore } from "../../store/themeStore";

// 자동 스크롤: 드래그 중 손가락이 화면 위/아래 가장자리에 닿으면 부모 ScrollView를 스크롤한다.
const EDGE_THRESHOLD = 120; // 화면 위/아래에서 이 거리(px) 안에 들어오면 자동 스크롤
const AUTO_SCROLL_SPEED = 10; // tick(16ms)당 스크롤 픽셀

export interface SortableListProps<T> {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, index: number, isActive: boolean) => React.ReactNode;
  onDragEnd: (newData: T[]) => void;
  onDragStart?: () => void;
  onDragRelease?: () => void;
  itemHeight?: number;
  style?: ViewStyle;
  /**
   * 부모 스크롤 컨테이너 ref. 넘기면 드래그 중 가장자리 자동 스크롤이 활성화된다.
   * ScrollView( scrollTo )와 KeyboardAwareScrollView( scrollToPosition ) 모두 지원.
   */
  scrollRef?: React.RefObject<any>;
  /**
   * 부모 스크롤의 현재 offset(y)을 담은 ref. 부모 ScrollView의
   * onScroll에서 contentOffset.y로 갱신해줘야 한다(scrollEventThrottle={16}).
   * 자동 스크롤로 컨테이너가 움직여도 hover 인덱스/드래그 카드 위치를 보정하는 데 쓴다.
   */
  scrollOffsetRef?: React.RefObject<number>;
}

// DESIGN.md Governance에 shadow.light가 unresolved로 기록돼 있어 확정 토큰이 없다.
// 값이 정해지면 이 상수를 토큰 참조로 교체할 것.
const LIGHT_SHADOW_DRAG = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.25,
  shadowRadius: 16,
};

export function SortableList<T>({
  data,
  keyExtractor,
  renderItem,
  onDragEnd,
  onDragStart,
  onDragRelease,
  style,
  scrollRef,
  scrollOffsetRef,
}: SortableListProps<T>) {
  const isDark = useThemeStore((s) => s.mode) === "dark";
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [totalHeight, setTotalHeight] = useState(0);

  const isDragging = useRef(false);
  const dragStartIndex = useRef(0);
  const hoverIndexRef = useRef<number | null>(null);
  // PanResponder가 실제로 responder를 잡았는지(=손가락이 이동했는지) 추적.
  // 롱프레스로 드래그만 활성화하고 이동 없이 손을 떼면 onMoveShouldSetPanResponder가
  // 안 불려 PanResponder가 responder가 되지 않고, release/terminate 콜백도 안 온다.
  // 그 경우 onTouchEnd에서 직접 드래그 상태를 정리하기 위한 플래그.
  const panGranted = useRef(false);

  const itemHeights = useRef<number[]>([]);
  const containerPageY = useRef(0);
  const touchStartPageY = useRef(0);
  const grantPageY = useRef(0);
  // Container-relative top Y of the dragged item at drag start
  const dragItemOriginalTopY = useRef(0);

  // 자동 스크롤 상태
  const autoScrollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoScrollDir = useRef<0 | -1 | 1>(0);
  // 드래그 시작 시점의 스크롤 offset — 이후 scrollDelta 계산 기준
  const scrollStartOffset = useRef(0);
  // 자동 스크롤이 목표로 하는 offset. onScroll 되읽기에 의존하면 콜백 지연 시
  // 목표값이 안 늘어나 한 스텝만 찍고 멈춘다(과거 실패 원인). 자체 카운터로 항상 전진시킨다.
  const targetOffset = useRef(0);
  // 마지막 손가락 dy — 자동 스크롤 tick에서 카드/인덱스 재계산에 사용
  const lastDy = useRef(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<View>(null);

  const dataRef = useRef(data);
  const onDragEndRef = useRef(onDragEnd);
  const onDragStartRef = useRef(onDragStart);
  const onDragReleaseRef = useRef(onDragRelease);
  const scrollRefRef = useRef(scrollRef);
  const scrollOffsetRefRef = useRef(scrollOffsetRef);
  dataRef.current = data;
  onDragEndRef.current = onDragEnd;
  onDragStartRef.current = onDragStart;
  onDragReleaseRef.current = onDragRelease;
  scrollRefRef.current = scrollRef;
  scrollOffsetRefRef.current = scrollOffsetRef;

  const dragY = useRef(new Animated.Value(0)).current;
  const dragScale = useRef(new Animated.Value(1)).current;

  const shiftsRef = useRef<Animated.Value[]>([]);
  while (shiftsRef.current.length < data.length) {
    shiftsRef.current.push(new Animated.Value(0));
  }
  if (shiftsRef.current.length > data.length) {
    shiftsRef.current = shiftsRef.current.slice(0, data.length);
  }

  const getTopY = (index: number): number => {
    let y = 0;
    for (let i = 0; i < index; i++) {
      y += itemHeights.current[i] ?? 0;
    }
    return y;
  };

  // 컨테이너 상대 Y → 인덱스. (스크롤 보정은 호출부에서 relY에 더해 전달)
  const indexFromRelY = (relY: number): number => {
    if (relY <= 0) return 0;
    const n = dataRef.current.length;
    let acc = 0;
    for (let i = 0; i < n; i++) {
      acc += itemHeights.current[i] ?? 0;
      if (relY < acc) return i;
    }
    return n - 1;
  };

  const applyShifts = (active: number, hover: number) => {
    const h = itemHeights.current[active] ?? 60;
    dataRef.current.forEach((_, i) => {
      if (i === active) return;
      let target = 0;
      if (active < hover && i > active && i <= hover) target = -h;
      else if (active > hover && i >= hover && i < active) target = h;
      const s = shiftsRef.current[i];
      if (s) {
        Animated.spring(s, {
          toValue: target,
          damping: 20,
          stiffness: 200,
          useNativeDriver: true,
        }).start();
      }
    });
  };

  const resetAnimations = () => {
    Animated.spring(dragScale, {
      toValue: 1,
      damping: 15,
      stiffness: 200,
      useNativeDriver: true,
    }).start();
    shiftsRef.current.forEach((s) =>
      Animated.spring(s, {
        toValue: 0,
        damping: 20,
        stiffness: 200,
        useNativeDriver: true,
      }).start()
    );
  };

  const cancelTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // ── 자동 스크롤 ──────────────────────────────────────────────────────────

  // 드래그 시작 이후 부모 스크롤이 움직인 양. 컨테이너가 함께 움직이므로
  // hover 인덱스/드래그 카드 위치 계산에 이 값을 더해 보정한다.
  const currentScrollDelta = (): number =>
    (scrollOffsetRefRef.current?.current ?? 0) - scrollStartOffset.current;

  const doScrollTo = (y: number) => {
    const ref = scrollRefRef.current?.current;
    if (!ref) return;
    if (typeof ref.scrollTo === "function") {
      ref.scrollTo({ y, animated: false });
    } else if (typeof ref.scrollToPosition === "function") {
      // KeyboardAwareScrollView
      ref.scrollToPosition(0, y, false);
    }
  };

  // 드래그 카드 위치 + hover 인덱스 갱신 (손가락 이동/자동 스크롤 양쪽에서 호출)
  const updateDrag = (dy: number) => {
    lastDy.current = dy;
    const scrollDelta = currentScrollDelta();
    dragY.setValue(dragItemOriginalTopY.current + dy + scrollDelta);
    const relY = grantPageY.current + dy - containerPageY.current + scrollDelta;
    const newHover = indexFromRelY(relY);
    if (newHover !== hoverIndexRef.current) {
      hoverIndexRef.current = newHover;
      applyShifts(dragStartIndex.current, newHover);
    }
  };

  const stopAutoScroll = () => {
    if (autoScrollTimer.current) {
      clearInterval(autoScrollTimer.current);
      autoScrollTimer.current = null;
    }
    autoScrollDir.current = 0;
  };

  const startAutoScroll = (dir: -1 | 1) => {
    if (!scrollRefRef.current?.current) return; // scrollRef 없으면 자동 스크롤 비활성
    if (autoScrollDir.current === dir) return; // 이미 같은 방향으로 스크롤 중
    stopAutoScroll();
    autoScrollDir.current = dir;
    autoScrollTimer.current = setInterval(() => {
      if (!isDragging.current) {
        stopAutoScroll();
        return;
      }
      // 자체 카운터로 목표 offset을 직접 전진(되읽기 의존 X). 하단 초과분은 ScrollView가 클램프.
      targetOffset.current = Math.max(
        0,
        targetOffset.current + dir * AUTO_SCROLL_SPEED
      );
      doScrollTo(targetOffset.current);
      // 손가락은 멈춰 있어도 스크롤로 컨테이너가 움직이므로 카드/인덱스 재계산
      updateDrag(lastDy.current);
    }, 16);
  };

  // 손가락 절대 Y가 화면 가장자리에 들어오면 자동 스크롤 시작/정지
  const handleEdgeAutoScroll = (fingerPageY: number) => {
    const { height } = Dimensions.get("window");
    if (fingerPageY < EDGE_THRESHOLD) startAutoScroll(-1);
    else if (fingerPageY > height - EDGE_THRESHOLD) startAutoScroll(1);
    else stopAutoScroll();
  };

  // 드래그 상태 완전 정리 (reorder 없이). terminate 및 이동 없는 손 뗌에서 공용 사용.
  const resetDragState = () => {
    stopAutoScroll();
    isDragging.current = false;
    hoverIndexRef.current = null;
    panGranted.current = false;
    setDragIndex(null);
    resetAnimations();
    onDragReleaseRef.current?.();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: () => isDragging.current,
      onMoveShouldSetPanResponderCapture: () => isDragging.current,

      // 드래그 중에는 책임(responder)을 절대 양보하지 않는다. 기본값(true)이면
      // 아이템을 가장자리로 끌고 갈 때 부모 ScrollView가 제스처를 가로채
      // onPanResponderTerminate가 발생 → 드래그가 갑자기 끊기고 자동 스크롤도 멈춘다.
      onPanResponderTerminationRequest: () => !isDragging.current,
      // Android: 네이티브 스크롤 컴포넌트가 책임을 빼앗지 못하게 차단
      onShouldBlockNativeResponder: () => true,

      onPanResponderGrant: (e) => {
        // Record the grant position as anchor for gs.dy.
        // dragY is already set to the item's original top in the timer callback,
        // so we don't reset it here — this prevents the "card jumps to finger" bug.
        grantPageY.current = e.nativeEvent.pageY;
        // PanResponder가 responder를 잡음(=이동 발생) → 종료는 release/terminate가 담당.
        panGranted.current = true;
      },

      onPanResponderMove: (_, gs) => {
        if (!isDragging.current) return;
        // 카드 위치 + hover 인덱스 갱신 (스크롤 보정 포함)
        updateDrag(gs.dy);
        // 손가락 절대 위치로 가장자리 자동 스크롤 판단
        handleEdgeAutoScroll(grantPageY.current + gs.dy);
      },

      onPanResponderRelease: (_, gs) => {
        if (!isDragging.current) return;
        stopAutoScroll();
        const scrollDelta = currentScrollDelta();
        const relY =
          grantPageY.current + gs.dy - containerPageY.current + scrollDelta;
        const finalIndex = indexFromRelY(relY);

        isDragging.current = false;
        hoverIndexRef.current = null;
        panGranted.current = false;
        setDragIndex(null);
        resetAnimations();
        onDragReleaseRef.current?.();

        if (finalIndex !== dragStartIndex.current) {
          Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success
          ).catch(() => {});
          const next = [...dataRef.current];
          const [moved] = next.splice(dragStartIndex.current, 1);
          next.splice(finalIndex, 0, moved);
          onDragEndRef.current(next);
        }
      },

      onPanResponderTerminate: () => {
        resetDragState();
      },
    })
  ).current;

  // 언마운트 시 타이머/인터벌 정리 (메모리 누수 방지)
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (autoScrollTimer.current) clearInterval(autoScrollTimer.current);
    };
  }, []);

  return (
    <View
      ref={containerRef}
      style={[{ overflow: "visible" }, style]}
      onTouchStart={(e) => {
        touchStartPageY.current = e.nativeEvent.pageY;

        timerRef.current = setTimeout(() => {
          containerRef.current?.measure((_x, _y, _w, _h, _px, py) => {
            containerPageY.current = py;
            // 드래그 시작 시점의 스크롤 offset 기록 — 이후 보정 기준 + 자동 스크롤 카운터 시드
            scrollStartOffset.current = scrollOffsetRefRef.current?.current ?? 0;
            targetOffset.current = scrollStartOffset.current;
            lastDy.current = 0;

            const idx = indexFromRelY(
              touchStartPageY.current - containerPageY.current
            );
            const topY = getTopY(idx);

            // Set dragY to the item's original position before any movement.
            // onPanResponderGrant will NOT override this — card stays in place.
            dragItemOriginalTopY.current = topY;
            dragY.setValue(topY);

            isDragging.current = true;
            dragStartIndex.current = idx;
            hoverIndexRef.current = idx;
            setDragIndex(idx);
            onDragStartRef.current?.();

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(
              () => {}
            );
            Animated.spring(dragScale, {
              toValue: 1.05,
              damping: 15,
              stiffness: 200,
              useNativeDriver: true,
            }).start();
          });
        }, 400);
      }}
      onTouchMove={(e) => {
        if (isDragging.current) return;
        const dy = Math.abs(e.nativeEvent.pageY - touchStartPageY.current);
        if (dy > 8) cancelTimer();
      }}
      onTouchEnd={() => {
        cancelTimer();
        // 롱프레스로 드래그가 켜졌지만 이동 없이 손을 뗀 경우:
        // PanResponder가 responder를 잡지 않아(panGranted=false) release/terminate가
        // 안 온다 → 여기서 직접 드래그 상태를 정리(원위치 복귀, 재정렬 없음).
        if (isDragging.current && !panGranted.current) resetDragState();
      }}
      onTouchCancel={() => {
        cancelTimer();
        if (isDragging.current && !panGranted.current) resetDragState();
      }}
      {...panResponder.panHandlers}>
      <View style={{ height: totalHeight }}>
        {data.map((item, index) => {
          const isActive = index === dragIndex;
          const shift = shiftsRef.current[index];
          const topY = getTopY(index);

          return (
            <Animated.View
              key={keyExtractor(item)}
              onLayout={(e) => {
                const h = e.nativeEvent.layout.height;
                itemHeights.current[index] = h;
                const total = itemHeights.current
                  .slice(0, data.length)
                  .reduce((s, v) => s + (v ?? 0), 0);
                setTotalHeight(total);
              }}
              style={[
                {
                  position: "absolute",
                  left: 0,
                  right: 0,
                  top: topY,
                },
                isActive ? { opacity: 0.15 } : undefined,
                shift ? { transform: [{ translateY: shift }] } : undefined,
              ]}>
              {renderItem(item, index, false)}
            </Animated.View>
          );
        })}

        {dragIndex !== null && dragIndex >= 0 && dragIndex < data.length && (
          <Animated.View
            pointerEvents="none"
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              width: "100%",
              height: itemHeights.current[dragIndex] ?? 60,
              transform: [{ translateY: dragY }, { scale: dragScale }],
              zIndex: 999,
              elevation: 999,
              // 회귀 방지: 그림자는 라이트 전용. 다크에서 드래그 중인 행을 들어올린
              // 느낌은 위의 dragScale(확대)이 이미 만든다.
              ...(isDark ? null : LIGHT_SHADOW_DRAG),
            }}>
            {renderItem(data[dragIndex], dragIndex, true)}
          </Animated.View>
        )}
      </View>
    </View>
  );
}
