/**
 * CFR Mastery Levels
 */
export const CFR_LEVELS = [
  { level: 1, name: "New Seed", icon: "🌱", intervalDays: 1 },
  { level: 2, name: "Growing", icon: "🌿", intervalDays: 3 },
  { level: 3, name: "Strong Tree", icon: "🌳", intervalDays: 7 },
  { level: 4, name: "Stable Palm", icon: "🌴", intervalDays: 21 }
];

/**
 * CFR Grading States
 */
export const CFR_GRADES = {
  HAPPY: "happy",
  OKAY: "okay",
  TRY_AGAIN: "try_again"
};

/**
 * Calculates next suggested review date based on CFR logic
 */
export function calculateNextReview(currentLevel, grade) {
  const now = new Date();
  let nextLevel = currentLevel || 1;
  let intervalDays = 1;

  if (grade === CFR_GRADES.HAPPY) {
    if (nextLevel < 4) nextLevel += 1;
    intervalDays = CFR_LEVELS.find(l => l.level === nextLevel).intervalDays;
  } else if (grade === CFR_GRADES.OKAY) {
    intervalDays = CFR_LEVELS.find(l => l.level === nextLevel).intervalDays;
  } else if (grade === CFR_GRADES.TRY_AGAIN) {
    // Keep level same but refresh tomorrow
    intervalDays = 1;
  }

  const nextDate = new Date(now);
  nextDate.setDate(now.getDate() + intervalDays);
  
  return {
    nextLevel,
    nextSuggested: nextDate.toISOString()
  };
}

/**
 * Calculates internal priority score for recommendations
 */
export function calculatePriority(progress) {
  const now = new Date();
  const nextSuggested = new Date(progress.nextSuggested || now);
  
  // Calculate days late
  const diffTime = now - nextSuggested;
  const daysLate = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));

  const dueWeight = Math.min(daysLate, 5) * 0.7;
  const favoriteBoost = progress.favorite ? 2 : 0;
  const struggleBoost = progress.lastGrade === CFR_GRADES.TRY_AGAIN ? 1.5 : 0;

  return dueWeight + favoriteBoost + struggleBoost;
}

/**
 * Determines if a surah should be chunked or kept whole
 */
export function getSurahChunks(surahId, ayahCount) {
  // Surahs in Juz Amma (78-114) that are very short
  const shortSurahs = [1, 103, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114];
  
  if (shortSurahs.includes(surahId) || ayahCount <= 10) {
    return [{ start: 1, end: ayahCount, id: `${surahId}-full` }];
  }

  // Otherwise chunk by 3 ayahs
  const chunks = [];
  for (let i = 1; i <= ayahCount; i += 3) {
    const end = Math.min(i + 2, ayahCount);
    chunks.push({ start: i, end, id: `${surahId}-${i}-${end}` });
  }
  return chunks;
}

/**
 * Forgiving Mercy Streak logic
 */
export function getStreakDays(sessions) {
  if (!sessions || sessions.length === 0) return 0;

  const sortedDates = [...new Set(sessions.map(s => {
    const d = new Date(s.date);
    return d.toDateString();
  }))].sort((a, b) => new Date(b) - new Date(a));

  let streak = 0;
  let graceUsed = 0;
  const maxGrace = 2; // 2 grace days in a rolling window
  
  const today = new Date();
  today.setHours(0,0,0,0);
  
  let currentCheck = new Date(today);

  // If didn't study today, check if yesterday exists
  if (sortedDates[0] !== today.toDateString()) {
    currentCheck.setDate(currentCheck.getDate() - 1);
    if (sortedDates[0] !== currentCheck.toDateString()) {
      // If neither today nor yesterday, check if we're still within grace
      // But for simplicity of MVP: if yesterday was skipped, we start counting grace
    }
  }

  while (true) {
    const dateStr = currentCheck.toDateString();
    if (sortedDates.includes(dateStr)) {
      streak++;
    } else {
      graceUsed++;
      if (graceUsed > maxGrace) break;
      // Streak freezes on grace days
    }
    currentCheck.setDate(currentCheck.getDate() - 1);
    
    // Safety break
    if (streak > 1000) break;
  }

  return streak;
}

export function getGardenStage(streak) {
  if (streak === 0) return { stage: 0, label: 'Empty Plot', emoji: '🌱' };
  if (streak < 3) return { stage: 1, label: 'Seed Planted', emoji: '🌰' };
  if (streak < 7) return { stage: 2, label: 'Sprout', emoji: '🌿' };
  if (streak < 14) return { stage: 3, label: 'Small Tree', emoji: '🌳' };
  if (streak < 30) return { stage: 4, label: 'Growing Palm', emoji: '🌴' };
  return { stage: 5, label: 'Producing Date Palm', emoji: '🌴✨' };
}
