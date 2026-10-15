import React, { useState, useEffect } from 'react';
import {
  CalendarDays,
  MoreHorizontal,
  MessageSquare,
  Flag,
  Globe,
  CheckCircle2,
} from 'lucide-react';
import { people } from '../../lib/data.js';
import { Avatar, prettyDate } from '../../components/ui.jsx';
function TaskCard({ task: t, member, draggable, onClick }) {
  return (
    <article
      role="button"
      tabIndex={0}
      className={'task-card ' + (t.status === 'Done' ? 'completed' : '')}
      draggable={draggable}
      onDragStart={(e) => e.dataTransfer.setData('text/plain', t.id)}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {t.cover && (
        <div className="design-cover">
          <div className="cover-window">
            <span>ACME</span>
            <strong>
              Good things,
              <br />
              by design.
            </strong>
            <div className="cover-shape" />
          </div>
        </div>
      )}
      <div className="card-label-row">
        <span className={'task-label label-' + (t.label || '').toLowerCase().split(' ')[0]}>
          {t.label || 'Task'}
        </span>
        {t.visibility === 'client' && <Globe size={12} title="Shared with client" />}
        <MoreHorizontal size={16} />
      </div>
      <h4>{t.title}</h4>
      {t.description && <p>{t.description}</p>}
      <div className="card-detail">
        <span className={'priority ' + t.priority.toLowerCase()}>
          <Flag size={11} />
          {t.priority}
        </span>
        {t.comments?.length > 0 && (
          <span className="comment-count">
            <MessageSquare size={12} />
            {t.comments.length}
          </span>
        )}
      </div>
      <footer>
        <span className={t.status === 'Done' ? 'done-date' : ''}>
          {t.status === 'Done' ? <CheckCircle2 size={12} /> : <CalendarDays size={12} />}{' '}
          {prettyDate(t.due_date)}
        </span>
        {member ? (
          <Avatar
            name={member.name}
            size={25}
            index={people.findIndex((p) => p.id === member.id)}
          />
        ) : (
          <span className="unassigned-avatar">?</span>
        )}
      </footer>
    </article>
  );
}
export default TaskCard;
