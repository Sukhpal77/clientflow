import { z } from 'zod';
import { randomUUID } from 'node:crypto';
export const id = () => randomUUID();
export const statuses = ['Backlog', 'To do', 'In progress', 'In review', 'Done'];
export const text = z.string().trim().min(1).max(200);
export const date = z.iso.date().nullable().optional();
export const taskSchema = z.object({
  title: text,
  description: z.string().max(5000).default(''),
  status: z.enum(statuses).default('To do'),
  priority: z.enum(['Low', 'Medium', 'High', 'Urgent']).default('Medium'),
  assignee_id: z.string().nullable().default(null),
  due_date: date,
  visibility: z.enum(['internal', 'client']).default('internal'),
  label: z.string().max(50).default(''),
  subtasks: z
    .array(z.object({ id: z.string().min(1).max(100), title: text, done: z.boolean() }))
    .max(100)
    .default([]),
});
export const fail = (code, message) => {
  const e = new Error(message);
  e.status = code;
  throw e;
};

// PATCH requests must not apply creation defaults to omitted fields.
export const taskPatchSchema = z.object({
  ...Object.fromEntries(
    Object.entries(taskSchema.shape).map(([name, schema]) => [
      name,
      (schema.removeDefault?.() || schema).optional(),
    ]),
  ),
  revision: z.number().int().positive().optional(),
});
