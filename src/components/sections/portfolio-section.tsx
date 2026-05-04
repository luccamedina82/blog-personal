
export function PortfolioSection() {
  return (
    <div className="max-w-5xl mx-auto px-6 lg:px-12 py-12 lg:py-20">
      {/* Hero */}
      <section className="grid grid-cols-1 md:grid-cols-[auto_1fr] gap-8 md:gap-10 items-start">
        <div className="relative size-24 md:size-28 rounded-full overflow-hidden ring-1 ring-border shrink-0">
          <img
            src=" /avatar.jpg"
            alt="Portrait of Lucca Medina"
            className="w-full h-full object-cover grayscale-[30%] contrast-[1.1]"
          />
        </div>
        <div className="flex flex-col">
          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground mb-3">
            Portfolio · 2026
          </p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-balance">
            Lucca Medina
          </h1>
          <p className="mt-2 text-base md:text-lg text-muted-foreground">
            Full-Stack Engineer · Avid Learner
          </p>
          <p className="mt-5 max-w-2xl text-sm md:text-base text-muted-foreground/90 leading-relaxed text-pretty">
            I design and build resilient systems — from compilers and distributed
            services to crafted product surfaces. I write notes as I learn, and I
            take English seriously enough to measure it.
          </p>

          {/* <div className="mt-6 flex flex-wrap gap-1.5">
            {STACK.map((tag) => (
              <Badge
                key={tag}
                variant="secondary"
                className="rounded-md font-normal text-xs bg-secondary/60 hover:bg-secondary text-foreground/90 border border-border/60"
              >
                {tag}
              </Badge>
            ))}
          </div> */}
        </div>
      </section>

      {/* Featured projects */}
      {/* <section className="mt-20">
        <header className="flex items-baseline justify-between mb-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
              Selected work
            </p>
            <h2 className="text-2xl font-medium tracking-tight">Featured projects</h2>
          </div>
          <a
            href="#"
            className="hidden md:inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            All projects
            <ArrowUpRight className="size-3.5" />
          </a>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {PROJECTS.map((p) => (
            <Card
              key={p.title}
              className="group relative bg-card/60 border-border/70 p-6 cursor-pointer transition-all duration-300 hover:bg-card hover:border-border hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground/80 mb-2">
                    {p.year}
                  </p>
                  <h3 className="text-base font-medium text-foreground">
                    {p.title}
                  </h3>
                </div>
                <ArrowUpRight className="size-4 text-muted-foreground/60 transition-all duration-300 group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </div>
              <p className="mt-3 text-sm text-muted-foreground leading-relaxed line-clamp-2">
                {p.description}
              </p>
              <div className="mt-5 flex flex-wrap gap-1.5">
                {p.stack.map((s) => (
                  <span
                    key={s}
                    className="text-[10px] font-mono text-muted-foreground/90 px-1.5 py-0.5 rounded border border-border/60 bg-background/40"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </section> */}

      {/* Activity feed */}
      {/* <section className="mt-20">
        <header className="mb-6">
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">
            Latest
          </p>
          <h2 className="text-2xl font-medium tracking-tight">Activity</h2>
        </header>

        <ul className="divide-y divide-border/70 border border-border/70 rounded-lg bg-card/40 overflow-hidden">
          {ACTIVITY.map((a) => {
            const Icon = a.icon
            return (
              <li
                key={a.title}
                className="group flex items-center gap-4 px-5 py-4 hover:bg-card transition-colors cursor-pointer"
              >
                <div className="size-8 rounded-md bg-secondary/80 flex items-center justify-center shrink-0">
                  <Icon className="size-3.5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
                    {a.label}
                  </p>
                  <p className="text-sm text-foreground truncate">{a.title}</p>
                </div>
                <span className="hidden sm:block text-[11px] text-muted-foreground tabular-nums">
                  {a.meta}
                </span>
                <ArrowUpRight className="size-3.5 text-muted-foreground/60 transition-all group-hover:text-primary group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </li>
            )
          })}
        </ul>
      </section> */}
    </div>
  )
}
