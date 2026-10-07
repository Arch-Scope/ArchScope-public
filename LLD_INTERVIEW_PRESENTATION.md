# ArchScope - Low-Level Design (LLD) Interview Presentation

**Duration:** 1 Hour  
**Product:** ArchScope - Interactive Cloud Architecture Simulator

---

## Presentation Outline (60 minutes)

| Section | Duration | Content |
|---------|----------|---------|
| 1. Introduction & Problem Statement | 5 min | What & Why |
| 2. Requirements | 8 min | Functional & Non-Functional |
| 3. High-Level Architecture | 7 min | System Overview |
| 4. Entities & ER Diagram | 10 min | Data Modeling |
| 5. Schema Design | 8 min | Database Schema |
| 6. API Design | 12 min | RESTful APIs |
| 7. Logical Flow of Events | 8 min | Key Workflows |
| 8. Q&A Buffer | 2 min | Questions |

---

## 1. Introduction & Problem Statement (5 min)

### What is ArchScope?

ArchScope is an **interactive web-based tool** for designing, visualizing, and testing system architectures with **real-time performance simulations**.

### The Problem

> "How do I know if my system design will handle 10,000 RPS before I spend $50,000 building it?"

**Pain Points:**
1. **Expensive Mistakes** - Wrong architecture decisions cost millions in re-engineering
2. **Guesswork** - Engineers estimate latency/throughput without validation
3. **No Feedback Loop** - Traditional diagramming tools (Lucidchart, Draw.io) don't simulate behavior
4. **Cloud Cost Uncertainty** - Hard to estimate infrastructure costs before deployment

### The Solution

ArchScope provides:
- **Visual Architecture Design** - Drag-and-drop cloud components
- **Real-time Simulation** - Latency, throughput, bottleneck detection
- **Cost Estimation** - Accurate pricing from 30+ cloud services
- **AI-Powered Design** - Natural language to architecture generation

---

## 2. Requirements (8 min)

### 2.1 Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR1 | Users can create/edit/delete architecture diagrams | P0 |
| FR2 | Users can add 9 component types (Client, Load Balancer, API Server, Cache, Database, Message Queue, Worker, Notification Service, Rate Limiter) | P0 |
| FR3 | Users can connect components with edges | P0 |
| FR4 | Users can configure component properties (latency, throughput, cost) | P0 |
| FR5 | System simulates traffic flow with configurable load profiles | P0 |
| FR6 | System calculates end-to-end latency, throughput, and cost | P0 |
| FR7 | System detects bottlenecks and provides suggestions | P1 |
| FR8 | Users can save/load designs (authenticated) | P1 |
| FR9 | AI agent generates architectures from natural language | P2 |
| FR10 | Users can execute commands via AQL terminal | P2 |

### 2.2 Non-Functional Requirements

| ID | Requirement | Target |
|----|-------------|--------|
| NFR1 | Simulation should complete within 5 seconds for 60-second simulated duration | Performance |
| NFR2 | UI should render at 60 FPS during drag operations | Performance |
| NFR3 | System should support 100 concurrent users | Scalability |
| NFR4 | Designs should persist across sessions | Durability |
| NFR5 | Authentication tokens expire after 7 days | Security |
| NFR6 | Passwords must be hashed with bcrypt (10 rounds) | Security |

### 2.3 Capacity Estimation

```
Assumptions:
- 1,000 DAU (Daily Active Users)
- Average 5 designs per user
- Average design size: 10 nodes, 15 edges
- Average 10 simulations per design per day

Storage:
- Design JSON: ~5 KB per design
- Total designs: 1,000 × 5 = 5,000 designs
- Storage: 5,000 × 5 KB = 25 MB (negligible)

API Traffic:
- Simulations: 1,000 × 5 × 10 = 50,000 requests/day
- Peak RPS: 50,000 / 86,400 × 10 (peak factor) ≈ 6 RPS
- Very manageable for a single server
```

---

## 3. High-Level Architecture (7 min)

