/**
 * quiz.js - Full-screen card-based quiz interface
 * Shows one question per full-screen card; auto-advances on correct answer.
 */

const QuizModule = (() => {
  let slides = [];
  let currentIndex = 0;
  let currentPeriod = null;
  let mathTaskCorrect = {};   // taskId -> # problems answered correctly this session
  let slideRetries = {};      // slideIndex -> # wrong attempts
  let timerIntervals = {};    // taskId -> intervalId
  let slideQAnswered = {};    // idx -> # questions answered on this slide
  let slideTotalQ = {};       // idx -> total questions for this slide

  // ---- Build flat slides array from tasks data ----

  function buildSlides(data, period) {
    const result = [];
    const periods = period ? [period] : ['morning', 'evening'];
    periods.forEach(p => {
      const periodData = data[p];
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

  function init(data, period) {
    currentPeriod = period || null;
    slides = buildSlides(data, period);
    currentIndex = 0;
    mathTaskCorrect = {};
    slideRetries = {};
    timerIntervals = {};
    slideQAnswered = {};
    slideTotalQ = {};
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
      <div class="quiz-math-layout">
        <div class="quiz-math-left">
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
        </div>
        <div class="quiz-math-right">
          <div id="quiz-feedback-${idx}" class="quiz-feedback hidden"></div>
          <button class="quiz-btn-check" id="quiz-check-btn-${idx}"
            onclick="QuizModule.checkMath(${idx})">✅ 检查答案</button>
        </div>
      </div>
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

  // ---- Reading slide helpers ----

  function buildQuestionList(article) {
    return [
      { type: 'comprehension', prompt: article.question, options: article.options, correctIndex: article.correctIndex },
      ...(article.extraQuestions || [])
    ];
  }

  function renderQuestionHTML(q, idx, qIdx) {
    const icons = { comprehension: '❓', typo: '✏️', vocab: '📚', grammar: '📝' };
    const icon = icons[q.type] || '❓';
    const optionsHTML = (q.options || []).map((opt, i) =>
      `<button class="quiz-mcq-btn" id="quiz-mcq-${idx}-${qIdx}-${i}"
        onclick="QuizModule.selectMCQQuestion(${idx}, ${qIdx}, ${i})">${String.fromCharCode(65 + i)}. ${opt}</button>`
    ).join('');
    const noteHTML = q.note
      ? `<div class="quiz-mcq-note hidden" id="quiz-note-${idx}-${qIdx}">${q.note}</div>`
      : '';
    const divider = qIdx > 0 ? '<hr class="quiz-q-divider">' : '';
    return `
      ${divider}
      <div class="quiz-question-section" id="quiz-qsection-${idx}-${qIdx}">
        <h4 class="quiz-comp-question">${icon} ${q.prompt}</h4>
        <div class="quiz-mcq-options">${optionsHTML}</div>
        ${noteHTML}
        <div id="quiz-feedback-${idx}-${qIdx}" class="quiz-feedback hidden"></div>
      </div>
    `;
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
    const allQuestions = buildQuestionList(article);
    slideTotalQ[idx] = allQuestions.length;
    slideQAnswered[idx] = 0;
    const questionsHTML = allQuestions.map((q, qIdx) => renderQuestionHTML(q, idx, qIdx)).join('');

    card.innerHTML = `
      <div class="quiz-task-label">${task.icon} ${task.title}</div>
      <div class="quiz-article-header">
        <span class="quiz-article-level">${article.level || 'RAZ Level I'}</span>
        <h2 class="quiz-article-title">${article.title}</h2>
      </div>
      <div class="quiz-article-body en-body">${lines}</div>
      <div class="quiz-comprehension">${questionsHTML}</div>
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
    const allQuestions = buildQuestionList(article);
    slideTotalQ[idx] = allQuestions.length;
    slideQAnswered[idx] = 0;
    const questionsHTML = allQuestions.map((q, qIdx) => renderQuestionHTML(q, idx, qIdx)).join('');

    card.innerHTML = `
      <div class="quiz-task-label">${task.icon} ${task.title}</div>
      <div class="quiz-article-header">
        <h2 class="quiz-article-title">${article.title}</h2>
      </div>
      <div class="quiz-article-body zh-body">${lines}</div>
      <div class="quiz-comprehension">${questionsHTML}</div>
    `;
  }

  function selectMCQQuestion(idx, qIdx, chosenIndex) {
    const slide = slides[idx];
    if (!slide) return;
    const { task, article } = slide;

    // Prevent double-answering the same question
    const section = document.getElementById(`quiz-qsection-${idx}-${qIdx}`);
    if (!section || section.dataset.answered) return;
    section.dataset.answered = '1';

    const allQuestions = buildQuestionList(article);
    const q = allQuestions[qIdx];
    if (!q) return;

    const allBtns = document.querySelectorAll(`[id^="quiz-mcq-${idx}-${qIdx}-"]`);
    allBtns.forEach(btn => { btn.disabled = true; });

    const correctIndex = q.correctIndex;
    const isCorrect = chosenIndex === correctIndex;
    const isEn = slide.slideType === 'english';
    const chosenBtn  = document.getElementById(`quiz-mcq-${idx}-${qIdx}-${chosenIndex}`);
    const correctBtn = document.getElementById(`quiz-mcq-${idx}-${qIdx}-${correctIndex}`);

    if (chosenBtn)  chosenBtn.classList.add(isCorrect ? 'mcq-correct' : 'mcq-wrong');
    if (!isCorrect && correctBtn) correctBtn.classList.add('mcq-correct');

    // Show typo note after answering
    const noteEl = document.getElementById(`quiz-note-${idx}-${qIdx}`);
    if (noteEl) noteEl.classList.remove('hidden');

    const feedback = document.getElementById(`quiz-feedback-${idx}-${qIdx}`);
    if (feedback) {
      feedback.classList.remove('hidden', 'quiz-correct', 'quiz-wrong');
      if (isCorrect) {
        feedback.textContent = isEn ? '🌟 Great job! That\'s correct!' : '🌟 你真棒！回答正确！';
        feedback.classList.add('quiz-correct');
      } else {
        feedback.textContent = q.type === 'typo'
          ? '💡 看看下面的解析，下次记住哦！'
          : isEn ? '💡 The correct answer is shown in green.' : '💡 正确答案已用绿色显示。';
        feedback.classList.add('quiz-wrong');
      }
    }

    slideQAnswered[idx] = (slideQAnswered[idx] || 0) + 1;
    if (slideQAnswered[idx] >= (slideTotalQ[idx] || 1)) {
      if (typeof App !== 'undefined') App.completeTask(task.id);
      setTimeout(() => nextSlide(), 2200);
    }
  }

  function selectMCQ(idx, chosenIndex) {
    selectMCQQuestion(idx, 0, chosenIndex);
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
    if (currentPeriod && typeof App !== 'undefined') {
      App.markSessionDone(currentPeriod);
    }
    container.innerHTML = `
      <div class="quiz-card quiz-complete-card">
        <div class="quiz-complete-icon">🎊</div>
        <h2 class="quiz-complete-title">全部完成！</h2>
        <p class="quiz-complete-msg">你真是太棒了！今天的训练全部完成！⭐⭐⭐</p>
        <button class="quiz-btn-check" onclick="QuizModule.close()">🏠 返回主页</button>
      </div>
    `;
  }

  return { init, open, close, showSlide, checkMath, selectMCQ, selectMCQQuestion, startTimer, nextSlide };
})();
