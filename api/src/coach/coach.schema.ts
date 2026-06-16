import { z } from 'zod';

/**
 * 인사이트 종류. 코드가 결정적으로 선택한다(LLM이 정하지 않음).
 * 우선순위: long_break > low_frequency > imbalance_2w > steady (+ 신규 first_time)
 */
export type InsightKind =
  | 'long_break'
  | 'low_frequency'
  | 'imbalance_2w'
  | 'steady'
  | 'first_time';

export type ActionTarget = 'workout_start' | 'add_exercise' | 'history';

/** 코드가 집계한 사실 (LLM 호출 없이) */
export interface InsightFacts {
  daysSinceLast: number | null; // 마지막 운동 이후 경과일 (null = 기록 없음)
  sessionsLast7Days: number; // 최근 7일 운동 횟수
  muscleSetCountsLast14Days: Record<string, number>; // 최근 14일 카테고리별 완료 세트
}

/** 최종 출력 (LLM 문장 + 코드가 정한 kind/action) */
export const InsightOutputSchema = z.object({
  kind: z.enum([
    'long_break',
    'low_frequency',
    'imbalance_2w',
    'steady',
    'first_time',
  ]),
  message: z.string().min(5).max(120),
  actionLabel: z.string().max(20).optional(),
  actionTarget: z.enum(['workout_start', 'add_exercise', 'history']).optional(),
});

export type InsightOutput = z.infer<typeof InsightOutputSchema>;

/** LLM이 채우는 부분만 (문장화). kind는 코드가 정한 값을 그대로 따른다. */
export const CoachMessageSchema = z.object({
  kind: z.enum([
    'long_break',
    'low_frequency',
    'imbalance_2w',
    'steady',
    'first_time',
  ]),
  message: z.string().min(5).max(120),
});

// strict tool use: LLM 출력을 이 스키마로 강제한다.
export const GENERATE_COACH_MESSAGE_INPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    kind: {
      type: 'string',
      enum: ['long_break', 'low_frequency', 'imbalance_2w', 'steady', 'first_time'],
      description: '주어진 kind를 그대로 반영',
    },
    message: {
      type: 'string',
      description: '한국어 코칭 한 문장. 최대 80자. 사실 기반, 빈말 격려 금지.',
    },
  },
  required: ['kind', 'message'],
} as const;
