import { playChime } from '../../utils/audioEngine';

const GRADE_OPTIONS = [
  {
    id: 'needs_help',
    label: 'Needs Help',
    color: 'bg-danger',
    hoverColor: 'hover:bg-danger-dark',
    emoji: '🔴',
    schedule: 'Retry tomorrow'
  },
  {
    id: 'good',
    label: 'Good',
    color: 'bg-warning',
    hoverColor: 'hover:bg-warning',
    emoji: '🟡',
    schedule: 'Review in 3 days'
  },
  {
    id: 'perfect',
    label: 'Perfect',
    color: 'bg-success',
    hoverColor: 'hover:bg-primary-dark',
    emoji: '🟢',
    schedule: 'Review in 7 days'
  }
];

export default function GradingPanel({ onGrade, ayahText, surahName, ayahNumber }) {
  const handleGrade = (grade) => {
    playChime(grade === 'perfect' ? 'complete' : grade === 'good' ? 'success' : 'tap');
    onGrade(grade);
  };

  return (
    <div className="card w-full max-w-md mx-auto">
      {ayahText && (
        <div className="mb-4 text-center">
          <p className="arabic-text text-2xl text-text mb-1">{ayahText}</p>
          <p className="text-sm text-text-muted">
            {surahName} - Ayah {ayahNumber}
          </p>
        </div>
      )}

      <p className="text-center text-sm font-semibold text-text mb-3">How did they do?</p>

      <div className="flex gap-3 justify-center">
        {GRADE_OPTIONS.map((option) => (
          <button
            key={option.id}
            onClick={() => handleGrade(option.id)}
            className={`flex-1 ${option.color} ${option.hoverColor} text-white font-bold py-4 px-3 rounded-xl transition-all duration-200 active:scale-95 shadow-md`}
          >
            <span className="text-2xl block mb-1">{option.emoji}</span>
            <span className="text-sm">{option.label}</span>
            <span className="text-xs opacity-80 block mt-1">{option.schedule}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function QuickGrade({ onGrade, size = 'md' }) {
  const sizeClasses = {
    sm: 'py-2 px-3 text-xs',
    md: 'py-3 px-4 text-sm',
    lg: 'py-4 px-6 text-base'
  };

  return (
    <div className="flex gap-2">
      {GRADE_OPTIONS.map((option) => (
        <button
          key={option.id}
          onClick={() => {
            playChime(option.id === 'perfect' ? 'complete' : 'success');
            onGrade(option.id);
          }}
          className={`${option.color} ${option.hoverColor} ${sizeClasses[size]} text-white font-bold rounded-lg transition-all duration-200 active:scale-95`}
        >
          {option.emoji} {option.label}
        </button>
      ))}
    </div>
  );
}
