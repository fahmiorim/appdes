import type { HTMLAttributes, ReactNode } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <section className={`stat-card${className ? ` ${className}` : ""}`} {...props}>
      {children}
    </section>
  );
}
