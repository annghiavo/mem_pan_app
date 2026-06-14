FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG EXPO_PUBLIC_API_URL
ENV EXPO_PUBLIC_API_URL=${EXPO_PUBLIC_API_URL}

RUN npm run vercel-build

FROM nginx:1.27-alpine

COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
