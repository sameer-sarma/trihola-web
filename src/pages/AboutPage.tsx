//import React from "react";
import PublicPageHeader from "../components/PublicPageHeader";


export default function AboutPage() {
  return (
    <div className="landing">
      <PublicPageHeader />
    <main className="public-doc">
      <h1>About TriHola</h1>

      <p>
        TriHola is a relationship and engagement platform built around the way
        people and businesses actually grow: through trust, conversations,
        referrals, recommendations, offers, and follow-through.
      </p>

      <h2>Why TriHola exists</h2>
      <p>
        Many meaningful business opportunities begin informally — a message, an
        introduction, a recommendation, or a referral. But once conversations
        move across different channels, context is often lost.
      </p>

      <p>
        TriHola brings that context back into one shared thread, helping people
        and businesses coordinate engagement without losing the human
        relationship behind it.
      </p>

      <h2>What TriHola helps with</h2>
      <ul>
        <li>Starting and managing conversations</li>
        <li>Creating and forwarding referrals</li>
        <li>Sharing recommendations</li>
        <li>Managing business profiles</li>
        <li>Assigning offers</li>
        <li>Coordinating orders and follow-ups</li>
        <li>Organizing trusted contacts and groups</li>
      </ul>

      <h2>Our approach</h2>
      <p>
        TriHola is not designed to replace human relationships with automation.
        It is designed to give those relationships structure, memory, and
        continuity.
      </p>

      <p>
        We believe business engagement should feel personal, contextual, and
        trustworthy — not scattered, transactional, or spam-driven.
      </p>

      <h2>Company</h2>
      <p>
        TriHola is operated by Trihola Softwares Private Limited, based in
        Bengaluru, Karnataka, India.
      </p>

      <h2>Leadership</h2>

      <p>
        TriHola was founded by professionals with backgrounds in technology,
        business, entrepreneurship, and relationship-driven growth.
      </p>

      <p>
        The platform was created from the belief that trust, referrals, and
        engagement are among the most valuable assets for individuals and
        businesses, yet are often fragmented across disconnected tools.
      </p>

      <div
        style={{
          marginTop: 16,
          paddingLeft: 16,
          borderLeft: "3px solid #e5e7eb",
        }}
      >
        <p style={{ marginBottom: 12 }}>
          <strong>Sameer Sarma</strong>
          <br />
          Founder &amp; CEO
        </p>

        <p style={{ marginBottom: 0 }}>
          <strong>Dr Soma Datta</strong>
          <br />
          Co-Founder
        </p>
      </div>

      <h2>Contact</h2>
      <p>
        For questions, feedback, or business enquiries, contact us at:
      </p>
      <p>
        <strong>founders@trihola.com</strong>
      </p>
    </main>
   </div>
  );
}