# DesignDoc: Clean Architecture × Claude Code デモ (LT用サンプル)

## 目的

Clean ArchitectureがAI駆動開発(Claude Code)においてどう機能するかを、実際の変更タスクを通じて示す。
特に以下2点を実演する:

1. **境界による変更の局所化**: infrastructure層の技術選定(DB + ORM)を丸ごと差し替えても、domain/usecase/presentation層は無変更で済む
2. **ビジネスルールのテスト容易性**: 権限判定ロジックがORM/DBの詳細から独立して単体テストできる

## スコープ

- エンティティ: `User`, `Todo` の2つのみ
- Role: `admin` / `member` の2種類のみ
- 権限ルール:
  - `admin` は全Todoを更新・削除できる
  - `member` は自分が作成したTodoのみ更新・削除できる(閲覧・作成は誰でも可)
- エンドポイントはCRUD相当の最小セット(一覧・作成・更新・削除)

## 非スコープ (Out of Scope)

- 認証(JWT等)の実装。ユーザーは `X-User-Id` ヘッダで指定する簡易版とする(後述)
- ユーザーの作成・更新・削除API。ユーザーはseedで固定投入する
- Role 3種類以上への拡張
- ページネーション、バリデーションの作り込み(zodによる型・必須チェックのみ)

## アーキテクチャ

> アーキテクチャ選定の背景・検討した代替案は [ADR-0001](./adr/adr-0001-clean-architecture.md) を参照。

### レイヤーと依存方向

```
presentation (Hono routes)
      ↓ 依存
   usecase (アプリケーションロジック、権限判定を呼び出す)
      ↓ 依存 (interfaceのみ)
    domain (Entity, Repository interface, 権限判定ロジック)
      ↑ 実装
infrastructure (Phase1: Prisma + MySQL → Phase2: Drizzle + PostgreSQL)
```

**絶対原則**: `domain` と `usecase` は `infrastructure` の型・ライブラリに一切依存しない。依存は常にinterface経由。
`presentation` も `infrastructure` を import しない。両者を結線するのは `src/main.ts` と `src/infrastructure/container.ts` のみ(後述「DI / composition root」)。

これらは `.dependency-cruiser.cjs` の forbidden rule として機械的に強制する。

### ディレクトリ構成

```
src/
  main.ts                          // エントリポイント。container を組み立てて app を起動(Phase2で無変更)
  domain/
    entities/
      user.ts
      todo.ts
    repositories/
      todo-repository.ts           // interface定義
      user-repository.ts           // interface定義
    services/
      todo-permission.ts           // 権限判定ロジック(純粋関数)
      todo-permission.test.ts
  usecase/
    errors.ts                      // usecaseが投げるエラー型
    testing/
      in-memory-todo-repository.ts // fake repository(テスト専用)
      in-memory-user-repository.ts
    todo/
      list-todos.ts
      create-todo.ts
      update-todo.ts
      delete-todo.ts
      *.test.ts                    // fake repositoryで書く
  infrastructure/
    container.ts                   // composition root。Phase2で差し替える唯一の結線ポイント
    prisma/                        // Phase1
      client.ts                    // PrismaClient生成
      prisma-todo-repository.ts
      prisma-user-repository.ts
      seed.ts                      // 固定ユーザー投入
      *.integration.test.ts        // 実DBを使う最小限の統合テスト
    drizzle/                       // Phase2で追加(Phase1では作らない)
      client.ts
      schema/                      // Drizzle schema定義(Liam ERDの入力)
      migrations/
      drizzle-todo-repository.ts
      drizzle-user-repository.ts
      seed.ts
      *.integration.test.ts
  presentation/
    app.ts                         // createApp(deps) — OpenAPIHonoアプリを組み立てる
    schemas/
      todo-schemas.ts              // zodスキーマ(OpenAPI定義の元)
    routes/
      todo-routes.ts
prisma/
  schema.prisma                    // Phase1のみ。Phase2で削除
  migrations/
docs/
  design-doc.md
  adr/
    adr-0001-clean-architecture.md
  dependency-graph-phase1.svg      // depcruise出力(Phase1完了時に生成)
  dependency-graph-phase2.svg      // 同上(Phase2完了時に生成)
```

