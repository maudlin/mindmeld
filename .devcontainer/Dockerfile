# Use an official Node.js runtime as a parent image
FROM node:18 AS builder

# Set the working directory
WORKDIR /workspace

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the application code
COPY . .

# Build the application (if applicable)
# RUN npm run build

# Use a smaller base image for the final image
FROM node:18-slim

WORKDIR /workspace

# Copy the node_modules from the builder stage
COPY --from=builder /workspace /workspace

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]
