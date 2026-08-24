import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { SafeAreaProvider, initialWindowMetrics } from "react-native-safe-area-context";
import type { Meta, StoryObj } from "@storybook/react";
import { Header } from "./Header";
import { IconButton } from "../IconButton";
import { useColors } from "../../tokens";
import { Icon } from "../../../components/AppIcons";

/**
 * Header는 useSafeAreaInsets를 쓰므로 Provider가 없으면 렌더되지 않는다.
 * 앱에서는 최상위 _layout이 감싸주지만 스토리에는 없어 여기서 채운다.
 * frame/insets를 고정값으로 주어 스토리 간 상단 여백이 흔들리지 않게 한다.
 */
const METRICS = initialWindowMetrics ?? {
  frame: { x: 0, y: 0, width: 320, height: 568 },
  insets: { top: 47, left: 0, right: 0, bottom: 34 },
};

/** 통계 화면의 우측 슬롯 재현 — 아이콘 버튼 3개 ≈ 116pt. */
function ThreeActions() {
  const c = useColors();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
      <IconButton accessibilityLabel="테마 전환" onPress={() => {}} variant="filled">
        <Icon name="bulb" size={20} color={c.textPrimary} />
      </IconButton>
      <IconButton accessibilityLabel="프로필 편집" onPress={() => {}}>
        <Icon name="person" size={22} color={c.success} />
      </IconButton>
      <IconButton accessibilityLabel="로그아웃" onPress={() => {}}>
        <Icon name="logout" size={22} color={c.danger} />
      </IconButton>
    </View>
  );
}

/** onboarding의 우측 슬롯 재현 — 텍스트 버튼. */
function SkipAction() {
  const c = useColors();
  return (
    <TouchableOpacity
      onPress={() => {}}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel="건너뛰기"
      style={{ minHeight: 44, justifyContent: "center", paddingHorizontal: 8 }}>
      <Text style={{ fontSize: 14, fontWeight: "600", color: c.textSecondary }}>
        건너뛰기
      </Text>
    </TouchableOpacity>
  );
}

const meta = {
  title: "Components/Header",
  component: Header,
  decorators: [
    (Story) => (
      <SafeAreaProvider initialMetrics={METRICS}>
        <Story />
      </SafeAreaProvider>
    ),
  ],
  parameters: {
    // 헤더는 화면 좌우 끝까지 채우는 컴포넌트다. 기본 레이아웃은 본문에
    // 16px 패딩을 넣어 폭을 288로 줄이므로 클리핑 검증이 실물과 어긋난다.
    layout: "fullscreen",
  },
  argTypes: {
    onBack: { action: "back" },
    onClose: { action: "close" },
    showBack: { control: "boolean" },
    showClose: { control: "boolean" },
  },
  args: {
    title: "루틴 관리",
    onBack: () => {},
    onClose: () => {},
  },
} satisfies Meta<typeof Header>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 탭 화면 — 좌우 버튼 없이 제목만. 실사용 2곳(운동, 식단). */
export const TitleOnly: Story = {
  name: "title만",
  args: { title: "운동" },
};

/** 실사용 2곳(통계, 식품 추가). 부제는 caption 12/600. */
export const WithSubtitle: Story = {
  name: "title + subtitle",
  args: { title: "통계", subtitle: "김하루" },
};

/** 실사용 2곳(회원가입, 온보딩). */
export const WithBack: Story = {
  name: "showBack",
  args: { title: "회원가입", showBack: true },
};

/** 실사용 8곳으로 가장 많다. 모달 계열이 전부 이 형태다. */
export const WithClose: Story = {
  name: "showClose",
  args: { title: "목표 설정", showClose: true },
};

/** showBack과 showClose를 함께 주면 뒤로가기가 이긴다(원본 동작 유지). */
export const BackWinsOverClose: Story = {
  name: "showBack + showClose (뒤로가기 우선)",
  args: { title: "둘 다 지정", showBack: true, showClose: true },
};

/** rightElement — 아이콘 버튼 3개. 실사용은 통계 화면. */
export const WithRightElement: Story = {
  name: "rightElement (버튼형)",
  args: {
    title: "통계",
    subtitle: "김하루",
    rightElement: <ThreeActions />,
  },
};

/**
 * ★ 회귀 방지 슬롯.
 *
 * 우측 슬롯이 width 56 고정이던 시절, rightElement가 56pt를 넘으면 넘친 만큼
 * 화면 밖으로 잘렸다. 통계 화면이 아이콘 버튼 3개(≈116pt)를 넣어 로그아웃
 * 아이콘이 통째로 보이지 않았다(571d304에서 minWidth로 고쳐졌다).
 *
 * 320 폭에서 긴 제목까지 겹쳐도 우측 버튼 3개가 전부 보이고 제목만 줄어드는지
 * 확인한다. 우측 버튼이 하나라도 잘리면 회귀다.
 */
export const LongTitleWithRightElement: Story = {
  name: "긴 title + rightElement (클리핑 회귀 방지)",
  args: {
    title: "아주아주기이이이인화면제목이우측버튼을밀어내지않는지확인합니다",
    rightElement: <ThreeActions />,
  },
};

/** 좌우가 동시에 찬 경우 — 닫기 + 텍스트 액션. 실사용은 식품 추가/온보딩. */
export const CloseAndRight: Story = {
  name: "showClose + rightElement",
  args: {
    title: "식품 추가",
    subtitle: "아침",
    showClose: true,
    rightElement: <SkipAction />,
  },
};