## ドメインモデル

### Entity (domain/entities)

Entityは**振る舞いを持たないプレーンなTypeScriptの型**とする(classにしない)。
ORMの型・デコレータ・Dateライブラリ等に依存しない。

```typescript
// domain/entities/user.ts
export type Role = "admin" | "member";

export type User = {
  id: string;      // UUID。seedで固定値を投入
  name: string;
  role: Role;
};

// domain/entities/todo.ts
export type Todo = {
  id: string;      // UUID v4。usecase内で crypto.randomUUID() により生成
  title: string;   // 1文字以上
  completed: boolean;
  ownerId: string; // 作成したUserのid
  createdAt: Date;
  updatedAt: Date;
};
```

- IDはDB側のauto incrementではなく、**usecase内で生成**する。DBがID生成を担当すると `save` の戻り値にIDが必要になり、Repository interfaceが変わるため
- `createdAt` / `updatedAt` もusecase内で `new Date()` により決める。DBのデフォルト値には頼らない
- DBの行とEntityの変換(mapping)は infrastructure 層の責務。Repository実装はPrisma/Drizzleの型をそのまま返さず、必ず上記のプレーン型に詰め替えて返す

### Repository Interface (Phase1で確定・以降変更しない)

```typescript
// domain/repositories/todo-repository.ts
export interface TodoRepository {
  findById(id: string): Promise<Todo | null>;
  findAll(): Promise<Todo[]>;
  findByOwnerId(ownerId: string): Promise<Todo[]>;
  save(todo: Todo): Promise<void>;    // upsert。存在すれば更新、なければ挿入
  delete(id: string): Promise<void>;  // 存在しないidでもエラーにしない
}

// domain/repositories/user-repository.ts
export interface UserRepository {
  findById(id: string): Promise<User | null>;
}
```

- `findAll` / `findByOwnerId` は `createdAt` 昇順で返す
- `UserRepository` に `save` は無い。ユーザーの追加・変更はseedのみで行う

### 権限判定ロジック(domainに置く純粋関数)

```typescript
// domain/services/todo-permission.ts
export function canModifyTodo(user: User, todo: Todo): boolean {
  if (user.role === "admin") return true;
  return todo.ownerId === user.id;
}
```

この関数はDB・ORMを一切知らないため、fakeなしで即座にユニットテスト可能。
権限判定は必ずこの関数を通し、usecase内に `role === "admin"` のような比較を直接書かない。

### 固定ユーザー(seed)

| id | name | role |
|---|---|---|
| `11111111-1111-4111-8111-111111111111` | admin | admin |
| `22222222-2222-4222-8222-222222222222` | alice | member |
| `33333333-3333-4333-8333-333333333333` | bob | member |

- seedスクリプトは `src/infrastructure/<orm>/seed.ts` に置き、`pnpm db:seed` で実行する(冪等: 既に存在すれば何もしない)
- CIでは統合テストの前にseedを流す
- このIDはREADMEのcurl例・統合テスト・LTデモで共通して使う

## usecase 層

### 共通方針

- 各usecaseは `(deps) => (input) => Promise<output>` の形のファクトリ関数、またはそれと等価な構造にする。depsはRepository interface型のみ
- **呼び出しユーザーの特定はusecaseの責務**。inputに `actorId: string` を受け取り、`UserRepository.findById` で解決する。見つからなければ `UnauthenticatedError`
- 権限が必要な操作(更新・削除)は、対象Todoの存在確認 → `canModifyTodo` の順で判定する(存在しないTodoに対しては権限に関係なく `TodoNotFoundError`)
- 失敗は `usecase/errors.ts` のエラー型を **throw** する。presentation層がHTTPステータスへ変換する

```typescript
// usecase/errors.ts
export class UnauthenticatedError extends Error {}  // actorIdに対応するUserが存在しない
export class TodoNotFoundError extends Error {}     // 対象Todoが存在しない
export class PermissionDeniedError extends Error {} // canModifyTodoがfalse
```

