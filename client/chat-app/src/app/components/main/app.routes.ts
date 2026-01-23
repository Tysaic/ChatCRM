import { Routes } from '@angular/router';
import { authGuard, guestGuard } from '../../guards/auth.guard';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'chat',
        pathMatch: 'full'
    },
    {
        path: 'login',
        loadComponent: () => import('../../pages/login/login.component')
        .then(m => m.LoginComponent),
        canActivate: [guestGuard]
    },
    {
        path: 'signup',
        loadComponent: () => import('../../pages/signup/signup.component')
        .then(m => m.SignUpComponent),
        canActivate: [guestGuard]
    },
    {
        path: 'chat',
        loadComponent: () => import('../../pages/chat/chat.component')
        .then(m => m.ChatComponent),
        canActivate: [authGuard]
    },
    {
        path: '**',
        redirectTo: 'chat'
    }
];