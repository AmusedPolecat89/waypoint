import type { Toast } from '../hooks';

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: number) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div class="fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          class={`p-3 rounded-md shadow-lg text-sm flex items-center justify-between animate-slide-up ${
            toast.type === 'success'
              ? 'bg-green-600 text-white'
              : toast.type === 'error'
              ? 'bg-red-600 text-white'
              : 'bg-surface-secondary text-text border border-border'
          }`}
        >
          <span>{toast.message}</span>
          <button
            onClick={() => onRemove(toast.id)}
            class="ml-2 opacity-70 hover:opacity-100"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
