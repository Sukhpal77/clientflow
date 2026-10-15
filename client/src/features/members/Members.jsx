import React, { useState, useEffect } from 'react';
import { ChevronRight, Plus } from 'lucide-react';
import { people, roles } from '../../lib/data.js';
import { Avatar } from '../../components/ui.jsx';

import Permissions from '../members/Permissions.jsx';
export default function Members({ model }) {
  const { page, demoLog, ws, wid, data, projects, manage, role, setModal, members, view, mutate } =
    model;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="kicker">BETTER, TOGETHER</div>
          <h1>People & access</h1>
          <p>The right people. The right projects. A clear view of who can do what.</p>
        </div>
        {manage && ws?.kind !== 'personal' && (
          <button className="btn primary" onClick={() => setModal({ type: 'invite' })}>
            <Plus size={16} />
            Invite a person
          </button>
        )}
      </div>
      <div className="people-table">
        <div className="people-row table-head">
          <span>PERSON</span>
          <span>ROLE</span>
          <span>PROJECT ACCESS</span>
        </div>
        {members.map((m, i) => (
          <div className="people-row" key={m.id}>
            <div className="person-cell">
              <Avatar name={m.name} size={38} index={i} />
              <div>
                <strong>
                  {m.name} {m.id === data.user.id && <small>You</small>}
                </strong>
                <p>{m.email}</p>
              </div>
            </div>
            <div>
              {manage &&
              m.role !== 'owner' &&
              m.id !== data.user.id &&
              (role === 'owner' || m.role !== 'admin') ? (
                <select
                  aria-label={'Role for ' + m.name}
                  value={m.role}
                  onChange={(e) =>
                    mutate(
                      '/members/' + wid + '/' + m.id,
                      'PATCH',
                      { role: e.target.value },
                      (d) => {
                        d.members.find((x) => x.workspace_id === wid && x.id === m.id).role =
                          e.target.value;
                        demoLog(d, 'Changed ' + m.name + ' role to ' + e.target.value);
                      },
                      'Role updated',
                    )
                  }
                >
                  {roles
                    .filter((r) => r !== 'owner' && (role === 'owner' || r !== 'admin'))
                    .map((r) => (
                      <option key={r}>{r}</option>
                    ))}
                </select>
              ) : (
                <span className={'role-badge ' + m.role}>{m.role}</span>
              )}
            </div>
            <div className="access-cell">
              {['owner', 'admin'].includes(m.role) ? (
                <span>All projects</span>
              ) : manage ? (
                <button
                  className="btn text-btn"
                  onClick={() => setModal({ type: 'access', member: m })}
                >
                  Manage access <ChevronRight size={14} />
                </button>
              ) : (
                <span>Assigned projects</span>
              )}
              {manage &&
                m.role !== 'owner' &&
                m.id !== data.user.id &&
                (role === 'owner' || m.role !== 'admin') && (
                  <button
                    className="btn text-btn member-remove"
                    onClick={() => setModal({ type: 'remove-member', member: m })}
                  >
                    Remove
                  </button>
                )}
            </div>
          </div>
        ))}
      </div>
      {data.invitations?.filter((i) => i.workspace_id === wid).length > 0 && (
        <div className="pending-invites">
          <h3>Pending invitations</h3>
          {data.invitations
            .filter((i) => i.workspace_id === wid)
            .map((i) => (
              <p key={i.id}>
                {i.email}
                <span className="role-badge">{i.role}</span>
                <small>Awaiting acceptance</small>
                {manage && (role === 'owner' || i.role !== 'admin') && (
                  <button
                    className="btn secondary"
                    onClick={() => setModal({ type: 'revoke-invitation', invitation: i })}
                  >
                    Revoke
                  </button>
                )}
              </p>
            ))}
        </div>
      )}
      <Permissions />
    </>
  );
}
