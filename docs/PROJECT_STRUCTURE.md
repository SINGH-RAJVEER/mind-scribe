# Project Structure Documentation

## Directory Organization

### Backend API (`apps/api/src/`)

```
src/
├── config.ts              # Configuration variables
├── main.ts                # Express server setup
├── systemPrompt.ts        # LLM system prompt
├── middleware/            # Express middleware
│   ├── index.ts           # Error handling & async wrapper
│   └── auth.ts            # JWT authentication
├── routes/                # API endpoints
│   ├── auth.ts            # Authentication endpoints
│   └── chat.ts            # Chat endpoints with streaming
├── services/              # Business logic layer
│   └── database.ts        # Database queries & operations
├── controllers/           # Request handlers (extensible)
└── utils/                 # Utility functions
    └── litellmManager.ts  # LLM integration with streaming
```

### Frontend Application (`apps/web/src/`)

```
src/
├── App.tsx                # Root component
├── main.tsx               # React DOM entry point
├── index.css              # Global styles
├── api/                   # API client
│   ├── axiosInstance.ts   # Axios configuration
│   ├── authApi.ts         # Auth endpoints
│   └── chatApi.ts         # Chat endpoints
├── components/            # Reusable components
│   ├── ui/                # Shadcn/ui components
│   ├── Dashboard.tsx      # Main chat interface
│   ├── Login.tsx          # Login page
│   ├── Register.tsx       # Registration page
│   ├── ProtectedRoute.tsx # Route protection
│   ├── ThemeToggle.tsx    # Theme switcher
│   └── Toast.tsx          # Toast notifications
├── hooks/                 # Custom React hooks
│   ├── useChat.ts         # Chat logic
│   ├── useLogin.ts        # Login logic
│   ├── useLogout.ts       # Logout logic
│   └── useRegister.ts     # Registration logic
├── store/                 # State management (Zustand)
│   ├── authStore.ts       # Auth state
│   └── chatStore.ts       # Chat state
├── assets/                # Static assets
│   ├── header.png         # Header image
│   └── icon.png           # App icon
├── pages/                 # Route pages (extensible)
└── features/              # Feature-specific code (extensible)
```

### Database Package (`packages/database/src/`)

```
src/
├── connection.ts          # MongoDB connection
├── models/                # Data models
│   ├── User.ts            # User schema with indexes
│   ├── Conversation.ts    # Conversation schema with indexes
│   └── Message.ts         # Message schema with indexes
└── index.ts               # Model exports
```

### Types Package (`packages/types/src/`)

```
src/
└── index.ts               # Shared TypeScript types
```

## Performance Optimizations

### MongoDB Indexes

All collections now have strategic indexes for optimal query performance:

**User Collection:**

- Index on `username` for user lookup
- Index on `email` for email-based queries

**Conversation Collection:**

- Index on `user_id` for conversation listing
- Compound index on `(_id, user_id)` for user-specific lookups

**Message Collection:**

- Index on `user_id` for user's all messages
- Index on `conversation_id` for conversation messages
- Compound index on `(user_id, conversation_id)` for specific queries
- Index on `timestamp` (descending) for chronological queries
- Index on `is_crisis` for crisis message detection

### React Compiler

The React Compiler is enabled via Babel plugin in Vite configuration:

- Automatically memoizes components and variables
- Reduces unnecessary re-renders
- Optimizes component output

### Code Quality Tools

#### Biome Linter & Formatter

All packages use Biome for consistent code quality:

- **Configuration:** `biome.json` at root
- **Features:**
  - Fast linting across TypeScript/JavaScript
  - Automatic code formatting
  - Import organization
  - Security checks
  - React-specific rules

**Commands:**

```bash
bun run lint      # Lint and fix all packages
bun run format    # Format all packages
```

## Services Layer

The `apps/api/src/services/database.ts` provides a standardized interface:

### UserService

- `findById(id)` - Get user by ID
- `findByEmail(email)` - Get user by email
- `findByUsername(username)` - Get user by username

### ConversationService

- `getConversationsByUserId(userId)` - List user's conversations
- `getConversationById(id)` - Get specific conversation
- `createConversation(userId, id)` - Create new conversation
- `deleteConversation(id)` - Delete conversation

### MessageService

- `getMessagesByConversationId(conversationId)` - Get messages in conversation
- `createMessage(messageData)` - Add new message
- `getCrisisMessages(userId)` - Get user's crisis messages

## Middleware

### Error Handling

- `errorHandler` - Express error middleware with status codes
- `asyncHandler` - Wraps route handlers to catch promises

### Authentication

- `authenticateToken` - JWT verification middleware
- Extracts user from token and attaches to request

## Build & Development

### Scripts (Root)

```bash
bun run dev          # Start all in development mode
bun run build        # Build all packages
bun run type-check   # Type check all packages
bun run lint         # Lint and fix all packages
bun run format       # Format all packages
bun run clean        # Clean artifacts and node_modules
```

### Turbo Pipeline

Configuration in `turbo.json`:

- `build` - Depends on `^build` (deps must build first)
- `dev` - No caching, runs persistently
- `lint` - Depends on `^lint`
- `format` - Depends on `^format`
- `type-check` - Depends on `^type-check`
- `clean` - No caching

## Future Extensibility

The structure is designed to support growth:

- **Controllers:** Add request validation and routing logic
- **Pages:** Add route-based pages in web app
- **Features:** Organize complex features with own folders
- **Services:** Add more business logic services
- **Middleware:** Add middleware for logging, auth, etc.
