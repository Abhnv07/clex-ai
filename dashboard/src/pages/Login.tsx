import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { KeyRound, Mail, UserRound } from 'lucide-react';

import Background from '../components/Background';
import SiteFooter from '../components/SiteFooter';
import SiteHeader from '../components/SiteHeader';
import { useAuth } from '../context/AuthContext';

type AuthMode = 'signin' | 'signup';

function FieldIcon({ mode }: { mode: 'email' | 'password' | 'name' }) {
  if (mode === 'email') return <Mail className="input-icon" />;
  if (mode === 'name') return <UserRound className="input-icon" />;
  return <KeyRound className="input-icon" />;
}

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    configured,
    loading,
    user,
    authError,
    signInWithEmail,
    signInWithGoogle,
    signUpWithEmail,
    resetPassword,
  } = useAuth();

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const nextUrl = params.get('next') || '/';

  const [mode, setMode] = useState<AuthMode>('signin');
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      navigate(nextUrl, { replace: true });
    }
  }, [loading, navigate, nextUrl, user]);

  const errorMessage = localError || authError;

  const handleEmailAuth = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setLocalError(null);
    setMessage(null);

    try {
      if (mode === 'signin') {
        await signInWithEmail(email.trim(), password);
      } else {
        await signUpWithEmail(name.trim(), email.trim(), password);
      }
      navigate(nextUrl, { replace: true });
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleGoogle = async () => {
    setBusy(true);
    setLocalError(null);
    setMessage(null);
    try {
      await signInWithGoogle();
      navigate(nextUrl, { replace: true });
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Google sign-in failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      setLocalError('Enter your email first, then request a password reset.');
      return;
    }

    setBusy(true);
    setLocalError(null);
    setMessage(null);
    try {
      await resetPassword(email.trim());
      setMessage(`Password reset instructions were sent to ${email.trim()}.`);
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'Reset failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Background />
      <div className="relative z-10 flex min-h-screen flex-col">
        <SiteHeader />

        <main className="flex flex-1 items-center justify-center px-6 pb-12 pt-28">
          <div className="w-full max-w-[460px]">
            <div className="mb-10 text-center">
              <a href="https://ai.clex.in/" className="mb-6 inline-flex items-center gap-2 no-underline">
                <span className="text-3xl font-bold tracking-widest text-white">CLEX</span>
                <div className="h-2 w-2 animate-pulse rounded-full bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]" />
              </a>
              <p className="mt-2 text-sm text-gray-500">
                Sign in to manage API keys, usage logs, and analytics.
              </p>
            </div>

            <div className="login-card">
              <div className="mb-8 flex gap-1 rounded-xl border border-white/5 bg-white/[0.03] p-1">
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className={[
                    'flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all',
                    mode === 'signin' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300',
                  ].join(' ')}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className={[
                    'flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all',
                    mode === 'signup' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300',
                  ].join(' ')}
                >
                  Sign Up
                </button>
              </div>

              {!configured && (
                <div className="mb-5 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-200">
                  Firebase client configuration is missing. Add the dashboard env vars before using login.
                </div>
              )}

              {errorMessage && (
                <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-200">
                  {errorMessage}
                </div>
              )}

              {message && (
                <div className="mb-5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm text-emerald-200">
                  {message}
                </div>
              )}

              <form onSubmit={handleEmailAuth}>
                {mode === 'signup' && (
                  <div className="input-group">
                    <FieldIcon mode="name" />
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      className="login-input"
                      placeholder="Full name"
                      autoComplete="name"
                      required
                    />
                  </div>
                )}

                <div className="input-group">
                  <FieldIcon mode="email" />
                  <input
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    type="email"
                    className="login-input"
                    placeholder="Email address"
                    autoComplete="email"
                    required
                  />
                </div>

                <div className="input-group">
                  <FieldIcon mode="password" />
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type="password"
                    className="login-input"
                    placeholder="Password"
                    autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                    minLength={6}
                    required
                  />
                </div>

                <div className="mb-6 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    {mode === 'signin' ? 'Use your Firebase auth account.' : 'Create a dashboard account.'}
                  </span>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => void handleResetPassword()}
                      className="text-xs text-cyan-400/70 transition-colors hover:text-cyan-400"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>

                <button type="submit" className="login-btn mb-3" disabled={busy || !configured}>
                  {busy ? 'Please wait...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
                </button>
              </form>

              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-white/6" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-[#080c18] px-3 text-gray-600">or continue with</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => void handleGoogle()}
                disabled={busy || !configured}
                className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/6 bg-white/[0.03] py-2.5 text-sm text-gray-400 transition-all hover:border-white/15 hover:bg-white/[0.06] hover:text-white"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </button>
            </div>
          </div>
        </main>

        <SiteFooter />
      </div>
    </>
  );
}
