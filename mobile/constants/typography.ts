/**
 * @file constants/typography.ts
 * @description 통계 탭 본문의 타이포·간격 스케일 ("여백 + 타이포" 레이아웃).
 *
 * ── 적용 범위 ─────────────────────────────────────────────────────────────
 * **통계 탭만이다.** 홈은 카드 히어로를 유지하기로 했다(2026-09-07 결정).
 * 두 화면이 다른 레이아웃 언어를 쓰는 것이 의도된 상태다 —
 * 홈은 "이번 주 현황판", 통계는 "읽고 비교하는 화면"이다.
 *
 * ── 왜 상수로 빼는가 ───────────────────────────────────────────────────────
 * 카드가 사라지면 위계를 지탱하는 것이 **크기와 여백뿐**이다. 한 화면 안에서도
 * 섹션이 여럿이라 값이 인라인으로 흩어지면 한 섹션만 고쳐졌을 때 위계가
 * 무너지고, 그 어긋남은 코드로 드러나지 않는다.
 *
 * 여기 담은 것은 **통계가 실제로 쓰는 값만**이다. 홈용으로 잡았던 셋
 * (주 숫자 분모 20/800, 리스트 행의 색점 7·요일 11.5/600)은 범위가 통계로
 * 좁아지면서 사용처가 없어져 뺐다 — 실사용 없는 값을 토큰으로 올리면 죽은
 * API 가 된다(tokens/scale.ts 의 같은 판단).
 *
 * ── 왜 design-system/tokens 가 아닌가 ─────────────────────────────────────
 * `design-system/tokens/scale.ts` 는 "Phase 1-A 컴포넌트 5개가 실제로 쓴 값만
 * 담는다"는 규칙을 스스로 명시하고 있다. 여기 값은 컴포넌트가 아니라 **화면
 * 본문**이 쓰는 것이라 그 규칙에 맞지 않는다. 앱 레벨 상수인 `colors.ts` 옆에
 * 두고, design-system 은 지금처럼 이 파일을 모른 채로 둔다.
 * (design-system 이 앱 코드를 import 하지 않는다는 경계도 그대로 유지된다.)
 *
 * ── 출처 ──────────────────────────────────────────────────────────────────
 * 시안 `하루일지 비카드레이아웃.html` 의 B안 CSS 실값이 1차 출처다.
 * 시안이 통계 화면만 그려서 없는 것(주 숫자 분모, 기록 리스트 행)은 지시서
 * `CLAUDE_CODE_비카드_여백타이포.md` 를 따랐다. 각 항목에 출처를 적어 둔다.
 *
 * ── ★ DESIGN.md 와의 차이 ─────────────────────────────────────────────────
 * DESIGN.md 는 타입 역할 7개(22/17/15/14/14/12/11)로 고정하고 "새 크기를
 * 만들기 전에 굵기로 해결되는지 먼저 본다"고 규정한다. 이 파일은 38·20·19·
 * 13.5·12.5·11.5 여섯 개를 새로 들인다. 카드를 없애면 **크기 자체가 위계를
 * 져야** 하므로 굵기만으로는 대체되지 않는다.
 * DESIGN.md 는 직접 편집하지 않는다(채택된 계약). 이 차이는
 * design-system/README.md 에 기록해 두었다.
 */

/**
 * 4단 위계. 본문에서 이 넷 밖의 크기를 쓰지 않는다.
 *
 * 기존 섹션 제목이 11/14/17/22 로 제각각이던 것을 `kicker` 하나로 모은다 —
 * 제목 크기 편차 문제가 구조적으로 사라진다.
 */
