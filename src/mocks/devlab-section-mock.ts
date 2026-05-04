import {
  Cpu,
  Network,
  Layers,
  Database,
  Boxes,
  Terminal,
  type LucideIcon,
} from "lucide-react"
import type { DraftBlock } from "@/components/devlab-post-editor"

export interface Category {
  id: string
  label: string
  icon: LucideIcon
  description: string
  posts: Post[]
}

export interface Post {
  id: string
  title: string
  excerpt: string
  date: string
  readingTime: string
  tags: string[]
  replies: number
  pinned?: boolean
  blocks?: DraftBlock[]
}


export const CATEGORIES: Category[] = [
  {
    id: "compilers",
    label: "Compilers",
    icon: Cpu,
    description: "Lexing, parsing, IR lowering, and code generation.",
    posts: [
      {
        id: "c1",
        title: "A small step interpreter for an arithmetic AST",
        excerpt:
          "We walk through a tiny tree-walking interpreter that evaluates a structured AST one reduction at a time.",
        date: "Apr 22, 2026",
        readingTime: "8 min",
        tags: ["AST", "Interpreters", "TypeScript"],
        replies: 4,
        pinned: true,
      },
      {
        id: "c2",
        title: "Pratt parsing and operator precedence without a table",
        excerpt:
          "Top-down operator precedence revisited — the elegant trick that makes expression parsers trivially extensible.",
        date: "Mar 14, 2026",
        readingTime: "11 min",
        tags: ["Parsing", "Pratt", "Rust"],
        replies: 7,
      },
      {
        id: "c3",
        title: "From AST to SSA form in one pass",
        excerpt:
          "Constructing SSA directly during parsing avoids an explicit AST lowering phase and simplifies later optimisation passes.",
        date: "Feb 28, 2026",
        readingTime: "14 min",
        tags: ["SSA", "IR", "Optimisation"],
        replies: 2,
      },
    ],
  },
  {
    id: "networks",
    label: "Networks",
    icon: Network,
    description: "TCP, TLS, HTTP semantics and everything below the fold.",
    posts: [
      {
        id: "n1",
        title: "Why TCP slow-start matters more than you think",
        excerpt:
          "A practical look at congestion windows, RTT-inflated latency, and why the first request is always the worst.",
        date: "Apr 10, 2026",
        readingTime: "9 min",
        tags: ["TCP", "Congestion", "Latency"],
        replies: 5,
        pinned: true,
      },
      {
        id: "n2",
        title: "QUIC internals: connection migration and 0-RTT",
        excerpt:
          "How QUIC moves connections across IP changes without a handshake, and the security trade-offs that come with it.",
        date: "Mar 3, 2026",
        readingTime: "13 min",
        tags: ["QUIC", "TLS", "HTTP/3"],
        replies: 3,
      },
    ],
  },
  {
    id: "architecture",
    label: "Architecture",
    icon: Layers,
    description: "Distributed systems, boundaries, and failure modes.",
    posts: [
      {
        id: "a1",
        title: "Event sourcing is not a database",
        excerpt:
          "Clarifying what the pattern actually guarantees, what it explicitly does not, and when you should reach for it.",
        date: "Apr 18, 2026",
        readingTime: "10 min",
        tags: ["Event Sourcing", "CQRS"],
        replies: 11,
        pinned: true,
      },
      {
        id: "a2",
        title: "Saga vs. 2PC: choosing distributed transactions",
        excerpt:
          "Both patterns solve distributed consistency — they just choose different failure modes. Here is how to pick.",
        date: "Mar 22, 2026",
        readingTime: "12 min",
        tags: ["Sagas", "Transactions", "Consistency"],
        replies: 6,
      },
      {
        id: "a3",
        title: "Backpressure: the invisible contract between services",
        excerpt:
          "Without backpressure your fast producer will eventually drown your slow consumer. Here is how to enforce the contract.",
        date: "Feb 15, 2026",
        readingTime: "7 min",
        tags: ["Backpressure", "Streams", "Resilience"],
        replies: 2,
      },
    ],
  },
  {
    id: "databases",
    label: "Databases",
    icon: Database,
    description: "Storage engines, indexes, and query planning.",
    posts: [
      {
        id: "d1",
        title: "B-trees vs. LSM-trees: the read/write trade-off",
        excerpt:
          "Why RocksDB and LevelDB chose LSM and when that is exactly the wrong call for your workload.",
        date: "Apr 5, 2026",
        readingTime: "11 min",
        tags: ["B-trees", "LSM", "Storage"],
        replies: 8,
        pinned: true,
      },
    ],
  },
  {
    id: "systems",
    label: "Systems",
    icon: Boxes,
    description: "OS internals, memory models, and concurrency primitives.",
    posts: [
      {
        id: "s1",
        title: "Cache coherence without magic: MESI explained",
        excerpt:
          "A bottom-up tour of how multi-core processors keep caches consistent — and why your lock-free algorithm might still be wrong.",
        date: "Mar 30, 2026",
        readingTime: "15 min",
        tags: ["CPU", "Caches", "Concurrency"],
        replies: 9,
        pinned: true,
      },
    ],
  },
  {
    id: "tooling",
    label: "Tooling",
    icon: Terminal,
    description: "Build systems, profilers, and developer ergonomics.",
    posts: [
      {
        id: "t1",
        title: "Incremental compilation in Cargo: what actually changes",
        excerpt:
          "An inside look at how Cargo tracks changed inputs and avoids recompiling transitive dependencies unnecessarily.",
        date: "Apr 1, 2026",
        readingTime: "9 min",
        tags: ["Rust", "Cargo", "Build Systems"],
        replies: 4,
        pinned: true,
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// Full post content for the pinned Compilers post
// ---------------------------------------------------------------------------

export const SAMPLE_CODE = `type Expr =
  | { kind: "num"; value: number }
  | { kind: "bin"; op: "+" | "*"; left: Expr; right: Expr }

function evaluate(expr: Expr): number {
  switch (expr.kind) {
    case "num":
      return expr.value
    case "bin": {
      const l = evaluate(expr.left)
      const r = evaluate(expr.right)
      return expr.op === "+" ? l + r : l * r
    }
  }
}

const program: Expr = {
  kind: "bin",
  op: "+",
  left: { kind: "num", value: 21 },
  right: { kind: "bin", op: "*", left: { kind: "num", value: 3 }, right: { kind: "num", value: 7 } },
}

console.log(evaluate(program)) // 42`

export const ANNOTATIONS = [
  {
    line: 1,
    title: "Tagged unions for the AST",
    body: "We model each node as a discriminated union by the `kind` field. This lets the compiler exhaustively check all branches in `evaluate`, catching missing cases at build time.",
  },
  {
    line: 5,
    title: "Pure recursive evaluation",
    body: "Tree-walking interpreters are slow but correct. They are an excellent baseline before optimizing into a bytecode VM or lowering to SSA-based IR.",
  },
  {
    line: 11,
    title: "Strict left-to-right evaluation",
    body: "We evaluate `left` before `right` to preserve evaluation order semantics. In a real language this matters once expressions can have side effects.",
  },
  {
    line: 23,
    title: "AST is data, not syntax",
    body: "The interpreter accepts already-parsed structured input. Parsing is intentionally a separate phase — keep the boundary between syntax and semantics sharp.",
  },
]