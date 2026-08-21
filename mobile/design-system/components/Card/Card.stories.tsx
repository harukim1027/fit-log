import React from "react";
import { View, Text } from "react-native";
import type { Meta, StoryObj } from "@storybook/react";
import { Card } from "./Card";
import { useColors } from "../../tokens";

/**
 * 스토리 안에서 쓰는 텍스트. 색을 하드코딩하지 않으려고 훅을 거친다.
 * 크기·굵기는 DESIGN.md 타입 역할을 따른다(title 17/800, body 14/600, caption 12/600).
 */
function Title({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return (
    <Text style={{ fontSize: 17, fontWeight: "800", color: c.textPrimary }}>
      {children}
    </Text>
  );
}
function Body({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return (
    <Text style={{ fontSize: 14, fontWeight: "600", color: c.textSecondary, lineHeight: 20 }}>
      {children}
    </Text>
  );
}
function Caption({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return (
    <Text style={{ fontSize: 12, fontWeight: "600", color: c.textSecondary }}>
      {children}
    </Text>
  );
}

const meta = {
  title: "Components/Card",
  component: Card,
  argTypes: {
    variant: {
      control: { type: "radio" },
      options: ["default", "nested", "accent"],
      description: "default=L1 표준 카드, nested=L2 중첩 블록, accent=강조색 틴트",
    },
    accentColor: {
      control: { type: "select" },
      options: [
        "primary",
        "secondary",
        "success",
        "warning",
        "danger",
        "tagCoral",
        "tagMint",
        "tagSun",
      ],
      description: "variant=accent일 때만 적용",
    },
    onPress: { action: "pressed" },
  },
  args: { variant: "default" },
} satisfies Meta<typeof Card>;

export default meta;
type Story = StoryObj<typeof meta>;

/** variant: default — surface + 보더 + 라이트 전용 그림자 */
export const Default: Story = {
  args: {
    variant: "default",
    children: (
      <>
        <Title>이번 주 자극 부위</Title>
        <Body>표준 카드입니다. 캔버스(L0) 위에 놓이는 L1 컨테이너입니다.</Body>
      </>
    ),
  },
};

/** variant: nested — 카드 안에 놓이는 L2 블록. 보더·그림자 없음 */
export const Nested: Story = {
  args: {
    variant: "nested",
    children: (
      <>
        <Title>중첩 블록</Title>
        <Body>카드(L1) 안에서 한 계단 올라간 블록입니다. 입력 필드·선택된 행에 씁니다.</Body>
      </>
    ),
  },
};

/** variant: accent — 강조색 틴트 + 강조색 보더 */
export const Accent: Story = {
  args: {
    variant: "accent",
    accentColor: "success",
    children: (
      <>
        <Caption>운동일 평균 볼륨</Caption>
        <Title>12,400kg</Title>
      </>
    ),
  },
};

/** Body 슬롯만 쓰는 최소 사용 */
export const BodyOnly: Story = {
  name: "Body만 사용",
  args: {
    children: (
      <Card.Body>
        <Title>Body만</Title>
        <Body>Body는 카드의 padding을 건드리지 않고 행 간격(8)만 만듭니다.</Body>
      </Card.Body>
    ),
  },
};

/** Body + Footer 조합. Footer는 위쪽 구분선을 갖는다 */
export const BodyAndFooter: Story = {
  name: "Body + Footer",
  args: {
    children: (
      <>
        <Card.Body>
          <Title>주간 운동 볼륨</Title>
          <Body>Footer는 본문과 1px 구분선으로 나뉩니다.</Body>
        </Card.Body>
        <Card.Footer>
          <Caption>마지막 갱신 · 오늘</Caption>
        </Card.Footer>
      </>
    ),
  },
};

/** Compound를 쓰지 않고 children만 직접 넣는 경우 */
export const PlainChildren: Story = {
  name: "children 직접 (Compound 미사용)",
  args: {
    children: <Body>Card.Body 없이 children만 넣어도 정상 동작해야 합니다.</Body>,
  },
};

/** onPress가 있으면 Pressable + accessibilityRole="button" + 눌림 피드백 */
export const Pressable: Story = {
  name: "onPress 인터랙티브",
  args: {
    accessibilityLabel: "루틴 관리 열기",
    onPress: () => {},
    children: (
      <>
        <Title>루틴 관리</Title>
        <Body>탭하면 눌림 피드백(opacity 0.7)이 들어갑니다.</Body>
      </>
    ),
  },
};

/** 긴 텍스트가 카드를 넘치지 않고 줄바꿈되는지 */
export const LongContent: Story = {
  name: "긴 텍스트 오버플로우",
  args: {
    children: (
      <>
        <Title>아주아주기이이이이인단어가포함된제목이줄바꿈되는지확인합니다</Title>
        <Body>
          {"긴 본문입니다. ".repeat(20)}
        </Body>
        <Card.Footer>
          <Caption>{"꼬리말도 길어지면 줄바꿈됩니다. ".repeat(4)}</Caption>
        </Card.Footer>
      </>
    ),
  },
};

/**
 * accent variant를 강조색별로 나열한다.
 * 배경 툴바에서 다크/라이트를 전환하며 틴트와 보더 대비를 눈으로 비교하는 용도다.
 */
export const AccentPalette: Story = {
  name: "accent 다크/라이트 대비",
  parameters: { controls: { disable: true } },
  args: { children: null },
  render: () => (
    <View style={{ gap: 12 }}>
      {(["primary", "success", "danger", "warning", "tagMint"] as const).map((tone) => (
        <Card key={tone} variant="accent" accentColor={tone}>
          <Caption>{tone}</Caption>
          <Title>1,240kg</Title>
        </Card>
      ))}
    </View>
  ),
};
