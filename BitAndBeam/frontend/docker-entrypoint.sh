#!/bin/sh

# Replace API_URL in env.js with runtime value
envsubst < /usr/share/nginx/html/assets/env.template.js > /usr/share/nginx/html/assets/env.js

# Start nginx
exec nginx -g 'daemon off;'
