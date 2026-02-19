/* Admin interface for Live Poll */

const socket = io({ auth: { role: 'admin' } });

let questions = [];
let activeQuestionId = null;

// ── Socket.IO Connection ────────────────────────────────────────────

socket.on('connect', () => {
  socket.emit('get-questions');
});

socket.on('questions-updated', (data) => {
  questions = data.questions || [];
  renderQuestionList();
});

socket.on('results-updated', (data) => {
  const { questionId, answers, totalResponses } = data;
  if (questionId === activeQuestionId) {
    const question = questions.find(q => q.id === questionId);
    if (question) {
      renderResults(question, answers, totalResponses);
    }
  }
});

socket.on('question-activated', (data) => {
  activeQuestionId = data.question.id;
  // Update the question in local list if needed
  const idx = questions.findIndex(q => q.id === data.question.id);
  if (idx !== -1) {
    questions[idx] = data.question;
  }
  renderQuestionList();
  showResultsPanel(data.question);
});

socket.on('question-deactivated', () => {
  activeQuestionId = null;
  renderQuestionList();
  hideResultsPanel();
});

// ── Form Logic ──────────────────────────────────────────────────────

const form = document.getElementById('create-question-form');
const typeSelect = document.getElementById('question-type');
const optionsSection = document.getElementById('options-section');
const optionsList = document.getElementById('options-list');
const addOptionBtn = document.getElementById('add-option-btn');

let optionCount = 2;

typeSelect.addEventListener('change', () => {
  optionsSection.style.display = typeSelect.value === 'freetext' ? 'none' : '';
});

addOptionBtn.addEventListener('click', () => {
  optionCount++;
  const row = document.createElement('div');
  row.className = 'option-row';
  row.innerHTML =
    '<input type="text" class="option-input" placeholder="Option ' + optionCount + '">' +
    '<button type="button" class="btn-remove-option" onclick="removeOption(this)">&times;</button>';
  optionsList.appendChild(row);
});

function removeOption(btn) {
  const row = btn.parentElement;
  if (optionsList.children.length > 1) {
    row.remove();
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const title = document.getElementById('question-title').value.trim();
  const type = typeSelect.value;

  if (!title) return;

  let options = [];
  if (type !== 'freetext') {
    const inputs = optionsList.querySelectorAll('.option-input');
    options = Array.from(inputs).map(i => i.value.trim()).filter(v => v);
    if (options.length < 2) {
      alert('Please add at least 2 options.');
      return;
    }
  }

  socket.emit('create-question', { title, type, options });
  resetForm();
});

function resetForm() {
  document.getElementById('question-title').value = '';
  typeSelect.value = 'single';
  optionsSection.style.display = '';
  optionsList.innerHTML =
    '<div class="option-row">' +
      '<input type="text" class="option-input" placeholder="Option 1">' +
      '<button type="button" class="btn-remove-option" onclick="removeOption(this)">&times;</button>' +
    '</div>' +
    '<div class="option-row">' +
      '<input type="text" class="option-input" placeholder="Option 2">' +
      '<button type="button" class="btn-remove-option" onclick="removeOption(this)">&times;</button>' +
    '</div>';
  optionCount = 2;
}

// ── Question List Rendering ─────────────────────────────────────────

function renderQuestionList() {
  const container = document.getElementById('questions-container');

  if (!questions.length) {
    container.innerHTML = '<p class="empty-state">No questions yet. Create one above!</p>';
    return;
  }

  container.innerHTML = questions.map(q => {
    const isActive = q.id === activeQuestionId;
    const typeBadge = { single: 'Single Choice', multiple: 'Multiple Choice', freetext: 'Free Text' }[q.type] || q.type;
    const answerCount = q.answerCount || 0;

    return (
      '<div class="question-card' + (isActive ? ' active' : '') + '" data-id="' + q.id + '">' +
        (isActive ? '<span class="badge badge-live">LIVE</span>' : '') +
        '<div class="question-info">' +
          '<h3>' + escapeHtml(q.title) + '</h3>' +
          '<span class="badge badge-type">' + typeBadge + '</span>' +
          '<span class="answer-count">' + answerCount + ' answers</span>' +
        '</div>' +
        '<div class="question-actions">' +
          (isActive
            ? '<button class="btn btn-deactivate" onclick="deactivateQuestion()">Deactivate</button>'
            : '<button class="btn btn-activate" onclick="activateQuestion(\'' + q.id + '\')">Activate</button>') +
          '<button class="btn btn-clear" onclick="clearAnswers(\'' + q.id + '\')">Clear Answers</button>' +
          '<button class="btn btn-delete" onclick="deleteQuestion(\'' + q.id + '\')">Delete</button>' +
        '</div>' +
      '</div>'
    );
  }).join('');
}

