import { query } from "../db/pool.js";
import { getCache, setCache } from "../cache/valkey.js";
import { Product } from "../types/index.js";

/**
 * GET todos os produtos com paginação
 * Tenta cache primeiro; se miss, consulta Aurora e cacheia resultado
 */
export async function getProducts(
  limit: number = 10,
  offset: number = 0
): Promise<Product[]> {
  const cacheKey = `catalog:products:${limit}:${offset}`;

  try {
    // Tenta cache
    const cached = await getCache(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn("Erro ao ler cache de produtos:", error);
  }

  try {
    // Query Aurora
    const result = await query(
      `
      SELECT id, titulo, autor, preco, capa_url, categoria, preview_url, criado_em, atualizado_em
      FROM catalogo.produtos
      ORDER BY criado_em DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    );

    const products = result.rows as Product[];

    // Cacheia resultado
    try {
      await setCache(cacheKey, JSON.stringify(products), 3600); // 1 hora
    } catch (error) {
      console.warn("Erro ao cachear produtos:", error);
    }

    return products;
  } catch (error) {
    console.error("Erro ao buscar produtos no Aurora:", error);
    throw error;
  }
}

/**
 * GET um produto pelo ID
 */
export async function getProductById(id: string): Promise<Product | null> {
  const cacheKey = `catalog:product:${id}`;

  try {
    // Tenta cache
    const cached = await getCache(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (error) {
    console.warn(`Erro ao ler cache do produto ${id}:`, error);
  }

  try {
    // Query Aurora
    const result = await query(
      `
      SELECT id, titulo, autor, preco, capa_url, categoria, preview_url, criado_em, atualizado_em
      FROM catalogo.produtos
      WHERE id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const product = result.rows[0] as Product;

    // Cacheia resultado
    try {
      await setCache(cacheKey, JSON.stringify(product), 3600); // 1 hora
    } catch (error) {
      console.warn(`Erro ao cachear produto ${id}:`, error);
    }

    return product;
  } catch (error) {
    console.error(`Erro ao buscar produto ${id} no Aurora:`, error);
    throw error;
  }
}

/**
 * Invalidar cache de um produto
 * (usado quando preço/descrição mudar)
 */
export async function invalidateProductCache(id: string): Promise<void> {
  try {
    await Promise.all([
      // Limpar cache do produto específico
      (async () => {
        // Delete (função não implementada acima; adicionar se precisar)
      })(),
      // Limpar cache da lista (todos os offsets)
      // Idealmente: pattern scan em `catalog:products:*` e delete (Redis 6.0+)
    ]);
  } catch (error) {
    console.warn(`Erro ao invalidar cache do produto ${id}:`, error);
  }
}
