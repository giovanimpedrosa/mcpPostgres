import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import cors from 'cors';
import pg from 'pg';
import { z } from 'zod';

// Configuração do Servidor Web
const app = express();
app.use(cors());

// Conexão com o Postgres
// O Coolify deve injetar a variável DATABASE_URL
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Teste de conexão ao iniciar
pool.connect()
  .then(() => console.log('✅ Conectado ao PostgreSQL com sucesso'))
  .catch(err => console.error('❌ Erro ao conectar no PostgreSQL:', err));

// Configuração do Servidor MCP
const server = new McpServer({
  name: "Postgres MCP via Coolify",
  version: "1.0.0"
});

// --- FERRAMENTA 1: Listar Tabelas (Schema) ---
// Ajuda a IA a entender a estrutura do banco
server.tool(
  "list_tables",
  {}, // Sem argumentos
  async () => {
    try {
      const result = await pool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `);
      const tables = result.rows.map(r => r.table_name).join(", ");
      return {
        content: [{ type: "text", text: `Tabelas encontradas: ${tables}` }]
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text", text: `Erro ao listar tabelas: ${error.message}` }]
      };
    }
  }
);

// --- FERRAMENTA 2: Executar Query SQL ---
// Permite que a IA faça perguntas ao banco
server.tool(
  "query_database",
  {
    sql: z.string().describe("A query SQL completa para executar. Ex: SELECT * FROM users LIMIT 5")
  },
  async ({ sql }) => {
    // Bloqueio de segurança simples para evitar comandos muito destrutivos
    // Remova se quiser controle total
    if (/drop|truncate|alter/i.test(sql)) {
       return {
         isError: true,
         content: [{ type: "text", text: "Comandos DDL (DROP, TRUNCATE) não são permitidos por segurança." }]
       };
    }

    try {
      const result = await pool.query(sql);
      return {
        content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }]
      };
    } catch (error) {
      return {
        isError: true,
        content: [{ type: "text", text: `Erro na Query: ${error.message}` }]
      };
    }
  }
);

// --- ENDPOINTS SSE (Para o Open WebUI) ---

// Endpoint para iniciar a conexão
app.get('/sse', async (req, res) => {
  console.log("Nova conexão SSE do Open WebUI");
  const transport = new SSEServerTransport('/messages', res);
  await server.connect(transport);
});

// Endpoint para receber as mensagens
app.post('/messages', async (req, res) => {
  await server.processMessage(req, res);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 MCP Postgres Server rodando na porta ${PORT}`);
});