import express, { Express } from "express";
import catalogoRouter from "./routes/catalogo.js";

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Rotas
app.use("/api/catalogo", catalogoRouter);

// 404
app.use((req, res) => {
  res.status(404).json({ error: "rota não encontrada" });
});

// Error handling
app.use(
  (
    err: any,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error("Erro:", err);
    res.status(500).json({
      error: "erro interno do servidor",
      message: process.env.NODE_ENV === "development" ? err.message : undefined,
    });
  }
);

app.listen(PORT, () => {
  console.log(`🚀 Catálogo rodando na porta ${PORT}`);
  console.log(`   http://localhost:${PORT}/health`);
});
