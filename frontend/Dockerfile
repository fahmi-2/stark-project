# Use Node.js alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all files (including .env)
COPY . .

# Accept build argument for API URL
ARG REACT_APP_API_URL
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Expose port 3000
EXPOSE 3000

# Start the development server
CMD ["npm", "start"]
