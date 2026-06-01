import React, { useEffect, useRef } from 'react';
import { Animated, TouchableOpacity, Text } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useColors } from '../../constants/colors';

const CORAL = '#FF6B47';

export type SetIndicatorState = 'done' | 'current' | 'todo';

export interface SetIndicatorProps {
  state: SetIndicatorState;
  index: number;
  size?: number;
  showLabel?: boolean;
  onPress?: () => void;
  onLongPress?: () => void;
}

export function SetIndicator({
  state,
  index,
  size = 40,
  showLabel = true,
  onPress,
  onLongPress,
}: SetIndicatorProps) {
  const c = useColors();
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const prevState = useRef(state);
  const loopRef = useRef<{ stop: () => void } | null>(null);

  useEffect(() => {
    const prev = prevState.current;
    prevState.current = state;

    if (state === 'current') {
      if (loopRef.current) loopRef.current.stop();
      const loop = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(opacityAnim, { toValue: 0.5, duration: 650, useNativeDriver: true }),
            Animated.timing(opacityAnim, { toValue: 1.0, duration: 650, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 0.9, duration: 650, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1.0, duration: 650, useNativeDriver: true }),
          ]),
        ])
      );
      loopRef.current = loop;
      loop.start();
    } else {
      if (loopRef.current) { loopRef.current.stop(); loopRef.current = null; }
      opacityAnim.setValue(1);
      if (state === 'done' && prev !== 'done') {
        scaleAnim.setValue(1);
        Animated.sequence([
          Animated.timing(scaleAnim, { toValue: 1.3, duration: 110, useNativeDriver: true }),
          Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 4, stiffness: 200 } as any),
        ]).start();
      } else {
        scaleAnim.setValue(1);
      }
    }
  }, [state]);

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.75}
      style={{ alignItems: 'center', gap: 5 }}
    >
      <Animated.View style={{ opacity: opacityAnim, transform: [{ scale: scaleAnim }] }}>
        <Svg width={size} height={size} viewBox="0 0 40 40">
          {state === 'done' && (
            <>
              <Circle cx="20" cy="20" r="16" fill={c.primary} />
              <Path
                d="M12.5 20l5 5L28 14"
                stroke="#fff"
                strokeWidth="3.2"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}
          {state === 'current' && (
            <>
              <Circle
                cx="20" cy="20" r="16"
                fill="rgba(255,107,71,0.16)"
                stroke={CORAL}
                strokeWidth="2.8"
              />
              <Path
                d="M20 11c1.5 4.2 4.6 5.2 4.6 8.8a4.6 4.6 0 0 1-9.2 0c0-1.4.6-2.6 1.5-3.4-.2 1.6.6 2.7 1.6 2.7a1.85 1.85 0 0 0 1.65-2.7C20.3 14.5 20 12.8 20 11Z"
                fill={CORAL}
              />
            </>
          )}
          {state === 'todo' && (
            <Circle
              cx="20" cy="20" r="16"
              fill="none"
              stroke={c.textMuted}
              strokeWidth="2.4"
              strokeDasharray="3.5 3.5"
            />
          )}
        </Svg>
      </Animated.View>
      {showLabel && (
        <Text style={{
          fontSize: 10.5,
          fontWeight: '800',
          color: state === 'current' ? CORAL : c.textMuted,
        }}>
          {index + 1}
        </Text>
      )}
    </TouchableOpacity>
  );
}
