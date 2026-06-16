/**
 * @file constants/recoveryHours.ts
 * @description 부위(카테고리)별 기본 회복 시간(시간 단위) + 상태 임계값.
 *
 * 일반 가이드라인일 뿐 "권장"이지 "금지"가 아니다. 강도(볼륨/세트수)는 반영하지 않고,
 * 운동을 했으면 회복 카운트를 시작하고 안 했으면 그대로 둔다(=ready).
 */

export const DEFAULT_RECOVERY_HOURS: Record<string, number> = {
  가슴: 48,
  등: 48,
  하체: 72,
  어깨: 36,
  팔: 36,
  복근: 24,
  유산소: 12,
};

// 상태 판정 임계값 (경과 시간 / 회복 시간 비율)
// 0~50% 경과   → 🔴 rest    (휴식 필요)
// 50~100% 경과 → 🟡 caution (가능하지만 주의)
// 100% 이상    → 🟢 ready   (완전히 회복)
export const RECOVERY_THRESHOLDS = {
  rest: 0.5,
  caution: 1.0,
};
