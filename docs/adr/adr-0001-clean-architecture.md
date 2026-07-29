# ADR-0001: Todo/User権限サンプルにClean Architectureを採用する

## Status

Accepted

## Context

Hono + MySQLベースの小規模REST API(User/Todoの権限制御サンプル)を実装するにあたり、アプリケーションの層構造を決める必要がある。
このサンプルは、将来的にORM(Prisma → Drizzle)を置き換える変更を行う前提であり、その際にビジネスロジック(権限判定)側へ変更が波及しないことを検証したい、という目的を持つ。

## 検討した選択肢

### 1. Fat Controller (Transaction Script)

ルートハンドラ内にORM呼び出し・権限判定・レスポンス整形をまとめて書く構成。実装コストは最小だが、ORMの型やAPIがハンドラ内に直接露出するため、ORM置き換え時の変更がハンドラ・場合によってはテストコードにまで波及する。

### 2. フルのHexagonal Architecture (Ports & Adapters)

domain / application / adapter(inbound・outbound) / frameworkのように、今回よりも細かくレイヤーを分ける構成。境界の厳密さは高いが、Todo/Userの2エンティティ・CRUD程度の規模に対しては層が過剰で、実装・説明コストに見合わない。

### 3. Clean Architecture (今回採用)

domain(Entity, Repository interface, 権限判定ロジック) / usecase / infrastructure / presentation の4層構成。domain・usecaseはinfrastructureの型に依存せず、Repository interfaceを介してのみ実装と接続する。

## Decision

選択肢3(Clean Architecture、4層構成)を採用する。

## Consequences

**得られるもの**

- infrastructure層(ORM実装)の変更が domain / usecase に波及しない設計上の保証
- 権限判定ロジック(`canModifyTodo`)がDB・ORMの詳細を知らない純粋関数として実装でき、fakeなしで単体テスト可能
- Repository interfaceの契約さえ固定していれば、ORMを問わず実装を差し替えられる

**代償として受け入れるもの**

- Todo/Userの2エンティティ・CRUD程度の規模に対しては、レイヤー数・ファイル数がボイラープレート気味になる
- 小規模なプロダクトでは、この構成による恩恵が実感しにくい(=本サンプルは意図的にその恩恵を可視化するための題材として設計している)
