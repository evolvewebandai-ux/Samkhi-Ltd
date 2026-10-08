/**
 * Dynamic Production-Grade Toast Notification Engine
 * Zero-dependency, reliable DOM-based overlays that prevent portal conflicts in modals.
 */

export type ToastType = 'success' | 'warning' | 'error' | 'info';

export function showToast(message: string, type: ToastType = 'success') {
  // Find or create container
  let container = document.getElementById('global-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'global-toast-container';
    container.className = 'fixed top-6 right-6 z-[9999] flex flex-col gap-3 font-sans pointer-events-none max-w-md w-full px-4 sm:px-0';
    document.body.appendChild(container);
  }

  // Create toast element
  const toast = document.createElement('div');
  toast.className = 'flex items-center gap-3 p-4 rounded-xl border shadow-lg translate-x-12 opacity-0 transition-all duration-300 pointer-events-auto bg-white/95 backdrop-blur-md';
  
  let borderColor = 'border-slate-200';
  let prefix = '';
  let iconHtml = '';

  if (type === 'success') {
    borderColor = 'border-emerald-500/30 bg-emerald-50/95';
    prefix = '[ 🟢 EXECUTED ]';
    iconHtml = `<svg class="w-5 h-5 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
  } else if (type === 'warning') {
    borderColor = 'border-amber-500/30 bg-amber-50/95';
    prefix = '[ 🟡 WARNING ]';
    iconHtml = `<svg class="w-5 h-5 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;
  } else if (type === 'error') {
    borderColor = 'border-rose-500/30 bg-rose-50/95';
    prefix = '[ 🔴 WARNING ]'; // Keep requested title prefix in button audit reqs
    iconHtml = `<svg class="w-5 h-5 text-rose-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
  }

  toast.innerHTML = `
    <div class="flex items-start gap-3 w-full">
      ${iconHtml}
      <div class="flex-1 text-xs sm:text-sm">
        <span class="font-extrabold tracking-tight block ${type === 'success' ? 'text-emerald-800' : type === 'warning' ? 'text-amber-800' : 'text-rose-800'} mb-0.5">${prefix}</span>
        <span class="text-slate-600 font-medium">${message}</span>
      </div>
      <button class="text-slate-400 hover:text-slate-600 transition-colors pointer-events-auto shrink-0 select-none">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
      </button>
    </div>
  `;

  container.appendChild(toast);

  // Trigger enter animation on next tick
  requestAnimationFrame(() => {
    toast.classList.remove('translate-x-12', 'opacity-0');
    toast.classList.add('translate-x-0', 'opacity-100');
  });

  const dismiss = () => {
    toast.classList.remove('translate-x-0', 'opacity-100');
    toast.classList.add('translate-x-12', 'opacity-0');
    setTimeout(() => {
      if (toast.parentNode === container) {
        container.removeChild(toast);
      }
      if (container.children.length === 0 && container.parentNode) {
        document.body.removeChild(container);
      }
    }, 300);
  };

  // Close button click handler
  toast.querySelector('button')?.addEventListener('click', dismiss);

  // Auto-dismiss after 5s
  setTimeout(dismiss, 5000);
}
