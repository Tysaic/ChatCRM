# Guía de Angular para ChatCRM

## Tabla de Contenidos

1. [Qué es Angular](#qué-es-angular)
2. [Estructura del Proyecto](#estructura-del-proyecto)
3. [Archivos Creados y su Función](#archivos-creados-y-su-función)
4. [Comandos Principales](#comandos-principales)
5. [Conceptos Básicos de Angular](#conceptos-básicos-de-angular)
6. [Cómo Crear Login y Signup](#cómo-crear-login-y-signup)
7. [Conexión con Django API](#conexión-con-django-api)
8. [Limpieza de Archivos](#limpieza-de-archivos)
9. [Próximos Pasos](#próximos-pasos)

---

## Qué es Angular

Angular es un framework de desarrollo web creado por Google para construir aplicaciones de una sola página (SPA). Características principales:

- **Componentes**: Bloques de construcción reutilizables (HTML + CSS + TypeScript)
- **TypeScript**: JavaScript con tipos estáticos (menos errores)
- **Servicios**: Lógica compartida entre componentes (como llamadas a API)
- **Routing**: Navegación entre páginas sin recargar
- **Two-way binding**: Sincronización automática entre vista y datos

---

## Estructura del Proyecto

```
chat-app/
├── src/
│   ├── app/                          # Código de la aplicación
│   │   ├── components/               # Componentes reutilizables
│   │   ├── pages/                    # Páginas completas
│   │   ├── services/                 # Servicios (API, auth, etc.)
│   │   │   └── api.service.ts        # ✅ Creado - Conexión con Django
│   │   ├── models/                   # Interfaces/tipos TypeScript
│   │   │   └── chat.model.ts         # ✅ Creado - Modelos de datos
│   │   ├── guards/                   # Protección de rutas
│   │   │   └── auth.guard.ts         # ✅ Creado - Verificar login
│   │   ├── app.component.ts          # Componente raíz
│   │   ├── app.component.html        # HTML del componente raíz
│   │   ├── app.component.scss        # Estilos del componente raíz
│   │   ├── app.config.ts             # ✅ Configurado - Providers
│   │   └── app.routes.ts             # Definición de rutas
│   │
│   ├── assets/                       # Archivos estáticos
│   │   ├── css/                      # ✅ Copiado de plantilla HTML
│   │   ├── fonts/                    # ✅ Copiado de plantilla HTML
│   │   ├── images/                   # ✅ Copiado de plantilla HTML
│   │   └── js/                       # ✅ Copiado de plantilla HTML
│   │
│   ├── environments/                 # Configuración por entorno
│   │   ├── environment.ts            # ✅ Creado - Desarrollo
│   │   └── environment.prod.ts       # ✅ Creado - Producción
│   │
│   ├── index.html                    # HTML principal
│   ├── main.ts                       # Punto de entrada
│   └── styles.scss                   # Estilos globales
│
├── angular.json                      # Configuración de Angular CLI
├── package.json                      # Dependencias npm
├── tsconfig.json                     # Configuración TypeScript
└── node_modules/                     # Dependencias instaladas
```

---

## Archivos Creados y su Función

### 1. `src/environments/environment.ts`
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000/api'  // URL de tu Django
};
```
**Función**: Define la URL base de tu API Django. En desarrollo apunta a localhost:8000.

---

### 2. `src/app/services/api.service.ts`
**Función**: Servicio central para todas las llamadas HTTP a Django.

| Método | Descripción |
|--------|-------------|
| `login(username, password)` | Autenticar usuario |
| `register(userData)` | Registrar nuevo usuario |
| `getChats()` | Obtener lista de chats |
| `getMessages(chatId)` | Obtener mensajes de un chat |
| `sendMessage(chatId, content, image?)` | Enviar mensaje |
| `getContacts()` | Obtener contactos |

---

### 3. `src/app/models/chat.model.ts`
**Función**: Define la estructura de los datos (tipado TypeScript).

```typescript
interface User {
  id: number;
  username: string;
  email: string;
  // ...
}

interface Message {
  id: number;
  content: string;
  sender: User;
  // ...
}
```

---

### 4. `src/app/guards/auth.guard.ts`
**Función**: Protege rutas que requieren autenticación.

```typescript
// Si no hay token, redirige a /login
if (!token) {
  router.navigate(['/login']);
  return false;
}
```

---

### 5. `src/app/app.config.ts`
**Función**: Configura los providers globales de Angular.

```typescript
providers: [
  provideRouter(routes),      // Sistema de rutas
  provideHttpClient()         // Cliente HTTP para API
]
```

---

## Comandos Principales

### Instalación inicial (ya ejecutado)
```bash
# Instalar dependencias
cd /home/r0gue0ne/Projects/ChatCRM/client/chat-app
npm install
```

### Servidor de desarrollo
```bash
# Iniciar servidor en http://localhost:4200
npx ng serve

# Con puerto específico
npx ng serve --port 4200

# Abrir navegador automáticamente
npx ng serve --open
```

### Compilar para producción
```bash
# Genera carpeta dist/ optimizada
npx ng build

# Build con configuración de producción
npx ng build --configuration=production
```

### Generar componentes/servicios
```bash
# Crear componente
npx ng generate component nombre-componente
npx ng g c nombre-componente  # Forma corta

# Crear servicio
npx ng generate service nombre-servicio
npx ng g s nombre-servicio  # Forma corta

# Crear en carpeta específica
npx ng g c pages/login
npx ng g c pages/chat
npx ng g c components/sidebar
```

### Otros comandos útiles
```bash
# Ver ayuda
npx ng help

# Actualizar Angular
npx ng update

# Agregar librería
npx ng add @angular/material
```

---

## Conceptos Básicos de Angular

### 1. Componentes
Un componente tiene 3 archivos:

```
login/
├── login.component.ts      # Lógica (TypeScript)
├── login.component.html    # Vista (HTML)
└── login.component.scss    # Estilos (CSS/SCSS)
```

**Ejemplo básico:**
```typescript
// login.component.ts
@Component({
  selector: 'app-login',           // Cómo usarlo: <app-login></app-login>
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  username = '';
  password = '';

  onLogin() {
    console.log('Login:', this.username);
  }
}
```

```html
<!-- login.component.html -->
<input [(ngModel)]="username" placeholder="Usuario">
<input [(ngModel)]="password" type="password">
<button (click)="onLogin()">Entrar</button>
```

### 2. Interpolación y Binding

| Sintaxis | Nombre | Ejemplo |
|----------|--------|---------|
| `{{ variable }}` | Interpolación | `<p>{{ username }}</p>` |
| `[propiedad]="valor"` | Property binding | `<input [value]="nombre">` |
| `(evento)="funcion()"` | Event binding | `<button (click)="login()">` |
| `[(ngModel)]="variable"` | Two-way binding | `<input [(ngModel)]="email">` |

### 3. Directivas comunes

```html
<!-- *ngIf - Condicional -->
<div *ngIf="isLoggedIn">Bienvenido</div>
<div *ngIf="!isLoggedIn">Por favor inicia sesión</div>

<!-- *ngFor - Bucle -->
<ul>
  <li *ngFor="let chat of chats">{{ chat.name }}</li>
</ul>

<!-- [ngClass] - Clases dinámicas -->
<div [ngClass]="{'active': isActive, 'disabled': isDisabled}">
```

### 4. Servicios e Inyección de Dependencias

```typescript
// En el componente
constructor(private apiService: ApiService) {}

ngOnInit() {
  this.apiService.getChats().subscribe(chats => {
    this.chats = chats;
  });
}
```

### 5. Rutas

```typescript
// app.routes.ts
export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'chat', component: ChatComponent, canActivate: [authGuard] },
];
```

---

## Cómo Crear Login y Signup

### Paso 1: Generar los componentes

```bash
cd /home/r0gue0ne/Projects/ChatCRM/client/chat-app

# Crear páginas
npx ng g c pages/login
npx ng g c pages/signup
npx ng g c pages/chat
```

### Paso 2: Configurar las rutas

Editar `src/app/app.routes.ts`:

```typescript
import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { SignupComponent } from './pages/signup/signup.component';
import { ChatComponent } from './pages/chat/chat.component';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'signup', component: SignupComponent },
  { path: 'chat', component: ChatComponent, canActivate: [authGuard] }
];
```

### Paso 3: Crear el Login

**login.component.ts:**
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

  onLogin() {
    this.loading = true;
    this.error = '';

    this.apiService.login(this.username, this.password).subscribe({
      next: (response) => {
        localStorage.setItem('access_token', response.access);
        localStorage.setItem('refresh_token', response.refresh);
        this.router.navigate(['/chat']);
      },
      error: (err) => {
        this.error = 'Usuario o contraseña incorrectos';
        this.loading = false;
      }
    });
  }
}
```

**login.component.html:**
```html
<div class="account-pages my-5 pt-sm-5">
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-md-8 col-lg-6 col-xl-5">
        <div class="text-center mb-4">
          <h4>Iniciar Sesión</h4>
          <p class="text-muted">Ingresa tus credenciales para continuar</p>
        </div>

        <div class="card">
          <div class="card-body p-4">
            <div *ngIf="error" class="alert alert-danger">
              {{ error }}
            </div>

            <form (ngSubmit)="onLogin()">
              <div class="mb-3">
                <label class="form-label">Usuario</label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="username"
                  name="username"
                  placeholder="Ingresa tu usuario"
                  required
                >
              </div>

              <div class="mb-3">
                <label class="form-label">Contraseña</label>
                <input
                  type="password"
                  class="form-control"
                  [(ngModel)]="password"
                  name="password"
                  placeholder="Ingresa tu contraseña"
                  required
                >
              </div>

              <div class="d-grid">
                <button
                  type="submit"
                  class="btn btn-primary"
                  [disabled]="loading"
                >
                  {{ loading ? 'Cargando...' : 'Iniciar Sesión' }}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div class="mt-5 text-center">
          <p>¿No tienes cuenta? <a routerLink="/signup" class="fw-medium text-primary">Regístrate</a></p>
        </div>
      </div>
    </div>
  </div>
</div>
```

### Paso 4: Crear el Signup

**signup.component.ts:**
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
  username = '';
  email = '';
  password = '';
  confirmPassword = '';
  error = '';
  loading = false;

  constructor(
    private apiService: ApiService,
    private router: Router
  ) {}

  onSignup() {
    if (this.password !== this.confirmPassword) {
      this.error = 'Las contraseñas no coinciden';
      return;
    }

    this.loading = true;
    this.error = '';

    const userData = {
      username: this.username,
      email: this.email,
      password: this.password
    };

    this.apiService.register(userData).subscribe({
      next: () => {
        this.router.navigate(['/login']);
      },
      error: (err) => {
        this.error = err.error?.message || 'Error al registrar usuario';
        this.loading = false;
      }
    });
  }
}
```

**signup.component.html:**
```html
<div class="account-pages my-5 pt-sm-5">
  <div class="container">
    <div class="row justify-content-center">
      <div class="col-md-8 col-lg-6 col-xl-5">
        <div class="text-center mb-4">
          <h4>Crear Cuenta</h4>
          <p class="text-muted">Regístrate para comenzar</p>
        </div>

        <div class="card">
          <div class="card-body p-4">
            <div *ngIf="error" class="alert alert-danger">
              {{ error }}
            </div>

            <form (ngSubmit)="onSignup()">
              <div class="mb-3">
                <label class="form-label">Usuario</label>
                <input
                  type="text"
                  class="form-control"
                  [(ngModel)]="username"
                  name="username"
                  required
                >
              </div>

              <div class="mb-3">
                <label class="form-label">Email</label>
                <input
                  type="email"
                  class="form-control"
                  [(ngModel)]="email"
                  name="email"
                  required
                >
              </div>

              <div class="mb-3">
                <label class="form-label">Contraseña</label>
                <input
                  type="password"
                  class="form-control"
                  [(ngModel)]="password"
                  name="password"
                  required
                >
              </div>

              <div class="mb-3">
                <label class="form-label">Confirmar Contraseña</label>
                <input
                  type="password"
                  class="form-control"
                  [(ngModel)]="confirmPassword"
                  name="confirmPassword"
                  required
                >
              </div>

              <div class="d-grid">
                <button
                  type="submit"
                  class="btn btn-primary"
                  [disabled]="loading"
                >
                  {{ loading ? 'Cargando...' : 'Registrarse' }}
                </button>
              </div>
            </form>
          </div>
        </div>

        <div class="mt-5 text-center">
          <p>¿Ya tienes cuenta? <a routerLink="/login" class="fw-medium text-primary">Inicia Sesión</a></p>
        </div>
      </div>
    </div>
  </div>
</div>
```

### Paso 5: Actualizar app.component.html

Reemplazar el contenido de `src/app/app.component.html` con:

```html
<router-outlet></router-outlet>
```

---

## Conexión con Django API

### Verificar que Django esté corriendo

```bash
# En otra terminal
cd /home/r0gue0ne/Projects/ChatCRM/server
python manage.py runserver
```

### Endpoints que usa el ApiService

| Angular Method | Django Endpoint | Método HTTP |
|----------------|-----------------|-------------|
| `login()` | `/api/token/` | POST |
| `register()` | `/api/register/` | POST |
| `getChats()` | `/api/chats/` | GET |
| `getMessages()` | `/api/chats/{id}/messages/` | GET |
| `sendMessage()` | `/api/chats/{id}/messages/` | POST |
| `getContacts()` | `/api/contacts/` | GET |

### CORS en Django

Asegúrate de tener en `settings.py`:

```python
INSTALLED_APPS = [
    # ...
    'corsheaders',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',  # Al inicio
    # ...
]

CORS_ALLOWED_ORIGINS = [
    "http://localhost:4200",
]
```

---

## Limpieza de Archivos

### Archivos que PUEDES BORRAR

Estas carpetas ya no son necesarias porque los assets fueron copiados a Angular:

```
client/
├── Documentation/     # ✅ Puedes borrar (documentación de la plantilla)
├── HTML/              # ✅ Puedes borrar (plantilla original)
├── Sketch/            # ✅ Puedes borrar (archivos de diseño)
└── chat-app/          # ❌ NO BORRAR (tu proyecto Angular)
```

### Comando para limpiar

```bash
cd /home/r0gue0ne/Projects/ChatCRM/client

# Borrar carpetas innecesarias
rm -rf Documentation HTML Sketch
```

### Estructura final después de limpiar

```
ChatCRM/
├── client/
│   └── chat-app/          # Proyecto Angular
│       ├── src/
│       ├── node_modules/
│       └── ...
│
└── server/                # Backend Django
    ├── apps/
    ├── ChatCRM/
    ├── manage.py
    └── ...
```

---

## Próximos Pasos

### Orden recomendado de desarrollo

1. **[ ] Crear componentes Login y Signup**
   ```bash
   npx ng g c pages/login
   npx ng g c pages/signup
   ```

2. **[ ] Configurar rutas**
   - Editar `app.routes.ts`

3. **[ ] Probar autenticación**
   - Iniciar Django: `python manage.py runserver`
   - Iniciar Angular: `npx ng serve`
   - Probar login/signup

4. **[ ] Crear página de Chat**
   ```bash
   npx ng g c pages/chat
   ```

5. **[ ] Crear componentes del chat**
   ```bash
   npx ng g c components/sidebar
   npx ng g c components/chat-list
   npx ng g c components/message-list
   npx ng g c components/message-input
   ```

6. **[ ] Implementar WebSockets (opcional)**
   - Para mensajes en tiempo real

### Recursos de aprendizaje

- [Documentación oficial de Angular](https://angular.dev)
- [Tutorial de Angular](https://angular.dev/tutorials)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/)

---

## Resumen de Comandos

```bash
# Navegar al proyecto
cd /home/r0gue0ne/Projects/ChatCRM/client/chat-app

# Iniciar servidor de desarrollo
npx ng serve

# Crear componente
npx ng g c pages/nombre

# Crear servicio
npx ng g s services/nombre

# Build producción
npx ng build

# Limpiar plantillas (opcional)
cd /home/r0gue0ne/Projects/ChatCRM/client
rm -rf Documentation HTML Sketch
```

---

**Fecha de creación**: Enero 2026
**Angular version**: 18.x LTS
**Node.js version**: 22.x
