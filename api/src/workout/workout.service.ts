import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkoutSession } from './workout-session.entity';
import { WorkoutExercise } from './workout-exercise.entity';
import { WorkoutSet } from './workout-set.entity';

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
      order: { date: 'DESC' },
    });
  }

  async findByDate(userId: string, date: string): Promise<WorkoutSession | null> {
    return this.sessionRepo.findOne({
      where: { user: { id: userId }, date },
      relations: { exercises: { sets: true } },
    });
  }

  async getExerciseHistory(
    userId: string,
    exerciseName: string,
    mode: 'recent' | 'pr' | 'week' | 'month' = 'recent',
  ) {
    const sessions = await this.sessionRepo.find({
      where: { user: { id: userId } },
      relations: { exercises: { sets: true } },
      order: { date: 'ASC' },
    });

    type HistoryEntry = {
      date: string;
      maxWeight: number;
      maxVolume: number;
      totalSets: number;
      sets: { weight: number; reps: number }[];
    };

    const history: HistoryEntry[] = [];

    for (const session of sessions) {
      const matches = session.exercises.filter((ex) => ex.name === exerciseName);
      if (matches.length === 0) continue;
      const allSets = matches.flatMap((ex) => ex.sets);
      if (allSets.length === 0) continue;
      const maxWeight = Math.max(...allSets.map((st) => st.weight));
      const maxVolume = Math.max(
        ...matches.map((ex) =>
          ex.sets.reduce((sum, st) => sum + st.weight * st.reps, 0),
        ),
      );
      history.push({
        date: session.date,
        maxWeight,
        maxVolume,
        totalSets: allSets.length,
        sets: allSets.map((st) => ({ weight: st.weight, reps: st.reps })),
      });
    }

    if (history.length === 0) {
      return { history: [], pr: null, comparisonSession: null };
    }

    const prWeight = Math.max(...history.map((h) => h.maxWeight));
    const prVolume = Math.max(...history.map((h) => h.maxVolume));
    const prEntry = [...history].reverse().find((h) => h.maxWeight === prWeight)!;

    const cutoffDate = (daysBack: number) => {
      const d = new Date();
      d.setDate(d.getDate() - daysBack);
      return d.toISOString().split('T')[0];
    };

    let comparisonSession: HistoryEntry | null = null;
    switch (mode) {
      case 'recent':
        comparisonSession = history[history.length - 1];
        break;
      case 'pr':
        comparisonSession = prEntry;
        break;
      case 'week': {
        const cutoff = cutoffDate(7);
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

  async update(id: string, userId: string, data: any): Promise<WorkoutSession> {
    const session = await this.sessionRepo.findOne({
      where: { id, user: { id: userId } },
      relations: { exercises: { sets: true } },
    });
    if (!session) throw new NotFoundException('운동 기록을 찾을 수 없어요');
    if (data.note !== undefined) session.note = data.note;
    if (data.durationMinutes !== undefined) session.durationMinutes = data.durationMinutes;

    if (Array.isArray(data.exercises)) {
      // Delete existing exercises (cascades to sets)
      await this.exerciseRepo.delete({ session: { id } });

      // Re-create exercises with sets
      for (const exData of data.exercises) {
        const exercise = this.exerciseRepo.create({
          name: exData.name ?? '',
          category: exData.category ?? '',
          settings: exData.settings ?? [],
          tip: exData.tip ?? '',
          isSingleArm: exData.isSingleArm ?? false,
          differentSides: exData.differentSides ?? false,
          targetMuscles: exData.targetMuscles ?? [],
          restSeconds: exData.restSeconds ?? null,
          targetReps: exData.targetReps ?? null,
          session,
        });
        const savedEx = await this.exerciseRepo.save(exercise);
        if (Array.isArray(exData.sets)) {
          for (const setData of exData.sets) {
            const set = this.setRepo.create({
              weight: setData.weight ?? 0,
              reps: setData.reps ?? 0,
              completed: setData.completed ?? false,
              exercise: savedEx,
            });
            await this.setRepo.save(set);
          }
        }
      }
    }

    return this.sessionRepo.findOne({
      where: { id },
      relations: { exercises: { sets: true } },
    }) as Promise<WorkoutSession>;
  }

  async remove(id: string, userId: string): Promise<void> {
    const result = await this.sessionRepo.delete({ id, user: { id: userId } });
    if (result.affected === 0) throw new NotFoundException('운동 기록을 찾을 수 없어요');
  }
}