'use client'

import { useState, SubmitEvent } from 'react'
import Link from 'next/link'
import { createClient } from '@/app/lib/supabase/client'

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleSignUp(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault()
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setLoading(false)
  }

  async function handleGitHubSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`
      }
    })
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-full max-w-md p-8 rounded-2xl border border-foreground/10 bg-foreground/5 text-center">
          <h2 className="text-xl font-bold mb-3">Check your email</h2>
          <p className="text-foreground/60 text-sm mb-6">
            We sent a confirmation link to <strong>{email}</strong>. Click it to activate your account.
          </p>
          <Link href="/login" className="text-sm underline underline-offset-4 hover:opacity-70">
            Back to login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8 rounded-2xl border border-foreground/10 bg-foreground/5">
        <h1 className="text-2xl font-bold mb-8 text-center">Create account</h1>

        <form onSubmit={handleSignUp} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg border border-foreground/20 bg-background focus:outline-none focus:border-foreground/50"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg border border-foreground/20 bg-background focus:outline-none focus:border-foreground/50"
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            required
            className="w-full px-4 py-3 rounded-lg border border-foreground/20 bg-background focus:outline-none focus:border-foreground/50"
          />
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-foreground text-background font-medium hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px bg-foreground/10" />
          <span className="text-sm text-foreground/40">or</span>
          <div className="flex-1 h-px bg-foreground/10" />
        </div>

        <button
          onClick={handleGitHubSignIn}
          className="w-full py-3 rounded-lg border border-foreground/20 font-medium hover:bg-foreground/5 transition-colors flex items-center justify-center gap-2"
        >
          <svg height="20" viewBox="0 0 16 16" width="20" fill="currentColor">
            <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
          </svg>
          Continue with GitHub
        </button>

        <p className="text-center text-sm text-foreground/50 mt-6">
          Already have an account?{' '}
          <Link href="/login" className="underline underline-offset-4 hover:opacity-70">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
