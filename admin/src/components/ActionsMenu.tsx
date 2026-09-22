import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "./ActionsMenu.css";

/** Компактное меню действий для строки таблицы ("⋮") — заменяет ряд отдельных кнопок,
 *  которые на узких экранах вынуждали таблицу вылезать за рамки и скроллиться. Рендерится
 *  через портал в document.body, чтобы не обрезаться overflow контейнера таблицы. */
export function ActionsMenu({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  function toggle(e: MouseEvent) {
    e.stopPropagation();
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.right });
    }
    setOpen((v) => !v);
  }

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: globalThis.MouseEvent) {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleScroll() {
      setOpen(false);
    }

    document.addEventListener("mousedown", handlePointerDown);
    window.addEventListener("scroll", handleScroll, true);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        ref={triggerRef}
        className="actions-menu__trigger"
        onClick={toggle}
        aria-label="Действия"
      >
        ⋮
      </button>
      {open &&
        pos &&
        createPortal(
          <div
            ref={menuRef}
            className="actions-menu__list"
            style={{ top: pos.top, left: pos.left }}
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          >
            {children}
          </div>,
          document.body,
        )}
    </>
  );
}
