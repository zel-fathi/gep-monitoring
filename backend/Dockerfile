FROM node:22-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies and generate package-lock.json
RUN npm install --omit=dev && npm cache clean --force

# Copy source code
COPY src/ ./src/

EXPOSE 8000

CMD ["node", "src/server.js"]
