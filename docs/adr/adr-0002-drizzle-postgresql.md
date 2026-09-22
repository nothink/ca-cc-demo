# ADR-0002: infrastructure層をPrisma + MySQLからDrizzle + PostgreSQLに置き換える

## Status

Accepted

## Context

[ADR-0001](./adr-0001-clean-architecture.md) で採用したClean Architectureが主張する「infrastructure層(ORM/DB)の変更がdomain / usecaseに波及しない」という設計上の保証を、実際にORMとDBを両方入れ替えることで検証する。

Phase 1(PR #3)でPrisma + MySQLによる実装が完了済みであり、Phase 2ではその`src/infrastructure/`配下のみをDrizzle + PostgreSQLに置き換える。`TodoRepository` / `UserRepository`のRepository interfaceおよびdomainのEntity定義は一切変更しない。

## Decision

`src/infrastructure/prisma/`を`src/infrastructure/drizzle/`に置き換える。

- ORM: Prisma → Drizzle(`drizzle-orm` + `drizzle-kit`)
- DB: MySQL → PostgreSQL 17
- DBクライアント: `drizzle-orm/node-postgres` + `pg.Pool`
- Repository実装(`DrizzleTodoRepository` / `DrizzleUserRepository`)はPhase 1のPrisma実装と同じ振る舞い(`save`はupsert、`delete`は存在しないidでもエラーにしない、`findAll` / `findByOwnerId`は`createdAt`昇順)を維持し、DB行は必ずdomainのプレーンな型に詰め替えて返す
- `src/infrastructure/container.ts`の結線のみを差し替え、`src/main.ts`・`presentation/`・`usecase/`・`domain/`は変更しない

## 変更範囲の実測

`git diff --stat main -- src/` の結果、変更されたファイルは全て `src/infrastructure/` 配下のみだった(16 files changed, 316 insertions(+), 109 deletions(-))。

```
 src/infrastructure/container.ts                                    |  12 +-
 src/infrastructure/drizzle/client.ts                                |  10 ++
 src/infrastructure/drizzle/drizzle-todo-repository.integration.test.ts |  17 ++-
 src/infrastructure/drizzle/drizzle-todo-repository.ts               |  66 ++++++++++
 src/infrastructure/drizzle/drizzle-user-repository.integration.test.ts |  17 ++-
 src/infrastructure/drizzle/drizzle-user-repository.ts               |  15 +++
 src/infrastructure/drizzle/migrations/0000_init.sql                 |  18 +++
 src/infrastructure/drizzle/migrations/meta/0000_snapshot.json       | 139 +++++++++++++++++++++
 src/infrastructure/drizzle/migrations/meta/_journal.json            |  13 ++
 src/infrastructure/drizzle/schema/index.ts                          |   2 +
 src/infrastructure/drizzle/schema/todo.ts                           |  17 +++
 src/infrastructure/drizzle/schema/user.ts                           |   9 ++
 src/infrastructure/{prisma => drizzle}/seed.ts                      |  13 +-
 src/infrastructure/prisma/client.ts                                 |   5 -
 src/infrastructure/prisma/prisma-todo-repository.ts                 |  59 ---------
 src/infrastructure/prisma/prisma-user-repository.ts                 |  13 --
 16 files changed, 316 insertions(+), 109 deletions(-)
```

また、`git diff main -- src/domain src/usecase src/presentation src/main.ts` は0行であることを確認した。

## Consequences

**得られたもの**

- ORM(Prisma → Drizzle)とDB(MySQL → PostgreSQL)を同時に入れ替えても、domain / usecase / presentation / `src/main.ts` は1行も変更されなかった。ADR-0001 の主張どおり、Repository interfaceの契約を固定していればinfrastructure実装は独立して差し替えられることを実測で確認できた
- `.dependency-cruiser.cjs` の forbidden rule(`domain`/`usecase`/`presentation` → `infrastructure` 禁止)により、依存方向の逸脱が機械的に検出できる状態を保てた

**代償として受け入れるもの**

- Repository interfaceの契約を変えない制約のため、Drizzleのクエリビルダが得意な書き方(例: リレーションを使ったjoinの一括取得)を採用せず、Prisma実装と同じ形(1テーブルずつのCRUD)に合わせて実装している
