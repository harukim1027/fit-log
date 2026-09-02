# 배포 전 필수 항목

배포하기 전에 반드시 해소해야 하는 것들만 모은다. "언젠가 고치면 좋은 것"은
여기 적지 않는다 — 그건 각 영역의 README나 이슈로 간다.

한 항목에는 **위치 · 위험 · 차단 시점 · 해소에 필요한 것**을 모두 적는다.
위험을 적을 때는 "무엇이 어떻게 깨지는가"를 쓴다. "주의가 필요하다" 같은
문장은 아무것도 막지 못한다.

| # | 항목 | 영역 | 해소 시점 | 상태 |
|---|---|---|---|---|
| 1 | `synchronize: true`가 운영에서 켜져 있다 | api | Phase 1-B 완료 후 | ✅ **해소** — PR #37 배포 |
| 2 | 검증된 운영 백업이 없다 | 운영 | 항목 1 착수 전 | ✅ 해소 — `prod3.dump` 확보, 복원 검증 완료 |

**현재 미해소 0건.** 아래는 어떻게 닫았는지의 기록이다.

## 스키마를 바꾸는 방법 — 지금부터의 규칙

**항목 1이 닫히면서 위 세 규칙(엔티티 수정 금지 등)은 해제됐다.**
엔티티는 이제 자유롭게 고칠 수 있다. 대신 **엔티티만 고쳐서는 운영 스키마가
바뀌지 않는다** — `synchronize: false`이므로 마이그레이션이 유일한 수단이다.

```bash
# 1. 엔티티를 고친다
# 2. 마이그레이션을 만든다 (build가 먼저 돈다)
npm run migration:generate -- src/migrations/<이름>
# 3. 생성된 SQL을 눈으로 확인한다 — 의도한 것만 있는지, down()이 맞는지
# 4. dist에 반영한 뒤 로컬에서 왕복 테스트
npm run build && npm run migration:run
npm run migration:revert
```

배포하면 `railway.json`의 `startCommand`가 기동 전에 `migration:run`을 돌린다.

**주의할 것 셋.**

1. **`down()`을 반드시 확인한다.** 롤백은 `down()`이 도는 것이다.
   컬럼 DROP처럼 `down()`으로 복구되지 않는 변경은 백업 복원이 유일한 수단이다.
2. **컬럼 `default` 추가는 기존 레코드를 채우지 않는다.** 새로 만들어지는 행에만
   붙는다. 기존 행까지 채우려면 마이그레이션에 `UPDATE`를 직접 쓴다 —
   그것이 필요한지부터 판단할 것(`weeklyGoal`은 일부러 채우지 않았다).
3. **파괴적 변경 전에는 백업을 받는다.** 절차는 항목 2에.

---

## 1. `synchronize: true`가 운영에서 켜져 있다 — ✅ 해소

### 위치

`api/src/app.module.ts`

- **27번 줄** — `DATABASE_URL`이 있을 때 쓰는 설정. **Railway 운영 DB가 여기다.**
- **37번 줄** — 로컬 설정(`DB_HOST` 등).

두 분기 모두 `synchronize: true`다. 운영만 끄고 로컬만 켜 둔 구조가 아니다.

### 위험

`synchronize: true`는 앱이 뜰 때마다 엔티티 정의와 실제 스키마를 비교해
**자동으로 스키마를 맞춘다.** 엔티티 파일을 고치는 것이 곧 운영 스키마를
고치는 것이다.

가장 큰 위험은 **컬럼 이름을 바꿀 때**다. TypeORM은 "이름이 바뀌었다"를
알지 못한다. 옛 이름의 컬럼이 엔티티에 없으니 **DROP**하고, 새 이름의
컬럼이 스키마에 없으니 **CREATE**한다. 그 사이에 데이터를 옮기는 단계는
없다. 해당 컬럼의 모든 값이 사라지고, **되돌릴 방법이 없다** —
마이그레이션 이력이 없으니 down도 없고, 삭제된 값을 복원할 근거도 없다.

