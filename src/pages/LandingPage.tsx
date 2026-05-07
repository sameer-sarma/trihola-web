import React from "react";

const LandingPage: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <>
      <div className="landing">
        <header>
          <div className="container nav">
            <a className="brand" href="#top">
              <span className="brand-badge" />
              <span>TriHola</span>
            </a>
            <nav>
              <a href="#how" className="btn btn-ghost">How it works</a>
              <a href="/register" className="btn btn-primary">Start a thread</a>
            </nav>
          </div>
        </header>

        <main id="top">
          <section className="hero">
            <div className="container grid two">
              <div>
                <div className="eyebrow">
                  Conversations • Referrals • Offers • Orders
                </div>

                <h1>
                  Conversations. Referrals. Offers. Orders. <br />
                  All in one thread.
                </h1>

                <p className="sub">
                  Trihola helps businesses and communities manage relationships,
                  referrals, customer engagement, offers, and actions through
                  structured shared conversations.
                </p>

                <div style={{ marginTop: 24 }}>
                  <a href="/register" className="btn btn-primary">Start your first thread</a>
                </div>
              </div>

              <div className="hero-card">
                <div className="mock">
                  <div>
                    <strong>Shared Thread</strong>
                    <div style={{ height: 8 }} />
                    <span className="muted">
                      Message sent · Referral requested · Offer assigned · Order updated
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="how">
            <div className="container">
              <h2>How it works</h2>
              <p className="lead">
                Turn everyday conversations into structured business engagement.
              </p>

              <div className="grid steps">
                <div className="card">
                  <h3>1 — Start a thread</h3>
                  <p className="muted">
                    Bring people, businesses, customers, and opportunities into one shared space.
                  </p>
                </div>

                <div className="card">
                  <h3>2 — Coordinate actions</h3>
                  <p className="muted">
                    Referrals, offers, approvals, updates, and orders happen in context.
                  </p>
                </div>

                <div className="card">
                  <h3>3 — Build continuity</h3>
                  <p className="muted">
                    Every interaction stays connected, visible, and actionable over time.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="container">
              <h2>Why TriHola</h2>
              <p className="lead">
                Built for relationship-driven businesses and communities.
              </p>

              <div className="grid benefits">
                <div className="card">
                  <h3>Shared Conversations</h3>
                  <p className="muted">
                    Keep people, businesses, referrals, offers, and actions together.
                  </p>
                </div>

                <div className="card">
                  <h3>Structured Engagement</h3>
                  <p className="muted">
                    Turn chats into trackable workflows without losing the human element.
                  </p>
                </div>

                <div className="card">
                  <h3>Relationship-Centered CRM</h3>
                  <p className="muted">
                    Built around trust and interactions — not just records and pipelines.
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section>
            <div className="container">
              <h2>What TriHola is NOT</h2>

              <div className="card">
                <p className="muted">❌ Another disconnected CRM</p>
                <p className="muted">❌ Scattered WhatsApp follow-ups</p>
                <p className="muted">❌ Affiliate spam or coupon blasting</p>
                <p className="muted">❌ Growth at the cost of relationships</p>

                <hr style={{ borderColor: "rgba(255,255,255,.1)" }} />

                <p className="muted">✅ Conversations with context</p>
                <p className="muted">✅ Referrals, offers, and orders in one timeline</p>
                <p className="muted">✅ Engagement with continuity</p>
                <p className="muted">✅ Relationships that stay actionable</p>
              </div>
            </div>
          </section>

          <section>
            <div className="container">
              <h2>Frequently asked questions</h2>

              <div className="card">
                <p><strong>Is TriHola a CRM?</strong></p>
                <p className="muted">
                  Trihola is a relationship and engagement platform built around shared threads
                  instead of traditional records and pipelines.
                </p>

                <p><strong>How is this different from WhatsApp?</strong></p>
                <p className="muted">
                  WhatsApp is great for messaging. Trihola adds structure around conversations —
                  including referrals, offers, orders, approvals, actions, and engagement history.
                </p>

                <p><strong>Is TriHola only for referrals?</strong></p>
                <p className="muted">
                  No. Referrals are one important workflow, but Trihola also supports broader
                  relationship engagement between people and businesses.
                </p>

                <p><strong>Do both sides need to be on TriHola?</strong></p>
                <p className="muted">
                  No. Threads and interactions can begin even when the other person or business
                  is not fully onboarded yet.
                </p>

                <p><strong>Is TriHola only for businesses?</strong></p>
                <p className="muted">
                  No. Individuals, communities, referrers, and businesses can all participate.
                </p>

                <p><strong>Is my data shared or sold?</strong></p>
                <p className="muted">
                  No. Trihola is designed around trusted relationships and privacy-first engagement.
                </p>
              </div>
            </div>
          </section>

          <section className="cta">
            <div className="container">
              <h3>Bring your conversations, referrals, and customer engagement together.</h3>
              <p>Build stronger business relationships — one thread at a time.</p>
              <a href="/register" className="btn btn-primary">Start your first thread</a>
            </div>
          </section>
        </main>

        <footer>
          <div className="container foot">
            <div>© {year} TriHola</div>
            <nav style={{ display: "flex", gap: 16 }}>
              <a href="/about">About</a>
              <a href="/contact">Contact</a>
              <a href="/privacy">Privacy</a>
            </nav>
          </div>
        </footer>
      </div>
    </>
  );
};

export default LandingPage;