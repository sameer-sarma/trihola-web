import React from "react";
import logo from "../assets/logo.png";

const LandingPage: React.FC = () => {
  const year = new Date().getFullYear();

  return (
    <div className="landing">
      <header>
        <div className="container nav">
          <a className="brand" href="#top">
            <a className="brand" href="/">
              <img
                src={logo}
                alt="Trihola"
                className="brand-logo"
              />
              <span>Trihola</span>
            </a>
          </a>

          <nav>
            <a href="#how" className="btn btn-ghost">
              How it works
            </a>
            <a href="/register" className="btn btn-primary">
              Get started
            </a>
          </nav>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="container grid two">
            <div>
              <div className="eyebrow">
                Customer engagement • Business actions • Trusted relationships
              </div>

              <h1>Turn customer conversations into business follow-through.</h1>

              <p className="sub">
                TriHola helps people and businesses manage customer engagement,
                trusted introductions, follow-ups, and business actions through
                shared relationship-centered threads.
              </p>

              <div className="heroActions">
                <a href="/register" className="btn btn-primary">
                  Get started
                </a>
                <a href="#why" className="btn btn-ghost">
                  Learn more
                </a>
              </div>
            </div>

            <div className="hero-card">
              <div className="mockThread">
                <div className="mockHeader">
                  <div>
                    <strong>Customer engagement thread</strong>
                    <p>Everything stays connected</p>
                  </div>
                  <span className="mockStatus">Active</span>
                </div>

                <div className="mockEvent">
                  <span className="dot" />
                  <div>
                    <strong>Customer conversation started</strong>
                    <p>Context, people and business intent in one place.</p>
                  </div>
                </div>

                <div className="mockEvent">
                  <span className="dot warm" />
                  <div>
                    <strong>Trusted introduction added</strong>
                    <p>Relationships stay visible as the conversation grows.</p>
                  </div>
                </div>

                <div className="mockEvent">
                  <span className="dot gold" />
                  <div>
                    <strong>Business action coordinated</strong>
                    <p>Follow-ups, next steps and outcomes stay trackable.</p>
                  </div>
                </div>

                <div className="mockFooter">
                  Shared context · Clear next steps · Relationship history
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="how">
          <div className="container">
            <h2>How TriHola works</h2>
            <p className="lead">
              A simple way to keep business engagement connected, contextual and
              actionable.
            </p>

            <div className="grid steps">
              <div className="card">
                <h3>1 — Start with a relationship</h3>
                <p className="muted">
                  Bring customers, contacts, businesses and collaborators into
                  one shared context.
                </p>
              </div>

              <div className="card">
                <h3>2 — Coordinate the next step</h3>
                <p className="muted">
                  Manage follow-ups, introductions, decisions and actions
                  without losing context.
                </p>
              </div>

              <div className="card">
                <h3>3 — Build continuity</h3>
                <p className="muted">
                  Keep relationship history, business intent and outcomes
                  connected over time.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section id="why">
          <div className="container">
            <h2>Built for relationship-led businesses</h2>
            <p className="lead">
              TriHola is designed for businesses where trust, conversations and
              follow-through matter.
            </p>

            <div className="grid benefits">
              <div className="card">
                <h3>Customer engagement with context</h3>
                <p className="muted">
                  Keep conversations, people, intent and next steps together
                  instead of scattered across tools.
                </p>
              </div>

              <div className="card">
                <h3>Business actions inside conversations</h3>
                <p className="muted">
                  Turn engagement into coordinated actions while preserving the
                  relationship behind them.
                </p>
              </div>

              <div className="card">
                <h3>Trust-first growth</h3>
                <p className="muted">
                  Support referrals, recommendations and follow-ups without
                  turning relationships into spam.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="container">
            <h2>Why teams use TriHola</h2>

            <div className="proofGrid">
              <div className="proofCard">
                <span>For businesses</span>
                <strong>
                  Manage engagement after the first conversation.
                </strong>
              </div>

              <div className="proofCard">
                <span>For professionals</span>
                <strong>
                  Keep trusted introductions organized and actionable.
                </strong>
              </div>

              <div className="proofCard">
                <span>For communities</span>
                <strong>
                  Help relationships turn into meaningful outcomes.
                </strong>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="container">
            <h2>Frequently asked questions</h2>

            <div className="faqCard">
              <div>
                <h3>Is TriHola a CRM?</h3>
                <p className="muted">
                  TriHola is a relationship and engagement platform. It helps
                  organize customer and business interactions through shared
                  threads rather than only static records.
                </p>
              </div>

              <div>
                <h3>How is this different from messaging apps?</h3>
                <p className="muted">
                  Messaging apps are good for conversation. TriHola adds
                  structure around business engagement, relationship history,
                  follow-ups and actions.
                </p>
              </div>

              <div>
                <h3>Is TriHola only for referrals?</h3>
                <p className="muted">
                  No. Referrals are one important workflow, but TriHola supports
                  broader business engagement between people, customers and
                  businesses.
                </p>
              </div>

              <div>
                <h3>Do both sides need to be fully onboarded?</h3>
                <p className="muted">
                  No. Engagement can begin even when the other person or
                  business is not fully onboarded yet.
                </p>
              </div>

              <div>
                <h3>Is my data sold?</h3>
                <p className="muted">
                  No. TriHola is designed around trusted relationships and does
                  not sell personal information.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="cta">
          <div className="container">
            <h3>
              Build stronger business relationships — one thread at a time.
            </h3>
            <p>
              Keep engagement, context and business actions connected as
              relationships grow.
            </p>
            <a href="/register" className="btn btn-primary">
              Get started
            </a>
          </div>
        </section>
      </main>

      <footer>
        <div className="container foot">
          <div>© {year} TriHola</div>
          <nav style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
            <a href="/about">About</a>
            <a href="/contact">Contact</a>
            <a href="/privacy">Privacy</a>
          </nav>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;