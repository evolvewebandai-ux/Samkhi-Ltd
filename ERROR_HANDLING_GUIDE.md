# Samkhi Limited — Technical Error Handling Guide
### Senior Development Standard Operating Procedures (SOP)
**Document Status**: `APPROVED` | **Scope**: Admin Portal & General Integrations

---

## 1. Client-Side Form Validation Standards

All input forms in the Samkhi Admin Portal must provide immediate, descriptive, and low-friction inline validation.

### UI & Styling Rules
1. **Never use generic alerts or raw catch logs**: Standard forms must display inline error text directly beneath targeted invalid inputs.
2. **Typography**: Message text must be styled with **Poppins**, weight `400` / `Regular`, size `xs` (`text-xs`), colored with `red-500` / `rose-500`.
3. **Visual Cues**: Inputs failing validation must have their boundaries styled with `.border-red-500` / `.border-rose-500`. Do not use flashing animations; a static borders transition is sufficient.
4. **Save Button State**: The primary submission button should remain dynamically `disabled` or fail clearly with instant focus returned to the first invalid field.

### Implementation Pattern (React + TypeScript)
```tsx
import React, { useState } from 'react';

interface FormState {
  title: string;
  price: number;
}

export function ProductEditorForm() {
  const [formData, setFormData] = useState<FormState>({ title: '', price: 0 });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = 'Product title is required and cannot be empty.';
    }
    if (formData.price < 0) {
      newErrors.price = 'Price must be greater than or equal to 0.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    // proceed with database save...
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 font-sans">
      <div>
        <label className="block text-xs font-bold uppercase text-slate-500 mb-1">
          Product Title
        </label>
        <input
          id="input-product-title"
          type="text"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className={`w-full p-3 rounded-lg bg-slate-950 border transition-all ${
            errors.title ? 'border-red-500 text-red-500' : 'border-slate-800 text-white'
          }`}
        />
        {errors.title && (
          <p id="err-product-title" className="text-xs text-red-500 mt-1 font-sans">
            {errors.title}
          </p>
        )}
      </div>
      
      {/* Save Button */}
      <button
        type="submit"
        className="px-6 py-3 rounded-lg bg-emerald-500 text-slate-900 text-xs font-bold uppercase transition hover:bg-emerald-400"
      >
        Save Product
      </button>
    </form>
  );
}
```

---

## 2. Network Resilience & Auto-Retry Mechanism

Network dropouts or temporary database throttles must be safely handshaked on the client-side to prevent complete state/work destruction.

### Strategic Guidelines
- **Exponential Backoff**: Any background synchronizations (e.g., saving a sales status, editing an order) failing with transient network states must automatically auto-retry with exponential backoff (e.g., $1\text{s}$, $2\text{s}$, $4\text{s}$).
- **Stashing/Draft Buffering**: If retry loops expire or the client goes completely offline, stash the active payload inside the user's `window.localStorage` as a draft recovery partition.
- **Micro-Toasts**: Notify the user with a specialized warning indicator rather than freezing the screen. Once a network is re-established, auto-recover the draft and notify the user via a success notification modal.

### Standard Retry Wrapper Function
```typescript
interface RetryOptions {
  retries: number;
  delayMs: number;
}

export async function executeResilientOperation<T>(
  operation: () => Promise<T>,
  options: RetryOptions = { retries: 3, delayMs: 1000 }
): Promise<T> {
  let attempt = 0;
  while (attempt <= options.retries) {
    try {
      return await operation();
    } catch (error) {
      attempt++;
      if (attempt > options.retries) {
        throw error;
      }
      const backoffDelay = options.delayMs * Math.pow(2, attempt);
      console.warn(`Network execution failed. Retrying in ${backoffDelay}ms... [Attempt ${attempt}/${options.retries}]`);
      await new Promise((res) => setTimeout(res, backoffDelay));
    }
  }
  throw new Error("Resilient operation failure limits exceeded");
}
```

---

## 3. Empty States Specification

Tables, lists, and search queries must never display dead, unhelpful whitespace or empty, broken rows.

