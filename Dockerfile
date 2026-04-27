FROM node:20-bookworm-slim

WORKDIR /app

# Dependencias basicas para ambiente Expo em container.
RUN apt-get update \
  && apt-get install -y --no-install-recommends git ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package.json ./

# Instala em build para acelerar o primeiro up.
RUN npm install --package-lock=false

COPY . .

ENV NODE_ENV=development
ENV EXPO_DEVTOOLS_LISTEN_ADDRESS=0.0.0.0
ENV CHOKIDAR_USEPOLLING=1

CMD ["npx", "expo", "start", "--lan", "--clear"]