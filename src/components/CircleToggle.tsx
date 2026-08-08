"use client";

import { LucideIcon } from "lucide-react";

export type CircleToggleOption = {
  key: string;
  label: string;
  icon: LucideIcon;
  tone: "primary" | "success";
};

export function CircleToggle({
  options,
  active,
  onChange,
}: {
  options: CircleToggleOption[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="flex justify-center gap-10 py-2">
      {options.map((opt) => {
        const isActive = opt.key === active;
        const Icon = opt.icon;
        const activeClasses =
          opt.tone === "primary"
            ? "bg-primary border-primary text-white shadow-lg shadow-primary/25"
            : "bg-success border-success text-white shadow-lg shadow-success/25";
        return (
          <button
            key={opt.key}
            onClick={() => onChange(opt.key)}
            className="flex flex-col items-center gap-2"
          >
            <div
              className={`w-[72px] h-[72px] rounded-full flex flex-col items-center justify-center gap-0.5 border-2 transition-all ${
                isActive ? activeClasses : "bg-card border-border text-ink-soft"
              }`}
            >
              <Icon size={20} />
              <span className="text-[9.5px] font-semibold leading-none px-1 text-center">
                {opt.label}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}