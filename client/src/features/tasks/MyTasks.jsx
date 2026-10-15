import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';

import TaskList from '../tasks/TaskList.jsx';

export default function MyTasks({ model }) {
  const {
    page,
    projects,
    setQuery,
    members,
    query,
    assigned,
    filtered,
    memberFor,
    projectFor,
    openTask,
  } = model;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="kicker">A LITTLE FOCUS</div>
          <h1>My tasks</h1>
          <p>Your assigned work across the projects in this workspace.</p>
        </div>
      </div>
      <label className="search-box standalone">
        <Search size={16} />
        <input
          aria-label="Search my tasks"
          placeholder="Find a task…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </label>
      <TaskList
        tasks={filtered}
        memberFor={memberFor}
        projectFor={projectFor}
        openTask={openTask}
      />
    </>
  );
}
