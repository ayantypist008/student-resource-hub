'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    router.push('/');
    router.refresh();
  }

  return (
    <main
      className="min-h-screen bg-[#FAF6EE] flex items-center justify-center px-6"
      style={{ fontFamily: 'Inter, sans-serif' }}
    >
      <div className="max-w-sm w-full">
        <h1
          className="text-3xl font-semibold text-[#1B2A4A] mb-2 text-center"
          style={{ fontFamily: "'Source Serif 4', serif" }}
        >
          Welcome back
        </h1>
        <p className="text-sm text-[#5B6178] text-center mb-8">
          Log in to Student Resource Hub
        </p>

        <form
          onSubmit={handleLogin}
          className="bg-white border border-[#E4DCC8] rounded-lg p-6 space-y-4 shadow-sm"
        >
          <div>
            <label className="block text-sm font-medium text-[#1B2A4A] mb-1">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-[#E4DCC8] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[#1B2A4A] mb-1">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-[#E4DCC8] rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#1B2A4A]"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#A02334] text-white rounded-md py-2 font-medium hover:bg-[#87182a] transition-colors disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Log in'}
          </button>
        </form>

        <p className="text-sm text-[#5B6178] text-center mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-[#1B2A4A] font-medium underline">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}