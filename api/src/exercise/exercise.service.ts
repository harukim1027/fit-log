import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as fs from 'fs';
import * as path from 'path';
import { Exercise } from './exercise.entity';
import {
  translateExerciseName,
  translateBodyPart,
  translateEquipment,
  translateDifficulty,
  translateTarget,
} from './exercise-ko-mapping';

const LIBRE_TRANSLATE_URL = 'https://libretranslate.com/translate';
const TRANSLATE_TIMEOUT_MS = 4000;

@Injectable()
export class ExerciseService {
  private readonly logger = new Logger(ExerciseService.name);

  constructor(
    @InjectRepository(Exercise)
    private readonly repo: Repository<Exercise>,
  ) {}

  // ─── 시드 ──────────────────────────────────────────────────────────────────

  async seedExercises(): Promise<void> {
    const seedPath = path.join(__dirname, 'exercises-seed.json');
    if (!fs.existsSync(seedPath)) {
      this.logger.warn('exercises-seed.json not found, skipping seed');
      return;
    }

    const raw = fs.readFileSync(seedPath, 'utf-8');
    const seedData: any[] = JSON.parse(raw);

    const existing = await this.repo.find({ select: { id: true } });
    const existingIds = new Set(existing.map((e) => e.id));

    const toInsert = seedData
      .filter((item) => !existingIds.has(String(item.id)))
      .map((item) => {
        const name: string = item.name || '';
        return this.repo.create({
          id: String(item.id),
          name,
          bodyPart: (item.bodyPart || '').toLowerCase(),
          equipment: item.equipment || null,
          target: item.target || null,
          secondaryMuscles: Array.isArray(item.secondaryMuscles)
            ? item.secondaryMuscles
            : [],
          instructions: Array.isArray(item.instructions)
            ? item.instructions
            : [],
          gifUrl: item.gifUrl || null,
          category: item.category || null,
          difficulty: item.difficulty || null,
          met: item.met ?? null,
          caloriesPerMinute: item.caloriesPerMinute ?? null,
          description: item.description || null,
          nameKo: translateExerciseName(name),
        });
      });

    if (toInsert.length === 0) {
      this.logger.log('운동 데이터 이미 최신 상태');
      return;
    }

    const BATCH = 100;
    for (let i = 0; i < toInsert.length; i += BATCH) {
      await this.repo.save(toInsert.slice(i, i + BATCH));
    }
    this.logger.log(`${toInsert.length}개 운동 데이터 시드 완료`);
  }

  // ─── 검색 ──────────────────────────────────────────────────────────────────

  async search(query: string, userId?: string, limit = 20): Promise<any[]> {
    const q = query.trim();
    if (!q) return [];
    const rows = await this.repo
      .createQueryBuilder('e')
      .where('(e.name ILIKE :q OR e.bodyPart ILIKE :q OR e.target ILIKE :q)', { q: `%${q}%` })
      .andWhere('(e.userId IS NULL OR e.userId = :uid)', { uid: userId ?? '' })
      .limit(limit)
      .getMany();
    return (await this.localizeAll(rows)).map(e => ({
      ...e,
      isCustom: !!e.userId,
    }));
  }

  async createCustomExercise(userId: string, data: {
    name: string; category: string; nameKo?: string;
  }): Promise<any> {
    const existing = await this.repo.findOne({ where: { name: data.name, userId } });
    if (existing) return this.localize(existing);
    const entity = this.repo.create({
      id: `custom_${userId}_${Date.now()}`,
      name: data.name,
      nameKo: data.nameKo ?? data.name,
      bodyPart: data.category,
      userId,
      secondaryMuscles: [],
      instructions: [],
    });
    const saved = await this.repo.save(entity);
    return { ...this.localize(saved), isCustom: true };
  }

  async findByBodyPart(bodyPart: string, limit = 20): Promise<any[]> {
    const part = bodyPart.trim().toLowerCase();
    if (!part) return [];
    const rows = await this.repo
      .createQueryBuilder('e')
      .where('e.bodyPart ILIKE :part', { part: `%${part}%` })
      .limit(limit)
      .getMany();
    return this.localizeAll(rows);
  }

  async findAll(
    page = 1,
    limit = 20,
  ): Promise<{ data: any[]; total: number }> {
    const [rows, total] = await this.repo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { name: 'ASC' },
    });
    return { data: await this.localizeAll(rows), total };
  }

  // ─── 번역 헬퍼 ─────────────────────────────────────────────────────────────

  /** 결과 배열 전체 한국어 변환 */
  private async localizeAll(exercises: Exercise[]): Promise<any[]> {
    // nameKo가 없는 항목만 LibreTranslate 시도
    const needTranslation = exercises.filter((e) => !e.nameKo);
    if (needTranslation.length > 0) {
      await Promise.all(needTranslation.map((e) => this.fillNameKo(e)));
    }
    return exercises.map((e) => this.localize(e));
  }

  /** nameKo 없는 운동: 매핑 → LibreTranslate → DB 저장 */
  private async fillNameKo(exercise: Exercise): Promise<void> {
    const mapped = translateExerciseName(exercise.name);
    // 단어 번역으로 원문과 달라진 경우 (매핑 성공)
    if (mapped !== exercise.name) {
      exercise.nameKo = mapped;
      await this.repo.update(exercise.id, { nameKo: mapped });
      return;
    }

    // LibreTranslate 시도
    const translated = await this.callLibreTranslate(exercise.name);
    const nameKo = translated || exercise.name;
    exercise.nameKo = nameKo;
    await this.repo.update(exercise.id, { nameKo });
  }

  /** LibreTranslate API 호출 (타임아웃 4초) */
  private async callLibreTranslate(text: string): Promise<string | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TRANSLATE_TIMEOUT_MS);
    try {
      const res = await fetch(LIBRE_TRANSLATE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: 'en',
          target: 'ko',
          format: 'text',
        }),
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) return null;
      const data: any = await res.json();
      const result = (data.translatedText ?? '').trim();
      return result || null;
    } catch {
      clearTimeout(timer);
      return null;
    }
  }

  /** Exercise 엔티티 → 한국어 필드 포함 응답 객체 */
  private localize(e: Exercise): any {
    return {
      id: e.id,
      name: e.name,
      nameKo: e.nameKo || e.name,
      bodyPart: e.bodyPart,
      bodyPartKo: translateBodyPart(e.bodyPart),
      equipment: e.equipment,
      equipmentKo: e.equipment ? translateEquipment(e.equipment) : null,
      target: e.target,
      targetKo: e.target ? translateTarget(e.target) : null,
      secondaryMuscles: e.secondaryMuscles,
      instructions: e.instructions,
      gifUrl: e.gifUrl,
      category: e.category,
      difficulty: e.difficulty,
      difficultyKo: e.difficulty ? translateDifficulty(e.difficulty) : null,
      met: e.met,
      caloriesPerMinute: e.caloriesPerMinute,
      description: e.description,
    };
  }
}
