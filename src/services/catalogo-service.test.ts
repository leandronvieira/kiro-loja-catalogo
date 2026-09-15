import { describe, it, expect, vi, beforeEach } from "vitest";
import { getProducts, getProductById } from "./catalogo-service.js";
import * as dbPool from "../db/pool.js";
import * as valkey from "../cache/valkey.js";
import { Product } from "../types/index.js";

// Mock do Aurora e Valkey
vi.mock("../db/pool.js");
vi.mock("../cache/valkey.js");

const mockProduct: Product = {
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

describe("getProducts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve retornar produtos do cache se disponível", async () => {
    // Cache hit
    vi.mocked(valkey.getCache).mockResolvedValue(
      JSON.stringify([mockProduct])
    );

    const result = await getProducts(10, 0);

    expect(result).toEqual([mockProduct]);
    expect(valkey.getCache).toHaveBeenCalledWith("catalog:products:10:0");
    expect(dbPool.query).not.toHaveBeenCalled(); // Aurora não deve ser consultado
  });

  it("deve consultar Aurora em caso de cache miss", async () => {
    // Cache miss
    vi.mocked(valkey.getCache).mockResolvedValue(null);
    vi.mocked(dbPool.query).mockResolvedValue({
      rows: [mockProduct],
    } as any);

    const result = await getProducts(10, 0);

    expect(result).toEqual([mockProduct]);
    expect(dbPool.query).toHaveBeenCalledWith(
      expect.stringContaining("ORDER BY criado_em DESC"),
      [10, 0]
    );
    expect(valkey.setCache).toHaveBeenCalledWith(
      "catalog:products:10:0",
      JSON.stringify([mockProduct]),
      3600
    );
  });

  it("deve retornar array vazio se nenhum produto encontrado", async () => {
    vi.mocked(valkey.getCache).mockResolvedValue(null);
    vi.mocked(dbPool.query).mockResolvedValue({
      rows: [],
    } as any);

    const result = await getProducts(10, 0);

    expect(result).toEqual([]);
  });

  it("deve lançar erro se Aurora falhar", async () => {
    vi.mocked(valkey.getCache).mockResolvedValue(null);
    vi.mocked(dbPool.query).mockRejectedValue(
      new Error("Aurora connection failed")
    );

    await expect(getProducts(10, 0)).rejects.toThrow("Aurora connection failed");
  });
});

describe("getProductById", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("deve retornar produto do cache se disponível", async () => {
    const productId = mockProduct.id;
    vi.mocked(valkey.getCache).mockResolvedValue(JSON.stringify(mockProduct));

    const result = await getProductById(productId);

    expect(result).toEqual(mockProduct);
    expect(valkey.getCache).toHaveBeenCalledWith(`catalog:product:${productId}`);
  });

  it("deve consultar Aurora em caso de cache miss", async () => {
    const productId = mockProduct.id;
    vi.mocked(valkey.getCache).mockResolvedValue(null);
    vi.mocked(dbPool.query).mockResolvedValue({
      rows: [mockProduct],
    } as any);

    const result = await getProductById(productId);

    expect(result).toEqual(mockProduct);
    expect(dbPool.query).toHaveBeenCalledWith(
      expect.stringContaining("WHERE id = $1"),
      [productId]
    );
    expect(valkey.setCache).toHaveBeenCalledWith(
      `catalog:product:${productId}`,
      JSON.stringify(mockProduct),
      3600
    );
  });

  it("deve retornar null se produto não encontrado", async () => {
    vi.mocked(valkey.getCache).mockResolvedValue(null);
    vi.mocked(dbPool.query).mockResolvedValue({
      rows: [],
    } as any);

    const result = await getProductById("nonexistent-id");

    expect(result).toBeNull();
  });

  it("deve lançar erro se Aurora falhar", async () => {
    vi.mocked(valkey.getCache).mockResolvedValue(null);
    vi.mocked(dbPool.query).mockRejectedValue(
      new Error("Aurora connection failed")
    );

    await expect(getProductById("some-id")).rejects.toThrow(
      "Aurora connection failed"
    );
  });
});
