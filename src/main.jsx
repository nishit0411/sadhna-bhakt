import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import "./index.css";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import { LanguageProvider } from "./i18n/LanguageContext";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <HashRouter>
      <LanguageProvider>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </LanguageProvider>
    </HashRouter>
  </StrictMode>
);
