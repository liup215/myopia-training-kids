/**
 * math.js - Math exercise module
 * Generates addition, subtraction, multiplication, division problems
 * and renders vertical-form layouts
 */

const MathModule = (() => {

  function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function generateAddition() {
    const a = randInt(10, 99);
    const b = randInt(10, 99);
    return { type: 'addition', a, b, answer: a + b, symbol: '+' };
  }

  function generateSubtraction() {
    const b = randInt(10, 99);
    const a = randInt(b, 99);
    return { type: 'subtraction', a, b, answer: a - b, symbol: '-' };
  }

  function generateMultiplication() {
    const a = randInt(12, 99);
    const b = randInt(2, 9);
    return { type: 'multiplication', a, b, answer: a * b, symbol: '×' };
  }

  function generateDivision() {
    const b = randInt(2, 9);
    const answer = randInt(10, 19);
    const a = answer * b;
    return { type: 'division', a, b, answer, symbol: '÷' };
  }

  function generateProblems(config) {
    const problems = [];
    for (let i = 0; i < (config.addition || 0); i++) problems.push(generateAddition());
    for (let i = 0; i < (config.subtraction || 0); i++) problems.push(generateSubtraction());
    for (let i = 0; i < (config.multiplication || 0); i++) problems.push(generateMultiplication());
    for (let i = 0; i < (config.division || 0); i++) problems.push(generateDivision());
    // Shuffle
    return problems.sort(() => Math.random() - 0.5);
  }

  function renderVerticalProblem(prob, index) {
    const aStr = String(prob.a);
    const bStr = String(prob.b);
    const ansStr = String(prob.answer);
    const width = Math.max(aStr.length, bStr.length, ansStr.length) + 1;

    const padded = (s) => s.padStart(width, '\u00A0');

    return `
      <div class="vertical-problem" data-index="${index}" data-answer="${prob.answer}">
        <div class="prob-label">第 ${index + 1} 题</div>
        <div class="vertical-box">
          <div class="v-row top-num">${padded(aStr)}</div>
          <div class="v-row mid-num"><span class="symbol">${prob.symbol}</span>${padded(bStr).slice(1)}</div>
          <div class="v-divider"></div>
          <div class="v-row answer-row">
            <input
              type="number"
              class="answer-input"
              placeholder="${'\u00A0'.repeat(width)}"
              aria-label="第${index + 1}题答案"
              inputmode="numeric"
            />
          </div>
        </div>
        <div class="prob-feedback hidden"></div>
      </div>`;
  }

  function renderMathTask(task, container) {
    const problems = generateProblems(task.config);
    container.innerHTML = `
      <div class="math-task">
        <h3 class="task-section-title">✏️ ${task.title}</h3>
        <p class="task-desc">${task.description}</p>
        <div class="problems-grid" id="problems-grid-${task.id}">
          ${problems.map((p, i) => renderVerticalProblem(p, i)).join('')}
        </div>
        <button class="btn-check" onclick="MathModule.checkAnswers('${task.id}')">✅ 检查答案</button>
        <div class="math-result hidden" id="math-result-${task.id}"></div>
      </div>`;
  }

  function checkAnswers(taskId) {
    const grid = document.getElementById(`problems-grid-${taskId}`);
    if (!grid) return;
    const problems = grid.querySelectorAll('.vertical-problem');
    let allCorrect = true;
    let correctCount = 0;

    problems.forEach((prob) => {
      const expected = parseInt(prob.dataset.answer, 10);
      const input = prob.querySelector('.answer-input');
      const feedback = prob.querySelector('.prob-feedback');
      const val = parseInt(input.value, 10);

      feedback.classList.remove('hidden', 'correct', 'wrong');

      if (isNaN(val)) {
        feedback.textContent = '请填写答案';
        feedback.classList.add('wrong');
        allCorrect = false;
      } else if (val === expected) {
        feedback.textContent = '✓ 正确！';
        feedback.classList.add('correct');
        input.classList.add('input-correct');
        correctCount++;
      } else {
        feedback.textContent = `✗ 答案是 ${expected}`;
        feedback.classList.add('wrong');
        input.classList.add('input-wrong');
        allCorrect = false;
      }
    });

    const result = document.getElementById(`math-result-${taskId}`);
    result.classList.remove('hidden');

    if (allCorrect) {
      result.innerHTML = `<div class="result-success">🎉 全对！太棒了！你得到了一颗星 ⭐</div>`;
      if (typeof App !== 'undefined') App.completeTask(taskId);
    } else {
      result.innerHTML = `<div class="result-partial">💪 答对了 ${correctCount}/${problems.length} 题，再试试！<br><button class="btn-retry" onclick="MathModule.resetAnswers('${taskId}')">重新作答</button></div>`;
    }
  }

  function resetAnswers(taskId) {
    const grid = document.getElementById(`problems-grid-${taskId}`);
    if (!grid) return;
    grid.querySelectorAll('.answer-input').forEach(inp => {
      inp.value = '';
      inp.classList.remove('input-correct', 'input-wrong');
    });
    grid.querySelectorAll('.prob-feedback').forEach(fb => {
      fb.classList.add('hidden');
      fb.classList.remove('correct', 'wrong');
    });
    const result = document.getElementById(`math-result-${taskId}`);
    if (result) result.classList.add('hidden');
  }

  return { renderMathTask, checkAnswers, resetAnswers };
})();
