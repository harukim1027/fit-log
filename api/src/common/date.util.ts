/**
 * 날짜 유틸 — 서버는 UTC로 동작하므로 한국 시간(KST, UTC+9) 기준 날짜를 계산한다.
 *
 * ⚠️ new Date().toISOString().split('T')[0] 은 UTC 날짜라
 *    KST 00:00~09:00 사이에는 "전날"로 계산되는 버그가 있다.
 *    날짜 기본값/상대 날짜는 반드시 이 헬퍼를 사용한다.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

/** KST 기준 날짜를 YYYY-MM-DD 로 반환 (기본값: 오늘) */
export function kstDateStr(base: Date = new Date()): string {
  return new Date(base.getTime() + KST_OFFSET_MS).toISOString().split('T')[0];
}

/** KST 기준 daysBack 일 전 날짜를 YYYY-MM-DD 로 반환 */
export function kstDateStrDaysAgo(daysBack: number): string {
  return kstDateStr(new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000));
}