### 各usecaseの入出力

| usecase | input | output | 備考 |
|---|---|---|---|
| `listTodos` | `{ actorId, ownerId? }` | `Todo[]` | `ownerId` 指定時は `findByOwnerId`、未指定は `findAll`。閲覧に権限制限なし |
| `createTodo` | `{ actorId, title }` | `Todo` | `ownerId = actorId`、`completed = false` |
| `updateTodo` | `{ actorId, todoId, title?, completed? }` | `Todo` | `canModifyTodo` 必須。指定されたフィールドのみ更新し `updatedAt` を更新 |
| `deleteTodo` | `{ actorId, todoId }` | `void` | `canModifyTodo` 必須 |

### テスト方針

- `usecase/todo/*.test.ts` は `usecase/testing/` のインメモリfake repositoryを使い、実DBを立てない
- 最低限カバーするケース:
  - admin が他人のTodoを更新・削除できる
  - member が自分のTodoを更新・削除できる
  - member が他人のTodoを更新・削除すると `PermissionDeniedError`
  - 存在しないTodoの更新・削除は `TodoNotFoundError`(権限より先に判定)
  - 存在しない actorId は `UnauthenticatedError`
- `domain/services/todo-permission.test.ts` は fake すら使わず、値を直接組み立ててテストする

## presentation 層 (Hono)

### 呼び出しユーザーの指定

認証は非スコープのため、リクエストヘッダ `X-User-Id` にUserのidを載せる。
presentation層はヘッダ値をそのまま `actorId` としてusecaseに渡すだけで、ユーザーの存在確認はしない(usecaseの責務)。

### エンドポイント

| Method | Path | 成功時 | 説明 |
|---|---|---|---|
| `GET` | `/todos` | `200` `Todo[]` | クエリ `?ownerId=` で絞り込み可 |
| `POST` | `/todos` | `201` `Todo` | body: `{ title }` |
| `PATCH` | `/todos/:id` | `200` `Todo` | body: `{ title?, completed? }` |
| `DELETE` | `/todos/:id` | `204` | |
| `GET` | `/openapi.json` | `200` | OpenAPI定義(`@hono/zod-openapi` が生成) |
| `GET` | `/docs` | `200` | Scalar UI |

### エラーとHTTPステータスの対応

| 状況 | ステータス |
|---|---|
| zodバリデーション失敗(bodyやクエリの形式不正) | `400` |
| `X-User-Id` ヘッダが無い | `401` |
| `UnauthenticatedError`(ヘッダはあるがUserが存在しない) | `401` |
| `PermissionDeniedError` | `403` |
| `TodoNotFoundError` | `404` |

エラーレスポンスのbodyは `{ "error": "<メッセージ>" }` に統一する。

### zodスキーマとOpenAPI

- `presentation/schemas/todo-schemas.ts` にリクエスト/レスポンスのzodスキーマを定義し、`@hono/zod-openapi` の `createRoute` に渡す
- レスポンス中の `createdAt` / `updatedAt` はISO 8601文字列
- domainのEntity型とzodスキーマは**別物として定義**する(domainがzodに依存しないため)。両者のズレはTypeScriptの型検査で検出する

## DI / composition root

Phase2で「DIの向き先を差し替えるのみ」を成立させるため、結線の場所を固定する。

```typescript
// src/infrastructure/container.ts
export type Container = {
  todoRepository: TodoRepository;
  userRepository: UserRepository;
};
export function createContainer(): Container { /* Phase1: Prisma実装を返す */ }

// src/presentation/app.ts
export function createApp(deps: Container): OpenAPIHono { /* routesを組み立てる */ }

// src/main.ts
const app = createApp(createContainer());
serve({ fetch: app.fetch, port: Number(process.env.PORT ?? 3000) });
```

- `Container` 型はRepository interfaceだけで構成する。ORMのclientは外に出さない
- `src/main.ts` は `createContainer` と `createApp` を呼ぶだけの数行に留め、Phase2で無変更とする
- Phase2では `container.ts` の中身(import先と返す実装)だけが変わる

