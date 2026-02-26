/**
 * app.js - Main application logic
 */

const App = (() => {
  let tasksData = null;
  let sessionStartTime = null;
  let currentSessionPeriod = null;
  const SESSION_KEY = 'myopia_sessions';

  // ---- Date helper ----

  function getTodayKey() {
    return Progress.getTodayKey();
  }

  // ---- Session state (localStorage) ----

  function loadSessions() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function isSessionDone(period) {
    const all = loadSessions();
    const today = getTodayKey();
    return !!(all[today] && all[today][period]);
  }

  function markSessionDone(period) {
    const all = loadSessions();
    const today = getTodayKey();
    if (!all[today]) all[today] = {};
    all[today][period] = true;
    if (sessionStartTime) {
      if (currentSessionPeriod === period) {
        const durationSeconds = Math.round((Date.now() - sessionStartTime) / 1000);
        Progress.recordSessionDuration(period, durationSeconds);
      }
      sessionStartTime = null;
      currentSessionPeriod = null;
    }
    try {
      localStorage.setItem(SESSION_KEY, JSON.stringify(all));
    } catch (e) {
      console.warn('Could not save session state:', e);
    }
    updateSessionButtons();
  }

  // ---- Init ----

  async function init() {
    updateDateDisplay();
    showLoading(true);
    try {
      const resp = await fetch('data/tasks.json');
      tasksData = await resp.json();
      updateSessionButtons();
      document.getElementById('session-buttons').classList.remove('hidden');
    } catch (e) {
      console.error('Failed to load tasks:', e);
      document.getElementById('session-buttons').innerHTML =
        `<div class="error-msg">⚠️ 任务加载失败，请刷新页面重试。<br><small>${e.message}</small></div>`;
      document.getElementById('session-buttons').classList.remove('hidden');
    } finally {
      showLoading(false);
    }
  }

  function updateDateDisplay() {
    const el = document.getElementById('date-display');
    if (!el) return;
    const d = new Date();
    const days = ['日', '一', '二', '三', '四', '五', '六'];
    el.textContent = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日 星期${days[d.getDay()]}`;
  }

  function showLoading(show) {
    const el = document.getElementById('loading');
    if (el) el.classList.toggle('hidden', !show);
  }

  function updateSessionButtons() {
    ['morning', 'evening'].forEach(period => {
      const btn = document.getElementById(`btn-${period}`);
      const status = document.getElementById(`${period}-status`);
      if (!btn) return;
      const done = isSessionDone(period);
      btn.disabled = done;
      if (done) {
        btn.classList.add('btn-session-done');
        if (status) status.textContent = '✅ 今日已完成';
      } else {
        btn.classList.remove('btn-session-done');
        if (status) status.textContent = '';
      }
    });
  }

  // ---- Start a session ----

  function startSession(period) {
    if (!tasksData || isSessionDone(period)) return;
    sessionStartTime = Date.now();
    currentSessionPeriod = period;
    QuizModule.init(tasksData, period);
    QuizModule.open();
  }

  // ---- Task completion (called by quiz.js) ----

  function completeTask(taskId) {
    Progress.markCompleted(taskId);
  }

  return { init, completeTask, startSession, markSessionDone };
})();

document.addEventListener('DOMContentLoaded', App.init);
