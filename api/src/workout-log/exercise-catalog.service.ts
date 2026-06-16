/**
 * @file workout-log/exercise-catalog.service.ts
 * @description 파서가 내놓은 한국어 운동명을 운동 카탈로그(exercises 테이블)에 resolve 한다.
 *
 * 핵심 원칙: 매칭은 DB/정적 매핑 기준이며 LLM이 exercise_id를 만들어내지 않는다.
 * 우선순위: 1) 별칭 정규화 → 2) 정확 일치 → 3) 부분 포함(최단 후보) → 4) null.
 *
 * 한국어 → 영어 카탈로그명 변환은 exercise-ko-mapping의 EXERCISE_NAME_KO(정적)를 역인덱싱해
 * 쓴다. DB의 nameKo 컬럼은 지연 채움(대부분 null)이라 신뢰할 수 없기 때문.
 * 카테고리(가슴/등/…)는 매칭된 카탈로그 행의 bodyPart를 한국어 카테고리로 환산한다.
 */
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Exercise } from '../exercise/exercise.entity';
import {
  EXERCISE_NAME_KO,
  translateExerciseName,
} from '../exercise/exercise-ko-mapping';

export interface ResolvedExercise {
  catalogId: string; // 매칭된 카탈로그 운동 id (추적용)
  name: string; // 저장에 쓸 한국어 표시명
  category: string; // 한국어 카테고리 (가슴/등/어깨/팔/하체/복근/유산소)
}

/** 영어 bodyPart → 앱 카테고리(한국어) 매핑 */
const BODYPART_TO_CATEGORY: Record<string, string> = {
  chest: '가슴',
  back: '등',
  shoulders: '어깨',
  neck: '어깨',
  'upper arms': '팔',
  'lower arms': '팔',
  'upper legs': '하체',
  'lower legs': '하체',
  waist: '복근',
  cardio: '유산소',
};

/**
 * 한국어 별칭/축약 → 정규 한국어명.
 * 카탈로그 한국어명은 '바벨 벤치프레스'처럼 합성형이라, 축약("벤치")을
 * 부분 포함 매칭이 가능한 정규형("벤치프레스")으로 먼저 펼친다.
 * (자주 쓰는 것부터 채운다 — 미스 시 unmatched로 안전하게 빠진다)
 */
const ALIASES: Record<string, string> = {
  벤치: '벤치프레스',
  벤치프레스: '벤치프레스',
  데드: '데드리프트',
  데드리프트: '데드리프트',
  스쿼트: '스쿼트',
  스콰트: '스쿼트',
  스퀏: '스쿼트',
  오버헤드: '오버헤드프레스',
  오버헤드프레스: '오버헤드프레스',
  밀리터리프레스: '오버헤드프레스',
  밀프: '오버헤드프레스',
  숄더프레스: '오버헤드프레스',
  어깨프레스: '오버헤드프레스',
  풀업: '풀업',
  턱걸이: '풀업',
  친업: '친업',
  랫풀: '랫풀다운',
  렛풀: '랫풀다운',
  랫풀다운: '랫풀다운',
  바벨로우: '바벨 로우',
  레그프레스: '레그프레스',
  푸시업: '푸시업',
  팔굽혀펴기: '푸시업',
};

const norm = (s: string): string => s.replace(/\s+/g, '').toLowerCase();

@Injectable()
export class ExerciseCatalogService {
  // EXERCISE_NAME_KO 역인덱스: normalize(한국어) → 영어명. 정적이라 1회만 빌드.
  private readonly revKo: { normKo: string; eng: string }[] = Object.entries(
    EXERCISE_NAME_KO,
  ).map(([eng, ko]) => ({ normKo: norm(ko), eng }));

  // 영어명(소문자) → { id, bodyPart }. DB 카탈로그에서 1회 로드 후 캐시.
  private byEng: Map<string, { id: string; bodyPart: string }> | null = null;
  // id → { name(영어), bodyPart }. exerciseId 역방향 조회용.
  private byId: Map<string, { name: string; bodyPart: string }> | null = null;

  constructor(
    @InjectRepository(Exercise)
    private readonly repo: Repository<Exercise>,
  ) {}

  private async ensureIndex(): Promise<void> {
    if (this.byEng && this.byId) return;
    const rows = await this.repo.find({
      select: { id: true, name: true, bodyPart: true },
    });
    const byEng = new Map<string, { id: string; bodyPart: string }>();
    const byId = new Map<string, { name: string; bodyPart: string }>();
    for (const r of rows) {
      const bodyPart = r.bodyPart ?? '';
      if (r.name) byEng.set(r.name.toLowerCase(), { id: r.id, bodyPart });
      byId.set(r.id, { name: r.name ?? '', bodyPart });
    }
    this.byEng = byEng;
    this.byId = byId;
  }

  private toCategory(bodyPart: string): string {
    return BODYPART_TO_CATEGORY[bodyPart.toLowerCase()] ?? '기타';
  }

  /**
   * 카탈로그 id로 한국어 표시명 + 카테고리를 돌려준다.
   * LLM/클라이언트가 보낸 exerciseId가 실제 카탈로그에 있는지 검증하는 단일 지점.
   * 없는 id면 null → 저장 거부.
   */
  async resolveById(id: string): Promise<ResolvedExercise | null> {
    await this.ensureIndex();
    const row = this.byId!.get(id);
    if (!row) return null;
    const koName =
      EXERCISE_NAME_KO[row.name.toLowerCase()] ??
      translateExerciseName(row.name) ??
      row.name;
    return { catalogId: id, name: koName, category: this.toCategory(row.bodyPart) };
  }

  /**
   * 한국어 운동명을 카탈로그에 resolve. 실패 시 null (호출부에서 unmatched 처리).
   */
  async resolve(rawName: string): Promise<ResolvedExercise | null> {
    await this.ensureIndex();
    const raw = (rawName ?? '').trim();
    if (!raw) return null;

    // 1) 별칭 정규화
    const canonical = ALIASES[norm(raw)] ?? raw;
    const target = norm(canonical);

    // 2) 정확 일치
    let eng = this.revKo.find((e) => e.normKo === target)?.eng;

    // 3) 부분 포함 — 질의를 포함하는 가장 짧은(=가장 일반적인) 카탈로그명
    if (!eng) {
      const candidates = this.revKo
        .filter((e) => e.normKo.includes(target) || target.includes(e.normKo))
        .sort((a, b) => a.normKo.length - b.normKo.length);
      eng = candidates[0]?.eng;
    }

    if (!eng) return null;

    // 카탈로그 행에서 카테고리 환산 (DB 기준)
    const row = this.byEng!.get(eng.toLowerCase());
    const category = row ? this.toCategory(row.bodyPart) : '기타';

    return {
      catalogId: row?.id ?? '',
      name: canonical, // 사용자 친화적 한국어 표시명
      category,
    };
  }
}
