FROM node:20-slim

# Install wget and tzdata using apt-get (Debian)
RUN apt-get update && \
    apt-get install -y wget tzdata && \
    rm -rf /var/lib/apt/lists/*

ENV TZ=Asia/Kolkata

WORKDIR /app

COPY package*.json ./

# Use npm install instead of npm ci
RUN npm install --production --legacy-peer-deps && \
    npm cache clean --force

COPY . .

EXPOSE 8000

CMD ["npm", "start"]
