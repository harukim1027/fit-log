import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import Anthropic from '@anthropic-ai/sdk';
import { CoachInsightCache } from './coach-cache.entity';
import { WorkoutSession } from '../workout/workout-session.entity';
import {
  ActionTarget,
  CoachMessageSchema,
  GENERATE_COACH_MESSAGE_INPUT_SCHEMA,
  InsightFacts,
  InsightKind,
  InsightOutput,
  InsightOutputSchema,
} from './coach.schema';

const MODEL = 'claude-haiku-4-5'; // 문장화만 담당 (저비용)

const SYSTEM = `당신은 운동 코치예요. 주어진 데이터를 보고 사용자에게 친근하지만 잔소리 같지 않은 한 문장 코칭 메시지를 만들어 generate_coach_message 도구로 반환하세요.
규칙:
- 한국어 한 문장, 최대 80자.
- 빈말 격려 금지. 주어진 사실에 근거해서만.
- 숫자(경과일/운동 횟수/부위)를 자연스럽게 녹이기.
- kind는 주어진 값을 그대로 반영.`;

const GENERATE_COACH_TOOL = {
  name: 'generate_coach_message',
  description: '운동 데이터 기반 한 문장 코칭 메시지를 생성한다.',
  strict: true,
  input_schema: GENERATE_COACH_MESSAGE_INPUT_SCHEMA,
};