컬럼 삭제·타입 변경·NOT NULL 전환도 같은 경로로 조용히 실행된다.
배포 로그에 눈에 띄는 경고가 남지 않는다.

여기에 **Railway가 git push마다 자동 배포**한다(루트 `README.md`의
"CI/CD 파이프라인"). 즉 엔티티 파일을 고쳐 push하는 것만으로 운영 스키마
변경이 실행된다. 리뷰에서 놓치면 그대로 나간다.

### 당시 상태 — 이미 열려 있던 위험이었다

> 아래는 해소 전 기록이다. **"배포 전에 막는 것"이 아니라 이미 열려 있던
> 위험이었다.** TestFlight 배포가 나간 뒤였고 운영에 실사용자가 있었다.

| 항목 | 값 |
|---|---|
| TestFlight | **배포됨** |
| 운영 실사용자 | **5명** |
| Railway 자동 백업 | **없음** — 스케줄 백업은 Pro 플랜 전용 |
| 존재하는 백업 | `prod3.dump` (232,491바이트) |
| 백업 복원 검증 | ✅ **됨** — `fitlog_restore_test`로 복원해 `users` 5행 확인 |
| 복구 시 손실 | 마지막 백업 시점 이후 전부 (수동 백업이라 주기가 없다) |

> ⚠️ **검증되지 않은 백업은 백업이 아니다.** 이 원칙을 지키지 않아 0바이트
> 파일 4건을 백업으로 세고 있었다 — 항목 2 참조.

앞선 판에서 이 자리에 "5행이고 전부 테스트 계정"이라고 적었던 것은 **틀렸다.**
그건 직접 센 것이 아니라 전제를 옮겨 적은 것이었다. 로컬 DB
(`localhost:5432 / fitlog`)를 실제로 세어 보면 명백한 테스트 계정은
`test` / `test.com` 둘뿐이고 나머지 셋은 실제 도메인(`gmail.com`,
`naver.com`, `gm.hannam.ac.kr`)이며, `workout_sessions` 70행 ·
`workout_sets` 132행 · `routines` 7개가 쌓여 있다. 로컬조차 빈 스캐폴딩이
아니었다. **운영은 더 보수적으로 볼 것.**

### 해소 시점

**Phase 1-B 완료 후, Phase 2 진입 전.**

Phase 1-B(디자인 시스템 호출부 교체)는 `mobile/` 안에서만 움직이므로 엔티티에
닿지 않는다. 그동안은 위 "현재 작업 중 지킬 규칙"으로 버티고, Phase 2에
들어가기 전에 인프라를 세운다.

### 진행 상황

**전부 끝났다.** 리허설은 운영 복원본 `fitlog_restore_test`로 전 과정을 돌렸고,
베이스라인은 운영에 `--fake`로 기록한 뒤 PR #37로 배포했다.

- [x] **0. 검증된 백업 확보** — `prod3.dump`를 `fitlog_restore_test`로 복원해
      `users` 5행 확인 (항목 2)
- [x] 1. 운영 스키마와 엔티티 대조 — 복원본에 대고 `migration:generate`를 돌려
      **"No changes in database schema were found"**. 엔티티와 운영 스키마가 일치한다
- [x] 2. `api/src/data-source.ts` 작성
- [x] 3. `package.json`에 `migration:generate` / `migration:run` / `migration:revert`
- [x] 4. 베이스라인 생성 + `--fake` 기록 — 복원본 ✅, **운영 ✅**
- [x] 5. `synchronize: false` 전환 (`app.module.ts` 두 분기 모두) — 코드 반영
- [x] 6-a. `railway.json` `startCommand`에 `migration:run` 추가 — 코드 반영
- [x] 6-b. **배포** — PR #37 머지. 항목 1이 닫혔다

