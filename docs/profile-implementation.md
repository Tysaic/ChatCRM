# 👤 Implementar Área de Perfil de Usuario

## 🎯 Objetivo

- Crear página de perfil con datos del usuario
- Formulario para editar información personal
- Subida y preview de foto de perfil
- Cambio de contraseña
- Integración con API del backend

---

## 📁 Archivos a Crear/Modificar

| Archivo | Acción |
|---------|--------|
| `pages/profile/profile.component.ts` | Crear |
| `pages/profile/profile.component.html` | Crear |
| `pages/profile/profile.component.scss` | Crear |
| `app.routes.ts` | Agregar ruta |
| `services/api.service.ts` | Agregar métodos |

---

## 1️⃣ Crear Componente de Perfil

### Comando:
```bash
ng generate component pages/profile --standalone
```

---

## 2️⃣ TypeScript (`profile.component.ts`)

```typescript
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../../services/api.service';

interface UserProfile {
    userId: string;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    image: string | null;
}

@Component({
    selector: 'app-profile',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterLink],
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {

    // Datos del usuario
    user: UserProfile = {
        userId: '',
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        image: null
    };

    // Formulario de edición
    editForm = {
        first_name: '',
        last_name: '',
        email: ''
    };

    // Cambio de contraseña
    passwordForm = {
        current_password: '',
        new_password: '',
        confirm_password: ''
    };

    // Estados
    loading = false;
    editing = false;
    changingPassword = false;

    // Mensajes
    successMessage = '';
    errorMessage = '';

    // Imagen
    selectedImage: File | null = null;
    imagePreview: string | null = null;

    constructor(
        private apiService: ApiService,
        private router: Router
    ) {}

    ngOnInit(): void {
        this.loadUserProfile();
    }

    // Cargar datos del perfil
    loadUserProfile(): void {
        this.loading = true;
        this.apiService.getUserProfile().subscribe({
            next: (data) => {
                this.user = data;
                this.editForm = {
                    first_name: data.first_name,
                    last_name: data.last_name,
                    email: data.email
                };
                this.loading = false;
            },
            error: (err) => {
                this.loading = false;
                if (err.status === 401) {
                    this.router.navigate(['/login']);
                }
            }
        });
    }

    // Activar modo edición
    toggleEdit(): void {
        this.editing = !this.editing;
        if (!this.editing) {
            // Resetear formulario si se cancela
            this.editForm = {
                first_name: this.user.first_name,
                last_name: this.user.last_name,
                email: this.user.email
            };
        }
        this.clearMessages();
    }

    // Guardar cambios del perfil
    saveProfile(): void {
        this.loading = true;
        this.clearMessages();

        this.apiService.updateUserProfile(this.editForm).subscribe({
            next: (data) => {
                this.user = { ...this.user, ...data };
                this.editing = false;
                this.loading = false;
                this.successMessage = 'Perfil actualizado correctamente';
            },
            error: (err) => {
                this.loading = false;
                this.errorMessage = err.error?.detail || 'Error al actualizar perfil';
            }
        });
    }

    // Seleccionar imagen
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

    // Subir imagen de perfil
    uploadImage(): void {
        if (!this.selectedImage) return;

        this.loading = true;
        this.clearMessages();

        this.apiService.updateProfileImage(this.selectedImage).subscribe({
            next: (data) => {
                this.user.image = data.image;
                this.selectedImage = null;
                this.imagePreview = null;
                this.loading = false;
                this.successMessage = 'Imagen actualizada correctamente';
            },
            error: (err) => {
                this.loading = false;
                this.errorMessage = 'Error al subir imagen';
            }
        });
    }

    // Cancelar subida de imagen
    cancelImageUpload(): void {
        this.selectedImage = null;
        this.imagePreview = null;
    }

    // Toggle cambio de contraseña
    togglePasswordChange(): void {
        this.changingPassword = !this.changingPassword;
        if (!this.changingPassword) {
            this.passwordForm = {
                current_password: '',
                new_password: '',
                confirm_password: ''
            };
        }
        this.clearMessages();
    }

    // Cambiar contraseña
    changePassword(): void {
        // Validar que las contraseñas coincidan
        if (this.passwordForm.new_password !== this.passwordForm.confirm_password) {
            this.errorMessage = 'Las contraseñas no coinciden';
            return;
        }

        // Validar longitud mínima
        if (this.passwordForm.new_password.length < 8) {
            this.errorMessage = 'La contraseña debe tener al menos 8 caracteres';
            return;
        }

        this.loading = true;
        this.clearMessages();

        this.apiService.changePassword({
            current_password: this.passwordForm.current_password,
            new_password: this.passwordForm.new_password
        }).subscribe({
            next: () => {
                this.changingPassword = false;
                this.passwordForm = {
                    current_password: '',
                    new_password: '',
                    confirm_password: ''
                };
                this.loading = false;
                this.successMessage = 'Contraseña cambiada correctamente';
            },
            error: (err) => {
                this.loading = false;
                this.errorMessage = err.error?.detail || 'Error al cambiar contraseña';
            }
        });
    }

    // Limpiar mensajes
    clearMessages(): void {
        this.successMessage = '';
        this.errorMessage = '';
    }

    // Volver al chat
    goBack(): void {
        this.router.navigate(['/chat']);
    }
}
```

