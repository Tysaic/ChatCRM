export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResponse {
    refresh: string;
    access: string;
    userId: string;
}

export interface SignUpRequest {
    first_name: string;
    last_name: string;
    username: string;
    email: string;
    password: string;
    passwordTwo: string;
    image?: string;
}

export interface SignUpResponse {
    id: number;
    userId: string;
    message: string;
}