**`synchronize: false`는 베이스라인을 기록한 뒤에 끈다.** 순서를 바꾸면
그 사이 배포에서 스키마가 아무에게도 관리되지 않는 구간이 생긴다.
리허설에서도 이 순서로 했다.

#### 왜 세 스크립트 전부 dist 기준인가

운영 기동이 `node dist/main.js`(`railway.json`)이고, 배포에 마이그레이션을
붙이면 그것도 dist에서 돈다. CLI만 ts-node로 돌리면 **"로컬에서는 되는데
배포에서 깨지는" 경로가 하나 더 생긴다.** `ts-node`·`tsconfig-paths`가
설치돼 있어 선택지는 있었지만 쓰지 않았다.

대신 `migration:generate` 뒤에 빌드가 한 번 더 필요하다. 생성물은 `.ts`인데
`migration:run`은 `dist/migrations/*.js`를 보기 때문이다.

```
npm run migration:generate -- src/migrations/<이름>
npm run build
npm run migration:run
```

> `data-source.ts`의 export는 **하나뿐이어야 한다.** `AppDataSource`와
> `export default`를 함께 두면 CLI가 DataSource를 둘로 세어
> "Given data source file must contain only one export of DataSource instance"로
> 죽는다. 리허설에서 실제로 걸렸다.

> migrations 글롭은 `*.js`로 못박았다. `*{.ts,.js}`로 쓰면 `tsconfig`의
> `declaration: true` 때문에 dist에 함께 생기는 `1234-Foo.d.ts`가 `*.ts`에
> 걸린다. entities 글롭(`*.entity{.ts,.js}`)은 `.entity.d.ts`가
> `.entity.ts`로 끝나지 않아 안전하므로 `app.module.ts`와 같은 값을 그대로 뒀다.

#### 리허설 결과 (`fitlog_restore_test`)

| 단계 | 결과 |
|---|---|
| 엔티티 ↔ 복원 스키마 대조 | "No changes in database schema were found" |
| 베이스라인 생성 | 12 `CREATE TABLE` + 20 FK. 복원본 테이블 12개와 일치 |
| 베이스라인 실제 실행 (빈 스크래치 DB) | 성공. 확인 후 스크래치 DB 삭제 |
| 베이스라인 `--fake` 기록 | `INSERT INTO migrations` 한 줄만. `CREATE TABLE` 0건 |
| `synchronize: false`로 앱 기동 | `pg_dump -s` 전후 **완전 동일**. 스키마 변경 0건 |
| 테스트 마이그레이션 run → revert | 컬럼 추가 → 확인 → 삭제 → 확인 |
| 왕복 후 스키마 | 처음과 **완전 동일** |
| 데이터 보존 | 전 과정에서 `users` 5행 유지 |

> `uuid_generate_v4()`는 베이스라인에 `CREATE EXTENSION`이 없어도 동작했다.
> TypeORM의 Postgres 드라이버가 접속 시 `CREATE EXTENSION IF NOT EXISTS
> "uuid-ossp"`를 직접 실행한다(`PostgresDriver.js:302`). **단 DB 역할에 확장
> 설치 권한이 필요하고**, 없으면 경고만 남기고 넘어간다. 새 환경을 만들 때
> 확인할 것.

### 운영 적용 절차

**★ 이 절차 직전에 새 백업을 받는다.** `prod3.dump`는 리허설용으로 받은 것이고,
운영 적용 시점의 데이터가 아니다. 절차는 항목 2에 있다.

1. **베이스라인을 운영에 `--fake`로 기록** — ✅ **완료**

   운영에는 이미 테이블이 다 있으므로 실제로 실행하면 안 된다.

   ```bash
   DATABASE_URL="<운영 URL>" npm run build
   DATABASE_URL="<운영 URL>" npm run migration:run -- --fake
   ```

   기록된 것은 `Baseline1788323766794` 하나다. 실행 로그에서 나간 SQL은 둘뿐이었다.

   | 실행된 SQL | 건수 |
   |---|---|
   | `CREATE TABLE "migrations"` | 1 |
   | `INSERT INTO "migrations"` | 1 |
   | **스키마 변경 SQL**(`CREATE TABLE` 12건 · `ALTER TABLE` 20건) | **0** |

   `--fake`가 의도대로 동작했다는 뜻이다. 운영 스키마는 그대로이고
   `migrations` 테이블만 새로 생겨 베이스라인이 "실행됨"으로 기록됐다.

