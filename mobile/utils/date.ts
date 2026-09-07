/**
 * 날짜 유틸 — 기기 로컬 시간 기준 달력 날짜를 계산한다.
 *
 * ⚠️ new Date().toISOString().split('T')[0] 은 UTC 기준 날짜라
 *    KST(UTC+9) 00:00~09:00 사이에는 "전날"로 기록되는 버그가 있다.
 *    저장/조회용 날짜는 반드시 이 헬퍼(로컬 시간 기준)를 사용한다.
 */

/** 로컬 시간 기준 날짜를 YYYY-MM-DD 로 반환 (기본값: 오늘) */
export const localDateStr = (d: Date = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** 로컬 시간 기준 월을 YYYY-MM 으로 반환 (기본값: 이번 달) */
export const localMonthStr = (d: Date = new Date()): string =>
  localDateStr(d).substring(0, 7);

/**
 * 기준 날짜가 속한 주의 시작(일요일 00:00)과 끝(토요일 23:59:59.999).
 *
 * ── 왜 일요일 시작인가 ─────────────────────────────────────────────────────
 * 한국 달력이 일요일 시작이고, 사용자가 매일 보는 홈 주간 스트립이 이미
 * 일~토다. ISO 8601은 월요일 시작이지만 그쪽으로 맞추면 홈 스트립의 요일
 * 배치가 바뀐다.
 *
 * ── 왜 여기 하나만 두는가 ──────────────────────────────────────────────────
 * 전에는 `index.tsx`(일요일 시작·날짜 기준)와 `stats.tsx`(월요일 시작·offset
 * 기준)에 같은 이름의 함수가 따로 있었다. **같은 "이번 주"인데 홈과 통계가
 * 모든 날 다른 7일을 봤다** — 일요일에는 겹치는 날이 하루뿐이었다.
 * 주 시작 규칙은 이 파일 한 곳에만 둔다.
 */
export function getWeekRange(anchor: string | Date = new Date()): {
  start: Date;
  end: Date;
} {
  // 문자열은 로컬 자정으로 파싱한다. `new Date("2026-09-06")`는 UTC 자정이라
  // KST에서 전날로 밀린다. 접미사를 붙여야 로컬이 된다.
  const base =
    typeof anchor === "string" ? new Date(anchor + "T00:00:00") : new Date(anchor);
  base.setHours(0, 0, 0, 0);

  const start = new Date(base);
  start.setDate(base.getDate() - base.getDay()); // getDay() 0=일 → 그 주 일요일
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

/**
 * 오늘로부터 `offset`주 떨어진 주(0=이번 주, -1=지난주).
 * 통계처럼 "오늘 기준으로 주를 이동"하는 화면이 쓴다.
 */
export function getWeekRangeByOffset(offset: number): { start: Date; end: Date } {
  const d = new Date();
  d.setDate(d.getDate() + offset * 7);
  return getWeekRange(d);
}

/** 주의 7일을 일~토 순서로 반환한다. */
export function weekDates(start: Date): Date[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}
