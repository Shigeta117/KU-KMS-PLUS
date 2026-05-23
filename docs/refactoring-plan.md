# KU-LMS+ リファクタリング計画

**作成日**: 2026-05-24  
**更新日**: 2026-05-24（全P0〜P2実施済み）  
**対象コミット**: 133285f → 5d2acad  
**スコープ**: Next.js PWA / Chrome Extension / Bookmarklet API 全体

---

## 優先度の定義

| ラベル | 基準 |
|--------|------|
| **P0 Critical** | セキュリティ脆弱性・型安全の崩壊・機能バグ。即時対応 |
| **P1 High** | 保守性・可読性の深刻な問題。次スプリント以内に対応 |
| **P2 Medium** | UX・パフォーマンス・アクセシビリティの改善余地 |
| **P3 Low** | 品質向上・将来対応。余裕があるときに対応 |

---

## P0 — Critical（即時対応）

### ✅ 1. `user_id` の型定義とSELECTクエリの不一致

**ファイル**: `nextjs-app/lib/types.ts:3`, `nextjs-app/lib/supabase.ts:14`

```typescript
// types.ts — user_id: string と定義されている
export interface Assignment {
  user_id: string;  // ← ここ
  ...
}

// supabase.ts — SELECTに user_id が含まれていない
.select('id, course_id, course_name, title, category, ...')
// user_id は取得されないため実行時は undefined
```

**問題**: TypeScript上は `string` だが、実行時は `undefined`。型安全が壊れており、`assignment.user_id` を参照するコードが追加された際にサイレントバグになる。

**対処**: `types.ts` から `user_id` を削除する（RLSで制御済みのためクライアントが保持する必要はない）か、SELECTに追加する。前者を推奨。

---

### 2. Chrome拡張機能への認証情報ハードコーディング

**ファイル**: `chrome-extension/background.js:3-4`

```javascript
const SUPABASE_URL      = 'https://jjjndffkyuvlwwcqcurt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DZj-CpBoQgnSFnkjcb9ZkQ_7m7g72V1';
```

**問題**: Chrome拡張機能のソースコードはブラウザの拡張機能管理画面から誰でも読める。anon keyはPublishableキー（NEXT_PUBLICと同等）のためRLSが適切な限り致命的ではないが、URLごとリポジトリに記録されているため管理上のリスクがある。Supabaseプロジェクトを変更した際の更新漏れにもつながる。

**対処**: `manifest.json` の `externally_connectable` またはビルドスクリプト（`build-ext.sh` 等）で `.env` から注入するパターンに移行する。即座に対応できない場合は少なくとも定数を1箇所に集約し、コメントでPublickey旨を明記する。

---

### ✅ 3. `ThemeProvider.tsx` にServiceWorkerInitが混在（責務違反）

**ファイル**: `nextjs-app/app/layout.tsx:4`, `nextjs-app/components/ThemeProvider.tsx`

```tsx
// layout.tsx — 読む人が混乱するimport名
import ServiceWorkerInit from '@/components/ThemeProvider';
```

**問題**: `ThemeProvider.tsx` がテーマ初期化とService Worker登録の両方を担っており、ファイル名と責務が不一致。新規参加者が `ThemeProvider` を修正しようとして意図せずSWロジックを壊すリスクがある。

**対処**: Service Worker登録を `components/ServiceWorkerInit.tsx` として分離し、`layout.tsx` から直接importする。

---

## P1 — High（次スプリントまでに対応）

### ✅ 4. AuthGuardのスピナーにタイムアウトがない

**ファイル**: `nextjs-app/components/AuthGuard.tsx:11-29`

```tsx
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(
    (_event, session) => {
      if (!session) { router.replace('/login'); }
      else          { setChecked(true); }
    }
  );
  return () => subscription.unsubscribe();
}, [router]);

if (!checked) {
  return <スピナー />;  // onAuthStateChangeが発火しない場合は永遠に表示
}
```

