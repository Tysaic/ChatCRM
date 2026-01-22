import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';
import { LoginRequest, LoginResponse, SignUpRequest, SignUpResponse } from '../models/auth.model';
import { User } from '../models/user.model';


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
    )
  }

  signup(userData: SignUpRequest): Observable<SignUpResponse> {
    if(!userData.image){
      return this.http.post<SignUpResponse>(`${this.apiUrl}/v1/signup`, userData);
    }

    const formData = new FormData();
    formData.append('first_name', userData.first_name);
    formData.append('last_name', userData.last_name);
    formData.append('username', userData.username);
    formData.append('email', userData.email);
    formData.append('password', userData.password);
    formData.append('passwordTwo', userData.passwordTwo);
    formData.append('image', userData.image);

    return this.http.post<SignUpResponse>(`${this.apiUrl}/v1/signup`, formData);
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

  getMessages(roomId: string, limit = 30, offset = 0): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/v1/chats/messages/${roomId}?limit=${limit}&offset=${offset}`,
      { headers: this.getAuthHeaders()}
    );
  }

  sendMessages(roomId: string, message: string, image?: File): Observable<any> {
    if(!image){
      return this.http.post(`${this.apiUrl}/chats/messages`,
        { roomId, message },
        { headers: this.getAuthHeaders() }
      );
    }

    const formData = new FormData();
    formData.append('roomId', roomId);
    formData.append('message', message);
    formData.append('image', image);

    const token = localStorage.getItem('access_token');
    const header = new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });

    return this.http.post(`${this.apiUrl}/chats/messages`, formData, { headers: header });
  }

   // ========== USERS ==========

   getUsers(exclude?: number[]): Observable<any> {
    let url = `${this.apiUrl}/users`;

    if (exclude && exclude.length > 0) {
      url += `?exclude=${exclude.join(',')}`;
    }

    return this.http.get(url, {headers: this.getAuthHeaders()});
   }
}