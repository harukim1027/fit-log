/**
 * @file design-system/tokens/scale.ts
 * @description spacing / radius / size 수치 토큰.
 *
 * Phase 1-A 컴포넌트 5개(Card, Section, Button, IconButton, Header)가 실제로
 * 쓴 값만 담는다. 다섯 개가 나오기 전에는 뽑지 않았다 — 컴포넌트 한둘의
 * 우연한 선택이 전체 스케일로 굳는 것을 막기 위해서다.
 *
 * ── ★ 값이 같아도 축이 다르면 별도 토큰이다 ────────────────────────────────
 *
 * `radius.control`(12)과 `space[12]`는 숫자가 같지만 분리한다. `radius.card`(16)와
 * `space[16]`도 마찬가지다. 실제로 Card는 한 스타일 안에서 두 축을 겸한다:
 *
 *   nested:  { borderRadius: 12, padding: 12 }
 *   default: { borderRadius: 16, padding: 16 }
 *
 * 숫자가 같다고 한 토큰으로 묶으면 "카드 모서리만 더 둥글게" 같은 변경이
 * 패딩까지 끌고 간다. 두 축은 우연히 같은 값을 가질 뿐 함께 움직여야 할
 * 이유가 없다. 참조하는 쪽은 항상 **의미에 맞는 축**을 고른다.
 *
 * ── 네이밍: space는 값 기반, radius는 의미 기반 ────────────────────────────
 *
 * space는 `space[8]`처럼 값을 키로 쓴다. `space.sm` 같은 의미 이름을 쓰려면
 * "sm이 무엇과 무엇 사이의 간격인가"가 정해져 있어야 하는데, 5개 컴포넌트의
 * 사용처가 아직 그 축을 확정할 만큼 모이지 않았다. 지금 의미를 붙이면 근거
 * 없는 분류가 먼저 굳고, 나중에 실사용이 그 분류를 배신한다.
 * Phase 1-B에서 호출부 58곳을 옮기고 나면 의미 축이 드러날 것이다.
 *
 * radius는 반대로 DESIGN.md가 이미 용처를 규정해 두었으므로(control = 입력
 * 필드·중첩 블록, card = 카드, pill = 버튼·세그먼트) 그 이름을 그대로 쓴다.
 */

/**
 * 간격. 값이 곧 키다.
 *
 * DESIGN.md의 space 사다리는 2/4/6/8/10/12/16/20/24지만 여기 담은 것은
 * 컴포넌트 5개가 실제로 쓴 다섯 개뿐이다. 4·6·20·24는 화면 레이아웃에서
 * 쓰이고 컴포넌트 내부에서는 아직 쓰이지 않았다. Phase 1-B에서 호출부를
 * 옮기며 필요해지면 그때 올린다.
 */
export const space = {
  /** 값과 단위 사이, 제목과 부제 사이 */
  2: 2,
  /** 리스트 행 사이 기본, 카드 본문 요소 사이 */
  8: 8,
  /** 헤더 세로 패딩 */
  10: 10,
  /** 밀집 블록 내부 패딩, 제목과 콘텐츠 사이 */
  12: 12,
  /** 카드 내부 패딩 기본, 버튼 패딩 */
  16: 16,
} as const;

export type SpaceToken = keyof typeof space;

/**
 * 모서리 반경.
 *
 * DESIGN.md 사다리는 chip 10 / control 12 / card 16 / sheet 24 / pill 999
 * 다섯 단계지만 **chip 10과 sheet 24는 5개 컴포넌트 실사용 0건**이라
 * 추출하지 않는다. 실사용 근거 없는 값을 토큰으로 올리면 죽은 API가 된다.
 * (Button의 variant 4종 중 3종이 실사용 0건이라 만들지 않은 것과 같은 판단이다.)
 * 태그·바텀시트 컴포넌트가 생겨 실제로 쓰이면 그때 올린다.
 */
export const radius = {
  /** 입력 필드, 카드 안 중첩 블록 */
  control: 12,
  /** 카드 기본 */
  card: 16,
  /** 버튼, 세그먼트, 아바타, 아이콘 버튼 */
  pill: 999,
} as const;

export type RadiusToken = keyof typeof radius;

/**
 * 치수. 간격도 반경도 아닌 값.
 */
export const size = {
  /**
   * 탭 가능한 요소의 최소 히트 영역(pt). DESIGN.md `target.min`.
   * Button, IconButton, Header가 쓴다.
   */
  touchTarget: 44,
} as const;

export type SizeToken = keyof typeof size;
