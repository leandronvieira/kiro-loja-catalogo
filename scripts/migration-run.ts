/**
 * Script de execução de migrations
 * Executado no pipeline CodeBuild in-VPC (tem acesso ao Aurora privado)
 * 
 * Uso: npm run migration:run
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getClient } from "../src/db/pool.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, "../src/db/migrations");

async function runMigrations() {
  const client = await getClient();

  try {
    console.log("🔧 Iniciando migrations...");

    // Criar tabela de histórico de migrations se não existir
    await client.query(`
      CREATE TABLE IF NOT EXISTS catalogo._migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Listar e executar migrations
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      // Verificar se já foi executada
      const result = await client.query(
        "SELECT * FROM catalogo._migrations WHERE name = $1",
        [file]
      );

      if (result.rows.length > 0) {
        console.log(`⏭️  ${file} (já executada)`);
        continue;
      }

      // Executar migration
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf-8");
      await client.query(sql);
      console.log(`✓ ${file}`);

      // Registrar no histórico
      await client.query("INSERT INTO catalogo._migrations (name) VALUES ($1)", [
        file,
      ]);
    }

    console.log("✓ Migrations completas");
  } catch (error) {
    console.error("❌ Erro em migration:", error);
    process.exit(1);
  } finally {
    await client.release();
  }
}

runMigrations();