/** YYYY-MM-DD 두 날짜 사이 경과일 (b - a) */
function daysBetween(a: string, b: string): number {
  return Math.floor((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

@Injectable()
export class CoachService {
  private readonly logger = new Logger(CoachService.name);
  private client: Anthropic | null = null;

  constructor(
    @InjectRepository(CoachInsightCache)
    private readonly cacheRepo: Repository<CoachInsightCache>,
    @InjectRepository(WorkoutSession)
    private readonly sessionRepo: Repository<WorkoutSession>,
  ) {}

  /** KST(UTC+9) 기준 오늘 날짜 */
  private todayKST(): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
  }

  private cutoffKST(daysBack: number): string {
    return new Date(Date.now() + 9 * 60 * 60 * 1000 - daysBack * 86_400_000)
      .toISOString()
      .split('T')[0];
  }

  // ── 진입점: 캐시 우선, 없으면 생성 ──────────────────────────────────────────
  async getTodayInsight(userId: string): Promise<InsightOutput> {
    const date = this.todayKST();

    const cached = await this.cacheRepo.findOne({ where: { userId, date } });
    if (cached) {
      return InsightOutputSchema.parse({
        kind: cached.kind,
        message: cached.message,
        actionLabel: cached.actionLabel ?? undefined,
        actionTarget: cached.actionTarget ?? undefined,
      });
    }

    const facts = await this.extractFacts(userId);
    const kind = this.selectInsightKind(facts);
    const action = this.deriveAction(kind, facts);

    try {
      const message = await this.synthesize(kind, facts);
      const output = InsightOutputSchema.parse({ kind, message, ...action });
      await this.cache(userId, date, output);
      return output;
    } catch (e) {
      // LLM 실패 → 캐시하지 않고 코드 폴백 (다음 호출 때 재시도)
      this.logger.warn(`코치 문장화 실패, 폴백 사용: ${String(e)}`);
      return InsightOutputSchema.parse({
        kind,
        message: this.fallbackMessage(kind, facts),
        ...action,
      });
    }
  }

  private async cache(userId: string, date: string, out: InsightOutput) {
    try {
      await this.cacheRepo.save(
        this.cacheRepo.create({
          userId,
          date,
          kind: out.kind,
          message: out.message,
          actionLabel: out.actionLabel ?? null,
          actionTarget: out.actionTarget ?? null,
        }),
      );
    } catch {
      // 동시 첫 호출로 유니크 충돌 시 무시 (이미 다른 요청이 저장함)
    }
  }

  // ── 사실 추출 (코드만, LLM 호출 X) ──────────────────────────────────────────
  async extractFacts(userId: string): Promise<InsightFacts> {
    const today = this.todayKST();
    const sessions = await this.sessionRepo.find({
      where: { user: { id: userId }, date: MoreThanOrEqual(this.cutoffKST(30)) },
      relations: { exercises: { sets: true } },
      order: { date: 'DESC' },
    });

    const last = sessions[0];
    const daysSinceLast = last ? daysBetween(last.date, today) : null;

    const sessionsLast7Days = sessions.filter(
      (s) => daysBetween(s.date, today) < 7,
    ).length;

    const muscleSetCountsLast14Days: Record<string, number> = {};
    sessions
      .filter((s) => daysBetween(s.date, today) < 14)
      .forEach((s) => {
        s.exercises.forEach((ex) => {
          const completed = ex.sets.filter((set) => set.completed).length;
          if (completed === 0) return;
          muscleSetCountsLast14Days[ex.category] =
            (muscleSetCountsLast14Days[ex.category] ?? 0) + completed;
        });
      });

    return { daysSinceLast, sessionsLast7Days, muscleSetCountsLast14Days };
  }

  // ── 인사이트 선택 (코드, 우선순위 순) ───────────────────────────────────────
  selectInsightKind(facts: InsightFacts): InsightKind {
    if (facts.daysSinceLast === null) return 'first_time';
    if (facts.daysSinceLast >= 5) return 'long_break';
    if (facts.sessionsLast7Days <= 1) return 'low_frequency';

    const counts = Object.values(facts.muscleSetCountsLast14Days);
    if (counts.length >= 2) {
      const max = Math.max(...counts);
      const min = Math.min(...counts);
      if (max >= min * 3 && max >= 10) return 'imbalance_2w';
    }
    return 'steady';
  }

  /** kind별 action을 코드가 결정 (LLM에 맡기지 않음 — 정확성 보장) */
  private deriveAction(
    kind: InsightKind,
    facts: InsightFacts,
  ): { actionLabel?: string; actionTarget?: ActionTarget } {
    switch (kind) {
      case 'long_break':
        return { actionLabel: '운동 시작', actionTarget: 'workout_start' };
      case 'low_frequency':
        return { actionLabel: '가볍게 시작', actionTarget: 'workout_start' };
      case 'first_time':
        return { actionLabel: '운동 시작', actionTarget: 'workout_start' };
      case 'imbalance_2w':
        return {
          actionLabel: `${this.underCategory(facts)} 운동 추가`,
          actionTarget: 'add_exercise',
        };
      case 'steady':
      default:
        return {};
    }
  }

  /** 최근 14일 가장 적게 한 부위 */
  private underCategory(facts: InsightFacts): string {
    const entries = Object.entries(facts.muscleSetCountsLast14Days);
    if (entries.length === 0) return '다른 부위';
    return entries.sort((a, b) => a[1] - b[1])[0][0];
  }

  // ── LLM 문장화 (strict tool use + Zod) ──────────────────────────────────────
  private getClient(): Anthropic {
    if (!this.client) {
      if (!process.env.ANTHROPIC_API_KEY) {
        throw new Error('ANTHROPIC_API_KEY 미설정');
      }
      this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    }
    return this.client;
  }

  private async synthesize(
    kind: InsightKind,
    facts: InsightFacts,
  ): Promise<string> {
    const ctx = {
      kind,
      ...facts,
      ...(kind === 'imbalance_2w'
        ? { underCategory: this.underCategory(facts) }
        : {}),
    };

    const res = await this.getClient().messages.create({
      model: MODEL,
      max_tokens: 200,
      system: [
        // 시스템 프롬프트 동일 → 프롬프트 캐싱
        { type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } },
      ],
      tools: [GENERATE_COACH_TOOL as any],
      tool_choice: { type: 'tool', name: 'generate_coach_message' },
      messages: [{ role: 'user', content: JSON.stringify(ctx) }],
    });

    const block = res.content.find((b) => b.type === 'tool_use');
    if (!block || block.type !== 'tool_use') throw new Error('tool_use 없음');
    return CoachMessageSchema.parse(block.input).message; // 2차 방어선
  }

  // ── LLM 실패 시 결정적 폴백 ─────────────────────────────────────────────────
  private fallbackMessage(kind: InsightKind, facts: InsightFacts): string {
    switch (kind) {
      case 'long_break':
        return `마지막 운동이 ${facts.daysSinceLast}일 전이에요. 가볍게 다시 시작해볼까요?`;
      case 'low_frequency':
        return `이번 주 운동이 ${facts.sessionsLast7Days}회예요. 한 번 더 움직여봐요.`;
      case 'imbalance_2w':
        return `${this.underCategory(facts)} 운동이 상대적으로 적어요. 균형을 맞춰볼까요?`;
      case 'first_time':
        return '첫 운동을 시작해볼까요? 가볍게라도 좋아요.';
      case 'steady':
      default:
        return '최근 꾸준히 운동하고 있어요. 지금 흐름이 좋아요.';
    }
  }
}
