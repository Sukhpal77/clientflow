import React, { useState, useEffect } from 'react';
import { CheckCircle2, Copy } from 'lucide-react';
import { roles, demoMode } from '../../lib/data.js';

import Modal from '../../components/Modal.jsx';
function InviteModal({ projects, onClose, onSave, actorRole = 'owner' }) {
  const [role, setRole] = useState('member'),
    [link, setLink] = useState(''),
    [err, setErr] = useState(''),
    [busy, setBusy] = useState(false),
    [copied, setCopied] = useState(false);
  return (
    <Modal
      title="Bring someone in"
      subtitle="Invite a teammate or give a client a view into their project."
      onClose={onClose}
    >
      {link ? (
        <div className="invite-success">
          <CheckCircle2 size={35} />
          <h3>Invitation ready</h3>
          <p>
            Share the link directly with your invitee. Invitations expire after seven days. No email
            is sent automatically.
          </p>
          <textarea readOnly value={link} rows={3} />
          {!demoMode && (
            <button
              className="btn primary"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(link);
                  setCopied(true);
                } catch {
                  setErr('Select and copy the link above.');
                }
              }}
            >
              <Copy size={15} />
              {copied ? 'Copied' : 'Copy invitation link'}
            </button>
          )}
          {err && <p className="error-message">{err}</p>}
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setErr('');
            const f = new FormData(e.currentTarget);
            try {
              setLink(
                await onSave({
                  email: f.get('email'),
                  role,
                  project_id: f.get('project_id') || null,
                }),
              );
            } catch (e) {
              setErr(e.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Email address
            <input type="email" name="email" required autoFocus placeholder="name@company.com" />
          </label>
          <label>
            Role
            <select name="role" value={role} onChange={(e) => setRole(e.target.value)}>
              {roles
                .filter((r) => r !== 'owner' && (actorRole === 'owner' || r !== 'admin'))
                .map((r) => (
                  <option key={r}>{r}</option>
                ))}
            </select>
          </label>
          <label>
            Project access
            <select name="project_id" required={role === 'client'}>
              <option value="">
                {role === 'client' ? 'Choose the client’s project' : 'No specific project'}
              </option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.client ? '· ' + p.client : ''}
                </option>
              ))}
            </select>
          </label>
          <p className="form-hint">
            Clients see only client-shared tasks in projects you grant them access to.
          </p>
          {err && <p className="error-message">{err}</p>}
          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={onClose}>
              Cancel
            </button>
            <button disabled={busy} className="btn primary">
              {busy ? 'Creating…' : 'Create invitation'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
export default InviteModal;
