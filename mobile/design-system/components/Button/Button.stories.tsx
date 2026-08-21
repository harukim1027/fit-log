import React from "react";
import { View, Text } from "react-native";
import type { Meta, StoryObj } from "@storybook/react";
import { Button } from "./Button";
import { useColors } from "../../tokens";

function Caption({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return (
    <Text style={{ fontSize: 12, fontWeight: "600", color: c.textSecondary }}>
      {children}
    </Text>
  );
}

const meta = {
  title: "Components/Button",
  component: Button,
  argTypes: {
    onPress: { action: "pressed" },
    disabled: { control: "boolean" },
    loading: { control: "boolean" },
  },
  args: { children: "저장", onPress: () => {}, disabled: false, loading: false },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 기본 — 전체 폭 CTA */
export const Default: Story = {};

/** disabled — opacity 0.5 + 입력 차단 */
export const Disabled: Story = {
  args: { children: "저장", disabled: true },
};

/**
 * loading — 라벨이 스피너로 바뀌고 입력이 막힌다.
 * Actions 패널에 pressed 이벤트가 찍히지 않는 것으로 차단을 확인할 수 있다.
 */
export const Loading: Story = {
  args: { children: "저장 중", loading: true },
};

/** 긴 라벨 — 한 줄로 말줄임된다 */
export const LongLabel: Story = {
  name: "긴 라벨",
  args: {
    children: "아주아주기이이이인라벨이버튼폭을넘을때어떻게되는지확인합니다",
  },
};

/**
 * style로 폭을 좁힌 케이스.
 * fullWidth prop 없이도 호출부가 오버라이드로 대응 가능함을 보인다.
 */
export const NarrowViaStyle: Story = {
  name: "style로 폭 좁히기",
  args: {
    children: "권한 허용",
    style: { alignSelf: "center", paddingHorizontal: 32 },
  },
};

/**
 * 세 상태를 한 화면에 나열한다.
 * 배경 툴바에서 다크/라이트를 전환해 대비를 비교하는 용도다.
 */
export const AllStates: Story = {
  name: "다크/라이트 대비",
  parameters: { controls: { disable: true } },
  args: { children: null, onPress: () => {} },
  render: () => (
    <View style={{ gap: 16 }}>
      <View style={{ gap: 8 }}>
        <Caption>기본</Caption>
        <Button onPress={() => {}}>저장</Button>
      </View>
      <View style={{ gap: 8 }}>
        <Caption>disabled</Caption>
        <Button onPress={() => {}} disabled>
          저장
        </Button>
      </View>
      <View style={{ gap: 8 }}>
        <Caption>loading</Caption>
        <Button onPress={() => {}} loading>
          저장 중
        </Button>
      </View>
    </View>
  ),
};
