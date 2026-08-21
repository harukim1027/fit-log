/**
 * @file constants/categoryColors.ts
 * @description 부위(카테고리)별 기본 색상.
 *
 * 루틴 색상과는 별개 시스템이다.
 * - 루틴 색상: 루틴 목록/카드 식별용 (routineStore)
 * - 카테고리 색상: 부위 뱃지·부위별 세트 수·통계 차트 (categoryColorStore)
 *
 * 사용자가 categoryColorStore에서 덮어쓰지 않으면 이 기본값을 사용한다.
 */
export const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  가슴: '#2E82F0',
  등: '#EF5E80',
  어깨: '#4FA98C',
  팔: '#9B7EDE',
  하체: '#7C8B3D',
  복근: '#54B0C4',
  유산소: '#E89B4F',
};

/** 정의되지 않은 부위(세부 타겟부위 등) 기본 폴백 */
export const FALLBACK_CATEGORY_COLOR = '#888';
