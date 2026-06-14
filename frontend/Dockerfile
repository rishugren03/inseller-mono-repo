# ── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Install dependencies first (layer-cached when package files don't change)
COPY package.json package-lock.json ./
RUN npm ci

# Accept build-args from Cloud Build / docker build --build-arg
ARG VITE_API_BASE_URL=https://inseller-apii-1005500705645.europe-west1.run.app
ARG VITE_FIREBASE_API_KEY=AIzaSyD7X58imbqc8r_z_RUHUCWzw6-_yHJ9B40
ARG VITE_FIREBASE_AUTH_DOMAIN=insellerdotin.firebaseapp.com
ARG VITE_FIREBASE_PROJECT_ID=insellerdotin
ARG VITE_FIREBASE_STORAGE_BUCKET=insellerdotin.appspot.com
ARG VITE_FIREBASE_MESSAGING_SENDER_ID=1005500705645
ARG VITE_FIREBASE_APP_ID=1:1005500705645:web:c826a19961f6410c790864

# Promote ARGs to ENVs so Vite picks them up during `npm run build`
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_FIREBASE_API_KEY=$VITE_FIREBASE_API_KEY
ENV VITE_FIREBASE_AUTH_DOMAIN=$VITE_FIREBASE_AUTH_DOMAIN
ENV VITE_FIREBASE_PROJECT_ID=$VITE_FIREBASE_PROJECT_ID
ENV VITE_FIREBASE_STORAGE_BUCKET=$VITE_FIREBASE_STORAGE_BUCKET
ENV VITE_FIREBASE_MESSAGING_SENDER_ID=$VITE_FIREBASE_MESSAGING_SENDER_ID
ENV VITE_FIREBASE_APP_ID=$VITE_FIREBASE_APP_ID

# Delete any .env files so they don't interfere with build-arg/ENV values
# (Vite's .env.production would override ENV vars otherwise)
COPY . .
RUN rm -f .env .env.* 

# Debug: verify API key is set (shows first 10 chars only)
RUN echo "VITE_FIREBASE_API_KEY starts with: ${VITE_FIREBASE_API_KEY:0:10}..."

RUN npm run build

# ── Stage 2: Serve ──────────────────────────────────────────────────────────
FROM nginx:stable-alpine AS runner

# Install envsubst (part of gettext) to substitute $PORT at runtime
RUN apk add --no-cache gettext

# Remove default nginx static assets
RUN rm -rf /usr/share/nginx/html/*

# Copy built assets from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# nginx config template — uses $PORT injected by Cloud Run (default: 8080)
RUN printf 'server {\n\
    listen ${PORT};\n\
    server_name _;\n\
    root /usr/share/nginx/html;\n\
    index index.html;\n\
\n\
    location / {\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
\n\
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2?)$ {\n\
        expires 1y;\n\
        add_header Cache-Control "public, immutable";\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf.template

EXPOSE 8080

# Substitute $PORT into the nginx config at container startup, then launch nginx
CMD ["/bin/sh", "-c", "export PORT=${PORT:-8080} && envsubst '${PORT}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]
