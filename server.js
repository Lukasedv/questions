const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const ADMIN_KEY = process.env.ADMIN_KEY || crypto.randomBytes(4).toString('hex');

if (!process.env.ADMIN_KEY) {
  console.log(`Generated ADMIN_KEY: ${ADMIN_KEY}`);
}

// In-memory data store
const store = {
  questions: [],
  activeQuestionId: null
};

// Routes
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'user.html'));
});

app.get('/results', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'results.html'));
});

app.get('/admin/:key', (req, res) => {
  if (req.params.key !== ADMIN_KEY) {
    return res.status(403).send('Invalid admin key');
  }
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

// Helper to build results payload
function buildResults(question) {
  return {
    questionId: question.id,
    answers: question.answers,
    totalResponses: question.totalResponses
  };
}

// Socket.IO
io.on('connection', (socket) => {
  // Join admin room if authenticated as admin
  if (socket.handshake.auth && socket.handshake.auth.role === 'admin') {
    socket.join('admin');
  }

  // Join viewer room for results-only display
  if (socket.handshake.auth && socket.handshake.auth.role === 'viewer') {
    socket.join('viewer');
    // Send current active question state
    if (store.activeQuestionId) {
      const q = store.questions.find(q => q.id === store.activeQuestionId);
      if (q) {
        socket.emit('question-activated', { question: q });
        socket.emit('results-updated', buildResults(q));
      }
    }
  }

  // Admin events
  socket.on('create-question', ({ title, type, options }) => {
    const question = {
      id: crypto.randomUUID(),
      title,
      type,
      options: options || [],
      answers: {},
      totalResponses: 0
    };
    store.questions.push(question);
    io.to('admin').emit('questions-updated', { questions: store.questions });
  });

  socket.on('activate-question', ({ questionId }) => {
    store.activeQuestionId = questionId;
    const question = store.questions.find(q => q.id === questionId);
    if (question) {
      io.emit('question-activated', { question });
    }
  });

  socket.on('deactivate-question', () => {
    store.activeQuestionId = null;
    io.emit('question-deactivated');
  });

  socket.on('delete-question', ({ questionId }) => {
    store.questions = store.questions.filter(q => q.id !== questionId);
    if (store.activeQuestionId === questionId) {
      store.activeQuestionId = null;
    }
    io.to('admin').emit('questions-updated', { questions: store.questions });
  });

  socket.on('clear-answers', ({ questionId }) => {
    const question = store.questions.find(q => q.id === questionId);
    if (question) {
      question.answers = {};
      question.totalResponses = 0;
      io.to('admin').emit('results-updated', buildResults(question));
      io.to('viewer').emit('results-updated', buildResults(question));
    }
  });

  socket.on('get-questions', () => {
    socket.emit('questions-updated', { questions: store.questions });
  });

  // User events
  socket.on('submit-answer', ({ questionId, answer }) => {
    const question = store.questions.find(q => q.id === questionId);
    if (!question) return;

    question.totalResponses++;

    if (question.type === 'freetext') {
      const words = answer.trim().toLowerCase().split(/\s+/).filter(w => w.length > 0);
      for (const word of words) {
        question.answers[word] = (question.answers[word] || 0) + 1;
      }
    } else if (question.type === 'multiple') {
      const selections = Array.isArray(answer) ? answer : [answer];
      for (const opt of selections) {
        question.answers[opt] = (question.answers[opt] || 0) + 1;
      }
    } else {
      // single choice
      question.answers[answer] = (question.answers[answer] || 0) + 1;
    }

    io.to('admin').emit('results-updated', buildResults(question));
    io.to('viewer').emit('results-updated', buildResults(question));
  });
});

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
