import { createClient } from "redis";

/**
 * Client do Valkey (ElastiCache)
 * Usado para cache de produtos, sessão e rate-limit
 * Conecta via variáveis de ambiente
 */
const redisClient = createClient({
  socket: {
    host: process.env.VALKEY_HOST || "localhost",
    port: parseInt(process.env.VALKEY_PORT || "6379"),
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        console.error("Máximo de tentativas de reconexão ao Valkey atingido");
        return new Error("Máximo de retries Valkey");
      }
      return retries * 50;
    },
  },
});

redisClient.on("error", (err) => {
  console.error("Erro do Valkey:", err);
});

redisClient.on("connect", () => {
  console.log("✓ Conectado ao Valkey");
});

// Conectar ao iniciar
await redisClient.connect().catch((err) => {
  console.warn("Aviso: Valkey não disponível no boot (cache desligado):", err);
});

/**
 * Get de cache
 */
export async function getCache(key: string): Promise<string | null> {
  try {
    return await redisClient.get(key);
  } catch (error) {
    console.error(`Erro ao ler cache ${key}:`, error);
    return null;
  }
}

/**
 * Set de cache com TTL
 */
export async function setCache(
  key: string,
  value: string,
  ttlSeconds: number = 3600
): Promise<void> {
  try {
    await redisClient.setEx(key, ttlSeconds, value);
  } catch (error) {
    console.error(`Erro ao escrever cache ${key}:`, error);
  }
}

/**
 * Delete de cache
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    await redisClient.del(key);
  } catch (error) {
    console.error(`Erro ao deletar cache ${key}:`, error);
  }
}

export default redisClient;
