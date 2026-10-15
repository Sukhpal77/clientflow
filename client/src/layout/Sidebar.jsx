import {
  Layers,
  Plus,
  LayoutDashboard,
  CheckCircle2,
  Activity,
  Users,
  Settings,
  Lock,
  ArrowUpRight,
  LogOut,
  Briefcase,
  X,
} from 'lucide-react';
import { Avatar, initials } from '../components/ui.jsx';
import { demoMode, api } from '../lib/data.js';
export default function Sidebar({ model }) {
  const {
    page,
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
  } = model;
  function navigate(next) {
    setPage(next);
    setSidebar(false);
    setQuery('');
  }
  return (
    <aside className={'sidebar ' + (sidebar ? 'visible' : '')}>
      <div className="sidebar-brand-row">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate('overview');
          }}
        >
          <span className="brand-icon">
            <Layers size={23} />
          </span>
          ClientFlow<span className="brand-dot">.</span>
        </a>
        <button
          className="icon-btn sidebar-close"
          aria-label="Close navigation"
          onClick={() => setSidebar(false)}
        >
          <X size={18} />
        </button>
      </div>
      <div className="workspace-select">
        <span className="workspace-logo">{initials(ws?.name)}</span>
        <div>
          <span className="eyebrow">WORKSPACE</span>
          <select
            aria-label="Select workspace"
            value={wid}
            onChange={(e) => {
              setWid(e.target.value);
              navigate('overview');
            }}
          >
            {data.workspaces
              .filter((w) => !demoMode || w.kind !== 'personal' || w.owner_id === data.user.id)
              .map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
          </select>
        </div>
      </div>
      {((write && projects.length > 0) || manage) && (
        <button
          className="sidebar-create"
          onClick={() => {
            if (projects.length) {
              setPid(projects[0].id);
              setModal({ type: 'task' });
            } else setModal({ type: 'project' });
          }}
        >
          <Plus size={16} />
          {projects.length ? 'Create task' : 'Create project'}
          <kbd>+</kbd>
        </button>
      )}
      <div className="nav-section-title main-nav-title">MENU</div>
      <nav>
        <button
          className={page === 'overview' ? 'active' : ''}
          onClick={() => navigate('overview')}
        >
          <LayoutDashboard size={18} />
          Overview
        </button>
        <button className={page === 'mytasks' ? 'active' : ''} onClick={() => navigate('mytasks')}>
          <CheckCircle2 size={18} />
          My tasks
          <span className="nav-count">
            {taskList.filter((t) => t.assignee_id === data.user.id && t.status !== 'Done').length}
          </span>
        </button>
        <button
          className={page === 'activity' ? 'active' : ''}
          onClick={() => navigate('activity')}
        >
          <Activity size={18} />
          Activity
        </button>
        <button className={page === 'members' ? 'active' : ''} onClick={() => navigate('members')}>
          <Users size={18} />
          People & access
        </button>
      </nav>
      <div className="nav-section-title">
        PROJECTS{' '}
        <span className="section-title-actions">
          <span>{projects.length}</span>
          {manage && (
            <button
              className="icon-btn small"
              aria-label="Create project"
              onClick={() => setModal({ type: 'project' })}
            >
              <Plus size={14} />
            </button>
          )}
        </span>
      </div>
      <nav className="projects-nav">
        {projects.map((p) => (
          <button
            key={p.id}
            className={page === 'board' && pid === p.id ? 'active' : ''}
            onClick={() => {
              setPid(p.id);
              navigate('board');
            }}
          >
            <span className="project-dot" style={{ background: p.color }} />
            <span className="project-nav-title">{p.name}</span>
            {p.visibility === 'private' && <Lock size={12} className="push-right" />}
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-focus">
          <div className="focus-orbit">
            <span />
            <i />
            <span />
          </div>
          <span className="focus-icon">
            <Briefcase size={18} />
          </span>
          <h4>
            A little less busy.
            <br />A lot more in flow.
          </h4>
          <p>Your projects, people, and next steps. Together.</p>
          <button onClick={() => navigate('overview')}>
            See the big picture <ArrowUpRight size={14} />
          </button>
        </div>
        <div className="nav-section-title other-title">WORKSPACE</div>
        <nav>
          <button
            className={page === 'settings' ? 'active' : ''}
            onClick={() => navigate('settings')}
          >
            <Settings size={18} />
            Settings
          </button>
          {!demoMode && (
            <button
              onClick={async () => {
                await api('/auth/logout', 'POST');
                setData(null);
              }}
            >
              <LogOut size={18} />
              Log out
            </button>
          )}
        </nav>
        <div className="profile">
          <Avatar name={data.user.name} size={35} />
          <div>
            <strong>{data.user.name}</strong>
            <span>
              {role === 'client'
                ? 'Client collaborator'
                : role.charAt(0).toUpperCase() + role.slice(1)}
            </span>
          </div>
          <span className="profile-online" />
        </div>
      </div>
    </aside>
  );
}
