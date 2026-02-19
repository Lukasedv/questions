const socket = io();

let currentQuestionId = null;
let hasAnswered = false;

const waitingEl = document.getElementById('waiting');
const questionAreaEl = document.getElementById('question-area');
const submittedEl = document.getElementById('submitted');
const questionTitleEl = document.getElementById('question-title');
const answerFormEl = document.getElementById('answer-form');
const submitBtn = document.getElementById('submit-btn');

let currentQuestionType = null;

function showScreen(screen) {
  waitingEl.style.display = screen === 'waiting' ? '' : 'none';
  questionAreaEl.style.display = screen === 'question' ? '' : 'none';
  submittedEl.style.display = screen === 'submitted' ? '' : 'none';
}

socket.on('question-activated', ({ question }) => {
  currentQuestionId = question.id;
  currentQuestionType = question.type;
  hasAnswered = false;

  questionTitleEl.textContent = question.title;
  answerFormEl.innerHTML = '';

  if (question.type === 'single') {
    question.options.forEach((opt, i) => {
      const label = document.createElement('label');
      label.className = 'option-label';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'answer';
      input.value = opt;
      label.appendChild(input);
      label.appendChild(document.createTextNode(opt));
      answerFormEl.appendChild(label);
    });
  } else if (question.type === 'multiple') {
    question.options.forEach((opt, i) => {
      const label = document.createElement('label');
      label.className = 'option-label';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.name = 'answer';
      input.value = opt;
      label.appendChild(input);
      label.appendChild(document.createTextNode(opt));
      answerFormEl.appendChild(label);
    });
  } else if (question.type === 'freetext') {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'freetext-input';
    input.className = 'text-input';
    input.placeholder = 'Type your answer...';
    answerFormEl.appendChild(input);
  }

  showScreen('question');
});

socket.on('question-deactivated', () => {
  currentQuestionId = null;
  currentQuestionType = null;
  hasAnswered = false;
  showScreen('waiting');
});

submitBtn.addEventListener('click', () => {
  if (hasAnswered) return;

  let answer;

  if (currentQuestionType === 'single') {
    const checked = answerFormEl.querySelector('input[name="answer"]:checked');
    if (!checked) return;
    answer = checked.value;
  } else if (currentQuestionType === 'multiple') {
    const checked = answerFormEl.querySelectorAll('input[name="answer"]:checked');
    if (checked.length === 0) return;
    answer = Array.from(checked).map(cb => cb.value);
  } else if (currentQuestionType === 'freetext') {
    const input = document.getElementById('freetext-input');
    answer = input.value.trim();
    if (!answer) return;
  }

  socket.emit('submit-answer', { questionId: currentQuestionId, answer });
  hasAnswered = true;
  showScreen('submitted');
});
