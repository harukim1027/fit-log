/**
 * 세팅 검증용 예시 스토리.
 * 실제 디자인 시스템 컴포넌트는 다음 세션에서 design-system/components/에 추가한다.
 * react-native 프리미티브가 react-native-web으로 정상 변환되는지 확인하는 용도다.
 */
import React from "react";
import { View, Text } from "react-native";
import type { Meta, StoryObj } from "@storybook/react";

function Welcome({ label }: { label: string }) {
  return (
    <View
      style={{
        padding: 24,
        borderRadius: 24,
        backgroundColor: "#21272F",
        borderWidth: 1,
        borderColor: "#384049",
        gap: 8,
      }}>
      <Text style={{ fontSize: 12, fontWeight: "600", color: "#909AA6" }}>
        Harulog Design System
      </Text>
      <Text style={{ fontSize: 22, fontWeight: "900", color: "#E0E6EC" }}>{label}</Text>
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
