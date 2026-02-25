/**
 * english.js - English reading module (RAZ Level I)
 */

const EnglishModule = (() => {

  function renderEnglishTask(task, container, article) {
    if (!article) {
      container.innerHTML = `<p class="error-msg">⚠️ 文章加载失败，请刷新页面重试。</p>`;
      return;
    }

    const lines = article.content.map((line, i) =>
      `<p class="en-line" style="animation-delay:${i * 0.08}s">${line}</p>`
    ).join('');

    container.innerHTML = `
      <div class="reading-task english-task">
        <h3 class="task-section-title">📚 ${task.title}</h3>
        <p class="task-desc">${task.description}</p>
        <div class="article-card">
          <div class="article-header">
            <span class="article-level">${article.level || 'RAZ Level I'}</span>
            <h2 class="article-title">${article.title}</h2>
          </div>
          <div class="article-body en-body">
            ${lines}
          </div>
          <div class="comprehension-section">
            <h4 class="comp-question">❓ ${article.question}</h4>
            <textarea
              class="comp-answer"
              id="en-answer-${task.id}"
              rows="3"
              placeholder="Write your answer here..."
            ></textarea>
            <button class="btn-check" onclick="EnglishModule.checkAnswer('${task.id}', '${encodeURIComponent(article.answer)}')">
              ✅ Check Answer
            </button>
          </div>
          <div class="reading-result hidden" id="en-result-${task.id}"></div>
        </div>
      </div>`;
  }

  function checkAnswer(taskId, encodedAnswer) {
    const answerEl = document.getElementById(`en-answer-${taskId}`);
    const resultEl = document.getElementById(`en-result-${taskId}`);
    if (!answerEl || !resultEl) return;

    const userAnswer = answerEl.value.trim();
    const correctAnswer = decodeURIComponent(encodedAnswer);

    resultEl.classList.remove('hidden');
    if (userAnswer.length < 3) {
      resultEl.innerHTML = `<div class="result-partial">Please write your answer first! ✍️</div>`;
      return;
    }

    resultEl.innerHTML = `
      <div class="result-success">
        🌟 Great job reading! Here is the answer:<br>
        <strong>${correctAnswer}</strong>
      </div>`;
    if (typeof App !== 'undefined') App.completeTask(taskId);
  }

  return { renderEnglishTask, checkAnswer };
})();
