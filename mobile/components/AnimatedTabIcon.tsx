import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  name: React.ComponentProps<typeof Ionicons>['name'];
  size: number;
  color: string;
  focused: boolean;
  accentColor: string;
};

export default function AnimatedTabIcon({ name, size, color, focused, accentColor }: Props) {
  const scale = useRef(new Animated.Value(focused ? 1.18 : 1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.18 : 1,
      useNativeDriver: true,
      damping: 10,
      stiffness: 260,
    }).start();
  }, [focused]);

  return (
    <Animated.View
      style={[
        { transform: [{ scale }] },
        focused && {
          backgroundColor: accentColor + '28',
          borderRadius: 14,
          paddingHorizontal: 14,
          paddingVertical: 5,
        },
      ]}>
      <Ionicons name={name} size={size} color={color} />
    </Animated.View>
  );
}
