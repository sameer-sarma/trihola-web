import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThreadStoreProvider } from "./context/ThreadStoreContext";
import "./css/base.css";
import "./css/layout.css";
import "./css/components.css";
import "./css/auth.css";
import "./css/landing.css";
import "./css/form.css";
import App from "./App"; // extension optional

const qc = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      staleTime: 30_000,
    },
    mutations: { retry: 0 },
  },
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={qc}>
      <ThreadStoreProvider>
      <App />
      </ThreadStoreProvider>
    </QueryClientProvider>
  </React.StrictMode>
);