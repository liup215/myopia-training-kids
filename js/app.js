/**
 * app.js - Main application logic
 */

const App = (() => {
  let tasksData = null;
  let totalTasks = 0;

  async function init() {
    updateDateDisplay();
    showLoading(true);
    try {
      const resp = await fetch('data/tasks.json');
      tasksData = await resp.json();
      renderTasks(tasksData);
      updateProgressBar();
    } catch (e) {
      console.error('Failed to load tasks:', e);
      document.getElementById('app-content').innerHTML =
        `<div class="error-msg">⚠️ 任务加载失败，请刷新页面重试。<br><small>${e.message}</small></div>`;
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

  function renderTasks(data) {
    const content = document.getElementById('app-content');
    content.innerHTML = '';
    totalTasks = 0;

    ['morning', 'evening'].forEach(period => {
      const periodData = data[period];
      if (!periodData) return;

      const section = document.createElement('section');
      section.className = `period-section period-${period}`;
      section.innerHTML = `<h2 class="period-title">${periodData.label}</h2>`;

      periodData.tasks.forEach(task => {
        totalTasks++;
        const taskEl = createTaskElement(task, data.articles);
        section.appendChild(taskEl);
      });

      content.appendChild(section);
    });

    updateStarsDisplay();
  }

  function createTaskElement(task, articles) {
    const wrapper = document.createElement('div');
    wrapper.className = 'task-wrapper';
    wrapper.id = `task-wrapper-${task.id}`;

    const isCompleted = Progress.isCompleted(task.id);

    const header = document.createElement('div');
    header.className = `task-header ${isCompleted ? 'task-completed' : ''}`;
    header.innerHTML = `
      <span class="task-icon">${task.icon}</span>
      <span class="task-name">${task.title}</span>
      ${isCompleted ? '<span class="task-done-badge">✅ 完成</span>' : '<span class="task-pending-badge">待完成</span>'}
    `;
    header.addEventListener('click', () => toggleTask(task.id));

    const body = document.createElement('div');
    body.className = `task-body ${isCompleted ? '' : 'hidden'}`;
    body.id = `task-body-${task.id}`;

    // Render task content based on type
    switch (task.type) {
      case 'math':
        MathModule.renderMathTask(task, body);
        break;
      case 'english':
        EnglishModule.renderEnglishTask(task, body, articles[task.articleId]);
        break;
      case 'chinese':
        ChineseModule.renderChineseTask(task, body, articles[task.articleId]);
        break;
      case 'outdoor':
        renderOutdoorTask(task, body);
        break;
      default:
        body.innerHTML = `<p>未知任务类型</p>`;
    }

    wrapper.appendChild(header);
    wrapper.appendChild(body);
    return wrapper;
  }

  function renderOutdoorTask(task, container) {
    container.innerHTML = `
      <div class="outdoor-task">
        <h3 class="task-section-title">🌳 ${task.title}</h3>
        <p class="task-desc">${task.description}</p>
        <div class="outdoor-timer-area">
          <div class="timer-display" id="timer-display-${task.id}">
            <span class="timer-mins">20</span>:<span class="timer-secs">00</span>
          </div>
          <div class="timer-buttons">
            <button class="btn-start" id="btn-start-${task.id}"
              onclick="App.startTimer('${task.id}', ${task.durationMinutes})">
              ▶ 开始计时
            </button>
          </div>
          <p class="outdoor-tip">💡 小提示：看远处的树木、楼房，让眼睛好好休息！</p>
        </div>
        <div class="reading-result hidden" id="outdoor-result-${task.id}"></div>
      </div>`;
  }

  const timerIntervals = {};

  function startTimer(taskId, minutes) {
    const btn = document.getElementById(`btn-start-${taskId}`);
    const display = document.getElementById(`timer-display-${taskId}`);
    if (!display || timerIntervals[taskId]) return;

    btn.disabled = true;
    btn.textContent = '计时中...';

    let remaining = minutes * 60;
    updateTimerDisplay(display, remaining);

    timerIntervals[taskId] = setInterval(() => {
      remaining--;
      updateTimerDisplay(display, remaining);
      if (remaining <= 0) {
        clearInterval(timerIntervals[taskId]);
        delete timerIntervals[taskId];
        const result = document.getElementById(`outdoor-result-${taskId}`);
        if (result) {
          result.classList.remove('hidden');
          result.innerHTML = `<div class="result-success">🎉 太棒了！户外训练完成！你的眼睛感谢你！⭐</div>`;
        }
        completeTask(taskId);
      }
    }, 1000);
  }

  function updateTimerDisplay(el, seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    el.innerHTML = `<span class="timer-mins">${String(m).padStart(2, '0')}</span>:<span class="timer-secs">${String(s).padStart(2, '0')}</span>`;
  }

  function toggleTask(taskId) {
    const body = document.getElementById(`task-body-${taskId}`);
    if (body) body.classList.toggle('hidden');
  }

  function completeTask(taskId) {
    Progress.markCompleted(taskId);
    const header = document.querySelector(`#task-wrapper-${taskId} .task-header`);
    if (header) {
      header.classList.add('task-completed');
      const badge = header.querySelector('.task-pending-badge');
      if (badge) {
        badge.className = 'task-done-badge';
        badge.textContent = '✅ 完成';
      }
    }
    updateProgressBar();
    updateStarsDisplay();
    checkAllDone();
  }

  function updateProgressBar() {
    const completed = Progress.getTodayCompletedCount();
    const pct = totalTasks > 0 ? Math.round((completed / totalTasks) * 100) : 0;

    const bar = document.getElementById('progress-bar-fill');
    const label = document.getElementById('progress-label');
    if (bar) bar.style.width = `${pct}%`;
    if (label) label.textContent = `今日进度: ${completed}/${totalTasks} (${pct}%)`;
  }

  function updateStarsDisplay() {
    const stars = Progress.getTodayStars();
    const streak = Progress.getStreak();
    const el = document.getElementById('stars-display');
    if (!el) return;
    const starStr = '⭐'.repeat(Math.min(stars, 10));
    el.innerHTML = `${starStr || '暂无星星'} <span class="streak-badge">🔥 连续 ${streak} 天</span>`;
  }

  function checkAllDone() {
    const completed = Progress.getTodayCompletedCount();
    if (completed >= totalTasks && totalTasks > 0) {
      const banner = document.getElementById('all-done-banner');
      if (banner) banner.classList.remove('hidden');
    }
  }

  return { init, completeTask, startTimer };
})();

document.addEventListener('DOMContentLoaded', App.init);
