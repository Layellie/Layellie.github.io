import { useEffect, useId, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AlertTriangle, CheckCircle2, GripVertical, LoaderCircle, X } from "lucide-react";

export function AdminReveal({ children, delay = 0, className = "" }) {
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
      data-admin-reveal=""
      data-motion-duration={reduceMotion ? "0" : "0.45"}
    >
      {children}
    </motion.div>
  );
}

export function Panel({ children, className = "", as: Component = "section" }) {
  return <Component className={`rounded-3xl border border-line bg-surface/70 ${className}`}>{children}</Component>;
}

export function Button({ children, variant = "secondary", className = "", type = "button", ...props }) {
  const variants = {
    primary: "border-accent bg-accent text-canvas hover:bg-[#e1ff71]",
    secondary: "border-line bg-elevated text-ink hover:border-[#3a3a42] hover:bg-[#1b1b20]",
    ghost: "border-transparent bg-transparent text-muted hover:border-line hover:text-ink",
    danger: "border-red-400/25 bg-red-400/5 text-red-300 hover:border-red-400/50",
  };
  return (
    <button
      type={type}
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Field({ label, hint, error, children, className = "" }) {
  const id = useId();
  return (
    <label className={`block ${className}`} htmlFor={id}>
      <span className="mb-2 flex items-baseline justify-between gap-3 text-xs font-medium text-muted">
        <span>{label}</span>
        {hint && <span className="font-normal text-faint">{hint}</span>}
      </span>
      {typeof children === "function" ? children({ id, describedBy: error ? `${id}-error` : undefined }) : children}
      {error && <span id={`${id}-error`} className="mt-1.5 block text-xs text-red-300">{error}</span>}
    </label>
  );
}

const inputClass = "w-full rounded-xl border border-line bg-canvas/70 px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-faint focus:border-accent/60 focus:ring-2 focus:ring-accent/10";

export function TextField({ label, hint, error, className, ...props }) {
  return <Field label={label} hint={hint} error={error} className={className}>{({ id, describedBy }) => <input id={id} aria-describedby={describedBy} className={inputClass} {...props} />}</Field>;
}

export function TextArea({ label, hint, error, className, ...props }) {
  return <Field label={label} hint={hint} error={error} className={className}>{({ id, describedBy }) => <textarea id={id} aria-describedby={describedBy} className={`${inputClass} min-h-28 resize-y`} {...props} />}</Field>;
}

export function SelectField({ label, hint, error, children, className, ...props }) {
  return <Field label={label} hint={hint} error={error} className={className}>{({ id, describedBy }) => <select id={id} aria-describedby={describedBy} className={inputClass} {...props}>{children}</select>}</Field>;
}

export function TagsField({ label, value, onChange, hint = "Virgülle ayır", ...props }) {
  const [input, setInput] = useState(() => value.join(", "));
  useEffect(() => {
    if (!sameArray(parseTags(input), value)) setInput(value.join(", "));
  }, [value]);
  return <TextField label={label} hint={hint} value={input} onChange={(event) => {
    const nextInput = event.target.value;
    setInput(nextInput);
    onChange(parseTags(nextInput));
  }} onBlur={() => {
    const normalized = parseTags(input);
    setInput(normalized.join(", "));
    onChange(normalized);
  }} {...props} />;
}

function parseTags(value) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function sameArray(left, right) {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

export function LocaleTabs({ value, onChange }) {
  return (
    <div className="inline-flex rounded-xl border border-line bg-canvas/60 p-1" role="tablist" aria-label="İçerik dili">
      {[{ id: "tr", label: "Türkçe" }, { id: "en", label: "English" }].map((tab) => (
        <button key={tab.id} type="button" role="tab" aria-selected={value === tab.id} onClick={() => onChange(tab.id)} className={`rounded-lg px-4 py-2 text-xs font-medium transition ${value === tab.id ? "bg-accent text-canvas" : "text-muted hover:text-ink"}`}>{tab.label}</button>
      ))}
    </div>
  );
}

export function Notice({ tone = "info", title, children }) {
  const tones = {
    info: "border-accent/20 bg-accent/5 text-accent",
    warning: "border-amber-400/25 bg-amber-400/5 text-amber-200",
    danger: "border-red-400/25 bg-red-400/5 text-red-200",
    success: "border-emerald-400/25 bg-emerald-400/5 text-emerald-200",
  };
  const Icon = tone === "success" ? CheckCircle2 : AlertTriangle;
  return <div className={`flex gap-3 rounded-2xl border p-4 text-sm ${tones[tone]}`} role="status"><Icon className="mt-0.5 h-4 w-4 shrink-0" /><div><div className="font-medium">{title}</div>{children && <div className="mt-1 text-xs leading-relaxed opacity-75">{children}</div>}</div></div>;
}

export function LoadingState({ label = "Yükleniyor" }) {
  return <div className="flex min-h-52 items-center justify-center gap-3 text-sm text-muted"><LoaderCircle className="h-5 w-5 animate-spin text-accent" />{label}</div>;
}

function SortableRow({ id, children, active }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition }} className={`group flex items-stretch rounded-2xl border bg-canvas/45 transition ${active ? "border-accent/45" : "border-line hover:border-[#36363d]"} ${isDragging ? "z-20 opacity-60 shadow-2xl" : ""}`}>
      <button type="button" className="flex w-10 shrink-0 cursor-grab items-center justify-center rounded-l-2xl text-faint hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent" aria-label={`${id} kaydını sırala`} {...attributes} {...listeners}><GripVertical className="h-4 w-4" /></button>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

export function SortableList({ items, onMove, renderItem, selectedId }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={({ active, over }) => {
      if (!over || active.id === over.id) return;
      onMove(items.findIndex((item) => item.id === active.id), items.findIndex((item) => item.id === over.id));
    }}>
      <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-2">{items.map((item, index) => <SortableRow key={item.id} id={item.id} active={selectedId === item.id}>{renderItem(item, index)}</SortableRow>)}</div>
      </SortableContext>
    </DndContext>
  );
}

export function ConfirmDialog({ open, title, description, confirmLabel = "Onayla", danger = false, busy = false, onConfirm, onClose }) {
  const dialogRef = useRef(null);
  const openerRef = useRef(null);
  const onCloseRef = useRef(onClose);
  const busyRef = useRef(busy);
  const titleId = useId();
  const descriptionId = useId();
  onCloseRef.current = onClose;
  busyRef.current = busy;

  useEffect(() => {
    if (!open) return undefined;
    openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusCancel = () => {
      const cancel = dialogRef.current?.querySelector("[data-dialog-cancel]:not([disabled])");
      if (cancel) cancel.focus();
      else dialogRef.current?.focus();
    };
    focusCancel();

    const focusableElements = () => [...dialogRef.current?.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ) || []];
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        if (busyRef.current) return;
        event.preventDefault();
        event.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;
      const elements = focusableElements();
      if (!elements.length) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = elements[0];
      const last = elements[elements.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !dialogRef.current?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || !dialogRef.current?.contains(active))) {
        event.preventDefault();
        first.focus();
      }
    };
    const onFocusIn = (event) => {
      if (!dialogRef.current?.contains(event.target)) focusCancel();
    };
    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("focusin", onFocusIn, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("focusin", onFocusIn, true);
      const opener = openerRef.current;
      openerRef.current = null;
      if (opener?.isConnected) opener.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-5 backdrop-blur-sm" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && !busy && onClose()}>
      <div ref={dialogRef} tabIndex={-1} role="alertdialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId} className="w-full max-w-md rounded-3xl border border-line bg-surface p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4"><div><h2 id={titleId} className="font-display text-2xl font-semibold">{title}</h2><p id={descriptionId} className="mt-2 text-sm leading-relaxed text-muted">{description}</p></div><button type="button" onClick={onClose} disabled={busy} aria-label="Kapat" className="rounded-lg p-2 text-faint hover:bg-elevated hover:text-ink disabled:cursor-wait disabled:opacity-50"><X className="h-4 w-4" /></button></div>
        <div className="mt-6 flex justify-end gap-3"><Button data-dialog-cancel onClick={onClose} disabled={busy}>Vazgeç</Button><Button variant={danger ? "danger" : "primary"} onClick={onConfirm} disabled={busy}>{confirmLabel}</Button></div>
      </div>
    </div>
  );
}
