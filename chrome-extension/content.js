'use strict';

// PWAのURL（デプロイ先に合わせて変更してください）
// var を使うのは script 二重 injection 時の "already declared" エラーを避けるため
var KU_LMS_PWA_URL = 'https://ku-lms-plus.vercel.app';

// UI拡張はスクレイパーと独立してページごとに1回実行
if (!window.__KU_LMS_UI_INJECTED) {
  window.__KU_LMS_UI_INJECTED = true;
  runUIEnhancements();
}

// スクレイパー二重実行ガード
if (!window.__KU_KMS_INJECTED) {
  window.__KU_KMS_INJECTED = true;
  runScraper().finally(() => {
    window.__KU_KMS_INJECTED = false;
  });
}

// SYNC_COMPLETE メッセージリスナー（二重登録防止）
if (!window.__KU_LMS_MSG_LISTENER) {
  window.__KU_LMS_MSG_LISTENER = true;
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'SYNC_COMPLETE') {
      if (message.data) {
        applyDBStatesToPage(message.data);
      } else {
        applySyncFromDB();
      }
    }
  });
}

// =============================================
// UI拡張
// =============================================
function runUIEnhancements() {
  injectSyncStatusBar();
  if (document.querySelector('section.list-group-item.cl-contentsList_listGroupItem')) {
    injectDeadlineBadges();
    injectActionButtons();
  }
  if (document.querySelector('table#schedule-table')) {
    injectMiniDashboard();
  }
  // DB状態を非同期で反映（UIをブロックしない）
  applySyncFromDB();
}

