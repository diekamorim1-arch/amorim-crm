# Build a static production bundle, then serve it with nginx. No Node.js
# runtime ships in the final image — only the compiled dist/ output.

FROM node:22-alpine AS build
WORKDIR /app

# Vite le import.meta.env.VITE_* em tempo de build, nao de runtime — e
# .dockerignore exclui .env*, entao esses valores tem que vir como build arg
# (nenhum deles e segredo: URL do projeto Supabase, anon key publica por
# design, e a URL publica da API — ver revisao de seguranca pre-VPS).
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ARG VITE_API_BASE_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
