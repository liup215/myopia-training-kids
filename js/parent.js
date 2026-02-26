/**
 * parent.js - PIN-protected parent progress dashboard
 */

const ParentView = (() => {
  const PIN_KEY = 'myopia_parent_pin';
  const DEFAULT_PIN = '1234';

  let unlocked = false;
  let pinInput = '';

  function getPin() {
    return localStorage.getItem(PIN_KEY) || DEFAULT_PIN;
  }

  function open() {
    const overlay = document.getElementById('parent-overlay');
    if (!overlay) return;
    overlay.classList.remove('hidden');
    document.body.classList.add('parent-open');
    unlocked = false;
    pinInput = '';
    renderPinScreen();
  }

  function close() {
    const overlay = document.getElementById('parent-overlay');
    if (overlay) overlay.classList.add('hidden');
    document.body.classList.remove('parent-open');
    unlocked = false;
    pinInput = '';
  }

  // ---- PIN screen ----

  function renderPinScreen() {
    const content = document.getElementById('parent-content');
    if (!content) return;
    content.innerHTML = `
      <div class="parent-pin-screen">
        <div class="parent-pin-icon">🔒</div>
        <h2 class="parent-pin-title">家长验证</h2>
        <p class="parent-pin-hint">请输入4位数字密码<br>（首次使用默认密码：1234）</p>
        <div class="parent-pin-display" id="parent-pin-display">○ ○ ○ ○</div>
        <div class="parent-numpad">
          ${[1,2,3,4,5,6,7,8,9,'',0,'⌫'].map(k =>
            k === '' ? `<div></div>` :
            `<button class="parent-numpad-btn" onclick="ParentView.numpadPress('${k}')">${k}</button>`
          ).join('')}
        </div>
      </div>
    `;
  }

  function numpadPress(key) {
    if (key === '⌫') {
      pinInput = pinInput.slice(0, -1);
    } else if (pinInput.length < 4) {
      pinInput += key;
    }
    updatePinDisplay();
    if (pinInput.length === 4) {
      checkPin();
    }
  }

  function updatePinDisplay() {
    const display = document.getElementById('parent-pin-display');
    if (!display) return;
    const dots = Array.from({ length: 4 }, (_, i) => i < pinInput.length ? '●' : '○');
    display.textContent = dots.join(' ');
  }

  function checkPin() {
    if (pinInput === getPin()) {
      unlocked = true;
      renderDashboard();
    } else {
      const display = document.getElementById('parent-pin-display');
      if (display) {
        display.textContent = '密码错误！';
        display.style.color = '#DC3545';
      }
      setTimeout(() => {
        pinInput = '';
        if (display) {
          display.style.color = '';
          updatePinDisplay();
        }
      }, 1000);
    }
  }

  // ---- Dashboard ----

  function fmtDuration(seconds) {
    if (!seconds || seconds < 60) return seconds ? `${seconds} 秒` : '';
    return `${Math.round(seconds / 60)} 分钟`;
  }

  function fmtSessionStr(emoji, label, sessionData) {
    if (!sessionData) return `${emoji} ${label} —`;
    const dur = fmtDuration(sessionData.durationSeconds);
    return `${emoji} ${label}已完成${dur ? `（${dur}）` : ''}`;
  }

  function renderDashboard() {
    const content = document.getElementById('parent-content');
    if (!content) return;

    const history = Progress.getHistory(14);
    const todayKey = Progress.getTodayKey();
    const streak = Progress.getStreak();
    const trainedDays = history.filter(d => d.data && d.data.stars > 0).length;
    const todayData = (history[history.length - 1] || {}).data;
    const todayStars = todayData ? (todayData.stars || 0) : 0;

    // 7-day bar chart
    const chartDays = history.slice(-7);
    const maxStars = Math.max(...chartDays.map(d => d.data ? (d.data.stars || 0) : 0), 1);

    const chartBars = chartDays.map(d => {
      const label = d.date === todayKey ? '今天' : d.date.slice(5);
      const stars = d.data ? (d.data.stars || 0) : 0;
      const heightPct = Math.round((stars / maxStars) * 100);
      const hasMorning = d.data && d.data.sessions && d.data.sessions.morning;
      const hasEvening = d.data && d.data.sessions && d.data.sessions.evening;
      return `
        <div class="chart-bar-group ${d.date === todayKey ? 'chart-today' : ''}">
          <div class="chart-bar-value">${stars > 0 ? stars : ''}</div>
          <div class="chart-bar-track">
            <div class="chart-bar-fill" style="height:${heightPct}%"></div>
          </div>
          <div class="chart-bar-label">${label}</div>
          <div class="chart-bar-sessions">
            <span class="${hasMorning ? 'sess-done' : 'sess-miss'}" title="上午">☀</span>
            <span class="${hasEvening ? 'sess-done' : 'sess-miss'}" title="晚上">🌙</span>
          </div>
        </div>
      `;
    }).join('');

    // Recent log entries (newest first)
    const logEntries = history.slice().reverse().map(d => {
      if (!d.data) return '';
      const morning = d.data.sessions && d.data.sessions.morning;
      const evening = d.data.sessions && d.data.sessions.evening;
      const stars = d.data.stars || 0;
      const isToday = d.date === todayKey;

      const morningStr = fmtSessionStr('☀️', '上午', morning);
      const eveningStr = fmtSessionStr('🌙', '晚上', evening);

      return `
        <div class="parent-log-entry">
          <div class="parent-log-date">${isToday ? '📅 今天' : `📅 ${d.date}`}</div>
          <div class="parent-log-sessions">
            <span class="${morning ? 'log-done' : 'log-miss'}">${morningStr}</span>
            <span class="${evening ? 'log-done' : 'log-miss'}">${eveningStr}</span>
          </div>
          <div class="parent-log-stars">⭐ ${stars} 项任务完成</div>
        </div>
      `;
    }).filter(Boolean).join('');

    content.innerHTML = `
      <div class="parent-dashboard">

        <div class="parent-stats-row">
          <div class="parent-stat-card">
            <div class="parent-stat-num">${streak}</div>
            <div class="parent-stat-label">🔥 连续天数</div>
          </div>
          <div class="parent-stat-card">
            <div class="parent-stat-num">${trainedDays}</div>
            <div class="parent-stat-label">📅 训练天数<small>（近14天）</small></div>
          </div>
          <div class="parent-stat-card">
            <div class="parent-stat-num">${todayStars}</div>
            <div class="parent-stat-label">⭐ 今日完成</div>
          </div>
        </div>

        <div class="parent-chart-section">
          <h3 class="parent-section-title">📊 近7天训练情况</h3>
          <div class="parent-chart">${chartBars}</div>
          <div class="parent-chart-legend">
            <span class="legend-item"><span class="sess-done">☀</span> / <span class="sess-done">🌙</span> 已完成</span>
            <span class="legend-item"><span class="sess-miss">☀</span> / <span class="sess-miss">🌙</span> 未完成</span>
          </div>
        </div>

        <div class="parent-log-section">
          <h3 class="parent-section-title">📋 训练记录</h3>
          <div class="parent-logs">
            ${logEntries || '<p class="parent-no-data">暂无训练记录</p>'}
          </div>
        </div>

        <div class="parent-settings-section">
          <h3 class="parent-section-title">⚙️ 设置</h3>
          <button class="parent-action-btn" onclick="ParentView.toggleChangePinForm()">🔑 修改密码</button>
          <div id="parent-change-pin-form" class="hidden parent-change-pin-form">
            <input type="text" id="parent-new-pin" placeholder="输入新4位密码"
              class="parent-pin-text-input" inputmode="numeric" pattern="\d{4}" maxlength="4" />
            <button class="parent-action-btn" onclick="ParentView.saveNewPin()">💾 保存</button>
          </div>
        </div>

      </div>
    `;
  }

  function toggleChangePinForm() {
    const form = document.getElementById('parent-change-pin-form');
    if (form) form.classList.toggle('hidden');
  }

  function saveNewPin() {
    const input = document.getElementById('parent-new-pin');
    if (!input) return;
    const newPin = String(input.value).trim();
    if (!/^\d{4}$/.test(newPin)) {
      alert('请输入4位数字密码！');
      return;
    }
    localStorage.setItem(PIN_KEY, newPin);
    input.value = '';
    const form = document.getElementById('parent-change-pin-form');
    if (form) form.classList.add('hidden');
    alert('密码已修改成功！');
  }

  return { open, close, numpadPress, toggleChangePinForm, saveNewPin };
})();
