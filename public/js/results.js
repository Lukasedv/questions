/* Results viewer — read-only live results display */

const socket = io({ auth: { role: 'viewer' } });

let currentQuestion = null;

socket.on('question-activated', (data) => {
  currentQuestion = data.question;
  document.getElementById('waiting').style.display = 'none';
  document.getElementById('results-area').style.display = '';
  document.getElementById('question-title').textContent = currentQuestion.title;
  document.getElementById('total-responses').textContent = '0 responses';
  document.getElementById('results-content').innerHTML = '';
});

socket.on('question-deactivated', () => {
  currentQuestion = null;
  document.getElementById('waiting').style.display = '';
  document.getElementById('results-area').style.display = 'none';
});

socket.on('results-updated', (data) => {
  const { answers, totalResponses } = data;
  if (!currentQuestion) return;

  document.getElementById('total-responses').textContent = totalResponses + ' responses';

  const content = document.getElementById('results-content');
  if (currentQuestion.type === 'freetext') {
    renderWordCloud(content, answers);
  } else {
    renderBarChart(content, currentQuestion, answers, totalResponses);
  }
});

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

  const MIN_FONT = 18;
  const MAX_FONT = 96;

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
