'use strict';

// =============================================
// ユーティリティ
// =============================================
const bg = (type, payload = {}) =>
  chrome.runtime.sendMessage({ type, ...payload });

function showToast(msg, type = 'info') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast show toast-${type}`;
  clearTimeout(el.__timer);
  el.__timer = setTimeout(() => { el.className = 'toast'; }, 4000);
}

function setLoginError(msg) {
  const el = document.getElementById('loginError');
  if (msg) {
    el.textContent = msg;
    el.className = 'form-error show';
  } else {
    el.className = 'form-error';
  }
}

function clearFieldErrors() {
  document.getElementById('studentIdError').className = 'field-error';
  document.getElementById('passwordError').className  = 'field-error';
  document.getElementById('studentId').classList.remove('error');
  document.getElementById('password').classList.remove('error');
  setLoginError('');
}

// =============================================
// 認証バッジ更新
// =============================================
async function refreshAuthBadge() {
  const { loggedIn, userId } = await bg('GET_AUTH_STATUS');
  const dot  = document.getElementById('authDot');
  const text = document.getElementById('authText');

  if (loggedIn) {
    dot.className    = 'dot dot-green';
    text.textContent = `ログイン中 (${userId?.slice(0, 8)}…)`;
  } else {
    dot.className    = 'dot dot-red';
    text.textContent = '未ログイン';
  }
}

// =============================================
// 同期状態の表示
// =============================================
const SYNC_CONFIG = {
  idle:    { dotClass: 'sync-dot sync-dot-idle',    label: '待機中' },
  syncing: { dotClass: 'sync-dot sync-dot-syncing', label: '同期中…' },
  success: { dotClass: 'sync-dot sync-dot-success', label: '同期成功' },
  error:   { dotClass: 'sync-dot sync-dot-error',   label: 'エラー' },
};

async function refreshSyncStatus() {
  const { syncStatus, lastSyncAt, lastSyncCount, lastSyncError } =
    await chrome.storage.local.get([
      'syncStatus', 'lastSyncAt', 'lastSyncCount', 'lastSyncError',
    ]);

  const status = syncStatus ?? 'idle';
  const cfg    = SYNC_CONFIG[status] ?? SYNC_CONFIG.idle;

  document.getElementById('syncDot').className        = cfg.dotClass;
  document.getElementById('syncStatusText').textContent = cfg.label;

  const detailEl = document.getElementById('syncDetail');
  detailEl.className = 'sync-detail-text';

  if (status === 'success') {
    const parts = [];
    if (lastSyncCount != null) parts.push(`${lastSyncCount} 件収集`);
    if (lastSyncAt)            parts.push(formatSyncTime(lastSyncAt));
    detailEl.textContent = parts.join(' · ');
  } else if (status === 'error') {
    detailEl.className   = 'sync-detail-text error';
    detailEl.textContent = lastSyncError ?? '不明なエラー';
  } else if (status === 'idle' && lastSyncAt) {
    detailEl.textContent = `最終同期: ${formatSyncTime(lastSyncAt)}`;
  } else {
    detailEl.textContent = '';
  }
}

function formatSyncTime(iso) {
  return new Date(iso).toLocaleString('ja-JP', {
    month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// =============================================
// 初期化
// =============================================
document.addEventListener('DOMContentLoaded', async () => {
  await refreshAuthBadge();
  await refreshSyncStatus();

  // ストレージ変更をリアルタイムに反映
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if ('syncStatus' in changes || 'lastSyncAt' in changes) refreshSyncStatus();
    if ('accessToken' in changes || 'userId' in changes)     refreshAuthBadge();
  });

  // ---------- ログイン ----------
  document.getElementById('loginBtn').addEventListener('click', async () => {
    clearFieldErrors();

    const studentId = document.getElementById('studentId').value.trim().toLowerCase();
    const password  = document.getElementById('password').value;
    let valid = true;

    if (!studentId || !/^k\d{6}$/.test(studentId)) {
      document.getElementById('studentIdError').textContent = '関大ユーザーID（k + 6桁の数字）を入力してください';
      document.getElementById('studentIdError').className   = 'field-error show';
      document.getElementById('studentId').classList.add('error');
      valid = false;
    }
    if (!password) {
      document.getElementById('passwordError').textContent = 'パスワードを入力してください';
      document.getElementById('passwordError').className   = 'field-error show';
      document.getElementById('password').classList.add('error');
      valid = false;
    }
    if (!valid) return;

    const email = `${studentId}@kansai-u.ac.jp`;

    const btn = document.getElementById('loginBtn');
    btn.disabled    = true;
    btn.textContent = 'ログイン中…';

    const res = await bg('LOGIN', { email, password });

    btn.disabled    = false;
    btn.textContent = 'ログイン';

    if (res.ok) {
      document.getElementById('password').value = '';
      showToast('ログインしました', 'success');
      await refreshAuthBadge();
    } else {
      // パスワード・メール違いはフィールドをハイライト
      const msg = res.error ?? 'ログインに失敗しました';
      if (msg.includes('パスワード') || msg.includes('メールアドレスまたはパスワード')) {
        document.getElementById('password').classList.add('error');
      }
      setLoginError(msg);
      console.error('[KU-LMS+] Login error:', res.error, 'code:', res.code);
    }
  });

  // ---------- ログアウト ----------
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    await bg('LOGOUT');
    showToast('ログアウトしました', 'info');
    await refreshAuthBadge();
    await refreshSyncStatus();
  });

  // ---------- 手動スクレイプ ----------
  document.getElementById('scrapeBtn').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (!tab?.url?.includes('kulms.tl.kansai-u.ac.jp')) {
      setLoginError('WebClass のトップページを開いた状態で実行してください');
      return;
    }

    const btn = document.getElementById('scrapeBtn');
    btn.disabled    = true;
    btn.textContent = '収集中…';

    try {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['content.js'],
      });
      showToast('収集を開始しました', 'success');
    } catch (e) {
      setLoginError(`スクリプト注入エラー: ${e.message}`);
      console.error('[KU-LMS+] executeScript error:', e);
    } finally {
      setTimeout(() => {
        btn.disabled    = false;
        btn.textContent = '今すぐ課題を収集';
      }, 2000);
    }
  });

  // Enter キーでログイン
  document.getElementById('password').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('loginBtn').click();
  });

  // メール入力でエラーをクリア
  document.getElementById('studentId').addEventListener('input', clearFieldErrors);
  document.getElementById('password').addEventListener('input', clearFieldErrors);
});