export const type = {
  /**
   * 키커 라벨. 모든 섹션 제목이 이것 하나다.
   * 시안 `.B .kh` = 11.5 / 800 / .08em / uppercase.
   * letterSpacing 은 RN 이 pt 라 0.08em × 11.5 = 0.92 로 환산했다.
   * uppercase 는 한글에 영향이 없고 "PR"·"kcal" 같은 라틴 조각에만 걸린다.
   */
  kicker: {
    fontSize: 11.5,
    fontWeight: "800",
    letterSpacing: 0.92,
    textTransform: "uppercase",
  },

  /** 주 숫자. 시안 `.B .big` = 38 / 900 / -1.6 / line-height 1. */
  big: { fontSize: 38, fontWeight: "900", letterSpacing: -1.6, lineHeight: 38 },
  /** 주 숫자에 붙는 단위. 시안 `.B .big small` = 15 / 800. */
  bigUnit: { fontSize: 15, fontWeight: "800" },
  /** KPI 값. 시안 `.B .kp .kv` = 19 / 900. */
  kpiValue: { fontSize: 19, fontWeight: "900" },
  /** KPI 라벨·단위. 시안 `.B .kp .kl` = 11 / 700 / .04em (11 × 0.04 = 0.44). */
  kpiLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.44 },

  /** 본문·비교문·힌트. 시안 `.B .cmp` = 12 / 700. */
  body: { fontSize: 12, fontWeight: "700" },
} as const;

/**
 * 간격. 시안의 margin/padding 실값이다.
 *
 * 이 값들이 카드 보더를 대신해 덩어리를 나눈다. 하나만 바뀌어도 위계가
 * 흔들리므로 인라인 숫자로 흩지 않는다.
 */
export const layout = {
  /** 섹션. 시안 `.B .sec` = padding 22px 18px 0. */
  sectionPaddingTop: 22,
  sectionPaddingH: 18,
  /** 마지막 섹션 아래. 시안 `.B .sec:last { padding-bottom:24 }`. */
  sectionPaddingBottom: 24,

  /**
   * 1px 룰. 시안 `.B .rule` = height 1 / margin 20px 18px 0.
   * 색은 `c.border` 를 쓴다 — 사유는 design-system/README.md 참조.
   */
  ruleHeight: 1,
  ruleMarginTop: 20,
  ruleMarginH: 18,

  /** 키커 → 주 숫자. 시안 `.B .big { margin-top: 6 }`. */
  bigMarginTop: 6,
  /** 주 숫자 → 비교문. 시안 `.B .cmp { margin-top: 5 }`. */
  bodyMarginTop: 5,
  /** 단위 앞 간격. 시안 `.B .big small { margin-left: 3 }`. */
  bigUnitMarginLeft: 3,

  /** KPI 줄. 시안 `.B .kpis` = gap 24 / margin-top 18. */
  kpiRowGap: 24,
  kpiRowMarginTop: 18,
  /** KPI 라벨 → 값. 시안 `.B .kp .kv { margin-top: 2 }`. */
  kpiValueMarginTop: 2,

  /** 차트. 시안 `<div style="margin-top:18px">${barsOf}` */
  chartMarginTop: 18,

  /** 자극 부위 인라인. 시안 gap 6 / margin-top 11, 힌트 margin-top 9. */
  muscleInlineGap: 6,
  muscleInlineMarginTop: 11,
  muscleHintMarginTop: 9,
} as const;

/**
 * 점선 리더 행 — 통계 "최고 기록". 시안 `.B .prow / .pn / .pv / .pd`.
 */
export const leaderRow = {
  paddingVertical: 9,
  gap: 10,
  /** 종목명·세션명. 시안 `.pn` = 13.5 / 700. */
  name: { fontSize: 13.5, fontWeight: "700" },
  /** 값. 시안 `.pv` = 15 / 800. */
  value: { fontSize: 15, fontWeight: "800" },
  /** 값에 붙는 단위. 시안 `.pv small` = 11. */
  valueUnit: { fontSize: 11, fontWeight: "600" },
  /** 점선. 시안 `.pd` = border-bottom 1 dotted / margin 0 4px 4px. */
  dotsMarginH: 4,
  dotsMarginBottom: 4,
} as const;

/** 통계 범위 세그먼트. 시안 `.seg` / `.seg button`. */
export const segment = {
  gap: 3,
  padding: 3,
  radius: 12,
  buttonHeight: 32,
  buttonRadius: 9,
  label: { fontSize: 12.5, fontWeight: "800" },
} as const;

/** 주 네비게이션 라벨. 시안 `.wknav .lb` = 13.5 / 800. */
export const weekNavLabel = { fontSize: 13.5, fontWeight: "800" } as const;
