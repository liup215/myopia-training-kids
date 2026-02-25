/**
 * progress.js - localStorage progress tracking
 */

const Progress = (() => {
  const STORAGE_KEY = 'myopia_training_progress';

  function getTodayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      return {};
    }
  }

  function save(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Could not save progress:', e);
    }
  }

  function getToday() {
    const all = load();
    const key = getTodayKey();
    if (!all[key]) all[key] = { completed: {}, stars: 0 };
    return all[key];
  }

  function markCompleted(taskId) {
    const all = load();
    const key = getTodayKey();
    if (!all[key]) all[key] = { completed: {}, stars: 0 };
    all[key].completed[taskId] = true;
    all[key].stars = Object.keys(all[key].completed).length;
    save(all);
  }

  function isCompleted(taskId) {
    return !!getToday().completed[taskId];
  }

  function getTodayStars() {
    return getToday().stars || 0;
  }

  function getTodayCompletedCount() {
    const today = getToday();
    return Object.keys(today.completed).length;
  }

  function getStreak() {
    const all = load();
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (all[key] && all[key].stars > 0) {
        streak++;
      } else if (i > 0) {
        break;
      }
    }
    return streak;
  }

  return { markCompleted, isCompleted, getTodayStars, getTodayCompletedCount, getStreak, getTodayKey };
})();
