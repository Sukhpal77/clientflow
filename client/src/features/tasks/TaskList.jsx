import React, { useState, useEffect } from 'react';
import { Flag, CheckCircle2, Inbox } from 'lucide-react';
import { columns } from '../../lib/data.js';
import { prettyDate } from '../../components/ui.jsx';
function TaskList({ tasks, memberFor, projectFor, openTask }) {
  return (
    <div className="task-table">
      <div className="task-row table-head">
        <span>TASK</span>
        <span>PROJECT</span>
        <span>STATUS</span>
        <span>PRIORITY</span>
        <span>DUE DATE</span>
      </div>
      {tasks.map((t) => (
        <button key={t.id} className="task-row" onClick={() => openTask(t)}>
          <span className="list-task-title">
            {t.status === 'Done' ? <CheckCircle2 size={17} /> : <span className="task-circle" />}
            {t.title}
          </span>
          <span>{projectFor(t.project_id)?.name}</span>
          <span>
            <span className={'status-tag status-' + columns.indexOf(t.status)}>{t.status}</span>
          </span>
          <span className={'priority ' + t.priority.toLowerCase()}>
            <Flag size={12} />
            {t.priority}
          </span>
          <span>{prettyDate(t.due_date)}</span>
        </button>
      ))}
      {!tasks.length && (
        <div className="empty-state">
          <Inbox size={30} />
          <h3>A clear space.</h3>
          <p>No tasks match this view.</p>
        </div>
      )}
    </div>
  );
}
export default TaskList;
