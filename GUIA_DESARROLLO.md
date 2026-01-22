# Guia de Desarrollo - ChatCRM

Esta guia explica como crear el sistema de autenticacion (login/signup) y la interfaz de chat en Angular conectando con el backend Django existente.

---

## 1. Estructura del Backend (Ya Implementado)

### Endpoints de Autenticacion

| Metodo | Endpoint | Descripcion |
|--------|----------|-------------|
| POST | `/api/v1/signup` | Registro de usuario |
| POST | `/api/v1/login` | Login (devuelve JWT) |

### Modelo de Usuario (server/apps/user/models.py)

```python
class User(AbstractUser):
    userId = ShortUUIDField()
    image = models.ImageField(upload_to="user")
```

### Serializers (server/apps/user/serializers.py)

**LoginSerializer** - Acepta username o email:
```python
class LoginSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username_or_email = attrs.get("username")
        password = attrs.get("password")

        if '@' in username_or_email:
            user_obj = User.objects.get(email=username_or_email)
            username_or_email = user_obj.username

        # Retorna: refresh, access, userId
```

**SignupSerializer** - Campos requeridos:
```python
fields = ('first_name', 'last_name', 'username', 'email', 'password', 'passwordTwo', 'image')
```

---

## 2. Configuracion Angular

### 2.1 Crear Modelos (src/app/models/)

**auth.model.ts**
```typescript
export interface LoginRequest {
  username: string;  // puede ser username o email
  password: string;
}

export interface LoginResponse {
  refresh: string;
  access: string;
  userId: string;
}

export interface SignupRequest {
  first_name: string;
  last_name: string;
  username: string;
  email: string;
  password: string;
  passwordTwo: string;
  image?: File;
}

export interface SignupResponse {
  id: number;
  userId: string;
  message: string;
}
```

**user.model.ts**
```typescript
export interface User {
  id: number;
  image: string;
  first_name: string;
  last_name: string;
}
```

### 2.2 Actualizar ApiService (src/app/services/api.service.ts)

```typescript
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { LoginRequest, LoginResponse, SignupRequest, SignupResponse } from '../models/auth.model';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;
  private isAuthenticated = new BehaviorSubject<boolean>(this.hasToken());

  constructor(private http: HttpClient) {}

  // ========== AUTH ==========

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/v1/login`, credentials)
      .pipe(
        tap(response => {
          localStorage.setItem('access_token', response.access);
          localStorage.setItem('refresh_token', response.refresh);
          localStorage.setItem('userId', response.userId);
          this.isAuthenticated.next(true);
        })
      );
  }

  signup(userData: SignupRequest): Observable<SignupResponse> {
    // Sin imagen - JSON
    if (!userData.image) {
      return this.http.post<SignupResponse>(`${this.apiUrl}/v1/signup`, userData);
    }

    // Con imagen - FormData
    const formData = new FormData();
    formData.append('first_name', userData.first_name);
    formData.append('last_name', userData.last_name);
    formData.append('username', userData.username);
    formData.append('email', userData.email);
    formData.append('password', userData.password);
    formData.append('passwordTwo', userData.passwordTwo);
    formData.append('image', userData.image);

    return this.http.post<SignupResponse>(`${this.apiUrl}/v1/signup`, formData);
  }

  logout(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('userId');
    this.isAuthenticated.next(false);
  }

  isLoggedIn(): Observable<boolean> {
    return this.isAuthenticated.asObservable();
  }

  private hasToken(): boolean {
    return !!localStorage.getItem('access_token');
  }

  // ========== HEADERS ==========

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  // ========== CHATS ==========

  getUserChats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/v1/user/chats`, {
      headers: this.getAuthHeaders()
    });
  }

  createChat(name: string, type: string, members: number[]): Observable<any> {
    return this.http.post(`${this.apiUrl}/v1/chats/create`,
      { name, type, members },
      { headers: this.getAuthHeaders() }
    );
  }

  // ========== MESSAGES ==========

  getMessages(roomId: string, limit = 20, offset = 0): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/v1/chats/messages/${roomId}?limit=${limit}&offset=${offset}`,
      { headers: this.getAuthHeaders() }
    );
  }

  sendMessage(roomId: string, message: string, image?: File): Observable<any> {
    if (!image) {
      return this.http.post(`${this.apiUrl}/v1/chats/messages`,
        { roomId, message },
        { headers: this.getAuthHeaders() }
      );
    }

    const formData = new FormData();
    formData.append('roomId', roomId);
    formData.append('message', message);
    formData.append('image', image);

    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });

    return this.http.post(`${this.apiUrl}/v1/chats/messages`, formData, { headers });
  }

  // ========== USERS ==========

  getUsers(exclude?: number[]): Observable<any> {
    let url = `${this.apiUrl}/v1/users`;
    if (exclude && exclude.length > 0) {
      url += `?exclude=${exclude.join(',')}`;
    }
    return this.http.get(url, { headers: this.getAuthHeaders() });
  }
}
```

### 2.3 Crear AuthGuard (src/app/guards/auth.guard.ts)

```typescript
import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('access_token');

  if (token) {
    return true;
  }

  router.navigate(['/login']);
  return false;
};

