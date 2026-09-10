/**
 * @file app/routine/_HistorySheet.tsx
 * @description 지난 운동 세션에서 종목을 가져오는 바텀시트.
 *
 * 파일명이 `_` 로 시작해 expo-router 가 라우트로 잡지 않는다.
 *
 * `edit.tsx` 에서 뺐다. 성격이 독립적이다 — 루틴 편집의 일부가 아니라
 * "다른 데서 가져오기"라는 별개 동작이고, 편집 화면의 상태를 읽지 않고
 * 고른 세션 하나만 돌려준다.
 *
 * 읽기 전용 목록이라 닫아도 잃을 것이 없다. 미저장 가드가 없고 뒤로가기는
 * 그냥 닫는다.
 */
import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Modal } from "react-native";
import { useColors } from "../../constants/colors";
import type { WorkoutSession } from "../../types/workout";
import { IconButton } from "../../design-system";
import { Icon } from "../../components/AppIcons";
import { SCRIM } from "./_helpers";

export function HistorySheet({
  visible,
  sessions,
  onPick,
  onClose,
}: {
  visible: boolean;
  sessions: WorkoutSession[];
  /** 고른 세션. 종목을 초안에 어떻게 합칠지는 부모가 정한다. */
  onPick: (session: WorkoutSession) => void;
  onClose: () => void;
}) {
  const c = useColors();
  return (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={() => onClose()}>
    <View style={{ flex: 1, backgroundColor: SCRIM, justifyContent: 'flex-end' }}>
      <View style={{ backgroundColor: c.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%', paddingBottom: 32 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: c.border }}>
          <Text style={{ fontSize: 17, fontWeight: '800', color: c.textPrimary }}>운동 기록에서 불러오기</Text>
          <IconButton
            accessibilityLabel="닫기"
            onPress={() => onClose()}>
            <Icon name="close" size={20} color={c.textMuted} />
          </IconButton>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          {sessions.slice(0, 30).map(session => (
            <TouchableOpacity
              key={session.id}
              style={{ backgroundColor: c.surfaceAlt, borderRadius: 16, padding: 16, marginBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
              onPress={() => onPick(session)}
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
  );
}
