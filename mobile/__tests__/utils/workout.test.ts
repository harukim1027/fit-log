import {
  calcSetVolume,
  calcExerciseVolume,
  calcSessionVolume,
} from '../../utils/workout';

const LBS_TO_KG = 2.20462;

describe('calcSetVolume', () => {
  it('미완료 세트는 0 반환', () => {
    expect(calcSetVolume({ weight: 100, reps: 10, completed: false })).toBe(0);
  });

  it('완료된 세트 볼륨 = 무게(kg) × 횟수', () => {
    expect(calcSetVolume({ weight: 100, reps: 10, completed: true })).toBe(1000);
  });

  it('lbs 단위는 kg 환산 후 계산', () => {
    // 100kg × LBS_TO_KG ≈ 220.462lbs → 볼륨 ≈ 1000kg
    const weightLbs = 100 * LBS_TO_KG;
    const result = calcSetVolume({ weight: weightLbs, reps: 10, completed: true, unit: 'lbs' });
    expect(result).toBeCloseTo(1000, 0);
  });

  it('단팔 운동(isSingleArm=true)이면 볼륨 × 2', () => {
    // 양팔 합산이므로 20kg × 10회 × 2 = 400
    expect(calcSetVolume({ weight: 20, reps: 10, completed: true }, true)).toBe(400);
  });

  it('무게 0이면 볼륨 0', () => {
    expect(calcSetVolume({ weight: 0, reps: 10, completed: true })).toBe(0);
  });

  it('횟수 0이면 볼륨 0', () => {
    expect(calcSetVolume({ weight: 100, reps: 0, completed: true })).toBe(0);
  });
});

describe('calcExerciseVolume', () => {
  it('완료된 세트만 합산', () => {
    const ex = {
      sets: [
        { weight: 100, reps: 10, completed: true },   // 1000
        { weight: 100, reps: 10, completed: false },  // 제외
        { weight: 80, reps: 12, completed: true },    // 960
      ],
    };
    expect(calcExerciseVolume(ex)).toBe(1960);
  });

  it('빈 세트 배열이면 0', () => {
    expect(calcExerciseVolume({ sets: [] })).toBe(0);
  });

  it('모든 세트 미완료이면 0', () => {
    const ex = {
      sets: [
        { weight: 100, reps: 10, completed: false },
        { weight: 80, reps: 12, completed: false },
      ],
    };
    expect(calcExerciseVolume(ex)).toBe(0);
  });

  it('isSingleArm=true 이면 각 세트 볼륨 × 2', () => {
    const ex = {
      sets: [{ weight: 20, reps: 10, completed: true }],
      isSingleArm: true,
    };
    expect(calcExerciseVolume(ex)).toBe(400);
  });

  it('lbs 단위 세트 포함 시 kg 환산 합산', () => {
    const ex = {
      sets: [
        { weight: 100, reps: 5, completed: true, unit: 'kg' },         // 500
        { weight: 100 * LBS_TO_KG, reps: 5, completed: true, unit: 'lbs' }, // ≈ 500
      ],
    };
    expect(calcExerciseVolume(ex)).toBeCloseTo(1000, 0);
  });
});

describe('calcSessionVolume', () => {
  it('전체 종목 볼륨 합산', () => {
    const session = {
      exercises: [
        { sets: [{ weight: 100, reps: 10, completed: true }] },  // 1000
        { sets: [{ weight: 50, reps: 8, completed: true }] },    // 400
      ],
    };
    expect(calcSessionVolume(session)).toBe(1400);
  });

  it('운동 없으면 0', () => {
    expect(calcSessionVolume({ exercises: [] })).toBe(0);
  });

  it('모든 세트 미완료이면 0', () => {
    const session = {
      exercises: [
        { sets: [{ weight: 100, reps: 10, completed: false }] },
      ],
    };
    expect(calcSessionVolume(session)).toBe(0);
  });

  it('완료/미완료 혼합: 완료 세트만 합산', () => {
    const session = {
      exercises: [
        {
          sets: [
            { weight: 100, reps: 5, completed: true },   // 500
            { weight: 100, reps: 5, completed: false },  // 제외
          ],
        },
      ],
    };
    expect(calcSessionVolume(session)).toBe(500);
  });

  it('여러 종목 중 일부만 완료', () => {
    const session = {
      exercises: [
        {
          sets: [
            { weight: 80, reps: 8, completed: true },  // 640
            { weight: 80, reps: 8, completed: true },  // 640
          ],
        },
        {
          sets: [
            { weight: 60, reps: 10, completed: false }, // 제외
          ],
        },
      ],
    };
    expect(calcSessionVolume(session)).toBe(1280);
  });
});
