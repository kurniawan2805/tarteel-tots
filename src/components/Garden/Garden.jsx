import { getGardenStage } from '../../utils/spacedRepetition';

export default function Garden({ streak = 0, size = 'md' }) {
  const { stage, label, emoji } = getGardenStage(streak);

  const sizeClasses = {
    sm: 'w-16 h-16 text-3xl',
    md: 'w-24 h-24 text-5xl',
    lg: 'w-40 h-40 text-8xl',
    xl: 'w-56 h-56 text-9xl'
  };

  const stages = [
    { bg: 'bg-amber-100', ground: 'bg-amber-200' },
    { bg: 'bg-green-50', ground: 'bg-amber-300' },
    { bg: 'bg-green-100', ground: 'bg-green-200' },
    { bg: 'bg-green-200', ground: 'bg-green-300' },
    { bg: 'bg-green-300', ground: 'bg-green-400' },
    { bg: 'bg-green-400', ground: 'bg-green-500' }
  ];

  const currentStage = stages[stage];
  const wilted = streak === 0;

  return (
    <div className={`relative rounded-2xl overflow-hidden ${currentStage.bg} shadow-md`}>
      <div className="flex flex-col items-center justify-center p-4">
        <div className={`${sizeClasses[size]} flex items-center justify-center animate-float`}>
          <span className={wilted ? 'opacity-50 grayscale' : ''}>{emoji}</span>
        </div>
        <div className={`h-3 w-3/4 rounded-full ${currentStage.ground} mt-2`} />
        <p className="text-sm font-semibold text-text mt-2">{label}</p>
        {streak > 0 && (
          <p className="text-xs text-text-muted">{streak} day streak</p>
        )}
      </div>

      {stage >= 4 && (
        <div className="absolute top-2 right-2 text-gold animate-pulse-gentle">
          <span className="text-lg">🌟</span>
        </div>
      )}
    </div>
  );
}

export function GardenProgress({ streak, goal = 30 }) {
  const percentage = Math.min((streak / goal) * 100, 100);
  const { stage, label } = getGardenStage(streak);

  const milestones = [
    { at: 0, label: 'Start' },
    { at: 3, label: 'Sprout' },
    { at: 7, label: 'Tree' },
    { at: 14, label: 'Palm' },
    { at: 30, label: 'Dates!' }
  ];

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-semibold text-text">{label}</span>
        <span className="text-sm text-text-muted">{streak}/{goal} days</span>
      </div>
      <div className="h-3 bg-bg-dark rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between mt-1">
        {milestones.map((m, i) => (
          <div
            key={i}
            className={`text-xs ${streak >= m.at ? 'text-primary' : 'text-text-muted'}`}
          >
            {m.label}
          </div>
        ))}
      </div>
    </div>
  );
}
