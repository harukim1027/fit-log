/**
 * @file design-system/components/Section/Section.tsx
 * @description 화면 한 덩어리를 묶는 섹션. 제목 행 + 콘텐츠.
 *
 * ── 스타일 방식 ────────────────────────────────────────────────────────────
 * Card와 같다. 이 앱의 지배적 관례는 useColors() 기반 인라인 style 객체이므로
 * (색이 훅에서 오기 때문), 색 없는 정적 수치만 StyleSheet.create로 빼고
 * 테마 의존 색만 인라인으로 병합한다.
 *
 * ── Card와의 관계 ──────────────────────────────────────────────────────────
 * Section은 Card를 import 하지 않는다. Section.Content 안에 사용처가 Card를
 * 넣는 구조다. 컴포넌트 간 의존을 만들지 않는다.
 *
 * ── 설계 근거 ──────────────────────────────────────────────────────────────
 * 기존 화면의 섹션 헤더 5건(홈 2, 운동 2, 통계 1)을 조사해 정했다.
 * 타이포는 5건 전부 17/800 textPrimary로 이미 일치했다.
 *
 * Title은 children을 그대로 렌더한다. 홈의 두 섹션이
 * [아이콘][제목][카운트] 구조라 icon/count 슬롯을 따로 두면 그 조합만
 * 담기고 나머지는 못 담는다. 조합은 사용처가 정한다.
 *
 * Action은 스타일이 없는 슬롯이다. 실사용 3건이 텍스트 링크("전체 보기"),
 * 알약 버튼("운동 시작"), 접기/펼치기로 제각각이라 색·폰트·배경을 규정하면
 * 셋 중 하나도 못 담는다. 우측 정렬과 수직 중앙 정렬만 책임진다.
 */
import React, { createContext, useContext, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from "react-native";
import { useColors, type ThemeColors } from "../../tokens";

export interface SectionProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

interface SectionContextValue {
  colors: ThemeColors;
  /** 제목 행이 있는지. Content의 상단 간격을 줄지 판단하는 데 쓴다. */
  hasHeader: boolean;
}

const SectionContext = createContext<SectionContextValue | null>(null);

/** Section 밖에서 하위 컴포넌트를 쓰면 개발 중에 알려준다. */
function useSectionContext(componentName: string): SectionContextValue | null {
  const ctx = useContext(SectionContext);
  if (ctx === null && typeof __DEV__ !== "undefined" && __DEV__) {
    console.warn(
      `[design-system] ${componentName}는 <Section> 안에서만 써야 합니다. ` +
        `Section 밖에서는 제목 행 배치와 간격이 보장되지 않습니다.`
    );
  }
  return ctx;
}

// 색이 없는 정적 수치만. 근거는 DESIGN.md의 space 토큰과 기존 화면 실측이다.
// 수치 토큰 자체는 아직 앱에 없어 Phase 1-A 5개 완료 후 tokens/로 뺀다.
const styles = StyleSheet.create({
  // 섹션 외부 여백(margin/gap)은 두지 않는다.
  // 섹션 간 간격은 부모 컨테이너 책임. 홈 20 / 통계 12로 화면마다 다르므로
  // 컴포넌트가 정하지 않는다.
  root: {},
  // 제목 행. Title과 Action을 한 줄에 놓고 Action을 우측으로 민다.
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  // Title이 남는 폭을 먹어 Action을 우측 끝으로 밀고,
  // 제목이 길면 Action을 밀어내지 않고 Title 쪽이 줄어든다.
  titleSlot: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 17, fontWeight: "800", letterSpacing: -0.4 },
  // Action은 스타일이 없는 슬롯이다. 수직 중앙 정렬만 책임진다.
  action: { flexShrink: 0, justifyContent: "center" },
  // 제목 ↔ 콘텐츠 간격 12 고정. gap prop은 열지 않는다.
  // 홈 2건이 12, 운동 1건이 16인데 후자를 드리프트로 본다.
  // Phase 1-B에서 실물 확인 후 필요하면 토큰 기반으로 개방한다.
  content: { marginTop: 12 },
});