2. **`railway.json`에 마이그레이션 단계를 붙인다** — ✅ 코드 반영 완료, **배포 남음**

   ```json
   "deploy": { "startCommand": "npm run migration:run && node dist/main.js" }
   ```

   **`&&`인 이유:** 마이그레이션이 실패하면 그 자리에서 멈춰 `node dist/main.js`에
   도달하지 못한다. 즉 **스키마와 코드가 어긋난 채로 서비스가 뜨는 일이 없다.**
   `;`나 별도 단계로 두면 마이그레이션이 실패해도 앱이 그대로 떠서, 코드가
   기대하는 컬럼이 없는 상태로 요청을 받게 된다 — 500이 흩어져 나오고 원인이
   배포 로그 위쪽에 파묻힌다. 실패는 기동 실패로 드러나는 편이 낫다.

   `restartPolicyType: "ON_FAILURE"`와 함께 두면 마이그레이션이 일시적 사유
   (커넥션 끊김 등)로 실패했을 때 재시도된다. 마이그레이션 내용 자체가 잘못됐다면
   재시도해도 같은 지점에서 실패하므로 배포가 올라가지 않는다. 그게 맞는 동작이다.

   > 순서 주의. 1번보다 2번을 먼저 push했다면 첫 배포에서 베이스라인이 **실제로**
   > 실행돼 이미 있는 테이블을 다시 만들려 들었을 것이다. 1번을 먼저 끝냈다.

   **이 브랜치를 push하면 그 배포에서 함께 나가는 것:**
   `railway.json`의 `startCommand`, `synchronize: false`, `data-source.ts`,
   베이스라인 마이그레이션. 운영에 베이스라인이 이미 기록돼 있으므로
   기동 시 `migration:run`은 **실행할 것이 없다고 판단하고 통과**한다.

3. **롤백.** 마지막 마이그레이션은 `npm run migration:revert`로 되돌린다
   (`down()`이 도는 것이므로 `down()`을 확인하고 배포할 것).
   **`down()`으로 복구되지 않는 변경**(컬럼 DROP 등)은 백업 복원이 유일한 수단이다.
   그래서 1번 전에 백업을 받는다.

4. **다운타임.** 마이그레이션이 기동 전에 돌므로 그만큼 새 인스턴스 기동이
   늦어진다. 베이스라인은 `--fake`라 사실상 0초다. 이후 마이그레이션은 내용에
   따라 다르고, 테이블 전체를 다시 쓰는 대형 `ALTER`는 잠금이 걸리므로 그때
   따로 판단한다.

#### 베이스라인은 `--fake`로 기록한다

운영에는 이미 테이블이 다 있으므로 베이스라인 마이그레이션을 **실행하면 안 된다.**
설치된 TypeORM은 **0.3.30**이고, `migration:run`과 `migration:revert` 모두
`-f, --fake`를 지원한다. 수동 INSERT는 필요 없다.

```bash
# 실행하지 않고 migrations 테이블에 "실행됨"으로 기록만 남긴다
npm run migration:run -- --fake
```

리허설에서 실제로 확인했다 — `INSERT INTO migrations` 한 줄만 나가고
`CREATE TABLE`은 한 건도 실행되지 않았다.

> 낡은 문서에 "TypeORM에는 `--fake`가 없어 `migrations` 테이블에 직접 INSERT해야
> 한다"는 이야기가 돌아다닌다. 그건 0.2.x 시절이다. 이 저장소에는 해당하지 않는다.

드리프트 확인에도 쓸 수 있는 읽기 전용 수단이 있다. 둘 다 DB를 읽기만 한다:

