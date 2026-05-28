import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface ExerciseItem {
  id: string;
  name: string;
  bodyPart: string;
  target: string;
  equipment: string;
  secondaryMuscles: string[];
  instructions: string[];
  gifUrl: string;
  met: number;
  caloriesPerMinute: number;
  difficulty: string;
}

// MET 기본값 (API 응답에 없을 때 사용)
const DEFAULT_MET: Record<string, number> = {
  chest: 6.0,
  back: 6.0,
  shoulders: 5.5,
  'upper arms': 5.0,
  'lower arms': 4.5,
  'upper legs': 6.0,
  'lower legs': 5.0,
  waist: 4.5,
  cardio: 7.5,
  'full body': 6.0,
};

const MET_BY_DIFFICULTY: Record<string, number> = {
  beginner: 4.5,
  intermediate: 6.0,
  expert: 8.0,
};

@Injectable()
export class ExerciseService {
  private readonly baseUrl = 'https://api.workoutxapp.com/v1';
  private readonly apiKey: string;

  constructor(private config: ConfigService) {
    this.apiKey = config.get<string>('WORKOUTX_API_KEY') || '';
  }

  private get headers() {
    return {
      'x-api-key': this.apiKey,
      'Content-Type': 'application/json',
    };
  }

  private normalize(item: any): ExerciseItem {
    const bodyPart = (item.bodyPart || item.body_part || '').toLowerCase();
    const difficulty = (item.difficulty || 'intermediate').toLowerCase();
    const met =
      item.met ??
      MET_BY_DIFFICULTY[difficulty] ??
      DEFAULT_MET[bodyPart] ??
      5.0;

    return {
      id: String(item.id || item._id || Math.random()),
      name: item.name || '',
      bodyPart,
      target: item.target || item.targetMuscle || '',
      equipment: item.equipment || '',
      secondaryMuscles: Array.isArray(item.secondaryMuscles)
        ? item.secondaryMuscles
        : [],
      instructions: Array.isArray(item.instructions)
        ? item.instructions
        : typeof item.instructions === 'string'
          ? [item.instructions]
          : [],
      gifUrl: item.gifUrl || item.gif_url || item.imageUrl || '',
      met: Math.round(met * 10) / 10,
      caloriesPerMinute: item.caloriesPerMinute ?? Math.round(met * 70 / 60 * 10) / 10,
      difficulty,
    };
  }

  private async request<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    try {
      const res = await fetch(url, { headers: this.headers });
      if (!res.ok) {
        throw new HttpException(
          `WorkoutX API error: ${res.status}`,
          HttpStatus.BAD_GATEWAY,
        );
      }
      return res.json() as Promise<T>;
    } catch (e: any) {
      if (e instanceof HttpException) throw e;
      throw new HttpException(
        '운동 데이터를 불러오는 중 오류가 발생했어요',
        HttpStatus.BAD_GATEWAY,
      );
    }
  }

  async search(query: string, limit = 20): Promise<ExerciseItem[]> {
    const data = await this.request<any>(
      `/exercises/search?name=${encodeURIComponent(query)}&limit=${limit}`,
    );
    const items: any[] = Array.isArray(data) ? data : data.exercises ?? data.data ?? [];
    return items.map((i) => this.normalize(i));
  }

  async getByBodyPart(part: string, limit = 20): Promise<ExerciseItem[]> {
    const data = await this.request<any>(
      `/exercises/bodyPart/${encodeURIComponent(part)}?limit=${limit}`,
    );
    const items: any[] = Array.isArray(data) ? data : data.exercises ?? data.data ?? [];
    return items.map((i) => this.normalize(i));
  }

  async getList(page = 1, limit = 20): Promise<{ data: ExerciseItem[]; total: number }> {
    const offset = (page - 1) * limit;
    const data = await this.request<any>(
      `/exercises?limit=${limit}&offset=${offset}`,
    );
    const items: any[] = Array.isArray(data) ? data : data.exercises ?? data.data ?? [];
    const total: number = data.total ?? data.totalCount ?? items.length;
    return { data: items.map((i) => this.normalize(i)), total };
  }
}
