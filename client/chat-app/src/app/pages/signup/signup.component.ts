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
    styleUrls: ['./signup.component.scss']
})

export class SignUpComponent {
    formData = {
        first_name : '',
        last_name : '',
        username: '',
        email: '',
        password: '',
        passwordTwo: ''
    }
    selectedImage : File | null = null;
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
        // validaciones

        if(this.formData.password !== this.formData.passwordTwo) {
            this.error = 'Passwords do not match';
            return;
        }

        if(!this.formData.first_name || !this.formData.last_name || 
            !this.formData.username || !this.formData.email || 
            !this.formData.password) {
                this.error = "Please complete all required fields";
                return;
        }

        this.loading = true;
        this.error = '';

        const signupData = {
            ...this.formData,
            image: this.selectedImage as any || undefined
        }

        this.apiService.signup(signupData).subscribe({
            next: () => {
                this.router.navigate(['/login']);
            },
            error: (err) => {
                this.loading = false;
                if (err.error?.email) {
                    this.error = "Email is already in use";
                } else if (err.error?.username) {
                    this.error = "Username is already taken";
                } else if (err.error?.password) {
                    this.error = err.error.password[0];
                } else {
                    this.error = "An error occurred during signup. Please try again.";
                }
            }
        });
    }
}