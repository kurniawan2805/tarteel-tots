import { useState } from 'react';
import { db } from '../../db/dexie';
import { useNavigate } from 'react-router-dom';
import { quranMetaData } from '../../data/quranMeta';

const AVATARS = ['👧', '👦', '🧒', '👶', '🧕', '👱‍♀️', '👱'];

const LEARNING_PATHS = [
  { id: 'standard', name: 'Standard Path', description: 'Start from Al-Fatihah, move forward.', surah: 1, ayah: 1, direction: 'forwards' },
  { id: 'juz_amma', name: 'Juz Amma Path', description: 'Start from An-Nas, work backwards.', surah: 114, ayah: 1, direction: 'backwards' },
  { id: 'custom', name: 'Custom Starting Point', description: 'Choose your own Surah and direction.', surah: 1, ayah: 1, direction: 'forwards' }
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [children, setChildren] = useState([]);
  const [currentChild, setCurrentChild] = useState({
    name: '',
    age: 4,
    avatar: '👧',
    learning_path: 'standard',
    current_surah: 1,
    current_ayah: 1,
    direction: 'forwards',
    daily_goal_minutes: 10
  });

  const handlePathChange = (pathId) => {
    const path = LEARNING_PATHS.find(p => p.id === pathId);
    setCurrentChild({
      ...currentChild,
      learning_path: pathId,
      current_surah: path.surah,
      current_ayah: path.ayah,
      direction: path.direction
    });
  };

  const handleAddChild = async () => {
    if (!currentChild.name.trim()) return;

    const child = {
      name: currentChild.name,
      age: currentChild.age,
      avatar: currentChild.avatar,
      daily_goal_minutes: currentChild.daily_goal_minutes,
      learning_path: currentChild.learning_path,
      direction: currentChild.direction,
      memorization_baseline: {
        current_surah: currentChild.current_surah,
        current_ayah: currentChild.current_ayah
      },
      created_at: new Date().toISOString()
    };

    const id = await db.children.add(child);
    setChildren([...children, { ...child, id }]);
    setCurrentChild({
      name: '',
      age: 4,
      avatar: '👧',
      learning_path: 'standard',
      current_surah: 1,
      current_ayah: 1,
      direction: 'forwards',
      daily_goal_minutes: 10
    });
  };

  const handleFinish = async () => {
    await db.settings.put({ key: 'onboarding_complete', value: true });
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col p-6">
      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
        {step === 1 && (
          <div className="text-center">
            <span className="text-7xl mb-6 block animate-float">🌴</span>
            <h1 className="text-3xl font-bold text-text mb-3">Welcome to Tarteel Tots</h1>
            <p className="text-text-muted mb-8 leading-relaxed">
              Help your little ones memorize the Quran through gentle repetition and fun rewards.
            </p>
            <button
              onClick={() => setStep(2)}
              className="btn-primary text-lg px-12 py-4"
            >
              Get Started
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="w-full">
            <h2 className="text-2xl font-bold text-text mb-2">Add Your Child</h2>
            <p className="text-text-muted mb-6">Set up their profile to personalize their learning.</p>

            <div className="card space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="block text-sm font-semibold text-text mb-1">Name</label>
                <input
                  type="text"
                  value={currentChild.name}
                  onChange={(e) => setCurrentChild({ ...currentChild, name: e.target.value })}
                  className="input-field"
                  placeholder="Child's name"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-text mb-1">Age</label>
                <div className="flex items-center gap-4">
                  <input
                    type="range"
                    min="3"
                    max="7"
                    value={currentChild.age}
                    onChange={(e) => setCurrentChild({ ...currentChild, age: parseInt(e.target.value) })}
                    className="flex-1"
                  />
                  <span className="text-2xl font-bold text-primary w-8">{currentChild.age}</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-text mb-2">Avatar</label>
                <div className="flex gap-2 justify-center">
                  {AVATARS.map((avatar) => (
                    <button
                      key={avatar}
                      onClick={() => setCurrentChild({ ...currentChild, avatar })}
                      className={`w-12 h-12 rounded-full text-2xl flex items-center justify-center transition-all ${
                        currentChild.avatar === avatar
                          ? 'bg-primary bg-opacity-20 ring-2 ring-primary'
                          : 'bg-bg-dark'
                      }`}
                    >
                      {avatar}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-text mb-3">Learning Path</label>
                <div className="space-y-2">
                  {LEARNING_PATHS.map((path) => (
                    <button
                      key={path.id}
                      onClick={() => handlePathChange(path.id)}
                      className={`w-full p-3 rounded-xl text-left transition-all border-2 ${
                        currentChild.learning_path === path.id
                          ? 'border-primary bg-primary bg-opacity-5'
                          : 'border-transparent bg-bg-dark'
                      }`}
                    >
                      <div className="font-bold text-text text-sm">{path.name}</div>
                      <div className="text-xs text-text-muted">{path.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              {currentChild.learning_path === 'custom' && (
                <div className="animate-grow space-y-4 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Surah</label>
                      <select
                        value={currentChild.current_surah}
                        onChange={(e) => setCurrentChild({ ...currentChild, current_surah: parseInt(e.target.value), current_ayah: 1 })}
                        className="input-field py-2 text-sm"
                      >
                        {quranMetaData.slice(1).map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.id}. {s.transliteration}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Direction</label>
                      <select
                        value={currentChild.direction}
                        onChange={(e) => setCurrentChild({ ...currentChild, direction: e.target.value })}
                        className="input-field py-2 text-sm"
                      >
                        <option value="forwards">Forward (1 → 114)</option>
                        <option value="backwards">Backward (114 → 1)</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Starting Ayah</label>
                    <select
                      value={currentChild.current_ayah}
                      onChange={(e) => setCurrentChild({ ...currentChild, current_ayah: parseInt(e.target.value) })}
                      className="input-field py-2 text-sm"
                    >
                      {Array.from({ length: quranMetaData[currentChild.current_surah]?.verses || 0 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={n}>
                          Ayah {n}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-text-muted mb-1 uppercase">Daily Goal</label>
                  <select
                    value={currentChild.daily_goal_minutes}
                    onChange={(e) => setCurrentChild({ ...currentChild, daily_goal_minutes: parseInt(e.target.value) })}
                    className="input-field py-2 text-sm"
                  >
                    <option value={5}>5 min</option>
                    <option value={10}>10 min</option>
                    <option value={15}>15 min</option>
                    <option value={20}>20 min</option>
                  </select>
                </div>
                <div className="flex flex-col justify-end">
                  <button
                    onClick={handleAddChild}
                    disabled={!currentChild.name.trim()}
                    className="btn-primary w-full py-2 disabled:opacity-50 text-sm"
                  >
                    Add Child
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="btn-secondary flex-1"
              >
                {children.length > 0 ? `Continue (${children.length})` : 'Skip'}
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center w-full">
            <span className="text-7xl mb-6 block">✨</span>
            <h2 className="text-2xl font-bold text-text mb-3">You're All Set!</h2>
            <p className="text-text-muted mb-8">
              {children.length > 0
                ? `${children.length} child${children.length > 1 ? 'ren' : ''} ready to learn.`
                : 'You can add children anytime from the dashboard.'}
            </p>
            <button
              onClick={handleFinish}
              className="btn-primary text-lg px-12 py-4"
            >
              Start Learning
            </button>
          </div>
        )}
      </div>

      <div className="flex justify-center gap-2 pb-4">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`w-2 h-2 rounded-full transition-all ${
              s === step ? 'bg-primary w-6' : 'bg-bg-dark'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
