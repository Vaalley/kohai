<div align="center">
  <h1>Kohai - REST API Backend</h1>
  <p>A high-performance backend service for the Kohai gaming platform, built with Deno and Hono</p>

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)

</div>

## 🎮 About

Kohai is a web application that enables users to associate descriptive words with video games, creating a crowdsourced tagging system. This backend service
provides a robust API for the Kohai platform, handling user authentication, game data management, and tag operations.

## ✨ Features

- **RESTful API** endpoints for all platform functionality
- JWT-based authentication system
- MongoDB integration for data persistence
- Input validation with Valibot
- Environment-based configuration
- Health check endpoints
- Rate limiting and security best practices

## 🚀 Technologies Used

- [Deno](https://deno.com/) - Modern runtime for JavaScript and TypeScript
- [Hono](https://hono.dev/) - Fast & lightweight web framework
- [MongoDB](https://www.mongodb.com/) - NoSQL database
- [Valibot](https://valibot.dev/) - Schema validation
- [Docker](https://www.docker.com/) - Containerization

## 🏗️ Project Structure

```
src/
├── api/           # API route handlers
├── config/        # Configuration and environment setup
├── models/        # Database models and schemas
├── services/      # Business logic and external service integrations
├── tests/         # Test suites
└── utils/         # Utility functions and helpers
```

## 🚀 Getting Started

### Prerequisites

- [Deno](https://deno.com/) (v2.x)
- [Docker](https://www.docker.com/) (for MongoDB)
- [Docker Compose](https://docs.docker.com/compose/) (for local development)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Vaalley/kohai.git
   cd kohai
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start MongoDB**
   ```bash
   docker compose up -d
   ```

4. **Run the development server**
   ```bash
   deno task dev
   ```

The API will be available at `http://localhost:2501` by default.

## 📜 Available Scripts

- `deno task dev` - Start development server with hot reload
- `deno task tidy` - Run linter, formatter
- `deno task test` - Run tests

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📬 Contact

- GitHub: [@Vaalley](https://github.com/Vaalley)
- Project Link: [https://github.com/Vaalley/kohai](https://github.com/Vaalley/kohai)

## 🌟 Acknowledgments

- Built with ❤️ using [Deno](https://deno.com/)
- Server framework [Hono](https://hono.dev/)
- Database [MongoDB](https://www.mongodb.com/)
- Input validation [Valibot](https://valibot.dev/)
- Containerization [Docker](https://www.docker.com/)
- Game data integration with [IGDB](https://api-docs.igdb.com/)

---

<div align="center">
  Made with &hearts; by the Kohai Team
</div>
