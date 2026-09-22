# ca-cc-demo
Clean Architecture と Claude Code のデモ

## セットアップ

```bash
mise install            # Node 24.19.0 / pnpm 11.24.0
pnpm install
cp .env.example .env
pnpm db:up              # PostgreSQL (docker compose)
pnpm db:migrate         # マイグレーション適用 (drizzle-kit migrate)
pnpm db:seed            # 固定ユーザー投入
pnpm dev                # http://localhost:3000
```

## 検証コマンド(CI と同じもの)

```bash
pnpm lint               # Biome
pnpm typecheck          # tsc --noEmit
pnpm test               # Vitest
pnpm depcruise          # dependency-cruiser による層境界チェック
pnpm depcruise:svg      # 依存グラフを docs/dependency-graph.svg に出力 (graphviz が必要)
pnpm erd                # Liam ERD を docs/erd/ に生成
```

設計は `docs/design-doc.md`、アーキテクチャ選定は `docs/adr/adr-0001-clean-architecture.md`、
開発時の制約は `CLAUDE.md` を参照。

## ループエンジニアリングの運用

Issue に `loop-engineering` ラベルを付けると Claude が実装して PR を作り、
PR 上で「Claude レビュー → 不承認なら Claude が修正 push → 再レビュー」を自動で往復します。
承認かつ CI 成功で merge され、6 ラウンドで収束しなければ `needs-human` ラベルを付けて停止します。

```
Issue(loop-engineering) → issue-to-pr.yml → PR
PR(opened/synchronize) → ci.yml(PostgreSQL + migrate + seed + lint/typecheck/test/depcruise)
                       → review-loop.yml: round-guard → wait-ci → review → fix | merge
```

### 事前に必要な GitHub 側の設定

- Secret `CLAUDE_CODE_OAUTH_TOKEN`(`claude setup-token` で発行)。workflow はこれだけを使う
- [Claude GitHub App](https://github.com/apps/claude) をこのリポジトリにインストール
  (PR 作成・レビューコメント・修正 push は App のトークンで行う。`GITHUB_TOKEN` だと後続 workflow が発火しない)
- ラベル `loop-engineering` を作成(`needs-human` は workflow が必要時に自動作成する)

```bash
gh label create loop-engineering --color 1D76DB --description "Claude に実装させる Issue"
```

- branch protection は不要(review-loop.yml が CI 完了を待ってから merge する)

### 手順

1. Issue 1(Phase 1: Prisma + MySQL)を起票し `loop-engineering` を付ける → merge されるのを待つ
2. `CLAUDE.md` の「現在のフェーズ」を Phase 2 に書き換えてコミット
3. Issue 2(Phase 2: Drizzle + PostgreSQL)を起票し `loop-engineering` を付ける
