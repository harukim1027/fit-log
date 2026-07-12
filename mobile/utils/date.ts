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
