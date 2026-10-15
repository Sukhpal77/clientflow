import React, { useState, useEffect } from 'react';

export const Icon = ({ icon: I, ...p }) => <I size={18} strokeWidth={1.7} {...p} />;
export const initials = (name) =>
  name
    ?.split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('') || '?';
export const prettyDate = (d) =>
  d
    ? new Date(d.slice(0, 10) + 'T12:00:00').toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : 'No due date';
export const Avatar = ({ name, size = 28, index = 0 }) => (
  <span
    className={'avatar tone-' + (index % 5)}
    style={{ width: size, height: size, fontSize: size / 2.7 }}
    title={name}
  >
    {initials(name)}
  </span>
);
