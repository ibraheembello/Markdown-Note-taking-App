# Markdown Note-taking Application

A RESTful API for managing markdown notes with grammar checking and HTML rendering capabilities.

Project based on: [roadmap.sh Markdown Note-taking App](https://roadmap.sh/projects/markdown-note-taking-app)

## Features

- Upload markdown files
- Grammar checking
- Save and manage notes
- Render notes as HTML
- User authentication
- Pagination support
- API documentation with Swagger

## Tech Stack

- Node.js & Express
- MongoDB & Mongoose
- JWT Authentication
- GrammarBot API
- Swagger UI

## Setup

1. Install dependencies:

```bash
npm install
```

2. Start MongoDB server locally

3. Create .env file:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/markdown_notes
JWT_SECRET=your_jwt_secret
GRAMMARBOT_API_KEY=your_api_key
```

4. Start the server:

```bash
node "Markdown Notes Application.js"
```

## API Endpoints

- `POST /upload` - Upload markdown file
- `POST /check-grammar` - Check text grammar
- `POST /notes` - Create new note
- `GET /notes` - List all notes
- `GET /notes/:id/html` - Get HTML version of note
- `PUT /notes/:id` - Update note
- `DELETE /notes/:id` - Delete note
- `POST /register` - Register new user

## Documentation

API documentation is available at `/api-docs` when the server is running.
