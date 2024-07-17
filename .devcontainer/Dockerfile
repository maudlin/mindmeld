# Stage 1: Build React App

# Use an official Node.js runtime as a parent image
FROM node:18

# Set the working directory
WORKDIR /workspace

# Install dependencies
COPY package*.json ./
RUN npm install

# Install ESLint and Prettier globally (optional)
RUN npm install -g eslint prettier

# Copy the rest of the application code
COPY . .

# Expose the port the app runs on
EXPOSE 3000

# Command to run the application
CMD ["npm", "start"]