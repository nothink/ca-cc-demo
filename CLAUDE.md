# CLAUDE.md

## プロジェクト概要
Clean ArchitectureとClaude Codeの相性を示すLTデモ。詳細設計は `docs/design-doc.md`、
アーキテクチャ選定の背景は `docs/adr/adr-0001-clean-architecture.md` を参照。

## 現在のフェーズ: Phase 2(Drizzle + PostgreSQL への置き換え)

Phase 1(骨格構築 + Prisma + MySQL 実装)は PR #3 で完了し main にマージ済み。
このフェーズでは **infrastructure 層だけ** を Prisma + MySQL から Drizzle + PostgreSQL に差し替える。

### このフェーズのゴール
- `src/infrastructure/drizzle/` に Drizzle + PostgreSQL の Repository 実装・schema・migration・seed を追加する
- `src/infrastructure/container.ts` の向き先を Drizzle 実装に差し替える
- `src/infrastructure/prisma/` と `prisma/` を削除し、Prisma 関連の依存を package.json から外す
- docker-compose / `.env.example` / CI を PostgreSQL に切り替える
- Liam ERD を Drizzle schema から生成できる状態にする(`pnpm erd`)
- dependency-cruiser の依存グラフを再生成し `docs/dependency-graph-phase2.svg` として保存する

### Phase 2 の成功条件(これが LT の主張そのもの)
- `git diff --stat main -- src/` の変更ファイルが `src/infrastructure/` 配下のみであること
- `src/domain` `src/usecase` `src/presentation` `src/main.ts` の差分が 0 行であること
- Phase 1 で書いた domain / usecase のテストを **無修正** で再実行し、全てパスすること
- `pnpm depcruise` が違反 0 で通ること
- Phase 1 の依存グラフ(`docs/dependency-graph-phase1.svg`)とレイヤー間の矢印構造が同一であること
- Liam ERD で生成した ER 図が Phase 1 と同じテーブル・カラム構成であること

### Phase 2 で変更してよいファイル
- `src/` 配下: `src/infrastructure/` のみ
- 設定・インフラ・ドキュメント: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `drizzle.config.ts`(追加),
  `prisma/`(削除), `docker-compose.yml`, `.env.example`, `.github/workflows/ci.yml`, `README.md`, `docs/`
- 上記以外(特に `src/domain` `src/usecase` `src/presentation` `src/main.ts`)に差分が出る場合は、
  実装の仕方が間違っている。差分を出す前に設計を見直すこと

### 絶対に守る制約
- `domain/` と `usecase/` は `infrastructure/` の型・ライブラリ(Drizzle、pg 等)に一切依存しないこと。
  依存は必ず `domain/repositories/*.ts` のinterface経由。
  この制約は `.dependency-cruiser.cjs` の forbidden rule としても表現されており、機械的に検出される。
- `presentation/` も `infrastructure/` に依存しないこと。結線は `src/infrastructure/container.ts`(composition root)と
  `src/main.ts` のみで行う。`src/main.ts` は無変更とする。
- Repository interface (`TodoRepository`, `UserRepository`) のメソッドシグネチャは
  `docs/design-doc.md` に記載のものから変更しないこと。Phase 1 のものを無変更のまま実装する。
- 権限判定ロジック(`canModifyTodo`)は `domain/services/` の純粋関数のまま触らないこと。
- Entity の型・usecase の入出力・HTTP のステータス対応・固定ユーザー(seed)は `docs/design-doc.md` の定義に従うこと。
  Repository 実装は DB の行を必ず domain のプレーンな型に詰め替えて返し、Drizzle の型を外に出さないこと。
- 設計書に無い判断が必要になった場合は、勝手に決めずに PR 本文に「設計書に無かった判断」として明記すること。

## Phase 1(完了): 骨格構築 + Prisma + MySQL 実装
- PR #3 で完了。domain / usecase / infrastructure(Prisma) / presentation の 4 層で Todo CRUD + 権限制御を実装済み
- ループ開始前の状態はタグ `p0-scaffold`

## ツールチェイン
- Node.js: 24 LTS(`.nvmrc`で固定)
- パッケージマネージャ: pnpm
- ランタイム: Node.js (`@hono/node-server`)
- テスト: Vitest
- Lint/Format: Biome
- DB: MySQL (Phase1) → PostgreSQL (Phase2)。どちらも docker-compose で起動
- ORM: Prisma (Phase1、完了) → Drizzle (Phase2で置き換え中)
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
    prisma/                // Phase1: client.ts, prisma-*-repository.ts, seed.ts(Phase2で削除)
    drizzle/               // Phase2: client.ts, schema/, migrations/, drizzle-*-repository.ts, seed.ts
  presentation/
    app.ts                 // createApp(deps)
    schemas/               // zodスキーマ(OpenAPI定義の元)
    routes/                // todo-routes.ts
prisma/schema.prisma       // Phase1のみ(Phase2で削除)
drizzle.config.ts          // Phase2で追加
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
