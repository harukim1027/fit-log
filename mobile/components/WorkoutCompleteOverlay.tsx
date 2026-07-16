import React, { useEffect, useRef } from 'react';
import { Text, View, TouchableOpacity, Animated } from 'react-native';
import { Icon, FlameIcon } from './AppIcons';
import { useColors } from '../constants/colors';

type Props = {
  visible: boolean;
  calories: number;
  onDismiss: () => void;
};

export default function WorkoutCompleteOverlay({ visible, calories, onDismiss }: Props) {
  const c = useColors();
  const bgOpacity = useRef(new Animated.Value(0)).current;
  const cardY = useRef(new Animated.Value(80)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const emojiScale = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(bgOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(cardY, { toValue: 0, damping: 20, stiffness: 150, useNativeDriver: true }),
        Animated.sequence([
          Animated.delay(180),
          Animated.spring(emojiScale, { toValue: 1.3, damping: 6, stiffness: 200, useNativeDriver: true }),
          Animated.spring(emojiScale, { toValue: 1.0, damping: 12, stiffness: 200, useNativeDriver: true }),
        ]),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(bgOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(cardY, { toValue: 80, duration: 220, useNativeDriver: true }),
      ]).start();
      emojiScale.setValue(0);
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <Animated.View
      style={{
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(30, 80, 65, 0.50)',
        justifyContent: 'center',
        alignItems: 'center',
        opacity: bgOpacity,
      }}
      pointerEvents="auto">
      <Animated.View
        style={{
          backgroundColor: c.surface,
          borderRadius: 32,
          padding: 36,
          alignItems: 'center',
          width: '84%',
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.18,
          shadowRadius: 20,
          elevation: 12,
          opacity: cardOpacity,
          transform: [{ translateY: cardY }],
        }}>
        <Animated.View style={{ marginBottom: 16, transform: [{ scale: emojiScale }] }}>
          <Icon name="trophy" size={68} color={c.stats} />
        </Animated.View>
        <Text style={{ fontSize: 24, fontWeight: '800', color: c.textPrimary, marginBottom: 8, textAlign: 'center' }}>
          운동 완료!
        </Text>
        {calories > 0 && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 28 }}>
            <FlameIcon size={18} color={c.danger} />
            <Text style={{ fontSize: 17, color: c.danger, fontWeight: '700' }}>
              {calories} kcal 소모
            </Text>
          </View>
        )}
        <TouchableOpacity
          style={{
            backgroundColor: c.primary,
            borderRadius: 22,
            paddingHorizontal: 44,
            paddingVertical: 14,
          }}
          onPress={onDismiss}
          activeOpacity={0.8}>
          <Text style={{ color: c.onAccent, fontWeight: '800', fontSize: 16 }}>완료</Text>
        </TouchableOpacity>
      </Animated.View>
    </Animated.View>
  );
}
