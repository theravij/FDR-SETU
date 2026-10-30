import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Shell } from "./components/Shell";
import { DemoProvider } from "./state/store";
import "./index.css";

const root = document.getElementById("root");
if (!root) throw new Error("Root element missing");

createRoot(root).render(
  <StrictMode>
    <DemoProvider>
      <Shell />
    </DemoProvider>
  </StrictMode>,
);
