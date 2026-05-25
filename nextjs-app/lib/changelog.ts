export type ChangeType = 'feat' | 'fix' | 'chore';
export type ChangeComponent = 'extension' | 'app' | 'other';

export interface ChangelogEntry {
  version: string;
  date: string;
  type: ChangeType;
  components: ChangeComponent[];
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.2.2',
    date: '2026-05-25',
    type: 'fix',
    components: ['app'],
    changes: [
      'Realtime サブスクリプションに user_id フィルタを追加し、不要な DB クエリを削減',
    ],
  },
  {
    version: '1.2.1',
    date: '2026-05-25',
    type: 'chore',
    components: ['other'],
    changes: [
      'SemVer に基づくバージョン管理ルールを策定（CLAUDE.md）',
      'ランディングページに「最近のアップデート」セクションを追加',
      '変更履歴専用ページ（/changelog）を新設',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-05-25',
    type: 'feat',
    components: ['extension', 'app'],
    changes: [
      'アイコンを軽量な新デザインに刷新',
      '期限の緊急度を5段階で表示（very-soon / soon / upcoming / later / far）',
      '拡張機能バッジを高コントラスト配色に変更',
    ],
  },
  {
    version: '1.1.0',
    date: '2026-05-24',
    type: 'feat',
    components: ['extension', 'app'],
    changes: [
      '拡張機能ポップアップに「PWAで課題を確認」リンクを追加',
      'ランディングページを刷新・Error Boundary を追加',
      'Chrome 拡張を Manifest V3 に対応・不要パーミッションを削除',
      '認証・パフォーマンス・アクセシビリティの内部改善（P0〜P3）',
    ],
  },
  {
    version: '1.0.0',
    date: '2026-05-22',
    type: 'feat',
    components: ['extension', 'app'],
    changes: [
      'Chrome 拡張機能・Next.js PWA の初回 Web ストアリリース',
      '課題の自動スクレイピング・Supabase Realtime 同期',
      'ダークモード・Service Worker・PWA インストール機能',
      'WebClass ページへの UI 拡張・双方向同期',
    ],
  },
];

export const LATEST_VERSION = CHANGELOG[0].version;
