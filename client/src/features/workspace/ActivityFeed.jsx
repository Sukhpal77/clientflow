import React, { useState, useEffect } from 'react';
import { Activity, CheckCircle2 } from 'lucide-react';

import { Avatar } from '../../components/ui.jsx';

export default function ActivityFeed({ model }) {
  const { page, ws, wid, data, projects, manage, role, members, projectFor } = model;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="kicker">THE LATEST</div>
          <h1>Activity</h1>
          <p>The small steps that move your work forward.</p>
        </div>
      </div>
      <div className="activity-feed">
        {data.activity
          .filter(
            (a) =>
              a.workspace_id === wid &&
              (!a.project_id ? manage : projects.some((p) => p.id === a.project_id)) &&
              (role !== 'client' || a.visibility === 'client'),
          )
          .map((a, i) => (
            <div className="activity-row" key={a.id}>
              <Avatar name={a.name} size={38} index={i} />
              <div>
                <strong>{a.name}</strong>
                <p>{a.message}</p>
                <span>
                  {projectFor(a.project_id)?.name || ws.name} ·{' '}
                  {new Date(a.created_at).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <CheckCircle2 size={17} />
            </div>
          ))}
      </div>
    </>
  );
}
