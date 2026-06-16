import Anthropic from '@anthropic-ai/sdk';
import {
  WorkoutSchema,
  LOG_WORKOUT_INPUT_SCHEMA,
  type Workout,
} from './workout.schema';

// ANTHROPIC_API_KEY는 NestJS 서버 환경변수로만 사용 (RN/클라이언트 노출 금지).
// 클라이언트는 지연 생성한다 — 키 미설정 시 SDK 생성자가 throw하므로,
// 모듈 로드(=서버 부팅) 시점이 아니라 실제 호출 시점에만 키를 요구하도록.
const MODEL = 'claude-haiku-4-5'; // 파싱용 저비용 모델. 최신 문자열은 docs 확인.

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY 환경변수가 설정되지 않았어요');
    }
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

const SYSTEM = `너는 피트니스 앱의 운동 기록 파서다.
사용자의 자연어 문장을 log_workout 도구 스키마에 맞게 변환한다.
규칙:
- 무게 단위가 없으면 kg로 가정.
- "3세트 10회" => sets=3, reps=10. "5x5" => sets=5, reps=5.
- 맨몸 운동(푸시업, 풀업 등)은 weight_kg=null.
- 문장에 없는 값은 추측하지 말고 null.
- 운동 이름은 표준명으로 정규화("벤치" => "벤치프레스").
- 추측이 필요했거나 운동을 특정할 수 없으면 ambiguous=true, clarification_question에 한국어로 한 문장 되묻기. 그 외엔 null.`;

const LOG_WORKOUT_TOOL = {
  name: 'log_workout',
  description: '사용자의 자연어 운동 기록을 구조화된 데이터로 변환한다.',
  strict: true, // structured outputs: 출력이 input_schema를 반드시 만족
  input_schema: LOG_WORKOUT_INPUT_SCHEMA,
};

export async function parseWorkout(text: string): Promise<Workout> {
  const res = await getClient().messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: SYSTEM,
    tools: [LOG_WORKOUT_TOOL as any], // SDK 타입이 strict 미지원이면 as any
    tool_choice: { type: 'tool', name: 'log_workout' },
    messages: [{ role: 'user', content: text }],
  });

  const block = res.content.find((b) => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') throw new Error('tool_use 블록 없음');

  return WorkoutSchema.parse(block.input); // 2차 방어선
}