**問題**: ネットワーク障害やSupabase側の問題で `onAuthStateChange` が発火しない場合、ユーザーは永遠にスピナーを見続ける。タイムアウトや再試行の仕組みがない。

**対処**: 5〜8秒後に `/login` へのリダイレクトを促すフォールバックを追加する。

```tsx
useEffect(() => {
  const timer = setTimeout(() => router.replace('/login'), 8000);
  const { data: { subscription } } = supabase.auth.onAuthStateChange(...);
  return () => { clearTimeout(timer); subscription.unsubscribe(); };
}, [router]);
```

---

### ✅ 5. `useAssignments` — `optimisticUpdate` の依存配列が過剰

**ファイル**: `nextjs-app/lib/useAssignments.ts:42-81`

```typescript
const optimisticUpdate = useCallback(
  async (id, patch, label) => {
    const target = assignments.find((a) => a.id === id); // assignments を参照
    ...
  },
  [assignments, loadData]  // ← assignments が変わるたびに関数が再生成される
);
```

**問題**: `assignments` はデータ取得のたびに新しい配列参照になるため、`optimisticUpdate` → `handleToggleComplete` → `handleToggleHidden` が毎回再生成される。`TaskCard` に `React.memo` を導入した際に最適化が効かない。またUndoのクロージャが古い `assignments` を参照する競合状態のリスクがある。

**対処**: `setAssignments` の関数型更新と `useRef` を組み合わせて `assignments` への直接参照を排除する。

```typescript
const assignmentsRef = useRef(assignments);
useEffect(() => { assignmentsRef.current = assignments; }, [assignments]);

const optimisticUpdate = useCallback(async (id, patch, label) => {
  const target = assignmentsRef.current.find((a) => a.id === id);
  ...
}, [loadData]); // assignments への依存がなくなる
```

---

### ✅ 6. ブランドカラー `#004a8f` のハードコーディング多発

**該当ファイル**: `app/app/page.tsx`, `app/login/page.tsx`, `app/signup/page.tsx`, `app/page.tsx`, `app/settings/page.tsx`, `components/FilterBar.tsx`, `components/TaskCard.tsx`

**問題**: `#004a8f` と `#0066cc` がスタイル属性やTailwindの任意値として至る所に散在している。将来のブランドカラー変更やダークモード対応の調整に全ファイルの修正が必要になる。

**対処**: `globals.css` にCSS変数を定義し、`tailwind.config` で参照する。

```css
/* globals.css */
:root {
  --color-brand:       #004a8f;
  --color-brand-light: #0066cc;
}
```

```js
// tailwind.config.ts
theme: {
  extend: {
    colors: {
      brand: 'var(--color-brand)',
      'brand-light': 'var(--color-brand-light)',
    }
  }
}
```

これにより `bg-[#004a8f]` → `bg-brand` と書けるようになる。

---

### ✅ 7. ランディング・ログインページでの `<img>` タグ使用

**ファイル**: `app/page.tsx:19`, `app/login/page.tsx:54`, `app/signup/page.tsx:90`

```tsx
<img src="/icons/icon-192.png" alt="KU-LMS+" className="..." />
```

**問題**: Next.js の `<Image>` コンポーネントを使わないと、Lazy loading・WebP変換・サイズ最適化（`srcset`）が無効になる。ログインページはファーストビューなので影響が大きい。

**対処**: `next/image` の `<Image>` に置き換える。

```tsx
import Image from 'next/image';
<Image src="/icons/icon-192.png" alt="KU-LMS+" width={64} height={64} className="..." priority />
```

---

### ✅ 8. `signup/page.tsx` の扱いが不明確（→ 存続で確定）

**ファイル**: `nextjs-app/app/signup/page.tsx`, `nextjs-app/app/login/page.tsx:117`

