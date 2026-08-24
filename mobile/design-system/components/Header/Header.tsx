/**
 * @file design-system/components/Header/Header.tsx
 * @description 화면 상단 헤더. 좌측 뒤로/닫기 + 중앙 제목 + 우측 커스텀 슬롯.
 *
 * ── 성격: 신규 설계가 아니라 이전 ──────────────────────────────────────────
 * components/ui/Header.tsx를 옮긴 것이다. 13개 호출부가 이미 이 컴포넌트
 * 하나를 쓰고 있고 prop 7개가 전부 실사용이라(title 13, showClose 8,
 * onClose 4, rightElement 3, subtitle 2, showBack 2, onBack 1) 제거하거나
 * 합칠 것이 없다. API는 그대로 두고 이전하면서 발견된 문제만 고쳤다.
 *
 * ── 이전하며 고친 것 ───────────────────────────────────────────────────────
 * 1. 뒤로/닫기 버튼이 40×40으로 target.min 44에 미달했다. hitSlop 10이
 *    있었지만 좌측 슬롯이 width 56이고 행도 minHeight 56이라 hitSlop이 부모
 *    밖으로 나가 보장되지 않았다. → IconButton으로 교체(박스 44 보장).
 * 2. 두 버튼에 accessibilityLabel이 없었다. → IconButton이 타입으로 강제한다.
 * 3. 제목이 17/700, 부제가 12/400이었다. DESIGN.md의 title 역할은 17/800,
 *    caption 역할은 12/600이다. → 굵기만 역할 값에 맞췄다.
 *    (tracking -0.2, line_height 1.25는 원본에 없었고 세로 배치가 미세하게
 *     달라지므로 이번 이전에서는 건드리지 않았다.)
 * 4. useColors를 constants/colors에서 직접 가져오던 것을 tokens/ 경유로 바꿨다.
 *
 * ── 의존성 ─────────────────────────────────────────────────────────────────
 * 이 컴포넌트만 예외적으로 tokens 밖을 import 한다. 셋 다 헤더의 본질이라
 * 뺄 수 없다고 판단했다.
 *
 *   IconButton   design-system 내부 의존. 다른 컴포넌트에는 없던 예외다.
 *                자체 구현해도 아래 둘은 남아 독립성이 회복되지 않는 반면,
 *                44 보장과 label 필수를 Header가 또 한 벌 구현해야 한다.
 *   AppIcons     chevronLeft·close 글리프. 자체 구현해도 아이콘은 그려야 하고,
 *                경로를 복제하면 앱과 모양이 갈린다.
 *   expo-router  좌측 버튼이 있는 10곳 중 5곳이 핸들러를 넘기지 않아
 *                router.back() 기본값에 의존한다(register, add-food,
 *                barcode-scan, routine-manage:359, set-target).
 *                없애려면 두 prop을 필수로 바꿔야 해서 API 재설계다.
 *
 * 패키지로 분리할 때 교체 지점은 tokens/ 하나가 아니라 셋이 된다.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { useColors, space } from "../../tokens";
import { IconButton } from "../IconButton";
import { Icon } from "../../../components/AppIcons";

export interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  showClose?: boolean;
  /** 우측 슬롯. 스타일을 강제하지 않는다 — 폭도 내용이 정한다. */
  rightElement?: React.ReactNode;
  /** 없으면 router.back() */
  onBack?: () => void;
  /** 없으면 router.back() */
  onClose?: () => void;
  testID?: string;
}

/**
 * 헤더 행 높이이자 좌우 슬롯의 기준 폭.
 *
 * 토큰으로 올리지 않는다 — Header 말고 쓰는 곳이 없다. 사용처가 하나인 값을
 * 토큰으로 승격하면 스케일에 근거 없는 칸이 생긴다(chip 10, sheet 24를
 * 추출하지 않은 것과 같은 판단이다). 두 번째 사용처가 생기면 그때 올린다.
 *
 * 좌우가 같은 값이어야 가운데 제목이 화면 중앙에 온다. 따로 떼지 말 것.
 */
const SLOT = 56;

// 색이 없는 정적 수치만.
const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: space[8],
    paddingBottom: space[10],
    minHeight: SLOT,
  },
  // 좌우 슬롯을 같은 폭으로 잡아 가운데 제목이 화면 중앙에 오게 한다.
  leftSlot: { width: SLOT, alignItems: "flex-start", justifyContent: "center" },
  titleSlot: { flex: 1, alignItems: "center", justifyContent: "center" },
  // 회귀 방지: width 고정이 아니라 minWidth다. rightElement에 아이콘 버튼을
  // 2개 이상 넣는 화면(통계: 테마토글+프로필+로그아웃 ≈ 116pt)이 있어서
  // 56pt로 고정하면 마지막 버튼이 화면 밖으로 잘린다. 가운데 제목이 flex:1
  // 이라 이 슬롯이 늘어난 만큼 알아서 줄어든다. 지우지 말 것.
  rightSlot: { minWidth: SLOT, alignItems: "flex-end", justifyContent: "center" },
  title: { fontSize: 17, fontWeight: "800" },
  subtitle: { fontSize: 12, fontWeight: "600", marginTop: space[2] },
});

export function Header({
  title,
  subtitle,
  showBack = false,
  showClose = false,
  rightElement,
  onBack,
  onClose,
  testID,
}: HeaderProps) {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const handleBack = onBack ?? (() => router.back());
  const handleClose = onClose ?? (() => router.back());

  return (
    <View
      testID={testID}
      style={[
        styles.root,
        { paddingTop: insets.top + 6, backgroundColor: c.background },
      ]}>
      <View style={styles.leftSlot}>
        {showBack ? (
          <IconButton
            accessibilityLabel="뒤로 가기"
            onPress={handleBack}
            variant="filled">
            <Icon name="chevronLeft" size={24} color={c.textPrimary} />
          </IconButton>
        ) : showClose ? (
          <IconButton
            accessibilityLabel="닫기"
            onPress={handleClose}
            variant="filled">
            <Icon name="close" size={18} color={c.textPrimary} />
          </IconButton>
        ) : null}
      </View>

      <View style={styles.titleSlot}>
        <Text
          style={[styles.title, { color: c.textPrimary }]}
          numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[styles.subtitle, { color: c.textSecondary }]}
            numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {/* rightElement가 없어도 minWidth 56이 자리를 잡아준다. 원본에는 여기
          폭 40짜리 빈 View를 넣는 분기가 있었지만, 슬롯이 minWidth 56이라
          넣으나 마나 슬롯 폭이 56으로 같아 아무 일도 하지 않는 코드였다. */}
      <View style={styles.rightSlot}>{rightElement}</View>
    </View>
  );
}
