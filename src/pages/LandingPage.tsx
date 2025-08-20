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
        .btn{ display:inline-flex; align-items:center; justify-content:center; padding: 12px 18px; border-radius: 999px; border:1px solid var(--border); background: linear-gradient(180deg, #1a244c, #141c3e); color:var(--text); font-weight:600; box-shadow: var(--shadow); transition: transform .15s ease, box-shadow .15s ease, background .15s ease; cursor:pointer; }
        .btn:hover{ transform: translateY(-1px); box-shadow: 0 14px 32px rgba(0,0,0,.45); }
        .btn-primary{ background: linear-gradient(90deg, var(--brand) 0%, var(--brand-2) 100%); border-color: transparent; color:#04122c; }
        .btn-ghost{ background:transparent; }
        .hero{ padding: clamp(40px, 7vw, 88px) 0 40px; position:relative; overflow:hidden; }
        .hero::after{ content:""; position:absolute; inset:-20%; pointer-events:none; background: radial-gradient(60% 50% at 70% 0%, rgba(91,140,255,.25), transparent 60%); z-index:-1; }
        .eyebrow{ color: var(--muted); font-weight:700; text-transform:uppercase; letter-spacing:.2em; font-size: .82rem; }
        h1{ margin:.4rem 0 1rem; font-size: clamp(34px, 5.2vw, 56px); line-height:1.12; letter-spacing:-.02em; }
        .sub{ font-size: clamp(16px, 2.2vw, 20px); color: var(--muted); max-width: 60ch; }
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
        .tick{ margin-right:8px; }
        .feature{ align-items:center; }
        .feature .hero-card{ padding: 26px; }
        .bullets li{ margin: 8px 0; }
        .bullets{ padding-left: 0; list-style: none; }
        .cta{ text-align:center; padding: clamp(40px, 7vw, 90px) 0; background: linear-gradient(180deg, #0f1736, #0b1124); border-top:1px solid var(--border); border-bottom:1px solid var(--border); }
        .cta h3{ font-size: clamp(22px, 3.2vw, 30px); margin:0 0 14px; }
        .cta p{ color: var(--muted); margin:0 0 20px; }
        footer{ padding: 28px 0; color: var(--muted); }
        .foot{ display:flex; align-items:center; justify-content:space-between; gap: 12px; }
        @media (max-width: 700px){ .foot{ flex-direction: column; text-align:center; } }
        .sp-16{ height:16px; } .sp-24{ height:24px; } .sp-32{ height:32px; }
      `}</style>

      <div className="page">
        <header>
          <div className="container nav">
            <a className="brand" href="#top" aria-label="TriHola Home">
              <span className="brand-badge" aria-hidden="true"></span>
              <span>TriHola</span>
            </a>
            <nav>
              <a href="#how" className="btn btn-ghost">How it works</a>
              <a href="#benefits" className="btn btn-ghost">Benefits</a>
              <a href="/register" className="btn btn-primary">Get Started</a>
            </nav>
          </div>
        </header>

        <main id="top">
          <section className="hero">
            <div className="container grid two">
              <div>
                <div className="eyebrow">Referrals • Offers • Rewards</div>
                <h1>
                  Referrals made simple. <br />
                  Rewards made real.
                </h1>
                <p className="sub">
                  Turn every recommendation into a win-win. With TriHola, you can connect people with businesses, track referrals in real time, and unlock exclusive rewards.
                </p>
                <div className="sp-24" />
                <div>
                  <a href="/register" className="btn btn-primary">Join TriHola</a>
                  <a href="#how" className="btn" style={{ marginLeft: 10 }}>How it works</a>
                </div>
              </div>

              <div className="hero-card">
                <div className="mock" aria-label="App mockup placeholder">
                  <div>
                    <strong>Live Thread Preview</strong>
                    <div style={{ height: 8 }} />
                    <span className="muted">WhatsApp-style timeline for each referral</span>
                  </div>
                </div>
                <div className="sp-16" />
                <div className="grid" style={{ gridTemplateColumns: "1fr 1fr" }}>
                  <div className="card">
                    <div className="muted" style={{ fontSize: ".9rem" }}>Track referrals</div>
                    <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>Real-time updates</div>
                  </div>
                  <div className="card">
                    <div className="muted" style={{ fontSize: ".9rem" }}>Claim & redeem</div>
                    <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>Secure QR flows</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section id="how">
            <div className="container">
              <h2>How it works</h2>
              <p className="lead">Three simple steps to make every recommendation count.</p>
              <div className="grid steps">
                <div className="card">
                  <div className="icon" aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Refer icon">
                      <path d="M4 12v6a2 2 0 0 0 2 2h12" stroke="currentColor" strokeWidth="1.6"/>
                      <path d="M16 6l-8 4 8 4V6z" fill="currentColor"/>
                    </svg>
                  </div>
                  <h3>1 — Refer</h3>
                  <p className="muted">Share a friend's contact with a business, or suggest a business to a friend.</p>
                </div>
                <div className="card">
                  <div className="icon" aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Track icon">
                      <path d="M21 12a8 8 0 1 1-15.5 3.5L3 21l5.5-2.5A8 8 0 0 1 21 12z" stroke="currentColor" strokeWidth="1.6"/>
                    </svg>
                  </div>
                  <h3>2 — Track</h3>
                  <p className="muted">Follow the journey in a WhatsApp-style thread with real-time updates.</p>
                </div>
                <div className="card">
                  <div className="icon" aria-hidden="true">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Reward icon">
                      <path d="M12 3l2.9 5.9L21 10l-4.5 4.4L17.8 21 12 17.8 6.2 21l1.3-6.6L3 10l6.1-1.1L12 3z" stroke="currentColor" strokeWidth="1.6"/>
                    </svg>
                  </div>
                  <h3>3 — Reward</h3>
                  <p className="muted">When the connection happens, both sides earn exclusive offers.</p>
                </div>
              </div>
            </div>
          </section>

          <section id="benefits">
            <div className="container">
              <h2>Why TriHola</h2>
              <p className="lead">Designed for users, referrers and businesses.</p>
              <div className="grid benefits">
                <div className="card">
                  <h3>For Users</h3>
                  <p className="muted"><span className="tick">✔</span>Every referral counts — no more lost recommendations.</p>
                  <p className="muted"><span className="tick">✔</span>Organize offers and claims in one place.</p>
                  <p className="muted"><span className="tick">✔</span>Privacy-first controls.</p>
                </div>
                <div className="card">
                  <h3>For Referrers</h3>
                  <p className="muted"><span className="tick">✔</span>Earn real rewards for helping your network.</p>
                  <p className="muted"><span className="tick">✔</span>Simple, trackable threads.</p>
                  <p className="muted"><span className="tick">✔</span>Transparent status at every step.</p>
                </div>
                <div className="card">
                  <h3>For Businesses</h3>
                  <p className="muted"><span className="tick">✔</span>Turn happy customers into your best sales channel.</p>
                  <p className="muted"><span className="tick">✔</span>Reward management & redemption analytics.</p>
                  <p className="muted"><span className="tick">✔</span>Secure, scalable, RLS-backed platform.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="feature">
            <div className="container grid two">
              <div className="hero-card">
                <div className="mock" aria-label="QR redemption mockup placeholder">
                  <div>
                    <strong>Offer Redemption</strong>
                    <div style={{ height: 8 }} />
                    <span className="muted">QR codes • Timestamps • Offline ready</span>
                  </div>
                </div>
              </div>
              <div>
                <h2>Claim & Redeem, the easy way</h2>
                <p className="muted">QR codes and timestamps make offline redemption fast and secure. Every referral, offer and claim stays recorded in a single timeline.</p>
                <ul className="bullets muted">
                  <li>• Claim activation on assignment or on acceptance</li>
                  <li>• Linked offers & conditional rewards</li>
                  <li>• Business approval windows & audit trail</li>
                </ul>
                <div className="sp-16" />
                <a href="/register" className="btn btn-primary">Get Started</a>
              </div>
            </div>
          </section>

          <section id="get-started" className="cta">
            <div className="container">
              <h3>Start making your referrals count today.</h3>
              <p>Join TriHola and turn word-of-mouth into measurable growth.</p>
              <a className="btn btn-primary" href="/register">Join TriHola</a>
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
              <a href="/business">Business Sign-Up</a>
            </nav>
          </div>
        </footer>
      </div>
    </>
  );
};

export default LandingPage;
