# Step 1: Build Angular app
FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install -g @angular/cli && npm install
COPY . .
RUN npm run build --configuration=production

# Step 2: Serve it with NGINX
FROM nginx:alpine

# Clean the default nginx content
RUN rm -rf /usr/share/nginx/html/*

# Create assets directory
RUN mkdir -p /usr/share/nginx/html/assets

# Copy built Angular app (copy contents of browser directory)
COPY --from=builder /app/dist/building-ui/browser/* /usr/share/nginx/html/

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy env template and replace API_URL at build time
COPY src/assets/env.template.js /tmp/env.template.js
ARG API_URL
RUN cat /tmp/env.template.js | sed "s|\$API_URL|${API_URL}|g" > /usr/share/nginx/html/assets/env.js && \
    chmod 644 /usr/share/nginx/html/assets/env.js && \
    rm /tmp/env.template.js

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
