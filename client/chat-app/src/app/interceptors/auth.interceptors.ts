import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';


export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401) {
                const key = ['access_token', 'refresh_token', 'user_id'];
                key.forEach(
                    key => localStorage.removeItem(key)
                );
                
                router.navigate(['/login'], {
                    queryParams: { sessionExpired: 'true'}
                });
            }

            return throwError( () => error );
        })
    );
}