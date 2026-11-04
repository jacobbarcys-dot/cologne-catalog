import Link from "next/link";
import { accordColor, accordTextColor } from "@/lib/accord-colors";
import type { Accord, Fragrance } from "@/lib/constants";

const LONGEVITY = ["Very weak", "Weak", "Moderate", "Long lasting", "Eternal"];
const SILLAGE = ["Intimate", "Moderate", "Strong", "Enormous"];

function scaleLabel(value: number, labels: string[]) {
  return labels[Math.min(labels.length - 1, Math.max(0, Math.round(value) - 1))];
}

export function AccordBars({ accords, compact = false }: { accords: Accord[]; compact?: boolean }) {
  const sorted = [...accords].sort((a, b) => b.strength - a.strength);
  return (
    <ul className={compact ? "space-y-1" : "space-y-1.5"}>
      {sorted.map((a) => {
        const bg = accordColor(a.name);
        return (
          <li key={a.name}>
            <div
              className={`rounded-md px-3 font-medium capitalize ${compact ? "py-0.5 text-xs" : "py-1.5 text-sm"}`}
              style={{
                width: `${Math.max(30, Math.min(100, a.strength))}%`,
                backgroundColor: bg,
                color: accordTextColor(bg),
              }}
            >
              {a.name}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-5">
      <h2 className="text-xs font-medium uppercase tracking-[0.2em] text-muted">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Meter({ label, value, max, caption }: { label: string; value: number; max: number; caption?: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span>{label}</span>
        <span className="text-muted">{caption ?? `${value.toFixed(1)} / ${max}`}</span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-accent" style={{ width: `${(value / max) * 100}%` }} />
      </div>
    </div>
  );
}

function Stars({ value }: { value: number }) {
  const pct = (value / 5) * 100;
  return (
    <span className="relative inline-block text-xl leading-none tracking-wider" aria-label={`${value} out of 5`}>
      <span className="text-line">★★★★★</span>
      <span className="absolute inset-0 overflow-hidden text-accent" style={{ width: `${pct}%` }}>
        ★★★★★
      </span>
    </span>
  );
}

const SEASONS = [
  { key: "winter", label: "Winter", icon: "❄️" },
  { key: "spring", label: "Spring", icon: "🌸" },
  { key: "summer", label: "Summer", icon: "☀️" },
  { key: "fall", label: "Fall", icon: "🍂" },
] as const;
const TIMES = [
  { key: "day", label: "Day", icon: "🌤️" },
  { key: "night", label: "Night", icon: "🌙" },
] as const;

function WearColumn({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="flex h-20 w-8 items-end overflow-hidden rounded-full bg-line">
        <div className="w-full rounded-full bg-accent" style={{ height: `${Math.max(4, value)}%` }} />
      </div>
      <span aria-hidden className="text-lg leading-none">{icon}</span>
      <span className="text-xs text-muted">{label}</span>
    </div>
  );
}

function NoteRow({ label, notes }: { label: string; notes: string[] }) {
  if (notes.length === 0) return null;
  return (
    <div>
      <h3 className="text-center text-xs uppercase tracking-wider text-muted">{label}</h3>
      <ul className="mt-2 flex flex-wrap justify-center gap-2">
        {notes.map((n) => (
          <li key={n} className="rounded-full border border-line bg-paper px-3 py-1 text-sm">
            {n}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function FragranceProfile({ fragrance: f }: { fragrance: Fragrance }) {
  const rs = f.review_summary ?? {};
  const hasRatings = [f.rating_overall, f.longevity, f.sillage, f.value_rating].some((v) => v !== null);
  const hasNotes = f.notes_top.length + f.notes_heart.length + f.notes_base.length > 0;
  const hasWear = Object.keys(f.seasons ?? {}).length + Object.keys(f.time_of_day ?? {}).length > 0;

  if (f.lookup_status !== "complete") {
    return (
      <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">
        This fragrance&apos;s full profile hasn&apos;t been filled in yet.
      </p>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {f.accords.length > 0 && (
        <Section title="Main accords">
          <AccordBars accords={f.accords} />
        </Section>
      )}

      {hasRatings && (
        <Section title="Ratings">
          {f.rating_overall !== null && (
            <div className="flex items-center gap-3">
              <span className="font-serif text-4xl">{f.rating_overall.toFixed(2)}</span>
              <div>
                <Stars value={f.rating_overall} />
                <p className="text-xs text-muted">
                  out of 5{f.rating_votes ? ` · ${f.rating_votes.toLocaleString()} votes` : ""}
                </p>
              </div>
            </div>
          )}
          <div className="mt-4 space-y-3">
            {f.longevity !== null && (
              <Meter label="Longevity" value={f.longevity} max={5} caption={scaleLabel(f.longevity, LONGEVITY)} />
            )}
            {f.sillage !== null && (
              <Meter label="Sillage" value={f.sillage} max={4} caption={scaleLabel(f.sillage, SILLAGE)} />
            )}
            {f.value_rating !== null && <Meter label="Value for money" value={f.value_rating} max={5} />}
          </div>
        </Section>
      )}

      {f.description && (
        <div className="md:col-span-2">
          <Section title="Description">
            <p className="leading-relaxed">{f.description}</p>
          </Section>
        </div>
      )}

      {hasNotes && (
        <Section title="Fragrance pyramid">
          <div className="space-y-5">
            <NoteRow label="Top notes" notes={f.notes_top} />
            <NoteRow label="Heart notes" notes={f.notes_heart} />
            <NoteRow label="Base notes" notes={f.notes_base} />
          </div>
        </Section>
      )}

      {hasWear && (
        <Section title="When to wear">
          <div className="flex flex-wrap justify-around gap-4">
            {SEASONS.map((s) => (
              <WearColumn key={s.key} icon={s.icon} label={s.label} value={f.seasons?.[s.key] ?? 0} />
            ))}
            <div className="hidden w-px self-stretch bg-line sm:block" />
            {TIMES.map((t) => (
              <WearColumn key={t.key} icon={t.icon} label={t.label} value={f.time_of_day?.[t.key] ?? 0} />
            ))}
          </div>
        </Section>
      )}

      {(rs.summary || rs.pros?.length || rs.cons?.length) && (
        <div className="md:col-span-2">
          <Section title="What people say">
            {rs.summary && <p className="leading-relaxed">{rs.summary}</p>}
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {rs.pros && rs.pros.length > 0 && (
                <ul className="space-y-1.5 text-sm">
                  {rs.pros.map((p) => (
                    <li key={p} className="flex gap-2">
                      <span aria-hidden className="text-green-600 dark:text-green-400">＋</span>
                      {p}
                    </li>
                  ))}
                </ul>
              )}
              {rs.cons && rs.cons.length > 0 && (
                <ul className="space-y-1.5 text-sm">
                  {rs.cons.map((c) => (
                    <li key={c} className="flex gap-2">
                      <span aria-hidden className="text-red-600 dark:text-red-400">－</span>
                      {c}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {rs.compliments && (
              <p className="mt-4 text-sm text-muted">
                <span className="font-medium text-ink">Compliment factor:</span> {rs.compliments}
              </p>
            )}
          </Section>
        </div>
      )}

      {f.similar_fragrances.length > 0 && (
        <div className="md:col-span-2">
          <Section title="Similar fragrances">
            <ul className="flex flex-wrap gap-2">
              {f.similar_fragrances.map((s) => (
                <li key={s}>
                  <Link
                    href={`/search?q=${encodeURIComponent(s)}`}
                    className="inline-block rounded-full border border-line px-3 py-1 text-sm hover:border-accent"
                  >
                    {s}
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}

      <footer className="text-xs text-muted md:col-span-2">
        {f.profile_origin === "model_knowledge"
          ? "From Gemini's built-in knowledge, not web-verified; details may be off, especially for new or rare releases. Ratings and wear votes are approximate."
          : "Compiled from public fragrance sources; ratings and wear votes are approximate."}
        {f.looked_up_at &&
          ` Updated ${new Date(f.looked_up_at).toLocaleDateString("en-US", { dateStyle: "medium" })}.`}
        {f.sources.length > 0 && (
          <>
            {" "}Sources:{" "}
            {f.sources.map((s, i) => (
              <span key={s.url}>
                {i > 0 && ", "}
                <a href={s.url} target="_blank" rel="noreferrer" className="underline hover:text-ink">
                  {s.title}
                </a>
              </span>
            ))}
          </>
        )}
      </footer>
    </div>
  );
}
