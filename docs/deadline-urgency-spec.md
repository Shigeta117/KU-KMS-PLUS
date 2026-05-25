# 期限区分・色分け統一仕様（案A拡張版）

**作成日**: 2026-05-25  
**ステータス**: 実装待ち  
**対象**: Next.js PWA / Chrome Extension（授業ページバッジ・ミニダッシュボード）

---

## 背景と目的

現状、アプリと拡張機能で期限区分の閾値・ラベル・色がバラバラで、同じ課題でも異なる緊急度を示している。  
特に「今週中」の定義がアプリは **7日**、拡張機能は **72時間** と乖離している。

本仕様では以下を目標に統一する。

- 区分を **5段階（+開始前）** に統一し、両プラットフォームで同一の閾値を使う
- ラベルを単位の細かい相対表現（○週間後 / ○ヶ月後）に拡張して視認性を向上
- 拡張機能バッジは **高コントラスト・白抜き文字・太字** を採用し、WebClassページでの視認性を特に重視

---

## 1. 区分定義（urgency levels）

| urgency | 条件 | 変更前との比較 |
|---------|------|--------------|
| `overdue` | deadline < 現在時刻 | 変更なし |
| `critical` | 現在〜24時間以内 | アプリの `today` を改名 |
| `soon` | 24時間〜72時間以内 | **新設**（両側に追加） |
| `week` | 72時間〜7日以内 | アプリの `week` を72h〜に縮小 |
| `future` | 7日超 | 変更なし（ラベル表記を細分化） |
| `none` | deadline なし | 変更なし |
| ―（特別） | start_time > 現在 | `scheduled` 扱い・変更なし |

> `critical` / `soon` / `week` / `future` はすべて「**期限内**」の区分。色のトーンで段階的に緊急度を伝える。

---

## 2. ラベル生成ロジック（共通）

アプリ・拡張機能ともに以下の `formatRelativeDeadline` 仕様に従う。

### 2-1. 期限超過（diff < 0）

| 経過時間 | 表記 |
|----------|------|
| 1時間未満 | `期限超過` |
| 1〜23時間 | `○時間超過` |
| 1日以上 | `○日超過` |

### 2-2. 期限内（diff ≥ 0）

| 残り時間の範囲 | urgency | 表記（相対ラベル） |
|--------------|---------|-----------------|
| 0〜59分 | `critical` | `まもなく` |
| 1〜23時間 | `critical` | `あと○時間` |
| 1〜2日 | `soon` | `あと○日` |
| 3〜6日 | `week` | `あと○日` |
| 7〜13日 | `future` | `1週間後` |
| 14〜20日 | `future` | `2週間後` |
| 21〜27日 | `future` | `3週間後` |
| 28〜29日 | `future` | `3週間後` ※30日未満のため |
| 30日以上 | `future` | `○ヶ月後`（`Math.floor(日数/30)`、最小1） |

> **週→月の切り替え閾値**: 30日（≒カレンダー1ヶ月）  
> **計算式**: `weeks = Math.floor(diffDays / 7)` / `months = Math.floor(diffDays / 30)`

---

## 3. アプリ側（Next.js PWA）表示仕様

### 3-1. TaskCard — 左ボーダー色・バッジ背景

| urgency | 左ボーダー（Tailwind） | バッジ bg（ライト） | バッジ bg（ダーク） | 文字色（ライト） |
|---------|----------------------|-------------------|-------------------|----------------|
| `overdue` | `border-l-red-500` | `bg-red-100` | `bg-red-950` | `text-red-700` |
| `critical` | `border-l-orange-500` | `bg-orange-100` | `bg-orange-950` | `text-orange-700` |
| `soon` | `border-l-amber-400` | `bg-amber-100` | `bg-amber-950` | `text-amber-700` |
| `week` | `border-l-yellow-400` | `bg-yellow-100` | `bg-yellow-950` | `text-yellow-700` |
| `future` | `border-l-slate-300` | `bg-slate-100` | `bg-slate-700` | `text-slate-600` |
| `none` | `border-l-slate-200` | `bg-slate-100` | `bg-slate-700` | `text-slate-500` |
| scheduled | `border-l-sky-300` | `bg-sky-100` | `bg-sky-950` | `text-sky-700` |

> `critical` のボーダーを従来の `orange-400` → `orange-500` に変更し、`soon`（amber）との差を明確化。

### 3-2. タブカウントバッジ・urgencyラベル

| urgency | URGENCY_LABEL（バッジ内短テキスト） | relative（TaskCard内） |
|---------|------------------------------------|----------------------|
| `overdue` | 期限切れ | （formatRelativeDeadline 出力） |
| `critical` | 今日まで | （同上） |
| `soon` | もうすぐ | （同上） |
| `week` | 今週中 | （同上） |
| `future` | 期限あり | （同上） |
| `none` | 期限なし | — |

---

## 4. 拡張機能側（Chrome Extension）表示仕様

### 基本方針
- **高コントラスト**: すべての区分で濃い背景色＋白文字（`#fff`）を使用
- **フォント**: `font-weight: 800`、`font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif`
- WebClassの既存UIに埋め込まれるため、背景が薄い色だと目立たない。すべてsolid（不透明）で統一する

### 4-1. 授業ページバッジ（`injectDeadlineBadges`）

| urgency | バッジテキスト | bg | color |
|---------|--------------|-----|-------|
| `scheduled`（開始前） | ⏳ 開始前 | `#1d4ed8`（深青） | `#fff` |
| `overdue` | 期限切れ | `#475569`（スレートグレー） | `#fff` |
| `critical` | 🔥 あと○時間 | `#b91c1c`（深赤） | `#fff` |
| `soon` | ⚡ あと○日 | `#c2410c`（深オレンジ） | `#fff` |
| `week` | あと○日 | `#a16207`（深アンバー） | `#fff` |
| `future`（〜3週間） | ○週間後 | `#15803d`（深緑） | `#fff` |
| `future`（1ヶ月〜） | ○ヶ月後 | `#4b5563`（ダークグレー） | `#fff` |

