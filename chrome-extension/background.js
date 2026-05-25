'use strict';

const SUPABASE_URL      = 'https://jjjndffkyuvlwwcqcurt.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DZj-CpBoQgnSFnkjcb9ZkQ_7m7g72V1';

const AUTH_URL = `${SUPABASE_URL}/auth/v1`;
const REST_URL = `${SUPABASE_URL}/rest/v1`;

// =============================================
// 同期状態の永続化
// =============================================
async function saveSyncStatus(status, extra = {}) {
  await chrome.storage.local.set({ syncStatus: status, ...extra });
}

// =============================================
// セッション確認・事前リフレッシュ
// JWTのexp確認 → 残り60秒未満なら事前にリフレッシュ
// =============================================
async function ensureValidSession() {
  const { accessToken, refreshToken } = await chrome.storage.local.get(['accessToken', 'refreshToken']);
  if (!accessToken || !refreshToken) throw new Error('ログインしていません。ポップアップからログインしてください。');

  try {
    const payload   = JSON.parse(atob(accessToken.split('.')[1]));
    const remaining = payload.exp * 1000 - Date.now();
    if (remaining > 60_000) return accessToken;
  } catch {
    // デコード失敗時はリフレッシュ試行
  }

  return refreshAccessToken();
}

// =============================================
// webNavigation: WebClass ページで自動スクレイプ
// =============================================
chrome.webNavigation.onCompleted.addListener(
  async (details) => {
    if (details.frameId !== 0) return;
    const { accessToken } = await chrome.storage.local.get(['accessToken']);
    if (!accessToken) return;

    // スクレイプ開始前にセッションを確認・更新
    try {
      await ensureValidSession();
    } catch (e) {
      console.warn('[KU-LMS+] Session invalid, skipping scrape:', e.message);
      await saveSyncStatus('error', { lastSyncError: 'セッションが切れています。ポップアップから再ログインしてください。' });
      return;
    }

    try {
      await chrome.scripting.executeScript({
        target: { tabId: details.tabId },
        files: ['content.js'],
      });
    } catch (e) {
      console.warn('[KU-LMS+] Script injection failed:', e.message);
    }
  },
  { url: [{ hostContains: 'kulms.tl.kansai-u.ac.jp' }] }
);

// =============================================
// メッセージハンドラ
// =============================================
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case 'LOGIN':
      login(message.email, message.password)
        .then((data) => sendResponse({ ok: true, data }))
        .catch((err) => sendResponse({ ok: false, error: err.message, code: err.code }));
      return true;

    case 'LOGOUT':
      chrome.storage.local.remove(['accessToken', 'refreshToken', 'userId']);
      saveSyncStatus('idle', { lastSyncAt: null, lastSyncCount: null, lastSyncError: null });
      sendResponse({ ok: true });
      return false;

    case 'GET_AUTH_STATUS':
      chrome.storage.local
        .get(['accessToken', 'userId'])
        .then(({ accessToken, userId }) =>
          sendResponse({ loggedIn: !!(accessToken && userId), userId })
        );
      return true;

    case 'UPSERT_ASSIGNMENTS':
      upsertAssignments(message.data)
        .then((count) => sendResponse({ ok: true, count }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;

    case 'UPDATE_ASSIGNMENT': {
      const ALLOWED = new Set(['is_completed_manual', 'is_hidden', 'note']);
      if (!ALLOWED.has(message.field)) {
        sendResponse({ ok: false, error: 'Invalid field' });
        return false;
      }
      updateAssignment(message.courseId, message.title, message.field, message.value)
        .then(() => sendResponse({ ok: true }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;
    }

    case 'SCRAPE_STATUS':
      console.info('[KU-LMS+]', message.status, message.detail ?? '');
      // scanning / fetching / uploading → 同期中に遷移
      if (['scanning', 'fetching', 'uploading'].includes(message.status)) {
        saveSyncStatus('syncing', {
          syncDetail:   message.detail || null,
          syncProgress: message.progress || null,
        });
      }
      return false;

    case 'FETCH_DB_STATUSES':
      fetchAssignmentsFromDB()
        .then((data) => sendResponse({ ok: true, data }))
        .catch((err) => sendResponse({ ok: false, error: err.message }));
      return true;

    default:
      return false;
  }
});

// =============================================
// Supabase REST: 個別レコードのステータス更新
// =============================================
async function updateAssignment(courseId, title, field, value) {
  const { userId, accessToken: token } = await chrome.storage.local.get(['userId', 'accessToken']);
  if (!token || !userId) throw new Error('未ログイン');

  // RLS により user_id は自動フィルタ。course_id + title でレコードを特定
  const filter = `course_id=eq.${encodeURIComponent(courseId)}&title=eq.${encodeURIComponent(title)}`;
  const doReq  = (jwt) =>
    fetch(`${REST_URL}/assignments?${filter}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        apikey:         SUPABASE_ANON_KEY,
        Authorization:  `Bearer ${jwt}`,
        Prefer:         'return=minimal',
      },
      body: JSON.stringify({ [field]: value }),
    });

  let res = await doReq(token);
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    res = await doReq(newToken);
  }
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Supabase PATCH error (${res.status}): ${body}`);
  }
}