// ── Admin Actions ───────────────────────────────────────────────────

function activateQuestion(questionId) {
  socket.emit('activate-question', { questionId });
}

function deactivateQuestion() {
  socket.emit('deactivate-question');
}

function deleteQuestion(questionId) {
  if (confirm('Delete this question?')) {
    socket.emit('delete-question', { questionId });
  }
}

function clearAnswers(questionId) {
  if (confirm('Clear all answers for this question?')) {
    socket.emit('clear-answers', { questionId });
  }
}

// ── Results Panel ───────────────────────────────────────────────────

function showResultsPanel(question) {
  const panel = document.getElementById('results-panel');
  panel.style.display = '';
  document.getElementById('results-question-title').textContent = question.title;
  document.getElementById('results-total').textContent = 'Total responses: 0';
  document.getElementById('results-content').innerHTML = '';
}

function hideResultsPanel() {
  const panel = document.getElementById('results-panel');
  panel.style.display = 'none';
  document.getElementById('results-content').innerHTML = '';
}

function renderResults(question, answers, totalResponses) {
  document.getElementById('results-total').textContent = 'Total responses: ' + totalResponses;

  const content = document.getElementById('results-content');

  if (question.type === 'freetext') {
    renderWordCloud(content, answers);
  } else {
    renderBarChart(content, question, answers, totalResponses);
  }
}

// ── Bar Chart ───────────────────────────────────────────────────────

function renderBarChart(container, question, answers, totalResponses) {
  const options = question.options || [];
  const total = totalResponses || 1;

  container.innerHTML = '<div class="bar-chart">' +
    options.map(opt => {
      const count = (answers && answers[opt]) || 0;
      const pct = Math.round((count / total) * 100) || 0;

      return (
        '<div class="bar-row">' +
          '<span class="bar-label">' + escapeHtml(opt) + '</span>' +
          '<div class="bar-track">' +
            '<div class="bar-fill" style="width:' + pct + '%"></div>' +
          '</div>' +
          '<span class="bar-value">' + count + ' (' + pct + '%)</span>' +
        '</div>'
      );
    }).join('') +
  '</div>';
}

// ── Word Cloud ──────────────────────────────────────────────────────

const CLOUD_COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#3b82f6', '#ef4444', '#8b5cf6', '#10b981'];

function renderWordCloud(container, answers) {
  if (!answers || !Object.keys(answers).length) {
    container.innerHTML = '<p class="empty-state">No responses yet.</p>';
    return;
  }

  const words = Object.entries(answers);
  const counts = words.map(w => w[1]);
  const minCount = Math.min(...counts);
  const maxCount = Math.max(...counts);
  const range = maxCount - minCount || 1;

  const MIN_FONT = 14;
  const MAX_FONT = 72;

  container.innerHTML = '<div class="word-cloud">' +
    words.map(([word, count], i) => {
      const size = MIN_FONT + ((count - minCount) / range) * (MAX_FONT - MIN_FONT);
      const rotation = (Math.random() * 10 - 5).toFixed(1);
      const color = CLOUD_COLORS[i % CLOUD_COLORS.length];

      return '<span class="cloud-word" style="' +
        'font-size:' + Math.round(size) + 'px;' +
        'transform:rotate(' + rotation + 'deg);' +
        'color:' + color + ';">' +
        escapeHtml(word) +
      '</span>';
    }).join(' ') +
  '</div>';
}

// ── Helpers ─────────────────────────────────────────────────────────

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