---

## 3️⃣ HTML (`profile.component.html`)

```html
<div class="profile-page">
    <div class="container py-5">
        <div class="row justify-content-center">
            <div class="col-lg-8">

                <!-- Header -->
                <div class="d-flex align-items-center mb-4">
                    <button class="btn btn-link text-muted p-0 me-3" (click)="goBack()">
                        <i class="ri-arrow-left-line font-size-24"></i>
                    </button>
                    <h4 class="mb-0">Mi Perfil</h4>
                </div>

                <!-- Mensajes -->
                @if (successMessage) {
                    <div class="alert alert-success alert-dismissible fade show">
                        <i class="ri-check-line me-2"></i>{{ successMessage }}
                        <button type="button" class="btn-close" (click)="clearMessages()"></button>
                    </div>
                }

                @if (errorMessage) {
                    <div class="alert alert-danger alert-dismissible fade show">
                        <i class="ri-error-warning-line me-2"></i>{{ errorMessage }}
                        <button type="button" class="btn-close" (click)="clearMessages()"></button>
                    </div>
                }

                <!-- Card de Perfil -->
                <div class="card shadow-sm">
                    <div class="card-body p-4">

                        <!-- Foto de Perfil -->
                        <div class="text-center mb-4">
                            <div class="profile-image-container mx-auto">
                                @if (imagePreview) {
                                    <img [src]="imagePreview" class="profile-image" alt="Preview">
                                } @else if (user.image) {
                                    <img [src]="user.image" class="profile-image" alt="Foto de perfil">
                                } @else {
                                    <div class="profile-image-placeholder">
                                        <i class="ri-user-line"></i>
                                    </div>
                                }

                                <button
                                    class="btn-change-photo"
                                    (click)="fileInput.click()"
                                    [disabled]="loading"
                                >
                                    <i class="ri-camera-line"></i>
                                </button>

                                <input
                                    type="file"
                                    #fileInput
                                    (change)="onImageSelected($event)"
                                    accept="image/*"
                                    hidden
                                >
                            </div>

                            <!-- Botones de imagen -->
                            @if (selectedImage) {
                                <div class="mt-3">
                                    <button
                                        class="btn btn-primary btn-sm me-2"
                                        (click)="uploadImage()"
                                        [disabled]="loading"
                                    >
                                        <i class="ri-upload-line me-1"></i>Guardar foto
                                    </button>
                                    <button
                                        class="btn btn-outline-secondary btn-sm"
                                        (click)="cancelImageUpload()"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            }

                            <h5 class="mt-3 mb-1">{{ user.first_name }} {{ user.last_name }}</h5>
                            <p class="text-muted mb-0">{{ '@' + user.username }}</p>
                        </div>

                        <hr>

                        <!-- Información Personal -->
                        <div class="section-header d-flex justify-content-between align-items-center mb-3">
                            <h6 class="mb-0">
                                <i class="ri-user-line me-2"></i>Información Personal
                            </h6>
                            <button
                                class="btn btn-sm"
                                [class.btn-primary]="!editing"
                                [class.btn-outline-secondary]="editing"
                                (click)="toggleEdit()"
                            >
                                @if (editing) {
                                    <i class="ri-close-line me-1"></i>Cancelar
                                } @else {
                                    <i class="ri-edit-line me-1"></i>Editar
                                }
                            </button>
                        </div>

                        @if (editing) {
                            <!-- Formulario de edición -->
                            <form (ngSubmit)="saveProfile()">
                                <div class="row">
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Nombre</label>
                                        <input
                                            type="text"
                                            class="form-control"
                                            [(ngModel)]="editForm.first_name"
                                            name="first_name"
                                            required
                                        >
                                    </div>
                                    <div class="col-md-6 mb-3">
                                        <label class="form-label">Apellido</label>
                                        <input
                                            type="text"
                                            class="form-control"
                                            [(ngModel)]="editForm.last_name"
                                            name="last_name"
                                            required
                                        >
                                    </div>
                                </div>

                                <div class="mb-3">
                                    <label class="form-label">Email</label>
                                    <input
                                        type="email"
                                        class="form-control"
                                        [(ngModel)]="editForm.email"
                                        name="email"
                                        required
                                    >
                                </div>

                                <div class="mb-3">
                                    <label class="form-label">Usuario</label>
                                    <input
                                        type="text"
                                        class="form-control"
                                        [value]="user.username"
                                        disabled
                                    >
                                    <small class="text-muted">El nombre de usuario no se puede cambiar</small>
                                </div>

                                <button
                                    type="submit"
                                    class="btn btn-primary"
                                    [disabled]="loading"
                                >
                                    @if (loading) {
                                        <span class="spinner-border spinner-border-sm me-1"></span>
                                    }
                                    Guardar Cambios
                                </button>
                            </form>
                        } @else {
                            <!-- Vista de información -->
                            <div class="info-list">
                                <div class="info-item">
                                    <span class="info-label">Nombre</span>
                                    <span class="info-value">{{ user.first_name }} {{ user.last_name }}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Email</span>
                                    <span class="info-value">{{ user.email }}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">Usuario</span>
                                    <span class="info-value">{{ '@' + user.username }}</span>
                                </div>
                                <div class="info-item">
                                    <span class="info-label">ID</span>
                                    <span class="info-value text-muted font-size-12">{{ user.userId }}</span>
                                </div>
                            </div>
                        }

                        <hr>

                        <!-- Cambiar Contraseña -->
                        <div class="section-header d-flex justify-content-between align-items-center mb-3">
                            <h6 class="mb-0">
                                <i class="ri-lock-line me-2"></i>Seguridad
                            </h6>
                            <button
                                class="btn btn-sm"
                                [class.btn-warning]="!changingPassword"
                                [class.btn-outline-secondary]="changingPassword"
                                (click)="togglePasswordChange()"
                            >
                                @if (changingPassword) {
                                    <i class="ri-close-line me-1"></i>Cancelar
                                } @else {
                                    <i class="ri-key-line me-1"></i>Cambiar Contraseña
                                }
                            </button>
                        </div>

                        @if (changingPassword) {
                            <form (ngSubmit)="changePassword()">
                                <div class="mb-3">
                                    <label class="form-label">Contraseña Actual</label>
                                    <input
                                        type="password"
                                        class="form-control"
                                        [(ngModel)]="passwordForm.current_password"
                                        name="current_password"
                                        required
                                    >
                                </div>

                                <div class="mb-3">
                                    <label class="form-label">Nueva Contraseña</label>
                                    <input
                                        type="password"
                                        class="form-control"
                                        [(ngModel)]="passwordForm.new_password"
                                        name="new_password"
                                        required
                                        minlength="8"
                                    >
                                    <small class="text-muted">Mínimo 8 caracteres</small>
                                </div>

                                <div class="mb-3">
                                    <label class="form-label">Confirmar Contraseña</label>
                                    <input
                                        type="password"
                                        class="form-control"
                                        [(ngModel)]="passwordForm.confirm_password"
                                        name="confirm_password"
                                        required
                                    >
                                </div>

                                <button
                                    type="submit"
                                    class="btn btn-warning"
                                    [disabled]="loading"
                                >
                                    @if (loading) {
                                        <span class="spinner-border spinner-border-sm me-1"></span>
                                    }
                                    Cambiar Contraseña
                                </button>
                            </form>
                        } @else {
                            <p class="text-muted mb-0">
                                <i class="ri-shield-check-line me-1"></i>
                                Tu contraseña está segura. Última actualización hace 30 días.
                            </p>
                        }

                    </div>
                </div>

                <!-- Zona de Peligro -->
                <div class="card border-danger mt-4">
                    <div class="card-body">
                        <h6 class="text-danger mb-3">
                            <i class="ri-alert-line me-2"></i>Zona de Peligro
                        </h6>
                        <p class="text-muted mb-3">
                            Una vez que elimines tu cuenta, no hay vuelta atrás. Por favor, estate seguro.
                        </p>
                        <button class="btn btn-outline-danger btn-sm">
                            <i class="ri-delete-bin-line me-1"></i>Eliminar Cuenta
                        </button>
                    </div>
                </div>

            </div>
        </div>
    </div>
</div>
```

