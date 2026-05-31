import React, { useRef, useState, useCallback } from "react";
import { View, PanResponder, Animated, ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";

export interface SortableListProps<T> {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, index: number, isActive: boolean) => React.ReactNode;
  onDragEnd: (newData: T[]) => void;
  onDragStart?: () => void;
  onDragRelease?: () => void;
  itemHeight?: number; // 실측 대체 후 사용 안 함, 하위호환용
  style?: ViewStyle;
}

export function SortableList<T>({
  data,
  keyExtractor,
  renderItem,
  onDragEnd,
  onDragStart,
  onDragRelease,
  style,
}: SortableListProps<T>) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const isDragging = useRef(false);
  const dragStartIndex = useRef(0);
  const hoverIndexRef = useRef<number | null>(null);

  // 각 아이템의 실측 높이 (onLayout)
  const itemHeights = useRef<number[]>([]);
  // 각 아이템의 top Y (컨테이너 기준) — 누적 계산
  // → itemHeights에서 매번 계산하므로 별도 저장 불필요
  // 컨테이너 전체 높이
  const [totalHeight, setTotalHeight] = useState(0);

  // 드래그 시작 시 containerPageY (fresh 측정)
  const containerPageY = useRef(0);
  // PanResponder grant 시점 pageY
  const grantPageY = useRef(0);
  // onTouchStart pageY
  const touchStartPageY = useRef(0);

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<View>(null);

  const dataRef = useRef(data);
  const onDragEndRef = useRef(onDragEnd);
  const onDragStartRef = useRef(onDragStart);
  const onDragReleaseRef = useRef(onDragRelease);
  dataRef.current = data;
  onDragEndRef.current = onDragEnd;
  onDragStartRef.current = onDragStart;
  onDragReleaseRef.current = onDragRelease;

  const dragY = useRef(new Animated.Value(0)).current;
  const dragScale = useRef(new Animated.Value(1)).current;

  const shiftsRef = useRef<Animated.Value[]>([]);
  while (shiftsRef.current.length < data.length) {
    shiftsRef.current.push(new Animated.Value(0));
  }
  if (shiftsRef.current.length > data.length) {
    shiftsRef.current = shiftsRef.current.slice(0, data.length);
  }

  // index의 top Y (컨테이너 기준) = 앞 아이템 높이 합산
  const getTopY = (index: number): number => {
    let y = 0;
    for (let i = 0; i < index; i++) {
      y += itemHeights.current[i] ?? 0;
    }
    return y;
  };

  // pageY → 아이템 인덱스
  const indexFromPageY = (pageY: number): number => {
    const relY = pageY - containerPageY.current;
    const n = dataRef.current.length;
    let acc = 0;
    for (let i = 0; i < n; i++) {
      acc += itemHeights.current[i] ?? 0;
      if (relY < acc) return i;
    }
    return n - 1;
  };

  // 드래그 아이템 높이
  const getDragItemHeight = (): number =>
    itemHeights.current[dragStartIndex.current] ?? 60;

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

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: () => isDragging.current,
      onMoveShouldSetPanResponderCapture: () => isDragging.current,

      onPanResponderGrant: (e) => {
        grantPageY.current = e.nativeEvent.pageY;
        const h = getDragItemHeight();
        const relY = grantPageY.current - containerPageY.current;
        dragY.setValue(relY - h / 2);
      },

      onPanResponderMove: (_, gs) => {
        if (!isDragging.current) return;
        const currentPageY = grantPageY.current + gs.dy;
        const h = getDragItemHeight();
        dragY.setValue(currentPageY - containerPageY.current - h / 2);

        const newHoverIndex = indexFromPageY(currentPageY);
        if (newHoverIndex !== hoverIndexRef.current) {
          hoverIndexRef.current = newHoverIndex;
          applyShifts(dragStartIndex.current, newHoverIndex);
        }
      },

      onPanResponderRelease: (_, gs) => {
        if (!isDragging.current) return;

        const currentPageY = grantPageY.current + gs.dy;
        const finalIndex = indexFromPageY(currentPageY);

        isDragging.current = false;
        hoverIndexRef.current = null;
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
        isDragging.current = false;
        hoverIndexRef.current = null;
        setDragIndex(null);
        resetAnimations();
        onDragReleaseRef.current?.();
      },
    })
  ).current;

  return (
    <View
      ref={containerRef}
      style={[{ overflow: "visible" }, style]}
      onTouchStart={(e) => {
        touchStartPageY.current = e.nativeEvent.pageY;

        timerRef.current = setTimeout(() => {
          containerRef.current?.measure((_x, _y, _w, _h, _px, py) => {
            containerPageY.current = py;

            const idx = indexFromPageY(touchStartPageY.current);

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
      onTouchEnd={cancelTimer}
      onTouchCancel={cancelTimer}
      {...panResponder.panHandlers}>
      {/* 전체 높이를 실측 합산으로 맞춤 */}
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
                // 전체 높이 재계산
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
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
            }}>
            {renderItem(data[dragIndex], dragIndex, true)}
          </Animated.View>
        )}
      </View>
    </View>
  );
}
