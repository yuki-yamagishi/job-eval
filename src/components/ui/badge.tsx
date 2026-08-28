import * as React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "secondary" | "destructive" | "outline" | "rankS" | "rankA" | "rankB" | "rankC" | "indigo";
}

function Badge({ className, variant = "default", ...props }: BadgeProps) {
  const baseStyles = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";
  
  const variants = {
    default: "border-transparent bg-indigo-600/90 text-white shadow-sm hover:bg-indigo-500",
    indigo: "border-indigo-500/30 bg-indigo-500/10 text-indigo-300 hover:bg-indigo-500/20",
    secondary: "border-transparent bg-slate-800 text-slate-200 hover:bg-slate-700",
    destructive: "border-transparent bg-rose-600 text-white hover:bg-rose-500",
    outline: "border-slate-700 text-slate-300",
    rankS: "border-purple-500/30 bg-purple-500/20 text-purple-300 font-bold shadow-sm shadow-purple-500/20",
    rankA: "border-emerald-500/30 bg-emerald-500/20 text-emerald-300 font-bold shadow-sm shadow-emerald-500/20",
    rankB: "border-amber-500/30 bg-amber-500/20 text-amber-300 font-bold shadow-sm shadow-amber-500/20",
    rankC: "border-rose-500/30 bg-rose-500/20 text-rose-300 font-bold shadow-sm shadow-rose-500/20",
  };

  return (
    <div className={cn(baseStyles, variants[variant], className)} {...props} />
  );
}

export { Badge };
