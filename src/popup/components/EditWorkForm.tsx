import { useState, useRef } from 'preact/hooks';
import type { Work, MediaType, WorkStatus } from '@/lib/types';
import { useFocusTrap } from '../hooks';
import { MEDIA_TYPES, STATUS_OPTIONS } from '../constants';
import { getThumbnailWithFallback, PLACEHOLDER_THUMBNAIL } from '@/lib/metadata';

interface EditWorkFormProps {
  work: Work;
  onSubmit: (data: Partial<Pick<Work, 'title' | 'type' | 'status' | 'thumbnailUrl'>>) => void;
  onCancel: () => void;
}

const MAX_IMAGE_SIZE = 200; // Max dimension in pixels
const IMAGE_QUALITY = 0.8;

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let { width, height } = img;

      // Scale down if needed
      if (width > MAX_IMAGE_SIZE || height > MAX_IMAGE_SIZE) {
        if (width > height) {
          height = (height / width) * MAX_IMAGE_SIZE;
          width = MAX_IMAGE_SIZE;
        } else {
          width = (width / height) * MAX_IMAGE_SIZE;
          height = MAX_IMAGE_SIZE;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL('image/jpeg', IMAGE_QUALITY));
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

export function EditWorkForm({ work, onSubmit, onCancel }: EditWorkFormProps) {
  const [title, setTitle] = useState(work.title);
  const [type, setType] = useState<MediaType>(work.type);
  const [status, setStatus] = useState<WorkStatus>(work.status);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | undefined>(work.thumbnailUrl);
  const [isProcessing, setIsProcessing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useFocusTrap(formRef);

  async function handleImageUpload(e: Event) {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      return;
    }

    setIsProcessing(true);
    try {
      const dataUrl = await compressImage(file);
      setThumbnailUrl(dataUrl);
    } catch (err) {
      console.error('Failed to process image:', err);
    } finally {
      setIsProcessing(false);
      // Reset input so same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function handleRemoveThumbnail() {
    setThumbnailUrl(undefined);
  }

  function handleSubmit(e: Event) {
    e.preventDefault();
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), type, status, thumbnailUrl });
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

        <div>
          <label class="block text-sm font-medium mb-1">Thumbnail</label>
          <div class="flex items-start gap-3">
            <img
              src={getThumbnailWithFallback(thumbnailUrl)}
              alt="Thumbnail preview"
              class="w-16 h-22 object-cover rounded-md bg-surface-tertiary shrink-0"
              onError={(e) => {
                const img = e.currentTarget as HTMLImageElement;
                if (img.src !== PLACEHOLDER_THUMBNAIL) {
                  img.src = PLACEHOLDER_THUMBNAIL;
                }
              }}
            />
            <div class="flex flex-col gap-2 flex-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                class="hidden"
                id="thumbnail-upload"
              />
              <label
                for="thumbnail-upload"
                class={`inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-md cursor-pointer hover:bg-surface-secondary transition-colors ${isProcessing ? 'opacity-50 pointer-events-none' : ''}`}
              >
                {isProcessing ? (
                  <>
                    <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Processing...
                  </>
                ) : (
                  <>
                    <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Upload Image
                  </>
                )}
              </label>
              {thumbnailUrl && (
                <button
                  type="button"
                  onClick={handleRemoveThumbnail}
                  class="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-md hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                >
                  <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
