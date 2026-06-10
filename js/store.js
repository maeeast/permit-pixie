// store.js — all persistence via localStorage
// Data shape:
//   mp_profiles: [{ id, name, mascot, createdAt }]
//   mp_progress_<id>: {
//     topicStats: { [topic]: { correct, total, section } },
//     missedIds: [questionId, ...],
//     attempts: [{
//       id, date, mode, score, total, passed,
//       answers: [{ questionId, selectedAnswer, correct, confidence }]
//     }]
//   }

const Store = (() => {

  // ── Profiles ──────────────────────────────────────────────
  function getProfiles() {
    try { return JSON.parse(localStorage.getItem('mp_profiles') || '[]'); }
    catch { return []; }
  }

  function saveProfiles(profiles) {
    localStorage.setItem('mp_profiles', JSON.stringify(profiles));
  }

  function addProfile(name, mascot) {
    const profiles = getProfiles();
    const id = 'p_' + Date.now();
    profiles.push({ id, name, mascot, createdAt: new Date().toISOString() });
    saveProfiles(profiles);
    return id;
  }

  function deleteProfile(id) {
    saveProfiles(getProfiles().filter(p => p.id !== id));
    localStorage.removeItem('mp_progress_' + id);
  }

  // ── Session ───────────────────────────────────────────────
  function getCurrentProfileId() {
    return sessionStorage.getItem('mp_current');
  }

  function setCurrentProfileId(id) {
    sessionStorage.setItem('mp_current', id);
  }

  function getCurrentProfile() {
    const id = getCurrentProfileId();
    if (!id) return null;
    return getProfiles().find(p => p.id === id) || null;
  }

  // ── Progress core ─────────────────────────────────────────
  function getProgress(profileId) {
    try {
      return JSON.parse(localStorage.getItem('mp_progress_' + profileId) || 'null') ||
        { topicStats: {}, missedIds: [], attempts: [] };
    } catch {
      return { topicStats: {}, missedIds: [], attempts: [] };
    }
  }

  function saveProgress(profileId, progress) {
    localStorage.setItem('mp_progress_' + profileId, JSON.stringify(progress));
  }

  // ── Record attempt ────────────────────────────────────────
  // answers: [{ questionId, selectedAnswer, correct, confidence }]
  function recordAttempt(profileId, mode, answers) {
    const progress = getProgress(profileId);
    if (!progress.attempts) progress.attempts = [];

    // Update topic stats
    answers.forEach(a => {
      const q = QUESTIONS.find(q => q._id === a.questionId);
      if (!q) return;
      if (!progress.topicStats[q.topic]) {
        progress.topicStats[q.topic] = { correct: 0, total: 0, section: q.section };
      }
      progress.topicStats[q.topic].total++;
      if (a.correct) progress.topicStats[q.topic].correct++;
    });

    // Update missed IDs
    answers.forEach(a => {
      if (!a.correct && !progress.missedIds.includes(a.questionId)) {
        progress.missedIds.push(a.questionId);
      }
      if (a.correct && a.confidence === 'sure') {
        progress.missedIds = progress.missedIds.filter(id => id !== a.questionId);
      }
    });

    // Save full attempt record (no cap — keep everything)
    const score  = answers.filter(a => a.correct).length;
    const total  = answers.length;
    const passed = mode === 'mock' ? score >= 24 : null;

    progress.attempts.unshift({
      id:      'a_' + Date.now(),
      date:    new Date().toISOString(),
      mode,
      score,
      total,
      passed,
      answers: answers.map(a => ({
        questionId:     a.questionId,
        selectedAnswer: a.selectedAnswer,
        correct:        a.correct,
        confidence:     a.confidence,
      })),
    });

    saveProgress(profileId, progress);
    return progress;
  }

  // ── Queries ───────────────────────────────────────────────
  function getAttempts(profileId, mode) {
    const { attempts } = getProgress(profileId);
    if (!attempts) return [];
    return mode ? attempts.filter(a => a.mode === mode) : attempts;
  }

  function getAttemptById(profileId, attemptId) {
    return getAttempts(profileId).find(a => a.id === attemptId) || null;
  }

  function getTopicPerformance(profileId) {
    const { topicStats } = getProgress(profileId);
    return Object.entries(topicStats).map(([topic, s]) => ({
      topic,
      section:  s.section,
      correct:  s.correct,
      total:    s.total,
      rate:     s.total > 0 ? Math.round((s.correct / s.total) * 100) : 0,
    })).sort((a, b) => a.rate - b.rate);
  }

  function getMissedIds(profileId) {
    return getProgress(profileId).missedIds || [];
  }

  function getProfileStats(profileId) {
    const attempts = getAttempts(profileId);
    const mocks    = attempts.filter(a => a.mode === 'mock');
    const passed   = mocks.filter(a => a.passed).length;

    const mockScores = mocks.map(a => a.score);
    const bestMock   = mockScores.length ? Math.max(...mockScores) : null;
    const avgMock    = mockScores.length
      ? Math.round(mockScores.reduce((s, n) => s + n, 0) / mockScores.length)
      : null;

    return {
      totalAttempts: attempts.length,
      mockAttempts:  mocks.length,
      mocksPassed:   passed,
      bestMock,
      avgMock,
    };
  }

  function clearHistory(profileId) {
    const progress = getProgress(profileId);
    progress.attempts    = [];
    progress.topicStats  = {};
    progress.missedIds   = [];
    saveProgress(profileId, progress);
  }

  return {
    getProfiles, addProfile, deleteProfile,
    getCurrentProfileId, setCurrentProfileId, getCurrentProfile,
    getProgress, getTopicPerformance, getMissedIds, getProfileStats,
    recordAttempt, getAttempts, getAttemptById, clearHistory,
    exportProfile, exportAll, importData,
  };
})();

  // ── Export / Import ───────────────────────────────────────

  // Export a single profile's complete data as a JSON object
  function exportProfile(profileId) {
    const profile  = getProfiles().find(p => p.id === profileId);
    if (!profile) return null;
    return {
      exportVersion: 1,
      exportDate:    new Date().toISOString(),
      profile,
      progress:      getProgress(profileId),
    };
  }

  // Export ALL profiles and their data
  function exportAll() {
    const profiles = getProfiles();
    return {
      exportVersion: 1,
      exportDate:    new Date().toISOString(),
      profiles: profiles.map(p => ({
        profile:  p,
        progress: getProgress(p.id),
      })),
    };
  }

  // Import a saved export blob. Merges into existing localStorage.
  // Returns { imported: number, skipped: number, errors: string[] }
  function importData(blob) {
    const result = { imported: 0, skipped: 0, errors: [] };

    if (!blob || blob.exportVersion !== 1) {
      result.errors.push('Unrecognised file format.');
      return result;
    }

    // Normalise: single-profile export or multi-profile export
    const entries = blob.profiles
      ? blob.profiles
      : [{ profile: blob.profile, progress: blob.progress }];

    const existing = getProfiles();

    entries.forEach(({ profile, progress }) => {
      if (!profile || !profile.id || !profile.name) {
        result.errors.push('Skipped an entry — missing profile data.');
        result.skipped++;
        return;
      }

      // If profile already exists, merge attempts (add any we don't have yet)
      const existingProfile = existing.find(p => p.id === profile.id);
      if (existingProfile) {
        const current   = getProgress(profile.id);
        const incoming  = progress || {};
        const existingAttemptIds = new Set((current.attempts || []).map(a => a.id));
        const newAttempts = (incoming.attempts || []).filter(a => !existingAttemptIds.has(a.id));

        if (newAttempts.length > 0) {
          // Merge: prepend new attempts, re-sort by date descending
          current.attempts = [...(current.attempts || []), ...newAttempts]
            .sort((a, b) => new Date(b.date) - new Date(a.date));

          // Rebuild topic stats from scratch from merged attempts
          current.topicStats = rebuildTopicStats(current.attempts);

          // Rebuild missed IDs
          current.missedIds = rebuildMissedIds(current.attempts);

          saveProgress(profile.id, current);
          result.imported += newAttempts.length;
        } else {
          result.skipped++;
        }
        return;
      }

      // New profile — add it
      existing.push(profile);
      saveProgress(profile.id, progress || { topicStats: {}, missedIds: [], attempts: [] });
      result.imported++;
    });

    saveProfiles(existing);
    return result;
  }

  // Rebuild topic stats by replaying all attempt answers
  function rebuildTopicStats(attempts) {
    const stats = {};
    (attempts || []).forEach(attempt => {
      (attempt.answers || []).forEach(a => {
        const q = QUESTIONS[a.questionId];
        if (!q) return;
        if (!stats[q.topic]) stats[q.topic] = { correct: 0, total: 0, section: q.section };
        stats[q.topic].total++;
        if (a.correct) stats[q.topic].correct++;
      });
    });
    return stats;
  }

  // Rebuild missed IDs by replaying all attempts (last answer per question wins)
  function rebuildMissedIds(attempts) {
    // replay oldest-first so latest answer is the final state
    const sorted = [...(attempts || [])].sort((a, b) => new Date(a.date) - new Date(b.date));
    const lastAnswer = {}; // questionId -> { correct, confidence }
    sorted.forEach(attempt => {
      (attempt.answers || []).forEach(a => {
        lastAnswer[a.questionId] = { correct: a.correct, confidence: a.confidence };
      });
    });
    return Object.entries(lastAnswer)
      .filter(([, v]) => !v.correct || v.confidence !== 'sure')
      .filter(([, v]) => !v.correct)
      .map(([id]) => parseInt(id));
  }

  // Expose new functions
