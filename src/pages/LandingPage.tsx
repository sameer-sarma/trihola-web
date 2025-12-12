import React from "react";

const LandingPage: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <>
      <style>{`
        :root{
          --bg:#0b1020;
          --bg-soft:#0f1630;
          --text:#eaf0ff;
          --muted:#b9c1d9;
          --brand:#5b8cff;
          --brand-2:#00d4ff;
          --card:#121935;
          --border:rgba(255,255,255,.08);
          --shadow:0 10px 30px rgba(0,0,0,.35);
          --radius:20px;
        }
        *{ box-sizing: border-box; }
        html{ scroll-behavior:smooth; }
        body{ margin:0; }
        a{ color:inherit; text-decoration:none; }
        img{ max-width:100%; display:block; }
        .container{ width: min(1100px, 92vw); margin: 0 auto; }
        .grid{ display:grid; gap: clamp(16px, 2vw, 28px); }
        .two{ grid-template-columns: 1.1fr 1fr; }
        @media (max-width: 900px){ .two{ grid-template-columns: 1fr; } }
        header{ position:sticky; top:0; z-index:50; background: rgba(11,16,32,.6); backdrop-filter: blur(10px); border-bottom:1px solid var(--border); }
        .page{ font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Ubuntu, Cantarell, 'Helvetica Neue', Arial, 'Noto Sans'; background: linear-gradient(180deg, var(--bg) 0%, #0b1228 100%); color:var(--text); }
        .nav{ display:flex; align-items:center; justify-content:space-between; padding: 14px 0; }
        .brand{ display:flex; align-items:center; gap:10px; font-weight:700; letter-spacing:.2px; }
        .brand-badge{ width:36px; height:36px; border-radius:10px; background: radial-gradient(120% 120% at 0% 0%, var(--brand) 0%, var(--brand-2) 80%); box-shadow: var(--shadow);}        
        .btn{ display:inline-flex; align-items:center; justify-content:center; padding: 12px 18px; border-radius: 999px; border:1px solid var(--border); background: linear-gradient(180deg, #1a244c, #141c3e); color:var(--text); font-weight:600; box-shadow: var(--shadow); transition: transform .15s ease, box-shadow .15s ease; cursor:pointer; }
        .btn:hover{ transform: translateY(-1px); box-shadow: 0 14px 32px rgba(0,0,0,.45); }
        .btn-primary{ background: linear-gradient(90deg, var(--brand) 0%, var(--brand-2) 100%); border-color: transparent; color:#04122c; }
        .btn-ghost{ background:transparent; }
        .hero{ padding: clamp(40px, 7vw, 88px) 0 40px; position:relative; overflow:hidden; }
        .hero::after{ content:""; position:absolute; inset:-20%; pointer-events:none; background: radial-gradient(60% 50% at 70% 0%, rgba(91,140,255,.25), transparent 60%); z-index:-1; }
        .eyebrow{ color: var(--muted); font-weight:700; text-transform:uppercase; letter-spacing:.2em; font-size: .82rem; }
        h1{ margin:.4rem 0 1rem; font-size: clamp(34px, 5.2vw, 56px); line-height:1.12; letter-spacing:-.02em; }
        .sub{ font-size: clamp(16px, 2.2vw, 20px); color: var(--muted); max-width: 65ch; }
        .hero-card{ background: linear-gradient(180deg, var(--card), #0f1736); border:1px solid var(--border); border-radius: var(--radius); padding: clamp(18px, 2.4vw, 24px); box-shadow: var(--shadow); }
        .mock{ height: 320px; border-radius: 16px; border:1px dashed var(--border); display:grid; place-items:center; color: var(--muted); background: repeating-linear-gradient(45deg, rgba(255,255,255,.03) 0 6px, transparent 6px 12px); font-size: .95rem; }
        section{ padding: clamp(40px, 7vw, 80px) 0; }
        h2{ font-size: clamp(26px, 3.6vw, 36px); margin: 0 0 14px; letter-spacing:-.01em; }
        .lead{ color: var(--muted); margin-bottom: 28px; }
        .steps{ grid-template-columns: repeat(3, 1fr); }
        @media (max-width: 900px){ .steps{ grid-template-columns: 1fr; } }
        .card{ background: linear-gradient(180deg, var(--card), #10183a); border:1px solid var(--border); border-radius:16px; padding:22px; box-shadow: var(--shadow); }
        .icon{ width:42px; height:42px; border-radius:12px; margin-bottom:10px; display:grid; place-items:center; background:#141f46; border:1px solid var(--border); }
        .muted{ color: var(--muted); }
        .benefits{ grid-template-columns: repeat(3, 1fr); }
        @media (max-width: 900px){ .benefits{ grid-template-columns: 1fr; } }
        .cta{ text-align:center; padding: clamp(40px, 7vw, 90px) 0; background: linear-gradient(180deg, #0f1736, #0b1124); border-top:1px solid var(--border); border-bottom:1px solid var(--border); }
        footer{ padding: 28px 0; color: var(--muted); }
        .foot{ display:flex; align-items:center; justify-content:space-between; gap: 12px; }
        @media (max-width: 700px){ .foot{ flex-direction: column; text-align:center; } }
      `}</style>

      <div className="page">
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
