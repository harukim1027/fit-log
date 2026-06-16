// 실행: npx tsx src/workout-log/workout-parser.eval.ts  (ANTHROPIC_API_KEY 필요)
import { parseWorkout } from './workout-parser';

type ExpectedExercise = {
  name: string;
  sets: number | null;
  reps: number | null;
  weight_kg: number | null;
};
type Case =
  | { input: string; expect: ExpectedExercise[] }
  | { input: string; expectAmbiguous: true };

const CASES: Case[] = [
  {
    input: '어제 벤치 60kg 5세트 5회',
    expect: [{ name: '벤치', sets: 5, reps: 5, weight_kg: 60 }],
  },
  {
    input: '스쿼트 100 3x8',
    expect: [{ name: '스쿼트', sets: 3, reps: 8, weight_kg: 100 }],
  },
  {
    input: '풀업 3세트',
    expect: [{ name: '풀업', sets: 3, reps: null, weight_kg: null }],
  },
  {
    input: '데드 140 1세트 3회 그리고 오버헤드프레스 40 3세트 10회',
    expect: [
      { name: '데드', sets: 1, reps: 3, weight_kg: 140 },
      { name: '오버헤드', sets: 3, reps: 10, weight_kg: 40 },
    ],
  },
  { input: '오늘 그냥 좀 했음', expectAmbiguous: true },
];

const numEq = (a: number | null, b: number | null) => a === b;

async function run() {
  let fieldPass = 0,
    fieldTotal = 0,
    casePass = 0;
  for (const c of CASES) {
    const got = await parseWorkout(c.input);
    if ('expectAmbiguous' in c) {
      const ok = got.ambiguous === true;
      casePass += ok ? 1 : 0;
      console.log(`${ok ? '✅' : '❌'} [ambiguous] "${c.input}"`);
      continue;
    }
    let caseOk = got.exercises.length === c.expect.length;
    c.expect.forEach((exp, i) => {
      const ex = got.exercises[i];
      const checks = [
        ex ? ex.name.includes(exp.name) : false,
        ex ? numEq(ex.sets, exp.sets) : false,
        ex ? numEq(ex.reps, exp.reps) : false,
        ex ? numEq(ex.weight_kg, exp.weight_kg) : false,
      ];
      for (const ok of checks) {
        fieldTotal++;
        if (ok) fieldPass++;
        else caseOk = false;
      }
    });
    casePass += caseOk ? 1 : 0;
    console.log(`${caseOk ? '✅' : '❌'} "${c.input}"`);
    if (!caseOk) console.log('   got:', JSON.stringify(got.exercises));
  }
  console.log(
    `\n케이스 ${casePass}/${CASES.length}, 필드 정확도 ${(
      (fieldPass / fieldTotal) *
      100
    ).toFixed(1)}%`,
  );
}
run().catch((e) => {
  console.error(e);
  process.exit(1);
});
