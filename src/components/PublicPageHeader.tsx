// src/components/PublicPageHeader.tsx

import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

export default function PublicPageHeader() {
  return (
    <header>
      <div className="container nav">
        <Link to="/" className="brand">
          <img
            src={logo}
            alt="Trihola"
            className="brand-logo"
          />
          <span>Trihola</span>
        </Link>

        <nav>
          <Link
            to="/register"
            className="btn btn-primary"
          >
            Get Started
          </Link>
        </nav>
      </div>
    </header>
  );
}