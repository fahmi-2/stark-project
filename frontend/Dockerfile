# Use Node.js alpine image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Accept build argument for API URL with default fallback
ARG REACT_APP_API_URL=https://stark-backend.legain.id

# Set environment variable BEFORE building - this bakes it into the bundle
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

# Copy all files
COPY . .

# Build the production bundle (environment variables get baked in here)
RUN npm run build

# Install serve to run the production build
RUN npm install -g serve

# Expose port 3000
EXPOSE 3000

# Serve the production build
CMD ["serve", "-s", "build", "-l", "3000"]
