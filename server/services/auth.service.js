import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export const hashToken = (token) => createHash('sha256').update(token).digest('hex');
export const newToken = () => randomBytes(32).toString('hex');
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const key = await scrypt(password, salt, 64);
  return salt + ':' + key.toString('hex');
}
export async function checkPassword(password, hash) {
  const [salt, hex] = hash.split(':');
  const key = await scrypt(password, salt, 64);
  const stored = Buffer.from(hex, 'hex');
  return stored.length === key.length && timingSafeEqual(stored, key);
}
export const canManage = (role) => ['owner', 'admin'].includes(role);
export const canWrite = (role) => ['owner', 'admin', 'member'].includes(role);
export function canAccessProject(role, project, isMember) {
  return (
    ['owner', 'admin', 'member', 'viewer', 'client'].includes(role) &&
    (canManage(role) || isMember || (role !== 'client' && project.visibility === 'team'))
  );
}
export const canAccessTask = (role, task) =>
  ['owner', 'admin', 'member', 'viewer', 'client'].includes(role) &&
  (role !== 'client' || task.visibility === 'client');
