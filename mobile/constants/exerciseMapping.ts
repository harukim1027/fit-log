export const EXERCISE_MAPPING: Record<string, string> = {
  // 가슴
  벤치프레스: 'bench press',
  '인클라인 벤치프레스': 'incline bench press',
  '디클라인 벤치프레스': 'decline bench press',
  딥스: 'dips',
  '케이블 플라이': 'cable fly',
  '체스트 플라이': 'chest fly',
  '덤벨 플라이': 'dumbbell fly',
  풀오버: 'pullover',
  '덤벨 풀오버': 'dumbbell pullover',
  '인클라인 덤벨 플라이': 'incline dumbbell fly',
  푸시업: 'push up',
  '와이드 푸시업': 'wide push up',

  // 등
  데드리프트: 'deadlift',
  '바벨 로우': 'barbell row',
  '덤벨 로우': 'dumbbell row',
  풀업: 'pull up',
  친업: 'chin up',
  '시티드 로우': 'seated row',
  랫풀다운: 'lat pulldown',
  '케이블 로우': 'cable row',
  하이퍼익스텐션: 'hyperextension',
  '페이스 풀': 'face pull',
  '티바 로우': 't bar row',

  // 어깨
  오버헤드프레스: 'overhead press',
  숄더프레스: 'shoulder press',
  '사이드 레터럴 레이즈': 'lateral raise',
  '레터럴 레이즈': 'lateral raise',
  '프론트 레이즈': 'front raise',
  '리어 델트 플라이': 'rear delt fly',
  '업라이트 로우': 'upright row',
  아놀드프레스: 'arnold press',
  '덤벨 숄더프레스': 'dumbbell shoulder press',

  // 팔
  '바벨 컬': 'barbell curl',
  '덤벨 컬': 'dumbbell curl',
  '해머 컬': 'hammer curl',
  '컨센트레이션 컬': 'concentration curl',
  '인클라인 덤벨 컬': 'incline dumbbell curl',
  '트라이셉스 익스텐션': 'triceps extension',
  '오버헤드 트라이셉스 익스텐션': 'overhead triceps extension',
  '케이블 푸시다운': 'cable pushdown',
  스컬크러셔: 'skull crusher',
  '트라이셉스 딥스': 'triceps dips',
  '리버스 컬': 'reverse curl',

  // 하체
  스쿼트: 'squat',
  '바벨 스쿼트': 'barbell squat',
  '스모 스쿼트': 'sumo squat',
  레그프레스: 'leg press',
  런지: 'lunge',
  '덤벨 런지': 'dumbbell lunge',
  '레그 컬': 'leg curl',
  '레그 익스텐션': 'leg extension',
  힙쓰러스트: 'hip thrust',
  '바벨 힙쓰러스트': 'barbell hip thrust',
  '불가리안 스쿼트': 'bulgarian squat',
  '루마니안 데드리프트': 'romanian deadlift',
  '카프 레이즈': 'calf raise',
  카프레이즈: 'calf raise',
  '시티드 카프 레이즈': 'seated calf raise',
  '힙 어브덕션': 'hip abduction',
  '힙 어덕션': 'hip adduction',
  글루트브리지: 'glute bridge',

  // 복근
  플랭크: 'plank',
  '사이드 플랭크': 'side plank',
  크런치: 'crunch',
  '바이시클 크런치': 'bicycle crunch',
  '레그 레이즈': 'leg raise',
  '케이블 크런치': 'cable crunch',
  '마운틴 클라이머': 'mountain climber',
  '러시안 트위스트': 'russian twist',
  싯업: 'sit up',
  '행잉 레그 레이즈': 'hanging leg raise',
  '토 터치': 'toe touch',

  // 유산소
  러닝머신: 'treadmill',
  트레드밀: 'treadmill',
  자전거: 'bicycle',
  실내자전거: 'stationary bike',
  로잉머신: 'rowing machine',
  일립티컬: 'elliptical',
  줄넘기: 'jump rope',
  버피: 'burpee',
  '점핑잭': 'jumping jacks',
  '스텝업': 'step up',
  '계단 오르기': 'stair climbing',

  // 전신
  '케틀벨 스윙': 'kettlebell swing',
  케틀벨스윙: 'kettlebell swing',
  '터키시 겟업': 'turkish get up',
  '클린앤저크': 'clean and jerk',
  스내치: 'snatch',
  '파워 클린': 'power clean',
};

export function lookupEnglish(query: string): string | null {
  const q = query.trim();
  if (!q) return null;

  if (EXERCISE_MAPPING[q]) return EXERCISE_MAPPING[q];

  for (const [ko, en] of Object.entries(EXERCISE_MAPPING)) {
    if (ko.startsWith(q) || q.startsWith(ko)) return en;
  }

  return null;
}