## フェーズ分割 (1PR = 1session = 1Phase)

### Phase 1: Clean Architecture骨格構築 + Prisma + MySQL

- domain / usecase / presentation を上記構成で実装
- infrastructureはPrisma + MySQLで実装。Prisma schemaは `prisma/schema.prisma`、モデルは以下に対応させる:

```prisma
enum Role { admin member }

model User {
  id    String @id @db.VarChar(36)
  name  String @db.VarChar(100)
  role  Role
  todos Todo[]
}

model Todo {
  id        String   @id @db.VarChar(36)
  title     String   @db.VarChar(200)
  completed Boolean
  ownerId   String   @db.VarChar(36)
  createdAt DateTime
  updatedAt DateTime
  owner     User     @relation(fields: [ownerId], references: [id])
  @@index([ownerId])
}
```

- usecaseのテストはfake repository(インメモリ実装)で書く
- infrastructureの統合テストは「save → findById で同じ内容が返る」「delete後にnullが返る」程度の最小限
- Liam ERD: `pnpm erd`(`--format prisma --input prisma/schema.prisma`)
- 依存グラフ: `pnpm depcruise:svg` の出力を `docs/dependency-graph-phase1.svg` として保存
- ゴール: 一覧・作成・更新・削除が動き、権限ルールのテストが全てグリーン、`/docs` でScalar UIが開く

### Phase 2: Drizzle + PostgreSQL への置き換え

ORMだけでなくDBもMySQLからPostgreSQLに変える。「DB+ORMを丸ごと差し替えてもビジネスロジックは無変更」を示す。

- `src/infrastructure/drizzle/` に新規実装を追加し、`src/infrastructure/container.ts` の向き先をDrizzle実装に差し替える
- Drizzle schemaは `src/infrastructure/drizzle/schema/*.ts`、migrationは `src/infrastructure/drizzle/migrations/`(`drizzle.config.ts` はルート)
- `src/infrastructure/prisma/` と `prisma/` は削除する
- Liam ERD: `--format drizzle --input "src/infrastructure/drizzle/schema/*.ts"`
- domain / usecase / presentation / `src/main.ts` は**無変更**であることが成功条件

#### Phase2で変更してよいファイル

`src/` 配下は `src/infrastructure/` のみ。それ以外に、以下の **設定・インフラ・ドキュメント** の変更は許容する:

- `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`(依存の入れ替え)
- `drizzle.config.ts`(追加)、`prisma/`(削除)
- `docker-compose.yml`, `.env.example`(MySQL → PostgreSQL)
- `.github/workflows/ci.yml`(serviceをpostgresへ、`prisma migrate deploy` を `drizzle-kit migrate` へ)
- `README.md`, `CLAUDE.md`, `docs/`(手順・フェーズ表記・生成物の更新)

## Phase2完了の検証条件

- `git diff --stat main -- src/` の変更ファイルが `src/infrastructure/` 配下のみであること
- `git diff --stat main -- src/domain src/usecase src/presentation src/main.ts` が空であること
- Phase1で書いた `domain` / `usecase` のテストを無修正で再実行し、全てパスすること
- `pnpm depcruise` が違反0で通ること
- `pnpm depcruise:svg` を再生成して `docs/dependency-graph-phase2.svg` として保存し、Phase1のグラフとレイヤー間の矢印構造が同一であること(infrastructure内部のノード名だけが変わる)
- Liam ERDをDrizzle schemaから生成でき、Phase1のER図と同じテーブル・カラム構成であること

## CLAUDE.md に転記する制約(セッションを跨いだブレ防止)

- 現在のPhaseと、それぞれのゴール
- 「infrastructure層の変更はdomain/usecase/presentation層のコードに一切差分を出してはならない」という制約
- Repository interfaceのシグネチャはPhase1で確定済み、以降変更禁止
- usecaseのテストはfake repositoryを使う方針
- 結線は `src/infrastructure/container.ts` と `src/main.ts` のみで行う
