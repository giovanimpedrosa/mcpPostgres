import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import cors from 'cors';
import pg from 'pg';
import { z } from 'zod';

const app = express();
app.use(cors());

// Variável para armazenar o transporte ativo.
// Nota: Em um ambiente multi-usuário real, isso deveria ser um Map<sessionId, transport>
let transport;

// Conexão com o Postgres
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Teste de conexão
pool.connect()
  .then(() => console.log('✅ Conectado ao PostgreSQL com sucesso'))
  .catch(err => console.error('❌ Erro ao conectar no PostgreSQL:', err));

const server = new McpServer({
  name: "Postgres MCP",
  version: "1.0.0"
});

// --- FERRAMENTAS (Mantive as mesmas) ---

server.tool(
  "list_tables",
  {},
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
      return { isError: true, content: [{ type: "text", text: `Erro: ${error.message}` }] };
    }
  }
);

server.tool(
  "query_database",
  {
    sql: z.string().describe("A query SQL completa para executar.")
  },
  async ({ sql }) => {
    // Bloqueio de segurança simples
    if (/drop|truncate|alter/i.test(sql)) {
       return { isError: true, content: [{ type: "text", text: "Comandos DDL não permitidos." }] };
    }
    try {
      const result = await pool.query(sql);
      return {
        content: [{ type: "text", text: JSON.stringify(result.rows, null, 2) }]
      };
    } catch (error) {
      return { isError: true, content: [{ type: "text", text: `Erro SQL: ${error.message}` }] };
    }
  }
);

// --- CORREÇÃO AQUI ---

// 1. Endpoint que inicia a conexão (GET)
app.get('/sse', async (req, res) => {
  console.log("Nova conexão SSE estabelecida");
  
  // Criamos o transporte e salvamos na variável global
  transport = new SSEServerTransport('/messages', res);
  await server.connect(transport);
});

// 2. Endpoint que recebe as mensagens (POST)
app.post('/messages', async (req, res) => {
  if (!transport) {
    res.status(500).send("Conexão SSE não inicializada");
    return;
  }
  
  // O transporte trata a mensagem, não o server diretamente
  await transport.handlePostMessage(req, res);
});

// Usa a porta do ambiente ou 3000 (Se você configurou 3333 no env, ele usará 3333)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 MCP Postgres Server rodando na porta ${PORT}`);
});