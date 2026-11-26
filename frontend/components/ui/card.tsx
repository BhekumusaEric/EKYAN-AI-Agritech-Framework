import * as React from "react";

type DivProps = React.HTMLAttributes<HTMLDivElement>;

export function Card({ className = "", ...props }: DivProps) {
  return (
    <div
      className={`min-w-0 border-t border-[#d8ded4] bg-transparent ${className}`}
      {...props}
    />
  );
}

export function CardHeader({ className = "", ...props }: DivProps) {
  return <div className={`flex flex-col gap-1.5 p-5 sm:p-6 ${className}`} {...props} />;
}

export function CardTitle({ className = "", ...props }: DivProps) {
  return <h2 className={`text-base font-semibold tracking-tight text-slate-900 ${className}`} {...props} />;
}

export function CardDescription({ className = "", ...props }: DivProps) {
  return <p className={`text-sm leading-6 text-slate-500 ${className}`} {...props} />;
}

export function CardContent({ className = "", ...props }: DivProps) {
  return <div className={`px-5 pb-5 sm:px-6 sm:pb-6 ${className}`} {...props} />;
}
