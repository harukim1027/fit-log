/**
 * @file design-system/components/IconButton/IconButton.tsx
 * @description 아이콘만 있는 터치 요소.
 *
 * ── 범위 ───────────────────────────────────────────────────────────────────
 * 터치 요소 중 Text 자식이 0개이고 아이콘이 1개 이상인 것. AST로 센 실사용
 * 37건이며, 복합 자식이 섞인 사례는 0건이라 경계가 깨끗하다.
 * 라벨이 함께 있는 알약 버튼이나 칩은 담지 않는다 — 선택 상태 표현이
 * 서로 호환되지 않아 별도 Chip 후보로 남긴다.
 *
 * ── 이 컴포넌트의 핵심: accessibilityLabel 타입 필수 ────────────────────────
 * DESIGN.md는 "아이콘 단독 버튼에는 accessibilityLabel이 필수"라고 규정하지만
 * 실사용 37건 중 지키는 곳은 1건뿐이다. 문서 규칙은 강제력이 없어서 36건이
 * 조용히 어긋난 채 남았다.
 *
 * 그래서 accessibilityLabel을 optional로 두지 않는다. Phase 1-B에서 호출부를
 * 옮길 때 컴파일러가 36건을 전부 막아 세우게 하는 것이 목적이다.
 * 편의를 위해 optional로 완화하면 이 컴포넌트를 만드는 이유가 사라진다.
 *
 * ── 만들지 않은 것과 사유 ──────────────────────────────────────────────────
 * size     아이콘 크기는 실사용 13~28에 값이 11개로 흩어져 있고, 그 선택은
 *          주변 밀도에 딸린 판단이라 컴포넌트가 정할 수 없다. children으로
 *          받은 아이콘이 자기 크기를 가진다. Button의 size를 뺀 것과 같은 이유.
 * icon     name을 받아 내부에서 아이콘을 그리지 않는다. 실사용이 Icon,
 *          FlameIcon, HeartIcon 등 여러 컴포넌트에 걸쳐 있어 한 이름 체계로
 *          묶이지 않는다. children이면 무엇이든 들어간다.
 *
 * ── 스타일 방식 ────────────────────────────────────────────────────────────
 * Card·Section·Button과 같다. 색 없는 정적 수치만 StyleSheet.create로 빼고
 * 테마 의존 색은 인라인 병합한다.
 */
import React from "react";
import {
  TouchableOpacity,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { useColors } from "../../tokens";

/**
 * plain  25건. 컨테이너 장식 없이 아이콘만 놓는다.
 * filled 12건. 배경 + radius를 가진 덩어리로 보인다.
 *
 * Card의 elevated/outlined(실사용 0건)와 달리 양쪽 다 실사용이 두 자릿수라
 * variant로 둔다.
 */
export type IconButtonVariant = "plain" | "filled";

export interface IconButtonProps {
  /** 아이콘 엘리먼트. 크기·색은 이 엘리먼트가 스스로 정한다. */
  children: React.ReactNode;
  /**
   * 스크린리더가 읽을 이름. **필수다 — optional로 바꾸지 말 것.**
   * 아이콘에는 읽을 텍스트가 없어 이 값이 없으면 버튼의 정체가 사라진다.
   */
  accessibilityLabel: string;
  onPress: () => void;
  variant?: IconButtonVariant;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// 색이 없는 정적 수치만. 근거는 DESIGN.md의 target.min / radius 토큰이다.
const styles = StyleSheet.create({
  root: {
    // DESIGN.md target.min 44. 실사용 37건 중 24건이 44에 도달할 수단이
    // 전혀 없었다. 크기를 명시한 14건은 예외 없이 전부 44 미만이고
    // (38, 36, 32, 28 …), hitSlop을 쓴 13건을 더해도 13건만 남는다.
    //
    // DESIGN.md는 "아이콘이 작으면 hitSlop으로 채운다"고 적지만 여기서는
    // minWidth/minHeight를 쓴다. hitSlop은 부모가 overflow로 자르면 실제
    // 히트 영역이 따라 줄어 보장이 되지 않고, 렌더된 아이콘 크기를 모르는
    // 상태에서 채울 양을 계산할 수도 없다. 박스 자체를 44로 두면 조건 없이
    // 성립하고 실측으로 검증된다.
    //
    // 대신 밀집한 행에서는 레이아웃이 넓어진다. Phase 1-B에서 호출부를
    // 옮길 때 좁은 행을 눈으로 확인할 것.
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  filled: {
    // 실사용 12건의 radius는 pill/원형 7건 대 둥근사각 4건이다.
    // (999가 3건, 그리고 20 on 40 / 18 on 36 / rounded-[20px]처럼 박스 절반이라
    //  결국 원형인 것이 4건. 둥근사각은 12가 2건, 10이 2건.)
    // 다수인 pill을 기본값으로 두고, DESIGN.md가 radius.pill의 용처로 "버튼"을
    // 명시한 것과 이미 만든 Button이 999를 쓰는 것과도 맞는다.
    // 둥근사각이 필요한 호출부는 style로 borderRadius만 덮는다.
    borderRadius: 999,
  },
  // 비활성은 opacity로. Button과 같다.
  disabled: { opacity: 0.5 },
});

export function IconButton({
  children,
  accessibilityLabel,
  onPress,
  variant = "plain",
  disabled = false,
  style,
  testID,
}: IconButtonProps) {
  const c = useColors();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      // DESIGN.md opacity.pressed. Button과 동일하게 0.7로 고정한다.
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      testID={testID}
      style={[
        styles.root,
        variant === "filled" && styles.filled,
        // 배경은 surfaceAlt. filled 12건 중 6건으로 최다이고(surface 2건,
        // 나머지는 danger 틴트·동적 색 같은 일회성), DESIGN.md에서 surface-alt가
        // "카드 안의 행, 선택된 상태" 즉 L1 위에 얹는 채움으로 규정돼 있어
        // 의미도 맞는다.
        variant === "filled" && { backgroundColor: c.surfaceAlt },
        disabled && styles.disabled,
        style,
      ]}>
      {children}
    </TouchableOpacity>
  );
}
