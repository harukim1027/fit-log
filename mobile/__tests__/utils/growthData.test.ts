import { buildExerciseGrowthData } from '../../utils/workout';

/**
 * 회귀 방지 테스트 — 종목별 성장 그래프의 0kg/미완료 제외 규칙.
 * 이 규칙은 과거 여러 번 롤백됐다. 이 테스트가 깨지면 규칙이 사라진 것이니 되살릴 것.
 */

const set = (weight: number, reps: number, completed: boolean, unit: 'kg' | 'lbs' = 'kg') => ({
  weight,
  reps,
  completed,
  unit,
});

const session = (
  date: string,
  sets: ReturnType<typeof set>[],
  name = '벤치프레스',
) => ({ date, exercises: [{ name, sets }] });

describe('buildExerciseGrowthData', () => {
  it('완료 세트만 대상으로 최고 무게를 잡는다', () => {
    const data = buildExerciseGrowthData(
      [
        session('2026-06-01', [set(100, 10, true), set(120, 8, false)]), // 120은 미완료 → 무시
        session('2026-06-02', [set(110, 10, true)]),
      ],
      '벤치프레스',
    );
    expect(data).toEqual([
      { date: '2026-06-01', maxWeight: 100 },
      { date: '2026-06-02', maxWeight: 110 },
    ]);
  });

  it('완료 세트가 없는 세션은 데이터 포인트에서 제외된다', () => {
    const data = buildExerciseGrowthData(
      [
        session('2026-06-01', [set(100, 10, true)]),
        session('2026-06-02', [set(90, 10, false)]), // 전부 미완료 → 제외
        session('2026-06-03', [set(110, 10, true)]),
      ],
      '벤치프레스',
    );
    expect(data?.map((d) => d.date)).toEqual(['2026-06-01', '2026-06-03']);
  });

  it('완료했어도 kg 환산 최고 무게가 0 이하이면 제외한다 (맨몸/무게 미기록)', () => {
    const data = buildExerciseGrowthData(
      [
        session('2026-06-01', [set(0, 15, true)]), // 0kg → 제외
        session('2026-06-02', [set(100, 10, true)]),
        session('2026-06-03', [set(105, 10, true)]),
      ],
      '벤치프레스',
    );
    expect(data?.map((d) => d.date)).toEqual(['2026-06-02', '2026-06-03']);
    expect(data?.some((d) => d.maxWeight === 0)).toBe(false);
  });

  it('lbs 세트는 kg으로 환산해 비교/표시한다', () => {
    const data = buildExerciseGrowthData(
      [
        session('2026-06-01', [set(220, 10, true, 'lbs')]), // 220lbs ≈ 99.8kg
        session('2026-06-02', [set(100, 10, true, 'kg')]),
      ],
      '벤치프레스',
    );
    expect(data?.[0].maxWeight).toBeCloseTo(99.8, 1);
    expect(data?.[1].maxWeight).toBe(100);
  });

  it('유효 포인트가 2개 미만이면 null (그래프 대신 안내 문구)', () => {
    const one = buildExerciseGrowthData(
      [
        session('2026-06-01', [set(100, 10, true)]),
        session('2026-06-02', [set(0, 10, true)]), // 제외 → 유효 1개
      ],
      '벤치프레스',
    );
    expect(one).toBeNull();
    expect(buildExerciseGrowthData([], '벤치프레스')).toBeNull();
  });

  it('종목명이 없으면 null', () => {
    expect(buildExerciseGrowthData([session('2026-06-01', [set(100, 10, true)])], null)).toBeNull();
  });

  it('입력 순서와 무관하게 날짜 오름차순으로 정렬한다', () => {
    const data = buildExerciseGrowthData(
      [
        session('2026-06-03', [set(110, 10, true)]),
        session('2026-06-01', [set(100, 10, true)]),
        session('2026-06-02', [set(105, 10, true)]),
      ],
      '벤치프레스',
    );
    expect(data?.map((d) => d.date)).toEqual(['2026-06-01', '2026-06-02', '2026-06-03']);
  });
});
