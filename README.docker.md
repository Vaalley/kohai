# Docker Setup for Kohai

This document explains how to run the Kohai application using Docker. The setup includes both the Deno application and
MongoDB in separate containers.

## Prerequisites

- Docker installed on your system
- Docker Compose installed on your system

## Production Setup

1. Clone the repository (if not already done)
2. Navigate to the project root directory
3. Run the following command to start both services:

```bash
docker compose up --build -d
```

This will:

- Build the Deno application container
- Start the MongoDB container
- Start the Kohai application container
- Map the necessary ports

## Development Setup (Recommended for Development)

For development, we provide a separate docker-compose file that enables hot reloading and volume mapping:

```bash
docker compose -f docker-compose.dev.yml up -d
```

This setup provides:

- Volume mapping: Code changes on your host are immediately reflected in the container
- Hot reloading: The application automatically restarts when code changes are detected
- No need to rebuild the container for each code change

## Accessing the Application

Once the containers are running, you can access:

- Kohai API: http://localhost:2501
- Health check endpoint: http://localhost:2501/health
- MongoDB: mongodb://localhost:27017

## Stopping the Services

To stop the production services, run:

```bash
docker compose down
```

To stop the development services, run:

```bash
docker compose -f docker-compose.dev.yml down
```

To stop the services and remove the volumes (including database data), add the `-v` flag:

```bash
docker compose down -v
# or
docker compose -f docker-compose.dev.yml down -v
```

## Viewing Logs

To view the logs of the production Kohai application:

```bash
docker logs kohai-app
```

To view the logs of the development Kohai application:

```bash
docker logs kohai-app-dev
```

To view the logs of MongoDB:

```bash
docker logs kohai-mongodb
# or for development
docker logs kohai-mongodb-dev
```

## Environment Variables

The Docker setup uses the following environment variables which can be configured in your `.env` file:

- `PORT`: The port the application runs on (default: 2501)
- `HOSTNAME`: The hostname the application binds to (default: 0.0.0.0)
- `MONGODB_URI`: The MongoDB connection string (default: mongodb://root:admin@mongodb:27017/kohai-db?authSource=admin)

Other environment variables required by the application (API keys, JWT secrets, etc.) should also be set in the `.env`
file.

## Development Workflow

With the development setup (`docker-compose.dev.yml`), you can:

1. Make code changes in your editor
2. See the changes immediately reflected in the running container
3. The application will automatically restart thanks to Deno's `--watch` flag

This eliminates the need to rebuild the container for each code change, significantly speeding up development.
