import React from 'react';
import { Plus, Pencil, Archive, RotateCcw, FolderKanban } from 'lucide-react';
import { demoMode } from '../../lib/data.js';
import Permissions from '../members/Permissions.jsx';
export default function SettingsPage({ model }) {
  const { ws, wid, data, projects, manage, role, setModal, mutate, demoLog } = model;
  const archived = demoMode
    ? data.projects.filter((p) => p.workspace_id === wid && p.archived_at)
    : (data.archivedProjects || []).filter((p) => p.workspace_id === wid);
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="kicker">YOUR FOUNDATION</div>
          <h1>Workspace settings</h1>
          <p>A clear setup for how your team works.</p>
        </div>
      </div>
      <div className="settings-card">
        <h3>Workspace details</h3>
        <dl>
          <dt>Name</dt>
          <dd>{ws?.name}</dd>
          <dt>Type</dt>
          <dd>
            {ws?.kind === 'personal'
              ? 'Personal · only you'
              : 'Agency · team and client collaboration'}
          </dd>
          <dt>Your role</dt>
          <dd className="capitalize">{role}</dd>
          <dt>Data storage</dt>
          <dd>{demoMode ? 'Browser storage (demo)' : 'PostgreSQL via Node.js API'}</dd>
        </dl>
        {manage && (
          <div className="settings-actions">
            <button
              className="btn secondary"
              onClick={() => setModal({ type: 'rename-workspace' })}
            >
              <Pencil size={14} />
              Rename workspace
            </button>
            <button className="btn secondary" onClick={() => setModal({ type: 'workspace' })}>
              <Plus size={15} />
              Create workspace
            </button>
          </div>
        )}
      </div>
      {manage && (
        <>
          <div className="settings-card">
            <h3>Project management</h3>
            <p>Edit project details or archive finished work without deleting tasks.</p>
            <div className="manage-project-list">
              {projects.map((p) => (
                <div key={p.id}>
                  <span>
                    <span className="project-dot" style={{ background: p.color }} />
                    <strong>{p.name}</strong>
                    <small>{p.client || 'Personal'}</small>
                  </span>
                  <div>
                    <button
                      className="btn secondary"
                      onClick={() => setModal({ type: 'project', project: p })}
                    >
                      <Pencil size={13} />
                      Edit
                    </button>
                    <button
                      className="btn secondary"
                      onClick={() => setModal({ type: 'archive-project', project: p })}
                    >
                      <Archive size={13} />
                      Archive
                    </button>
                  </div>
                </div>
              ))}
              {!projects.length && <p>No active projects yet.</p>}
            </div>
          </div>
          <div className="settings-card">
            <h3>
              Archived projects <span>{archived.length}</span>
            </h3>
            <div className="manage-project-list">
              {archived.map((p) => (
                <div key={p.id}>
                  <span>
                    <FolderKanban size={16} />
                    <strong>{p.name}</strong>
                  </span>
                  <button
                    className="btn secondary"
                    onClick={() =>
                      mutate(
                        '/projects/' + p.id + '/restore',
                        'POST',
                        null,
                        (d) => {
                          d.projects.find((x) => x.id === p.id).archived_at = null;
                          demoLog(d, 'Restored project ' + p.name, p.id);
                        },
                        'Project restored',
                      )
                    }
                  >
                    <RotateCcw size={13} />
                    Restore
                  </button>
                </div>
              ))}
              {!archived.length && (
                <p>Archived projects will appear here. Their tasks and comments are kept.</p>
              )}
            </div>
          </div>
        </>
      )}
      <Permissions />
      {demoMode && (
        <div className="settings-card">
          <h3>Demo workspace</h3>
          <p>Reset sample projects and tasks in this browser.</p>
          <button className="btn secondary" onClick={() => setModal({ type: 'reset' })}>
            Reset demo data
          </button>
        </div>
      )}
    </>
  );
}