export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('access_token');

  if (!token) {
    return true;
  }

  router.navigate(['/chat']);
  return false;
};
```

---

## 3. Componentes de Autenticacion

### 3.1 Componente Login (src/app/pages/login/)

**login.component.ts**
```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  username = '';
  password = '';
  error = '';
  loading = false;

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  onSubmit(): void {
    if (!this.username || !this.password) {
      this.error = 'Por favor complete todos los campos';
      return;
    }

    this.loading = true;
    this.error = '';

    this.apiService.login({ username: this.username, password: this.password })
      .subscribe({
        next: () => {
          this.router.navigate(['/chat']);
        },
        error: (err) => {
          this.loading = false;
          this.error = err.error?.detail || 'Credenciales invalidas';
        }
      });
  }
}
```

**login.component.html**
```html
<div class="login-container">
  <div class="login-card">
    <h2>Iniciar Sesion</h2>

    <form (ngSubmit)="onSubmit()">
      <div class="form-group">
        <label for="username">Usuario o Email</label>
        <input
          type="text"
          id="username"
          [(ngModel)]="username"
          name="username"
          class="form-control"
          placeholder="usuario@ejemplo.com"
        >
      </div>

      <div class="form-group">
        <label for="password">Contrasena</label>
        <input
          type="password"
          id="password"
          [(ngModel)]="password"
          name="password"
          class="form-control"
          placeholder="********"
        >
      </div>

      @if (error) {
        <div class="alert alert-danger">{{ error }}</div>
      }

      <button
        type="submit"
        class="btn btn-primary w-100"
        [disabled]="loading"
      >
        {{ loading ? 'Cargando...' : 'Iniciar Sesion' }}
      </button>
    </form>

    <p class="mt-3 text-center">
      No tienes cuenta? <a routerLink="/signup">Registrarse</a>
    </p>
  </div>
</div>
```

**login.component.scss**
```scss
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  background: white;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
  width: 100%;
  max-width: 400px;

  h2 {
    text-align: center;
    margin-bottom: 1.5rem;
    color: #333;
  }

  .form-group {
    margin-bottom: 1rem;

    label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 500;
    }
  }
}
```

### 3.2 Componente Signup (src/app/pages/signup/)

**signup.component.ts**
```typescript
import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './signup.component.html',
  styleUrl: './signup.component.scss'
})
export class SignupComponent {
  formData = {
    first_name: '',
    last_name: '',
    username: '',
    email: '',
    password: '',
    passwordTwo: ''
  };
  selectedImage: File | null = null;
  imagePreview: string | null = null;
  error = '';
  loading = false;

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  onImageSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedImage = input.files[0];

