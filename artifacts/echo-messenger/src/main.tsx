import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  navigator.serviceWorker
    .register("/sw.js", { scope: "/" })
    .then((reg) => console.log("SW registered", reg.scope))
    .catch((err) => console.warn("SW failed", err));
}
