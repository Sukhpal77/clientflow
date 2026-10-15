import React from 'react';
import Modal from '../../components/Modal.jsx';
export default function ManagementDialogs({ modal, model, onClose }) {
  const { manage, mutate, demoLog, wid, ws } = model;
  if (!manage) return null;
  const actions = {
    'archive-project': {
      title: 'Archive ' + modal?.project?.name + '?',
      description:
        'The project and its tasks will be kept. You can restore it from workspace settings.',
      endpoint: '/projects/' + modal?.project?.id + '/archive',
      method: 'POST',
      message: 'Project archived',
      transform: (d) => {
        d.projects.find((p) => p.id === modal.project.id).archived_at = new Date().toISOString();
        demoLog(d, 'Archived project ' + modal.project.name, modal.project.id);
      },
    },
    'remove-member': {
      title: 'Remove ' + modal?.member?.name + '?',
      description:
        'This person will lose workspace and project access. Their tasks will become unassigned; comments will be kept.',
      endpoint: '/members/' + wid + '/' + modal?.member?.id,
      method: 'DELETE',
      message: 'Member removed',
      transform: (d) => {
        const ids = d.projects.filter((p) => p.workspace_id === wid).map((p) => p.id);
        d.members = d.members.filter((m) => m.workspace_id !== wid || m.id !== modal.member.id);
        d.projects.forEach((p) => {
          if (ids.includes(p.id))
            p.member_ids = p.member_ids?.filter((id) => id !== modal.member.id);
        });
        d.tasks.forEach((t) => {
          if (ids.includes(t.project_id) && t.assignee_id === modal.member.id) {
            t.assignee_id = null;
            t.revision = (t.revision || 1) + 1;
          }
        });
        d.invitations = d.invitations.filter(
          (i) => i.workspace_id !== wid || i.email !== modal.member.email,
        );
        demoLog(d, 'Removed ' + modal.member.name + ' from the workspace');
      },
    },
    'revoke-invitation': {
      title: 'Revoke this invitation?',
      description: 'The invitation link for ' + modal?.invitation?.email + ' will stop working.',
      endpoint: '/invitations/' + modal?.invitation?.id,
      method: 'DELETE',
      message: 'Invitation revoked',
      transform: (d) => {
        d.invitations = d.invitations.filter((i) => i.id !== modal.invitation.id);
        demoLog(d, 'Revoked invitation for ' + modal.invitation.email);
      },
    },
  };
  if (modal?.type === 'rename-workspace')
    return (
      <Modal title="Rename workspace" subtitle="Make this workspace your own." onClose={onClose}>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const name = new FormData(e.currentTarget).get('name');
            const ok = await mutate(
              '/workspaces/' + wid,
              'PATCH',
              { name },
              (d) => {
                d.workspaces.find((w) => w.id === wid).name = name;
                demoLog(d, 'Renamed workspace to ' + name);
              },
              'Workspace renamed',
            );
            if (ok) onClose();
          }}
        >
          <label>
            Workspace name
            <input name="name" required maxLength={200} defaultValue={ws.name} autoFocus />
          </label>
          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="btn primary">Save name</button>
          </div>
        </form>
      </Modal>
    );
  const action = actions[modal?.type];
  if (!action) return null;
  return (
    <Modal title={action.title} subtitle={action.description} onClose={onClose}>
      <div className="modal-actions">
        <button className="btn secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          className="btn primary"
          onClick={async () => {
            const ok = await mutate(
              action.endpoint,
              action.method,
              null,
              action.transform,
              action.message,
            );
            if (ok) onClose();
          }}
        >
          Confirm
        </button>
      </div>
    </Modal>
  );
}
