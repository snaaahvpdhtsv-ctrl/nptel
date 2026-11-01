import React from "react"
import ReactDOM from "react-dom/client"
import App from "./App"
import "./index.css"
import { startOfflineSupport } from "./lib/offline"

// Apply the saved theme before first paint to avoid a light flash (dark is the default).
document.documentElement.classList.toggle(
  "dark",
  localStorage.getItem("nptel-theme") !== "light",
)
document.documentElement.lang = "en"
document.title = "NPTEL Practice Platform"
startOfflineSupport()

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