#### バッジ共通スタイル

```css
font-size: 11px;
font-weight: 800;
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
padding: 3px 9px;
border-radius: 999px;
display: inline-block;
margin-left: 8px;
white-space: nowrap;
vertical-align: middle;
letter-spacing: 0.02em;
```

> `border` は廃止（背景色が濃いため不要）

### 4-2. ミニダッシュボード（`injectMiniDashboard`）

トップページのサイドバーに表示するバッジ。背景が青グラデーション（`#004a8f→#0066cc`）のため、バッジの輝度は授業ページより高めにする。

| urgency | バッジテキスト | bg | color |
|---------|--------------|-----|-------|
| `critical` | 🔥 ○時間 | `#ef4444`（やや明るめ赤） | `#fff` |
| `soon` | ⚡ ○日 | `#f97316`（オレンジ） | `#fff` |
| `week` | ○日 | `#eab308`（イエロー） | `#1a1a1a`（暗背景に白が目立たないため例外的に黒） |
| `future`（〜3週間） | ○週間後 | `rgba(255,255,255,0.25)` | `#fff` |
| `future`（1ヶ月〜） | ○ヶ月後 | `rgba(255,255,255,0.15)` | `rgba(255,255,255,0.8)` |

> `week`（黄色）のみ背景が明るいため文字色を `#1a1a1a` とする。他は全て白文字。

---

## 5. 変更が必要なファイル一覧

### Next.js PWA

| ファイル | 変更内容 |
|---------|---------|
| `lib/types.ts` | `DeadlineUrgency` 型に `'soon'` を追加。`getDeadlineUrgency` に 72h 閾値追加。`formatRelativeDeadline` を週/月単位対応に改修 |
| `components/TaskCard.tsx` | `URGENCY_STYLES` と `URGENCY_LABEL` に `soon` エントリを追加。`critical` / `week` の色を上記仕様に更新 |
| `app/app/page.tsx` | `counts.week` の filter 条件を `72h〜7日` に変更 |

### Chrome Extension

| ファイル | 変更内容 |
|---------|---------|
| `content.js` — `injectDeadlineBadges` | 区分閾値を 24h / 72h / 7日 / 30日 の4段階に変更。ラベルと色を上記仕様に更新。`border` スタイルを削除し `font-weight:800` を追加 |
| `content.js` — `injectMiniDashboard` | 区分閾値を同様に変更。ラベルと色を上記仕様に更新 |

### 変更不要

| ファイル | 理由 |
|---------|------|
| `lib/supabase.ts` | DB側に変更なし |
| `components/FilterBar.tsx` | タブ構成（pending/scheduled/material/completed/hidden）に変更なし |
| `lib/useAssignments.ts` | urgency 判定はクライアント側のため変更なし |
| `app/api/bookmarklet/route.ts` | ブックマークレット側はバッジ注入なし |

---

## 6. 実装上の注意点

### `getDeadlineUrgency` の変更による影響範囲

`'today'` → `'critical'` へのリネームと `'soon'` の追加により、`DeadlineUrgency` 型を参照している箇所がすべて型エラーになる。TypeScript が全箇所を検出するため安全に対応できる。

影響が確実な箇所:
- `TaskCard.tsx` の `URGENCY_STYLES` / `URGENCY_LABEL` キー
- `page.tsx` の `overdueItems` フィルタ（`=== 'overdue'` は変更なし）
- `page.tsx` の `counts.week` フィルタ条件

### `formatRelativeDeadline` の週計算

「1週間後」は `Math.floor(diffDays / 7)` で算出。境界値（ちょうど7日）は `week` urgency（あと7日）ではなく `future`（1週間後）扱いになるため、`getDeadlineUrgency` の `week` 判定を `diffH < 7 * 24`（未満）と `formatRelativeDeadline` の入力側で整合させること。

### 拡張機能の `font-weight: 800`

WebClassページには `font-weight` をリセットするCSSが存在する可能性がある。`!important` が必要か確認し、必要であれば付与する。

---

## 7. 変更前後の比較サマリー

### アプリ（TaskCard urgency）

| 条件 | 変更前 | 変更後 |
|------|--------|--------|
| 24h以内 | `today`「今日まで」 | `critical`「今日まで」 |
| 24〜72h | （`week` に含まれていた） | **`soon`「もうすぐ」**（新設） |
| 72h〜7日 | `week`「今週中」 | `week`「今週中」（閾値変更） |
| 7日超 | `future`「期限あり」 | `future`「期限あり」（ラベル細分化） |

### 拡張機能（バッジ）

| 条件 | 変更前 | 変更後 |
|------|--------|--------|
| 24h以内 | 🔥 あと○時間（赤薄） | 🔥 あと○時間（**深赤・白抜き**） |
| 24〜72h | 🟡 あと○日（黄薄） | ⚡ あと○日（**深オレンジ・白抜き**） |
| 72h〜7日 | （72h区分に含まれていた） | あと○日（**深アンバー・白抜き**）（新設） |
| 7〜30日 | 🟢 あと○日（緑薄） | ○週間後（**深緑・白抜き**） |
| 30日以上 | 🟢 あと○日（緑薄） | ○ヶ月後（**ダークグレー・白抜き**） |
| 期限切れ | 期限切れ（薄グレー） | 期限切れ（**スレートグレー・白抜き**） |
