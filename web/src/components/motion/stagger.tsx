import { Children, isValidElement } from "react";

import { cn } from "@/lib/cn";

type StaggerGroupProps = {
  children: React.ReactNode;
  className?: string;
  /** Max items to stagger (rest appear together). */
  cap?: number;
};

export function StaggerGroup({
  children,
  className,
  cap = 12,
}: StaggerGroupProps) {
  const items = Children.toArray(children);

  return (
    <div className={className}>
      {items.map((child, index) => {
        if (!isValidElement(child)) {
          return child;
        }
        const staggerIndex = Math.min(index, cap - 1);
        return (
          <div
            key={child.key ?? index}
            className="stagger-item"
            style={{ "--stagger-index": staggerIndex } as React.CSSProperties}
          >
            {child}
          </div>
        );
      })}
    </div>
  );
}

type StaggerItemProps = {
  index: number;
  children: React.ReactNode;
  className?: string;
};

export function StaggerItem({ index, children, className }: StaggerItemProps) {
  return (
    <div
      className={cn("stagger-item", className)}
      style={{ "--stagger-index": Math.min(index, 11) } as React.CSSProperties}
    >
      {children}
    </div>
  );
}