**問題**: `docs/改善案.md` では「Sign Up UI を削除」と記録されているが、`signup/page.tsx` は完全に機能する状態で存在し、ログインページからも「新規アカウント作成はこちら」としてリンクされている。削除済みなのかログインページからのリンクは残す方針なのかが曖昧。

**対処**: 方針を明確化してIssueに記録する。「削除」ならルートとリンクを両方削除、「残す」なら改善案.mdの記録を修正する。

---

### 9. コードの重複: DOMパースロジック

**ファイル**: `chrome-extension/content.js:769-813`, `nextjs-app/app/api/bookmarklet/route.ts:151-176`

**問題**: `extractCourseName()`, `extractCourseId()`, `parseDateRange()` の同等ロジックが2ファイルに重複している。現在は両ファイルに `NOTE: content.js と同期` コメントが追加されているが、一方の修正時に他方を忘れるリスクは残る。

**対処**: 短期的には現状のコメント管理を維持しつつ、テストを追加してパリティを保証する。中期的にはブックマークレットのビルドスクリプトを整備し、`content.js` からロジックを自動生成する仕組みを検討する。

---

## P2 — Medium（計画的に対応）

### ✅ 10. ページ内フィルタリングの `useMemo` なし

**ファイル**: `nextjs-app/app/app/page.tsx:70-84`

```tsx
// この計算が assignments 変更のたびに毎回実行される（6回のイテレーション）
const categories  = [...new Set(assignments.map((a) => a.category).filter(Boolean))].sort();
const courseNames = [...new Set(assignments.map((a) => a.course_name).filter(...))].sort();
const counts: Record<FilterTab, number> = {
  pending:   assignments.filter(...).length,  // ×5
  ...
};
```

**問題**: 課題が多い場合（100件超）、タブ切り替えや状態変化のたびに重複する計算が走る。

**対処**: `useMemo` でメモ化する。

```tsx
const categories = useMemo(
  () => [...new Set(assignments.map((a) => a.category).filter(Boolean))].sort(),
  [assignments]
);
```

---

### ✅ 11. アクセシビリティの不足箇所

**ファイル**: 複数

| 箇所 | 問題 |
|------|------|
| `TaskCard.tsx:122` | 完了済みアイコン `<Check>` に `aria-label` なし（スクリーンリーダーが「完了」を読み上げられない） |
| `TaskCard.tsx:184-207` | `ActionButton` のボタンに `aria-label` なし（「完了にする」「非表示」のみでは文脈が不明） |
| `FilterBar.tsx:73` | 授業フィルタ `<select>` に `aria-label` なし |
| `FilterBar.tsx:41-66` | タブの `role="tab"` / `aria-selected` が未設定 |

**対処**:

```tsx
// TaskCard — Check アイコン
<Check size={13} aria-label="完了済み" />

// ActionButton — aria-label に課題タイトルを含める
<button aria-label={`${active ? activeLabel : inactiveLabel}: ${assignment.title}`}>

// FilterBar — select
<select aria-label="授業で絞り込む">

// FilterBar — タブ
<div role="tablist">
  <button role="tab" aria-selected={activeTab === key}>
```

---

### ✅ 12. React Error Boundaryがない

**問題**: コンポーネントで予期しないエラーが発生した場合、アプリ全体が白い画面（クラッシュ）になる。特に `useAssignments` や `Realtime` 周りのエラーが影響を受けやすい。

**対処**: ルートレベルに Error Boundary を追加する。Next.js の `error.tsx` を利用するのが最もシンプル。

```
nextjs-app/app/error.tsx          — ルートエラーUI
nextjs-app/app/app/error.tsx      — メイン画面用エラーUI
```

```tsx
// app/app/error.tsx
'use client';
export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-dvh gap-4">
      <p className="text-sm text-slate-600">データの読み込み中にエラーが発生しました</p>
      <button onClick={reset} className="text-sm font-semibold text-[#004a8f] underline">
        再試行
      </button>
    </div>
  );
}
```

