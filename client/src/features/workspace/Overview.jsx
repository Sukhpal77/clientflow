import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  TrendingUp,
  CalendarDays,
  ArrowUpRight,
  Plus,
  ArrowRight,
  FolderKanban,
  Activity,
  ChevronRight,
} from 'lucide-react';
import { Avatar, prettyDate } from '../../components/ui.jsx';
import { columns } from '../../lib/data.js';
function localDay(date) {
  return (
    date.getFullYear() +
    '-' +
    String(date.getMonth() + 1).padStart(2, '0') +
    '-' +
    String(date.getDate()).padStart(2, '0')
  );
}
export default function Overview({ model }) {
  const {
    data,
    ws,
    role,
    projects,
    manage,
    write,
    taskList,
    doneTasks,
    setModal,
    setPage,
    setPid,
    openTask,
    query,
  } = model;
  const [range, setRange] = useState(7),
    [taskFilter, setTaskFilter] = useState('active');
  const completion = Math.round((doneTasks.length / (taskList.length || 1)) * 100),
    inProgress = taskList.filter((t) => t.status === 'In progress').length;
  const today = new Date(),
    dates = Array.from({ length: range }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d;
    });
  const scheduled = dates.map(
      (d) =>
        taskList.filter((t) => t.due_date?.slice(0, 10) === localDay(d) && t.status !== 'Done')
          .length,
    ),
    finished = dates.map(
      (d) =>
        taskList.filter((t) => t.due_date?.slice(0, 10) === localDay(d) && t.status === 'Done')
          .length,
    ),
    max = Math.max(...scheduled, ...finished, 3);
  const points = (values) =>
    values.map((v, i) => [45 + (i * 520) / (range - 1), 146 - (v / max) * 110]);
  const pathFor = (values) =>
    points(values)
      .map(([x, y], i) => (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1))
      .join(' ');
  const mainPath = pathFor(scheduled);
  const activity = data.activity
    .filter(
      (a) =>
        a.workspace_id === ws?.id &&
        (!a.project_id ? manage : projects.some((p) => p.id === a.project_id)) &&
        (role !== 'client' || a.visibility === 'client'),
    )
    .slice(0, 5);
  const current = taskList
    .filter(
      (t) =>
        (taskFilter === 'all' || t.status !== 'Done') &&
        (!query || (t.title + ' ' + t.label).toLowerCase().includes(query.toLowerCase())),
    )
    .sort((a, b) => (a.due_date || '9999').localeCompare(b.due_date || '9999'))
    .slice(0, 5);
  return (
    <div className="dashboard">
      <div className="dashboard-main">
        <div className="dashboard-heading">
          <div>
            <span className="kicker">WORKSPACE OVERVIEW</span>
            <h1>
              Hello, {data.user.name.split(' ')[0]} <span className="greeting-dot">✳</span>
            </h1>
            <p>Here’s what’s moving. Let’s make today a good one.</p>
          </div>
          <span className="dashboard-date">
            <CalendarDays size={15} />
            {today.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </span>
        </div>
        <div className="dashboard-metrics">
          <article className="metric-card featured">
            <div>
              <span>Completed tasks</span>
              <span className="metric-icon">
                <CheckCircle2 size={18} />
              </span>
            </div>
            <strong>{doneTasks.length.toString().padStart(2, '0')}</strong>
            <footer>
              <span className="metric-mini">{completion}%</span>of all workspace tasks
            </footer>
            <svg className="metric-spark" viewBox="0 0 100 40" aria-hidden="true">
              <path d="M0 34 Q20 35 28 23 T55 25 T78 12 T100 5" />
            </svg>
          </article>
          <article className="metric-card">
            <div>
              <span>In progress</span>
              <span className="metric-icon">
                <Clock size={18} />
              </span>
            </div>
            <strong>{inProgress.toString().padStart(2, '0')}</strong>
            <footer>
              <span className="metric-mini">{projects.length} projects</span>work taking shape
            </footer>
          </article>
          <article className="metric-card">
            <div>
              <span>Completion rate</span>
              <span className="metric-icon">
                <TrendingUp size={18} />
              </span>
            </div>
            <strong>
              {completion}
              <small>%</small>
            </strong>
            <footer>
              <span className="metric-mini green">
                {doneTasks.length}/{taskList.length}
              </span>
              tasks completed
            </footer>
          </article>
        </div>
        <section className="dashboard-panel workload-panel">
          <header>
            <div>
              <h2>Upcoming workload</h2>
              <p>Tasks scheduled by due date</p>
            </div>
            <select
              aria-label="Workload date range"
              value={range}
              onChange={(e) => setRange(Number(e.target.value))}
            >
              <option value={7}>Next 7 days</option>
              <option value={14}>Next 14 days</option>
            </select>
          </header>
          <div className="chart-legend">
            <span>
              <i />
              Open tasks
            </span>
            <span>
              <i />
              Completed tasks
            </span>
          </div>
          <div className="workload-chart">
            <svg
              viewBox="0 0 600 180"
              role="img"
              aria-label={
                'Due-date task counts over the next ' +
                range +
                ' days. ' +
                scheduled.reduce((a, b) => a + b, 0) +
                ' open tasks scheduled.'
              }
            >
              <defs>
                <linearGradient id="workload-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#368361" stopOpacity=".2" />
                  <stop offset="100%" stopColor="#368361" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[0, 1, 2, 3].map((i) => {
                const y = 146 - (i * 110) / 3;
                return (
                  <g key={i}>
                    <line x1="45" x2="565" y1={y} y2={y} stroke="#edf1ed" strokeDasharray="3 5" />
                    <text x="25" y={y + 4} textAnchor="end">
                      {Math.round((i * max) / 3)}
                    </text>
                  </g>
                );
              })}
              <path d={mainPath + ' L565 150 L45 150 Z'} fill="url(#workload-fill)" />
              <path d={pathFor(finished)} fill="none" stroke="#a7c8b8" strokeWidth="2" />
              <path
                d={mainPath}
                fill="none"
                stroke="#36795a"
                strokeWidth="2.5"
                strokeLinejoin="round"
              />
              {points(scheduled).map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r="3.5" fill="#36795a" stroke="white" strokeWidth="2">
                  <title>
                    {prettyDate(localDay(dates[i])) + ': ' + scheduled[i] + ' open tasks'}
                  </title>
                </circle>
              ))}
              {dates.map(
                (d, i) =>
                  (range === 7 || i % 2 === 0) && (
                    <text key={i} x={45 + (i * 520) / (range - 1)} y="174" textAnchor="middle">
                      {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </text>
                  ),
              )}
            </svg>
          </div>
        </section>
        <section className="dashboard-panel current-tasks">
          <header>
            <div>
              <h2>Current tasks</h2>
              <p>The next things that need your attention</p>
            </div>
            <select
              aria-label="Current tasks filter"
              value={taskFilter}
              onChange={(e) => setTaskFilter(e.target.value)}
            >
              <option value="active">Open tasks</option>
              <option value="all">All tasks</option>
            </select>
          </header>
          <div className="current-task-head">
            <span>TASK / PROJECT</span>
            <span>DUE DATE</span>
            <span>STATUS</span>
            <span />
          </div>
          {current.map((t, i) => {
            const p = projects.find((p) => p.id === t.project_id);
            return (
              <button className="current-task-row" key={t.id} onClick={() => openTask(t)}>
                <span className="current-task-name">
                  <span className={'task-symbol color-' + (i % 4)}>
                    <FolderKanban size={17} />
                  </span>
                  <span>
                    <strong>{t.title}</strong>
                    <small>{p?.name}</small>
                  </span>
                </span>
                <span>
                  <CalendarDays size={13} />
                  {prettyDate(t.due_date)}
                </span>
                <span>
                  <span className={'status-tag status-' + columns.indexOf(t.status)}>
                    {t.status}
                  </span>
                </span>
                <ChevronRight size={16} />
              </button>
            );
          })}
          {!current.length && (
            <div className="dashboard-empty">
              <CheckCircle2 size={25} />
              <p>Your task list is clear.</p>
            </div>
          )}
          <footer>
            <button onClick={() => setPage('mytasks')}>
              View my tasks <ArrowRight size={14} />
            </button>
            {write && projects.length > 0 && (
              <button
                onClick={() => {
                  setPid(projects[0].id);
                  setModal({ type: 'task' });
                }}
              >
                <Plus size={14} />
                New task
              </button>
            )}
          </footer>
        </section>
        <section className="dashboard-projects">
          <header>
            <h2>
              Your projects <span>{projects.length}</span>
            </h2>
            {manage && (
              <button onClick={() => setModal({ type: 'project' })}>
                <Plus size={14} />
                New project
              </button>
            )}
          </header>
          <div>
            {projects.map((p) => {
              const tasks = taskList.filter((t) => t.project_id === p.id),
                done = tasks.filter((t) => t.status === 'Done').length;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setPid(p.id);
                    setPage('board');
                  }}
                >
                  <span className="project-dot" style={{ background: p.color }} />
                  <strong>{p.name}</strong>
                  <span>{p.client || 'Personal'}</span>
                  <div className="progress-track">
                    <i
                      style={{
                        width: (done / (tasks.length || 1)) * 100 + '%',
                        background: p.color,
                      }}
                    />
                  </div>
                  <small>
                    {done}/{tasks.length}
                  </small>
                  <ArrowUpRight size={15} />
                </button>
              );
            })}
          </div>
        </section>
      </div>
      <aside className="dashboard-rail">
        <section className="dashboard-profile">
          <div className="profile-art">
            <span />
            <i />
            <span />
          </div>
          <Avatar name={data.user.name} size={62} />
          <h3>{data.user.name}</h3>
          <p>{data.user.email}</p>
          <span className={'role-badge ' + role}>{role}</span>
          <div className="profile-summary">
            <span>
              <strong>
                {
                  taskList.filter((t) => t.assignee_id === data.user.id && t.status !== 'Done')
                    .length
                }
              </strong>
              My open tasks
            </span>
            <span>
              <strong>{projects.length}</strong>Projects
            </span>
          </div>
          <button onClick={() => setPage('mytasks')}>
            Go to my tasks <ArrowUpRight size={14} />
          </button>
        </section>
        <section className="dashboard-activity">
          <header>
            <h2>Activity</h2>
            <span>Latest updates</span>
          </header>
          {activity.map((a, i) => (
            <article key={a.id}>
              <Avatar name={a.name} size={29} index={i} />
              <div>
                <header>
                  <strong>{a.name}</strong>
                  <time>
                    {new Date(a.created_at).toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </time>
                </header>
                <p>{a.message}</p>
                {a.project_id && (
                  <button
                    className="activity-project"
                    onClick={() => {
                      setPid(a.project_id);
                      setPage('board');
                    }}
                  >
                    {projects.find((p) => p.id === a.project_id)?.name}
                    <ArrowUpRight size={11} />
                  </button>
                )}
              </div>
            </article>
          ))}
          {!activity.length && (
            <div className="dashboard-empty">
              <Activity size={22} />
              <p>Your workspace updates will appear here.</p>
            </div>
          )}
          <button className="activity-view-all" onClick={() => setPage('activity')}>
            View all activity <ArrowRight size={14} />
          </button>
        </section>
        <div className="rail-note">
          <span className="tiny-green" />
          <span>Every update brings you closer.</span>
        </div>
      </aside>
    </div>
  );
}
