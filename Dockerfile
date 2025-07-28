# Use the official Deno image as the base image
FROM denoland/deno:2.4.2

# Set the working directory inside the container
WORKDIR /app

# Copy the project files
COPY . .

# Cache the dependencies
RUN deno cache main.ts

# Expose the port the app runs on
EXPOSE 2501

# Start the application
CMD ["deno", "run", "-A", "main.ts"]
