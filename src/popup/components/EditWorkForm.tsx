import { useState, useRef } from 'preact/hooks';
import type { Work, MediaType, WorkStatus } from '@/lib/types';
import { useFocusTrap } from '../hooks';
import { MEDIA_TYPES, STATUS_OPTIONS } from '../constants';

interface EditWorkFormProps {
  work: Work;
  onSubmit: (data: Partial<Pick<Work, 'title' | 'type' | 'status'>>) => void;
  onCancel: () => void;
}

export function EditWorkForm({ work, onSubmit, onCancel }: EditWorkFormProps) {
  const [title, setTitle] = useState(work.title);
  const [type, setType] = useState<MediaType>(work.type);
  const [status, setStatus] = useState<WorkStatus>(work.status);
  const formRef = useRef<HTMLFormElement>(null);

  useFocusTrap(formRef);

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), type, status });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} class="flex flex-col h-full">
      <header class="flex items-center justify-between px-4 py-3 border-b border-border">
        <button
          type="button"
          onClick={onCancel}
          class="text-text-secondary hover:text-text text-sm"
        >
          Cancel
        </button>
        <h2 class="text-base font-medium">Edit Work</h2>
        <button
          type="submit"
          disabled={!title.trim()}
          class="text-accent hover:text-accent-hover text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save
        </button>
      </header>

      <div class="p-4 space-y-4">
        <div>
          <label class="block text-sm font-medium mb-1">Title</label>
          <input
            type="text"
            value={title}
            onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
            class="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
            autoFocus
          />
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Type</label>
          <div class="grid grid-cols-2 gap-2">
            {MEDIA_TYPES.map((mt) => (
              <button
                key={mt.value}
                type="button"
                onClick={() => setType(mt.value)}
                class={`px-3 py-2 text-sm rounded-md border transition-colors ${
                  type === mt.value
                    ? 'border-accent bg-accent-subtle text-accent'
                    : 'border-border hover:border-border-strong'
                }`}
              >
                {mt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label class="block text-sm font-medium mb-1">Status</label>
          <select
            value={status}
            onChange={(e) =>
              setStatus((e.target as HTMLSelectElement).value as WorkStatus)
            }
            class="w-full px-3 py-2 text-sm border border-border rounded-md bg-surface focus:outline-none focus:border-accent"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </form>
  );
}
