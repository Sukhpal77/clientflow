import React, { useState, useEffect } from 'react';
import { Layers, ArrowUpRight, Check, ArrowRight } from 'lucide-react';
import { people, api } from '../../lib/data.js';

function Auth({ onDone, error }) {
  const [register, setRegister] = useState(false),
    [err, setErr] = useState(''),
    [busy, setBusy] = useState(false),
    [inviteStatus, setInviteStatus] = useState('');
  const invite = new URLSearchParams(location.search).get('invite');
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setErr('');
    const f = Object.fromEntries(new FormData(e.currentTarget));
    try {
      await api(register ? '/auth/register' : '/auth/login', 'POST', f);
      if (invite) {
        try {
          await api('/invitations/accept', 'POST', { token: invite });
          history.replaceState({}, '', location.pathname);
        } catch (e) {
          setInviteStatus(e.message);
          setBusy(false);
          return;
        }
      }
      await onDone();
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-shell">
      <div className="auth-story">
        <a className="brand">
          <span className="brand-icon">
            <Layers size={22} />
          </span>
          ClientFlow.
        </a>
        <div>
          <span className="kicker">YOUR AGENCY, IN FLOW</span>
          <h1>
            Great work starts
            <br />
            with a clear space.
          </h1>
          <p>
            Bring your projects, people, and client conversations together. Make room for what’s
            next.
          </p>
          <div className="auth-checks">
            <span>
              <Check size={16} />
              Every project in one place
            </span>
            <span>
              <Check size={16} />
              Thoughtful client access
            </span>
            <span>
              <Check size={16} />
              Your own personal workspace
            </span>
          </div>
        </div>
        <span>Less chasing updates. More making things happen.</span>
      </div>
      <div className="auth-form">
        <h2>{register ? 'Make space for your team.' : 'Welcome back.'}</h2>
        <p>
          {invite
            ? 'Sign in with the invited email address to join the project.'
            : register
              ? 'Create your agency and personal workspaces.'
              : 'Pick up where you left off.'}
        </p>
        <form onSubmit={submit}>
          {register && (
            <>
              <label>
                Your name
                <input required name="name" autoComplete="name" maxLength={200} />
              </label>
              <label>
                Agency name
                <input name="agency" maxLength={200} placeholder="Your studio or agency" />
              </label>
            </>
          )}
          <label>
            Email
            <input required type="email" name="email" autoComplete="email" />
          </label>
          <label>
            Password
            <input
              required
              type="password"
              name="password"
              minLength={register ? 12 : 1}
              maxLength={128}
              autoComplete={register ? 'new-password' : 'current-password'}
            />
          </label>
          {register && <p className="form-hint">Use at least 12 characters.</p>}
          {(err || error) && <p className="error-message">{err || error}</p>}
          <button className="btn primary" disabled={busy}>
            {busy ? 'Please wait…' : register ? 'Create workspace' : 'Sign in'}
            <ArrowRight size={16} />
          </button>
        </form>
        {inviteStatus && (
          <div className="error-message">
            {inviteStatus}
            <button className="btn secondary" onClick={onDone}>
              Continue to workspace
            </button>
          </div>
        )}
        <p>
          {register ? 'Already have an account?' : 'New to ClientFlow?'}{' '}
          <button
            className="link-btn"
            onClick={() => {
              setRegister(!register);
              setErr('');
            }}
          >
            {register ? 'Sign in' : 'Create an account'}
          </button>
        </p>
        <a className="demo-link" href="/?demo=1">
          Explore the interactive demo <ArrowUpRight size={14} />
        </a>
      </div>
    </div>
  );
}
export default Auth;
