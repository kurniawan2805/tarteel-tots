import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';

export default function SignupPage() {
  const { signupWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('mother');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await signupWithEmail(email, password, fullName, role);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

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
                      ? 'bg-primary text-white'
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
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Account'}
          </button>
        </form>
      </div>
    </div>
  );
}
