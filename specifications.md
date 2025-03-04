# Project Specification: Kohai

## 1. Project Overview

Kohai is a web application that enables users to associate descriptive words
with video games, creating a crowdsourced tagging system. Users can view
aggregated popular tags for each piece of media, providing an organic,
community-driven description system.

## 2. Core Features

### A. User Management

- User registration and authentication system
- Personal profile management
- Viewing history of user contributions

### B. Media Integration

- Video game database integration using external API (recommended: IGDB API)
- Optional: Movie database integration using external API (recommended: OMDB API
  / TMDB API)
- Unified search interface for all media types

### C. Tagging System

- Users can add up to 3 descriptive words per media item
- Word validation system to ensure quality (no duplicates, profanity filter)
- Real-time aggregation of popular tags
- Visual representation of tag popularity when visiting a media item's page

Example flow:

1. When a user tags the game "Red Dead Redemption 2" with ["story", "action",
   "crime"]
   - A UserContribution record is created to track this specific user's tags
   - This enables viewing user's tagging history and enforcing the 3-tag limit
2. The system then updates the MediaTag record for "Red Dead Redemption 2"
   - If "story" was already used by 5 other users, its count increases to 6
   - The user's ID is added to the list of users who used each tag
   - This aggregated view powers the tag popularity visualization

## 3. Technical Architecture

### A. Database (MongoDB)

- Initial deployment on MongoDB Atlas
- Potential migration to self-hosted solution
- Collections structure:
  - Users (see user.ts for schema)
  - MediaTags (see mediaTag.ts for schema)
  - UserContributions (see userContribution.ts for schema)

Example collections state for "Red Dead Redemption 2" scenario:

```json
// users collection
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "username": "gamefan123",
  "email": "fan@example.com",
  "password": "<hashed_password>",
  "created_at": ISODate("2025-02-26T09:16:20Z"),
  "updated_at": ISODate("2025-02-26T09:16:20Z")
}

// userContributions collection
{
  "_id": ObjectId("507f1f77bcf86cd799439012"),
  "userId": ObjectId("507f1f77bcf86cd799439011"),
  "mediaId": ObjectId("507f1f77bcf86cd799439013"),
  "mediaType": "game",
  "tags": ["story", "action", "crime"],
  "timestamp": ISODate("2025-02-26T09:16:20Z"),
  "updated_at": ISODate("2025-02-26T09:16:20Z")
}

// mediaTags collection
{
  "_id": ObjectId("507f1f77bcf86cd799439013"),
  "mediaId": ObjectId("507f1f77bcf86cd799439013"),
  "mediaType": "game",
  "tags": [
    {
      "tag": "story",
      "count": 6,
      "users": [ObjectId("507f1f77bcf86cd799439011"), /* ... other user IDs */]
    },
    {
      "tag": "action",
      "count": 1,
      "users": [ObjectId("507f1f77bcf86cd799439011")]
    },
    {
      "tag": "crime",
      "count": 1,
      "users": [ObjectId("507f1f77bcf86cd799439011")]
    }
  ],
  "updated_at": ISODate("2025-02-26T09:16:20Z")
}
```

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
- Server startup time < 5 seconds (includes connecting to database and external
  APIs, setting up the app, the routes, global middlewares)
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
