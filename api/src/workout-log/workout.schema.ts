import { z } from 'zod';

export const ExerciseSchema = z.object({
  name: z.string(), // 표준화된 운동 이름 (예: "벤치프레스")
  sets: z.number().int().nullable(), // 세트 수
  reps: z.number().int().nullable(), // 세트당 반복 수
  weight_kg: z.number().nullable(), // kg, 맨몸이면 null
  confidence: z.enum(['high', 'medium', 'low']),
});

export const WorkoutSchema = z.object({
  exercises: z.array(ExerciseSchema),
  ambiguous: z.boolean(), // 추측이 필요했으면 true
  clarification_question: z.string().nullable(), // 되물을 질문(한국어) 또는 null
});

export type Exercise = z.infer<typeof ExerciseSchema>;
export type Workout = z.infer<typeof WorkoutSchema>;

// Claude strict tool use가 이 스키마로 출력을 강제. Zod와 같은 모양을 미러링.
export const LOG_WORKOUT_INPUT_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    exercises: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          name: {
            type: 'string',
            description:
              '표준화된 운동 이름. 예: 벤치프레스, 스쿼트, 데드리프트, 풀업',
          },
          sets: { type: ['integer', 'null'], description: '세트 수' },
          reps: { type: ['integer', 'null'], description: '세트당 반복 수' },
          weight_kg: {
            type: ['number', 'null'],
            description: 'kg 단위 무게. 맨몸이면 null',
          },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
        required: ['name', 'sets', 'reps', 'weight_kg', 'confidence'],
      },
    },
    ambiguous: {
      type: 'boolean',
      description: '입력이 모호해 추측이 필요했으면 true',
    },
    clarification_question: {
      type: ['string', 'null'],
      description: '모호할 때 되물을 한국어 질문, 아니면 null',
    },
  },
  required: ['exercises', 'ambiguous', 'clarification_question'],
} as const;
