# Use Node.js alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Accept build argument for API URL
ARG REACT_APP_API_URL=http://localhost:801

# Copy all files (including .env)
COPY . .

# Set environment variable for runtime
ENV REACT_APP_API_URL=$REACT_APP_API_URL

# Expose port 3000
EXPOSE 3000

# Start the development server
CMD ["npm", "start"]
