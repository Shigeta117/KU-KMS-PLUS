# Changelog — KU-LMS+

バージョン管理方針と変更履歴。フォーマットは [Keep a Changelog](https://keepachangelog.com/ja/1.0.0/)、
バージョン番号は [Semantic Versioning](https://semver.org/lang/ja/) に準拠。

---

## バージョン番号の付け方

```
MAJOR.MINOR.PATCH
 1   . 2   . 1
```

| 桁 | 上げるとき | 例 |
|----|-----------|-----|
| **MAJOR** | 後方互換性のない大きな変更（認証方式刷新・DBスキーマ破壊的変更・全面的なUI刷新） | 1.x.x → 2.0.0 |
| **MINOR** | 後方互換を保ちつつ機能追加・目に見えるUI改善 | 1.0.x → 1.1.0 |
| **PATCH** | バグ修正・内部リファクタリング・依存関係更新・ドキュメント更新 | 1.0.0 → 1.0.1 |

### 運用ルール

- リリース時に git tag を打つ: `git tag v1.2.1 && git push origin v1.2.1`
- Chrome 拡張の `manifest.json` の `version` フィールドと必ず合わせる
- `[Unreleased]` セクションに次バージョンの変更を随時追記していく

---

## [Unreleased]

---

## [1.2.2] — 2026-05-25（Realtime 過剰発火バグ修正）

### Fixed
- Supabase Realtime サブスクリプションに `user_id` フィルタを追加
  - 修正前: 誰かが課題を更新するたびに全ユーザーの PWA が DB クエリを実行していた
  - 修正後: 自分のレコードに限定して購読（データ漏洩はなかったがクエリ数が過剰だった）

---

## [1.2.1] — 2026-05-25（バージョン管理整備・変更履歴ページ追加）

### Added
- ランディングページに「最近のアップデート」セクションを追加（直近3件表示）
- `/changelog` ページを新設（全バージョン履歴を一覧表示）
- フッターに変更履歴リンクを追加
- 変更履歴データを `lib/changelog.ts` に集約（型定義・コンポーネントタグ付き）

### Changed
- CHANGELOG.md のフォーマットと SemVer 運用ルールを策定（`CLAUDE.md` に記載）
- 過去バージョンの境界を 5/22（Web ストア初回投稿）基準に整理・遡及ナンバリング

---

## [1.2.0] — 2026-05-25（アイコン刷新・期限urgency改善）

### Added
- 期限urgency体系を5段階に統一（very-soon / soon / upcoming / later / far）
- 拡張機能バッジを高コントラスト配色に変更（視認性向上）

### Changed
- 全アイコンを軽量な新デザイン（KU-LMS+-icon.png / .svg）に刷新
- アイコンのサイズ指定とフォールバック処理を調整

### Internal
- `7e90340` TypeScript インクリメンタルビルドキャッシュを更新

---

## [1.1.0] — 2026-05-24（ランディングページ刷新・Manifest V3 対応）

### Added
- 拡張機能ポップアップ下部に「PWAで課題を確認」リンクを追加
- ランディングページを全面刷新
- Error Boundary によるエラーハンドリング強化

### Changed
- Chrome 拡張を Manifest V3 仕様に更新
- 不要なパーミッションを整理・削除

### Fixed
- `user_id` 型の不一致を修正、`ServiceWorkerInit` を独立ファイルに分離（P0）
- `AuthGuard` にタイムアウト追加・`useAssignments` の不要な再生成を解消（P1）

### Internal
- ブランドカラー統一・`useMemo` 追加・a11y 改善・`execCommand` 削除（P2/P3）
- refactoring-plan.md を実施済みとしてマーク

---

## [1.0.0] — 2026-05-22（初回 Web ストアリリース）

Chrome ウェブストアへの初回投稿パッケージ。
5/13 のリポジトリ作成から約10日間の開発成果。

### Added

#### コア機能
- Next.js PWA アプリ（課題一覧・ダッシュボード・設定ページ）
- Chrome 拡張機能（WebClass スクレイピング・バッジ表示）
- Supabase による認証（学籍番号ベース）とデータ管理
- Supabase Realtime による課題の自動更新

#### UX・デザイン
- ダークモード手動切り替え
- Service Worker / PWA インストール機能・インストール促進バナー
- ブックマークレット（ローダー型） + `/api/bookmarklet` エンドポイント
- WebClass ページへの UI 拡張機能（課題情報のオーバーレイ表示）
- ミニダッシュボードを締切リスト表示に変更
- iOS セーフエリア・ダークモードヘッダー色統一

#### データ・機能
- `start_time` フィールドの追加とスクレイピング対象への組み込み
- 「開始前」「資料」タブの追加（`start_time` ベースのステータス分類）
- 授業フィルタ機能・データロジックをカスタムフックに分離
- 時間割外コース（`courses_list_left/right`）のスクレイピング対応
- 双方向同期（Phase2） + Sonner によるトースト通知
- 利用規約・プライバシーポリシーページ

### Changed
- プロジェクト名を KU-KMS+ → **KU-LMS+** にリネーム
- 認証を学籍番号ベースに変更、アプリ構成をリファクタリング
- PWA manifest のアイコン設定・`start_url` を更新、ロゴをブランドアセットに統一

### Fixed
- `parseDateRange` をセパレータ非依存の `matchAll` 方式に刷新
- `start_time` 取得できない問題の修正
- ネットワークリクエストエラー処理・DB フェッチタイムアウトの追加
- 拡張機能のメッセージポートエラー処理
