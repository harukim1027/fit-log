/**
 * 세팅 검증용 예시 스토리.
 * 실제 디자인 시스템 컴포넌트는 다음 세션에서 design-system/components/에 추가한다.
 * react-native 프리미티브가 react-native-web으로 정상 변환되는지 확인하는 용도다.
 */
import React from "react";
import { View, Text } from "react-native";
import type { Meta, StoryObj } from "@storybook/react";
import { useColors } from "./tokens";

function Welcome({ label }: { label: string }) {
  const c = useColors();
  return (
    <View
      style={{
        padding: 24,
        borderRadius: 24,
        backgroundColor: c.surface,
        borderWidth: 1,
        borderColor: c.border,
        gap: 8,
      }}>
      <Text style={{ fontSize: 12, fontWeight: "600", color: c.textSecondary }}>
        Harulog Design System
      </Text>
      <Text style={{ fontSize: 22, fontWeight: "900", color: c.textPrimary }}>{label}</Text>
    </View>
  );
}

const meta = {
  title: "Welcome",
  component: Welcome,
  args: { label: "Storybook 세팅 완료" },
} satisfies Meta<typeof Welcome>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
