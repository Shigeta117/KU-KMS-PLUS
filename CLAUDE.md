# KU-LMS+ — AI 向けプロジェクト指示書

## プロジェクト概要

関西大学 WebClass の課題を自動収集・管理する非公式拡張機能 + PWA。
- `chrome-extension/` — Chrome 拡張機能（Manifest V3）
- `nextjs-app/` — Next.js PWA（Supabase バックエンド）

---

## リリース時の必須チェックリスト

**機能追加・UIの変更・バグ修正をコミットする際は、以下を必ず確認・実施すること。**

### 1. バージョン番号を決定する

`MAJOR.MINOR.PATCH` の SemVer に従う：

| 変更内容 | 上げる桁 |
|---------|---------|
| 後方互換性のない大幅な変更（認証刷新・DB スキーマ破壊的変更） | MAJOR |
| ユーザーに見える新機能・UI 改善・新ページ追加 | MINOR |
| バグ修正・内部リファクタリング・依存関係更新・ドキュメント更新 | PATCH |

### 2. 更新が必要なファイル（リリース時は全て揃えること）

#### ① Chrome 拡張 マニフェスト
**`chrome-extension/manifest.json`** の `version` フィールドを更新。

```json
{
  "version": "1.1.0"
}
```

#### ② CHANGELOG.md（プロジェクトルート）
**`CHANGELOG.md`** に新しいバージョンセクションを追記。フォーマット:

```markdown
## [X.Y.Z] — YYYY-MM-DD（変更の一言要約）

### Added / Changed / Fixed / Internal
- 変更内容
```

- `[Unreleased]` セクションに溜めておいた内容をバージョンセクションに移動させる
- 日付は `YYYY-MM-DD` 形式

#### ③ 変更履歴データ（ランディングページ・変更履歴ページ共通）
**`nextjs-app/lib/changelog.ts`** の `CHANGELOG` 配列の**先頭**に新エントリを追加。
ランディングページ（直近3件）と `/changelog` ページの両方に自動反映される。

```typescript
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: 'X.Y.Z',              // バージョン番号（v なし）
    date: 'YYYY-MM-DD',            // リリース日
    type: 'feat',                   // 'feat' | 'fix' | 'chore'
    components: ['extension', 'app'], // 'extension' | 'app' | 'other'（複数可）
    changes: [
      '変更内容1（ユーザー向けの一言説明）',
      '変更内容2',
    ],
  },
  // ... 既存エントリ
];
```

`type` の選び方：
- `feat` — 新機能・UI 改善
- `fix` — バグ修正
- `chore` — メンテナンス・内部変更のみ

`components` の選び方：
- `extension` — Chrome 拡張機能に関わる変更
- `app` — Next.js PWA（ウェブアプリ）に関わる変更
- `other` — ドキュメント・運用ルール等

#### ④ Git タグを打つ

```bash
git tag v1.1.0
git push origin v1.1.0
```

---

## バージョン番号の現状

| ファイル | 現在のバージョン |
|---------|---------------|
| `chrome-extension/manifest.json` | 1.4.0 |
| `CHANGELOG.md` 最新リリース | 1.4.0 |
| `nextjs-app/lib/changelog.ts` 配列先頭 | 1.4.0 |

---

## コーディング規約

- **言語**: TypeScript（strict モード）、`any` 禁止
- **スタイル**: Tailwind CSS のみ使用（インラインスタイル不可）
- **状態管理**: ミュータブル操作禁止、スプレッド演算子で不変更新
- **コンポーネント**: 1ファイル 800 行以内、関数は 50 行以内
- **エラー処理**: `try/catch` + `unknown` 型でナロウイング必須

## ディレクトリ構成の補足

```
KU-LMS-PLUS/
├── CHANGELOG.md              ← 変更履歴（リリース時更新）
├── CLAUDE.md                 ← このファイル
├── chrome-extension/
│   ├── manifest.json         ← バージョン管理対象
│   └── ...
└── nextjs-app/
    └── app/
        ├── page.tsx          ← ランディングページ（CHANGELOG 配列あり）
        ├── manifest.ts       ← PWA マニフェスト（バージョン情報なし）
        └── ...
```
