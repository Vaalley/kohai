# Project Specification: Kohai

## 1. Project Overview

Kohai is a web application that enables users to associate descriptive words with video games, creating a crowdsourced tagging system. Users can view aggregated
popular tags for each piece of media, providing an organic, community-driven description system.

### A. Target Audience

- Gaming enthusiasts aged 16-45
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
- Budget allocation (Total: €80,000):
  - Development: 75% (€60,000)
  - Design: 20% (€16,000)
  - Testing: 5% (€4,000)

### E. Project Organization

- Team structure:
  - **Mark (Frontend Developer & Designer)**
    - _Role:_ UI/UX implementation, responsive design, client-side logic, asset preparation.
    - _Allocated Budget (Dev + Design):_ ~€46,000
    - _Estimated Hours:_ ~610 hours
  - **Léo (Backend Developer)**
    - _Role:_ API development, database management, server-side logic, external API integration.
    - _Allocated Budget (Development):_ ~€30,000
    - _Estimated Hours:_ ~400 hours
  - **Sophie (Project Manager)**
    - _Role:_ Requirements gathering, client communication, sprint planning, task management oversight, timeline adherence.
    - _Allocated Budget:_ (Covered under general project overhead)
    - _Estimated Hours:_ Part-time project oversight.
  - **Pierre (QA Specialist)**
    - _Role:_ Test plan creation, manual testing execution, bug reporting & tracking, quality assurance checks.
    - _Allocated Budget (Testing):_ ~€4,000
    - _Estimated Hours:_ ~55 hours
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

- User registration and authentication system
- Personal profile management
- Viewing history of user contributions

### B. Media Integration

- Video game database integration using external API (recommended: IGDB API)
- Unified search interface for all media types (If multiple)

### C. Tagging System

- Users can add up to 3 descriptive words per media item
- Word validation system to ensure quality (no duplicates, profanity filter)
- Real-time aggregation of popular tags
- Visual representation of tag popularity when visiting a media item's page

Example flow:

1. When a user tags the game "Red Dead Redemption 2" with ["story", "action", "western"]
   - 3 UserContribution records are created to track this specific user's tags
   - This enables viewing user's tagging history
2. The system then updates the MediaTag record for "Red Dead Redemption 2"
   - If "story" was already used by 5 other users, its count increases to 6
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
  "isadmin": false,
  "created_at": ISODate("2025-02-26T09:16:20Z"),
  "updated_at": ISODate("2025-02-26T09:16:20Z"),
  "last_login": ISODate("2025-02-26T09:16:20Z")
}

// userContributions collection
{
  "_id": ObjectId("507f1f77bcf86cd799439012"),
  "userId": ObjectId("507f1f77bcf86cd799439011"),
  "mediaId": "34568",
  "mediaType": "game",
  "tag": "story",
  "timestamp": ISODate("2025-02-26T09:16:20Z"),
  "updated_at": ISODate("2025-02-26T09:16:20Z")
}
{
  "_id": ObjectId("507f1f77bcf86cd799439014"),
  "userId": ObjectId("507f1f77bcf86cd799439011"),
  "mediaId": "34568",
  "mediaType": "game",
  "tag": "action",
  "timestamp": ISODate("2025-02-26T09:16:20Z"),
  "updated_at": ISODate("2025-02-26T09:16:20Z")
}
{
  "_id": ObjectId("507f1f77bcf86cd799439015"),
  "userId": ObjectId("507f1f77bcf86cd799439011"),
  "mediaId": "34568",
  "mediaType": "game",
  "tag": "western",
  "timestamp": ISODate("2025-02-26T09:16:20Z"),
  "updated_at": ISODate("2025-02-26T09:16:20Z")
}

// mediaTags collection
{
  "_id": ObjectId("507f1f77bcf86cd799439013"),
  "mediaId": "34568",
  "mediaType": "game",
  "tags": ["story", "action", "western", "bandits", "arthur"],
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
- Code organization:
  - Consistent camelCase naming convention
  - JSDoc documentation for all functions and classes
  - Modular structure with clear separation of concerns
- Security implementations:
  - Password hashing using bcrypt (10+ salt rounds)
  - JWT for authentication with appropriate expiration
  - Input validation and sanitization
  - CSRF protection

### C. Frontend (SvelteKit + Native CSS)

- HTML structure:
  - Semantic HTML5 elements (header, nav, main, section, article, footer)
  - ARIA attributes for enhanced accessibility
  - W3C validation compliance
- Atomic Design Structure:
  - Atoms: buttons, inputs, tags, icons
  - Molecules: search bars, tag groups, media cards
  - Organisms: navigation, media details, tag submission forms
  - Templates: layout structures
  - Pages: complete views
- CSS implementation:
  - SCSS as preprocessor, compiling to native CSS
  - Desktop-first responsive design approach
  - CSS Grid and Flexbox for layouts
  - Custom design system
- Asset optimization:
  - WebP image format with fallbacks
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
- Password hashing using bcrypt
- Session management with secure cookies
- XSS prevention
- NoSQL injection prevention
- CSRF token implementation
- Security headers configuration
- Regular security audits
- Dependency vulnerability scanning

## 6. Performance Requirements

- Page load time < 2 seconds
- API response time < 500ms
- Server startup time < 5 seconds (includes connecting to database and external APIs, setting up the app, the routes, global middlewares)
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

- Migration plan for self-hosted MongoDB
- Scalability strategy
- Caching system enhancement
- Backup and recovery procedures
- Analytics implementation (Posthog?)