// 授業ページ: 各課題ブロックに残り時間バッジを挿入
function injectDeadlineBadges() {
  document.querySelectorAll('section.list-group-item.cl-contentsList_listGroupItem').forEach((section) => {
    section.querySelectorAll('.cm-contentsList_contentDetailListItemData').forEach((el) => {
      if (el.querySelector('[data-kulms-badge]')) return; // 挿入済みならスキップ

      const text  = (el.textContent ?? '').trim();
      const dates = [...text.matchAll(/(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/g)]
        .map((m) => `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00+09:00`);
      if (!dates.length) return;

      const now      = new Date();
      const start    = dates.length >= 2 ? new Date(dates[0]) : null;
      const deadline = new Date(dates[dates.length - 1]);
      const diffMs   = deadline - now;
      const diffH    = diffMs / 36e5; // ミリ秒→時間

      let label, bg, color;
      const diffDays = Math.floor(diffMs / (24 * 36e5));
      if (start && start > now) {
        label = '⏳ 開始前';
        bg = '#1d4ed8'; color = '#fff';
      } else if (diffMs < 0) {
        label = '期限切れ';
        bg = '#475569'; color = '#fff';
      } else if (diffH < 24) {
        label = `🔥 あと${Math.ceil(diffH)}時間`;
        bg = '#b91c1c'; color = '#fff';
      } else if (diffH < 72) {
        label = `⚡ あと${diffDays}日`;
        bg = '#c2410c'; color = '#fff';
      } else if (diffH < 7 * 24) {
        label = `あと${diffDays}日`;
        bg = '#a16207'; color = '#fff';
      } else if (diffDays < 30) {
        label = `${Math.min(Math.floor(diffDays / 7), 3)}週間後`;
        bg = '#15803d'; color = '#fff';
      } else {
        label = `${Math.floor(diffDays / 30)}ヶ月後`;
        bg = '#4b5563'; color = '#fff';
      }

      const badge = document.createElement('span');
      badge.setAttribute('data-kulms-badge', '');
      badge.textContent = label;
      badge.style.cssText = [
        `background:${bg}`,
        `color:${color}`,
        'display:inline-block',
        'font-size:11px',
        'font-weight:800',
        'padding:3px 9px',
        'border-radius:999px',
        'margin-left:8px',
        'white-space:nowrap',
        'vertical-align:middle',
        'letter-spacing:0.02em',
        'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif',
      ].join(';');
      el.appendChild(badge);
    });
  });
}

// =============================================
// フローティング同期ステータスバー
// =============================================
function injectSyncStatusBar() {
  if (document.getElementById('kulms-sync-bar')) return;

  // スタイルの注入
  if (!document.getElementById('kulms-sync-styles')) {
    const style = document.createElement('style');
    style.id = 'kulms-sync-styles';
    style.textContent = [
      '@keyframes kulms-blink{0%,100%{opacity:1}50%{opacity:.3}}',
      '#kulms-sync-bar{position:fixed;bottom:20px;right:20px;z-index:99999;',
      'display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:10px;',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;',
      'font-size:12px;font-weight:600;color:#fff;overflow:hidden;',
      'background:rgba(30,41,59,.92);backdrop-filter:blur(8px);',
      'box-shadow:0 4px 16px rgba(0,0,0,.18);',
      'transition:all .4s cubic-bezier(.4,0,.2,1);',
      'transform:translateY(80px);opacity:0;pointer-events:none}',
      '#kulms-sync-bar.kulms-visible{transform:translateY(0);opacity:1;pointer-events:auto}',
      '#kulms-sync-bar.kulms-minimized{padding:6px 10px;font-size:10px;opacity:.6}',
      '#kulms-sync-progress{position:absolute;top:0;left:0;height:100%;background:rgba(59,130,246,.25);transition:width 0.8s linear;width:0;display:none;z-index:0;}',
    ].join('');
    document.head.appendChild(style);
  }

  const bar = document.createElement('div');
  bar.id = 'kulms-sync-bar';

  const dot = document.createElement('span');
  dot.id = 'kulms-sync-dot';
  dot.style.cssText = 'width:8px;height:8px;border-radius:50%;flex-shrink:0;background:#94a3b8;position:relative;z-index:1;';

  const text = document.createElement('span');
  text.id = 'kulms-sync-text';
  text.style.cssText = 'position:relative;z-index:1;';
  text.textContent = '';

  const progress = document.createElement('div');
  progress.id = 'kulms-sync-progress';

  bar.appendChild(dot);
  bar.appendChild(text);
  bar.appendChild(progress);
  document.body.appendChild(bar);

  // 初期状態を読み込み
  chrome.storage.local.get(['syncStatus', 'lastSyncAt', 'lastSyncCount', 'lastSyncError', 'syncProgress', 'syncDetail'])
    .then(updateSyncStatusBar);

  // ストレージ変更の監視
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local') return;
    if ('syncStatus' in changes || 'lastSyncAt' in changes || 'lastSyncError' in changes || 'syncProgress' in changes || 'syncDetail' in changes) {
      chrome.storage.local.get(['syncStatus', 'lastSyncAt', 'lastSyncCount', 'lastSyncError', 'syncProgress', 'syncDetail'])
        .then(updateSyncStatusBar);
    }
  });
}

function updateSyncStatusBar({ syncStatus, lastSyncAt, lastSyncCount, syncProgress, syncDetail }) {
  const bar  = document.getElementById('kulms-sync-bar');
  const dot  = document.getElementById('kulms-sync-dot');
  const text = document.getElementById('kulms-sync-text');
  const prog = document.getElementById('kulms-sync-progress');
  if (!bar || !dot || !text) return;

  const status = syncStatus ?? 'idle';
  bar.classList.remove('kulms-minimized');
  clearTimeout(bar.__hideTimer);
  clearTimeout(bar.__minimizeTimer);

  switch (status) {
    case 'syncing': {
      dot.style.background = '#3b82f6';
      dot.style.animation  = 'kulms-blink .9s ease-in-out infinite';

      let textContent = '同期中…';
      if (syncProgress && syncProgress.total > 0) {
        const pct = Math.round((syncProgress.current / syncProgress.total) * 100);
        textContent = `同期中… ${pct}%`;
        if (prog) {
          prog.style.width = `${pct}%`;
          prog.style.display = 'block';
        }
      } else if (syncDetail) {
        if (prog) prog.style.display = 'none';
      }
      text.textContent = textContent;
      bar.classList.add('kulms-visible');
      break;
    }

    case 'success': {
      dot.style.background = '#22c55e';
      dot.style.animation  = 'none';
      const parts = [];
      if (lastSyncCount != null) parts.push(`${lastSyncCount}件`);
      if (lastSyncAt) {
        parts.push(new Date(lastSyncAt).toLocaleString('ja-JP', {
          hour: '2-digit', minute: '2-digit',
        }));
      }
      text.textContent = `✓ 同期完了${parts.length ? ' · ' + parts.join(' · ') : ''}`;
      if (prog) prog.style.display = 'none';
      bar.classList.add('kulms-visible');
      bar.__minimizeTimer = setTimeout(() => bar.classList.add('kulms-minimized'), 3000);
      bar.__hideTimer     = setTimeout(() => bar.classList.remove('kulms-visible'), 8000);
      break;
    }

    case 'error':
      dot.style.background = '#ef4444';
      dot.style.animation  = 'none';
      text.textContent      = '✕ 同期エラー';
      if (prog) prog.style.display = 'none';
      bar.classList.add('kulms-visible');
      bar.__hideTimer = setTimeout(() => bar.classList.remove('kulms-visible'), 10000);
      break;

    default:
      bar.classList.remove('kulms-visible');
      if (prog) prog.style.display = 'none';
      break;
  }
}

