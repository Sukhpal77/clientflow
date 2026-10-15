import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';

function Permissions() {
  return (
    <div className="permissions-card">
      <div>
        <Shield size={20} />
        <h3>A role for every collaborator</h3>
      </div>
      <div className="permissions-grid">
        {[
          ['Owner', 'Full workspace access and admin management.'],
          ['Admin', 'Manage projects, invites, and team access.'],
          ['Member', 'Create and edit tasks in permitted projects.'],
          ['Viewer', 'Read permitted projects and tasks.'],
          ['Client', 'Read shared tasks and comment in granted projects.'],
        ].map(([r, d]) => (
          <section key={r}>
            <span className={'role-badge ' + r.toLowerCase()}>{r}</span>
            <p>{d}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
export default Permissions;
