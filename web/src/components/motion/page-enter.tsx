"use client";

import { usePathname } from "next/navigation";

type PageEnterProps = {
  children: React.ReactNode;
};

/** Subtle route content entrance — keyed on pathname in AppShell. */
export function PageEnter({ children }: PageEnterProps) {
  const pathname = usePathname();

  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
