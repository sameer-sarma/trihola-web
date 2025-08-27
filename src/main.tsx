import React from "react";
import ReactDOM from "react-dom/client";
import "./css/index.css";
import { ReferralsProvider } from "./context/ReferralsContext";
import App from "./App"; // extension optional

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ReferralsProvider>
      <App />
    </ReferralsProvider>
  </React.StrictMode>
);
