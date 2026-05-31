import React, { useRef, useState } from 'react';
import { View, PanResponder, Animated, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';

export interface SortableListProps<T> {
  data: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T, index: number, isActive: boolean) => React.ReactNode;
  onDragEnd: (newData: T[]) => void;
  itemHeight: number;
  style?: ViewStyle;
}

export function SortableList<T>({
  data,
  keyExtractor,
  renderItem,
  onDragEnd,
  itemHeight,
  style,
}: SortableListProps<T>) {
  const [dragIndex, setDragIndex] = useState(-1);

  const dragIndexRef = useRef(-1);
  const hoverIndexRef = useRef(-1);
  const isDragging = useRef(false);
  const touchStartY = useRef(0);
  const grantDy = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dragDy = useRef(new Animated.Value(0)).current;
  const dragScale = useRef(new Animated.Value(1)).current;
  const dragOpacity = useRef(new Animated.Value(1)).current;

  // One Animated.Value per item for shift animation
  const shiftsRef = useRef<Animated.Value[]>([]);
  while (shiftsRef.current.length < data.length) {
    shiftsRef.current.push(new Animated.Value(0));
  }
  if (shiftsRef.current.length > data.length) {
    shiftsRef.current = shiftsRef.current.slice(0, data.length);
  }
  const shifts = shiftsRef.current;

  const clamp = (v: number) => Math.max(0, Math.min(data.length - 1, v));

  const applyShifts = (active: number, hover: number) => {
    data.forEach((_, i) => {
      let target = 0;
      if (active >= 0) {
        if (active < hover && i > active && i <= hover) target = -itemHeight;
        else if (active > hover && i >= hover && i < active) target = itemHeight;
      }
      Animated.spring(shifts[i], {
        toValue: target,
        damping: 20,
        stiffness: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  const startDrag = (idx: number) => {
    isDragging.current = true;
    dragIndexRef.current = idx;
    hoverIndexRef.current = idx;
    dragDy.setValue(0);
    setDragIndex(idx);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Animated.spring(dragScale, { toValue: 1.03, damping: 15, stiffness: 200, useNativeDriver: true }).start();
    Animated.timing(dragOpacity, { toValue: 0.95, duration: 100, useNativeDriver: true }).start();
  };

  const finishDrag = () => {
    const from = dragIndexRef.current;
    const to = hoverIndexRef.current;

    isDragging.current = false;
    dragIndexRef.current = -1;
    hoverIndexRef.current = -1;
    setDragIndex(-1);

    Animated.spring(dragDy, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true }).start();
    Animated.spring(dragScale, { toValue: 1, damping: 15, stiffness: 200, useNativeDriver: true }).start();
    Animated.spring(dragOpacity, { toValue: 1, damping: 20, stiffness: 200, useNativeDriver: true }).start();
    shifts.forEach(s => Animated.spring(s, { toValue: 0, damping: 20, stiffness: 200, useNativeDriver: true }).start());

    if (from >= 0 && from !== to) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      const next = [...data];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      onDragEnd(next);
    }
  };

  const cancelTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      // Don't capture on start — let children handle taps normally.
      // Capture movement only once drag mode is active.
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: () => isDragging.current,
      onMoveShouldSetPanResponderCapture: () => isDragging.current,

      onPanResponderGrant: (_, gs) => {
        // Record dy at grant so we can zero-base subsequent movement
        grantDy.current = gs.dy;
      },

      onPanResponderMove: (_, gs) => {
        if (!isDragging.current) return;
        const dy = gs.dy - grantDy.current;
        dragDy.setValue(dy);
        const newHover = clamp(Math.round(dragIndexRef.current + dy / itemHeight));
        if (newHover !== hoverIndexRef.current) {
          hoverIndexRef.current = newHover;
          applyShifts(dragIndexRef.current, newHover);
        }
      },

      onPanResponderRelease: () => finishDrag(),
      onPanResponderTerminate: () => finishDrag(),
    })
  ).current;

  return (
    <View
      style={[{ overflow: 'visible' }, style]}
      onTouchStart={(e) => {
        const localY = e.nativeEvent.locationY;
        touchStartY.current = localY;
        const idx = clamp(Math.floor(localY / itemHeight));
        timerRef.current = setTimeout(() => startDrag(idx), 400);
      }}
      onTouchMove={(e) => {
        if (isDragging.current) return;
        const dy = Math.abs(e.nativeEvent.locationY - touchStartY.current);
        if (dy > 6) cancelTimer();
      }}
      onTouchEnd={cancelTimer}
      onTouchCancel={cancelTimer}
      {...panResponder.panHandlers}
    >
      {data.map((item, index) => {
        const isActive = index === dragIndex;
        return (
          <Animated.View
            key={keyExtractor(item)}
            style={[
              { height: itemHeight },
              isActive
                ? {
                    transform: [{ translateY: dragDy }, { scale: dragScale }],
                    opacity: dragOpacity,
                    zIndex: 100,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 8 },
                    shadowOpacity: 0.22,
                    shadowRadius: 12,
                    elevation: 10,
                  }
                : {
                    transform: [{ translateY: shifts[index] }],
                    zIndex: 1,
                    elevation: 0,
                  },
            ]}
          >
            {renderItem(item, index, isActive)}
          </Animated.View>
        );
      })}
    </View>
  );
}
