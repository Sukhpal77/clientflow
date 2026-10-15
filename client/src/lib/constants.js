export const columns = ['Backlog', 'To do', 'In progress', 'In review', 'Done'];
export const roles = ['owner', 'admin', 'member', 'viewer', 'client'];
export const demoMode =
  import.meta.env.MODE === 'demo' || new URLSearchParams(location.search).has('demo');