---

### 13. オフライン対応の不完全さ

**ファイル**: `nextjs-app/public/sw.js`

**問題**: Service Workerは `offline.html` のみキャッシュ。オフライン時に一度でも開いたことのある課題データを表示できない。

**対処**: `Cache Storage` または `IndexedDB` を使い、最後のフェッチ結果をキャッシュする。

```javascript
// sw.js — Network First + Cache Fallback
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/rest/v1/assignments')) {
    event.respondWith(
      fetch(event.request)
        .then((res) => { cache.put(event.request, res.clone()); return res; })
        .catch(() => cache.match(event.request))
    );
  }
});
```

または `useAssignments.ts` 内で `localStorage` / `sessionStorage` にキャッシュする簡易対応でも効果的。

---

### ✅ 14. `settings/page.tsx` の非推奨 `document.execCommand`

**ファイル**: `nextjs-app/app/settings/page.tsx:65`

```typescript
document.execCommand('copy');  // 非推奨API
```

**問題**: `execCommand` は非推奨であり、将来のブラウザバージョンで削除される可能性がある。現在は Clipboard API の fallback として使われているが、fallback が必要なユースケースは iOS Safari 12 以前のみで実質不要。

**対処**: fallback を削除し、Clipboard API 失敗時はテキストを選択状態にしてユーザーに手動コピーを促すシンプルなUXに変更する。

---

### ✅ 15. ランディングページ (`app/page.tsx`) のServer Component化・Chrome Web Store対応

**ファイル**: `nextjs-app/app/page.tsx`

**問題**: 180行のファイルに `FeatureCard`, `StepCard`, `LandingPage` が同居している。機能追加（セクション追加等）でさらに肥大化しやすい構造。

**対処**: `FeatureCard`, `StepCard` を `components/landing/` に移動する。またランディングページは現在 `'use client'` だが、静的コンテンツが中心なので Server Component 化できる（`router.push` 使用箇所のみ Client Component に分離）。

---

### ✅ 16. `viewport` の `userScalable: false` によるアクセシビリティ問題

**ファイル**: `nextjs-app/app/layout.tsx:24`

```typescript
userScalable: false,  // ユーザーによるピンチズームを無効化
```

**問題**: WCAG 2.1 Success Criterion 1.4.4「文字サイズ変更 (AA)」はユーザーによるズームを禁止しないことを要求している。視覚障害を持つユーザーが拡大できなくなる。

**対処**: `maximumScale: 1` はPWAとしてのUXのため維持するが、`userScalable: false` は削除または `userScalable: true` に変更することを検討する。iOS Safariでは `userScalable: false` でも内部的にズームを許可する場合があり、実効性も低い。

---

### 17. `apple-touch-icon` の解像度不足

**ファイル**: `nextjs-app/app/layout.tsx:41`

```tsx
<link rel="apple-touch-icon" href="/icons/icon-192.png" />
```

**問題**: Apple Touch Iconの推奨サイズは 180×180px。192px のアイコンは規格外でiOSが自動リサイズするが、ぼやける場合がある。改善案.mdに「素材が揃い次第対応」とあるが未対応。

**対処**: 180×180px のアイコンを生成し `public/icons/apple-touch-icon.png` として配置する。

---

## P3 — Low（余裕があるときに対応）

### 18. テストが一切ない

**問題**: ユニット・結合・E2Eのいずれも存在しない。CLAUDE.md の方針では「新機能の代表フローには必ずE2Eを1本以上保証する」とあるが未整備。

**推奨テスト戦略**:

| 種別 | 対象 | ツール案 |
|------|------|---------|
| Unit | `lib/types.ts` の日付・urgency関数 | Vitest |
| Unit | `chrome-extension/content.js` のDOMパーサ | Vitest + JSDOM |
| Integration | `useAssignments` hook | Testing Library |
| E2E | ログイン → 課題表示 → 完了操作 | Playwright |

