import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Learn — how Bangladesh Railway booking works | Rail Atlas",
  description:
    "Seat classes decoded, the 10-day booking window, split-ticket strategy, fares & VAT, and how to get your eticket token.",
};

const CLASSES: { code: string; name: string; note: string }[] = [
  { code: "SHOVAN", name: "Shovan", note: "Cheapest non-AC bench seating" },
  { code: "S_CHAIR", name: "Shovan Chair", note: "Non-AC reserved chair — the everyday class" },
  { code: "SHULOV", name: "Shulov", note: "Non-AC, slightly above Shovan Chair" },
  { code: "SNIGDHA", name: "Snigdha", note: "AC chair car — comfortable, mid-premium" },
  { code: "AC_CHAIR", name: "AC Chair", note: "Air-conditioned chair" },
  { code: "AC_S", name: "AC Seat", note: "AC seat (day)" },
  { code: "AC_B", name: "AC Berth", note: "AC sleeper berth — overnight, top tier" },
  { code: "F_CHAIR", name: "First Chair", note: "First-class chair (non-AC)" },
  { code: "F_SEAT", name: "First Seat", note: "First-class seat (non-AC)" },
  { code: "F_BERTH", name: "First Berth", note: "First-class sleeper berth" },
];

export default function LearnPage() {
  return (
    <div className="flex-1 w-full">
      <header className="board px-4 py-5 rounded-none">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <div className="board-text text-xs uppercase tracking-widest">Rail Atlas · Field guide</div>
            <h1 className="board-text text-2xl font-bold mt-1">How BD Railway booking works</h1>
          </div>
          <Link href="/" className="board-text text-xs underline shrink-0">← Back</Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        <Card title="🕗 The booking window" >
          <p>Tickets go on sale <strong>10 days before</strong> the journey date, released around <strong>8:00 AM</strong> (BST). So a 6 June ticket opens on 27 May. Popular routes — and anything around <strong>Eid</strong> — can sell out within minutes of release.</p>
          <p className="text-muted text-sm">Rail Atlas shows live counts: <em>online</em> seats are bookable on the website; <em>offline</em> are held for station counters.</p>
        </Card>

        <Card title="🎟️ Seat classes, decoded">
          <div className="grid sm:grid-cols-2 gap-2">
            {CLASSES.map((c) => (
              <div key={c.code} className="rounded-xl border border-app p-3">
                <div className="flex items-baseline gap-2">
                  <span className="font-semibold">{c.name}</span>
                  <span className="tnum text-[11px] text-muted">{c.code}</span>
                </div>
                <p className="text-sm text-muted mt-0.5">{c.note}</p>
              </div>
            ))}
          </div>
          <p className="text-muted text-sm">Fares shown are per seat; Bangladesh Railway adds <strong>15% VAT</strong> on AC classes (already broken out in the seat table).</p>
        </Card>

        <Card title="🧩 Split-ticket strategy">
          <p>When a direct ticket from A→B is sold out, you can often still travel <strong>seated</strong> by buying more than one ticket on the <strong>same train</strong>:</p>
          <ul className="list-disc list-inside space-y-1.5 text-sm">
            <li><strong>Split</strong>: buy A→M and M→B separately — each leg has its own seat, you keep your spot the whole way (or change seats at M).</li>
            <li><strong>Board early</strong>: buy a ticket from a station <em>before</em> A that runs through to B — your reserved seat covers A→B; you just overpay the unused leg.</li>
            <li><strong>Partial coverage</strong>: seat for most of the trip, then <em>stand</em> for a short gap. ⚠️ Standing without a ticket for that stretch risks a TTE fine — buy the longest covered slice you can.</li>
          </ul>
          <p className="text-muted text-sm">The <strong>Smart Finder</strong> on each train and <strong>Deep scan</strong> compute these for you automatically.</p>
        </Card>

        <Card title="🔑 Getting your token">
          <p>Rail Atlas talks to the official eticket API using <strong>your own</strong> login — nothing is shared, and your token stays in <em>your</em> browser only.</p>
          <ol className="list-decimal list-inside space-y-1.5 text-sm">
            <li>Log in at <a className="text-brand-600 dark:text-brand-300 underline" href="https://eticket.railway.gov.bd" target="_blank" rel="noopener noreferrer">eticket.railway.gov.bd</a>.</li>
            <li>Open DevTools console (F12) and run the snippet the app shows on the setup screen.</li>
            <li>Paste the resulting JSON into Rail Atlas. Done.</li>
          </ol>
          <p className="text-muted text-sm">Tokens are short-lived (~12 h) and can be revoked on re-login — if searches come back empty, grab a fresh one via <strong>Token</strong> in the nav.</p>
        </Card>

        <Card title="🌙 Eid & peak tips">
          <ul className="list-disc list-inside space-y-1.5 text-sm">
            <li>Be ready at 8:00 AM exactly 10 days out — set an alarm.</li>
            <li>Use <strong>ranked dates</strong> (e.g. 6th best, 7th next) so you can grab whatever opens first.</li>
            <li>If your home station sells out, check seats from a station one or two stops earlier (board-early trick).</li>
            <li>AC berths for overnight trains vanish first; chair classes last longer.</li>
          </ul>
        </Card>

        <p className="text-center text-xs text-muted pt-2">Rail Atlas is an unofficial dashboard over Bangladesh Railway&apos;s public eticket API. Always confirm on the official site before travelling.</p>
      </main>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="surface border rounded-2xl p-5 md:p-6 space-y-3">
      <h2 className="font-display font-bold text-lg">{title}</h2>
      {children}
    </section>
  );
}
