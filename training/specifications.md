# Project Specification: Kohai

## 1. Project Overview

Kohai is a web application that enables users to associate descriptive words with video games, creating a crowdsourced
tagging system. Users can view aggregated popular tags for each piece of media, providing an organic, community-driven
description system.

### A. Target Audience

- Gaming enthusiasts aged 18-45
- Content creators looking for descriptive metadata
- Casual gamers seeking game recommendations based on descriptive attributes

### B. Accessibility Requirements

- Color contrast ratios meeting accessibility standards
- Alternative text for all images
- [A11Y checklist compliance](https://www.a11yproject.com/checklist/)

### C. SEO Strategy

- Semantic HTML structure
- URL structure optimization

### D. Project Timeline and Budget

- Development timeline: 9 months (January 2025 - September 2025)
- Launch date: September 22, 2025
  - Planning & Setup: January 2025
  - Core Development: February - July 2025
  - Testing & Refinement: August - September 2025
- Budget allocation (Total: €120,000):
  - Development (Frontend + Backend): €80,000 (66.7%)
  - Project Management: €15,000 (12.5%)
  - Quality Assurance: €10,000 (8.3%)
  - DevOps: €15,000 (12.5%)

### E. Project Organization

- Team structure:
  - **Marc (Frontend Developer & Designer)**
    - _Role:_ UI/UX implementation, responsive design, client-side logic, asset preparation, accessibility.
    - _Hourly Rate:_ €65-75 (Senior frontend developer in Nantes)
    - _Allocated Budget (Dev + Design):_ €50,000
    - _Estimated Hours:_ ~700 hours
    - _Tools:_ (SvelteKit)[https://kit.svelte.dev/], (Native
      CSS)[https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_variables], (Slack)[https://slack.com/],
      (Figma)[https://www.figma.com/]

  - **Léo (Backend Developer)**
    - _Role:_ API development, database management, server-side logic, external API integration.
    - _Hourly Rate:_ €45-55 (Mid-level backend developer in Nantes)
    - _Allocated Budget (Development):_ €35,000
    - _Estimated Hours:_ ~650 hours
    - _Tools:_ (Deno)[https://deno.com/], (Hono)[https://github.com/honojs/hono], (MongoDB)[https://www.mongodb.com/],
      (MongoDB Compass)[https://www.mongodb.com/products/tools/compass], (Slack)[https://slack.com/]

  - **Sophie (Project Manager)**
    - _Role:_ Requirements gathering, client communication, sprint planning, task management oversight, timeline
      adherence.
    - _Hourly Rate:_ €45-55 (Mid-level PM in Nantes)
    - _Allocated Budget (Management):_ €12,000
    - _Estimated Hours:_ ~250 hours (part-time, 15-20h/week)
    - _Tools:_ (Jira)[https://www.atlassian.com/fr/software/jira], (Slack)[https://slack.com/]

  - **Pierre (QA Specialist)**
    - _Role:_ Test plan creation, manual testing execution, bug reporting & tracking, quality assurance checks,
      accessibility testing.
    - _Hourly Rate:_ €40-45 (Mid-level QA in Nantes)
    - _Allocated Budget (Testing):_ €8,000
    - _Estimated Hours:_ ~180 hours (part-time, 10h/week)
    - _Tools:_ (Responsive Web Test)[https://responsivewebtest.com/], (Slack)[https://slack.com/]

  - **Léa (DevOps / Sysadmin)**
    - _Role:_ Infrastructure management, deployment, monitoring, and maintenance.
    - _Hourly Rate:_ €45-55 (Mid-level DevOps in Nantes)
    - _Allocated Budget (DevOps):_ €12,000
    - _Estimated Hours:_ ~240 hours (part-time, 15h/week)
    - _Tools:_ (Docker)[https://www.docker.com/], (MongoDB)[https://www.mongodb.com/], (MongoDB
      Compass)[https://www.mongodb.com/products/tools/compass], (Slack)[https://slack.com/]

- Project tracking:
  - Weekly sprint planning
  - Sprint retrospectives at the end of each sprint
  - Kanban board for task management
  - Github Issues for technical task management
  - Key performance indicators:
    - Bug resolution time
    - Sprint velocity
    - New feature development time

## 2. Core Features

### A. User Management

![Diagramme de use cases](<uml/Diagramme de use cases.png>)

- User registration and authentication system
- Personal profile management
- Viewing history of user contributions

### B. Media Integration

- Video game database integration using external API (recommended: IGDB API)
- Unified search interface for all media types (If multiple)

### C. Tagging System

![Diagramme d'activity](<uml/Diagramme d'activity.png>)

- Users can add up to 3 descriptive words per media item
- Word validation system to ensure quality:
  - Duplicate Prevention: Check for existing identical tags (case-insensitive) submitted by the _same user_ for the
    _same media item_.
  - Profanity Filter: Implement custom filtering. It must handle common variations, leetspeak, etc.
- Real-time aggregation of popular tags
  - Example: When 10 users tag "The Witcher 3" as "rpg" and 5 as "open-world", these counts are immediately reflected
- Visual representation of tag popularity when visiting a media item's page

Example flow:

1. When a user tags the game "Red Dead Redemption 2" with ["story", "action", "western"]
   - 3 UserContribution records are created to track this specific user's tags
   - This enables viewing user's tagging history
2. The system then updates the MediaTag record for "Red Dead Redemption 2"
   - If "story" wasn't used before, it's added
   - This aggregated view powers the tag popularity visualization

## 3. Technical Architecture

### A. Database (MongoDB)

[![Diagramme de classes](<uml/Diagramme de classes.png>)]

- Initial deployment on MongoDB Atlas (production environment)
- Migration to dockerized MongoDB solution for local development
- Collections structure:
  - Users (see user.ts for schema)
  - MediaTags (see mediaTag.ts for schema)
  - UserContributions (see userContribution.ts for schema)

Example collections state for "Red Dead Redemption 2" scenario:

```js
// users collection
{
  "_id": ObjectId("507f1f77bcf86cd799439011"),
  "username": "gamefan123",
  "email": "fan@example.com",
  "password": "<hashed_password>",
  "isadmin": false,
  "created_at": ISODate("2025-02-26T09:16:20Z"),
  "updated_at": ISODate("2025-02-26T09:16:20Z"),
  "last_login": ISODate("2025-02-26T09:16:20Z")
}

// userContributions collection
{
  "_id": ObjectId("507f1f77bcf86cd799439012"),
  "userId": ObjectId("507f1f77bcf86cd799439011"),
  "mediaSlug": "red-dead-redemption-2",
  "mediaType": "game",
  "tag": "story",
  "timestamp": ISODate("2025-02-26T09:16:20Z"),
  "updated_at": ISODate("2025-02-26T09:16:20Z")
}
{
  "_id": ObjectId("507f1f77bcf86cd799439014"),
  "userId": ObjectId("507f1f77bcf86cd799439011"),
  "mediaSlug": "red-dead-redemption-2",
  "mediaType": "game",
  "tag": "action",
  "timestamp": ISODate("2025-02-26T09:16:20Z"),
  "updated_at": ISODate("2025-02-26T09:16:20Z")
}
{
  "_id": ObjectId("507f1f77bcf86cd799439015"),
  "userId": ObjectId("507f1f77bcf86cd799439011"),
  "mediaSlug": "red-dead-redemption-2",
  "mediaType": "game",
  "tag": "western",
  "timestamp": ISODate("2025-02-26T09:16:20Z"),
  "updated_at": ISODate("2025-02-26T09:16:20Z")
}

// mediaTags collection
{
  "_id": ObjectId("507f1f77bcf86cd799439013"),
  "mediaSlug": "red-dead-redemption-2",
  "mediaType": "game",
  "tags": ["story", "action", "western", "bandits", "arthur"],
  "updated_at": ISODate("2025-02-26T09:16:20Z")
}
```

### B. Backend (Deno + Hono)

The backend is in its own repository, separate from the frontend. ->
[backend repository](https://github.com/Vaalley/kohai)

- RESTful API architecture
- Endpoints:
  - Authentication (/auth/*)
  - Game management (/games/*)
  - Tag management (/tags/*)
  - User management (/users/*)
- Rate limiting and caching system
- External API integration layer
- Code organization:
  - Consistent camelCase naming convention
  - JSDoc documentation for most functions
  - Modular structure with clear separation of concerns
- Security implementations:
  - Password hashing using argon2
  - JWT for authentication with appropriate expiration
  - Input validation and sanitization
  - CSRF protection

### C. Frontend (SvelteKit + Native CSS)

The frontend is in its own repository, separate from the backend. ->
[frontend repository](https://github.com/Vaalley/kohai-ui)

Link to Figma design:
[Figma](https://www.figma.com/design/1IhPcRj8AN9X1P0s88zKOd/Kohai?node-id=0-1&p=f&t=TktpkDxhEdrlY4mP-0)

- SvelteKit
  - Use of runes
  - Wildcard routes for dynamic routing
- HTML structure:
  - Semantic HTML5 elements (header, nav, main, section, article, footer)
  - ARIA attributes for enhanced accessibility
  - W3C validation compliance
- Atomic Design Structure:
  - Atoms, Molecules, Organisms, Templates, Pages
- CSS implementation:
  - SCSS as preprocessor, compiling to native CSS
  - Desktop-first responsive design approach
  - CSS Grid and Flexbox for layouts
  - Custom design system
- Asset optimization:
  - WebP image format
  - SVG for icons and simple graphics
- JavaScript interactivity:
  - Debounced search functionality
  - Fetch API for asynchronous server communication
- Responsive design system:
  - Breakpoints at 480px, 768px, 1024px, and 1440px
  - Device testing across mobile, tablet, and desktop
- Client-side caching strategy
- Accessibility features:
  - Focus management
  - Typography with minimum 16px base font size
  - Color contrast ratio of at least 4.5:1

## 4. External API Integration

### A. Video Game API Integration

- IGDB API implementation
- Required endpoints:
  - Game search
  - Game details
  - Game cover images
- Error handling and fallback mechanisms
- Caching strategy for API responses

## 5. Security Considerations

- HTTPS enforcement
- API key security with environment variables
- Input sanitization and validation
- CORS policy configuration
- Password hashing using argon2
- Session management with secure cookies
- XSS prevention
- NoSQL injection prevention
- CSRF SameSite cookie attribute
- Security headers configuration
- Dependency vulnerability scanning

## 6. Performance Requirements

- Page load time < 2 seconds
- API response time < 500ms
- Server startup time < 5 seconds (includes connecting to database and external APIs, setting up the app, the routes,
  global middlewares)
- Support for concurrent users
- Efficient caching strategy
- Optimized database queries

## 7. Development Workflow

- Version control using Git
- 2 repositories: one for the backend, one for the frontend
- Feature branch workflow
- CI/CD pipeline (CodeQL, custom deno fmt hook from github)
- Code review process

## 8. Innovation and Research

### A. Eco-Design Considerations

- Server-side rendering to reduce client-side processing
- Optimized asset loading and caching
- Efficient database queries to minimize server load
- Reduced JavaScript bundle size

### B. Security Enhancements

- Automated security scanning in CI/CD pipeline
- Privacy-focused data handling

## 9. Future Considerations

- Scalability strategy
- Caching system enhancement
- Backup and recovery procedures
