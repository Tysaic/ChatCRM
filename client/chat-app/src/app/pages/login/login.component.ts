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
    styleUrls: ['./login.component.scss']
})

export class LoginComponent {
    username = '';
    password = '';
    error = '';
    loading = false;

    constructor(
        private apiService: ApiService,
        private router: Router
    ){}

    onSubmit(): void {
        if(!this.username || !this.password) {
            this.error = 'Please enter the fields correctly.';
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
                this.error = err.error?.detail || 'Not valid credentials';
            }
        });
    }


}
