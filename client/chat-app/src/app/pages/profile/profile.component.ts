import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api.service';

interface Profile {
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
    imports: [ CommonModule, FormsModule ],
    templateUrl: './profile.component.html',
    styleUrls: ['./profile.component.scss']
})

export class ProfileComponent implements OnInit {
    profile: Profile = {
        userId: '',
        username: '',
        email: '',
        first_name: '',
        last_name: '',
        image: null
    };

    selectedImage: File | null = null;
    imagePreview: string | null = null;
    loading = false;
    saving = false;
    message = '';
    messageType: 'success' | 'error' = 'success';

    showPasswordForm = false;
    passwordData = {
        current_password: '',
        new_password: '',
        confirm_new_password: ''
    };
    savingPassword = false;
    passwordMessage = '';
    passwordMessageType: 'success' | 'error' = 'success';

    constructor (
        private apiService: ApiService,
        private router: Router
    ){}

    ngOnInit(): void{
        this.loadProfile();
    }

    loadProfile(): void {
        this.loading = true;
        this.apiService.getProfile().subscribe({
            next: (data) => {
                this.profile = data;
                this.loading = false;
            },
            error: (err) => {
                this.loading = false;
                if (err.status === 401 ){
                    this.router.navigate(['/login']);
                }
            }
        });
    }

    onImageSelected(event: Event): void {
        const input = event.target as  HTMLInputElement;
        if (input.files && input.files[0]){
            this.selectedImage = input.files[0];

            const reader = new FileReader();
            reader.onload = (e: ProgressEvent<FileReader>) => {
                this.imagePreview = e.target?.result as string;
            };
            reader.readAsDataURL(this.selectedImage);
        }
    }

    saveProfile(): void {
        this.saving = true;
        this.message = '';

        const updateData: any = {
            first_name: this.profile.first_name,
            last_name: this.profile.last_name,
            email: this.profile.email
        };

        if (this.selectedImage) {
            updateData.image = this.selectedImage;
        }

        this.apiService.updateProfile(updateData).subscribe({
            next: (response) => {
                this.saving = false;
                this.message = 'Profile updated correctly';
                this.messageType = 'success';
                this.profile = response;
                this.selectedImage = null;
            },
            error: (err) => {
                this.saving = false;
                this.message =  err.error?.email || err.error?.detail || "Error updating the profile";
                this.messageType = 'error';
            }
        });
    }

    goBack(): void {
        this.router.navigate(['/chat']);
    }


    // ========== PASSWORD ==========

    togglePasswordForm(): void {
        this.showPasswordForm = !this.showPasswordForm;
        this.passwordMessage = '';
        this.passwordData = {
            current_password: '',
            new_password : '',
            confirm_new_password : ''
        };
    }

    changePassword(): void {
        if(this.passwordData.new_password != this.passwordData.confirm_new_password){
            this.passwordMessage = "The password doesn't match";
            this.passwordMessageType = "error";
            return;
        }

        this.savingPassword = true;
        this.passwordMessage = '';


        this.apiService.changePassword(this.passwordData).subscribe({
            next: (response) => {
                this.savingPassword = false;
                this.passwordMessage = response.message || "Password update correctly!";
                this.passwordMessageType = "success";
                this.passwordData = {
                    current_password: '',
                    new_password: '',
                    confirm_new_password: ''
                };

                setTimeout(() => {
                    this.showPasswordForm = false;
                    this.passwordMessage = '';
                }, 2000);
            },
            error: (err) => {
                this.savingPassword = false;
                this.passwordMessage = 
                err.error?.current_password?.[0] ||
                err.error?.new_password?.[0] ||
                err.error?.confirm_new_password?.[0] ||
                err.error?.detail ||
                'Error changing the password';
                this.passwordMessageType = 'error';
            }
        })
    }
}