// =============================================
// Supabase REST: DBから全課題ステータスを取得
// =============================================
async function fetchAssignmentsFromDB() {
  const { userId, accessToken: token } = await chrome.storage.local.get(['userId', 'accessToken']);
  if (!token || !userId) return [];

  const fields = 'course_id,title,course_name,deadline,is_completed_manual,is_hidden,is_submitted_lms,note';
  const doReq = (jwt) =>
    fetch(`${REST_URL}/assignments?select=${fields}&order=deadline.asc.nullslast`, {
      headers: {
        apikey:        SUPABASE_ANON_KEY,
        Authorization: `Bearer ${jwt}`,
      },
    });

  let res = await doReq(token);
  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    res = await doReq(newToken);
  }
  if (!res.ok) return [];
  return res.json();
}

// =============================================
// Supabase Auth: Email / Password ログイン
// =============================================
async function login(email, password) {
  let res;
  try {
    res = await fetch(`${AUTH_URL}/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    const err = new Error('ネットワークエラー。接続を確認してください。');
    err.code = 'NETWORK_ERROR';
    throw err;
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const raw  = body.error_description || body.msg || body.message || '';
    console.error('[KU-LMS+] Login failed', res.status, raw);

    const err = new Error(translateAuthError(res.status, raw));
    err.code  = `HTTP_${res.status}`;
    throw err;
  }

  const data = await res.json();
  await chrome.storage.local.set({
    accessToken:  data.access_token,
    refreshToken: data.refresh_token,
    userId:       data.user?.id,
  });

  return { userId: data.user?.id };
}

function translateAuthError(status, raw) {
  if (status === 429)       return 'ログイン試行回数が多すぎます。しばらく待ってから試してください。';
  if (status === 422)       return 'メールアドレスの形式が正しくありません。';
  const lower = raw.toLowerCase();
  if (lower.includes('invalid login credentials') || lower.includes('invalid password'))
    return 'メールアドレスまたはパスワードが違います。';
  if (lower.includes('email not confirmed'))
    return 'メールアドレスが未確認です。確認メールをチェックしてください。';
  if (lower.includes('user not found'))
    return 'このメールアドレスは登録されていません。';
  return `ログイン失敗 (${status})`;
}

// =============================================
// Supabase Auth: トークンリフレッシュ
// =============================================
async function refreshAccessToken() {
  const { refreshToken } = await chrome.storage.local.get(['refreshToken']);
  if (!refreshToken) {
    throw new Error('セッションが切れています。再ログインしてください。');
  }

  const res = await fetch(`${AUTH_URL}/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    throw new Error('セッション更新に失敗しました。再ログインしてください。');
  }

  const data = await res.json();
  await chrome.storage.local.set({
    accessToken:  data.access_token,
    refreshToken: data.refresh_token,
  });

  return data.access_token;
}

// =============================================
// Supabase REST: UPSERT
// is_completed_manual / is_hidden は payload に含めないため
// ON CONFLICT 時もユーザーの手動操作が上書きされない
// =============================================
async function upsertAssignments(assignments) {
  if (!assignments?.length) return 0;

  // UPSERT前にセッションを確認・更新（スクレイプ中にトークンが切れた場合への保険）
  let token;
  try {
    token = await ensureValidSession();
  } catch (e) {
    await saveSyncStatus('error', { lastSyncError: e.message });
    throw e;
  }

  const { userId } = await chrome.storage.local.get(['userId']);
  if (!userId) {
    const err = 'ログインしていません。ポップアップからログインしてください。';
    await saveSyncStatus('error', { lastSyncError: err });
    throw new Error(err);
  }

  const now  = new Date().toISOString();
  const rows = assignments.map((a) => ({
    user_id:          userId,
    course_id:        a.course_id,
    course_name:      a.course_name ?? null,
    title:            a.title,
    category:         a.category,
    start_time:       a.start_time ?? null,
    deadline:         a.deadline,
    detail_url:       a.detail_url,
    is_submitted_lms: a.is_submitted_lms,
    updated_at:       now,
  }));

  const doRequest = (jwt) =>
    fetch(`${REST_URL}/assignments?on_conflict=user_id,course_id,title`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey:         SUPABASE_ANON_KEY,
        Authorization:  `Bearer ${jwt}`,
        Prefer:         'resolution=merge-duplicates,return=minimal',
      },
      body: JSON.stringify(rows),
    });

  let res;
  try {
    res = await doRequest(token);
  } catch (e) {
    const errMsg = `ネットワークエラー: ${e.message}`;
    console.error('[KU-LMS+] UPSERT fetch threw:', e);
    await saveSyncStatus('error', { lastSyncError: errMsg });
    throw new Error(errMsg);
  }

  if (!res.ok) {
    const body = await res.text();
    const errMsg = `Supabase UPSERT error (${res.status}): ${body}`;
    console.error('[KU-LMS+]', errMsg);
    await saveSyncStatus('error', { lastSyncError: errMsg });
    throw new Error(errMsg);
  }

  const count = rows.length;

  // DBから最新の全課題を取得（タイムアウト付き）
  const dbAssignments = await Promise.race([
    fetchAssignmentsFromDB(),
    new Promise((_, rej) => setTimeout(() => rej(new Error('DB fetch timeout')), 15000)),
  ]).catch((e) => {
    console.warn('[KU-LMS+] fetchAssignmentsFromDB:', e.message);
    return [];
  });
  const nowDate = new Date();

  // 締切が近い順に最大4件を保存（完了・非表示を除外）
  const upcomingDeadlines = dbAssignments
    .filter((r) => r.deadline && new Date(r.deadline) > nowDate && !r.is_completed_manual && !r.is_hidden)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 4)
    .map((r) => ({ title: r.title, deadline: r.deadline, course_name: r.course_name ?? null }));

  const pendingCount = upcomingDeadlines.length;

  // バッジで件数を一時表示
  chrome.action.setBadgeText({ text: `${count}` });
  chrome.action.setBadgeBackgroundColor({ color: '#22c55e' });
  setTimeout(() => chrome.action.setBadgeText({ text: '' }), 3000);

  // ストレージに成功状態を保存
  await saveSyncStatus('success', {
    lastSyncAt:        now,
    lastSyncCount:     count,
    lastSyncError:     null,
    pendingCount,
    upcomingDeadlines,
    syncProgress:      null,
    syncDetail:        null,
  });

  // WebClass タブに同期完了を通知（DB状態をページに反映）
  try {
    const tabs = await chrome.tabs.query({ url: 'https://kulms.tl.kansai-u.ac.jp/*' });
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, { type: 'SYNC_COMPLETE', data: dbAssignments }).catch(() => {});
    }
  } catch { /* tab query can fail in some contexts */ }

  return count;
}
