// PR 판단: 현재 최고 무게 >= 역대 최고 무게 (둘 다 양수여야 함)
const isPR = (currentMax: number, allTimePR: number): boolean =>
  currentMax > 0 && allTimePR > 0 && currentMax >= allTimePR;

// 1RM 추정 공식: Epley formula (weight × (1 + reps/30))
const estimateOneRM = (weight: number, reps: number): number => {
  if (reps === 1) return weight;
  if (weight <= 0 || reps <= 0) return 0;
  return Math.round(weight * (1 + reps / 30));
};

// 볼륨 기반 세션 진행률: 완료 세트 / 전체 세트
const sessionProgress = (completed: number, total: number): number => {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
};

describe('PR 판단 로직', () => {
  it('현재 무게가 기존 PR 이상이면 PR 달성', () => {
    expect(isPR(105, 100)).toBe(true);
  });

  it('현재 무게가 기존 PR과 동일해도 PR', () => {
    expect(isPR(100, 100)).toBe(true);
  });

  it('현재 무게가 기존 PR 미만이면 PR 아님', () => {
    expect(isPR(90, 100)).toBe(false);
  });

  it('현재 무게 0이면 PR 아님 (빈 세트)', () => {
    expect(isPR(0, 100)).toBe(false);
  });

  it('기존 PR 0이면 PR 아님 (히스토리 없음)', () => {
    expect(isPR(100, 0)).toBe(false);
  });

  it('둘 다 0이면 PR 아님', () => {
    expect(isPR(0, 0)).toBe(false);
  });
});

describe('1RM 추정 (Epley 공식)', () => {
  it('1회는 그대로 반환', () => {
    expect(estimateOneRM(100, 1)).toBe(100);
  });

  it('10회 100kg → 1RM 약 133kg', () => {
    // 100 × (1 + 10/30) = 100 × 1.333... ≈ 133
    expect(estimateOneRM(100, 10)).toBe(133);
  });

  it('5회 80kg → 1RM 약 93kg', () => {
    // 80 × (1 + 5/30) = 80 × 1.1666... ≈ 93
    expect(estimateOneRM(80, 5)).toBe(93);
  });

  it('무게 0이면 0', () => {
    expect(estimateOneRM(0, 10)).toBe(0);
  });

  it('횟수 0이면 0', () => {
    expect(estimateOneRM(100, 0)).toBe(0);
  });

  it('무게 높을수록 1RM 높음', () => {
    expect(estimateOneRM(120, 5)).toBeGreaterThan(estimateOneRM(100, 5));
  });

  it('횟수 많을수록 1RM 높음 (같은 무게)', () => {
    expect(estimateOneRM(100, 10)).toBeGreaterThan(estimateOneRM(100, 5));
  });
});

describe('세션 진행률', () => {
  it('0/0 이면 0%', () => {
    expect(sessionProgress(0, 0)).toBe(0);
  });

  it('0/3 이면 0%', () => {
    expect(sessionProgress(0, 3)).toBe(0);
  });

  it('1/3 이면 33%', () => {
    expect(sessionProgress(1, 3)).toBe(33);
  });

  it('2/3 이면 67%', () => {
    expect(sessionProgress(2, 3)).toBe(67);
  });

  it('3/3 이면 100%', () => {
    expect(sessionProgress(3, 3)).toBe(100);
  });

  it('완료 세트가 전체보다 많을 경우 100% 초과 가능', () => {
    // 방어 로직 없이 그대로 계산
    expect(sessionProgress(4, 3)).toBeGreaterThan(100);
  });
});
