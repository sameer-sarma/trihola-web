import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
//import "./css/index.css";
import "./css/ui-forms.css";
import { ReferralsProvider } from "./context/ReferralsContext";
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
    <ReferralsProvider>
      <App />
    </ReferralsProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
