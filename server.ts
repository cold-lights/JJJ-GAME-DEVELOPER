import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // 1. Direct Access to CCGame.html if it exists
  app.get("/CCGame.html", (req, res) => {
    const filePath = path.join(process.cwd(), "CCGame.html");
    if (fs.existsSync(filePath)) {
      res.sendFile(filePath);
    } else {
      res.status(404).send("Game file not found. Please run assembly.");
    }
  });

  // 2. Direct Download Route
  app.get("/download", (req, res) => {
    const filePath = path.join(process.cwd(), "CCGame.html");
    if (fs.existsSync(filePath)) {
      res.setHeader("Content-Disposition", "attachment; filename=CCGame.html");
      res.setHeader("Content-Type", "text/html");
      res.sendFile(filePath);
    } else {
      res.status(404).send("Bundle not found.");
    }
  });

  // 3. Vite Middleware for standard development (Restore Original Behavior)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
