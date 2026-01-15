import type { Toast, ToastType } from '../hooks';

interface ToastContainerProps {
  toasts: Toast[];
  onRemove: (id: number) => void;
}

// Toast icons
function ToastIcon({ type }: { type: ToastType }) {
  if (type === 'success') {
    return (
      <div class="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center animate-bounce-in">
        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
    );
  }
  if (type === 'error') {
    return (
      <div class="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
        <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
    );
  }
  // Info
  return (
    <div class="w-5 h-5 rounded-full bg-accent/20 flex items-center justify-center">
      <svg class="w-3 h-3 text-accent" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
        <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
  );
}

// Toast styles based on type
const TOAST_STYLES: Record<ToastType, { container: string; progress: string }> = {
  success: {
    container: 'bg-green-600 text-white',
    progress: 'bg-white/30',
  },
  error: {
    container: 'bg-red-600 text-white animate-shake',
    progress: 'bg-white/30',
  },
  info: {
    container: 'bg-surface-secondary text-text border border-border',
    progress: 'bg-accent/30',
  },
};

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div class="fixed bottom-4 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => {
        const styles = TOAST_STYLES[toast.type];
        return (
          <div
            key={toast.id}
            class={`relative overflow-hidden rounded-lg shadow-lg animate-slide-up pointer-events-auto ${styles.container}`}
          >
            <div class="p-3 flex items-center gap-3">
              <ToastIcon type={toast.type} />
              <span class="flex-1 text-sm font-medium">{toast.message}</span>
              <button
                onClick={() => onRemove(toast.id)}
                class="w-6 h-6 rounded-full flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-white/10 transition-all"
              >
                <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Progress bar */}
            <div class={`absolute bottom-0 left-0 right-0 h-1 ${styles.progress} animate-toast-progress`} />
          </div>
        );
      })}
    </div>
  );
}
