# ChatCRM

REST API for chat/CRM system with JWT authentication.

## Base URL

```
http://localhost:8000/api/v1
```

---

## Run Server

```bash
daphne -b 0.0.0.0 -p 8000 ChatCRM.asgi:application
```

## 1. Authentication

### 1.1 User Registration (Signup)

**POST** `/signup`

Registers a new user in the system.

```bash
# Without profile image
curl -X POST http://localhost:8000/api/v1/signup \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe",
    "username": "johndoe",
    "email": "john@example.com",
    "password": "securepass123",
    "passwordTwo": "securepass123"
  }' | jq
```

```bash
# With profile image
curl -X POST http://localhost:8000/api/v1/signup \
  -F "first_name=John" \
  -F "last_name=Doe" \
  -F "username=johndoe" \
  -F "email=john@example.com" \
  -F "password=securepass123" \
  -F "passwordTwo=securepass123" \
  -F "image=@profile.jpeg"
```

**Successful Response (201):**
```json
{
  "id": 1,
  "userId": "uuid-string",
  "message": "User registered successfully"
}
```

---

### 1.2 Login

**POST** `/login`

Authenticates the user and returns JWT tokens. Accepts username or email.

```bash
# With username
curl -X POST http://localhost:8000/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "johndoe",
    "password": "securepass123"
  }' | jq
```

```bash
# With email
curl -X POST http://localhost:8000/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john@example.com",
    "password": "securepass123"
  }' | jq
```

**Successful Response (200):**
```json
{
  "refresh": "eyJ...",
  "access": "eyJ...",
  "userId": "uuid-string"
}
```

---

### 1.3 Get Token (Helper)

```bash
# Save token to environment variable
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/login \
  -H "Content-Type: application/json" \
  -d '{"username": "john@example.com", "password": "securepass123"}' \
  | jq -r '.access')
```

---

## 2. Users

### 2.1 List Users

**GET** `/users`

Lists all users in the system. Requires authentication.

```bash
curl -X GET http://localhost:8000/api/v1/users \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Query Parameters:**
| Parameter | Type   | Description                              |
|-----------|--------|------------------------------------------|
| exclude   | string | User IDs to exclude (comma-separated)    |
| limit     | int    | Number of results per page               |
| offset    | int    | Number of records to skip                |

```bash
# Exclude specific users
curl -X GET "http://localhost:8000/api/v1/users?exclude=1,2,3" \
  -H "Authorization: Bearer $TOKEN" | jq

# With pagination
curl -X GET "http://localhost:8000/api/v1/users?limit=10&offset=0" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Successful Response (200):**
```json
{
  "count": 10,
  "next": "http://localhost:8000/api/v1/users?limit=10&offset=10",
  "previous": null,
  "results": [
    {
      "id": 1,
      "image": "http://localhost:8000/media/profiles/image.jpg",
      "first_name": "John",
      "last_name": "Doe"
    }
  ]
}
```

---

## 3. Chat Rooms

### 3.1 List All Chat Rooms

**GET** `/chats`

Lists chat rooms where the authenticated user is a member.

```bash
curl -X GET http://localhost:8000/api/v1/chats \
  -H "Authorization: Bearer $TOKEN" | jq
```

---

### 3.2 List User's Chat Rooms

**GET** `/user/chats`

Lists the authenticated user's chat rooms.

```bash
curl -X GET http://localhost:8000/api/v1/user/chats \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Successful Response (200):**
```json
[
  {
    "roomId": "uuid-string",
    "name": "Chat Room Name",
    "type": "DUO",
    "member": [
      {
        "id": 1,
        "image": "http://localhost:8000/media/profiles/image.jpg",
        "first_name": "John",
        "last_name": "Doe"
      }
    ]
  }
]
```

---

### 3.3 Create Chat Room

**POST** `/chats/create`

Creates a new chat room. The authenticated user is automatically added as a member.

```bash
curl -X POST http://localhost:8000/api/v1/chats/create \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Project Discussion",
    "type": "GROUP",
    "members": [1, 2, 3]
  }' | jq
