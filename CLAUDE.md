# CLAUDE.md

## プロジェクト概要
Clean ArchitectureとClaude Codeの相性を示すLTデモ。詳細設計は `docs/design-doc.md`、
アーキテクチャ選定の背景は `docs/adr/adr-0001-clean-architecture.md` を参照。

## 現在のフェーズ: Phase 1(骨格構築 + Prisma実装)

### このフェーズのゴール
- domain / usecase / infrastructure(Prisma実装) / presentation の4層でTodo/User CRUD + 権限制御を実装
- usecase層のテストは fake repository(インメモリ実装)で書き、全てグリーンにする
- OpenAPI定義(zodスキーマ経由)を用意し、Scalar/Swagger UIで動作確認できる状態にする
- Liam ERDでPrisma schemaからER図を生成できる状態にする
- `.dependency-cruiser.cjs` を用意し、依存グラフの生成と境界ルールの機械的な強制ができる状態にする

### 絶対に守る制約
- `domain/` と `usecase/` は `infrastructure/` の型・ライブラリ(Prisma Client等)に一切依存しないこと。
  依存は必ず `domain/repositories/*.ts` のinterface経由。
  この制約は `.dependency-cruiser.cjs` の forbidden rule(`domain`/`usecase` → `infrastructure` を禁止)としても表現し、
  文章上の約束事だけでなく機械的に検出できる状態にすること。
- `presentation/` も `infrastructure/` に依存しないこと。結線は `src/infrastructure/container.ts`(composition root)と
  `src/main.ts` のみで行う。`src/main.ts` は Phase2 で無変更とする。
- Repository interface (`TodoRepository`, `UserRepository`) のメソッドシグネチャは
  `docs/design-doc.md` に記載のものから変更しないこと。Phase2で無変更のまま使う前提。
- 権限判定ロジック(`canModifyTodo`)は `domain/services/` に純粋関数として置き、
  DB・ORMの型を一切importしないこと。
- Entity の型・usecase の入出力・HTTP のステータス対応・固定ユーザー(seed)は `docs/design-doc.md` の定義に従うこと。
  設計書に無い判断が必要になった場合は、勝手に決めずに PR 本文に「設計書に無かった判断」として明記すること。

## Phase 2(予定): Drizzle + PostgreSQL への置き換え
- infrastructure層のPrisma + MySQL実装をDrizzle + PostgreSQL実装に置き換える。
  domain/usecase/presentation/`src/main.ts` は無変更が成功条件
- Drizzle schema は `src/infrastructure/drizzle/schema/*.ts`、migration は `src/infrastructure/drizzle/migrations/` に置く
- `src/infrastructure/prisma/` と `prisma/` は削除する
- Liam ERDの生成コマンドを切り替える(下記参照)
- 検証は `git diff --stat main -- src/` で `src/infrastructure/` 配下のみ変更されていることを確認し、
  Phase1のテストスイートを無修正で再実行してグリーンを確認する
- `src/` 以外で変更してよいファイル(package.json、docker-compose.yml、ci.yml、docs 等)は
  `docs/design-doc.md` の「Phase2で変更してよいファイル」に従う
- dependency-cruiserの依存グラフを再生成し、Phase1時点のグラフと形が変わっていないことを確認する
  (infrastructure内部の実装差し替えのみで、レイヤー間の矢印構造は同一であるはず)

## ツールチェイン
- Node.js: 24 LTS(`.nvmrc`で固定)
- パッケージマネージャ: pnpm
- ランタイム: Node.js (`@hono/node-server`)
- テスト: Vitest
- Lint/Format: Biome
- DB: MySQL (Phase1) → PostgreSQL (Phase2)。どちらも docker-compose で起動
- ORM: Prisma (Phase1) → Drizzle (Phase2で置き換え、Phase1では触らない)
- API検証: OpenAPI定義(`@hono/zod-openapi`) + Scalar/Swagger UI
- ERD: Liam ERD
  - Phase1: `npx @liam-hq/cli erd build --format prisma --input prisma/schema.prisma`
  - Phase2: `npx @liam-hq/cli erd build --format drizzle --input "src/infrastructure/drizzle/schema/*.ts"`
- アーキテクチャ境界の可視化・強制: dependency-cruiser
  - 設定ファイル: `.dependency-cruiser.cjs`(ルート)
  - forbidden rule: `domain`/`usecase`/`presentation` → `infrastructure` への依存を禁止
  - 依存グラフはSVGで出力し、Phase1/Phase2それぞれで生成して見た目を比較する

## ディレクトリ構成
```
src/
  main.ts                  // createContainer() + createApp() を呼ぶだけ。Phase2で無変更
  domain/
    entities/              // user.ts, todo.ts(プレーンな型。classにしない)
    repositories/          // todo-repository.ts, user-repository.ts(interface定義)
    services/              // todo-permission.ts(権限判定の純粋関数)
  usecase/
    errors.ts              // UnauthenticatedError / TodoNotFoundError / PermissionDeniedError
    testing/               // インメモリfake repository(テスト専用)
    todo/                  // list-todos.ts, create-todo.ts, update-todo.ts, delete-todo.ts
  infrastructure/
    container.ts           // composition root。Phase2で差し替える唯一の結線ポイント
    prisma/                // Phase1: client.ts, prisma-*-repository.ts, seed.ts
    drizzle/               // Phase2で追加(Phase1では作らない)
  presentation/
    app.ts                 // createApp(deps)
    schemas/               // zodスキーマ(OpenAPI定義の元)
    routes/                // todo-routes.ts
prisma/schema.prisma       // Phase1のみ
docs/
  design-doc.md
  adr/adr-0001-clean-architecture.md
```
ファイル単位の詳細・Entity定義・エンドポイント仕様は `docs/design-doc.md` を参照。

## テスト方針
- usecase/domainのテストは実DBを立てず、`usecase/testing/` のfake repositoryを使う
- infrastructure層(Prisma/Drizzle実装)は必要最小限の統合テスト(`*.integration.test.ts`)のみ。
  `DATABASE_URL` 未設定時は `describe.skipIf` でスキップし、CIではDBを起動して実行する
- 最低限カバーすべきケースは `docs/design-doc.md` の「テスト方針」を参照

## 権限モデル(参考)
- Role: `admin` / `member` の2種類
- `admin` は全Todoを更新・削除できる
- `member` は自分が作成したTodoのみ更新・削除できる(閲覧・作成は誰でも可)
- 判定は `domain/services/todo-permission.ts` の `canModifyTodo(user, todo)` に集約する
- 呼び出しユーザーは `X-User-Id` ヘッダで指定し、usecase が `UserRepository.findById` で解決する
- ユーザーは seed の固定3名(admin / alice / bob)のみ。IDは `docs/design-doc.md` 参照