### 3.1 System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENT (Browser)                            │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐     │
│  │   React     │  │  @xyflow    │  │  Recharts   │  │  Terminal   │     │
│  │   19.2.4    │  │   /react    │  │   Charts    │  │   (AQL)     │     │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────────┘     │
│         │                │                │                │             │
│         └────────────────┴────────────────┴────────────────┘             │
│                                    │                                     │
│                            React Context + Hooks                         │
│                     (useSimulatorState, useSimulation, useAgent)         │
└─────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ HTTPS
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         NEXT.JS 16 SERVER                                │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                        API Routes (/api/*)                       │    │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐           │    │
│  │  │  /auth   │ │ /designs │ │/simulate │ │  /agent  │           │    │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘           │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      Core Libraries (/lib)                       │    │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐     │    │
│  │  │  Simulation    │  │  AQL Parser    │  │  AI Agent      │     │    │
│  │  │  Engine        │  │  & Handlers    │  │  (LangGraph)   │     │    │
│  │  └────────────────┘  └────────────────┘  └────────────────┘     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
│                                    │                                     │
│  ┌─────────────────────────────────────────────────────────────────┐    │
│  │                      Backend Services                            │    │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐     │    │
│  │  │  Auth Service  │  │  JWT Utility   │  │  Mailer        │     │    │
│  │  │  (bcrypt)      │  │  (jsonwebtoken)│  │  (Resend)      │     │    │
│  │  └────────────────┘  └────────────────┘  └────────────────┘     │    │
│  └─────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
         │                                              │
         │ Prisma ORM                                   │ OpenAI API
         ▼                                              ▼
┌─────────────────┐                          ┌─────────────────┐
│   PostgreSQL    │                          │   OpenAI        │
│   Database      │                          │   GPT-4o-mini   │
└─────────────────┘                          └─────────────────┘
```

### 3.2 Tech Stack Summary

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | Next.js 16 + React 19 | UI Framework |
| Canvas | @xyflow/react | Node-based diagram editor |
| Charts | Recharts | Data visualization |
| Styling | TailwindCSS 4 + shadcn/ui | Component library |
| Backend | Next.js API Routes | REST API |
| ORM | Prisma 6.19 | Database access |
| Database | PostgreSQL | Persistent storage |
| Auth | bcrypt + JWT | Authentication |
| AI | LangGraph + OpenAI | Natural language processing |
| Email | Resend | Transactional emails |

---

## 4. Entities & ER Diagram (10 min)

### 4.1 Core Entities

#### Entity 1: User
Represents a registered user of the system.

| Attribute | Type | Constraints | Description |
|-----------|------|-------------|-------------|
| id | UUID | PK, Auto-generated | Unique identifier |
| username | String | Unique, Not Null | Display name |
| email | String | Unique, Not Null | Login credential |
| password | String | Not Null | Bcrypt hash (10 rounds) |
| createdAt | DateTime | Auto-generated | Registration timestamp |
| updatedAt | DateTime | Auto-updated | Last modification |
| resetToken | String | Nullable | Password reset token (hashed) |
| resetTokenExpiry | DateTime | Nullable | Token expiration time |

#### Entity 2: Design
Represents a saved architecture design.

| Attribute | Type | Constraints | Description |
|-----------|------|-------------|-------------|
| id | UUID | PK, Auto-generated | Unique identifier |
| name | String | Not Null | Design name |
| nodes | JSON | Not Null | Array of architecture nodes |
| edges | JSON | Not Null | Array of connections |
| createdAt | DateTime | Auto-generated | Creation timestamp |
| userId | UUID | FK → User.id | Owner reference |

#### Entity 3: Node (Embedded in Design.nodes JSON)
Represents a component in the architecture.

| Attribute | Type | Description |
|-----------|------|-------------|
| id | String | Unique within design |
| type | String | React Flow node type |
| position | {x, y} | Canvas coordinates |
| data.label | String | Display name |
| data.componentType | Enum | One of 9 component types |
| data.config | Object | Service configuration |
| data.metrics | Object | Runtime metrics (optional) |

#### Entity 4: Edge (Embedded in Design.edges JSON)
Represents a connection between components.

| Attribute | Type | Description |
|-----------|------|-------------|
| id | String | Unique within design |
| source | String | Source node ID |
| target | String | Target node ID |
| sourceHandle | String | Connection point (optional) |
| targetHandle | String | Connection point (optional) |
| animated | Boolean | Visual animation flag |

### 4.2 ER Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                            USER                                  │
├─────────────────────────────────────────────────────────────────┤
│ PK │ id: UUID                                                   │
│    │ username: VARCHAR(255) [UNIQUE]                            │
│    │ email: VARCHAR(255) [UNIQUE]                               │
│    │ password: VARCHAR(255)                                     │
│    │ createdAt: TIMESTAMP                                       │
│    │ updatedAt: TIMESTAMP                                       │
│    │ resetToken: VARCHAR(255) [NULLABLE]                        │
│    │ resetTokenExpiry: TIMESTAMP [NULLABLE]                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1
                              │
                              │
                              │ *
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                           DESIGN                                 │
├─────────────────────────────────────────────────────────────────┤
│ PK │ id: UUID                                                   │
│    │ name: VARCHAR(255)                                         │
│    │ nodes: JSONB                                               │
│    │ edges: JSONB                                               │
│    │ createdAt: TIMESTAMP                                       │
│ FK │ userId: UUID → User.id                                     │
└─────────────────────────────────────────────────────────────────┘

Relationship: User (1) ──────< Design (*)
             "A user can have many designs"
             "A design belongs to exactly one user"
```

### 4.3 Component Type Enum

```typescript
type ComponentType = 
  | "client"              // Entry point (browser/mobile)
  | "load_balancer"       // Traffic distribution
  | "api_server"          // Request processing
  | "cache"               // In-memory storage (Redis)
  | "database"            // Persistent storage
  | "message_queue"       // Async messaging (SQS, Kafka)
  | "worker"              // Background processing
  | "notification_service"// Push/Email notifications
  | "rate_limiter";       // Request throttling
```

### 4.4 Why JSON for Nodes/Edges?

**Decision:** Store nodes and edges as JSONB instead of normalized tables.

**Rationale:**
1. **Flexibility** - Node schema varies by component type
2. **Atomic Operations** - Save entire design in one transaction
3. **Read Performance** - Single query to load full design
4. **Canvas Compatibility** - Direct mapping to @xyflow/react format

**Trade-offs:**
- Cannot query individual nodes efficiently (acceptable for our use case)
- No referential integrity within JSON (validated at application layer)

---

## 5. Schema Design (8 min)

### 5.1 Prisma Schema

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  username  String   @unique
  email     String   @unique
  password  String

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Password reset fields
  resetToken       String?
  resetTokenExpiry DateTime?

  // Relations
  designs   Design[]

  // Indexes
  @@index([email])
  @@index([resetToken])
}

model Design {
  id        String   @id @default(uuid())
  name      String
  nodes     Json     // JSONB in PostgreSQL
  edges     Json     // JSONB in PostgreSQL
  createdAt DateTime @default(now())

  // Relations
  userId String
  user   User @relation(fields: [userId], references: [id], onDelete: Cascade)

  // Indexes
  @@index([userId])
  @@index([createdAt])
}
```

### 5.2 JSON Schema for Nodes

```typescript
// Stored in Design.nodes as JSONB array
interface StoredNode {
  id: string;
  type: "infra-node";
  position: { x: number; y: number };
  data: {
    label: string;
    componentType: ComponentType;
    config: {
      serviceId: string;
      
      // Performance overrides
      latencyMs?: number;
      throughputRps?: number;
      
      // Scaling
      instances?: number;
      
      // Rate limiting (for rate_limiter type)
      rateLimitAlgorithm?: "token_bucket" | "fixed_window" | "sliding_window" | "leaky_bucket";
      rateLimitBucketSize?: number;
      rateLimitRefillRate?: number;
      
      // Queue settings (for message_queue type)
      queueCapacity?: number;
      
      // Cache settings
      cacheHitRate?: number;
      cacheTtlSeconds?: number;
      
      // Database settings
      timeComplexity?: "O(1)" | "O(log n)" | "O(n)" | "O(n log n)" | "O(n^2)";
      connectionPoolSize?: number;
    };
    metrics?: {
      currentRps: number;
      avgLatencyMs: number;
      errorRate: number;
      queueDepth?: number;
    };
  };
}
```

### 5.3 JSON Schema for Edges

```typescript
// Stored in Design.edges as JSONB array
interface StoredEdge {
  id: string;
  source: string;      // Node ID
  target: string;      // Node ID
  sourceHandle?: string;
  targetHandle?: string;
  animated?: boolean;  // Visual indicator for active traffic
}
```

### 5.4 Indexing Strategy

| Table | Index | Type | Purpose |
|-------|-------|------|---------|
| User | email | B-tree | Login lookup |
| User | resetToken | B-tree | Password reset validation |
| Design | userId | B-tree | List user's designs |
| Design | createdAt | B-tree | Sort by creation date |

### 5.5 Data Integrity

```sql
-- Constraints enforced by Prisma
ALTER TABLE "Design" 
  ADD CONSTRAINT "Design_userId_fkey" 
  FOREIGN KEY ("userId") 
  REFERENCES "User"("id") 
  ON DELETE CASCADE;

-- Application-level validation
-- - Node IDs must be unique within a design
-- - Edge source/target must reference valid node IDs
-- - ComponentType must be one of 9 valid values
```

---

## 6. API Design (12 min)

### 6.1 API Overview

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth` | POST | No | Authentication (login/register/reset) |
| `/api/designs` | GET | Yes | List user's designs |
| `/api/designs` | POST | Yes | Create new design |
| `/api/designs/[id]` | PUT | Yes | Update design |
| `/api/designs/[id]` | DELETE | Yes | Delete design |
| `/api/simulate` | POST | No | Run simulation |
| `/api/agent` | POST | No* | AI agent interaction |
| `/api/agent/evaluate` | POST | No* | Evaluate simulation results |

*Requires OpenAI API key in environment

### 6.2 Authentication API

#### POST /api/auth

**Action: Register**
```http
POST /api/auth
Content-Type: application/json

{
  "action": "register",
  "username": "john_doe",
  "email": "john@example.com",
  "password": "SecureP@ss123"
}
```

**Response (201 Created):**
```json
{
  "message": "User registered",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john@example.com"
  }
}
```

**Validation Rules:**
- Username: min 3 characters
- Email: valid email format
- Password: min 8 chars, must contain lowercase, uppercase, number, special char

---

**Action: Login**
```http
POST /api/auth
Content-Type: application/json

{
  "action": "login",
  "email": "john@example.com",
  "password": "SecureP@ss123"
}
```

**Response (200 OK):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john@example.com"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**JWT Payload:**
```json
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "email": "john@example.com",
  "iat": 1693526400,
  "exp": 1694131200  // 7 days
}
```

---

**Action: Forgot Password**
```http
POST /api/auth
Content-Type: application/json

{
  "action": "forgot-password",
  "email": "john@example.com"
}
```

**Response (200 OK):**
```json
{
  "message": "If an account with that email exists, we sent a password reset link."
}
```

**Security:** Always returns success to prevent email enumeration attacks.

---

**Action: Reset Password**
```http
POST /api/auth
Content-Type: application/json

{
  "action": "reset-password",
  "token": "userId.hashedToken",
  "newPassword": "NewSecureP@ss456"
}
```

### 6.3 Designs API

#### GET /api/designs

```http
GET /api/designs
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Response (200 OK):**
```json
{
  "designs": [
    {
      "id": "d1234567-89ab-cdef-0123-456789abcdef",
      "name": "URL Shortener Architecture",
      "nodes": [...],
      "edges": [...],
      "createdAt": "2024-01-15T10:30:00Z",
      "userId": "550e8400-e29b-41d4-a716-446655440000"
    }
  ]
}
```

#### POST /api/designs

```http
POST /api/designs
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
Content-Type: application/json

{
  "name": "E-commerce Backend",
  "nodes": [
    {
      "id": "node-1",
      "type": "infra-node",
      "position": { "x": 100, "y": 100 },
      "data": {
        "label": "API Gateway",
        "componentType": "load_balancer",
        "config": { "serviceId": "aws-alb" }
      }
    }
  ],
  "edges": [
    { "id": "edge-1", "source": "node-1", "target": "node-2" }
  ]
}
```

**Response (201 Created):**
```json
{
  "design": {
    "id": "d1234567-89ab-cdef-0123-456789abcdef",
    "name": "E-commerce Backend",
    "nodes": [...],
    "edges": [...],
    "createdAt": "2024-01-15T10:30:00Z",
    "userId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

### 6.4 Simulation API

#### POST /api/simulate

```http
POST /api/simulate
Content-Type: application/json

{
  "scenarioId": "url-shortener",
  "endpointIndex": 0,
  "graph": {
    "nodes": [
      {
        "id": "client-1",
        "label": "Client",
        "componentType": "client"
      },
      {
        "id": "lb-1",
        "label": "Load Balancer",
        "componentType": "load_balancer",
        "rateLimitAlgorithm": "token_bucket",
        "rateLimitBucketSize": 1000,
        "rateLimitRefillRate": 100
      }
    ],
    "edges": [
      { "source": "client-1", "target": "lb-1" }
    ]
  }
}
```

**Response (200 OK):**
```json
{
  "statusCode": 200,
  "request": {
    "method": "GET",
    "path": "/api/shorten/abc123",
    "payload": {}
  },
  "response": {
    "body": { "url": "https://example.com/original" }
  },
  "hops": [
    {
      "nodeId": "client-1",
      "nodeLabel": "Client",
      "componentType": "client",
      "latencyMs": 0,
      "timestamp": 1693526400000
    },
    {
      "nodeId": "lb-1",
      "nodeLabel": "Load Balancer",
      "componentType": "load_balancer",
      "latencyMs": 2,
      "timestamp": 1693526400002
    }
  ],
  "totalLatencyMs": 45
}
```

**Rate Limited Response (429):**
```json
{
  "statusCode": 429,
  "retryAfter": 1000,
  "hops": [],
  "totalLatencyMs": 0
}
```

### 6.5 AI Agent API

#### POST /api/agent

```http
POST /api/agent
Content-Type: application/json

{
  "sessionId": "session-123",
  "message": "Design a URL shortener that handles 10,000 RPS with 50ms latency",
  "currentNodes": [],
  "currentEdges": []
}
```

**Response - Clarification Needed:**
```json
{
  "type": "clarification",
  "questions": [
    "What is your monthly budget for infrastructure?",
    "Do you need analytics for click tracking?",
    "Should URLs expire after a certain time?"
  ],
  "summary": "I understand you need a URL shortener. Let me clarify a few details.",
  "requirements": {
    "useCase": "url-shortener",
    "expectedRps": 10000,
    "latencyTargetMs": 50
  }
}
```

**Response - Commands Generated:**
```json
{
  "type": "execution",
  "commands": [
    "add client as Client",
    "add load_balancer as ALB using aws-alb",
    "add api_server as API using aws-ec2-c5-xlarge",
    "add cache as Redis using aws-elasticache-redis",
    "add database as DynamoDB using aws-dynamodb",
    "connect Client to ALB",
    "connect ALB to API",
    "connect API to Redis",
    "connect API to DynamoDB"
  ],
  "explanation": "I've designed a URL shortener with Redis caching for fast reads and DynamoDB for persistence.",
  "requirements": {
    "useCase": "url-shortener",
    "expectedRps": 10000,
    "latencyTargetMs": 50,
    "needsCaching": true
  }
}
```

### 6.6 Error Responses

All APIs follow consistent error format:

```json
{
  "error": "Error message here"
}
```

| Status Code | Meaning |
|-------------|---------|
| 400 | Bad Request - Invalid input |
| 401 | Unauthorized - Missing/invalid token |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |

---

## 7. Logical Flow of Events (8 min)

### 7.1 User Registration Flow

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Client  │     │  /api/auth   │     │ Auth Service │     │  PostgreSQL  │
└────┬─────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
     │                  │                    │                    │
     │ POST {register}  │                    │                    │
     │─────────────────>│                    │                    │
     │                  │                    │                    │
     │                  │ Validate schema    │                    │
     │                  │ (Zod)              │                    │
     │                  │                    │                    │
     │                  │ register(data)     │                    │
     │                  │───────────────────>│                    │
     │                  │                    │                    │
     │                  │                    │ Check email exists │
     │                  │                    │───────────────────>│
     │                  │                    │<───────────────────│
     │                  │                    │                    │
     │                  │                    │ Hash password      │
     │                  │                    │ (bcrypt, 10 rounds)│
     │                  │                    │                    │
     │                  │                    │ Create user        │
     │                  │                    │───────────────────>│
     │                  │                    │<───────────────────│
     │                  │                    │                    │
     │                  │<───────────────────│                    │
     │                  │                    │                    │
     │ 201 {user}       │                    │                    │
     │<─────────────────│                    │                    │
     │                  │                    │                    │
```

### 7.2 Architecture Design Flow

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Canvas  │     │  React State │     │ LocalStorage │     │  /api/designs│
└────┬─────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
     │                  │                    │                    │
     │ Drag component   │                    │                    │
     │─────────────────>│                    │                    │
     │                  │                    │                    │
     │                  │ addComponent()     │                    │
     │                  │ setNodes()         │                    │
     │                  │                    │                    │
     │                  │ saveToHistory()    │                    │
     │                  │ (undo/redo stack)  │                    │
     │                  │                    │                    │
     │                  │ saveToStorage()    │                    │
     │                  │───────────────────>│                    │
     │                  │                    │                    │
     │<─────────────────│ Re-render          │                    │
     │                  │                    │                    │
     │                  │                    │                    │
     │ Click "Save"     │                    │                    │
     │─────────────────>│                    │                    │
     │                  │                    │                    │
     │                  │ POST /api/designs  │                    │
     │                  │────────────────────────────────────────>│
     │                  │                    │                    │
     │                  │<────────────────────────────────────────│
     │                  │ {design}           │                    │
     │                  │                    │                    │
```

### 7.3 Simulation Flow

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    UI    │     │ useSimulation│     │  Simulation  │     │   Results    │
│          │     │    Hook      │     │   Engine     │     │    Panel     │
└────┬─────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
     │                  │                    │                    │
     │ Click "Run"      │                    │                    │
     │─────────────────>│                    │                    │
     │                  │                    │                    │
     │                  │ prepareSimulation()│                    │
     │                  │───────────────────>│                    │
     │                  │                    │                    │
     │                  │                    │ buildGraph()       │
     │                  │                    │ findEntryNodes()   │
     │                  │                    │ distributeRps()    │
     │                  │                    │                    │
     │                  │<───────────────────│                    │
     │                  │ SimulationContext  │                    │
     │                  │                    │                    │
     │                  │ setInterval(1000ms)│                    │
     │                  │                    │                    │
     ├──────────────────┼────────────────────┼────────────────────┤
     │                  │ LOOP: For each tick│                    │
     ├──────────────────┼────────────────────┼────────────────────┤
     │                  │                    │                    │
     │                  │ simulateTick()     │                    │
     │                  │───────────────────>│                    │
     │                  │                    │                    │
     │                  │                    │ Calculate latency  │
     │                  │                    │ (M/M/1 queuing)    │
     │                  │                    │                    │
     │                  │                    │ Check rate limits  │
     │                  │                    │ (token bucket)     │
     │                  │                    │                    │
     │                  │                    │ Update metrics     │
     │                  │                    │                    │
     │                  │<───────────────────│                    │
     │                  │ TimeSeriesDataPoint│                    │
     │                  │                    │                    │
     │                  │ Update node metrics│                    │
     │<─────────────────│ (setNodes)         │                    │
     │                  │                    │                    │
     ├──────────────────┼────────────────────┼────────────────────┤
     │                  │ END LOOP           │                    │
     ├──────────────────┼────────────────────┼────────────────────┤
     │                  │                    │                    │
     │                  │ finalizeSimulation()                    │
     │                  │───────────────────>│                    │
     │                  │                    │                    │
     │                  │<───────────────────│                    │
     │                  │ SimulationResult   │                    │
     │                  │                    │                    │
     │                  │                    │ Display results    │
     │                  │────────────────────────────────────────>│
     │                  │                    │                    │
```

### 7.4 AI Agent Flow

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  Chat UI │     │  /api/agent  │     │  LangGraph   │     │   OpenAI     │
└────┬─────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
     │                  │                    │                    │
     │ "Design a URL    │                    │                    │
     │  shortener"      │                    │                    │
     │─────────────────>│                    │                    │
     │                  │                    │                    │
     │                  │ buildAgentGraph()  │                    │
     │                  │───────────────────>│                    │
     │                  │                    │                    │
     │                  │                    │ analyzeNode()      │
     │                  │                    │───────────────────>│
     │                  │                    │ (Extract requirements)
     │                  │                    │<───────────────────│
     │                  │                    │                    │
     │                  │                    │ shouldBuild()?     │
     │                  │                    │                    │
     │                  │                    │ [NO - Need more info]
     │                  │                    │                    │
     │                  │                    │ clarifyNode()      │
     │                  │                    │───────────────────>│
     │                  │                    │<───────────────────│
     │                  │                    │                    │
     │                  │<───────────────────│                    │
     │                  │ {type: "clarification", questions: [...]}
     │                  │                    │                    │
     │<─────────────────│                    │                    │
     │ "What's your     │                    │                    │
     │  budget?"        │                    │                    │
     │                  │                    │                    │
     │ "$500/month"     │                    │                    │
     │─────────────────>│                    │                    │
     │                  │                    │                    │
     │                  │ invoke() with      │                    │
     │                  │ updated state      │                    │
     │                  │───────────────────>│                    │
     │                  │                    │                    │
     │                  │                    │ analyzeNode()      │
     │                  │                    │───────────────────>│
     │                  │                    │<───────────────────│
     │                  │                    │                    │
     │                  │                    │ shouldBuild()?     │
     │                  │                    │                    │
     │                  │                    │ [YES - Have enough info]
     │                  │                    │                    │
     │                  │                    │ generateNode()     │
     │                  │                    │───────────────────>│
     │                  │                    │ (Generate AQL)     │
     │                  │                    │<───────────────────│
     │                  │                    │                    │
     │                  │<───────────────────│                    │
     │                  │ {type: "execution", commands: [...]}    │
     │                  │                    │                    │
     │<─────────────────│                    │                    │
     │                  │                    │                    │
     │ Execute AQL      │                    │                    │
     │ commands locally │                    │                    │
     │                  │                    │                    │
```

### 7.5 AQL Command Execution Flow

```
┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ Terminal │     │  AQL Parser  │     │   Handlers   │     │ React State  │
└────┬─────┘     └──────┬───────┘     └──────┬───────┘     └──────┬───────┘
     │                  │                    │                    │
     │ "add api_server  │                    │                    │
     │  as API using    │                    │                    │
     │  aws-lambda"     │                    │                    │
     │─────────────────>│                    │                    │
     │                  │                    │                    │
     │                  │ parseAQLCommand()  │                    │
     │                  │                    │                    │
     │                  │ Tokenize & Parse   │                    │
     │                  │                    │                    │
     │                  │ {                  │                    │
     │                  │   type: "add",     │                    │
     │                  │   componentType:   │                    │
     │                  │     "api_server",  │                    │
     │                  │   label: "API",    │                    │
     │                  │   serviceId:       │                    │
     │                  │     "aws-lambda"   │                    │
     │                  │ }                  │                    │
     │                  │                    │                    │
     │                  │───────────────────>│                    │
     │                  │                    │                    │
     │                  │                    │ executeAddCommand()│
     │                  │                    │                    │
     │                  │                    │ Create node object │
     │                  │                    │ with service config│
     │                  │                    │                    │
     │                  │                    │ addComponent()     │
     │                  │                    │───────────────────>│
     │                  │                    │                    │
     │                  │                    │                    │ setNodes()
     │                  │                    │                    │
     │                  │                    │<───────────────────│
     │                  │                    │ {success: true}    │
     │                  │                    │                    │
     │                  │<───────────────────│                    │
     │                  │                    │                    │
     │<─────────────────│                    │                    │
     │ "Added API       │                    │                    │
     │  (aws-lambda)"   │                    │                    │
     │                  │                    │                    │
```

---

## 8. Key Design Decisions

### 8.1 Why Client-Side Simulation?

**Decision:** Run simulation engine in the browser, not on the server.

**Rationale:**
1. **Real-time Feedback** - No network latency for each tick
2. **Scalability** - No server load for simulations
3. **Offline Support** - Works without internet (except AI features)
4. **Cost** - No compute costs for simulation

**Trade-off:** Limited to browser's computational power (~60 seconds max simulation)

### 8.2 Why JSON for Architecture Storage?

**Decision:** Store nodes/edges as JSONB instead of normalized tables.

**Rationale:**
1. **Schema Flexibility** - Different component types have different configs
2. **Atomic Saves** - Entire design saved in one transaction
3. **Direct Mapping** - No ORM transformation needed for @xyflow/react

### 8.3 Why LangGraph for AI Agent?

**Decision:** Use LangGraph instead of simple prompt chaining.

**Rationale:**
1. **State Management** - Tracks conversation context and requirements
2. **Conditional Routing** - Clarify vs Generate based on completeness
3. **Iterative Refinement** - Evaluate → Refine loop for optimization

### 8.4 Why AQL (Custom DSL)?

**Decision:** Create a domain-specific language for architecture manipulation.

**Rationale:**
1. **AI Integration** - Easier for LLM to generate structured commands
2. **Scriptability** - Users can batch operations
3. **Undo/Redo** - Commands are atomic and reversible
4. **Testability** - Commands can be unit tested

---

## 9. Talking Points for Q&A

### Scalability Questions

**Q: How would you scale this to 10,000 users?**

A: Current architecture handles this easily:
- Stateless API servers behind load balancer
- PostgreSQL with read replicas for design queries
- Redis for session storage (currently in-memory)
- CDN for static assets

**Q: What if simulation becomes too slow?**

A: Options:
1. Web Workers for parallel computation
2. WASM for performance-critical paths
3. Server-side simulation for complex architectures

### Security Questions

**Q: How do you prevent unauthorized access to designs?**

A: 
- JWT tokens with 7-day expiry
- Server-side validation of userId on every request
- Designs filtered by authenticated user's ID

**Q: How do you handle password security?**

A:
- bcrypt with 10 rounds (adaptive cost)
- Reset tokens hashed before storage
- Timing-safe comparison for token validation

### Database Questions

**Q: Why PostgreSQL over MongoDB?**

A:
- Relational integrity for User → Design relationship
- JSONB gives us document flexibility where needed
- Prisma ORM provides type safety

**Q: How do you handle concurrent edits?**

A:
- Currently: Last write wins (acceptable for single-user designs)
- Future: Operational Transform or CRDT for real-time collaboration

---

## 10. Demo Script (if time permits)

1. **Create Architecture** (2 min)
   - Drag Client, Load Balancer, API Server, Database
   - Connect components

2. **Configure Components** (1 min)
   - Select API Server
   - Change to AWS Lambda
   - Set latency override

3. **Run Simulation** (2 min)
   - Set 1000 concurrent users
   - Run 30-second simulation
   - Show bottleneck detection

4. **AI Agent** (2 min)
   - "Add caching to reduce database load"
   - Show generated AQL commands
   - Re-run simulation

---

## Appendix: Service Catalog (30+ Services)

| Category | Services |
|----------|----------|
| Load Balancer | AWS ALB, AWS NLB, Nginx |
| API Server | EC2 t3.medium, EC2 c5.xlarge, EC2 c5.4xlarge, Lambda, Fargate |
| Cache | ElastiCache Redis, ElastiCache Memcached, Self-managed Redis |
| Database | RDS MySQL, RDS PostgreSQL, Aurora, DynamoDB, MongoDB Atlas |
| Message Queue | SQS, SNS, MSK (Kafka), RabbitMQ |
| Worker | EC2 Worker, Lambda Worker |
| Notification | SES, SNS Push |
| Rate Limiter | Generic, Redis-backed |

Each service includes:
- Base latency (ms)
- Max throughput (RPS)
- Cost per hour ($)
- Cost per request (for serverless)