```bash
npx typeorm migration:generate -d dist/data-source.js --dryrun   # 생성될 SQL만 출력
npx typeorm migration:generate -d dist/data-source.js --check    # 일치하면 0, 아니면 1
```

`--check`는 **운영에 대고 "지금 synchronize가 무엇을 바꾸려 하는가"를 쓰기 없이
확인**하는 용도로 쓸 수 있다.

#### 배포 파이프라인 — 기동 지점

기동 지점은 `api/railway.json` 하나뿐이다. `nixpacks.toml`도 `Procfile`도 없고
`package.json`에 `prestart:prod`도 없다. 그래서 마이그레이션을 끼워 넣을 자리도
여기 하나다.

```json
"deploy": { "startCommand": "npm run migration:run && node dist/main.js" }
```

`typeorm`은 `dependencies`에 있어(devDependencies가 아니다) 운영 설치본에도
CLI가 함께 들어간다. `migration:run`이 보는 `dist/data-source.js`는 빌드
산출물이라 기동 시점에 이미 있다.

**이 변경을 push하는 것 자체가 운영 배포다.**

### 참고 — 이 위험을 실제로 마주친 기록

`weeklyGoal`에 컬럼 기본값을 주는 작업에서 마이그레이션을 쓰려 했으나
인프라가 없어 엔티티 변경만으로 처리했다. 그때 로컬에서 확인한 동작이다.

| 한 일 | `synchronize`가 한 것 |
|---|---|
| 엔티티에 `default: 4` 추가 | `column_default`가 `4`로 바뀜. **기존 행은 그대로 NULL** |
| 엔티티를 되돌림 | `column_default` 제거됨 |

기본값 추가/제거는 이렇게 무해하게 왕복된다. **위험한 것은 컬럼의
이름·존재·타입을 건드리는 변경이다.** 둘을 같은 것으로 보지 말 것.

---

## 2. 검증된 운영 백업이 없다 — ✅ 해소

### 무슨 일이 있었나

백업 파일 **4건이 전부 0바이트**였다. 파일이 생겼으니 백업이 된 줄 알았고,
크기를 확인하지 않아 드러나지 않았다.

| 파일 | 크기 |
|---|---|
| `prod-20260825-1124.dump` | 0 |
| `prod-20260902-1318.dump` | 0 |
| `prod.dump` | 0 |
| `prod2.dump` | 0 |
| **`prod3.dump`** | **232,491바이트 ✅** |

원인은 둘이다.

1. **`*.railway.internal` 호스트로 접속을 시도했다.** 이 주소는 Railway 네트워크
   안에서만 풀린다. 로컬에서는 이름 해석이 안 되고, `pg_dump`가 출력 파일을 먼저
   만든 뒤 접속에 실패해 0바이트가 남았다.
2. **`pg_dump` 버전이 서버보다 낮았다.** `pg_dump`는 자기보다 높은 서버 버전을
   거부한다.

### 올바른 절차

```bash
railway connect          # 터널을 연다 (internal 주소를 직접 쓰지 않는다)
pg_dump ... -Fc -f ~/harulog-backup/prod-$(date +%Y%m%d-%H%M).dump
ls -la ~/harulog-backup/ # ★ 크기가 0이 아닌지 반드시 확인
```

- `pg_dump`는 **18**을 쓴다(서버 버전 이상).
- `-Fc`(custom format)이므로 복원은 `pg_restore`다.
- **받은 다음 크기를 본다.** 0바이트 사고가 4번 반복된 지점이 정확히 여기다.
- 가능하면 복원까지 해 본다. `prod3.dump`는 `fitlog_restore_test`로 복원해
  `users` 5행을 확인했다.

### 남은 것

0바이트 파일 4건이 `~/harulog-backup/`에 그대로 있다. 다음에 백업을 찾을 때
헷갈리므로 지우는 편이 낫다. 지울지 여부는 하루님 판단.
