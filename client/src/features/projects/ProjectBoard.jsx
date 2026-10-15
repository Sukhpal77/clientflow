import React, { useState, useEffect } from 'react';
import {
  Plus,
  Search,
  LayoutGrid,
  List,
  CalendarDays,
  SlidersHorizontal,
  Users,
  Check,
  CheckCircle2,
  Shield,
} from 'lucide-react';
import { columns } from '../../lib/data.js';
import { Avatar, prettyDate } from '../../components/ui.jsx';
import TaskCard from '../tasks/TaskCard.jsx';
import TaskList from '../tasks/TaskList.jsx';

export default function ProjectBoard({ model }) {
  const {
    page,
    ws,
    data,
    pid,
    manage,
    write,
    taskList,
    role,
    setModal,
    setQuery,
    project,
    members,
    activeTasks,
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
  } = model;
  return (
    <div className="project-board-layout">
      <div className="board-project-header">
        <div className="page-heading">
          <div>
            <div className="kicker">
              <span style={{ background: project?.color }} className="project-dot" />
              {project?.client || 'YOUR SPACE'}
              <span className="subtle">/ PROJECT</span>
            </div>
            <h1>
              {project?.name || 'Your next project starts here'}{' '}
              <span className="project-status">
                {activeTasks.some((t) => t.project_id === pid) ? 'In progress' : 'On track'}
              </span>
            </h1>
            <p>{project?.description || 'Create a project to organize your tasks and ideas.'}</p>
          </div>
          <div className="heading-actions">
            {manage && project && (
              <button
                className="btn secondary"
                onClick={() => setModal({ type: 'project', project })}
              >
                Edit project
              </button>
            )}
            <div className="avatar-stack">
              {members
                .filter((m) => project?.member_ids?.includes(m.id) || m.role === 'owner')
                .slice(0, 4)
                .map((m, i) => (
                  <Avatar key={m.id} name={m.name} index={i} />
                ))}
            </div>
            {manage && ws?.kind !== 'personal' && (
              <button className="btn secondary" onClick={() => setModal({ type: 'invite' })}>
                <Users size={15} />
                Invite
              </button>
            )}
            {write && project && (
              <button className="btn primary" onClick={() => setModal({ type: 'task' })}>
                <Plus size={16} />
                New task
              </button>
            )}
            {manage && !project && (
              <button className="btn primary" onClick={() => setModal({ type: 'project' })}>
                <Plus size={16} />
                Create project
              </button>
            )}
          </div>
        </div>
        <div className="project-meta">
          <span>
            <CalendarDays size={14} />
            {project?.due_date ? 'Due ' + prettyDate(project.due_date) : 'No project deadline'}
          </span>
          <span>
            <Shield size={14} />
            {project?.visibility === 'private' ? 'Private project' : 'Team project'}
          </span>
          <span>
            <CheckCircle2 size={14} />
            {taskList.filter((t) => t.project_id === pid && t.status === 'Done').length} of{' '}
            {taskList.filter((t) => t.project_id === pid).length} tasks complete
          </span>
          <div className="progress-track">
            <i
              style={{
                width:
                  (taskList.filter((t) => t.project_id === pid && t.status === 'Done').length /
                    (taskList.filter((t) => t.project_id === pid).length || 1)) *
                    100 +
                  '%',
              }}
            />
          </div>
        </div>
        <div className="view-toolbar">
          <div className="view-tabs">
            <button className={view === 'board' ? 'selected' : ''} onClick={() => setView('board')}>
              <LayoutGrid size={16} />
              Board
            </button>
            <button className={view === 'list' ? 'selected' : ''} onClick={() => setView('list')}>
              <List size={17} />
              List
            </button>
          </div>
          <div className="toolbar-controls">
            <label className="search-box">
              <Search size={15} />
              <input
                aria-label="Search tasks"
                placeholder="Search tasks…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <kbd>⌕</kbd>
            </label>
            <button
              className={'btn filter-btn ' + (assigned ? 'on' : '')}
              onClick={() => setAssigned(!assigned)}
            >
              <Avatar name={data.user.name} size={20} />
              My tasks
            </button>
            <div className="filter-wrap">
              <button
                className={'btn filter-btn ' + (priority !== 'All' ? 'on' : '')}
                onClick={() => setFilterOpen(!filterOpen)}
              >
                <SlidersHorizontal size={15} />
                Filter {priority !== 'All' && <span className="filter-dot" />}
              </button>
              {filterOpen && (
                <div className="filter-menu">
                  <strong>Priority</strong>
                  {['All', 'Urgent', 'High', 'Medium', 'Low'].map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setPriority(p);
                        setFilterOpen(false);
                      }}
                    >
                      {p}
                      {p === priority && <Check size={15} />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        {role === 'client' && (
          <div className="info-note">
            <Shield size={16} />
            You’re viewing tasks shared with your client account. Open a task to leave feedback.
          </div>
        )}
      </div>
      <div className="board-content">
        {project &&
          (view === 'board' ? (
            <div className="kanban">
              {columns.map((col, i) => (
                <section
                  key={col}
                  className="kanban-column"
                  aria-label={col + ' column'}
                  onDragOver={(e) => {
                    if (write) e.preventDefault();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    const t = filtered.find((t) => t.id === e.dataTransfer.getData('text/plain'));
                    if (t) moveTask(t, col);
                  }}
                >
                  <div className="column-heading">
                    <span className={'status-dot status-' + i} />
                    <h3>{col}</h3>
                    <span className="column-count">
                      {filtered.filter((t) => t.status === col).length}
                    </span>
                    {write && (
                      <button
                        className="icon-btn small"
                        aria-label={'Add task to ' + col}
                        onClick={() => setModal({ type: 'task', status: col })}
                      >
                        <Plus size={16} />
                      </button>
                    )}
                  </div>
                  <div className="column-body">
                    {filtered
                      .filter((t) => t.status === col)
                      .map((t) => (
                        <TaskCard
                          key={t.id}
                          task={t}
                          member={memberFor(t.assignee_id)}
                          onClick={() => openTask(t)}
                          draggable={write}
                        />
                      ))}
                    {write && (
                      <button
                        className="add-task"
                        onClick={() => setModal({ type: 'task', status: col })}
                      >
                        <Plus size={15} />
                        Add task
                      </button>
                    )}
                    {!filtered.some((t) => t.status === col) && (
                      <div className="empty-column">Room for what’s next</div>
                    )}
                  </div>
                </section>
              ))}
            </div>
          ) : (
            <TaskList
              tasks={filtered}
              projectFor={projectFor}
              memberFor={memberFor}
              openTask={openTask}
            />
          ))}
      </div>
      <div className="board-footer">
        <span>
          <span className="tiny-green" />
          Everything has its place.
        </span>
        <span>
          {filtered.length} tasks{write ? ' · Drag cards to update their status' : ''}
        </span>
      </div>
    </div>
  );
}
