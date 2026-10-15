import { id, fail } from '../validation/schemas.js';
import { canAccessProject, canAccessTask } from './auth.service.js';
export function createWorkspaceService(pool) {
  const q = async (sql, args = []) => (await pool.query(sql, args)).rows;
  const one = async (sql, args = []) => (await q(sql, args))[0];
  const roleFor = async (wid, uid) => {
    const m = await one('SELECT role FROM memberships WHERE workspace_id=$1 AND user_id=$2', [
      wid,
      uid,
    ]);
    if (!m) fail(403, 'Workspace access denied');
    return m.role;
  };
  const accessProject = async (pid, uid) => {
    const project = await one('SELECT * FROM projects WHERE id=$1', [pid]);
    if (!project) fail(404, 'Project not found');
    if (project.archived_at)
      fail(409, 'This project is archived. Ask an owner or admin to restore it.');
    const role = await roleFor(project.workspace_id, uid);
    const member = await one('SELECT * FROM project_members WHERE project_id=$1 AND user_id=$2', [
      pid,
      uid,
    ]);
    if (!canAccessProject(role, project, !!member)) fail(403, 'Project access denied');
    return { project, role };
  };
  const accessTask = async (tid, uid) => {
    const task = await one('SELECT * FROM tasks WHERE id=$1', [tid]);
    if (!task) fail(404, 'Task not found');
    const access = await accessProject(task.project_id, uid);
    if (!canAccessTask(access.role, task)) fail(403, 'Task access denied');
    return { ...access, task };
  };
  const log = async (wid, pid, uid, message, visibility = 'internal') =>
    q(
      'INSERT INTO activity(id,workspace_id,project_id,user_id,message,visibility) VALUES($1,$2,$3,$4,$5,$6)',
      [id(), wid, pid, uid, message, visibility],
    );

  return { q, one, roleFor, accessProject, accessTask, log };
}
