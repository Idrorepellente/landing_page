FROM node:20-slim
WORKDIR /app
# OpenSSL: richiesto dall'engine Prisma su Debian slim
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*
# copio prima package.json E lo schema Prisma, cosi' il postinstall (prisma generate) trova lo schema
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm install
# poi il resto del codice + build (prisma generate + next build)
COPY . .
RUN npm run build
EXPOSE 3000
# all'avvio: crea le tabelle (idempotente) e parte
CMD ["sh", "-c", "npx prisma db push --skip-generate && node_modules/.bin/next start"]
