# PlogGo Backend

This is the backend server for PlogGo, a mobile app for tracking plogging activities (jogging while picking up litter).

## Technology Stack

- Node.js
- Express.js
- Prisma ORM
- PostgreSQL
- Socket.IO for real-time communication
- JWT for authentication

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Docker and Docker Compose (for running PostgreSQL)

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
```

3. Start PostgreSQL using Docker:

```bash
docker-compose up -d
```

4. Set up the database:

```bash
# Generate Prisma client
npm run generate

# Create database tables
npm run migrate

# Seed the database with initial data
npm run seed
```

5. Start the development server:

```bash
npm run dev
```

The server will be available at http://localhost:5000.

## API Endpoints

### Authentication

- `POST /api/login` - Log in a user
- `POST /api/register` - Register a new user
- `POST /logout` - Log out a user

### User

- `GET /api/profile` - Get user profile
- `PUT /api/user` - Update user information
- `GET /api/metrics` - Get user metrics
- `GET /api/badge` - Get user badges

### Plogging Sessions

- `GET /user/sessions` - Get user sessions
- `POST /logout/session/:sessionId` - End a specific session
- `POST /api/end_session` - End a plogging session

### Leaderboard and Challenges

- `GET /api/leaderboard` - Get leaderboard
- `GET /api/daily-challenge` - Get a daily challenge

## WebSocket API

The server uses Socket.IO for real-time tracking:

- `start_tracking` - Start a tracking session
- `location_update` - Update location during tracking
- `finish_tracking` - End a tracking session

## Environment Variables

Create a `.env` file with the following variables:

```
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ploggo?schema=public"
JWT_SECRET_KEY="your_jwt_secret"
AWS_ACCESS_KEY_ID="your_aws_key"
AWS_SECRET_ACCESS_KEY="your_aws_secret"
AWS_S3_BUCKET_NAME="your_s3_bucket"
AWS_S3_REGION="your_s3_region"
PORT=5000
``` 