---

## 4️⃣ SCSS (`profile.component.scss`)

```scss
.profile-page {
    background-color: #f8f9fa;
    min-height: 100vh;
}

/* Imagen de perfil */
.profile-image-container {
    position: relative;
    width: 120px;
    height: 120px;
}

.profile-image {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    object-fit: cover;
    border: 4px solid #fff;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.profile-image-placeholder {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    display: flex;
    align-items: center;
    justify-content: center;
    border: 4px solid #fff;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);

    i {
        font-size: 48px;
        color: #fff;
    }
}

.btn-change-photo {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: #2563eb;
    border: 3px solid #fff;
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
        background: #1d4ed8;
        transform: scale(1.1);
    }

    &:disabled {
        background: #9ca3af;
        cursor: not-allowed;
    }
}

/* Lista de información */
.info-list {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.info-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 0;
    border-bottom: 1px solid #f0f0f0;

    &:last-child {
        border-bottom: none;
    }
}

.info-label {
    color: #6b7280;
    font-size: 14px;
}

.info-value {
    font-weight: 500;
    color: #1f2937;
}

/* Cards */
.card {
    border: none;
    border-radius: 12px;
}

/* Secciones */
.section-header h6 {
    color: #374151;
    font-weight: 600;
}

/* Formularios */
.form-control {
    border-radius: 8px;
    border: 1px solid #e5e7eb;
    padding: 10px 14px;

    &:focus {
        border-color: #2563eb;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
    }
}

.form-label {
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    margin-bottom: 6px;
}

/* Botones */
.btn {
    border-radius: 8px;
    font-weight: 500;
}

/* Zona de peligro */
.border-danger {
    border-color: #fecaca !important;
    background-color: #fef2f2;
}

/* Responsive */
@media (max-width: 576px) {
    .profile-image-container,
    .profile-image,
    .profile-image-placeholder {
        width: 100px;
        height: 100px;
    }

    .profile-image-placeholder i {
        font-size: 36px;
    }

    .info-item {
        flex-direction: column;
        align-items: flex-start;
        gap: 4px;
    }
}
```

