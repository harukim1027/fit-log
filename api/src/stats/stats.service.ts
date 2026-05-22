import { Injectable } from '@nestjs/common';
import { WorkoutService } from '../workout/workout.service';

@Injectable()
export class StatsService {
  constructor(private workoutService: WorkoutService) {}

  async getWorkoutStats(userId: string) {
    const sessions = await this.workoutService.findAll(userId);
    const totalSessions = sessions.length;
    const totalVolume = sessions.reduce((sum, s) =>
      sum + s.exercises.reduce((es, ex) =>
        es + ex.sets.reduce((ss, st) => ss + st.weight * st.reps, 0), 0), 0);
    const last7 = sessions.filter(s => {
      const d = new Date(s.date);
      const week = new Date();
      week.setDate(week.getDate() - 7);
      return d >= week;
    });
    return { totalSessions, totalVolume, last7Days: last7.length };
  }
}