function SectionRoot({ children, style, testID }: SectionProps) {
  const colors = useColors();

  // Title/Action은 한 행에 묶고 나머지(Content 등)는 그 아래로 보낸다.
  // 사용처는 셋을 평평하게 나열하고, 행 구성은 여기서 책임진다.
  //
  // Fragment를 먼저 편다. <Section><>...</></Section>처럼 감싸면
  // React.Children.toArray가 Fragment 하나만 돌려줘 분류가 통째로 실패하고
  // Title/Action이 세로로 쌓인다(스토리에서 실제로 그렇게 나왔다).
  const flatten = (node: React.ReactNode): React.ReactNode[] =>
    React.Children.toArray(node).flatMap((child) =>
      React.isValidElement(child) && child.type === React.Fragment
        ? flatten((child.props as { children?: React.ReactNode }).children)
        : [child]
    );
  const kids = flatten(children);
  const isHeaderPart = (node: React.ReactNode) =>
    React.isValidElement(node) &&
    (node.type === SectionTitle || node.type === SectionAction);
  const header = kids.filter(isHeaderPart);
  const rest = kids.filter((k) => !isHeaderPart(k));

  const ctx = useMemo<SectionContextValue>(
    () => ({ colors, hasHeader: header.length > 0 }),
    [colors, header.length]
  );

  return (
    <SectionContext.Provider value={ctx}>
      <View testID={testID} style={[styles.root, style]}>
        {header.length > 0 ? <View style={styles.header}>{header}</View> : null}
        {rest}
      </View>
    </SectionContext.Provider>
  );
}

export interface SectionTitleProps {
  children: React.ReactNode;
  /** 제목 행 컨테이너 스타일. 텍스트 스타일은 textStyle로 준다. */
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
  testID?: string;
}

/**
 * 제목. children이 문자열이면 17/800 textPrimary로 감싸고,
 * 엘리먼트가 섞여 있으면(아이콘·카운트 등) 그대로 배치한다.
 */
function SectionTitle({ children, style, textStyle, testID }: SectionTitleProps) {
  const ctx = useSectionContext("Section.Title");
  const fallback = useColors();
  const colors = ctx?.colors ?? fallback;

  const nodes = React.Children.map(children, (child) =>
    typeof child === "string" || typeof child === "number" ? (
      <Text
        style={[styles.title, { color: colors.textPrimary }, textStyle]}
        numberOfLines={2}>
        {child}
      </Text>
    ) : (
      child
    )
  );

  return (
    <View
      testID={testID}
      accessibilityRole="header"
      style={[styles.titleSlot, style]}>
      {nodes}
    </View>
  );
}

export interface SectionSlotProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/**
 * 제목 우측 슬롯. 색·폰트·배경을 일절 지정하지 않는다 —
 * 텍스트 링크든 알약 버튼이든 사용처가 그대로 넣는다.
 */
function SectionAction({ children, style, testID }: SectionSlotProps) {
  useSectionContext("Section.Action");
  return (
    <View testID={testID} style={[styles.action, style]}>
      {children}
    </View>
  );
}

/**
 * 콘텐츠. 제목과의 간격 12를 여기서 만든다.
 * 제목 행이 없으면 위에 띄울 대상이 없으므로 간격을 주지 않는다.
 */
function SectionContent({ children, style, testID }: SectionSlotProps) {
  const ctx = useSectionContext("Section.Content");
  return (
    <View
      testID={testID}
      style={[ctx?.hasHeader === false ? null : styles.content, style]}>
      {children}
    </View>
  );
}

export const Section = Object.assign(SectionRoot, {
  Title: SectionTitle,
  Action: SectionAction,
  Content: SectionContent,
});
