/**
 * @file design-system/tokens/index.ts
 * @description 디자인 시스템이 앱 토큰에 접근하는 유일한 통로.
 *
 * design-system/ 내부 컴포넌트는 앱 코드(constants/, store/)를 직접 import 하지
 * 않는다. 전부 이 파일을 거친다. 나중에 패키지로 분리할 때 이 파일만 교체하면 된다.
 *
 * 색 값을 여기에 복제하지 않는다 — constants/colors.ts가 단일 진실 소스다.
 * spacing/radius 수치 토큰은 앱에 아직 없다. Card에서 필요한 값이 확정된 뒤
 * Phase 1-B에서 만든다(지금 만들면 근거 없는 스케일이 굳는다).
 */
export { useColors, lightColors, darkColors } from "../../constants/colors";
export type { ThemeColors } from "../../constants/colors";

import type { ThemeColors } from "../../constants/colors";

/**
 * 강조색 토큰 키. ThemeColors에서 계층·텍스트 역할을 뺀 나머지다.
 * 원시 hex 문자열 대신 이 유니온으로 받아야 팔레트 밖 색이 새어 들어오지 않는다.
 */
export type AccentToken =
  | "primary"
  | "secondary"
  | "success"
  | "warning"
  | "danger"
  | "diet"
  | "workout"
  | "stats"
  | "water"
  | "carb"
  | "protein"
  | "fat"
  | "tagCoral"
  | "tagMint"
  | "tagSun";

// AccentToken이 ThemeColors 키에서 벗어나면 컴파일 시점에 잡힌다.
// colors.ts에서 키를 지우거나 이름을 바꾸면 여기서 에러가 난다.
type AssertAccentKeys = AccentToken extends keyof ThemeColors ? true : never;
const _assertAccentKeys: AssertAccentKeys = true;
void _assertAccentKeys;

/**
 * 강조색 배경 틴트를 **불투명 색으로 미리 합성**해서 돌려준다.
 *
 * 앱의 StatCard 등은 `accent + "18"` 8자리 hex를 쓴다(0x18 = 24/255 ≈ 9%).
 * 결과 픽셀은 같지만 여기서는 알파를 남기지 않는다. 두 가지 이유다:
 *
 * 1. 접근성 검사기(axe 등)가 반투명 배경의 합성색을 신뢰성 있게 풀지 못한다.
 *    투명 조상을 만나면 흰색으로 가정해 다크 테마에서 없는 대비 위반을 만든다.
 *    실제로 accent 스토리에서 그렇게 잡혔다.
 * 2. 알파 색은 부모 배경에 따라 결과가 달라진다. 카드가 캔버스가 아니라
 *    surface 블록 위에 놓이면 의도한 틴트가 나오지 않는다. 캔버스 기준으로
 *    미리 합성하면 어디에 놓이든 같은 색이 나온다.
 */
export function accentTint(colors: ThemeColors, token: AccentToken): string {
  const fg = parseInt(colors[token].replace("#", ""), 16);
  const bg = parseInt(colors.background.replace("#", ""), 16);
  const a = 0x18 / 255;
  const ch = (shift: number) =>
    Math.round((((fg >> shift) & 255) * a) + (((bg >> shift) & 255) * (1 - a)));
  return (
    "#" +
    ((1 << 24) + (ch(16) << 16) + (ch(8) << 8) + ch(0)).toString(16).slice(1)
  );
}

/**
 * 라이트 모드 전용 카드 그림자.
 *
 * DESIGN.md 규칙: "그림자는 라이트 모드에서만 허용한다. 다크의 계층 분리는
 * surface 명도 차이 또는 border.hairline으로 만든다."
 * shadow.light의 구체값은 DESIGN.md Governance에 unresolved로 기록돼 있어
 * 확정 토큰이 없다. 값이 정해지면 이 상수를 토큰 참조로 교체할 것.
 */
export const LIGHT_CARD_SHADOW = {
  shadowColor: "#000",
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
  elevation: 2,
} as const;
