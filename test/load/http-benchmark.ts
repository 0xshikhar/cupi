/**
 * cUPI Real HTTP Load Benchmark
 *
 * Measures actual end-to-end throughput and latency against a RUNNING server —
 * real HTTP → Next.js routing → handler → Postgres. Reports per-route tiers so
 * you can separate raw ingress from DB-bound work:
 *
 *   /api/ping      — no DB: raw HTTP + route handling ceiling
 *   /api/health    — one SELECT 1: ingress + single remote-DB round trip
 *   /api/resolve   — validation + real DB lookup (200 resolved:false or user hit)
 *   POST /checkout — zod validation + auth rejection (401/400 expected)
 *
 * Usage:
 *   npx next start -p 3459          # production build, separate terminal
 *   bun test/load/http-benchmark.ts --url http://localhost:3459 --duration 30 --concurrency 100
 *   bun test/load/http-benchmark.ts --url ... --route /api/ping   # single route
 *   bun test/load/http-benchmark.ts --url ... --sweep 25,50,100,200  # find saturation point
 */

const args = Object.fromEntries(
  process.argv.slice(2).map((a, i, arr) => [a.replace(/^--/, ""), arr[i + 1]]),
);
const BASE = (args.url || "http://localhost:3459").replace(/\/$/, "");
const DURATION_S = Number(args.duration || 30);
const CONCURRENCY = Number(args.concurrency || 100);
const ONLY_ROUTE = args.route || null;
const SWEEP: number[] = args.sweep ? String(args.sweep).split(",").map(Number) : [];

// Realistic resolve traffic: recipients repeat — 80% of lookups hit a hot pool
// of 512 addresses, 20% are cold/random keys.
const HOT_KEYS = Array.from(
  { length: 512 },
  (_, i) => `0x${i.toString(16).padStart(40, "0")}`,
);
const randomKey = () => `0x${Math.random().toString(16).slice(2).padEnd(40, "0")}`;
const resolveKey = () => (Math.random() < 0.8 ? HOT_KEYS[(Math.random() * HOT_KEYS.length) | 0] : randomKey());

const ROUTES: { name: string; weight: number; run: () => Promise<Response> }[] = [
  { name: "/api/ping", weight: 0.35, run: () => fetch(`${BASE}/api/ping`, { cache: "no-store" }) },
  { name: "/api/health", weight: 0.25, run: () => fetch(`${BASE}/api/health`, { cache: "no-store" }) },
  {
    name: "/api/resolve",
    weight: 0.25,
    run: () => fetch(`${BASE}/api/resolve?identifier=${resolveKey()}`, { cache: "no-store" }),
  },
  {
    name: "POST /checkout",
    weight: 0.15,
    run: () =>
      fetch(`${BASE}/api/merchant/checkout`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-merchant-key": "bench_invalid" },
        body: JSON.stringify({ amount: "1.00", currency: "USDC" }),
      }),
  },
];

let perRoute = new Map<string, { ms: number[]; status: Record<number, number>; errors: number }>();
let done = false;

function pick() {
  const routes = ONLY_ROUTE ? ROUTES.filter((r) => r.name === ONLY_ROUTE) : ROUTES;
  let total = 0;
  for (const r of routes) total += r.weight;
  let r = Math.random() * total;
  for (const route of routes) {
    if ((r -= route.weight) <= 0) return route;
  }
  return routes[0];
}

async function worker() {
  while (!done) {
    const route = pick();
    const t0 = performance.now();
    let entry = perRoute.get(route.name);
    if (!entry) {
      entry = { ms: [], status: {}, errors: 0 };
      perRoute.set(route.name, entry);
    }
    try {
      const res = await route.run();
      await res.arrayBuffer();
      entry.ms.push(performance.now() - t0);
      entry.status[res.status] = (entry.status[res.status] || 0) + 1;
    } catch {
      entry.errors++;
    }
  }
}

async function runRound(concurrency: number): Promise<number> {
  perRoute = new Map();
  done = false;

  for (const r of ROUTES) {
    try {
      await r.run().then((x) => x.arrayBuffer());
    } catch {
      /* warm-up, ignore */
    }
  }

  const start = performance.now();
  const workers = Array.from({ length: concurrency }, worker);
  await new Promise((r) => setTimeout(r, DURATION_S * 1000));
  done = true;
  await Promise.all(workers);
  const elapsedS = (performance.now() - start) / 1000;

  let totalOk = 0;
  console.log(`${"route".padEnd(18)} ${"req/s".padStart(8)} ${"req/min".padStart(9)} ${"p50".padStart(8)} ${"p95".padStart(8)} ${"p99".padStart(9)}  status`);
  for (const [name, e] of perRoute) {
    e.ms.sort((a, b) => a - b);
    const p = (x: number) => e.ms[Math.min(Math.floor((x / 100) * e.ms.length), e.ms.length - 1)] ?? 0;
    const rps = e.ms.length / elapsedS;
    totalOk += e.ms.length;
    const status = Object.entries(e.status).map(([k, v]) => `${k}:${v}`).join(" ");
    console.log(
      `${name.padEnd(18)} ${Math.round(rps).toLocaleString().padStart(8)} ${Math.round(rps * 60).toLocaleString().padStart(9)} ${(p(50).toFixed(0) + "ms").padStart(8)} ${(p(95).toFixed(0) + "ms").padStart(8)} ${(p(99).toFixed(0) + "ms").padStart(9)}  ${status}${e.errors ? ` ERR:${e.errors}` : ""}`,
    );
  }
  console.log("─".repeat(88));
  const rps = totalOk / elapsedS;
  console.log(`${"TOTAL".padEnd(18)} ${Math.round(rps).toLocaleString().padStart(8)} ${Math.round(rps * 60).toLocaleString().padStart(9)}\n`);
  return rps;
}

async function main() {
  console.log(`\n⚡ cUPI HTTP benchmark → ${BASE}  (${DURATION_S}s${ONLY_ROUTE ? `, route=${ONLY_ROUTE}` : ""})\n`);

  if (SWEEP.length > 0) {
    const results: { c: number; rps: number }[] = [];
    for (const c of SWEEP) {
      console.log(`── concurrency ${c} ${"─".repeat(70)}`);
      results.push({ c, rps: await runRound(c) });
    }
    console.log(`${"concurrency".padEnd(14)} ${"req/s".padStart(8)} ${"req/min".padStart(9)}`);
    for (const r of results) {
      console.log(`${String(r.c).padEnd(14)} ${Math.round(r.rps).toLocaleString().padStart(8)} ${Math.round(r.rps * 60).toLocaleString().padStart(9)}`);
    }
    console.log(`\nPeak: ${Math.round(Math.max(...results.map((r) => r.rps)) * 60).toLocaleString()} req/min at concurrency ${results.reduce((a, b) => (b.rps > a.rps ? b : a)).c}`);
  } else {
    console.log(`concurrency: ${CONCURRENCY}\n`);
    await runRound(CONCURRENCY);
  }

  console.log(`Single machine, single Next.js process. Horizontal scaling multiplies ingress;`);
  console.log(`DB-bound rows (health/resolve/checkout) share one Postgres pool via Prisma Accelerate.\n`);
}

main();
