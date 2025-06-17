# Step 1: Build Angular app
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install -g @angular/cli && npm install
COPY . .
RUN npm run build --configuration=production

# Step 2: Serve it with NGINX
FROM nginx:alpine

# Install envsubst
RUN apk add --no-cache gettext

# Clean the default nginx content and create assets directory
RUN rm -rf /usr/share/nginx/html/* && \
    mkdir -p /usr/share/nginx/html/assets

# Copy built Angular app (copy contents of browser directory)
COPY --from=builder /app/dist/building-ui/browser/* /usr/share/nginx/html/

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy env template
COPY src/assets/env.template.js /usr/share/nginx/html/assets/env.template.js

# Copy and set permissions for entrypoint script
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

EXPOSE 80

ENTRYPOINT ["/docker-entrypoint.sh"]
