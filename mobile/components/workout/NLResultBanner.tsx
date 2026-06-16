/**
 * @file components/workout/NLResultBanner.tsx
 * @description NL/수동 저장 직후 상단에 슬라이드 인되는 결과 배너.
 *
 * - "벤치프레스 외 N종목 기록됨" + [되돌리기] (5초 내)
 * - unmatched가 있으면 "N개 운동 선택" CTA → UnmatchedResolver
 * - 5초 후 자동 숨김 (Undo 창과 동일). resolver 열려 있는 동안은 유지.
 */
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Text, TouchableOpacity, View } from 'react-native';
import { useColors } from '../../constants/colors';
import { useNLLogStore, UNDO_WINDOW_MS } from '../../store/nlLogStore';
import { UnmatchedResolver } from './UnmatchedResolver';

export function NLResultBanner() {
  const c = useColors();
  const resultAt = useNLLogStore((s) => s.resultAt);
  const saved = useNLLogStore((s) => s.saved);
  const unmatched = useNLLogStore((s) => s.unmatched);
  const undoIds = useNLLogStore((s) => s.undoIds);
  const sessionId = useNLLogStore((s) => s.sessionId);
  const undo = useNLLogStore((s) => s.undo);
  const clearResult = useNLLogStore((s) => s.clearResult);

  const [resolverOpen, setResolverOpen] = useState(false);
  const slide = useRef(new Animated.Value(-80)).current;

  const visible = resultAt !== null;

  useEffect(() => {
    if (visible) {
      Animated.spring(slide, { toValue: 0, useNativeDriver: true, damping: 16, stiffness: 180 }).start();
    } else {
      slide.setValue(-80);
    }
  }, [visible]);

  // 5초 자동 숨김 (resolver 열려 있으면 보류)
  useEffect(() => {
    if (!visible || resolverOpen) return;
    const t = setTimeout(() => clearResult(), UNDO_WINDOW_MS);
    return () => clearTimeout(t);
  }, [visible, resolverOpen, resultAt]);

  if (!visible) return null;

  const hasUnmatched = unmatched.length > 0;
  const first = saved[0]?.name;
  const label =
    saved.length === 0
      ? '기록할 운동을 선택해 주세요'
      : saved.length > 1
        ? `${first} 외 ${saved.length - 1}종목이 기록됐어요`
        : `${first}이(가) 기록됐어요`;

  return (
    <>
      <Animated.View
        style={{
          transform: [{ translateY: slide }],
          backgroundColor: c.primary,
          borderRadius: 14,
          padding: 12,
          marginBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 14, fontWeight: '800', color: c.onAccent }} numberOfLines={2}>
            {label}
          </Text>
          {hasUnmatched && (
            <Text style={{ fontSize: 12, color: c.onAccent, opacity: 0.85, marginTop: 2 }}>
              {unmatched.length}개 운동을 선택해 주세요
            </Text>
          )}
        </View>

        {hasUnmatched && (
          <TouchableOpacity
            onPress={() => setResolverOpen(true)}
            style={{ backgroundColor: c.onAccent, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: c.primary }}>선택</Text>
          </TouchableOpacity>
        )}

        {undoIds.length > 0 && (
          <TouchableOpacity
            onPress={() => undo()}
            style={{
              borderWidth: 1.5,
              borderColor: c.onAccent,
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 10,
            }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: c.onAccent }}>되돌리기</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {resolverOpen && (
        <UnmatchedResolver
          unmatched={unmatched}
          sessionId={sessionId ?? undefined}
          onClose={() => setResolverOpen(false)}
        />
      )}
    </>
  );
}
