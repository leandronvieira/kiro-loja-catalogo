import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";
import express from "express";
import catalogoRouter from "./catalogo.js";
import * as catalogoService from "../services/catalogo-service.js";

vi.mock("../services/catalogo-service.js");

const app = express();
app.use(express.json());
app.use("/api/catalogo", catalogoRouter);

const mockProduct = {
  id: "550e8400-e29b-41d4-a716-446655440001",
  titulo: "Clean Code",
  autor: "Robert C. Martin",
  preco: 29.99,
  capa_url: "https://example.com/cover.jpg",
  categoria: "programming",
  preview_url: "https://example.com/preview.pdf",
  criado_em: new Date("2025-01-01"),
  atualizado_em: new Date("2025-01-01"),
};

describe("GET /api/catalogo/listar", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve listar produtos com paginação", async () => {
    vi.mocked(catalogoService.getProducts).mockResolvedValue([mockProduct]);

    const response = await request(app)
      .get("/api/catalogo/listar")
      .query({ page: 1, limit: 10 });

    expect(response.status).toBe(200);
    expect(response.body.products).toHaveLength(1);
    expect(response.body.products[0].id).toBe(mockProduct.id);
    expect(response.body.pagination.page).toBe(1);
    expect(response.body.pagination.limit).toBe(10);
  });

  it("deve usar paginação default", async () => {
    vi.mocked(catalogoService.getProducts).mockResolvedValue([mockProduct]);

    const response = await request(app).get("/api/catalogo/listar");

    expect(response.status).toBe(200);
    expect(catalogoService.getProducts).toHaveBeenCalledWith(10, 0);
  });

  it("deve retornar 500 se getProducts falhar", async () => {
    vi.mocked(catalogoService.getProducts).mockRejectedValue(
      new Error("Database error")
    );

    const response = await request(app).get("/api/catalogo/listar");

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("erro ao listar produtos");
  });
});

describe("GET /api/catalogo/:id", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve retornar produto por ID", async () => {
    vi.mocked(catalogoService.getProductById).mockResolvedValue(mockProduct);

    const response = await request(app).get(
      `/api/catalogo/${mockProduct.id}`
    );

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(mockProduct.id);
    expect(response.body.titulo).toBe(mockProduct.titulo);
    expect(catalogoService.getProductById).toHaveBeenCalledWith(
      mockProduct.id
    );
  });

  it("deve retornar 404 se produto não encontrado", async () => {
    vi.mocked(catalogoService.getProductById).mockResolvedValue(null);

    const response = await request(app).get("/api/catalogo/nonexistent-id");

    expect(response.status).toBe(404);
    expect(response.body.error).toBe("produto não encontrado");
  });

  it("deve retornar 500 se getProductById falhar", async () => {
    vi.mocked(catalogoService.getProductById).mockRejectedValue(
      new Error("Database error")
    );

    const response = await request(app).get(`/api/catalogo/${mockProduct.id}`);

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("erro ao buscar produto");
  });
});
