/**
 * @file workout/workout.service.ts
 * @description 운동 세션 CRUD + 운동 히스토리/PR 계산 (NestJS Service)
 *
 * 단위 정규화:
 * - DB는 kg/lbs 원본 그대로 저장하고, 비교 연산 시에만 toKg()로 변환한다.
 * - 사용자에게 반환할 때는 원본 단위와 값을 그대로 내려보내 클라이언트가 변환한다.
 *
 * update() 패턴 (delete + re-create):
 * - TypeORM partial update로는 세트를 추가/삭제/순서변경하기 어렵다.
 * - exercises를 전부 삭제하고 다시 생성하는 방식을 택했다.
 * - exercises에 cascade delete 설정이 있어 exercises 삭제 시 sets도 자동 삭제된다.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkoutSession } from './workout-session.entity';
import { WorkoutExercise } from './workout-exercise.entity';
import { WorkoutSet } from './workout-set.entity';
import { kstDateStrDaysAgo } from '../common/date.util';

// lbs → kg 변환 상수 (1 lbs = 0.4536 kg)
const LBS_TO_KG = 2.20462;
/** lbs면 kg으로 변환, kg이면 그대로 반환 */
const toKg = (weight: number, unit?: string): number =>
  unit === 'lbs' ? weight / LBS_TO_KG : weight;

@Injectable()
export class WorkoutService {
  constructor(
    @InjectRepository(WorkoutSession)
    private sessionRepo: Repository<WorkoutSession>,
    @InjectRepository(WorkoutExercise)
    private exerciseRepo: Repository<WorkoutExercise>,
    @InjectRepository(WorkoutSet)
    private setRepo: Repository<WorkoutSet>,
  ) {}

  async create(userId: string, data: any): Promise<WorkoutSession> {
    const session = this.sessionRepo.create({
      ...data,
      user: { id: userId },
    });
    return this.sessionRepo.save(session) as unknown as WorkoutSession;
  }

  async findAll(userId: string): Promise<WorkoutSession[]> {
    return this.sessionRepo.find({
      where: { user: { id: userId } },
      relations: { exercises: { sets: true } },
      // 최신 세션 먼저, 각 세션 내 종목은 order 필드 기준 정렬
      order: { date: 'DESC', exercises: { order: 'ASC' } },
    });
  }

  async findByDate(userId: string, date: string): Promise<WorkoutSession | null> {
    return this.sessionRepo.findOne({
      where: { user: { id: userId }, date },
      relations: { exercises: { sets: true } },
      order: { exercises: { order: 'ASC' } },
    });
  }

  /**
   * 특정 운동 종목의 전체 히스토리와 PR을 계산해 반환한다.
   *
   * mode별 comparisonSession:
   * - recent: 가장 최근 기록 → "지난번엔 이랬어"
   * - pr: 최고 무게 달성 시점 → "내 최고 기록은 이랬어"
   * - week/month: 해당 기간 내 가장 최근 기록 → "이번 주/달엔 이랬어"
   *
   * maxWeight/maxVolume은 lbs를 kg으로 변환해 비교한다.
   * kg/lbs를 섞어 쓰는 사용자의 PR을 단위 불문하고 올바르게 산출하기 위해.
   */
  async getExerciseHistory(
    userId: string,
    exerciseName: string,
    mode: 'recent' | 'pr' | 'week' | 'month' = 'recent',
  ) {
    const sessions = await this.sessionRepo.find({
      where: { user: { id: userId } },
      relations: { exercises: { sets: true } },
      // ASC 정렬: history 배열이 시간순으로 쌓여 차트 렌더링이 자연스럽다
      order: { date: 'ASC', exercises: { order: 'ASC' } },
    });

    type HistoryEntry = {
      date: string;
      maxWeight: number;
      maxVolume: number;
      totalSets: number;
      sets: { weight: number; reps: number; unit?: string }[];
      // 종목 상세(세트가 아닌 종목 행에 저장됨) — 다음 추가 시 폼 기본값 복원용
      isSingleArm: boolean;
      settings: { key: string; value: string }[];
      tip: string;
      restSeconds: number | null;
      targetReps: string;
    };

    const history: HistoryEntry[] = [];

    for (const session of sessions) {
      const matches = session.exercises.filter((ex) => ex.name === exerciseName);
      if (matches.length === 0) continue;
      const allSets = matches.flatMap((ex) => ex.sets);
      // weight=0 또는 reps=0인 세트는 미완료 세트 — PR 계산에서 제외
      const validSets = allSets.filter((st) => st.weight > 0 && st.reps > 0);
      if (validSets.length === 0) continue;
      const maxWeight = Math.max(...validSets.map((st) => toKg(st.weight, st.unit)));
      // 한 세션에 같은 종목이 두 번 등장할 수 있다 (부위별 분할 등) — 각각 볼륨을 계산해 최대값 사용
      const maxVolume = Math.max(
        ...matches.map((ex) => {
          const vSets = ex.sets.filter((st) => st.weight > 0 && st.reps > 0);
          return vSets.reduce((sum, st) => sum + toKg(st.weight, st.unit) * st.reps, 0);
        }),
      );
      // 종목 상세는 종목 행에 저장됨 — 같은 세션에 분할로 두 번 등장하면 첫 번째 것 사용
      const detail = matches[0];
      history.push({
        date: session.date,
        maxWeight,
        maxVolume,
        totalSets: validSets.length,
        // 클라이언트 표시용으로 원본 단위 포함해 반환
        sets: allSets.map((st) => ({ weight: st.weight, reps: st.reps, unit: st.unit ?? 'kg' })),
        isSingleArm: detail.isSingleArm ?? false,
        settings: detail.settings ?? [],
        tip: detail.tip ?? '',
        restSeconds: detail.restSeconds ?? null,
        targetReps: detail.targetReps ?? '',
      });
    }

    if (history.length === 0) {
      return { history: [], pr: null, comparisonSession: null };
    }

    const prWeight = Math.max(...history.map((h) => h.maxWeight));
    const prVolume = Math.max(...history.map((h) => h.maxVolume));
    if (prWeight === 0) {
      return { history, pr: null, comparisonSession: null };
    }
    // 같은 무게를 여러 번 달성했으면 가장 최근 것을 PR 날짜로 표시
    const prEntry = [...history].reverse().find((h) => h.maxWeight === prWeight)!;

    /** n일 전 날짜 문자열 반환 (KST 기준 YYYY-MM-DD 형식) */
    const cutoffDate = (daysBack: number) => kstDateStrDaysAgo(daysBack);

    let comparisonSession: HistoryEntry | null = null;
    switch (mode) {
      case 'recent':
        // history는 ASC 정렬이므로 마지막 원소가 가장 최근
        comparisonSession = history[history.length - 1];
        break;
      case 'pr':
        comparisonSession = prEntry;
        break;
      case 'week': {
        const cutoff = cutoffDate(7);
        // reverse()로 최신부터 탐색해 가장 최근 기록을 반환
        comparisonSession = [...history].reverse().find((h) => h.date >= cutoff) ?? null;
        break;
      }
      case 'month': {
        const cutoff = cutoffDate(30);
        comparisonSession = [...history].reverse().find((h) => h.date >= cutoff) ?? null;
        break;
      }
    }

    return {
      history,
      pr: { weight: prWeight, volume: prVolume, date: prEntry.date },
      comparisonSession,
    };
  }

