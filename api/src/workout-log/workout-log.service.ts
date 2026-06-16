import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { parseWorkout } from './workout-parser';
import type { Exercise } from './workout.schema';
import { ExerciseCatalogService } from './exercise-catalog.service';
import { WorkoutSession } from '../workout/workout-session.entity';
import { WorkoutExercise } from '../workout/workout-exercise.entity';
import { WorkoutSet } from '../workout/workout-set.entity';

export type LogResult =
  | { status: 'needs_clarification'; question: string | null }
  | { status: 'saved'; exercises: Exercise[] };

export type LogSource = 'nl' | 'manual';

/** 입력 정규화 후 코어로 넘어가는 세트 단위 */
export interface SetInput {
  weight: number | null;
  reps: number | null;
  unit?: string;
  completed?: boolean;
}

/** 코어 입력: 카탈로그에서 resolve된 exerciseId + 세트들 */
export interface ExerciseInput {
  exerciseId: string;
  sets: SetInput[];
}

export interface SavedExercise {
  id: string; // WorkoutExercise id (되돌리기 단위)
  exerciseId: string; // 카탈로그 id
  name: string;
  category: string;
  setCount: number;
  source: LogSource;
}

export interface QuickLogResult {
  status: 'saved' | 'needs_clarification' | 'undone';
  sessionId?: string;
  saved?: SavedExercise[];
  unmatched?: {
    name: string;
    sets: number | null;
    reps: number | null;
    weight_kg: number | null;
  }[];
  undoIds?: string[];
  question?: string | null;
}