// 授業ページ: 各課題ブロックに「完了」「非表示」ボタンを挿入し Supabase を更新
function injectActionButtons() {
  const courseId = extractCourseId(window.location.href);
  if (!courseId) return;

  document.querySelectorAll('section.list-group-item.cl-contentsList_listGroupItem').forEach((section) => {
    if (section.querySelector('[data-kulms-actions]')) return;

    const rawTitle = section.querySelector('.cm-contentsList_contentName')?.textContent ?? '';
    const title    = rawTitle.replace(/\bNew\b/g, '').replace(/\s+/g, ' ').trim();
    if (!title) return;

    const bar = document.createElement('div');
    bar.setAttribute('data-kulms-actions', '');
    bar.style.cssText = 'display:flex;align-items:center;gap:6px;padding:5px 8px 7px;border-top:1px solid rgba(0,0,0,.06);';

    const completeBtn = makeLmsBtn('✓ 完了', '#16a34a', '#fff');
    const skipBtn     = makeLmsBtn('スキップ', '#64748b', '#fff');

    async function applyAction(field, btn, other) {
      btn.disabled   = true;
      other.disabled = true;
      const prev     = btn.textContent;
      btn.textContent = '更新中…';

      const res = await chrome.runtime.sendMessage({
        type: 'UPDATE_ASSIGNMENT', courseId, title, field, value: true,
      });

      if (res?.ok) {
        if (field === 'is_completed_manual') {
          section.style.opacity = '0.45';
          completeBtn.textContent = '✓ 完了済み';
          completeBtn.style.cssText = [
            'background:#dcfce7', 'color:#15803d', 'border:1px solid #86efac',
            'border-radius:6px', 'padding:3px 10px', 'font-size:11px',
            'font-weight:600', 'cursor:default',
            'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
          ].join(';');
          skipBtn.style.display = 'none';
        } else {
          section.style.opacity      = '0.2';
          section.style.pointerEvents = 'none';
        }
      } else {
        btn.textContent = prev;
        btn.disabled    = false;
        other.disabled  = false;
      }
    }

    completeBtn.addEventListener('click', () => applyAction('is_completed_manual', completeBtn, skipBtn));
    skipBtn.addEventListener('click',     () => applyAction('is_hidden',            skipBtn,     completeBtn));

    bar.appendChild(completeBtn);
    bar.appendChild(skipBtn);

    // メモ入力欄
    const noteInput = document.createElement('input');
    noteInput.setAttribute('data-kulms-note', '');
    noteInput.type = 'text';
    noteInput.placeholder = 'メモ…';
    noteInput.style.cssText = [
      'flex:1', 'border:none', 'border-radius:6px', 'padding:3px 8px',
      'font-size:11px', 'color:#374151', 'background:#f9fafb',
      'outline:1px solid #e5e7eb',
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    ].join(';');
    noteInput.addEventListener('blur', () => {
      const val = noteInput.value.trim() || null;
      chrome.runtime.sendMessage({
        type: 'UPDATE_ASSIGNMENT', courseId, title, field: 'note', value: val,
      });
    });

    const noteRow = document.createElement('div');
    noteRow.style.cssText = 'display:flex;padding:0 6px 6px;';
    noteRow.appendChild(noteInput);
    bar.appendChild(noteRow);

    (section.querySelector('.cl-contentsList_content') ?? section).appendChild(bar);
  });
}