---

## 5️⃣ Agregar Ruta (`app.routes.ts`)

```typescript
import { ProfileComponent } from './pages/profile/profile.component';

export const routes: Routes = [
    // ... otras rutas
    {
        path: 'profile',
        component: ProfileComponent,
        canActivate: [AuthGuard]
    }
];
```

---

## 6️⃣ Métodos del API Service (`api.service.ts`)

```typescript
// Obtener perfil del usuario
getUserProfile(): Observable<any> {
    return this.http.get(`${this.apiUrl}/v1/user/profile/`, {
        headers: this.getHeaders()
    });
}

// Actualizar perfil
updateUserProfile(data: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/v1/user/profile/`, data, {
        headers: this.getHeaders()
    });
}

// Actualizar imagen de perfil
updateProfileImage(image: File): Observable<any> {
    const formData = new FormData();
    formData.append('image', image);

    return this.http.patch(`${this.apiUrl}/v1/user/profile/`, formData, {
        headers: new HttpHeaders({
            'Authorization': `Bearer ${this.getToken()}`
        })
    });
}

// Cambiar contraseña
changePassword(data: { current_password: string, new_password: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/v1/user/change-password/`, data, {
        headers: this.getHeaders()
    });
}
```

---

## 7️⃣ Enlace desde el Chat

En `chat.component.html`, cambiar el enlace de Perfil:

```html
<a class="dropdown-item" routerLink="/profile">
    Perfil <i class="ri-profile-line float-end text-muted"></i>
</a>
```

---

## 📊 Resumen de Funcionalidades

| Funcionalidad | Descripción |
|---------------|-------------|
| **Ver perfil** | Mostrar datos del usuario |
| **Editar datos** | Nombre, apellido, email |
| **Cambiar foto** | Subir y previsualizar imagen |
| **Cambiar contraseña** | Con validación |
| **Eliminar cuenta** | Zona de peligro (opcional) |

---

## ✅ Endpoints Backend Necesarios

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/v1/user/profile/` | Obtener perfil |
| PATCH | `/api/v1/user/profile/` | Actualizar perfil |
| POST | `/api/v1/user/change-password/` | Cambiar contraseña |
