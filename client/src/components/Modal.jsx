import React, { useState, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

import { Icon } from './ui.jsx';
function Modal({ title, subtitle, children, onClose, wide = false, variant = 'modal' }) {
  const dialogRef = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    const focusable = () => [
      ...(dialogRef.current?.querySelectorAll(
        'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
      ) || []),
    ];
    const h = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab') {
        const items = focusable();
        const first = items[0],
          last = items.at(-1);
        if (
          e.shiftKey &&
          (document.activeElement === first || document.activeElement === heading)
        ) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    const heading = dialogRef.current?.querySelector('[data-dialog-heading]');
    heading?.focus({ preventScroll: true });
    document.addEventListener('keydown', h);
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', h);
      document.body.style.overflow = old;
      previous?.focus();
    };
  }, []);
  return (
    <div
      className={'modal-backdrop ' + (variant === 'drawer' ? 'drawer-backdrop' : '')}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={'modal ' + (wide ? 'wide' : '') + (variant === 'drawer' ? ' task-drawer' : '')}
      >
        <header>
          <div>
            <h2 data-dialog-heading tabIndex={-1}>
              {title}
            </h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close dialog">
            <Icon icon={X} />
          </button>
        </header>
        {variant === 'drawer' ? children : <div className="modal-content-scroll">{children}</div>}
      </section>
    </div>
  );
}
export default Modal;
