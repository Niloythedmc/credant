FROM node:18

# Create app directory
WORKDIR /app

# Install app dependencies
# Only copy package.json to avoid lockfile issues
COPY package.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Bundle app source
COPY . .

# Expose the port the app runs on
ENV PORT=8080
EXPOSE 8080

CMD [ "node", "server.js" ]
