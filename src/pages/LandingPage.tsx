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
              <a href="/register" className="btn btn-primary">Create your first referral</a>
            </nav>
          </div>
        </header>

        <main id="top">
          {/* HERO */}
          <section className="hero">
            <div className="container grid two">
              <div>
                <div className="eyebrow">Word-of-mouth, finally tracked</div>
                <h1>
                  Never lose a referral again — <br />
                  track, reward, and grow from every recommendation
                </h1>
                <p className="sub">
                  Perfect for local businesses, educators, service providers,
                  and anyone who grows through trust.
                </p>
                <div style={{ marginTop: 24 }}>
                  <a href="/register" className="btn btn-primary">Create your first referral</a>
                </div>
              </div>

              <div className="hero-card">
                <div className="mock">
                  <div>
                    <strong>Referral Timeline</strong>
                    <div style={{ height: 8 }} />
                    <span className="muted">Every update, offer & action in one place</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* HOW IT WORKS */}
          <section id="how">
            <div className="container">
              <h2>How it works</h2>
              <p className="lead">Three simple steps to make every recommendation count.</p>
              <div className="grid steps">
                <div className="card">
                  <h3>1 — Refer</h3>
                  <p className="muted">Introduce a person to a business — intentionally.</p>
                </div>
                <div className="card">
                  <h3>2 — Track</h3>
                  <p className="muted">Follow the referral through a clear, shared timeline.</p>
                </div>
                <div className="card">
                  <h3>3 — Reward</h3>
                  <p className="muted">When value is created, rewards are unlocked.</p>
                </div>
              </div>
            </div>
          </section>

          {/* WHY */}
          <section>
            <div className="container">
              <h2>Why TriHola</h2>
              <p className="lead">Built for trust-based growth.</p>
              <div className="grid benefits">
                <div className="card">
                  <h3>For Individuals</h3>
                  <p className="muted">Your recommendations don’t disappear.</p>
                </div>
                <div className="card">
                  <h3>For Referrers</h3>
                  <p className="muted">No awkward follow-ups. No uncertainty.</p>
                </div>
                <div className="card">
                  <h3>For Businesses</h3>
                  <p className="muted">Turn trust into a repeatable growth channel.</p>
                </div>
              </div>
            </div>
          </section>

          {/* WHAT IT IS NOT */}
          <section>
            <div className="container">
              <h2>What TriHola is NOT</h2>
              <div className="card">
                <p className="muted">❌ Affiliate spam or influencer marketing</p>
                <p className="muted">❌ Coupon blasting or referral bait</p>
                <p className="muted">❌ Growth at the cost of relationships</p>
                <hr style={{ borderColor: "rgba(255,255,255,.1)" }} />
                <p className="muted">✅ Real people making trusted introductions</p>
                <p className="muted">✅ Clear outcomes for everyone involved</p>
                <p className="muted">✅ Respect for relationships, not exploitation</p>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section>
            <div className="container">
              <h2>Frequently asked questions</h2>

              <div className="card">
                <p><strong>Is TriHola free to use?</strong></p>
                <p className="muted">Yes, individuals can get started for free. Businesses can unlock advanced features as they grow.</p>

                <p><strong>Do both sides need to be on TriHola?</strong></p>
                <p className="muted">No. Referrals can be created even if the other person isn’t on TriHola yet.</p>

                <p><strong>How is this different from WhatsApp?</strong></p>
                <p className="muted">WhatsApp messages get buried. TriHola keeps every referral, update, offer, and reward organized.</p>

                <p><strong>Is this only for businesses?</strong></p>
                <p className="muted">No. Anyone can refer. Businesses use TriHola to manage and reward referrals.</p>

                <p><strong>Is my data shared or sold?</strong></p>
                <p className="muted">No. TriHola is privacy-first by design.</p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="cta">
            <div className="container">
              <h3>Start making your referrals count.</h3>
              <p>Turn trust into measurable growth.</p>
              <a href="/register" className="btn btn-primary">Create your first referral</a>
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