### Empty State UI Standards
Each empty state must follow an identical structural blueprint to retain a cohesive layout standard:
1. **Centered Vector Logo**: Use an elegant Lucide Icon (e.g. `PackageOpen`, `MailQuestion`, `SearchCheck`), centered vertically and styled with neutral, light opacity (`text-slate-700` or `text-slate-600`).
2. **Bold Header Title**: A clear, humored definition (e.g. "No products yet" or "All stock levels healthy").
3. **Actionable Button (If applicable)**: Provide a primary interaction option allowing users to easily remedy the missing data (e.g., `[➕ Create Product]`).

### Empty State Component Template
```tsx
import { PackageOpen, Plus } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionText?: string;
  onAction?: () => void;
}

export function EmptyState({ title, description, actionText, onAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center p-12 border-2 border-dashed border-slate-800 rounded-3xl bg-slate-950/40">
      <div className="w-14 h-14 bg-slate-900 rounded-2xl border border-slate-800 flex items-center justify-center text-slate-500 mb-4">
        <PackageOpen size={28} />
      </div>
      <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
      <p className="text-slate-400 text-xs mt-1 max-w-sm leading-normal">{description}</p>
      {actionText && onAction && (
        <button
          onClick={onAction}
          className="mt-4 flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-[#121212] bg-emerald-500 hover:bg-emerald-400 rounded-xl transition"
        >
          <Plus size={14} strokeWidth={2.5} />
          {actionText}
        </button>
      )}
    </div>
  );
}
```

---

## 4. Role-Based Access Control (RBAC) & Route Deny Fallbacks

Users on restricted warehouse, sales, or logistics boundaries cannot access critical parameters they lack configurations to update.

### Security Action Guide
- **Inline Blocks**: Buttons performing unauthorized operations must be shadowed, grayed out, or disabled with short text explanations provided within tooltips.
- **Route Blocks**: Accessing unauthorized router links directly (e.g., `/admin/notifications/templates` accessed via a standard clerk account) must trigger an immediate navigation redirection back to the `/admin` workspace.
- **Redirection**: On denial, trigger a full security log trace, dispatch an administrative alert, and show a clear unauthorized layout:

```tsx
import { ShieldAlert, Home } from 'lucide-react';

export function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center rounded-2xl mb-4">
        <ShieldAlert size={36} />
      </div>
      <h2 className="text-2xl font-bold text-white">403: Forbidden Action</h2>
      <p className="text-slate-400 text-xs max-w-sm mt-2 leading-relaxed">
        Your current session credentials lack administrative privileges to access this service log. This incident has been logged.
      </p>
      <a
        href="/admin"
        className="mt-6 inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 border border-slate-800 text-white rounded-xl text-xs font-bold uppercase transition hover:bg-slate-850"
      >
        <Home size={14} />
        Return to Dashboard
      </a>
    </div>
  );
}
```

---

## 5. File Upload Size & Format Guardrails

Unsanitized asset uploads can easily become memory sinks or remote entry shells. All document drag processes must be wrapped with instant filters.

### Validation Constraints
1. **Format Enforcement**: Strictly block everything outside `image/jpeg`, `image/png`, and `image/webp`. CSV upload blocks everything outside `text/csv`.
2. **File Size Triggers**: Any image payload exceeding $5\,\text{MB}$ must be rejected outright before any upload begins. CSV uploads are limited to $15\,\text{MB}$.
3. **State Integrity**: An upload failure must rollback any partial state saved. Progress loops must cleanly freeze and show an inline resolution option.

---

## 6. Global React Error Boundaries

Never let an uncaught state transition freeze the user's interface into a blank white screen. 

### Operational Code Controls
- **Component Stack Tracing**: Wrap the main router components in `App.tsx` with a custom `ErrorBoundary.tsx`.
- **Administrative Redundancy**: Log boundary issues directly to a Firestore collection `/error_logs` in a production instance, which captures the following diagnostic metadata:
  * Application state route target
  * Current logged in user ID and active role
  * Detailed stack trace string and exception message
  * Timestamp of boundary fault.
