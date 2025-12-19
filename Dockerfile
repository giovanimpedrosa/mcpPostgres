FROM node:20-alpine

WORKDIR /app

# Instala dependências
COPY package.json .
RUN npm install

# Copia o código
COPY index.js .

# Expõe a porta
EXPOSE 3333

# Variável de ambiente padrão (pode ser sobrescrita no Coolify)
ENV PORT=3333

CMD ["npm", "start"]