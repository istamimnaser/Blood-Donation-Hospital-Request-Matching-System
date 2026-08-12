export function StatsStrip({ children }) {
  return <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{children}</div>;
}

export default function StatCard({ icon, label, value }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card p-4 shadow-sm">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary [&>svg]:size-5">
        {icon}
      </span>
      <div>
        <p className="text-2xl leading-none font-bold text-foreground">{value}</p>
        <p className="mt-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
      </div>
    </div>
  );
}
