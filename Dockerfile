# Stage 1: Use the official Node.js 18 Alpine image as a base
# Alpine Linux is very lightweight, which makes our final image smaller.
FROM node:18-alpine

# Install Redis server using the Alpine package manager (apk)
RUN apk add --no-cache redis

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json first to leverage Docker's layer caching.
# This step will only be re-run if these files change.
COPY package*.json ./

# Install only production dependencies to keep the image size down
RUN npm install --only=production

# Copy the rest of your application's code into the container
COPY . .

# Copy the entrypoint script that will start our services
COPY entrypoint.sh /entrypoint.sh

# Make the entrypoint script executable
RUN chmod +x /entrypoint.sh

# Expose the port your Node.js application runs on
EXPOSE 5001

# Define the entrypoint for the container. This script will be executed when the container starts.
ENTRYPOINT ["/entrypoint.sh"]