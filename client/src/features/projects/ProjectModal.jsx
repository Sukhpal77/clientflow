import React, { useState, useEffect } from 'react';

import { people } from '../../lib/data.js';

import Modal from '../../components/Modal.jsx';
function ProjectModal({ project, onClose, onSave }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal
      title={project ? 'Edit project' : 'A new project'}
      subtitle="Bring your team and client work into focus."
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          setBusy(true);
          try {
            await onSave(
              Object.fromEntries(
                [...f.entries()].map(([k, v]) => [k, k === 'due_date' && !v ? null : v]),
              ),
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <label>
          Project name
          <input
            defaultValue={project?.name || ''}
            name="name"
            required
            maxLength={200}
            autoFocus
            placeholder="e.g. Brand & website"
          />
        </label>
        <label>
          Client
          <input
            defaultValue={project?.client || ''}
            name="client"
            maxLength={200}
            placeholder="e.g. Acme"
          />
        </label>
        <label>
          Description
          <textarea
            defaultValue={project?.description || ''}
            name="description"
            maxLength={2000}
            rows={2}
            placeholder="What’s the vision?"
          />
        </label>
        <div className="form-grid">
          <label>
            Project access
            <select name="visibility" defaultValue={project?.visibility || 'team'}>
              <option value="team">Team project</option>
              <option value="private">Private · assigned people only</option>
            </select>
          </label>
          <label>
            Due date
            <input
              type="date"
              name="due_date"
              defaultValue={project?.due_date?.slice(0, 10) || ''}
            />
          </label>
          <label>
            Project color
            <input type="color" name="color" defaultValue={project?.color || '#6c5ce7'} />
          </label>
        </div>
        <p className="form-hint">
          Client accounts always need explicit project access, even for team projects.
        </p>
        <div className="modal-actions">
          <button type="button" className="btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="btn primary" disabled={busy}>
            {project ? 'Save changes' : 'Create project'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
export default ProjectModal;
