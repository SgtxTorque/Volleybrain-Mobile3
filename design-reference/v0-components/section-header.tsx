export function SectionHeader({ title, showSeeAll = true }: { title: string; showSeeAll?: boolean }) {
  return (
    <div className="flex items-center justify-between px-4 py-2">
      <h3 className="text-sm font-extrabold uppercase tracking-wider text-navy">
        {title}
      </h3>
      {showSeeAll && (
        <button className="text-xs font-medium text-muted-foreground hover:text-steel-blue transition-colors">
          See All
        </button>
      )}
    </div>
  )
}
