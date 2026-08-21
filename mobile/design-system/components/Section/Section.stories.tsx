import React from "react";
import { View, Text, Pressable } from "react-native";
import type { Meta, StoryObj } from "@storybook/react";
import { Section } from "./Section";
import { Card } from "../Card";
import { useColors, type AccentToken } from "../../tokens";

/* 스토리에서만 쓰는 보조 요소. 색은 훅을 거친다(hex 하드코딩 금지). */

function Body({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return (
    <Text style={{ fontSize: 14, fontWeight: "600", color: c.textSecondary, lineHeight: 20 }}>
      {children}
    </Text>
  );
}

/** 홈의 "최근 기록" 섹션이 쓰는 카운트 표기 (numeric 15/800). */
function Count({ children }: { children: React.ReactNode }) {
  const c = useColors();
  return (
    <Text
      style={{
        fontSize: 15,
        fontWeight: "800",
        color: c.textSecondary,
        fontVariant: ["tabular-nums"],
      }}>
      {children}
    </Text>
  );
}

/** 아이콘 대체용 색 점. AppIcons를 끌어오지 않으려고 도형으로 대신한다. */
function Dot({ tone = "primary" }: { tone?: AccentToken }) {
  const c = useColors();
  return (
    <View
      style={{ width: 14, height: 14, borderRadius: 999, backgroundColor: c[tone] }}
    />
  );
}

/** Action 사례 ①: 텍스트 링크형 (홈 "전체 보기"). */
function LinkAction() {
  const c = useColors();
  return (
    <Pressable
      onPress={() => {}}
      accessibilityRole="button"
      accessibilityLabel="전체 보기"
      style={{ minHeight: 44, justifyContent: "center" }}>
      <Text style={{ fontSize: 11, fontWeight: "700", color: c.primary }}>전체 보기 ›</Text>
    </Pressable>
  );
}

/** Action 사례 ②: 알약 버튼형 (운동 "운동 시작"). */
function ButtonAction() {
  const c = useColors();
  return (
    <Pressable
      onPress={() => {}}
      accessibilityRole="button"
      accessibilityLabel="운동 시작"
      style={{
        minHeight: 44,
        justifyContent: "center",
        backgroundColor: c.warning,
        borderRadius: 999,
        paddingHorizontal: 18,
      }}>
      <Text style={{ fontSize: 14, fontWeight: "800", color: c.onAccent }}>운동 시작</Text>
    </Pressable>
  );
}

const meta = {
  title: "Components/Section",
  component: Section,
} satisfies Meta<typeof Section>;

export default meta;
type Story = StoryObj<typeof meta>;

/** 가장 단순한 형태 */
export const TitleAndContent: Story = {
  name: "Title + Content",
  args: {
    children: (
      <>
        <Section.Title>이번 주 자극 부위</Section.Title>
        <Section.Content>
          <Card>
            <Body>제목과 콘텐츠 사이 간격은 12로 고정입니다.</Body>
          </Card>
        </Section.Content>
      </>
    ),
  },
};

/** Action 슬롯 ① 텍스트 링크 */
export const WithLinkAction: Story = {
  name: "Title + Action(텍스트 링크)",
  args: {
    children: (
      <>
        <Section.Title>최근 기록</Section.Title>
        <Section.Action>
          <LinkAction />
        </Section.Action>
        <Section.Content>
          <Card>
            <Body>Action은 우측 끝으로 밀리고 제목과 수직 중앙 정렬됩니다.</Body>
          </Card>
        </Section.Content>
      </>
    ),
  },
};

/**
 * Action 슬롯 ② 알약 버튼.
 * 같은 슬롯에 성격이 전혀 다른 요소가 들어가는 것을 보여준다 —
 * Action이 색·폰트·배경을 규정하지 않기 때문에 가능하다.
 */
export const WithButtonAction: Story = {
  name: "Title + Action(버튼)",
  args: {
    children: (
      <>
        <Section.Title>내 루틴</Section.Title>
        <Section.Action>
          <ButtonAction />
        </Section.Action>
        <Section.Content>
          <Card>
            <Body>Action 슬롯은 스타일을 강제하지 않습니다.</Body>
          </Card>
        </Section.Content>
      </>
    ),
  },
};

/** 홈 index.tsx의 1·2번 섹션 재현 — 제목 좌측에 아이콘과 카운트가 붙는다 */
export const TitleWithIconAndCount: Story = {
  name: "Title에 아이콘 + 카운트",
  args: {
    children: (
      <>
        <Section.Title>
          <Dot tone="warning" />
          최근 기록
          <Count>6</Count>
        </Section.Title>
        <Section.Action>
          <LinkAction />
        </Section.Action>
        <Section.Content>
          <Card>
            <Body>Title은 children을 그대로 배치합니다. 조합은 사용처가 정합니다.</Body>
          </Card>
        </Section.Content>
      </>
    ),
  },
};

/** 제목 없이 콘텐츠만 — 상단 간격이 붙지 않아야 한다 */
export const ContentOnly: Story = {
  name: "Content만",
  args: {
    children: (
      <Section.Content>
        <Card>
          <Body>제목 행이 없으면 Content에 상단 간격을 주지 않습니다.</Body>
        </Card>
      </Section.Content>
    ),
  },
};

/** Section.Content 안에 Card 3종을 조합 — Section은 Card를 import 하지 않는다 */
export const WithCardVariants: Story = {
  name: "Content 안에 Card 3종",
  args: {
    children: (
      <>
        <Section.Title>카드 조합</Section.Title>
        <Section.Content>
          <View style={{ gap: 12 }}>
            <Card variant="default">
              <Body>default</Body>
            </Card>
            <Card variant="nested">
              <Body>nested</Body>
            </Card>
            <Card variant="accent" accentColor="success">
              <Body>accent</Body>
            </Card>
          </View>
        </Section.Content>
      </>
    ),
  },
};

/** 긴 제목이 Action을 밀어내지 않고 Title 쪽이 줄어드는지 */
export const LongTitle: Story = {
  name: "긴 제목 오버플로우",
  args: {
    children: (
      <>
        <Section.Title>
          아주아주기이이이인섹션제목이Action을밀어내지않고줄어드는지확인합니다
        </Section.Title>
        <Section.Action>
          <LinkAction />
        </Section.Action>
        <Section.Content>
          <Card>
            <Body>Action은 flexShrink: 0이라 폭을 유지합니다.</Body>
          </Card>
        </Section.Content>
      </>
    ),
  },
};

/** 섹션 사이 간격은 부모가 준다 — Section은 외부 여백을 갖지 않는다 */
export const TwoSections: Story = {
  name: "섹션 2개 연속 (부모가 gap)",
  parameters: { controls: { disable: true } },
  args: { children: null },
  render: () => (
    <View style={{ gap: 20 }}>
      <Section>
        <Section.Title>최근 기록</Section.Title>
        <Section.Action>
          <LinkAction />
        </Section.Action>
        <Section.Content>
          <Card>
            <Body>첫 번째 섹션</Body>
          </Card>
        </Section.Content>
      </Section>
      <Section>
        <Section.Title>이번 주 자극 부위</Section.Title>
        <Section.Content>
          <Card>
            <Body>두 번째 섹션. 사이 간격 20은 부모의 gap이 만듭니다.</Body>
          </Card>
        </Section.Content>
      </Section>
    </View>
  ),
};
