/**
 * chinese.js - Chinese reading module
 */

const ChineseModule = (() => {

  function renderChineseTask(task, container, article) {
    if (!article) {
      container.innerHTML = `<p class="error-msg">⚠️ 文章加载失败，请刷新页面重试。</p>`;
      return;
    }

    const lines = article.content.map((line, i) =>
      `<p class="zh-line" style="animation-delay:${i * 0.1}s">${line}</p>`
    ).join('');

    container.innerHTML = `
      <div class="reading-task chinese-task">
        <h3 class="task-section-title">📗 ${task.title}</h3>
        <p class="task-desc">${task.description}</p>
        <div class="article-card">
          <div class="article-header">
            <h2 class="article-title">${article.title}</h2>
          </div>
          <div class="article-body zh-body">
            ${lines}
          </div>
          <div class="comprehension-section">
            <h4 class="comp-question">❓ ${article.question}</h4>
            <textarea
              class="comp-answer"
              id="zh-answer-${task.id}"
              rows="3"
              placeholder="写下你的答案..."
            ></textarea>
            <button class="btn-check" onclick="ChineseModule.checkAnswer('${task.id}', '${encodeURIComponent(article.answer)}')">
              ✅ 查看答案
            </button>
          </div>
          <div class="reading-result hidden" id="zh-result-${task.id}"></div>
        </div>
      </div>`;
  }

  function checkAnswer(taskId, encodedAnswer) {
    const answerEl = document.getElementById(`zh-answer-${taskId}`);
    const resultEl = document.getElementById(`zh-result-${taskId}`);
    if (!answerEl || !resultEl) return;

    const userAnswer = answerEl.value.trim();
    const correctAnswer = decodeURIComponent(encodedAnswer);

    resultEl.classList.remove('hidden');
    if (userAnswer.length < 2) {
      resultEl.innerHTML = `<div class="result-partial">请先写下你的答案！✍️</div>`;
      return;
    }

    resultEl.innerHTML = `
      <div class="result-success">
        🌟 你真棒！参考答案是：<br>
        <strong>${correctAnswer}</strong>
      </div>`;
    if (typeof App !== 'undefined') App.completeTask(taskId);
  }

  return { renderChineseTask, checkAnswer };
})();
