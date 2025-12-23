FROM node:24.11.1-alpine3.22

WORKDIR /app

COPY package* ./

RUN npm install

COPY . .

EXPOSE 5000

CMD ["node", "index.js"]