function makeLmsBtn(label, bg, color) {
  const btn = document.createElement('button');
  btn.textContent = label;
  btn.style.cssText = [
    `background:${bg}`, `color:${color}`,
    'border:none', 'border-radius:6px', 'padding:3px 10px',
    'font-size:11px', 'font-weight:600', 'cursor:pointer', 'transition:opacity .15s',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
  ].join(';');
  btn.addEventListener('mouseover', () => { if (!btn.disabled) btn.style.opacity = '.8'; });
  btn.addEventListener('mouseout',  () => { btn.style.opacity = '1'; });
  return btn;
}

// ミニダッシュボード用バッジ属性を返すヘルパー（青グラデ背景向けに明るめの色）
function getMiniDashboardBadge(diffH) {
  const diffDays = Math.floor(diffH / 24);
  if (diffH < 24) {
    return { text: `🔥 ${Math.ceil(diffH)}時間`, bg: '#ef4444', color: '#fff' };
  } else if (diffH < 72) {
    return { text: `⚡ ${diffDays}日`, bg: '#f97316', color: '#fff' };
  } else if (diffH < 7 * 24) {
    return { text: `${diffDays}日`, bg: '#eab308', color: '#1a1a1a' };
  } else if (diffDays < 30) {
    const weeks = Math.min(Math.floor(diffDays / 7), 3);
    return { text: `${weeks}週間後`, bg: 'rgba(255,255,255,0.25)', color: '#fff' };
  } else {
    const months = Math.floor(diffDays / 30);
    return { text: `${months}ヶ月後`, bg: 'rgba(255,255,255,0.15)', color: 'rgba(255,255,255,0.8)' };
  }
}