```

**Body Parameters:**
| Field   | Type   | Required | Description                        |
|---------|--------|----------|------------------------------------|
| name    | string | Yes      | Chat room name                     |
| type    | string | Yes      | Type: "SELF", "DUO", "GROUP"       |
| members | array  | Yes      | List of member user IDs            |

**Successful Response (201):**
```json
{
  "roomId": "uuid-string",
  "name": "Project Discussion",
  "type": "GROUP",
  "member": [...]
}
```

---

## 4. Messages

### 4.1 Send Message

**POST** `/chats/messages`

Sends a message to a chat room. User must be a member of the room.

```bash
curl -X POST http://localhost:8000/api/v1/chats/messages \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "room-uuid",
    "message": "Hello, this is my message"
  }' | jq
```

### With Image (Multipart Form Data)
```bash
curl -X POST http://localhost:8000/api/v1/chats/messages \
  -H "Authorization: Bearer $TOKEN" \
  -F "roomId=room-uuid" \
  -F "message=A Message with Image" \
  -F "image=@/home/r0gue0ne/Imagenes/Tesla.jpeg" | jq
```

### Only Image (No Text)
```bash
curl -X POST http://localhost:8000/api/v1/chats/messages \
  -H "Authorization: Bearer $TOKEN" \
  -F "roomId=room-uuid" \
  -F "message=" \
  -F "image=@/home/r0gue0ne/Imagenes/Tesla.jpeg" | jq
```

**Body Parameters:**
| Field   | Type   | Required | Description             |
|---------|--------|----------|-------------------------|
| roomId  | string | Yes      | Chat room UUID          |
| message | string | Yes      | Message content         |

**Successful Response (201):**
```json
{
  "roomId": "room-uuid",
  "user": 1,
  "message": "Hello, this is my message",
  "timestamp": "2024-01-15T10:30:00Z",
  "userName": "John - Doe",
  "userImage": "http://localhost:8000/media/profiles/image.jpg"
}
```

---

### 4.2 Get Chat Room Messages

**GET** `/chats/messages/<roomId>`

Gets messages from a specific chat room. User must be a member.

```bash
curl -X GET http://localhost:8000/api/v1/chats/messages/room-uuid \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Query Parameters:**
| Parameter | Type | Description                 |
|-----------|------|-----------------------------|
| limit     | int  | Number of messages per page |
| offset    | int  | Number of messages to skip  |

```bash
# With pagination
curl -X GET "http://localhost:8000/api/v1/chats/messages/room-uuid?limit=20&offset=0" \
  -H "Authorization: Bearer $TOKEN" | jq
```

**Successful Response (200):**
```json
{
  "count": 50,
  "next": "http://localhost:8000/api/v1/chats/messages/uuid?limit=20&offset=20",
  "previous": null,
  "results": [
    {
      "user": 1,
      "message": "Most recent message",
      "timestamp": "2024-01-15T10:30:00Z",
      "userName": "John - Doe",
      "userImage": "http://localhost:8000/media/profiles/image.jpg"
    }
  ]
}
```

---

## Endpoints Summary

| Method | Endpoint                      | Description              | Auth |
|--------|-------------------------------|--------------------------|------|
| POST   | `/signup`                     | Register user            | No   |
| POST   | `/login`                      | Login                    | No   |
| GET    | `/users`                      | List users               | Yes  |
| GET    | `/chats`                      | List chat rooms          | Yes  |
| GET    | `/user/chats`                 | User's chat rooms        | Yes  |
| POST   | `/chats/create`               | Create chat room         | Yes  |
| POST   | `/chats/messages`             | Send message             | Yes  |
| GET    | `/chats/messages/<roomId>`    | Get room messages        | Yes  |

---

## Common Error Codes

| Code | Description                              |
|------|------------------------------------------|
| 400  | Bad Request - Invalid or missing data    |
| 401  | Unauthorized - Invalid or expired token  |
| 403  | Forbidden - No permission for this action|
| 404  | Not Found - Resource not found           |