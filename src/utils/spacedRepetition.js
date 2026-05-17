const GRADE_INTERVALS = {
  needs_help: 1,
  good: 3,
  perfect: 7
};

const GRADE_WEIGHTS = {
  needs_help: 3,
  good: 1,
  perfect: 0.5
};

export function calculateNextReview(grade, currentInterval = 1) {
  const baseInterval = GRADE_INTERVALS[grade] || 1;
  if (grade === 'perfect') {
    return Math.max(baseInterval, currentInterval * 1.5);
  }
  if (grade === 'needs_help') {
    return 1;
  }
  return baseInterval;
}

export function getNextReviewDate(grade, currentInterval = 1) {
  const days = calculateNextReview(grade, currentInterval);
  const next = new Date();
  next.setDate(next.getDate() + Math.round(days));
  return next.toISOString();
}

export function getSuggestedSession(children, progress) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const suggestions = children.map(child => {
    const childProgress = progress.filter(p => p.child_id === child.id);
    
    const overdue = childProgress.filter(p => {
      if (!p.next_review) return false;
      return new Date(p.next_review) <= today;
    }).sort((a, b) => new Date(a.next_review) - new Date(b.next_review));

    const newAyahs = getSuggestedNewAyahs(child);

    return {
      child,
      review: overdue.slice(0, 5),
      newAyahs: newAyahs.slice(0, 2),
      isReviewHeavy: overdue.length > 3
    };
  });

  return suggestions;
}

function getSuggestedNewAyahs(child) {
  const baseline = child.memorization_baseline || {};
  const currentSurah = baseline.current_surah || 1;
  const currentAyah = baseline.current_ayah || 1;

  const ayahs = [];
  for (let i = 0; i < 3; i++) {
    ayahs.push({
      surah: currentSurah,
      ayah_number: currentAyah + i
    });
  }
  return ayahs;
}

export function getStreakDays(sessions) {
  if (!sessions.length) return 0;

  const sorted = [...sessions].sort((a, b) => new Date(b.date) - new Date(a.date));
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let streak = 0;
  let checkDate = new Date(today);

  const hasSessionOnDate = (date) => {
    const dateStr = date.toISOString().split('T')[0];
    return sorted.some(s => s.date === dateStr || s.date?.startsWith(dateStr));
  };

  if (!hasSessionOnDate(checkDate)) {
    checkDate.setDate(checkDate.getDate() - 1);
    if (!hasSessionOnDate(checkDate)) return 0;
  }

  while (hasSessionOnDate(checkDate)) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
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

export function getGrowthStageFromDays(days) {
  return getGardenStage(days);
}
