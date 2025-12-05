FROM node:22-alpine AS build
WORKDIR /app
COPY src ./src

FROM nginx:1.27-alpine AS runtime

COPY src /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