// トップページ: KU-LMS+ ミニダッシュボードをサイドバー最上部に挿入
async function injectMiniDashboard() {
  if (document.getElementById('kulms-mini-dashboard')) return;

  const sidebar =
    document.querySelector('.col-sm-3 .side-block-outer') ??
    document.querySelector('.col-sm-3') ??
    document.querySelector('.col-md-3');
  if (!sidebar) return;

  const { lastSyncAt, upcomingDeadlines } =
    await chrome.storage.local.get(['lastSyncAt', 'upcomingDeadlines']);

  const syncTime = lastSyncAt
    ? new Date(lastSyncAt).toLocaleString('ja-JP', {
        month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '未同期';

  const panel = document.createElement('div');
  panel.id = 'kulms-mini-dashboard';
  panel.style.cssText = [
    'background:linear-gradient(135deg,#004a8f,#0066cc)',
    'color:#fff',
    'border-radius:10px',
    'padding:14px 16px',
    'margin-bottom:12px',
    'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    'box-shadow:0 4px 12px rgba(0,74,143,.3)',
  ].join(';');

  // HTMLエスケープ（course_name / title は WebClass 由来のテキスト）
  function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  const now = new Date();
  let itemsHtml;

  if (upcomingDeadlines && upcomingDeadlines.length > 0) {
    itemsHtml = upcomingDeadlines.map((item, i) => {
      const dl     = new Date(item.deadline);
      const diffH  = (dl - now) / 36e5;
      const isLast = i === upcomingDeadlines.length - 1;
      const badge  = getMiniDashboardBadge(diffH);

      const titleShort = item.title.length > 22 ? item.title.slice(0, 22) + '…' : item.title;
      const coursePart = item.course_name
        ? `<div style="font-size:9px;opacity:.6;margin-bottom:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(item.course_name)}</div>`
        : '';

      return [
        `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;`,
        `padding:5px 0;${isLast ? '' : 'border-bottom:1px solid rgba(255,255,255,.12);'}">`,
        `<div style="flex:1;min-width:0;">`,
        coursePart,
        `<div style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(titleShort)}</div>`,
        `</div>`,
        `<span style="flex-shrink:0;font-size:10px;font-weight:800;padding:2px 7px;border-radius:99px;letter-spacing:0.02em;`,
        `background:${badge.bg};color:${badge.color};">${badge.text}</span>`,
        `</div>`,
      ].join('');
    }).join('');
  } else {
    itemsHtml = '<div style="font-size:12px;opacity:.6;padding:6px 0 8px;">締切が近い課題はありません</div>';
  }

  panel.innerHTML = [
    '<div style="font-size:11px;font-weight:700;letter-spacing:.06em;opacity:.7;margin-bottom:8px;">📋 KU-LMS+ 締切が近い課題</div>',
    '<div id="kulms-dashboard-content">',
    itemsHtml,
    `<div style="font-size:10px;opacity:.5;margin-top:8px;margin-bottom:10px;">最終同期: ${syncTime}</div>`,
    '</div>',
    `<a href="${KU_LMS_PWA_URL}" target="_blank" rel="noopener" `,
    'style="display:block;text-align:center;background:#fff;color:#004a8f;',
    'font-weight:700;font-size:13px;padding:9px;border-radius:7px;text-decoration:none;" ',
    'onmouseover="this.style.background=\'#f0f9ff\'" onmouseout="this.style.background=\'#fff\'">',
    'PWA で課題を確認する →</a>',
  ].join('');

  sidebar.insertBefore(panel, sidebar.firstChild);
}

// =============================================
// メインスクレイプ処理
// =============================================
async function runScraper() {
  // Case 1: トップページ — バッチスクレイプ（AbortController付き）
  const scheduleTable = document.querySelector('table#schedule-table');
  if (scheduleTable) {
    await runBatchScrape(scheduleTable);
    return;
  }

  // Case 2: コースページ — ライブDOMから直接スクレイプ（fetchなし）
  if (window.location.href.includes('/course.php/') &&
      document.querySelector('section.list-group-item.cl-contentsList_listGroupItem')) {
    await scrapeCurrentCoursePage();
  }
}

// =============================================
// コースページ: ライブDOMスクレイプ（HTTPリクエストなし）
// =============================================
async function scrapeCurrentCoursePage() {
  const url = window.location.href;
  const courseId = extractCourseId(url);
  if (!courseId) return;

  sendStatus('scanning');

  const courseName = extractCourseNameFromPage();
  const assignments = parseCoursePageDOM(document, url, courseId, courseName);

  if (!assignments.length) return;

  sendStatus('uploading', `${assignments.length} 件を同期`);
  chrome.runtime.sendMessage({ type: 'UPSERT_ASSIGNMENTS', data: assignments });
}

// コースページからコース名をベストエフォートで取得
function extractCourseNameFromPage() {
  // パンくずリストから取得を試行
  const crumbs = document.querySelectorAll('.breadcrumb li, .breadcrumb a, [aria-label="breadcrumb"] a');
  for (const el of crumbs) {
    const text = el.textContent?.trim();
    if (text && text.length > 2 && !/(\u30db\u30fc\u30e0|\u30de\u30a4\u30da\u30fc\u30b8|Home|Top)/i.test(text)) {
      return text;
    }
  }
  // document.title から取得（"コース名 - WebClass" 等の形式）
  const title = document.title ?? '';
  const cleaned = title.replace(/\s*[-\u2013\u2014|]\s*(WebClass|KULMS).*$/i, '').trim();
  if (cleaned && cleaned.length > 2) return cleaned;
  return null;
}

// =============================================
// トップページ: バッチスクレイプ（中断可能）
// =============================================
async function runBatchScrape(scheduleTable) {
  const controller = new AbortController();
  const { signal } = controller;

  // ページ離脱・タブ非表示・リンククリックで即中断
  const abort = () => { if (!signal.aborted) controller.abort(); };
  window.addEventListener('beforeunload', abort);
  const onVisibility = () => { if (document.visibilityState === 'hidden') abort(); };
  document.addEventListener('visibilitychange', onVisibility);
  const onLinkClick = (e) => { if (e.target.closest('a[href]')) abort(); };
  document.addEventListener('click', onLinkClick, { capture: true });

  sendStatus('scanning');

  // Step 1: すべての授業リンクを抽出
  const courseLinks = Array.from(scheduleTable.querySelectorAll('a[href*="/webclass/course.php/"]'))
    .map((a) => ({
      url:        a.href,
      courseName: extractCourseName(a.textContent ?? ''),
    }));

  for (const listId of ['courses_list_left', 'courses_list_right']) {
    const container = document.getElementById(listId);
    if (!container) continue;
    for (const anchor of container.querySelectorAll('.course-title a[href*="/webclass/course.php/"]')) {
      courseLinks.push({
        url:        anchor.href,
        courseName: extractCourseName(anchor.textContent ?? ''),
      });
    }
  }

  const seen = new Set();
  const uniqueLinks = courseLinks.filter(({ url }) => {
    if (seen.has(url)) return false;
    seen.add(url);
    return true;
  });

  if (!uniqueLinks.length) {
    sendStatus('no_courses_found');
    return;
  }

  sendStatus('fetching', `0/${uniqueLinks.length} 授業を取得中`, { current: 0, total: uniqueLinks.length + 1 });

  const assignments = [];

  for (let i = 0; i < uniqueLinks.length; i++) {
    const { url: courseUrl, courseName } = uniqueLinks[i];
    if (signal.aborted) break;

    const courseId = extractCourseId(courseUrl);

    try {
      const html = await fetchFollowingJsRedirect(courseUrl, signal);
      if (!html) continue;
      const doc = new DOMParser().parseFromString(html, 'text/html');
      const parsed = parseCoursePageDOM(doc, courseUrl, courseId, courseName);
      assignments.push(...parsed);
    } catch (e) {
      if (e.name === 'AbortError') break;
      console.warn('[KU-LMS+] fetch 失敗:', courseUrl, e.message);
    }

    if (!signal.aborted) {
      sendStatus('fetching', `${i + 1}/${uniqueLinks.length} 授業を取得中`, { current: i + 1, total: uniqueLinks.length + 1 });
    }

    if (signal.aborted) break;
    await new Promise((r) => setTimeout(r, 500));
  }

  // クリーンアップ
  window.removeEventListener('beforeunload', abort);
  document.removeEventListener('visibilitychange', onVisibility);
  document.removeEventListener('click', onLinkClick, { capture: true });

  // 中断されても取得済みデータは部分upsert
  if (assignments.length) {
    const label = signal.aborted
      ? `${assignments.length} 件を部分同期`
      : `${assignments.length} 件を Supabase に送信`;
    sendStatus('uploading', label, { current: uniqueLinks.length + 0.9, total: uniqueLinks.length + 1 });
    chrome.runtime.sendMessage({ type: 'UPSERT_ASSIGNMENTS', data: assignments });
  } else if (!signal.aborted) {
    sendStatus('no_assignments_found');
  }
}

// =============================================
// JS リダイレクトを透過的に追跡する fetch
// WebClass は認証確認後に window.location.href = "..." でリダイレクトする
// =============================================
async function fetchFollowingJsRedirect(url, signal) {
  const res = await fetch(url, { credentials: 'include', signal });
  if (!res.ok) {
    console.warn('[KU-LMS+] HTTP', res.status, url);
    return null;
  }
  const html = await res.text();

  // window.location.href = "/path" または window.location.href = "https://..." を検出
  const m = html.match(/window\.location\.href\s*=\s*["']([^"']+)["']/);
  if (!m) return html;

  const redirectUrl = new URL(m[1], url).href;
  console.info('[KU-LMS+] JS redirect:', url, '→', redirectUrl);

  const res2 = await fetch(redirectUrl, { credentials: 'include', signal });
  if (!res2.ok) {
    console.warn('[KU-LMS+] リダイレクト先 HTTP', res2.status, redirectUrl);
    return null;
  }
  return res2.text();
}

// =============================================
// 授業ページの DOM 解析
// =============================================
function parseCoursePageDOM(doc, baseUrl, courseId, courseName) {
  const results = [];

  doc.querySelectorAll('section.list-group-item.cl-contentsList_listGroupItem').forEach((section) => {
    // 課題名 — "New" バッジ div のテキストを除去
    const rawTitle =
      section.querySelector('.cm-contentsList_contentName')?.textContent ?? '';
    const title = rawTitle.replace(/\bNew\b/g, '').replace(/\s+/g, ' ').trim();
    if (!title) return;

    const category =
      section.querySelector('.cl-contentsList_categoryLabel')?.textContent?.trim() ?? '';

    // do_contents.php タイトルリンク（安定、トークンなし）を優先
    // なければ詳細リンクから acs_ を除去して使用
    const titleAnchor  = section.querySelector('.cm-contentsList_contentName a[href*="do_contents"]');
    const detailAnchor = section.querySelector('.cl-contentsList_contentDetailListItemData a[href*="/contents/"]');
    const preferredHref = (titleAnchor ?? detailAnchor)?.getAttribute('href') ?? '';
    let detailUrl = '';
    if (preferredHref) {
      try {
        const u = new URL(preferredHref, baseUrl);
        u.searchParams.delete('acs_');
        detailUrl = u.href;
      } catch { detailUrl = preferredHref; }
    }

    // 受付期間と締切が別々の要素に入るケースに対応するため全要素テキストを結合
    const allDetailText = Array.from(
      section.querySelectorAll('.cm-contentsList_contentDetailListItemData')
    ).map((el) => (el.textContent ?? '').trim()).filter(Boolean).join(' ');
    const { start_time, deadline } = parseDateRange(allDetailText);

    const isSubmittedLms = !!section.querySelector('a[href*="/history"]');

    results.push({
      course_id:        courseId,
      course_name:      courseName || null,
      title,
      category,
      start_time,
      deadline,
      detail_url:       detailUrl,
      is_submitted_lms: isSubmittedLms,
    });
  });

  return results;
}

// =============================================
// DB→ページ同期
// =============================================
async function applySyncFromDB() {
  try {
    const res = await chrome.runtime.sendMessage({ type: 'FETCH_DB_STATUSES' });
    if (!res?.ok || !res.data) return;
    applyDBStatesToPage(res.data);
  } catch (e) {
    console.warn('[KU-LMS+] DB同期取得エラー:', e.message);
  }
}

function applyDBStatesToPage(assignments) {
  if (!assignments?.length) return;

  const courseId = extractCourseId(window.location.href);

  // ルックアップマップ: "course_id\ttitle" → record
  const dbMap = new Map();
  for (const a of assignments) {
    dbMap.set(`${a.course_id}\t${a.title}`, a);
  }

  // 授業ページ: 各セクションにDBステータスを反映
  document.querySelectorAll('section.list-group-item.cl-contentsList_listGroupItem').forEach((section) => {
    const rawTitle = section.querySelector('.cm-contentsList_contentName')?.textContent ?? '';
    const title = rawTitle.replace(/\bNew\b/g, '').replace(/\s+/g, ' ').trim();
    if (!title) return;

    const dbRecord = dbMap.get(`${courseId}\t${title}`);
    if (!dbRecord) return;

    // is_hidden → opacity: 0.2 + 操作不可 (Plan B)
    if (dbRecord.is_hidden) {
      section.style.opacity = '0.2';
      section.style.pointerEvents = 'none';
      const bar = section.querySelector('[data-kulms-actions]');
      if (bar) bar.style.display = 'none';
      return;
    }

    // is_completed_manual → opacity: 0.45 + ボタン更新
    if (dbRecord.is_completed_manual) {
      section.style.opacity = '0.45';
      const bar = section.querySelector('[data-kulms-actions]');
      if (bar) {
        const btns = bar.querySelectorAll('button');
        const completeBtn = btns[0];
        const skipBtn     = btns[1];
        if (completeBtn) {
          completeBtn.textContent = '✓ 完了済み';
          completeBtn.disabled = true;
          completeBtn.style.cssText = [
            'background:#dcfce7', 'color:#15803d', 'border:1px solid #86efac',
            'border-radius:6px', 'padding:3px 10px', 'font-size:11px',
            'font-weight:600', 'cursor:default',
            'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
          ].join(';');
        }
        if (skipBtn) skipBtn.style.display = 'none';
      }
    }

    // note → メモ入力欄に値を反映
    const noteInput = section.querySelector('[data-kulms-note]');
    if (noteInput && dbRecord.note) {
      noteInput.value = dbRecord.note;
    }
  });

  // トップページ: ミニダッシュボード更新
  updateMiniDashboardContent(assignments);
}

async function updateMiniDashboardContent(assignments) {
  const container = document.getElementById('kulms-dashboard-content');
  if (!container) return;

  function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  const now = new Date();
  const upcoming = assignments
    .filter((a) => a.deadline && new Date(a.deadline) > now && !a.is_completed_manual && !a.is_hidden)
    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
    .slice(0, 4);

  let itemsHtml;
  if (upcoming.length > 0) {
    itemsHtml = upcoming.map((item, i) => {
      const dl = new Date(item.deadline);
      const diffH = (dl - now) / 36e5;
      const isLast = i === upcoming.length - 1;
      const badge = getMiniDashboardBadge(diffH);

      const titleShort = item.title.length > 22 ? item.title.slice(0, 22) + '…' : item.title;
      const coursePart = item.course_name
        ? `<div style="font-size:9px;opacity:.6;margin-bottom:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(item.course_name)}</div>`
        : '';

      return [
        `<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;`,
        `padding:5px 0;${isLast ? '' : 'border-bottom:1px solid rgba(255,255,255,.12);'}">`,
        `<div style="flex:1;min-width:0;">`,
        coursePart,
        `<div style="font-size:12px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(titleShort)}</div>`,
        `</div>`,
        `<span style="flex-shrink:0;font-size:10px;font-weight:800;padding:2px 7px;border-radius:99px;letter-spacing:0.02em;`,
        `background:${badge.bg};color:${badge.color};">${badge.text}</span>`,
        `</div>`,
      ].join('');
    }).join('');
  } else {
    itemsHtml = '<div style="font-size:12px;opacity:.6;padding:6px 0 8px;">締切が近い課題はありません</div>';
  }

  const { lastSyncAt } = await chrome.storage.local.get(['lastSyncAt']);
  const syncTime = lastSyncAt
    ? new Date(lastSyncAt).toLocaleString('ja-JP', {
        month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : '未同期';

  container.innerHTML = [
    itemsHtml,
    `<div style="font-size:10px;opacity:.5;margin-top:8px;">最終同期: ${syncTime}</div>`,
  ].join('');
}

// =============================================
// ユーティリティ
// NOTE: 以下の関数は public/bookmarklet.js にも複製されています。
//       WebClass の仕様変更時は両ファイルを同期してください。
// =============================================

// 授業名を時間割リンクのテキストから抽出
// "» 専攻横断型講義（仕事、働くことのいま） (2026-春学期-水曜日-2限-50738)"
// → "専攻横断型講義（仕事、働くことのいま）"
function extractCourseName(rawText) {
  // 先頭の "»", "＞", ">" および空白を除去
  const text = rawText.replace(/^[»＞>\s]+/, '').trim();
  // 最初の半角 " (" より前を授業名とする（後ろは学期・曜日・時限情報）
  const idx = text.indexOf(' (');
  return idx > 0 ? text.slice(0, idx).trim() : text;
}

// course_id を URL から抽出
// 例: /webclass/course.php/26150738/login → "26150738"
function extractCourseId(url) {
  // クエリパラメータに course_id がある場合
  const qm = url.match(/[?&]course_id=([^&]+)/);
  if (qm) return decodeURIComponent(qm[1]);
  // パスに数値IDが含まれる場合（/course.php/26150738/...）
  const pm = url.match(/\/course\.php\/(\d+)\//);
  if (pm) return pm[1];
  try {
    return new URL(url).pathname.split('/').filter(Boolean).pop() ?? url;
  } catch {
    return url;
  }
}

function parseDateRange(text) {
  // テキスト内の "YYYY/MM/DD HH:MM" をすべて抽出（セパレータ依存なし）
  // 2件以上: 最初 = start_time, 最後 = deadline
  // 1件: deadline のみ
  const dates = [...text.matchAll(/(\d{4})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})/g)]
    .map((m) => `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:00+09:00`);
  if (dates.length >= 2) return { start_time: dates[0], deadline: dates[dates.length - 1] };
  if (dates.length === 1) return { start_time: null, deadline: dates[0] };
  return { start_time: null, deadline: null };
}

function sendStatus(status, detail, progress) {
  chrome.runtime.sendMessage({ type: 'SCRAPE_STATUS', status, detail, progress });
}
