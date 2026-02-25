/**
 * quiz.js - Full-screen card-based quiz interface
 * Shows one question per full-screen card; auto-advances on correct answer.
 */

const QuizModule = (() => {
  let slides = [];
  let currentIndex = 0;
  let mathTaskCorrect = {};   // taskId -> # problems answered correctly this session
  let slideRetries = {};      // slideIndex -> # wrong attempts
  let timerIntervals = {};    // taskId -> intervalId

  // ---- Build flat slides array from tasks data ----

  function buildSlides(data) {
    const result = [];
    ['morning', 'evening'].forEach(period => {
      const periodData = data[period];
      if (!periodData) return;
      periodData.tasks.forEach(task => {
        if (task.type === 'math') {
          const problems = MathModule.generateProblems(task.config);
          task._quizProblems = problems;
          problems.forEach((prob, idx) => {
            result.push({ slideType: 'math', task, prob, probIdx: idx, totalProbs: problems.length });
          });
        } else if (task.type === 'english') {
          const article = data.articles[task.articleId];
          result.push({ slideType: 'english', task, article });
        } else if (task.type === 'chinese') {
          const article = data.articles[task.articleId];
          result.push({ slideType: 'chinese', task, article });
        } else if (task.type === 'outdoor') {
          result.push({ slideType: 'outdoor', task });
        }
      });
    });
    return result;
  }

  // ---- Public API ----

  function init(data) {
    slides = buildSlides(data);
    currentIndex = 0;
    mathTaskCorrect = {};
    slideRetries = {};
    timerIntervals = {};
  }

  function open() {
    const overlay = document.getElementById('quiz-overlay');
    if (overlay) overlay.classList.remove('hidden');
    document.body.classList.add('quiz-open');
    showSlide(0);
  }

  function close() {
    // Stop any running timers
    Object.keys(timerIntervals).forEach(id => {
      clearInterval(timerIntervals[id]);
      delete timerIntervals[id];
    });
    const overlay = document.getElementById('quiz-overlay');
    if (overlay) overlay.classList.add('hidden');
    document.body.classList.remove('quiz-open');
  }

  // ---- Slide rendering ----

  function showSlide(idx) {
    currentIndex = idx;
    const slide = slides[idx];

    // Update header progress
    const progressText = document.getElementById('quiz-progress-text');
    const progressFill = document.getElementById('quiz-progress-fill');
    if (progressText) {
      progressText.textContent = slide
        ? `第 ${idx + 1} 题 / 共 ${slides.length} 题`
        : `全部完成！🎉`;
    }
    if (progressFill) {
      progressFill.style.width = slide
        ? `${Math.round((idx / slides.length) * 100)}%`
        : '100%';
    }

    const container = document.getElementById('quiz-card-container');
    if (!container) return;

    if (!slide) {
      showQuizComplete(container);
      return;
    }

    container.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'quiz-card';
    card.id = 'quiz-active-card';

    switch (slide.slideType) {
      case 'math':    renderMathSlide(card, slide, idx);    break;
      case 'english': renderEnglishSlide(card, slide, idx); break;
      case 'chinese': renderChineseSlide(card, slide, idx); break;
      case 'outdoor': renderOutdoorSlide(card, slide, idx); break;
    }

    container.appendChild(card);

    // Auto-focus first input
    const input = card.querySelector('input[type="number"], textarea');
    if (input) setTimeout(() => input.focus(), 120);
  }

  // ---- Math slide ----

  function renderMathSlide(card, slide, idx) {
    const { task, prob, probIdx, totalProbs } = slide;
    const aStr = String(prob.a);
    const bStr = String(prob.b);
    const width = Math.max(aStr.length, bStr.length, String(prob.answer).length) + 1;
    const pad = s => s.padStart(width, '\u00A0');

    card.innerHTML = `
      <div class="quiz-task-label">${task.icon} ${task.title} &nbsp;·&nbsp; 第 ${probIdx + 1} / ${totalProbs} 题</div>
      <div class="quiz-math-prompt">算一算：</div>
      <div class="quiz-math-vertical">
        <div class="qv-row">${pad(aStr)}</div>
        <div class="qv-row qv-operator"><span class="qv-sym">${prob.symbol}</span>${pad(bStr).slice(1)}</div>
        <div class="qv-divider"></div>
        <div class="qv-row">
          <input
            type="number"
            id="quiz-math-input-${idx}"
            class="quiz-math-input"
            placeholder="${'\u00A0'.repeat(width)}"
            inputmode="numeric"
            autocomplete="off"
          />
        </div>
      </div>
      <div id="quiz-feedback-${idx}" class="quiz-feedback hidden"></div>
      <button class="quiz-btn-check" id="quiz-check-btn-${idx}"
        onclick="QuizModule.checkMath(${idx})">✅ 检查答案</button>
    `;

    card.querySelector(`#quiz-math-input-${idx}`)
      .addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); checkMath(idx); }
      });
  }

  function checkMath(idx) {
    const slide = slides[idx];
    if (!slide || slide.slideType !== 'math') return;
    const { task, prob, totalProbs } = slide;

    const input    = document.getElementById(`quiz-math-input-${idx}`);
    const feedback = document.getElementById(`quiz-feedback-${idx}`);
    const checkBtn = document.getElementById(`quiz-check-btn-${idx}`);
    if (!input || !feedback) return;

    const val = parseInt(input.value, 10);
    feedback.classList.remove('hidden', 'quiz-correct', 'quiz-wrong');

    if (isNaN(val)) {
      feedback.textContent = '请填写答案！';
      feedback.classList.add('quiz-wrong');
      return;
    }

    if (val === prob.answer) {
      feedback.textContent = '🎉 正确！太棒了！';
      feedback.classList.add('quiz-correct');
      input.classList.add('quiz-input-correct');
      if (checkBtn) checkBtn.disabled = true;

      // Track per-task correct count
      mathTaskCorrect[task.id] = (mathTaskCorrect[task.id] || 0) + 1;
      if (mathTaskCorrect[task.id] >= totalProbs) {
        if (typeof App !== 'undefined') App.completeTask(task.id);
      }

      setTimeout(() => nextSlide(), 1000);
    } else {
      slideRetries[idx] = (slideRetries[idx] || 0) + 1;
      if (slideRetries[idx] >= 3) {
        feedback.innerHTML = `💡 答案是 <strong>${prob.answer}</strong>，下次加油！`;
        feedback.classList.add('quiz-wrong');
        input.classList.add('quiz-input-wrong');
        if (checkBtn) checkBtn.disabled = true;
        setTimeout(() => nextSlide(), 2200);
      } else {
        feedback.textContent = '❌ 再想想，试试看！';
        feedback.classList.add('quiz-wrong');
        input.classList.add('quiz-input-wrong');
        setTimeout(() => {
          input.value = '';
          input.classList.remove('quiz-input-wrong');
          feedback.classList.add('hidden');
          input.focus();
        }, 1200);
      }
    }
  }

  // ---- English reading slide ----

  function renderEnglishSlide(card, slide, idx) {
    const { task, article } = slide;
    if (!article) {
      card.innerHTML = `<p class="error-msg">⚠️ 文章加载失败</p>`;
      return;
    }
    const lines = article.content
      .map(line => `<p class="quiz-en-line">${line}</p>`)
      .join('');

    card.innerHTML = `
      <div class="quiz-task-label">${task.icon} ${task.title}</div>
      <div class="quiz-article-header">
        <span class="quiz-article-level">${article.level || 'RAZ Level I'}</span>
        <h2 class="quiz-article-title">${article.title}</h2>
      </div>
      <div class="quiz-article-body en-body">${lines}</div>
      <div class="quiz-comprehension">
        <h4 class="quiz-comp-question">❓ ${article.question}</h4>
        <textarea
          id="quiz-en-answer-${idx}"
          class="quiz-comp-answer"
          rows="2"
          placeholder="Write your answer here..."
        ></textarea>
        <button class="quiz-btn-check"
          onclick="QuizModule.checkReading(${idx}, '${encodeURIComponent(article.answer)}', 'en')">
          ✅ Check Answer
        </button>
      </div>
      <div id="quiz-feedback-${idx}" class="quiz-feedback hidden"></div>
    `;
  }

  // ---- Chinese reading slide ----

  function renderChineseSlide(card, slide, idx) {
    const { task, article } = slide;
    if (!article) {
      card.innerHTML = `<p class="error-msg">⚠️ 文章加载失败</p>`;
      return;
    }
    const lines = article.content
      .map(line => `<p class="quiz-zh-line">${line}</p>`)
      .join('');

    card.innerHTML = `
      <div class="quiz-task-label">${task.icon} ${task.title}</div>
      <div class="quiz-article-header">
        <h2 class="quiz-article-title">${article.title}</h2>
      </div>
      <div class="quiz-article-body zh-body">${lines}</div>
      <div class="quiz-comprehension">
        <h4 class="quiz-comp-question">❓ ${article.question}</h4>
        <textarea
          id="quiz-zh-answer-${idx}"
          class="quiz-comp-answer"
          rows="2"
          placeholder="写下你的答案..."
        ></textarea>
        <button class="quiz-btn-check"
          onclick="QuizModule.checkReading(${idx}, '${encodeURIComponent(article.answer)}', 'zh')">
          ✅ 查看答案
        </button>
      </div>
      <div id="quiz-feedback-${idx}" class="quiz-feedback hidden"></div>
    `;
  }

  function checkReading(idx, encodedAnswer, lang) {
    const slide = slides[idx];
    if (!slide) return;
    const { task } = slide;

    const answerEl = document.getElementById(`quiz-${lang}-answer-${idx}`);
    const feedback = document.getElementById(`quiz-feedback-${idx}`);
    if (!answerEl || !feedback) return;

    const userAnswer    = answerEl.value.trim();
    const correctAnswer = decodeURIComponent(encodedAnswer);
    const minLen        = lang === 'en' ? 3 : 2;

    feedback.classList.remove('hidden', 'quiz-correct', 'quiz-wrong');
    if (userAnswer.length < minLen) {
      feedback.textContent = lang === 'en'
        ? 'Please write your answer first! ✍️'
        : '请先写下你的答案！✍️';
      feedback.classList.add('quiz-wrong');
      return;
    }

    feedback.innerHTML = lang === 'en'
      ? `🌟 Great job! Answer: <strong>${correctAnswer}</strong>`
      : `🌟 你真棒！参考答案：<strong>${correctAnswer}</strong>`;
    feedback.classList.add('quiz-correct');

    if (typeof App !== 'undefined') App.completeTask(task.id);
    setTimeout(() => nextSlide(), 2200);
  }

  // ---- Outdoor slide ----

  function renderOutdoorSlide(card, slide, idx) {
    const { task } = slide;
    const mins = String(task.durationMinutes).padStart(2, '0');
    card.innerHTML = `
      <div class="quiz-task-label">${task.icon} ${task.title}</div>
      <p class="quiz-outdoor-desc">${task.description}</p>
      <div class="outdoor-timer-area">
        <div class="timer-display" id="quiz-timer-${task.id}">
          <span class="timer-mins">${mins}</span>:<span class="timer-secs">00</span>
        </div>
        <button class="btn-start" id="quiz-timer-btn-${task.id}"
          onclick="QuizModule.startTimer('${task.id}', ${task.durationMinutes}, ${idx})">
          ▶ 开始计时
        </button>
      </div>
      <p class="outdoor-tip">💡 看远处的树木、楼房，让眼睛好好休息！</p>
      <div id="quiz-feedback-${idx}" class="quiz-feedback hidden"></div>
    `;
  }

  function startTimer(taskId, minutes, idx) {
    const btn     = document.getElementById(`quiz-timer-btn-${taskId}`);
    const display = document.getElementById(`quiz-timer-${taskId}`);
    if (!display || timerIntervals[taskId]) return;

    btn.disabled    = true;
    btn.textContent = '计时中...';

    let remaining = minutes * 60;
    timerIntervals[taskId] = setInterval(() => {
      remaining--;
      const m = Math.floor(remaining / 60);
      const s = remaining % 60;
      display.innerHTML = `<span class="timer-mins">${String(m).padStart(2, '0')}</span>:<span class="timer-secs">${String(s).padStart(2, '0')}</span>`;
      if (remaining <= 0) {
        clearInterval(timerIntervals[taskId]);
        delete timerIntervals[taskId];
        const feedback = document.getElementById(`quiz-feedback-${idx}`);
        if (feedback) {
          feedback.innerHTML = '🎉 太棒了！户外训练完成！你的眼睛感谢你！⭐';
          feedback.classList.remove('hidden');
          feedback.classList.add('quiz-correct');
        }
        if (typeof App !== 'undefined') App.completeTask(taskId);
        setTimeout(() => nextSlide(), 2200);
      }
    }, 1000);
  }

  // ---- Navigation ----

  function nextSlide() {
    showSlide(currentIndex + 1);
  }

  function showQuizComplete(container) {
    container.innerHTML = `
      <div class="quiz-card quiz-complete-card">
        <div class="quiz-complete-icon">🎊</div>
        <h2 class="quiz-complete-title">全部完成！</h2>
        <p class="quiz-complete-msg">你真是太棒了！今天的训练全部完成！⭐⭐⭐</p>
        <button class="quiz-btn-check" onclick="QuizModule.close()">🏠 返回主页</button>
      </div>
    `;
  }

  return { init, open, close, showSlide, checkMath, checkReading, startTimer, nextSlide };
})();
