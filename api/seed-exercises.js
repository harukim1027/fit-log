const { Client } = require('pg');
const fs = require('fs');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: '***',
  password: '***',
  database: 'fitlog',
});

async function seed() {
  await client.connect();
  const exercises = JSON.parse(fs.readFileSync('/tmp/all-exercises.json', 'utf8'));
  console.log('총', exercises.length, '개 시드 시작...');

  let count = 0;
  for (const ex of exercises) {
    try {
      await client.query(`
        INSERT INTO exercises (id, name, "bodyPart", equipment, target, "secondaryMuscles", instructions, "gifUrl", category, difficulty, met, "caloriesPerMinute", description)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT (id) DO NOTHING
      `, [
        ex.id, ex.name, ex.bodyPart, ex.equipment, ex.target,
        JSON.stringify(ex.secondaryMuscles || []),
        JSON.stringify(ex.instructions || []),
        ex.gifUrl, ex.category, ex.difficulty,
        ex.met || 0, ex.caloriesPerMinute || 0, ex.description || ''
      ]);
      count++;
    } catch (e) {
      console.error('에러:', ex.id, e.message);
    }
  }

  console.log('완료!', count, '개 저장됨');
  await client.end();
}

seed();
