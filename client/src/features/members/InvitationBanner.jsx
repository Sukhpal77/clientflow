import React, { useState } from 'react';
import { Users, X } from 'lucide-react';
import { api } from '../../lib/api.js';
export default function InvitationBanner({ onJoined }) {
  const [token, setToken] = useState(() => new URLSearchParams(location.search).get('invite')),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  if (!token) return null;
  return (
    <div className="invitation-banner">
      <Users size={18} />
      <div>
        <strong>You have a workspace invitation</strong>
        <p>{error || 'Join using the email address this invitation was sent to.'}</p>
      </div>
      <button
        className="btn primary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            const result = await api('/invitations/accept', 'POST', { token });
            history.replaceState({}, '', location.pathname);
            setToken(null);
            await onJoined(result.workspace_id);
          } catch (e) {
            setError(e.message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Joining…' : 'Join workspace'}
      </button>
      <button className="icon-btn" aria-label="Dismiss invitation" onClick={() => setToken(null)}>
        <X size={16} />
      </button>
    </div>
  );
}
