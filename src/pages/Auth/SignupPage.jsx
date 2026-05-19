import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function SignupPage() {
  const navigate = useNavigate();
  const { signupWithEmail, initFamilySpace, joinFamilySpace, activeFamily } = useAuth();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('mother');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Step 2 state
  const [familyChoice, setFamilyChoice] = useState(null); // 'create' | 'join'
  const [familyName, setFamilyName] = useState('');
  const [familyCode, setFamilyCode] = useState('');
  const [createdFamilyCode, setCreatedFamilyCode] = useState(''); // Show after creation

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signupWithEmail(email, password, fullName, role);
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFamily = async () => {
    if (!familyName.trim()) return;
    setLoading(true);
    setError('');
    try {
      const family = await initFamilySpace(familyName);
      setCreatedFamilyCode(family.family_code);
      setStep(2.5);
    } catch (err) {
      setError(err.message || 'Failed to create family');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinFamily = async () => {
    if (!familyCode.trim()) return;
    setLoading(true);
    setError('');
    try {
      await joinFamilySpace(familyCode);
      setStep(3);
    } catch {
      setError('Family code not found. Please check and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
        <div className="text-center mb-8">
          <span className="text-6xl mb-4 block">🌱</span>
          <h1 className="text-3xl font-bold text-text">Create Account</h1>
          <p className="text-text-muted mt-2">Start your child's Quran journey</p>
        </div>

        <div className="card w-full max-w-sm">
          {error && (
            <div className="bg-danger bg-opacity-10 text-danger p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-text mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="input-field"
                placeholder="Your name"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-1">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="parent@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-1">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                placeholder="Min 6 characters"
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-text mb-1">I am the...</label>
              <div className="flex gap-3">
                {['mother', 'father', 'guardian'].map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex-1 py-3 rounded-lg font-semibold text-sm transition-all ${
                      role === r
                        ? 'bg-primary text-white shadow-md'
                        : 'bg-bg-dark text-text-muted'
                    }`}
                  >
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-50 mt-4"
            >
              {loading ? 'Creating...' : 'Create Account'}
            </button>
          </form>
          
          <p className="text-center text-sm text-text-muted mt-6">
            Already have an account?{' '}
            <button onClick={() => navigate('/login')} className="text-primary font-bold">Login</button>
          </p>
        </div>
      </div>
    );
  }

  if (step === 2) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
        <div className="text-center mb-8">
          <span className="text-6xl mb-4 block">🏠</span>
          <h1 className="text-3xl font-bold text-text">Setup Your Space</h1>
          <p className="text-text-muted mt-2">Create a new family or join an existing one</p>
        </div>

        <div className="card w-full max-w-sm">
          {error && (
            <div className="bg-danger bg-opacity-10 text-danger p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {!familyChoice ? (
            <div className="space-y-4">
              <button
                onClick={() => setFamilyChoice('create')}
                className="w-full p-6 rounded-2xl border-2 border-primary bg-primary bg-opacity-5 text-left transition-all active:scale-[0.98]"
              >
                <p className="text-lg font-bold text-primary mb-1">✨ Create New Family</p>
                <p className="text-xs text-text-muted">Start fresh and invite others later.</p>
              </button>
              
              <button
                onClick={() => setFamilyChoice('join')}
                className="w-full p-6 rounded-2xl border-2 border-secondary bg-secondary bg-opacity-5 text-left transition-all active:scale-[0.98]"
              >
                <p className="text-lg font-bold text-secondary mb-1">🤝 Join Family</p>
                <p className="text-xs text-text-muted">Enter a code from another family member.</p>
              </button>
            </div>
          ) : familyChoice === 'create' ? (
            <div className="space-y-4 animate-grow">
              <div>
                <label className="block text-sm font-semibold text-text mb-1">Family Name</label>
                <input
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  className="input-field"
                  placeholder="e.g. The Ahmed Family"
                  autoFocus
                />
              </div>
              <button
                onClick={handleCreateFamily}
                disabled={loading || !familyName.trim()}
                className="btn-primary w-full disabled:opacity-50"
              >
                {loading ? 'Generating...' : 'Create Family Space'}
              </button>
              <button
                onClick={() => setFamilyChoice(null)}
                className="w-full py-2 text-text-muted text-xs font-bold"
              >
                BACK
              </button>
            </div>
          ) : (
            <div className="space-y-4 animate-grow">
              <div>
                <label className="block text-sm font-semibold text-text mb-1">Enter Family Code</label>
                <input
                  type="text"
                  value={familyCode}
                  onChange={(e) => setFamilyCode(e.target.value.toUpperCase())}
                  className="input-field text-center text-2xl font-mono tracking-widest"
                  placeholder="TT-XXXX"
                  maxLength={7}
                  autoFocus
                />
              </div>
              <button
                onClick={handleJoinFamily}
                disabled={loading || !familyCode.trim()}
                className="btn-primary w-full disabled:opacity-50 bg-secondary shadow-secondary-light"
              >
                {loading ? 'Joining...' : 'Join Space'}
              </button>
              <button
                onClick={() => setFamilyChoice(null)}
                className="w-full py-2 text-text-muted text-xs font-bold"
              >
                BACK
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6 text-center">
        <span className="text-8xl mb-6 block animate-float">🎉</span>
        <h1 className="text-3xl font-bold text-text mb-2">You're Linked!</h1>
        <p className="text-lg text-text-muted mb-8">
          Welcome to <span className="text-primary font-extrabold">{activeFamily?.display_name || 'your family space'}</span>.
        </p>
        
        <div className="card max-w-sm w-full mb-8 bg-success bg-opacity-5 border-success border-opacity-20">
          <p className="text-sm text-text leading-relaxed">
            All children, progress, and settings are now shared in real-time with other family members.
          </p>
        </div>

        <button
          onClick={() => navigate('/dashboard')}
          className="btn-primary px-12 py-4 text-lg"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  // Step 2.5: Show family code after creation (share with other parent)
  if (step === 2.5) {
    return (
      <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
        <div className="text-center mb-8">
          <span className="text-6xl mb-4 block">🎁</span>
          <h1 className="text-3xl font-bold text-text">Family Space Created!</h1>
          <p className="text-text-muted mt-2">Share this code with your spouse or family members</p>
        </div>

        <div className="card w-full max-w-sm">
          {error && (
            <div className="bg-danger bg-opacity-10 text-danger p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <div className="text-center">
            <p className="text-sm text-text-muted mb-3">Family Code</p>
            <div className="bg-primary bg-opacity-10 border-2 border-primary rounded-xl p-6 mb-6">
              <code className="text-4xl font-mono font-bold text-primary tracking-widest">
                {createdFamilyCode}
              </code>
            </div>
            
            <button
              onClick={() => {
                navigator.clipboard.writeText(createdFamilyCode);
                alert('Code copied to clipboard!');
              }}
              className="btn-primary w-full mb-3"
            >
              📋 Copy Code
            </button>

            <p className="text-xs text-text-muted mb-6">
              They can use this code to join your family and see {activeFamily?.display_name || 'the family'} space.
            </p>

            <button
              onClick={() => setStep(3)}
              className="w-full py-3 bg-bg-dark text-text font-semibold rounded-lg hover:bg-text hover:text-bg transition-colors"
            >
              Continue to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
}