      const reader = new FileReader();
      reader.onload = () => {
        this.imagePreview = reader.result as string;
      };
      reader.readAsDataURL(this.selectedImage);
    }
  }

  onSubmit(): void {
    // Validaciones
    if (this.formData.password !== this.formData.passwordTwo) {
      this.error = 'Las contrasenas no coinciden';
      return;
    }

    if (!this.formData.first_name || !this.formData.last_name ||
        !this.formData.username || !this.formData.email || !this.formData.password) {
      this.error = 'Por favor complete todos los campos obligatorios';
      return;
    }

    this.loading = true;
    this.error = '';

    const signupData = {
      ...this.formData,
      image: this.selectedImage || undefined
    };

    this.apiService.signup(signupData)
      .subscribe({
        next: () => {
          this.router.navigate(['/login']);
        },
        error: (err) => {
          this.loading = false;
          if (err.error?.email) {
            this.error = 'Este email ya esta registrado';
          } else if (err.error?.username) {
            this.error = 'Este nombre de usuario ya existe';
          } else if (err.error?.password) {
            this.error = err.error.password[0];
          } else {
            this.error = 'Error al registrar usuario';
          }
        }
      });
  }
}
```

**signup.component.html**
```html
<div class="signup-container">
  <div class="signup-card">
    <h2>Crear Cuenta</h2>

    <form (ngSubmit)="onSubmit()">
      <!-- Imagen de perfil -->
      <div class="form-group text-center">
        <div class="image-preview" (click)="fileInput.click()">
          @if (imagePreview) {
            <img [src]="imagePreview" alt="Preview">
          } @else {
            <div class="placeholder">
              <span>+</span>
              <small>Foto (opcional)</small>
            </div>
          }
        </div>
        <input
          type="file"
          #fileInput
          (change)="onImageSelected($event)"
          accept="image/*"
          hidden
        >
      </div>

      <div class="row">
        <div class="col-6">
          <div class="form-group">
            <label>Nombre</label>
            <input
              type="text"
              [(ngModel)]="formData.first_name"
              name="first_name"
              class="form-control"
              required
            >
          </div>
        </div>
        <div class="col-6">
          <div class="form-group">
            <label>Apellido</label>
            <input
              type="text"
              [(ngModel)]="formData.last_name"
              name="last_name"
              class="form-control"
              required
            >
          </div>
        </div>
      </div>

      <div class="form-group">
        <label>Usuario</label>
        <input
          type="text"
          [(ngModel)]="formData.username"
          name="username"
          class="form-control"
          required
        >
      </div>

      <div class="form-group">
        <label>Email</label>
        <input
          type="email"
          [(ngModel)]="formData.email"
          name="email"
          class="form-control"
          required
        >
      </div>

      <div class="form-group">
        <label>Contrasena</label>
        <input
          type="password"
          [(ngModel)]="formData.password"
          name="password"
          class="form-control"
          required
        >
      </div>

      <div class="form-group">
        <label>Confirmar Contrasena</label>
        <input
          type="password"
          [(ngModel)]="formData.passwordTwo"
          name="passwordTwo"
          class="form-control"
          required
        >
      </div>

      @if (error) {
        <div class="alert alert-danger">{{ error }}</div>
      }

      <button
        type="submit"
        class="btn btn-primary w-100"
        [disabled]="loading"
      >
        {{ loading ? 'Registrando...' : 'Crear Cuenta' }}
      </button>
    </form>

    <p class="mt-3 text-center">
      Ya tienes cuenta? <a routerLink="/login">Iniciar Sesion</a>
    </p>
  </div>
</div>
```

**signup.component.scss**
```scss
.signup-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 2rem 0;
}

.signup-card {
  background: white;
  padding: 2rem;
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
  width: 100%;
  max-width: 500px;

  h2 {
    text-align: center;
    margin-bottom: 1.5rem;
  }
}

.image-preview {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  border: 2px dashed #ccc;
  margin: 0 auto 1rem;
  cursor: pointer;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .placeholder {
    text-align: center;
    color: #999;

    span {
      font-size: 2rem;
      display: block;
    }
  }

  &:hover {
    border-color: #667eea;
  }
}

.form-group {
  margin-bottom: 1rem;

  label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }
}
```

---

## 4. Componente de Chat

### 4.1 Crear Componente Chat (src/app/pages/chat/)

**chat.component.ts**
```typescript
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

interface ChatRoom {
  roomId: string;
  name: string;
  type: string;
  member: any[];
}

interface Message {
  user: number;
  message: string;
  timestamp: string;
  userName: string;
  userImage: string;
  image?: string;
}

