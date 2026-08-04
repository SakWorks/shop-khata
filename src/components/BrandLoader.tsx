import { Store } from "lucide-react";

export default function BrandLoader() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-20 h-20 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-4 border-primary-soft border-t-primary animate-spin" />
          <div className="w-11 h-11 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/25">
            <Store size={20} color="white" strokeWidth={2.25} />
          </div>
        </div>
        <span className="font-display font-semibold text-[15px] tracking-tight text-ink-soft animate-fade-in-up">
          Shop Khata
        </span>
      </div>
    </div>
  );
}