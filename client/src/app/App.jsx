import ManagementDialogs from '../features/workspace/ManagementDialogs.jsx';
import InvitationBanner from '../features/members/InvitationBanner.jsx';
import Sidebar from '../layout/Sidebar.jsx';
import ProjectBoard from '../features/projects/ProjectBoard.jsx';
import Overview from '../features/workspace/Overview.jsx';
import MyTasks from '../features/tasks/MyTasks.jsx';
import Members from '../features/members/Members.jsx';
import ActivityFeed from '../features/workspace/ActivityFeed.jsx';
import SettingsPage from '../features/workspace/SettingsPage.jsx';
import React, { useState, useEffect } from 'react';
import { Layers, ChevronRight, Activity, CheckCircle2, Menu } from 'lucide-react';
import { initial, people, roles, demoMode, loadDemo, visibleProjects, api } from '../lib/data.js';
import { Avatar } from '../components/ui.jsx';

import TaskModal from '../features/tasks/TaskModal.jsx';
import ProjectModal from '../features/projects/ProjectModal.jsx';
import InviteModal from '../features/members/InviteModal.jsx';

import Auth from '../features/auth/Auth.jsx';
import Modal from '../components/Modal.jsx';

function App() {
  const [data, setData] = useState(() => (demoMode ? loadDemo() : null)),
    [loading, setLoading] = useState(!demoMode),
    [error, setError] = useState(''),
    [wid, setWid] = useState(''),
    [pid, setPid] = useState(''),
    [page, setPage] = useState('overview'),
    [view, setView] = useState('board'),
    [query, setQuery] = useState(''),
    [priority, setPriority] = useState('All'),
    [assigned, setAssigned] = useState(false),
    [modal, setModal] = useState(null),
    [toast, setToast] = useState(''),
    [filterOpen, setFilterOpen] = useState(false),
    [sidebar, setSidebar] = useState(false);
  const notify = (s) => {
    setToast(s);
    setTimeout(() => setToast(''), 4000);
  };
  async function reload() {
    try {
      const d = await api('/bootstrap');
      setData(d);
      setError('');
    } catch (e) {
      if (e.status === 401) {
        setData(null);
        setError('');
      } else setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (!demoMode) reload();
  }, []);
  useEffect(() => {
    if (demoMode || !data?.user.id) return;
    const refresh = () => {
      if (!document.hidden) reload();
    };
    const timer = setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', refresh);
    };
  }, [data?.user.id]);
  useEffect(() => {
    if (demoMode && data) localStorage.setItem('clientflow-demo-v1', JSON.stringify(data));
  }, [data]);
  useEffect(() => {
    if (data && !data.workspaces.find((w) => w.id === wid)) setWid(data.workspaces[0]?.id || '');
  }, [data, wid]);
  const ws = data?.workspaces.find((w) => w.id === wid) || data?.workspaces[0],
    role = demoMode
      ? data?.members.find((m) => m.workspace_id === ws?.id && m.id === data.user.id)?.role
      : ws?.role;
  const manage = ['owner', 'admin'].includes(role),
    write = manage || role === 'member',
    projects = data
      ? demoMode
        ? visibleProjects(data, wid)
        : data.projects.filter((p) => p.workspace_id === wid)
      : [];
  useEffect(() => {
    if (!projects.find((p) => p.id === pid)) setPid(projects[0]?.id || '');
  }, [wid, pid, projects.map((p) => p.id).join('|')]);
  const project = projects.find((p) => p.id === pid),
    members =
      data?.members.filter(
        (m) => m.workspace_id === wid && (role !== 'client' || m.id === data.user.id),
      ) || [],
    taskList = (data?.tasks || []).filter(
      (t) =>
        projects.some((p) => p.id === t.project_id) &&
        (role !== 'client' || t.visibility === 'client'),
    );
  const filtered = taskList.filter(
    (t) =>
      (page === 'mytasks'
        ? t.assignee_id === data.user.id
        : page === 'board'
          ? t.project_id === pid
          : true) &&
      (!query ||
        (t.title + ' ' + t.description + ' ' + t.label)
          .toLowerCase()
          .includes(query.toLowerCase())) &&
      (priority === 'All' || t.priority === priority) &&
      (!assigned || t.assignee_id === data.user.id),
  );
  const memberFor = (id) => data.members.find((m) => m.id === id),
    projectFor = (id) => data.projects.find((p) => p.id === id);
  const demoLog = (d, msg, projectId, visibility = 'internal') => {
    d.activity.unshift({
      id: crypto.randomUUID(),
      workspace_id: wid,
      project_id: projectId || null,
      name: d.user.name,
      message: msg,
      visibility,
      created_at: new Date().toISOString(),
    });
    return d;
  };
  async function mutate(endpoint, method, body, transform, msg) {
    try {
      if (demoMode) {
        const d = structuredClone(data);
        transform(d);
        setData(d);
      } else {
        await api(endpoint, method, body);
        await reload();
      }
      if (msg) notify(msg);
      return true;
    } catch (e) {
      if (e.status === 409 && !demoMode) await reload();
      notify(e.message);
      return false;
    }
  }
  async function saveTask(body, existing) {
    if (!write) return;
    const taskId = existing?.id || crypto.randomUUID();
    const ok = await mutate(
      existing ? '/tasks/' + taskId : '/tasks',
      existing ? 'PATCH' : 'POST',
      existing ? { ...body, revision: existing.revision || 1 } : body,
      (d) => {
        if (existing) {
          const i = d.tasks.findIndex((t) => t.id === taskId);
          d.tasks[i] = { ...d.tasks[i], ...body, revision: (d.tasks[i].revision || 1) + 1 };
        } else
          d.tasks.push({
            ...body,
            id: taskId,
            comments: [],
            subtasks: [],
            created_at: new Date().toISOString(),
          });
        demoLog(
          d,
          (existing ? 'Updated ' : 'Created ') + body.title,
          body.project_id,
          body.visibility,
        );
      },
      existing ? 'Task updated' : 'Task created',
    );
    if (ok) setModal(null);
  }
  async function moveTask(t, status) {
    if (!write || t.status === status) return;
    await mutate(
      '/tasks/' + t.id,
      'PATCH',
      { status, revision: t.revision || 1 },
      (d) => {
        d.tasks.find((x) => x.id === t.id).status = status;
        demoLog(d, 'Moved ' + t.title + ' to ' + status, t.project_id, t.visibility);
      },
      'Task moved to ' + status,
    );
  }
  const openTask = (t) => setModal({ type: 'task', task: t });
  useEffect(() => {
    if (modal) setSidebar(false);
  }, [modal]);
  useEffect(() => {
    setModal(null);
    if (!demoMode) {
      setPage('overview');
      setQuery('');
      setAssigned(false);
      setPriority('All');
    }
  }, [data?.user.id]);
  useEffect(() => {
    if (demoMode || !data || !modal) return;
    const taskUnavailable = modal.task && !data.tasks.some((t) => t.id === modal.task.id);
    const projectUnavailable =
      modal.project && !data.projects.some((p) => p.id === modal.project.id);
    const managementTypes = [
      'project',
      'access',
      'workspace',
      'rename-workspace',
      'archive-project',
      'remove-member',
      'revoke-invitation',
      'invite',
    ];
    if (taskUnavailable || projectUnavailable || (managementTypes.includes(modal.type) && !manage))
      setModal(null);
  }, [data, modal?.task?.id, modal?.project?.id, manage]);
  if (loading)
    return (
      <div className="loading">
        <span className="brand-icon">
          <Layers />
        </span>
        <h2>Opening ClientFlow…</h2>
      </div>
    );
  if (!data) return <Auth onDone={reload} error={error} />;
  const activeTasks = taskList.filter((t) => t.status !== 'Done'),
    doneTasks = taskList.filter((t) => t.status === 'Done');
  const model = {
    page,
    demoLog,
    sidebar,
    ws,
    wid,
    data,
    setWid,
    setPage,
    setSidebar,
    projects,
    pid,
    manage,
    write,
    taskList,
    role,
    setModal,
    setPid,
    setQuery,
    setData,
    project,
    members,
    activeTasks,
    doneTasks,
    view,
    setView,
    query,
    priority,
    setPriority,
    assigned,
    setAssigned,
    filterOpen,
    setFilterOpen,
    filtered,
    memberFor,
    projectFor,
    openTask,
    moveTask,
    mutate,
    notify,
  };
  return (
    <div className="app-shell">
      <Sidebar model={model} />
      {sidebar && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation overlay"
          onClick={() => setSidebar(false)}
        />
      )}
      <main>
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="icon-btn mobile-menu"
              onClick={() => setSidebar(!sidebar)}
              aria-label="Toggle navigation"
            >
              <Menu size={20} />
            </button>
            <span>{ws?.name}</span>
            <ChevronRight size={14} />
            <strong>
              {page === 'board'
                ? project?.name || 'Projects'
                : {
                    overview: 'Overview',
                    mytasks: 'My tasks',
                    members: 'People & access',
                    activity: 'Activity',
                    settings: 'Workspace settings',
                  }[page]}
            </strong>
          </div>
          <div className="topbar-right">
            {demoMode && (
              <span className="demo-badge">
                <span /> Interactive demo
              </span>
            )}
            <span className="top-divider" />
            <Avatar name={data.user.name} size={30} />
          </div>
        </header>
        {demoMode && (
          <div className="demo-strip">
            <span>Preview mode · Changes are saved in this browser.</span>
            <label>
              Preview as{' '}
              <select
                aria-label="Preview role"
                value={data.user.role}
                onChange={(e) => {
                  const p = people.find((x) => x.role === e.target.value);
                  setData({ ...data, user: p });
                  setWid('w1');
                  setPage('board');
                  setPid('p1');
                }}
              >
                {roles
                  .filter((r) =>
                    data.members.some(
                      (m) =>
                        m.workspace_id === 'w1' && m.id === people.find((p) => p.role === r)?.id,
                    ),
                  )
                  .map((r) => (
                    <option key={r}>{r}</option>
                  ))}
              </select>
            </label>
          </div>
        )}
        <div className={'main-content page-' + page}>
          {error && (
            <div role="alert" className="error-message">
              Connection issue: {error}. Your displayed data may be out of date.
            </div>
          )}
          {!demoMode && (
            <InvitationBanner
              onJoined={async (workspaceId) => {
                await reload();
                setWid(workspaceId);
                setPage('overview');
              }}
            />
          )}
          {page === 'board' && <ProjectBoard model={model} />}
          {page === 'overview' && <Overview model={model} />}
          {page === 'mytasks' && <MyTasks model={model} />}
          {page === 'members' && <Members model={model} />}
          {page === 'activity' && <ActivityFeed model={model} />}
          {page === 'settings' && <SettingsPage model={model} />}
        </div>
        <footer className="app-footer">
          <span>ClientFlow</span>
          <span>Made for the way agencies work.</span>
        </footer>
      </main>
      {toast && (
        <div role="status" className="toast">
          <CheckCircle2 size={18} />
          {toast}
        </div>
      )}
      {modal?.type === 'task' && (
        <TaskModal
          task={modal.task}
          defaultStatus={modal.status}
          project={project}
          projects={projects}
          members={(role === 'client'
            ? data.members.filter(
                (m) => m.workspace_id === wid && taskList.some((t) => t.assignee_id === m.id),
              )
            : members
          ).filter((m) => {
            const p = modal.task ? projectFor(modal.task.project_id) : project;
            return (
              p &&
              (['owner', 'admin'].includes(m.role) ||
                p.member_ids?.includes(m.id) ||
                (m.role !== 'client' && p.visibility === 'team'))
            );
          })}
          canWrite={write}
          canComment={role !== 'viewer'}
          activity={data.activity.filter((a) => role !== 'client' || a.visibility === 'client')}
          onClose={() => setModal(null)}
          onSave={saveTask}
          onDelete={async (t) => {
            const ok = await mutate(
              '/tasks/' + t.id,
              'DELETE',
              { revision: t.revision || 1 },
              (d) => {
                d.tasks = d.tasks.filter((x) => x.id !== t.id);
                demoLog(d, 'Deleted ' + t.title, t.project_id, t.visibility);
              },
              'Task deleted',
            );
            if (ok) setModal(null);
          }}
          onComment={async (t, body) => {
            const ok = await mutate(
              '/tasks/' + t.id + '/comments',
              'POST',
              { body },
              (d) => {
                d.tasks
                  .find((x) => x.id === t.id)
                  .comments.push({
                    id: crypto.randomUUID(),
                    name: data.user.name,
                    body,
                    created_at: new Date().toISOString(),
                  });
                demoLog(d, 'Commented on ' + t.title, t.project_id, t.visibility);
              },
              'Comment added',
            );
            if (ok) setModal(null);
          }}
        />
      )}
      {modal?.type === 'project' && (
        <ProjectModal
          project={modal.project}
          onClose={() => setModal(null)}
          onSave={async (body) => {
            const p = { ...body, workspace_id: wid };
            const newId = crypto.randomUUID();
            const ok = await mutate(
              modal.project ? '/projects/' + modal.project.id : '/projects',
              modal.project ? 'PATCH' : 'POST',
              p,
              (d) => {
                if (modal.project) {
                  const idx = d.projects.findIndex((x) => x.id === modal.project.id);
                  d.projects[idx] = { ...d.projects[idx], ...p };
                  demoLog(d, 'Updated project ' + p.name, modal.project.id);
                } else {
                  d.projects.push({ ...p, id: newId, member_ids: [data.user.id] });
                  demoLog(d, 'Created project ' + p.name, newId);
                }
              },
              modal.project ? 'Project updated' : 'Project created',
            );
            if (ok) {
              setModal(null);
              if (!modal.project) setPage('overview');
            }
          }}
        />
      )}
      {modal?.type === 'invite' && (
        <InviteModal
          actorRole={role}
          projects={projects}
          onClose={() => setModal(null)}
          onSave={async (b) => {
            try {
              if (demoMode) {
                const d = structuredClone(data);
                d.invitations.push({ ...b, id: crypto.randomUUID(), workspace_id: wid });
                demoLog(d, 'Invited ' + b.email + ' as ' + b.role);
                setData(d);
                return 'Demo invitation saved. Live mode generates a shareable invitation link.';
              }
              const r = await api('/invitations', 'POST', { ...b, workspace_id: wid });
              await reload();
              return location.origin + '/?invite=' + r.token;
            } catch (e) {
              throw e;
            }
          }}
        />
      )}
      {modal?.type === 'access' && (
        <Modal
          title={'Project access for ' + modal.member.name}
          subtitle="Private projects and clients require explicit project access."
          onClose={() => setModal(null)}
        >
          <div className="access-projects">
            {projects.map((p) => {
              const yes = p.member_ids?.includes(modal.member.id);
              return (
                <div key={p.id}>
                  <span>
                    <span className="project-dot" style={{ background: p.color }} />
                    {p.name}
                  </span>
                  <button
                    className={'btn ' + (yes ? 'secondary' : 'primary')}
                    onClick={() =>
                      mutate(
                        '/projects/' + p.id + '/members/' + modal.member.id,
                        yes ? 'DELETE' : 'PUT',
                        null,
                        (d) => {
                          const pr = d.projects.find((x) => x.id === p.id);
                          pr.member_ids = yes
                            ? pr.member_ids.filter((x) => x !== modal.member.id)
                            : [...pr.member_ids, modal.member.id];
                        },
                        yes ? 'Access removed' : 'Access granted',
                      )
                    }
                  >
                    {yes ? 'Remove access' : 'Grant access'}
                  </button>
                </div>
              );
            })}
          </div>
          <p className="form-hint">
            Members and viewers can also access all team projects. Clients can only access projects
            explicitly granted here.
          </p>
        </Modal>
      )}
      {modal?.type === 'workspace' && (
        <Modal
          title="Create a workspace"
          subtitle="Keep different teams and agencies organized."
          onClose={() => setModal(null)}
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const name = new FormData(e.currentTarget).get('name');
              const newId = crypto.randomUUID();
              const ok = await mutate(
                '/workspaces',
                'POST',
                { name },
                (d) => {
                  d.workspaces.push({
                    id: newId,
                    name,
                    kind: 'agency',
                    owner_id: data.user.id,
                    role: 'owner',
                  });
                  d.members.push({ ...data.user, role: 'owner', workspace_id: newId });
                },
                'Workspace created',
              );
              if (ok) setModal(null);
            }}
          >
            <label>
              Workspace name
              <input
                required
                name="name"
                maxLength={200}
                autoFocus
                placeholder="Your agency name"
              />
            </label>
            <div className="modal-actions">
              <button type="button" className="btn secondary" onClick={() => setModal(null)}>
                Cancel
              </button>
              <button className="btn primary">Create workspace</button>
            </div>
          </form>
        </Modal>
      )}
      <ManagementDialogs modal={modal} model={model} onClose={() => setModal(null)} />
      {modal?.type === 'reset' && (
        <Modal
          title="Reset the demo?"
          subtitle="Your browser-stored demo changes will be replaced by the sample workspace."
          onClose={() => setModal(null)}
        >
          <div className="modal-actions">
            <button className="btn secondary" onClick={() => setModal(null)}>
              Cancel
            </button>
            <button
              className="btn primary"
              onClick={() => {
                setData(structuredClone(initial));
                setWid('w1');
                setPid('p1');
                setPage('board');
                setModal(null);
                notify('Demo reset');
              }}
            >
              Reset demo
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
export default App;
