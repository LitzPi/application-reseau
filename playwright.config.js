// Tests de bout en bout : moteur WebKit, gabarit d'iPhone.
// Limite connue : WebKit sous Playwright n'est pas Safari iOS. Le partage de fichiers,
// le mode installé et le clavier ne se vérifient que sur l'iPhone (docs/recette-iphone.md).
import { defineConfig, devices } from "@playwright/test";

const PORT = 5174;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    serviceWorkers: "allow",
  },
  projects: [{ name: "webkit-iphone", use: { ...devices["iPhone 15"] } }],
  webServer: {
    command: `node outils/serveur-dev.js ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
  },
});
