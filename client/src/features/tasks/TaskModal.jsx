import TaskDetails from './TaskDetails.jsx';
import React, { useState, useEffect } from 'react';
import { ArrowRight, Trash2 } from 'lucide-react';
import { columns } from '../../lib/data.js';
import { Avatar } from '../../components/ui.jsx';
import Modal from '../../components/Modal.jsx';
function TaskModal({
  task,
  defaultStatus,
  project,
  projects,
  members,
  canWrite,
  canComment,
  onClose,
  onSave,
  onDelete,
  onComment,
  activity,
}) {
  const [comment, setComment] = useState(''),
    [confirmDelete, setConfirmDelete] = useState(false),
    [saving, setSaving] = useState(false);
  const t = task || {};
  if (task)
    return (
      <TaskDetails
        {...{
          task,
          projects,
          members,
          canWrite,
          canComment,
          onClose,
          onSave,
          onDelete,
          onComment,
          activity,
        }}
      />
    );
  return (
    <Modal
      wide
      title={task ? 'Task details' : 'Create a task'}
      subtitle={projects.find((p) => p.id === (t.project_id || project?.id))?.name}
      onClose={onClose}
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaving(true);
          const f = new FormData(e.currentTarget);
          await onSave(
            {
              project_id: t.project_id || project.id,
              title: f.get('title'),
              description: f.get('description'),
              status: f.get('status'),
              priority: f.get('priority'),
              assignee_id: f.get('assignee_id') || null,
              due_date: f.get('due_date') || null,
              visibility: f.get('visibility'),
              label: f.get('label'),
            },
            task,
          );
          setSaving(false);
        }}
      >
        <label>
          Task name
          <input
            name="title"
            defaultValue={t.title || ''}
            required
            maxLength={200}
            readOnly={!canWrite}
            placeholder="What needs to get done?"
            autoFocus
          />
        </label>
        <label>
          Description
          <textarea
            name="description"
            defaultValue={t.description || ''}
            maxLength={5000}
            readOnly={!canWrite}
            placeholder="Add some context…"
            rows={3}
          />
        </label>
        <div className="form-grid">
          <label>
            Status
            <select
              name="status"
              defaultValue={t.status || defaultStatus || 'To do'}
              disabled={!canWrite}
            >
              {columns.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select name="priority" defaultValue={t.priority || 'Medium'} disabled={!canWrite}>
              {['Low', 'Medium', 'High', 'Urgent'].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          <label>
            Assignee
            <select name="assignee_id" defaultValue={t.assignee_id || ''} disabled={!canWrite}>
              <option value="">Unassigned</option>
              {members.map((m) => (
                <option value={m.id} key={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Due date
            <input
              name="due_date"
              type="date"
              defaultValue={t.due_date?.slice(0, 10) || ''}
              readOnly={!canWrite}
            />
          </label>
          <label>
            Label
            <input
              name="label"
              maxLength={50}
              defaultValue={t.label || ''}
              readOnly={!canWrite}
              placeholder="Design, content, strategy…"
            />
          </label>
          <label>
            Visibility
            <select
              name="visibility"
              defaultValue={t.visibility || 'internal'}
              disabled={!canWrite}
            >
              <option value="internal">Internal team only</option>
              <option value="client">Shared with client</option>
            </select>
          </label>
        </div>
        {canWrite && (
          <div className="modal-actions">
            {task && (
              <button type="button" className="btn danger" onClick={() => setConfirmDelete(true)}>
                <Trash2 size={14} />
                Delete
              </button>
            )}
            <button type="button" className="btn secondary" onClick={onClose}>
              Cancel
            </button>
            <button disabled={saving} className="btn primary">
              {saving ? 'Saving…' : task ? 'Save changes' : 'Create task'}
            </button>
          </div>
        )}
      </form>
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
      {task && (
        <div className="task-comments">
          <h3>
            Conversation <span>{t.comments?.length || 0}</span>
          </h3>
          {t.comments?.map((c) => (
            <div className="comment" key={c.id}>
              <Avatar name={c.name} size={27} />
              <div>
                <strong>{c.name}</strong>
                <p>{c.body}</p>
              </div>
            </div>
          ))}
          {!t.comments?.length && (
            <p className="form-hint">A good place for feedback, questions, and updates.</p>
          )}
          {canComment && (
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (comment.trim()) await onComment(task, comment.trim());
              }}
            >
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                required
                maxLength={3000}
                placeholder="Leave a comment…"
                rows={2}
              />
              <button className="btn secondary" disabled={!comment.trim()}>
                Post comment <ArrowRight size={14} />
              </button>
            </form>
          )}
        </div>
      )}
    </Modal>
  );
}
export default TaskModal;
