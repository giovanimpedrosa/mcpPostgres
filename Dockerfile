FROM node:20-alpine

WORKDIR /app

# Instala dependências
COPY package.json .
RUN npm install

# Copia o código
COPY index.js .

# Expõe a porta
EXPOSE 3000

# Variável de ambiente padrão (pode ser sobrescrita no Coolify)
ENV PORT=3000

CMD ["npm", "start"]