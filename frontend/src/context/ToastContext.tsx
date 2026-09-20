import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

interface ToastMessage {
  id: number;
  text: string;
}

interface ToastContextValue {
  show: (text: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 1;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const show = useCallback((text: string) => {
    const id = nextId++;
    setMessages((prev) => [...prev, { id, text }]);
    setTimeout(() => {
      setMessages((prev) => prev.filter((m) => m.id !== id));
    }, 3500);
  }, []);

  function dismiss(id: number) {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="toast-stack">
        {messages.map((m) => (
          <div key={m.id} className="toast">
            <span>{m.text}</span>
            <button className="toast__close" onClick={() => dismiss(m.id)} aria-label="Закрыть">
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
