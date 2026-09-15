import pg from "pg";

const { Pool } = pg;

/**
 * Connection pool para Aurora PostgreSQL
 * Configurado via variáveis de ambiente (injetadas pelo CloudFormation)
 */
export const pool = new Pool({
  host: process.env.AURORA_HOST || "localhost",
  port: parseInt(process.env.AURORA_PORT || "5432"),
  database: process.env.AURORA_DATABASE || "kirolojadb",
  user: process.env.AURORA_USER || "catalogo",
  password: process.env.AURORA_PASSWORD || "",
  max: 10, // máximo de conexões simultâneas
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on("error", (err) => {
  console.error("Erro inesperado no pool do Aurora:", err);
});

export async function query(text: string, params?: any[]) {
  return pool.query(text, params);
}

export async function getClient() {
  return pool.connect();
}
