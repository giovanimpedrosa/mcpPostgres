import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import cors from 'cors';
import pg from 'pg';
import { z } from 'zod';

const app = express();
app.use(cors());

// Variável para armazenar o transporte (Correção para o erro de escopo)
let transport;

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

pool.connect()
  .then(() => console.log('✅ Conectado ao PostgreSQL com sucesso'))
  .catch(err => console.error('❌ Erro ao conectar no PostgreSQL:', err));

const server = new McpServer({
  name: "Postgres MCP",
  version: "1.0.0"
});

// --- FERRAMENTAS ---
server.tool(
  "list_tables",
  {},
  async () => {
    try {
      const result = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
      const tables = result.rows.map(r => r.table_name).join(", ");
      return { content: [{ type: "text", text: `Tabelas: ${tables}` }] };
    } catch (error) {
      return { isError: true, content: [{ type: "text", text: `Erro: ${error.message}` }] };
    }
  }
);

server.tool(
  "query_database",
  { sql: z.string().describe("Query SQL") },
  async ({ sql }) => {
    if (/drop|truncate|alter/i.test(sql)) return { isError: true, content: [{ type: "text", text: "Proibido." }] };
    try {
      const result = await pool.query(sql);
      return { content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }] };
    } catch (error) {
      return { isError: true, content: [{ type: "text", text: `Erro SQL: ${error.message}` }] };
    }
  }
);

// --- ROTAS CORRIGIDAS (O Segredo para resolver o erro) ---

app.get('/sse', async (req, res) => {
  console.log("Nova conexão SSE estabelecida");
  // Cria o transporte e conecta ao servidor
  transport = new SSEServerTransport('/messages', res);
  await server.connect(transport);
});

app.post('/messages', async (req, res) => {
  if (!transport) {
    res.status(500).send("Conexão SSE não iniciada");
    return;
  }
  // AQUI ESTAVA O ERRO: Mudamos de server.processMessage para transport.handlePostMessage
  await transport.handlePostMessage(req, res);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 MCP Postgres Server rodando na porta ${PORT}`);
});