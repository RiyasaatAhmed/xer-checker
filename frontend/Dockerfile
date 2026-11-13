# The frontend: the React app, built once, then served by nginx.
# nginx also passes /api to the backend, so the browser sees one site.

# Step 1: build the app. The same Node and npm as package-lock.json was made with,
# or npm ci finds the lock file out of date.
FROM node:24.12.0-alpine AS build
WORKDIR /app
# Install the packages first, so a code change doesn't reinstall them
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# Step 2: serve the built files
FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
