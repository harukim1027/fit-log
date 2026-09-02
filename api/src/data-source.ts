/**
 * @file api/src/data-source.ts
 * @description TypeORM CLI 전용 DataSource.
 *
 * 앱은 `app.module.ts`의 `TypeOrmModule.forRoot()`로 접속하고, CLI
 * (`migration:generate` / `migration:run` / `migration:revert`)는 이 파일을 본다.
 * **두 접속 설정은 반드시 같아야 한다.** 어긋나면 CLI가 본 스키마와 앱이 쓰는
 * 스키마가 달라져, 생성된 마이그레이션이 엉뚱한 DB를 기준으로 만들어진다.
 * `app.module.ts`를 고치면 여기도 같이 고칠 것.
 *
 * ── 왜 dist 기준인가 ───────────────────────────────────────────────────────
 * 운영 기동이 `node dist/main.js`다(`railway.json`). 배포 파이프라인에 마이그레이션을
 * 붙이면 그것도 dist에서 돈다. CLI를 ts-node로 돌리면 "로컬에서는 되는데 배포에서
 * 깨지는" 경로가 하나 더 생기므로, 세 스크립트 전부 `dist/data-source.js`를 본다.
 * 대신 `migration:generate` 전에 빌드가 필요하고, 생성한 뒤 `migration:run` 전에
 * 다시 빌드해야 한다(`api/README.md`의 "마이그레이션" 절 참조).
 *
 * ── entities/migrations 글롭이 서로 다른 이유 ──────────────────────────────
 * `declaration: true`라 빌드가 `.d.ts`도 dist에 떨군다(`tsconfig.json`).
 *   entities   `*.entity{.ts,.js}` — `user.entity.d.ts`는 `.entity.ts`로 끝나지
 *              않아 걸리지 않는다. app.module.ts와 같은 값이라 그대로 둔다.
 *   migrations `*.js` — `1234-Foo{.ts,.js}`로 쓰면 `1234-Foo.d.ts`가 `*.ts`에
 *              걸린다. 런타임 클래스가 없는 파일이 마이그레이션으로 잡히므로
 *              확장자를 `.js`로 못박는다. dist 기준이라 손해가 없다.
 */
import 'dotenv/config';
import { DataSource, DataSourceOptions } from 'typeorm';

const entities = [__dirname + '/**/*.entity{.ts,.js}'];
const migrations = [__dirname + '/migrations/*.js'];

const options: DataSourceOptions = process.env.DATABASE_URL
  ? {
      type: 'postgres',
      url: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      entities,
      migrations,
      migrationsTableName: 'migrations',
      // CLI에서는 절대 켜지 않는다. 이 파일의 존재 이유가 synchronize를 없애는 것이다.
      synchronize: false,
    }
  : {
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5432,
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'fitlog',
      entities,
      migrations,
      migrationsTableName: 'migrations',
      synchronize: false,
    };

/**
 * **export는 이것 하나뿐이어야 한다.** TypeORM CLI는 파일의 export를 훑어
 * DataSource 인스턴스가 정확히 하나일 때만 로드한다. `export default`를 함께
 * 두면 같은 인스턴스가 둘로 세어져
 * "Given data source file must contain only one export of DataSource instance"로 죽는다.
 */
export const AppDataSource = new DataSource(options);
