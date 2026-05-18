import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

export default function LoginPage() {
  const { loginWithEmail, startLocalMode } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await loginWithEmail(email, password);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center p-6">
      <div className="text-center mb-8">
        <span className="text-6xl mb-4 block">🌴</span>
        <h1 className="text-3xl font-bold text-text">Tarteel Tots</h1>
        <p className="text-text-muted mt-2">Quran memorization for little ones</p>
      </div>

      <div className="card w-full max-w-sm">
        <h2 className="text-xl font-bold text-text mb-4">Parent Login</h2>

        {error && (
          <div className="bg-danger bg-opacity-10 text-danger p-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
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
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-muted">
          Don't have an account?{' '}
          <Link to="/signup" className="text-primary font-bold hover:underline">
            Create one
          </Link>
        </p>

        <div className="mt-4 pt-4 border-t border-bg-dark">
          <button
            onClick={startLocalMode}
            className="w-full py-3 text-text-muted text-sm font-semibold hover:text-text transition-colors"
          >
            Try without account →
          </button>
        </div>
      </div>
    </div>
  );
}
