// ============================================================================
// Login.tsx — Invite-only email/password sign-in gate
// ============================================================================
// Purpose: Blocks the app until a Supabase-authenticated session exists.
// Public signups must be disabled in the Supabase dashboard; only users
// created by an admin in Auth > Users can sign in here.
//
// ASCII Flow:
//   [ mount ] -> [ user types email/password ] -> [ click Sign In ]
//                                                       |
//                                                       v
//                                          [ supabase.auth.signInWithPassword ]
//                                              |                    |
//                                        success                  error
//                                              |                    |
//                                              v                    v
//                                    onAuthed() fires        show inline msg
// ============================================================================

import { useState, type FormEvent } from 'react';
import { supabase } from '../supabase';

interface LoginProps {
  onAuthed: () => void;
}

export function Login({ onAuthed }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    onAuthed();
  }

  return (
    <div className="min-h-screen bg-wood-pattern flex items-center justify-center px-4">
      <div className="bg-paper-dark border border-custom-brown/40 rounded-lg shadow-header px-8 py-7 w-full max-w-md">
        <h1 className="font-cinzel text-2xl font-bold text-custom-brown text-center mb-1 tracking-wider">
          ⚔ Ervana Sedengers
        </h1>
        <p className="text-custom-brown text-xs text-center mb-6 tracking-widest">
          CREATURE COMPENDIUM · INVITE-ONLY ACCESS
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1">
            <span className="font-cinzel text-xs font-bold text-custom-brown tracking-wider">EMAIL</span>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              required
              className="bg-white border border-custom-brown/40 rounded px-3 py-2 text-black font-bold outline-none focus:border-custom-gold"
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="font-cinzel text-xs font-bold text-custom-brown tracking-wider">PASSWORD</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
              className="bg-white border border-custom-brown/40 rounded px-3 py-2 text-black font-bold outline-none focus:border-custom-gold"
            />
          </label>

          {error && (
            <div className="text-red-800 bg-red-100 border border-red-800/40 rounded px-3 py-2 text-sm font-bold">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={busy}
            className="bg-button-gradient border border-custom-gold text-white font-cinzel font-bold tracking-wider py-2 rounded shadow-header hover:brightness-110 disabled:opacity-60"
          >
            {busy ? 'Signing In…' : 'Sign In'}
          </button>
        </form>

        <p className="text-custom-brown/70 text-xs text-center mt-5">
          Accounts are created by an administrator. Ask the keeper of the compendium for access.
        </p>
      </div>
    </div>
  );
}
