import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('access_token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': token ? `Bearer ${token}` : ''
    });
  }

  // Auth
  login(username: string, password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/token/`, { username, password });
  }

  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register/`, userData);
  }

  // Chats
  getChats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/chats/`, { headers: this.getHeaders() });
  }

  getChat(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/chats/${id}/`, { headers: this.getHeaders() });
  }

  // Messages
  getMessages(chatId: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/chats/${chatId}/messages/`, { headers: this.getHeaders() });
  }

  sendMessage(chatId: number, content: string, image?: File): Observable<any> {
    const formData = new FormData();
    formData.append('content', content);
    if (image) {
      formData.append('image', image);
    }

    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders({
      'Authorization': token ? `Bearer ${token}` : ''
    });

    return this.http.post(`${this.apiUrl}/chats/${chatId}/messages/`, formData, { headers });
  }

  // Contacts
  getContacts(): Observable<any> {
    return this.http.get(`${this.apiUrl}/contacts/`, { headers: this.getHeaders() });
  }
}
