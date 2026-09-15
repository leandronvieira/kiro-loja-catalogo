import { Router, Request, Response } from "express";
import { getProducts, getProductById } from "../services/catalogo-service.js";

const router = Router();

/**
 * GET /api/catalogo/listar
 * Lista todos os produtos do catálogo com paginação
 */
router.get("/listar", async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const products = await getProducts(limit, offset);
    res.json({
      products,
      pagination: {
        page,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("Erro ao listar produtos:", error);
    res.status(500).json({ error: "erro ao listar produtos" });
  }
});

/**
 * GET /api/catalogo/:id
 * Retorna um produto específico com preço
 */
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await getProductById(id);

    if (!product) {
      res.status(404).json({ error: "produto não encontrado" });
      return;
    }

    res.json(product);
  } catch (error) {
    console.error("Erro ao buscar produto:", error);
    res.status(500).json({ error: "erro ao buscar produto" });
  }
});

export default router;