@Component({
  selector: 'app-chat',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.component.html',
  styleUrl: './chat.component.scss'
})
export class ChatComponent implements OnInit, OnDestroy {
  chats: ChatRoom[] = [];
  selectedChat: ChatRoom | null = null;
  messages: Message[] = [];
  newMessage = '';
  currentUserId: number = 0;
  private ws: WebSocket | null = null;

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.currentUserId = Number(localStorage.getItem('userId'));
    this.loadChats();
    this.connectWebSocket();
  }

  ngOnDestroy(): void {
    this.ws?.close();
  }

  loadChats(): void {
    this.apiService.getUserChats().subscribe({
      next: (chats) => {
        this.chats = chats;
        if (chats.length > 0 && !this.selectedChat) {
          this.selectChat(chats[0]);
        }
      },
      error: (err) => {
        if (err.status === 401) {
          this.router.navigate(['/login']);
        }
      }
    });
  }

  selectChat(chat: ChatRoom): void {
    this.selectedChat = chat;
    this.loadMessages(chat.roomId);
  }

  loadMessages(roomId: string): void {
    this.apiService.getMessages(roomId).subscribe({
      next: (response) => {
        this.messages = response.results.reverse();
      }
    });
  }

  connectWebSocket(): void {
    const userId = localStorage.getItem('userId');
    this.ws = new WebSocket(`ws://localhost:8000/ws/user/${userId}/chat/`);

    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.action === 'message' && data.roomId === this.selectedChat?.roomId) {
        this.messages.push(data);
      }
    };

    this.ws.onclose = () => {
      // Reconectar despues de 3 segundos
      setTimeout(() => this.connectWebSocket(), 3000);
    };
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.selectedChat) return;

    const messageData = {
      action: 'message',
      roomId: this.selectedChat.roomId,
      user: this.currentUserId,
      message: this.newMessage
    };

    this.ws?.send(JSON.stringify(messageData));
    this.newMessage = '';
  }

  logout(): void {
    this.apiService.logout();
    this.router.navigate(['/login']);
  }

  getChatDisplayName(chat: ChatRoom): string {
    if (chat.type === 'SELF') return 'Notas Personales';
    if (chat.name) return chat.name;

    const otherMember = chat.member.find(m => m.id !== this.currentUserId);
    return otherMember ? `${otherMember.first_name} ${otherMember.last_name}` : 'Chat';
  }
}
```

**chat.component.html**
```html
<div class="chat-container">
  <!-- Sidebar -->
  <div class="sidebar">
    <div class="sidebar-header">
      <h3>ChatCRM</h3>
      <button class="btn btn-sm btn-outline-light" (click)="logout()">
        Salir
      </button>
    </div>

    <div class="chat-list">
      @for (chat of chats; track chat.roomId) {
        <div
          class="chat-item"
          [class.active]="selectedChat?.roomId === chat.roomId"
          (click)="selectChat(chat)"
        >
          <div class="chat-avatar">
            @if (chat.member[0]?.image) {
              <img [src]="chat.member[0].image" alt="Avatar">
            } @else {
              <div class="avatar-placeholder">
                {{ getChatDisplayName(chat).charAt(0) }}
              </div>
            }
          </div>
          <div class="chat-info">
            <span class="chat-name">{{ getChatDisplayName(chat) }}</span>
            <span class="chat-type">{{ chat.type }}</span>
          </div>
        </div>
      }
    </div>
  </div>

  <!-- Chat Area -->
  <div class="chat-area">
    @if (selectedChat) {
      <div class="chat-header">
        <h4>{{ getChatDisplayName(selectedChat) }}</h4>
      </div>

      <div class="messages-container">
        @for (msg of messages; track msg.timestamp) {
          <div
            class="message"
            [class.own]="msg.user === currentUserId"
          >
            <div class="message-avatar">
              @if (msg.userImage) {
                <img [src]="msg.userImage" alt="Avatar">
              } @else {
                <div class="avatar-placeholder">{{ msg.userName?.charAt(0) }}</div>
              }
            </div>
            <div class="message-content">
              <span class="message-author">{{ msg.userName }}</span>
              <p class="message-text">{{ msg.message }}</p>
              @if (msg.image) {
                <img [src]="msg.image" class="message-image" alt="Imagen">
              }
              <span class="message-time">
                {{ msg.timestamp | date:'short' }}
              </span>
            </div>
          </div>
        }
      </div>

      <div class="message-input">
        <input
          type="text"
          [(ngModel)]="newMessage"
          (keyup.enter)="sendMessage()"
          placeholder="Escribe un mensaje..."
          class="form-control"
        >
        <button class="btn btn-primary" (click)="sendMessage()">
          Enviar
        </button>
      </div>
    } @else {
      <div class="no-chat-selected">
        <p>Selecciona un chat para comenzar</p>
      </div>
    }
  </div>