  /**
   * 운동 세션의 종목/세트를 수정한다.
   *
   * exercises가 전달된 경우 기존 데이터를 삭제하고 새로 생성한다.
   * TypeORM cascade delete: exercises 삭제 시 연결된 sets도 자동 삭제.
   * partial update(개별 세트 식별 후 업데이트)보다 단순하고
   * 순서 변경·세트 추가·삭제를 하나의 로직으로 처리 가능.
   */
  async update(id: string, userId: string, data: any): Promise<WorkoutSession> {
    const session = await this.sessionRepo.findOne({
      where: { id, user: { id: userId } },
      relations: { exercises: { sets: true } },
    });
    if (!session) throw new NotFoundException('운동 기록을 찾을 수 없어요');
    if (data.note !== undefined) session.note = data.note;
    if (data.durationMinutes !== undefined) session.durationMinutes = data.durationMinutes;
    // date는 로컬(KST) 기준 'YYYY-MM-DD' 문자열을 그대로 저장한다 (date 컬럼, tz 없음)
    if (data.date !== undefined) session.date = data.date;
    // 스칼라 필드(note/durationMinutes/date) 변경을 반드시 저장 — 이전엔 save 호출이 없어 유실됐음
    await this.sessionRepo.save(session);

    if (Array.isArray(data.exercises)) {
      // 기존 종목 일괄 삭제 (cascade → sets도 삭제)
      await this.exerciseRepo.delete({ session: { id } });

      for (const [exIndex, exData] of data.exercises.entries()) {
        const exercise = this.exerciseRepo.create({
          name: exData.name ?? '',
          category: exData.category ?? '',
          settings: exData.settings ?? [],
          tip: exData.tip ?? '',
          isSingleArm: exData.isSingleArm ?? false,
          targetMuscles: exData.targetMuscles ?? [],
          restSeconds: exData.restSeconds ?? null,
          targetReps: exData.targetReps ?? null,
          // 클라이언트가 order를 보내지 않으면 배열 인덱스를 order로 사용
          order: exData.order ?? exIndex,
          session,
        });
        const savedEx = await this.exerciseRepo.save(exercise);
        if (Array.isArray(exData.sets)) {
          for (const setData of exData.sets) {
            const set = this.setRepo.create({
              weight: setData.weight ?? 0,
              reps: setData.reps ?? 0,
              completed: setData.completed ?? false,
              unit: setData.unit ?? 'kg',
              exercise: savedEx,
            });
            await this.setRepo.save(set);
          }
        }
      }
    }

    // 새로 저장된 데이터를 relations 포함해 다시 조회해 반환
    return this.sessionRepo.findOne({
      where: { id },
      relations: { exercises: { sets: true } },
      order: { exercises: { order: 'ASC' } },
    }) as Promise<WorkoutSession>;
  }

  async remove(id: string, userId: string): Promise<void> {
    // affected === 0이면 존재하지 않거나 다른 사용자의 기록
    const result = await this.sessionRepo.delete({ id, user: { id: userId } });
    if (result.affected === 0) throw new NotFoundException('운동 기록을 찾을 수 없어요');
  }
}
