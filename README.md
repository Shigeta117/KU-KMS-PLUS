# KU-LMS+

関西大学の LMS（WebClass）から課題情報を自動収集し、スマートフォンから快適に管理できるシステムです。

## 概要

WebClass は授業ごとにページが分かれており、課題の締切を一覧で確認できません。  
このシステムは **Chrome 拡張機能**がバックグラウンドで課題をスクレイピングして **Supabase** に保存し、**Next.js PWA** でスマホから閲覧・管理できるようにします。

```
┌─────────────────────┐    UPSERT + JWT    ┌──────────────────┐
│  Chrome 拡張(MV3)   │ ────────────────▶  │  Supabase        │
│  WebClass で自動実行 │                    │  assignments 表  │
└─────────────────────┘                    │  RLS 有効        │
                                            └──────────────────┘
                                                     ▲
                                                     │ select/update
                                            ┌──────────────────┐
                                            │  Next.js PWA     │
                                            │  スマホ最適化UI  │
                                            └──────────────────┘
```

**主な機能**

- WebClass トップページを開くだけで課題を自動収集
- 締切の近さで色分け表示（期限切れ / 今日 / 今週 / それ以降）
- 「完了」「非表示」フラグをアプリ側で手動管理（再スクレイプしても上書きされない）
- カテゴリ・ステータスでフィルタリング
- PWA 対応（ホーム画面に追加可能）
- Supabase Auth による複数ユーザー対応（Row Level Security）

---

## ディレクトリ構成

```
KU-LMS-PLUS/
├── supabase/
│   └── schema.sql          # DB スキーマ（テーブル・RLS・インデックス）
├── chrome-extension/
│   ├── manifest.json
│   ├── background.js       # Service Worker（認証・UPSERT）
│   ├── content.js          # スクレイパー
│   ├── popup.html          # 設定 UI
│   └── popup.js
└── nextjs-app/
    ├── app/                # Next.js App Router
    ├── components/         # TaskCard / FilterBar / AuthGuard
    └── lib/                # Supabase クライアント・型定義
```

---

## セットアップ

### 1. Supabase プロジェクトの準備

1. [Supabase](https://supabase.com) でプロジェクトを新規作成
2. **SQL Editor** で `supabase/schema.sql` の内容を実行
3. **Authentication > Providers > Email** を有効化  
   （開発時は「Confirm email」をオフにすると楽です）
4. **Project Settings > API** から以下をメモしておく
   - `Project URL`（例: `https://xxxx.supabase.co`）
   - `anon public` キー

### 2. Next.js アプリの起動

```bash
cd nextjs-app
cp .env.local.example .env.local
```

`.env.local` を開き、Supabase の値を記入:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
```

```bash
npm install
npm run dev
# → http://localhost:3000
```

ブラウザで `http://localhost:3000` を開き、アカウントを作成してください。  
（画面下部の「新規アカウントを作成」リンクから登録できます）

### 3. Chrome 拡張機能のインストール

[Chrome ウェブストア](https://chromewebstore.google.com/detail/bjkjjadopceeibphlgmkonicleofhmkh) から **KU-LMS+** をインストールしてください。

> ソースから直接読み込む場合:
> 1. Chrome で `chrome://extensions/` を開く
> 2. 右上の「**デベロッパーモード**」をオン
> 3. 「パッケージ化されていない拡張機能を読み込む」→ `chrome-extension/` フォルダを選択

### 4. 拡張機能の初期設定

1. Chrome ツールバーの **KU-LMS+** アイコンをクリック
2. **アカウント** にアプリで登録した関大ユーザーID・パスワードを入力して「ログイン」

---

## 使い方

### 課題の自動収集

WebClass のトップページ（時間割が表示されるページ）を開くと、バックグラウンドで自動的に課題を収集します。  
収集完了後、拡張アイコンのバッジに取得件数が一瞬表示されます。

手動で今すぐ収集したい場合は、WebClass のトップページを開いた状態で拡張のポップアップから「**今すぐ課題を収集**」をクリックしてください。

### PWA としてインストール（スマホ）

Next.js アプリを Vercel 等にデプロイ後、スマホのブラウザで開き「ホーム画面に追加」するとアプリとして使えます。

---

## デプロイ（Vercel）

```bash
cd nextjs-app
npx vercel
```

Vercel のダッシュボードで環境変数を設定してください:

| 変数名 | 値 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Anon Key |

---

## 配布する場合

複数のユーザーに使わせる場合は、以下のものを共有してください。

| 共有するもの | 内容 |
|---|---|
| PWA URL | https://ku-lms-plus.vercel.app |
| Chrome 拡張機能 | https://chromewebstore.google.com/detail/bjkjjadopceeibphlgmkonicleofhmkh |

各ユーザーはアプリでアカウントを作成し、拡張機能のポップアップでログインします。  
Row Level Security により、ユーザーごとのデータは完全に分離されます。

---

## トラブルシューティング

**課題が収集されない**  
→ WebClass の**トップページ**（時間割が表示されるページ）を開いているか確認してください。個別の授業ページでは動作しません。

**拡張のポップアップでログインエラーが出る**  
→ メールアドレスとパスワードが正しいか確認してください。アプリ側で先にアカウントを作成してからログインしてください。

**アプリに課題が表示されない**  
→ 拡張でログインしているアカウントと、アプリで使っているアカウントが同一か確認してください。

**スクレイピングで取れない課題がある**  
→ WebClass の DOM 構造が変更された可能性があります。`content.js` のセレクタ（`section.list-group-item` 等）を実際のページと照合して修正してください。
