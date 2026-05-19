import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: "2rem", maxWidth: "60rem", margin: "0 auto" }}>
      <h1 style={{ fontSize: "2.5rem", fontWeight: 700, marginBottom: "1rem" }}>
        Ritsu Works — Operating Docs
      </h1>
      <p style={{ fontSize: "1.125rem", color: "#444", marginBottom: "1.5rem" }}>
        Tài liệu vận hành <strong>ritsu-works</strong> — Operator + AI runtime
        context bundle (Vietnamese-first). Tự sync với codebase qua{" "}
        <code>/docs</code> command (xem{" "}
        <Link href="/docs">tài liệu</Link>).
      </p>

      <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginTop: "2rem" }}>
        Diátaxis quadrants
      </h2>
      <ul style={{ marginTop: "0.5rem" }}>
        <li>
          <strong>Tutorials</strong> — bài tập có hướng dẫn (Sprint 2 ships 5 tutorials).
        </li>
        <li>
          <strong>How-to guides</strong> — pillar SOPs (auto-generated từ <code>flow.yaml</code>).
        </li>
        <li>
          <strong>Reference</strong> — auto-gen từ skill / agent / hook / command frontmatter.
        </li>
        <li>
          <strong>Explanation</strong> — charter + governance + capability specs.
        </li>
      </ul>

      <h2 style={{ fontSize: "1.5rem", fontWeight: 600, marginTop: "2rem" }}>
        AI runtime
      </h2>
      <p>
        Mỗi MDX page có endpoint{" "}
        <code>/api/raw/&lt;slug&gt;</code> trả raw MDX (Markdown + frontmatter)
        cho AI agents fetch làm runtime context. Ví dụ:{" "}
        <code>/api/raw/skills/wiki-sync</code>.
      </p>

      <hr style={{ margin: "2rem 0", border: "none", borderTop: "1px solid #ddd" }} />
      <p style={{ fontSize: "0.875rem", color: "#888" }}>
        Capability <code>docs-engine</code> v1.0 — see{" "}
        <code>wiki/capabilities/docs-engine/spec.md</code> after Phase 8 promotion.
      </p>
    </main>
  );
}
