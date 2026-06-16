/**
 * @file components/workout/NLQuickLogBox.tsx
 * @description "AI로 빠르게 기록" 입력 박스 (오늘 운동 상단).
 *
 * 자연어 한 줄 입력 → 파싱 → 즉시 저장. 결과는 NLResultBanner가 표시한다.
 * 모호하면(needs_clarification) 저장 없이 질문을 인라인으로 보여준다.
 * "직접 추가"로 수동 입력 모달도 연다.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '../../constants/colors';
import { useNLLogStore } from '../../store/nlLogStore';

export function NLQuickLogBox() {
  const c = useColors();
  const router = useRouter();
  const quickLog = useNLLogStore((s) => s.quickLog);
  const loading = useNLLogStore((s) => s.loading);

  const [text, setText] = useState('');
  const [question, setQuestion] = useState<string | null>(null);

  const submit = async () => {
    const t = text.trim();
    if (!t || loading) return;
    setQuestion(null);
    try {
      const res = await quickLog(t);
      if (res.status === 'needs_clarification') {
        setQuestion(res.question ?? '조금 더 자세히 알려주세요');
      } else {
        setText(''); // 저장됨 → 입력 비움 (결과는 배너로)
      }
    } catch {
      setQuestion('기록에 실패했어요. 잠시 후 다시 시도해 주세요');
    }
  };

  return (
    <View
      style={{
        backgroundColor: c.surface,
        borderRadius: 16,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: c.surfaceAlt,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 13, fontWeight: '800', color: c.textSecondary }}>
          ⚡ AI로 빠르게 기록
        </Text>
        <TouchableOpacity onPress={() => router.push('/modal/add-exercises')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', color: c.primary }}>직접 추가</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="예: 벤치 60 5x5, 스쿼트 100 3x8"
          placeholderTextColor={c.textMuted}
          onSubmitEditing={submit}
          returnKeyType="done"
          style={{
            flex: 1,
            fontSize: 14,
            color: c.textPrimary,
            backgroundColor: c.surfaceAlt,
            borderRadius: 12,
            paddingHorizontal: 12,
            paddingVertical: 10,
          }}
        />
        <TouchableOpacity
          onPress={submit}
          disabled={loading || !text.trim()}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 11,
            borderRadius: 12,
            backgroundColor: !text.trim() || loading ? c.textMuted : c.primary,
            minWidth: 60,
            alignItems: 'center',
          }}>
          {loading ? (
            <ActivityIndicator size="small" color={c.onAccent} />
          ) : (
            <Text style={{ fontSize: 14, fontWeight: '800', color: c.onAccent }}>기록</Text>
          )}
        </TouchableOpacity>
      </View>

      {!!question && (
        <Text style={{ fontSize: 12, color: c.danger, marginTop: 8 }}>{question}</Text>
      )}
    </View>
  );
}