</div>
```

**chat.component.scss**
```scss
.chat-container {
  display: flex;
  height: 100vh;
}

.sidebar {
  width: 300px;
  background: #2c3e50;
  color: white;
  display: flex;
  flex-direction: column;
}

.sidebar-header {
  padding: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255,255,255,0.1);

  h3 {
    margin: 0;
  }
}

.chat-list {
  flex: 1;
  overflow-y: auto;
}

.chat-item {
  display: flex;
  align-items: center;
  padding: 1rem;
  cursor: pointer;
  border-bottom: 1px solid rgba(255,255,255,0.05);

  &:hover {
    background: rgba(255,255,255,0.1);
  }

  &.active {
    background: #3498db;
  }
}

.chat-avatar {
  width: 45px;
  height: 45px;
  border-radius: 50%;
  overflow: hidden;
  margin-right: 1rem;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: #667eea;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 1.2rem;
}

.chat-info {
  display: flex;
  flex-direction: column;

  .chat-name {
    font-weight: 500;
  }

  .chat-type {
    font-size: 0.8rem;
    opacity: 0.7;
  }
}

.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: #ecf0f1;
}

.chat-header {
  padding: 1rem;
  background: white;
  border-bottom: 1px solid #ddd;

  h4 {
    margin: 0;
  }
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.message {
  display: flex;
  margin-bottom: 1rem;

  &.own {
    flex-direction: row-reverse;

    .message-content {
      background: #3498db;
      color: white;

      .message-author {
        display: none;
      }
    }
  }
}

.message-avatar {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  overflow: hidden;
  margin: 0 0.5rem;
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.message-content {
  background: white;
  padding: 0.75rem 1rem;
  border-radius: 10px;
  max-width: 70%;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);

  .message-author {
    font-size: 0.8rem;
    font-weight: 600;
    color: #667eea;
    margin-bottom: 0.25rem;
    display: block;
  }

  .message-text {
    margin: 0;
    word-wrap: break-word;
  }

  .message-image {
    max-width: 200px;
    border-radius: 5px;
    margin-top: 0.5rem;
  }

  .message-time {
    font-size: 0.7rem;
    opacity: 0.6;
    display: block;
    margin-top: 0.25rem;
  }
}

.message-input {
  padding: 1rem;
  background: white;
  display: flex;
  gap: 0.5rem;
  border-top: 1px solid #ddd;

  input {
    flex: 1;
  }
}

.no-chat-selected {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
}
```

---

## 5. Configurar Rutas (src/app/app.routes.ts)

```typescript
import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'chat',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.component')
      .then(m => m.LoginComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'signup',
    loadComponent: () => import('./pages/signup/signup.component')
      .then(m => m.SignupComponent),
    canActivate: [guestGuard]
  },
  {
    path: 'chat',
    loadComponent: () => import('./pages/chat/chat.component')
      .then(m => m.ChatComponent),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'chat'
  }
];
```

---

## 6. Actualizar app.component (src/app/)

**app.component.ts**
```typescript
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: '<router-outlet></router-outlet>',
  styles: []
})
export class AppComponent {}
```

---

## 7. Comandos para Ejecutar

```bash
# Terminal 1 - Backend
cd server
source ../.venv/bin/activate
python manage.py runserver

# Terminal 2 - Frontend
cd client/chat-app
npm start
```

Acceder a:
- Frontend: http://localhost:4200
- API Docs: http://localhost:8000/api/docs/
- Admin: http://localhost:8000/backoffice_site/

---

## 8. Flujo de la Aplicacion

1. Usuario accede a `/login` o `/signup`
2. Al registrarse, se crea automaticamente un ChatRoom tipo "SELF" para notas personales
3. Al hacer login, se obtiene token JWT y se guarda en localStorage
4. Se redirige a `/chat` donde se cargan los chats del usuario
5. WebSocket conecta para mensajes en tiempo real
6. Usuario puede enviar mensajes de texto e imagenes
