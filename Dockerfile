FROM node:20-alpine

WORKDIR /app

# Copia e instala dependências
COPY package.json .
RUN npm install

# Copia o código fonte
COPY index.js .

# Expõe a porta que definiremos no script
EXPOSE 3000

CMD ["npm", "start"]