**優先順位**: `getDeadlineUrgency`, `formatRelativeDeadline`, `parseDateRange` から着手する（副作用がなく境界値テストが書きやすい）。

---

### 19. CI/CDパイプラインがない

**問題**: GitHub Actionsが設定されておらず、PRマージ前の自動チェック（型検査・lint）が行われない。

**対処**: `.github/workflows/ci.yml` を追加する。

```yaml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22 }
      - run: cd nextjs-app && npm ci
      - run: cd nextjs-app && npm run build
      - run: cd nextjs-app && npm run lint
```

---

### 20. 締め切りリマインダー通知機能の欠如

**問題**: 締め切りが近づいてもアプリを開かない限り通知されない。PWAとしての強みが活かせていない。

**対処候補**:
- **Web Push Notification**: Supabaseのcron（pg_cron）+ Edge Functionで定時配信
- **Service Worker定期チェック**: `setInterval` でバッジ更新（`navigator.setAppBadge()`）
- **Chrome Extension**: `chrome.alarms` で締め切り前通知（拡張機能側なので最も実装しやすい）

拡張機能側への `chrome.alarms` 実装が最も工数が少なく効果的。

---

### 21. コースフィルタ状態の非永続化

**ファイル**: `nextjs-app/app/app/page.tsx:34`

```typescript
const [activeCourse, setActiveCourse] = useState('');  // ページ更新でリセット
```

**問題**: タブ別カテゴリ状態は永続化されているが（`activeCategoryByTab`）、コースフィルタはページ更新でリセットされる。UXの一貫性がない。

**対処**: `useLocalStorage` フックを導入してコースフィルタも永続化する、またはURLクエリパラメータで管理する（ブックマーク・共有に対応できる利点あり）。

---

### 22. `getDeadlineUrgency` の境界値ラベルの不正確さ

**ファイル**: `nextjs-app/lib/types.ts:22-32`

```typescript
if (diff < 24 * 60 * 60 * 1000) return 'today';  // ラベル「今日まで」
```

**問題**: 「今日まで」は24時間以内を指しているが、明日の23時59分の課題も「今日まで」と表示される場合がある（今が0時直後の場合）。ユーザーの感覚と一致しない可能性。

**対処**: `today` の判定を「今日の23:59まで」（日付ベース）に変更するか、ラベルを「24時間以内」に修正する。

---

## 既対応・保留の確認

以下は `docs/改善案.md` に記録済みの項目のうち、本計画で再確認した内容：

| 項目 | 状態 | 備考 |
|------|------|------|
| Supabase Realtime | ✅ 完了 | `useAssignments.ts:31-39` で実装済み |
| オフラインフォールバック SW | ✅ 部分完了 | `public/sw.js` で offline.html のみ。P2-13 参照 |
| AuthGuard の二重管理整理 | ✅ 完了 | `onAuthStateChange` に統一済み |
| Anon Key の二重管理 | ⏭ 保留 | bookmarklet は構造上やむを得ず。background.js のハードコードは P0-2 で対応要 |
| Sign Up UI 削除 | ❓ 要確認 | route は存在し login からリンクあり。P1-8 参照 |
| apple-touch-icon 180px | ⏭ 保留 | 素材待ち。P2-17 参照 |

---

## 実施順序の推奨

```
Week 1:  P0-1（型修正）→ P0-3（責務分離）→ P1-7（Image最適化）
Week 2:  P0-2（認証情報管理の整理）→ P1-4（AuthGuard timeout）→ P1-6（CSS変数）
Week 3:  P1-5（useCallback最適化）→ P2-11（a11y）→ P2-12（Error Boundary）
後続:    P2-10（useMemo）→ P2-13（offline）→ P3-18（テスト導入）
```

---

*このドキュメントはコードベースの変化に応じて随時更新する。実装完了した項目は ✅ を付けて記録を残す。*
