// app.js — Maine Permit Practice (static / GitHub Pages version)

// Attach a stable _id to each question (index-based)
QUESTIONS.forEach((q, i) => q._id = i);

const App = (() => {

  // ── State ────────────────────────────────────────────────
  let state = {
    quizMode:            null,
    questions:           [],
    currentIdx:          0,
    answers:             [],
    selectedAnswer:      null,
    selectedConfidence:  null,
    lastQuizParams:      null,
    studyQuestions:      [],
    studyIdx:            0,
    studyRevealed:       false,
  };

  // ── Utilities ─────────────────────────────────────────────
  function show(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    window.scrollTo(0, 0);
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function uniqueValues(key) {
    return [...new Set(QUESTIONS.map(q => q[key]))].sort();
  }

  function topicsForSection(section) {
    const src = section ? QUESTIONS.filter(q => q.section === section) : QUESTIONS;
    return [...new Set(src.map(q => q.topic))].sort();
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  }

  // ── Boot ──────────────────────────────────────────────────
  function init() {
    setupMascotPicker();
    populateSetupDropdowns();
    setupImportDragDrop();
    const profile = Store.getCurrentProfile();
    if (profile) enterHome(profile);
    else { renderProfileList(); show('screen-welcome'); }
  }

  function setupMascotPicker() {
    document.querySelectorAll('.mascot-opt').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.mascot-opt').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });
  }

  function populateSetupDropdowns() {
    const sections = uniqueValues('section');
    ['study-section', 'practice-section'].forEach(id => {
      const sel = document.getElementById(id);
      sel.innerHTML = '<option value="">All Sections</option>';
      sections.forEach(s => sel.innerHTML += `<option value="${s}">${s}</option>`);
    });

    document.getElementById('study-section').addEventListener('change', e => {
      const t = document.getElementById('study-topic');
      t.innerHTML = '<option value="">All Topics</option>';
      topicsForSection(e.target.value).forEach(v => t.innerHTML += `<option value="${v}">${v}</option>`);
    });

    document.getElementById('practice-section').addEventListener('change', e => {
      const t = document.getElementById('practice-topic');
      t.innerHTML = '<option value="">All Topics</option>';
      topicsForSection(e.target.value).forEach(v => t.innerHTML += `<option value="${v}">${v}</option>`);
    });
  }

  // ── Profiles ──────────────────────────────────────────────
  function renderProfileList() {
    const profiles  = Store.getProfiles();
    const container = document.getElementById('profile-list');
    if (!profiles.length) { container.innerHTML = ''; return; }

    container.innerHTML = profiles.map(p => {
      const stats     = Store.getProfileStats(p.id);
      const statsText = stats.totalAttempts === 0
        ? 'No attempts yet'
        : `${stats.totalAttempts} quiz${stats.totalAttempts !== 1 ? 'zes' : ''} taken` +
          (stats.bestMock != null ? ` · Best mock: ${stats.bestMock}/30` : '');
      return `
        <div class="profile-btn" onclick="App.selectProfile('${p.id}')">
          <span class="profile-mascot">${p.mascot}</span>
          <div class="profile-info">
            <div class="profile-name">${p.name}</div>
            <div class="profile-stats">${statsText}</div>
          </div>
          <button class="profile-delete" onclick="event.stopPropagation();App.deleteProfile('${p.id}')" title="Remove">🗑</button>
        </div>`;
    }).join('');
  }

  function addProfile() {
    const name   = document.getElementById('new-profile-name').value.trim();
    const mascot = document.querySelector('.mascot-opt.selected')?.dataset.mascot || '🧚';
    const err    = document.getElementById('new-profile-error');
    err.classList.add('hidden');
    if (!name) { err.textContent = 'Please enter your name!'; err.classList.remove('hidden'); return; }
    const id = Store.addProfile(name, mascot);
    document.getElementById('new-profile-name').value = '';
    selectProfile(id);
  }

  function selectProfile(id) {
    Store.setCurrentProfileId(id);
    const profile = Store.getCurrentProfile();
    if (profile) enterHome(profile);
  }

  function deleteProfile(id) {
    if (!confirm('Remove this profile? All progress will be lost.')) return;
    Store.deleteProfile(id);
    renderProfileList();
  }

  function switchProfile() {
    renderProfileList();
    show('screen-welcome');
  }

  function enterHome(profile) {
    document.getElementById('header-name').textContent  = profile.name;
    document.getElementById('welcome-name').textContent = profile.name;
    document.getElementById('welcome-mascot').textContent = profile.mascot;
    loadProgress();
    show('screen-home');
  }

  // ── Progress / stats ──────────────────────────────────────
  function loadProgress() {
    const id    = Store.getCurrentProfileId();
    if (!id) return;

    const stats = Store.getProfileStats(id);

    // Stats strip
    const strip = document.getElementById('stats-strip');
    if (stats.totalAttempts > 0) {
      document.getElementById('stat-attempts').textContent =
        `${stats.totalAttempts} quiz${stats.totalAttempts !== 1 ? 'zes' : ''}`;
      document.getElementById('stat-best').textContent =
        stats.bestMock != null ? `Best mock: ${stats.bestMock}/30` : '';
      document.getElementById('stat-avg').textContent =
        stats.avgMock != null ? `Avg mock: ${stats.avgMock}/30` : '';
      document.getElementById('stat-passed').textContent =
        stats.mockAttempts > 0
          ? `Passed: ${stats.mocksPassed}/${stats.mockAttempts}`
          : '';

      // Hide empty pills
      ['stat-best','stat-avg','stat-passed'].forEach(id => {
        const el = document.getElementById(id);
        el.style.display = el.textContent ? '' : 'none';
      });

      strip.classList.remove('hidden');
    } else {
      strip.classList.add('hidden');
    }

    // Topic bars (weakest topics)
    const topics = Store.getTopicPerformance(id);
    if (topics.length === 0) {
      document.getElementById('progress-summary').classList.add('hidden');
      return;
    }
    const bars = document.getElementById('topic-bars');
    bars.innerHTML = '';
    topics.slice(0, 6).forEach(t => {
      const color = t.rate >= 80 ? '#3DAA70' : t.rate >= 60 ? '#E09020' : '#E04050';
      bars.innerHTML += `
        <div class="topic-bar">
          <div class="topic-bar-label">
            <span>${t.topic}</span>
            <span style="color:${color};font-weight:700">${t.rate}%</span>
          </div>
          <div class="topic-bar-track">
            <div class="topic-bar-fill" style="width:${t.rate}%;background:${color}"></div>
          </div>
        </div>`;
    });
    document.getElementById('progress-summary').classList.remove('hidden');
  }

  // ── Home nav ──────────────────────────────────────────────
  function goHome()        { loadProgress(); show('screen-home'); }
  function startStudy()    { show('screen-study-setup'); }
  function startPractice() { show('screen-practice-setup'); }

  function startMock() {
    const qs = shuffle(QUESTIONS).slice(0, 30);
    if (qs.length < 30) { alert('Not enough questions for a full mock exam!'); return; }
    state.lastQuizParams = { mode: 'mock' };
    beginQuiz('mock', qs);
  }

  function startMissed() {
    const id       = Store.getCurrentProfileId();
    const missed   = Store.getMissedIds(id);
    if (!missed.length) { alert("You haven't missed any questions yet! Keep practicing 🍄"); return; }
    const qs = shuffle(QUESTIONS.filter(q => missed.includes(q._id))).slice(0, 20);
    state.lastQuizParams = { mode: 'missed' };
    beginQuiz('missed', qs);
  }

  // ── Study ─────────────────────────────────────────────────
  function launchStudy() {
    const section = document.getElementById('study-section').value;
    const topic   = document.getElementById('study-topic').value;
    let qs = QUESTIONS;
    if (section) qs = qs.filter(q => q.section === section);
    if (topic)   qs = qs.filter(q => q.topic   === topic);
    if (!qs.length) { alert('No questions found for that selection.'); return; }
    state.studyQuestions = qs;
    state.studyIdx       = 0;
    state.studyRevealed  = false;
    renderStudyCard();
    show('screen-study');
  }

  function renderStudyCard() {
    const q     = state.studyQuestions[state.studyIdx];
    const total = state.studyQuestions.length;
    document.getElementById('study-counter').textContent       = `${state.studyIdx + 1} / ${total}`;
    document.getElementById('study-section-label').textContent = q.section;
    document.getElementById('study-topic-label').textContent   = q.topic;
    document.getElementById('study-question').textContent      = q.question;

    const answers = document.getElementById('study-answers');
    answers.innerHTML = '';
    ['A','B','C','D'].forEach(letter => {
      const isCorrect = letter === q.correct_answer;
      const btn = document.createElement('button');
      btn.className = 'answer-option' + (state.studyRevealed && isCorrect ? ' correct' : '');
      btn.disabled  = state.studyRevealed;
      btn.innerHTML = `<span class="answer-letter">${letter}</span><span>${q['answer_'+letter.toLowerCase()]}</span>`;
      if (!state.studyRevealed) btn.addEventListener('click', () => revealStudyAnswer(letter));
      answers.appendChild(btn);
    });

    const exp = document.getElementById('study-explanation');
    if (state.studyRevealed) { exp.textContent = q.explanation; exp.classList.remove('hidden'); }
    else exp.classList.add('hidden');

    document.getElementById('btn-study-prev').disabled =
      state.studyIdx === 0;
    document.getElementById('btn-study-next').textContent =
      state.studyIdx === total - 1 ? 'Finish' : 'Next →';
  }

  function revealStudyAnswer(selected) {
    state.studyRevealed = true;
    const q = state.studyQuestions[state.studyIdx];
    document.querySelectorAll('#study-answers .answer-option').forEach((btn, i) => {
      const letter = ['A','B','C','D'][i];
      btn.disabled = true;
      if (letter === q.correct_answer) btn.classList.add('correct');
      if (letter === selected && selected !== q.correct_answer) btn.classList.add('wrong');
    });
    const exp = document.getElementById('study-explanation');
    exp.textContent = q.explanation;
    exp.classList.remove('hidden');
  }

  function studyPrev() {
    if (state.studyIdx > 0) { state.studyIdx--; state.studyRevealed = false; renderStudyCard(); }
  }

  function studyNext() {
    if (state.studyIdx < state.studyQuestions.length - 1) {
      state.studyIdx++; state.studyRevealed = false; renderStudyCard();
    } else {
      goHome();
    }
  }

  // ── Practice ──────────────────────────────────────────────
  function launchPractice() {
    const section = document.getElementById('practice-section').value;
    const topic   = document.getElementById('practice-topic').value;
    const limit   = parseInt(document.querySelector('input[name="practice-count"]:checked').value);
    let qs = QUESTIONS;
    if (section) qs = qs.filter(q => q.section === section);
    if (topic)   qs = qs.filter(q => q.topic   === topic);
    qs = shuffle(qs).slice(0, limit);
    if (!qs.length) { alert('No questions found for that selection.'); return; }
    state.lastQuizParams = { mode: 'practice', section, topic, limit };
    beginQuiz('practice', qs);
  }

  // ── Quiz engine ───────────────────────────────────────────
  function beginQuiz(mode, questions) {
    Object.assign(state, {
      quizMode: mode, questions, currentIdx: 0,
      answers: [], selectedAnswer: null, selectedConfidence: null,
    });
    const labels = { practice: '🧚 Practice Quiz', mock: '🦄 Mock Exam', missed: '🍄 Missed Questions' };
    document.getElementById('quiz-mode-label').textContent = labels[mode] || 'Quiz';
    renderQuestion();
    show('screen-quiz');
  }

  function renderQuestion() {
    const q     = state.questions[state.currentIdx];
    const total = state.questions.length;
    state.selectedAnswer = state.selectedConfidence = null;

    document.getElementById('quiz-counter').textContent          = `${state.currentIdx + 1} / ${total}`;
    document.getElementById('quiz-progress-fill').style.width    = `${(state.currentIdx / total) * 100}%`;
    document.getElementById('quiz-section-label').textContent    = q.section;
    document.getElementById('quiz-topic-label').textContent      = q.topic;
    document.getElementById('quiz-question').textContent         = q.question;

    const div = document.getElementById('quiz-answers');
    div.innerHTML = '';
    ['A','B','C','D'].forEach(letter => {
      const btn = document.createElement('button');
      btn.className      = 'answer-option';
      btn.dataset.letter = letter;
      btn.innerHTML      = `<span class="answer-letter">${letter}</span><span>${q['answer_'+letter.toLowerCase()]}</span>`;
      btn.addEventListener('click', () => selectAnswer(letter));
      div.appendChild(btn);
    });

    document.getElementById('confidence-block').classList.add('hidden');
    document.getElementById('btn-next-question').classList.add('hidden');
    document.getElementById('btn-submit-quiz').classList.add('hidden');
  }

  function selectAnswer(letter) {
    if (state.selectedAnswer) return;
    state.selectedAnswer = letter;
    document.querySelectorAll('#quiz-answers .answer-option').forEach(btn => {
      btn.classList.toggle('selected', btn.dataset.letter === letter);
      btn.disabled = true;
    });
    document.getElementById('confidence-block').classList.remove('hidden');
    document.querySelectorAll('.conf-btn').forEach(b => b.classList.remove('selected'));
  }

  function setConfidence(btn) {
    state.selectedConfidence = btn.dataset.val;
    document.querySelectorAll('.conf-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    const isLast = state.currentIdx === state.questions.length - 1;
    document.getElementById('btn-next-question').classList.toggle('hidden', isLast);
    document.getElementById('btn-submit-quiz').classList.toggle('hidden', !isLast);
  }

  function nextQuestion() {
    if (!state.selectedAnswer) return;
    recordCurrentAnswer();
    state.currentIdx++;
    renderQuestion();
  }

  function recordCurrentAnswer() {
    const q = state.questions[state.currentIdx];
    state.answers.push({
      questionId:     q._id,
      question:       q,
      selectedAnswer: state.selectedAnswer,
      correct:        state.selectedAnswer === q.correct_answer,
      confidence:     state.selectedConfidence || 'somewhat',
    });
  }

  function submitQuiz() {
    if (!state.selectedAnswer) return;
    recordCurrentAnswer();
    const profileId = Store.getCurrentProfileId();
    Store.recordAttempt(profileId, state.quizMode, state.answers.map(a => ({
      questionId: a.questionId, selectedAnswer: a.selectedAnswer,
      correct: a.correct, confidence: a.confidence,
    })));
    renderResults();
    show('screen-results');
  }

  function confirmQuit() {
    if (state.answers.length > 0 || state.selectedAnswer) {
      if (!confirm('Quit this quiz? Your progress will be lost.')) return;
    }
    goHome();
  }

  // ── Results ───────────────────────────────────────────────
  function renderResults() {
    const answers = state.answers;
    const score   = answers.filter(a => a.correct).length;
    const total   = answers.length;
    const pct     = Math.round((score / total) * 100);

    const passMessages = [
      '🦄 The unicorns are so proud of you!',
      '🧚 The fairy quizmaster is delighted!',
      '🌟 The woodland folk cheer your name!',
      '✨ Magical! You passed with flying colors!',
    ];
    const failMessages = [
      '🍄 The mushrooms believe in you — try again!',
      '🧙 The gnome wizard says: more studying awaits!',
      '🌱 Every great driver starts somewhere. Keep going!',
      '🧚 The fairy quizmaster knows you can do it!',
    ];

    const encouragement = pct === 100 ? '🌟 Perfect score! Absolutely magical!'
      : pct >= 90 ? '🦄 Incredible work!'
      : pct >= 80 ? '🧚 Great job!'
      : pct >= 70 ? '🍄 Solid effort!'
      : '🧙 Keep practicing!';

    let passHTML = '';
    if (state.quizMode === 'mock') {
      const passed = score >= 24;
      const msg    = passed
        ? passMessages[Math.floor(Math.random() * passMessages.length)]
        : failMessages[Math.floor(Math.random() * failMessages.length)];
      passHTML = `
        <div class="pass-badge ${passed ? 'pass' : 'fail'}">${passed ? '🦄 PASS' : '🍄 Not Yet'}</div>
        <div style="margin-top:12px;font-size:0.95rem;color:var(--text-muted);font-weight:600">${msg}</div>`;
    }

    document.getElementById('results-score-card').innerHTML = `
      <div class="score-big">${score}<span style="font-size:1.5rem;color:var(--text-muted)"> / ${total}</span></div>
      <div class="score-label">${pct}% correct — ${encouragement}</div>
      ${passHTML}
      ${state.quizMode === 'mock'
        ? `<div style="margin-top:8px;font-size:0.8rem;color:var(--text-muted);font-weight:600">Need 24/30 (80%) to pass</div>`
        : ''}`;

    // Weak topics
    const profileId  = Store.getCurrentProfileId();
    const weakTopics = Store.getTopicPerformance(profileId).slice(0, 5);
    const weakDiv    = document.getElementById('results-weak');
    if (weakTopics.length > 0) {
      document.getElementById('weak-list').innerHTML = weakTopics.map(t => {
        const cls = t.rate >= 80 ? 'good' : t.rate >= 60 ? 'mid' : 'low';
        return `<div class="weak-topic-row">
          <span>${t.topic}</span>
          <span class="weak-pct ${cls}">${t.rate}%</span>
        </div>`;
      }).join('');
      weakDiv.classList.remove('hidden');
    } else {
      weakDiv.classList.add('hidden');
    }

    // Review list
    document.getElementById('review-list').innerHTML = answers.map(a => {
      const q           = a.question;
      const correctText = q['answer_' + q.correct_answer.toLowerCase()];
      const selectedText = q['answer_' + a.selectedAnswer.toLowerCase()];
      return `
        <div class="review-item ${a.correct ? 'correct' : 'wrong'}">
          <div class="review-q">${q.question}</div>
          ${!a.correct
            ? `<div class="review-ans wrong-ans">Your answer: <span>${a.selectedAnswer}. ${selectedText}</span></div>`
            : ''}
          <div class="review-ans correct-ans">Correct answer: <span>${q.correct_answer}. ${correctText}</span></div>
          <div class="review-exp">${q.explanation}</div>
        </div>`;
    }).join('');
  }

  function retakeQuiz() {
    const p = state.lastQuizParams;
    if (!p) { goHome(); return; }
    if (p.mode === 'mock')    startMock();
    else if (p.mode === 'missed') startMissed();
    else launchPractice();
  }

  // ── History screen ────────────────────────────────────────
  function showHistory() {
    const profileId = Store.getCurrentProfileId();
    if (!profileId) return;

    const attempts = Store.getAttempts(profileId);
    const stats    = Store.getProfileStats(profileId);

    // Hide detail, show list
    document.getElementById('attempt-detail').classList.add('hidden');
    document.getElementById('history-list').style.display = '';

    // Stats cards
    const statsEl = document.getElementById('history-stats');
    if (attempts.length > 0) {
      document.getElementById('hstat-total').innerHTML =
        `<div class="hstat-value">${stats.totalAttempts}</div><div class="hstat-label">Total Quizzes</div>`;
      document.getElementById('hstat-mocks').innerHTML =
        `<div class="hstat-value">${stats.mockAttempts}</div><div class="hstat-label">Mock Exams</div>`;
      document.getElementById('hstat-best').innerHTML =
        `<div class="hstat-value">${stats.bestMock != null ? stats.bestMock + '/30' : '—'}</div><div class="hstat-label">Best Mock</div>`;
      document.getElementById('hstat-avg').innerHTML =
        `<div class="hstat-value">${stats.avgMock != null ? stats.avgMock + '/30' : '—'}</div><div class="hstat-label">Avg Mock</div>`;
      document.getElementById('hstat-passed').innerHTML =
        `<div class="hstat-value">${stats.mockAttempts > 0 ? stats.mocksPassed + '/' + stats.mockAttempts : '—'}</div><div class="hstat-label">Passed</div>`;
      statsEl.classList.remove('hidden');
    } else {
      statsEl.classList.add('hidden');
    }

    // Chart
    renderMockChart(profileId);

    // Attempt list
    const listEl = document.getElementById('history-list');
    if (!attempts.length) {
      listEl.innerHTML = `
        <div class="history-empty">
          <div class="empty-icon">🍄</div>
          No quizzes taken yet!<br>Take your first quiz and the mushrooms will remember everything.
        </div>`;
    } else {
      const modeIcon  = { mock: '🦄', practice: '🧚', missed: '🍄' };
      const modeLabel = { mock: 'Mock Exam', practice: 'Practice Quiz', missed: 'Missed Questions' };
      listEl.innerHTML = attempts.map(a => {
        const pct     = Math.round((a.score / a.total) * 100);
        const rowCls  = a.mode === 'mock'
          ? (a.passed ? 'pass' : 'fail')
          : a.mode;
        const badge   = a.mode === 'mock'
          ? `<span class="attempt-badge ${a.passed ? 'pass' : 'fail'}">${a.passed ? '🦄 PASS' : '🍄 Fail'}</span>`
          : '';
        return `
          <div class="attempt-row ${rowCls}" onclick="App.viewAttempt('${a.id}')">
            <span class="attempt-mode-icon">${modeIcon[a.mode] || '📝'}</span>
            <div class="attempt-info">
              <div class="attempt-title">${modeLabel[a.mode] || a.mode}</div>
              <div class="attempt-date">${formatDate(a.date)}</div>
            </div>
            <div class="attempt-score">
              ${a.score}/${a.total}
              <span class="pct">${pct}%</span>
            </div>
            ${badge}
          </div>`;
      }).join('');
    }

    show('screen-history');
  }

  function renderMockChart(profileId) {
    const mocks   = Store.getAttempts(profileId, 'mock').slice().reverse(); // oldest first
    const wrap    = document.getElementById('history-chart-wrap');
    if (mocks.length < 2) { wrap.classList.add('hidden'); return; }

    wrap.classList.remove('hidden');
    const canvas  = document.getElementById('history-chart');
    const ctx     = canvas.getContext('2d');
    const W       = canvas.parentElement.clientWidth || 600;
    const H       = 160;
    canvas.width  = W;
    canvas.height = H;

    const PAD     = { top: 16, right: 20, bottom: 28, left: 32 };
    const cW      = W - PAD.left - PAD.right;
    const cH      = H - PAD.top  - PAD.bottom;

    ctx.clearRect(0, 0, W, H);

    // Grid lines at 0, 12, 24, 30
    const gridScores = [0, 12, 24, 30];
    ctx.strokeStyle = '#E8E0F0';
    ctx.lineWidth   = 1;
    ctx.fillStyle   = '#888';
    ctx.font        = '11px Nunito, sans-serif';
    ctx.textAlign   = 'right';

    gridScores.forEach(s => {
      const y = PAD.top + cH - (s / 30) * cH;
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(PAD.left + cW, y); ctx.stroke();
      ctx.fillText(s, PAD.left - 4, y + 4);
    });

    // Pass line at 24
    const passY = PAD.top + cH - (24 / 30) * cH;
    ctx.strokeStyle = 'rgba(61,170,112,0.4)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(PAD.left, passY); ctx.lineTo(PAD.left + cW, passY); ctx.stroke();
    ctx.setLineDash([]);

    // Trend line
    const xStep = mocks.length > 1 ? cW / (mocks.length - 1) : 0;
    const pts    = mocks.map((m, i) => ({
      x: PAD.left + i * xStep,
      y: PAD.top + cH - (m.score / 30) * cH,
      passed: m.passed,
      score:  m.score,
    }));

    ctx.strokeStyle = '#9C40C0';
    ctx.lineWidth   = 2;
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
    ctx.stroke();

    // Dots
    pts.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = p.passed ? '#3DAA70' : '#E04050';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth   = 2;
      ctx.stroke();
    });

    // X-axis date labels (first, last, maybe middle)
    ctx.fillStyle   = '#888';
    ctx.font        = '10px Nunito, sans-serif';
    ctx.textAlign   = 'center';
    const labelIdxs = mocks.length <= 6
      ? mocks.map((_, i) => i)
      : [0, Math.floor(mocks.length / 2), mocks.length - 1];

    labelIdxs.forEach(i => {
      const d = new Date(mocks[i].date);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      ctx.fillText(label, PAD.left + i * xStep, H - 6);
    });
  }

  function viewAttempt(attemptId) {
    const profileId = Store.getCurrentProfileId();
    const attempt   = Store.getAttemptById(profileId, attemptId);
    if (!attempt) return;

    const modeLabel = { mock: '🦄 Mock Exam', practice: '🧚 Practice Quiz', missed: '🍄 Missed Questions' };
    const pct       = Math.round((attempt.score / attempt.total) * 100);

    document.getElementById('attempt-detail-title').textContent =
      `${modeLabel[attempt.mode] || attempt.mode} — ${formatDate(attempt.date)}`;

    const scoreColor = attempt.mode === 'mock'
      ? (attempt.passed ? 'var(--success)' : 'var(--danger)')
      : 'var(--fairy)';

    // Build per-question review
    const reviewHTML = attempt.answers.map(a => {
      const q           = QUESTIONS[a.questionId];
      if (!q) return '';
      const correctText  = q['answer_' + q.correct_answer.toLowerCase()];
      const selectedText = q['answer_' + a.selectedAnswer.toLowerCase()];
      return `
        <div class="review-item ${a.correct ? 'correct' : 'wrong'}">
          <div class="review-q">${q.question}</div>
          ${!a.correct
            ? `<div class="review-ans wrong-ans">Your answer: <span>${a.selectedAnswer}. ${selectedText}</span></div>`
            : ''}
          <div class="review-ans correct-ans">Correct: <span>${q.correct_answer}. ${correctText}</span></div>
          <div class="review-exp">${q.explanation}</div>
        </div>`;
    }).join('');

    document.getElementById('attempt-detail-body').innerHTML = `
      <div style="text-align:center;padding:20px 0 24px;border-bottom:2px solid var(--fairy-light);margin-bottom:20px">
        <div style="font-family:'Fredoka One',cursive;font-size:3rem;color:${scoreColor}">
          ${attempt.score}<span style="font-size:1.4rem;color:var(--text-muted)">/${attempt.total}</span>
        </div>
        <div style="font-weight:700;color:var(--text-muted);margin-top:4px">${pct}% correct</div>
        ${attempt.mode === 'mock'
          ? `<div style="margin-top:12px">
               <span class="pass-badge ${attempt.passed ? 'pass' : 'fail'}" style="display:inline-block">
                 ${attempt.passed ? '🦄 PASS' : '🍄 Not Yet'}
               </span>
             </div>`
          : ''}
      </div>
      <div class="review-section" style="margin-top:0">
        <h3>📖 Question Review</h3>
        ${reviewHTML}
      </div>`;

    // Show detail, hide list
    document.getElementById('history-list').style.display = 'none';
    document.getElementById('attempt-detail').classList.remove('hidden');
    window.scrollTo(0, 0);
  }

  function closeAttemptDetail() {
    document.getElementById('attempt-detail').classList.add('hidden');
    document.getElementById('history-list').style.display = '';
    window.scrollTo(0, 0);
  }

  function clearHistory() {
    if (!confirm('Clear all quiz history and progress? This cannot be undone.')) return;
    const id = Store.getCurrentProfileId();
    Store.clearHistory(id);
    showHistory(); // re-render the now-empty screen
  }


  // ── Export / Import ───────────────────────────────────────

  function exportProfile() {
    const profileId = Store.getCurrentProfileId();
    if (!profileId) return;
    const profile = Store.getCurrentProfile();
    const data    = Store.exportProfile(profileId);
    const name    = (profile?.name || 'profile').toLowerCase().replace(/[^a-z0-9]/g, '-');
    const date    = new Date().toISOString().slice(0, 10);
    downloadJSON(data, `maine-permit-${name}-${date}.json`);
  }

  function exportAll() {
    const data = Store.exportAll();
    const date = new Date().toISOString().slice(0, 10);
    downloadJSON(data, `maine-permit-all-profiles-${date}.json`);
  }

  function downloadJSON(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleImportFile(input) {
    const file = input.files[0];
    if (!file) return;

    const resultEl = document.getElementById('import-result');
    resultEl.className = 'import-result hidden';

    const reader = new FileReader();
    reader.onload = e => {
      try {
        const blob   = JSON.parse(e.target.result);
        const result = Store.importData(blob);

        if (result.errors.length > 0 && result.imported === 0) {
          resultEl.textContent = '❌ ' + result.errors.join(' ');
          resultEl.className   = 'import-result error';
        } else {
          const msgs = [];
          if (result.imported > 0) msgs.push(`✅ Imported successfully!`);
          if (result.skipped > 0)  msgs.push(`(${result.skipped} already up to date)`);
          if (result.errors.length) msgs.push(result.errors.join(' '));
          resultEl.textContent = msgs.join(' ');
          resultEl.className   = 'import-result success';

          // Refresh the profile list
          renderProfileList();

          // If the restored profile is the current one, refresh home
          const current = Store.getCurrentProfile();
          if (current) enterHome(current);
        }
      } catch {
        resultEl.textContent = '❌ Could not read file. Make sure it is a valid Maine Permit backup.';
        resultEl.className   = 'import-result error';
      }
      // Reset the input so the same file can be re-selected
      input.value = '';
    };
    reader.readAsText(file);
  }

  function setupImportDragDrop() {
    const zone = document.getElementById('import-drop-zone');
    if (!zone) return;

    zone.addEventListener('click', () => document.getElementById('import-file-input').click());

    zone.addEventListener('dragover', e => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));

    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) {
        const fakeInput = { files: [file] };
        handleImportFile(fakeInput);
      }
    });
  }

  // ── Public API ────────────────────────────────────────────
  return {
    init,
    addProfile, selectProfile, deleteProfile, switchProfile,
    goHome, startStudy, startPractice, startMock, startMissed,
    launchStudy, launchPractice,
    studyPrev, studyNext,
    setConfidence, nextQuestion, submitQuiz, confirmQuit, retakeQuiz,
    showHistory, viewAttempt, closeAttemptDetail, clearHistory,
    exportProfile, exportAll, handleImportFile,
  };
})();

document.addEventListener('DOMContentLoaded', App.init);
