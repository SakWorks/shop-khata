import { ReactNode, useEffect } from "react";
import { LucideIcon, X } from "lucide-react";

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
      <div>
        <h1 className="text-xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-ink-soft mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function SectionCard({
  title,
  tag,
  children,
}: {
  title: string;
  tag?: string;
  children: ReactNode;
}) {
  return (
    <div className="card p-5 mb-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[14.5px] font-semibold">{title}</h3>
        {tag && <span className="text-[11.5px] font-medium text-ink-soft">{tag}</span>}
      </div>
      {children}
    </div>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "danger" | "primary";
}) {
  const toneMap = {
    default: "bg-background text-ink-soft",
    success: "bg-success-soft text-success",
    danger: "bg-danger-soft text-danger",
    primary: "bg-primary-soft text-primary",
  };
  return (
    <div className="card p-4 flex items-start justify-between">
      <div>
        <p className="text-[12px] font-medium text-ink-soft mb-1.5">{label}</p>
        <p className="text-xl font-bold tracking-tight">{value}</p>
      </div>
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${toneMap[tone]}`}>
        <Icon size={16} />
      </div>
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center text-[13px] text-ink-soft italic py-6 px-4 border border-dashed border-border rounded-lg">
      {text}
    </div>
  );
}

export function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <div className="relative w-full sm:max-w-lg max-h-[88vh] overflow-y-auto bg-surface rounded-t-2xl sm:rounded-2xl shadow-xl border border-border p-5 sm:p-6 animate-fade-in-up">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h2 className="text-[16px] font-bold tracking-tight">{title}</h2>
            {subtitle && <p className="text-[12.5px] text-ink-soft mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-ink-soft hover:bg-background hover:text-ink shrink-0"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}