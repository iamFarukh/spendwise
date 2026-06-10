"use client";

type TabCrossfadeProps = {
  panelKey: string;
  children: React.ReactNode;
  className?: string;
};

/** Remounts content with a short crossfade when `panelKey` changes (tabs, filters). */
export function TabCrossfade({ panelKey, children, className }: TabCrossfadeProps) {
  return (
    <div key={panelKey} className={className ?? "tab-crossfade"}>
      {children}
    </div>
  );
}