/** KST(UTC+9) 기준 오늘 날짜 YYYY-MM-DD. 사용자(한국)의 "오늘"과 세션 날짜를 맞춘다. */
function todayKST(): string {
  return new Date(Date.now() + 9 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
}

@Injectable()
export class WorkoutLogService {
  constructor(
    private readonly catalog: ExerciseCatalogService,
    @InjectRepository(WorkoutSession)
    private readonly sessionRepo: Repository<WorkoutSession>,
    @InjectRepository(WorkoutExercise)
    private readonly exerciseRepo: Repository<WorkoutExercise>,
    @InjectRepository(WorkoutSet)
    private readonly setRepo: Repository<WorkoutSet>,
  ) {}

  // ── Feature 1: 파싱만 (확인 화면용) ─────────────────────────────────────────
  async logFromText(userId: string, text: string): Promise<LogResult> {
    const parsed = await parseWorkout(text);
    if (parsed.ambiguous) {
      return {
        status: 'needs_clarification',
        question: parsed.clarification_question,
      };
    }
    return { status: 'saved', exercises: parsed.exercises };
  }

  // ── 저장 코어: NL/수동 모두 이 함수 하나로 수렴 ─────────────────────────────
  /**
   * 세션에 종목들을 추가하는 단일 저장 코어.
   * - exerciseId는 카탈로그에서 resolve 가능한 값만 저장 (LLM/클라 출력 직접 신뢰 금지).
   * - name/category는 카탈로그에서 파생 (클라가 보낸 값을 신뢰하지 않음).
   * - 각 세트에 source('nl'|'manual') 태깅.
   * @returns 저장된 종목 목록 (resolve 불가한 exerciseId는 건너뜀)
   */
  async addExercisesToSession(
    userId: string,
    sessionId: string,
    exercises: ExerciseInput[],
    source: LogSource,
  ): Promise<SavedExercise[]> {
    const session = await this.sessionRepo.findOne({
      where: { id: sessionId, user: { id: userId } },
      relations: { exercises: true },
    });
    if (!session) throw new NotFoundException('운동 기록을 찾을 수 없어요');

    let nextOrder =
      (session.exercises ?? []).reduce(
        (max, ex) => Math.max(max, ex.order ?? 0),
        -1,
      ) + 1;

    const saved: SavedExercise[] = [];
    for (const item of exercises) {
      const match = await this.catalog.resolveById(item.exerciseId);
      if (!match) continue; // 카탈로그에 없는 id는 무시 (안전장치)

      const sets = (item.sets?.length ? item.sets : [{ weight: 0, reps: 0 }]).map(
        (s) =>
          this.setRepo.create({
            weight: s.weight ?? 0,
            reps: s.reps ?? 0,
            completed: s.completed ?? true,
            unit: s.unit ?? 'kg',
            source,
          }),
      );

      const exercise = this.exerciseRepo.create({
        name: match.name,
        category: match.category,
        targetMuscles: [],
        order: nextOrder++,
        session,
        sets,
      });
      const savedEx = await this.exerciseRepo.save(exercise);

      saved.push({
        id: savedEx.id,
        exerciseId: match.catalogId,
        name: savedEx.name,
        category: savedEx.category,
        setCount: sets.length,
        source,
      });
    }
    return saved;
  }

  // ── 오늘 세션 get-or-create ─────────────────────────────────────────────────
  private async getOrCreateToday(userId: string): Promise<WorkoutSession> {
    const date = todayKST();
    const existing = await this.sessionRepo.findOne({
      where: { user: { id: userId }, date },
      relations: { exercises: true },
    });
    if (existing) return existing;
    const created = this.sessionRepo.create({ date, user: { id: userId } });
    return this.sessionRepo.save(created);
  }

  // ── 빠른 기록(NL): 파싱 → 정규화 → 코어 저장 (확인 화면 없음) ────────────────
  async quickLog(userId: string, text: string): Promise<QuickLogResult> {
    const parsed = await parseWorkout(text);

    // 1) 모호하면 저장하지 않고 즉시 되묻기 — 유일한 마찰 지점
    if (parsed.ambiguous) {
      return {
        status: 'needs_clarification',
        question: parsed.clarification_question,
      };
    }

    // 2) 입력 정규화: 운동명 → 카탈로그 exerciseId resolve. 실패는 unmatched로 분리.
    const inputs: ExerciseInput[] = [];
    const unmatched: QuickLogResult['unmatched'] = [];
    for (const ex of parsed.exercises) {
      const match = await this.catalog.resolve(ex.name);
      if (!match) {
        unmatched.push({
          name: ex.name,
          sets: ex.sets,
          reps: ex.reps,
          weight_kg: ex.weight_kg,
        });
        continue;
      }
      const setCount = ex.sets && ex.sets > 0 ? ex.sets : 1;
      inputs.push({
        exerciseId: match.catalogId,
        sets: Array.from({ length: setCount }, () => ({
          weight: ex.weight_kg,
          reps: ex.reps,
          unit: 'kg',
          completed: true,
        })),
      });
    }

    // 3) 오늘 세션(없으면 생성/있으면 누적)에 코어로 저장
    const session = await this.getOrCreateToday(userId);
    const saved = await this.addExercisesToSession(
      userId,
      session.id,
      inputs,
      'nl',
    );

    // 4) 빠르지만 안전: 이미 저장됨 + 되돌리기용 식별자 반환
    return {
      status: 'saved',
      sessionId: session.id,
      saved,
      unmatched,
      undoIds: saved.map((r) => r.id),
    };
  }

  // ── 수동 입력: 카탈로그 picker 기반 → 코어 저장 (source 'manual') ────────────
  async addManual(
    userId: string,
    sessionId: string,
    exercises: ExerciseInput[],
  ): Promise<QuickLogResult> {
    const saved = await this.addExercisesToSession(
      userId,
      sessionId,
      exercises,
      'manual',
    );
    return {
      status: 'saved',
      sessionId,
      saved,
      undoIds: saved.map((r) => r.id),
    };
  }

  // ── 되돌리기: 방금 저장한 종목 삭제 (소유권 검증) ───────────────────────────
  async undo(userId: string, ids: string[]): Promise<QuickLogResult> {
    if (!ids?.length) return { status: 'undone' };
    // 본인 세션에 속한 종목만 삭제 (cascade로 sets도 제거)
    const owned = await this.exerciseRepo.find({
      where: { id: In(ids), session: { user: { id: userId } } },
      select: { id: true },
    });
    if (owned.length) {
      await this.exerciseRepo.delete({ id: In(owned.map((e) => e.id)) });
    }
    return { status: 'undone' };
  }
}
