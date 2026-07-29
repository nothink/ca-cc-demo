# DesignDoc: Clean Architecture × Claude Code デモ (LT用サンプル)

## 目的

Clean ArchitectureがAI駆動開発(Claude Code)においてどう機能するかを、実際の変更タスクを通じて示す。
特に以下2点を実演する:

1. **境界による変更の局所化**: infrastructure層の技術選定(ORM)を差し替えても、domain/usecase層は無変更で済む
2. **ビジネスルールのテスト容易性**: 権限判定ロジックがORM/DBの詳細から独立して単体テストできる

## スコープ

- エンティティ: `User`, `Todo` の2つのみ
- Role: `admin` / `member` の2種類のみ
- 権限ルール:
  - `admin` は全Todoを更新・削除できる
  - `member` は自分が作成したTodoのみ更新・削除できる(閲覧・作成は誰でも可)
- エンドポイントはCRUD相当の最小セット(一覧・作成・更新・削除)

## 非スコープ (Out of Scope)

- 認証(JWT等)の実装。Roleは仮のヘッダ or リクエストボディで渡す簡易版でよい
- Role 3種類以上への拡張
- ページネーション、バリデーションの作り込み

## アーキテクチャ

> アーキテクチャ選定の背景・検討した代替案は [ADR-0001](./adr-0001-clean-architecture.md) を参照。

### レイヤーと依存方向

```
presentation (Hono routes)
      ↓ 依存
   usecase (アプリケーションロジック、権限判定を呼び出す)
      ↓ 依存 (interfaceのみ)
    domain (Entity, Repository interface, 権限判定ロジック)
      ↑ 実装
infrastructure (Prisma実装 → Phase2でDrizzle実装に置き換え)
```

**絶対原則**: `domain` と `usecase` は `infrastructure` の型・ライブラリに一切依存しない。依存は常にinterface経由。

### ディレクトリ構成

```
src/
  domain/
    entities/
      user.ts
      todo.ts
    repositories/
      todo-repository.ts   // interface定義
      user-repository.ts   // interface定義
    services/
      todo-permission.ts   // 権限判定ロジック(純粋関数)
  usecase/
    todo/
      list-todos.ts
      create-todo.ts
      update-todo.ts
      delete-todo.ts
  infrastructure/
    prisma/                // Phase1
      prisma-todo-repository.ts
      prisma-user-repository.ts
    drizzle/                // Phase2で追加
      drizzle-todo-repository.ts
      drizzle-user-repository.ts
  presentation/
    routes/
      todo-routes.ts
```

### Repository Interface (Phase1で確定・以降変更しない)

```typescript
// domain/repositories/todo-repository.ts
interface TodoRepository {
  findById(id: string): Promise<Todo | null>;
  findAll(): Promise<Todo[]>;
  findByOwnerId(ownerId: string): Promise<Todo[]>;
  save(todo: Todo): Promise<void>;
  delete(id: string): Promise<void>;
}

// domain/repositories/user-repository.ts
interface UserRepository {
  findById(id: string): Promise<User | null>;
}
```

### 権限判定ロジック(domainに置く純粋関数の例)

```typescript
// domain/services/todo-permission.ts
function canModifyTodo(user: User, todo: Todo): boolean {
  if (user.role === "admin") return true;
  return todo.ownerId === user.id;
}
```

この関数はDB・ORMを一切知らないため、fakeなしで即座にユニットテスト可能。

## フェーズ分割 (1PR = 1session = 1Phase)

### Phase 1: Clean Architecture骨格構築 + Prisma実装

- domain / usecase / presentation を上記構成で実装
- infrastructureはPrisma + MySQLで実装
- usecaseのテストはfake repository(インメモリ実装)で書く
- ゴール: 一覧・作成・更新・削除が動き、権限ルールのテストが全てグリーン

### Phase 2: Drizzleへの置き換え

- infrastructure/drizzle/ に新規実装を追加し、DIの向き先をPrisma実装からDrizzle実装に差し替えるのみ
- domain / usecase / presentation は**無変更**であることが成功条件
- 検証方法:
  - `git diff --stat` で変更ファイルが `infrastructure/` 配下のみであることを確認
  - Phase1で書いたusecase/domainのテストを再実行し、無修正で全てパスすることを確認

## CLAUDE.md に転記する制約(セッションを跨いだブレ防止)

- 現在のPhaseと、それぞれのゴール
- 「infrastructure層の変更はdomain/usecase層のコードに一切差分を出してはならない」という制約
- Repository interfaceのシグネチャはPhase1で確定済み、以降変更禁止
- usecaseのテストはfake repositoryを使う方針

## Phase2完了の検証条件

- `git diff --stat` で変更ファイルが `infrastructure/` 配下のみであること
- `domain/` `usecase/` の変更行数が0であること
- Phase1で書いたテストスイートを無修正で再実行し、全てパスすること
