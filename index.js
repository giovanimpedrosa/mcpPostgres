import express from 'express';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import cors from 'cors';

// Configuração do Servidor MCP
const server = new McpServer({
  name: "My Coolify MCP",
  version: "1.0.0"
});

// --- AQUI VOCÊ ADICIONA AS FERRAMENTAS ---
// Exemplo simples: Uma ferramenta de "Echo" para teste
server.tool(
  "echo_tool",
  { message: { type: "string" } }, // Schema do argumento
  async ({ message }) => {
    return { content: [{ type: "text", text: `Echo: ${message}` }] };
  }
);
// -----------------------------------------

const app = express();
app.use(cors());

// Endpoint para o OpenWebUI iniciar a conexão SSE
app.get('/sse', async (req, res) => {
  console.log("Nova conexão SSE recebida");
  const transport = new SSEServerTransport('/messages', res);
  await server.connect(transport);
});

// Endpoint para o OpenWebUI enviar mensagens (POST)
app.post('/messages', async (req, res) => {
  // O transport SSE lida com as mensagens recebidas
  // Nota: Em implementações reais complexas, você precisa gerenciar 
  // o roteamento da mensagem para o transport correto.
  // O SDK facilita isso, mas para este exemplo simples, 
  // o Open WebUI costuma gerenciar a sessão via SSE.
  await server.processMessage(req, res); 
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`MCP Server rodando via SSE na porta ${PORT}`);
});