FROM node:22-alpine

WORKDIR /app

# Install yarn via npm (avoids Corepack fetching yarn from registry.yarnpkg.com).
# --force overwrites the Corepack yarn shim already present in node:alpine.
RUN npm install -g yarn@1.22.22 --force

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["yarn", "dev", "--hostname", "0.0.0.0", "--port", "3000"]
