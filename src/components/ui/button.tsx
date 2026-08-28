import * as React from "react";
import { cn } from "@/lib/utils";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link" | "accent";
  size?: "default" | "sm" | "lg" | "icon";
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";
    
    const variants = {
      default: "bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 border border-indigo-500/30",
      accent: "bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-500/20 border border-emerald-500/30",
      destructive: "bg-rose-600 text-white hover:bg-rose-500 shadow-lg shadow-rose-600/20",
      outline: "border border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 hover:text-white",
      secondary: "bg-slate-800 text-slate-200 hover:bg-slate-700 hover:text-white border border-slate-700/50",
      ghost: "hover:bg-slate-800/80 text-slate-300 hover:text-white",
      link: "text-indigo-400 underline-offset-4 hover:underline",
    };

    const sizes = {
      default: "h-10 px-4 py-2",
      sm: "h-8 rounded-md px-3 text-xs",
      lg: "h-12 rounded-xl px-8 text-base font-semibold",
      icon: "h-10 w-10",
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button };
