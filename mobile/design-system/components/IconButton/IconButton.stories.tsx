import React from "react";
import { View, Text } from "react-native";
import type { Meta, StoryObj } from "@storybook/react";
import { IconButton } from "./IconButton";
import { useColors } from "../../tokens";
/**
 * 스토리에서만 앱의 실제 아이콘을 끌어온다.
 *
 * IconButton 자체는 아이콘을 import 하지 않는다 — children으로 무엇이든 받는다.
 * 다만 "서로 다른 아이콘 컴포넌트가 각자 크기를 갖고 섞여도 되는가"가 이
 * 컴포넌트의 핵심 전제라, 그 검증만큼은 도형 대용품이 아니라 실물로 해야 한다.
 * (Section 스토리는 장식용 자리표시자였기에 반대로 도형을 썼다.)
 * 스토리 전용 의존이라 design-system을 패키지로 떼어낼 때 따라가지 않는다.
 */
import { Icon, FlameIcon, HeartIcon } from "../../../components/AppIcons";

function Caption({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return (
    <Text style={{ fontSize: 12, fontWeight: "600", color: c.textSecondary }}>
      {children}
    </Text>
  );
}

/** 터치 영역을 눈으로 보려고 점선을 두르는 래퍼. 스토리 전용이다. */
function HitBox({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderWidth: 1,
        borderStyle: "dashed",
        borderColor: c.danger,
      }}>
      {children}
    </View>
  );
}

const meta = {
  title: "Components/IconButton",
  component: IconButton,
  argTypes: {
    onPress: { action: "pressed" },
    variant: { control: "radio", options: ["plain", "filled"] },
    disabled: { control: "boolean" },
  },
  args: {
    // IconChevron은 함수 선언이라 호이스팅된다(파일 하단에 정의).
    children: <IconChevron />,
    accessibilityLabel: "닫기",
    onPress: () => {},
    variant: "plain",
    disabled: false,
  },
} satisfies Meta<typeof IconButton>;

export default meta;
type Story = StoryObj<typeof meta>;

/** plain — 컨테이너 장식 없음. 실사용 17건. */
export const Plain: Story = {};

/** filled — surfaceAlt 배경 + pill radius. 실사용 16건. */
export const Filled: Story = {
  args: { variant: "filled" },
};

/** disabled — opacity 0.5 + 입력 차단 */
export const Disabled: Story = {
  args: { variant: "filled", disabled: true },
};

/**
 * 작은 아이콘에서도 터치 영역이 44를 유지하는지.
 * 점선이 IconButton의 실제 박스다 — 13px 아이콘이 들어가도 44×44로 유지된다.
 * 실사용 37건 중 23건이 44에 도달할 수단이 없던 것이 이 컴포넌트를 만든 이유다.
 */
export const TouchTarget: Story = {
  args: { children: <IconChevron /> },
  name: "작은 아이콘 + 터치영역 44",
  parameters: { controls: { disable: true } },
  render: () => (
    <View style={{ gap: 16 }}>
      {[13, 18, 28].map((size) => (
        <View key={size} style={{ gap: 6 }}>
          <Caption>아이콘 {size}px — 박스는 44×44</Caption>
          <HitBox>
            <IconButton accessibilityLabel={`${size}픽셀 아이콘 버튼`} onPress={() => {}}>
              <IconChevron size={size} />
            </IconButton>
          </HitBox>
        </View>
      ))}
    </View>
  ),
};

/**
 * 서로 다른 아이콘 컴포넌트를 섞는다.
 * IconButton은 크기를 정하지 않으므로 각 아이콘의 기본 크기가 그대로 산다.
 */
export const MixedIcons: Story = {
  args: { children: <IconChevron /> },
  name: "아이콘 컴포넌트 혼용",
  parameters: { controls: { disable: true } },
  render: () => (
    <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
      <IconButton accessibilityLabel="뒤로" onPress={() => {}} variant="filled">
        <IconChevron />
      </IconButton>
      <IconButton accessibilityLabel="이번 주 연속 기록" onPress={() => {}} variant="filled">
        <FlameIcon size={20} />
      </IconButton>
      <IconButton accessibilityLabel="즐겨찾기" onPress={() => {}} variant="filled">
        <HeartIcon size={20} />
      </IconButton>
      <IconButton accessibilityLabel="삭제" onPress={() => {}}>
        <IconTrash />
      </IconButton>
    </View>
  ),
};

/** 두 variant를 나란히 놓고 배경 툴바로 다크/라이트를 비교한다. */
export const AllVariants: Story = {
  args: { children: <IconChevron /> },
  name: "다크/라이트 대비",
  parameters: { controls: { disable: true } },
  render: () => (
    <View style={{ gap: 16 }}>
      {(["plain", "filled"] as const).map((variant) => (
        <View key={variant} style={{ gap: 8 }}>
          <Caption>{variant}</Caption>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <IconButton
              accessibilityLabel={`${variant} 기본`}
              onPress={() => {}}
              variant={variant}>
              <IconChevron />
            </IconButton>
            <IconButton
              accessibilityLabel={`${variant} 비활성`}
              onPress={() => {}}
              variant={variant}
              disabled>
              <IconChevron />
            </IconButton>
          </View>
        </View>
      ))}
    </View>
  ),
};

/* 스토리에서 반복 쓰는 아이콘. 색은 훅을 거친다(hex 하드코딩 금지). */

function IconChevron({ size = 22 }: { size?: number }) {
  const c = useColors();
  return <Icon name="chevronLeft" size={size} color={c.textPrimary} />;
}

function IconTrash() {
  const c = useColors();
  return <Icon name="trash" size={20} color={c.danger} />;
}
