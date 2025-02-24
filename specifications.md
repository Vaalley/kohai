# Project Specification: Kohai

## 1. Project Overview

Kohai is a web application that enables users to associate descriptive words
with movies and video games, creating a crowd-sourced tagging system. Users can
view aggregated popular tags for each piece of media, providing an organic,
community-driven description system.

## 2. Core Features

### A. User Management

- User registration and authentication system
- Personal profile management
- Viewing history of user contributions

### B. Media Integration

- Movie database integration using external API (recommended: TMDB API)
- Video game database integration using external API (recommended: IGDB API)
- Unified search interface for both movies and games

### C. Tagging System

- Users can add up to 3 descriptive words per media item
- Word validation system to ensure quality (no duplicates, profanity filter)
- Real-time aggregation of popular tags
- Visual representation of tag popularity

## 3. Technical Architecture

### A. Database (MongoDB)

- Initial deployment on MongoDB Atlas
- Designed for potential migration to self-hosted solution
- Collections structure:
- Users (see user.ts for schema)
- MediaTags (see mediaTag.ts for schema)
- UserContributions (see userContribution.ts for schema)

### B. Backend (Deno + Hono)

- RESTful API architecture
- Endpoints:
- Authentication (/auth/*)
- Media management (/media/*)
- Tag management (/tags/*)
- User management (/users/*)
- Rate limiting and caching system
- External API integration layer

### C. Frontend (SvelteKit + Native CSS)

- Atomic Design Structure:
- Atoms: buttons, inputs, tags, icons
- Molecules: search bars, tag groups, media cards
- Organisms: navigation, media details, tag submission forms
- Templates: layout structures
- Pages: complete views
- Responsive design system
- Client-side caching strategy

## 4. External API Integration

### A. Movie API Integration

- TMDB API implementation
- Required endpoints:
- Movie search
- Movie details
- Movie images

### B. Video Game API Integration

- IGDB API implementation
- Required endpoints:
- Game search
- Game details
- Game cover images

## 5. Security Considerations

- HTTPS enforcement
- API key security
- Input sanitization
- Rate limiting
- CORS policy
- Password hashing
- Session management

## 6. Performance Requirements

- Page load time < 2 seconds
- API response time < 500ms
- Support for concurrent users
- Efficient caching strategy
- Optimized database queries

## 7. Development Workflow

- Version control using Git
- 2 repositories: one for the backend, one for the frontend
- Feature branch workflow
- CI/CD pipeline (CodeQL from github)
- Code review process

## 8. Future Considerations

- Migration plan for self-hosted MongoDB
- Scalability strategy
- Caching system
- Backup and recovery procedures
- Analytics implementation (Posthog?)
