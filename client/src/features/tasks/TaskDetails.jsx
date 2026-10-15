import React, { useState } from 'react';
import {
  Flag,
  CalendarDays,
  Users,
  Layers,
  CheckCircle2,
  AlignLeft,
  Plus,
  MessageSquare,
  Activity,
  Trash2,
  ArrowRight,
  Globe,
  Clock,
} from 'lucide-react';
import Modal from '../../components/Modal.jsx';
import { Avatar } from '../../components/ui.jsx';
import { columns } from '../../lib/data.js';
export default function TaskDetails({
  task,
  projects,
  members,
  canWrite,
  canComment,
  onClose,
  onSave,
  onDelete,
  onComment,
  activity = [],
}) {
  const [tab, setTab] = useState('subtasks'),
    [subtasks, setSubtasks] = useState(task.subtasks || []),
    [draft, setDraft] = useState(''),
    [comment, setComment] = useState(''),
    [saving, setSaving] = useState(false),
    [confirmDelete, setConfirmDelete] = useState(false),
    [dirty, setDirty] = useState(false);
  const completed = subtasks.filter((s) => s.done).length,
    progress = subtasks.length
      ? Math.round((completed / subtasks.length) * 100)
      : task.status === 'Done'
        ? 100
        : 0;
  const project = projects.find((p) => p.id === task.project_id);
  const assigned = members.find((m) => m.id === task.assignee_id);
  function changeSubtasks(next) {
    setSubtasks(next);
    setDirty(true);
  }
  function addSubtask(e) {
    e.preventDefault();
    if (!draft.trim()) return;
    changeSubtasks([...subtasks, { id: crypto.randomUUID(), title: draft.trim(), done: false }]);
    setDraft('');
  }
  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    const f = new FormData(e.currentTarget);
    await onSave(
      {
        project_id: task.project_id,
        title: f.get('title'),
        description: f.get('description'),
        status: f.get('status'),
        priority: f.get('priority'),
        assignee_id: f.get('assignee_id') || null,
        due_date: f.get('due_date') || null,
        visibility: f.get('visibility'),
        label: f.get('label'),
        subtasks,
      },
      task,
    );
    setSaving(false);
  }
  return (
    <Modal title="Task details" subtitle={project?.name} variant="drawer" onClose={onClose}>
      <div className="task-detail-scroll">
        <div className="task-detail-context">
          <span className="detail-project-mark" style={{ background: project?.color }} />
          <span>{project?.client || 'Personal'}</span>
          <span>/</span>
          <span>{project?.name}</span>
          <span className="task-id">
            #
            {task.id.startsWith('clientflow-seed-')
              ? task.id.replace('clientflow-seed-', '').replace('-task-', '-').toUpperCase()
              : task.id.slice(0, 8).toUpperCase()}
          </span>
        </div>
        <form id="task-detail-form" onSubmit={submit} onChange={() => setDirty(true)}>
          <input
            className="detail-title"
            aria-label="Task name"
            name="title"
            defaultValue={task.title}
            required
            maxLength={200}
            readOnly={!canWrite}
          />
          <div className="detail-properties">
            <label>
              <span>
                <Flag size={15} />
                Priority
              </span>
              <select name="priority" defaultValue={task.priority} disabled={!canWrite}>
                {['Low', 'Medium', 'High', 'Urgent'].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <label>
              <span>
                <Layers size={15} />
                Status
              </span>
              <select name="status" defaultValue={task.status} disabled={!canWrite}>
                {columns.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </label>
            <div className="property-row">
              <span>
                <Clock size={15} />
                Created
              </span>
              <span>
                {task.created_at
                  ? new Date(task.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })
                  : 'Not recorded'}
              </span>
            </div>
            <label>
              <span>
                <CalendarDays size={15} />
                Due date
              </span>
              <input
                name="due_date"
                type="date"
                defaultValue={task.due_date?.slice(0, 10) || ''}
                readOnly={!canWrite}
              />
            </label>
            <div className="property-row">
              <span>
                <CheckCircle2 size={15} />
                Progress
              </span>
              <div className="detail-progress">
                <div className="progress-track">
                  <i style={{ width: progress + '%' }} />
                </div>
                <strong>{progress}%</strong>
              </div>
            </div>
            <label>
              <span>
                <Users size={15} />
                Assignee
              </span>
              <div className="assignee-select">
                {assigned && <Avatar name={assigned.name} size={24} />}
                <select
                  name="assignee_id"
                  defaultValue={task.assignee_id || ''}
                  disabled={!canWrite}
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>
            </label>
            <label>
              <span>
                <Globe size={15} />
                Visibility
              </span>
              <select name="visibility" defaultValue={task.visibility} disabled={!canWrite}>
                <option value="internal">Internal team only</option>
                <option value="client">Shared with client</option>
              </select>
            </label>
            <label>
              <span>
                <Flag size={15} />
                Label
              </span>
              <input
                name="label"
                maxLength={50}
                defaultValue={task.label || ''}
                readOnly={!canWrite}
                placeholder="Add a label"
              />
            </label>
          </div>
          <section className="detail-description">
            <h3>
              <AlignLeft size={15} />
              Description
            </h3>
            <textarea
              aria-label="Description"
              name="description"
              defaultValue={task.description || ''}
              rows={3}
              maxLength={5000}
              readOnly={!canWrite}
              placeholder="Add context for your team…"
            />
          </section>
        </form>
        <div
          className="detail-tabs"
          role="tablist"
          aria-label="Task details tabs"
          onKeyDown={(e) => {
            const tabs = ['subtasks', 'comments', 'activity'];
            let next;
            if (e.key === 'ArrowRight') next = tabs[(tabs.indexOf(tab) + 1) % 3];
            if (e.key === 'ArrowLeft') next = tabs[(tabs.indexOf(tab) + 2) % 3];
            if (e.key === 'Home') next = tabs[0];
            if (e.key === 'End') next = tabs[2];
            if (next) {
              e.preventDefault();
              setTab(next);
              document.getElementById('task-tab-' + next)?.focus();
            }
          }}
        >
          <button
            role="tab"
            id="task-tab-subtasks"
            aria-controls="task-detail-panel"
            tabIndex={tab === 'subtasks' ? 0 : -1}
            aria-selected={tab === 'subtasks'}
            onClick={() => setTab('subtasks')}
          >
            Subtasks <span>{subtasks.length}</span>
          </button>
          <button
            role="tab"
            id="task-tab-comments"
            aria-controls="task-detail-panel"
            tabIndex={tab === 'comments' ? 0 : -1}
            aria-selected={tab === 'comments'}
            onClick={() => setTab('comments')}
          >
            Comments <span>{task.comments?.length || 0}</span>
          </button>
          <button
            role="tab"
            id="task-tab-activity"
            aria-controls="task-detail-panel"
            tabIndex={tab === 'activity' ? 0 : -1}
            aria-selected={tab === 'activity'}
            onClick={() => setTab('activity')}
          >
            Activity
          </button>
        </div>
        <div
          className="detail-tab-content"
          id="task-detail-panel"
          role="tabpanel"
          aria-labelledby={'task-tab-' + tab}
        >
          {tab === 'subtasks' && (
            <>
              <div className="subtask-summary">
                <span>
                  {completed} of {subtasks.length} completed
                </span>
                <span>{progress}%</span>
              </div>
              {subtasks.map((s) => (
                <div className={'subtask-row ' + (s.done ? 'is-done' : '')} key={s.id}>
                  <label>
                    <input
                      type="checkbox"
                      aria-label={s.title}
                      checked={s.done}
                      disabled={!canWrite}
                      onChange={() =>
                        changeSubtasks(
                          subtasks.map((x) => (x.id === s.id ? { ...x, done: !x.done } : x)),
                        )
                      }
                    />
                    <span>{s.title}</span>
                  </label>
                  {canWrite && (
                    <button
                      className="icon-btn"
                      aria-label={'Remove subtask ' + s.title}
                      onClick={() => changeSubtasks(subtasks.filter((x) => x.id !== s.id))}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
              {!subtasks.length && (
                <div className="detail-empty">
                  <CheckCircle2 size={23} />
                  <strong>Small steps. Clear progress.</strong>
                  <p>Break this task into the things that need to happen.</p>
                </div>
              )}
              {canWrite && (
                <form className="add-subtask-form" onSubmit={addSubtask}>
                  <Plus size={16} />
                  <input
                    aria-label="New subtask"
                    value={draft}
                    maxLength={200}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Add a subtask…"
                  />
                  <button
                    type="button"
                    onClick={addSubtask}
                    className="btn secondary"
                    disabled={!draft.trim()}
                  >
                    Add
                  </button>
                </form>
              )}
            </>
          )}
          {tab === 'comments' && (
            <div className="drawer-comments">
              {task.comments?.map((c) => (
                <article className="drawer-comment" key={c.id}>
                  <Avatar name={c.name} size={30} />
                  <div>
                    <header>
                      <strong>{c.name}</strong>
                      <time>
                        {c.created_at
                          ? new Date(c.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })
                          : ''}
                      </time>
                    </header>
                    <p>{c.body}</p>
                  </div>
                </article>
              ))}
              {!task.comments?.length && (
                <div className="detail-empty">
                  <MessageSquare size={23} />
                  <strong>Keep the conversation close.</strong>
                  <p>Feedback and updates belong right here.</p>
                </div>
              )}
              {canComment && (
                <form
                  className="drawer-comment-form"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (comment.trim()) await onComment(task, comment.trim());
                  }}
                >
                  <textarea
                    aria-label="Leave a comment"
                    value={comment}
                    maxLength={3000}
                    required
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share feedback or an update…"
                    rows={3}
                  />
                  <button className="btn primary" disabled={!comment.trim()}>
                    Post comment <ArrowRight size={14} />
                  </button>
                </form>
              )}
            </div>
          )}
          {tab === 'activity' && (
            <div className="drawer-activity">
              <p className="form-hint">Recent updates from this project.</p>
              {activity
                .filter((a) => a.project_id === task.project_id)
                .slice(0, 8)
                .map((a) => (
                  <article key={a.id}>
                    <span className="activity-line-dot" />
                    <div>
                      <strong>{a.name}</strong>
                      <p>{a.message}</p>
                      <time>
                        {new Date(a.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </time>
                    </div>
                  </article>
                ))}
              {!activity.some((a) => a.project_id === task.project_id) && (
                <div className="detail-empty">
                  <Activity size={23} />
                  <p>No project updates yet.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      {canWrite && (
        <footer className="drawer-save">
          <button
            className="icon-btn delete-task-btn"
            aria-label="Delete task"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={16} />
          </button>
          <span>{dirty ? 'Unsaved changes' : 'All changes saved'}</span>
          <button className="btn primary" form="task-detail-form" disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </footer>
      )}
      {confirmDelete && (
        <div className="delete-confirm">
          <p>Delete this task and its comments?</p>
          <button className="btn danger" onClick={() => onDelete(task)}>
            Delete task
          </button>
          <button className="btn secondary" onClick={() => setConfirmDelete(false)}>
            Keep task
          </button>
        </div>
      )}
    </Modal>
  );
}
