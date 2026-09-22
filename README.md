# ca-cc-demo
Clean Architecture と Claude Code のデモ

## セットアップ

```bash
mise install            # Node 24.19.0 / pnpm 11.24.0
pnpm install
cp .env.example .env
pnpm db:up              # MySQL (docker compose)
pnpm prisma:migrate     # マイグレーション適用 + Prisma Client 生成
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
