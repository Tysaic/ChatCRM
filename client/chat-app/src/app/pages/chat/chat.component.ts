import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, NgZone, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';

interface ChatRoom {
    roomId: string;
    name: string;
    type: string;
    member: any[];
}

interface Message {
    user: string;
    userId: string;
    message: string;
    timestamp: Date;
    userName: string;
    userImage: string;
    image?: string;
}

@Component({
    selector: 'app-chat',
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule],
    templateUrl: './chat.component.html',
    styleUrls: ['./chat.component.scss']
})

export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked
 {

    chats: ChatRoom[] = [];
    selectedChat: ChatRoom | null = null;
    messages: Message[] = [];
    newMessage = '';
    currentUserId: string | null = null;
    private ws: WebSocket | null = null;
    selectedImage: string | null = null;
    showAddChatModal = false;
    allUsers: any[] = [];
    filteredUsers: any[] = [];
    userSearchQuery = '';
    loadingUsers = false;
    chatSearchQuery = '';
    filteredChats: ChatRoom[] = [];
    @ViewChild('chatConversation') private chatConversation!: ElementRef;
    private shouldScrollToBottom = false;
    selectedFile: File | null = null;
    imagePreview: string | null = null;
    uploadingImage = false;

    constructor(
        private apiService: ApiService,
        private router: Router,
        private ngZone: NgZone
    ) {}

   @ViewChild('fileInput') fileInput!: ElementRef;

    ngOnInit(): void {
        this.currentUserId = localStorage.getItem('userId');
        this.loadChats();
        this.connectWebSocket();
    }

    ngOnDestroy(): void {
        this.ws?.close();
    }

    loadChats(): void {
        this.apiService.getUserChats().subscribe({
            next: (chats) => {
                this.chats = chats;
                this.filteredChats = [...this.chats];
                if(chats.length > 0 && !this.selectedChat) {
                    this.selectChat(chats[0]);
                }
                this.shouldScrollToBottom = true;
            },
            error: (err) => {
                if(err.status === 401) {
                    this.router.navigate(['/login']);
                }
            }
        });
    }

    selectChat(chat: ChatRoom): void {
        this.selectedChat = chat;
        this.loadMessages(chat.roomId);
    }

    loadMessages(roomId: string): void {
        this.apiService.getMessages(roomId).subscribe({
            next:(response) => {
                this.messages = response.results.reverse();
            }
        })
    }

    connectWebSocket(): void {
        const userId = localStorage.getItem('userId');

        this.ws = new WebSocket(`ws://localhost:8000/ws/user/${userId}/chat/`);

        this.ws.onmessage = (event) => {
            const data = JSON.parse(event.data);

            if(data.action === 'message' && data.roomId === this.selectedChat?.roomId) {
                this.ngZone.run(() => {
                    this.messages.push(data);
                    this.shouldScrollToBottom = true;
                });
            }
        }

        this.ws.onclose = () => {
            setTimeout( () => this.connectWebSocket(), 5000);
        };
    }

    sendMessage(): void {
        if(!this.selectedChat) return;
        
        // Si no hay mensaje ni imagen, no enviar
        if(!this.newMessage.trim() && !this.selectedFile) return;
        
        // Si hay imagen seleccionada, usar el método de subida
        if(this.selectedFile) {
            this.sendMessageWithImage();
            return;
        }
        
        // Solo mensaje de texto
        const messageDate = {
            action: 'message',
            roomId: this.selectedChat.roomId,
            user: this.currentUserId,
            message: this.newMessage.trim()
        }

        this.ws?.send(JSON.stringify(messageDate));
        this.newMessage = '';
        this.shouldScrollToBottom = true;
    }

    logout(): void {
        this.apiService.logout();
        this.router.navigate(['/login']);
    }

    getChatDisplayName(chat: ChatRoom): string {

        if(chat.type === 'DM'){
            const otherMember = chat.member.find(m => m.userId !== this.currentUserId);
            return otherMember ? `${otherMember.first_name} ${otherMember.last_name}` : 'Chat Interno';
        }
        
        return chat.name || 'Chat Group';

    }

    ngAfterViewChecked(): void {
        if (this.shouldScrollToBottom) {
            this.scrollToBottom();
            this.shouldScrollToBottom = false;
        }
    }

    private scrollToBottom(): void {
        try {
            if(this.chatConversation){
                this.chatConversation.nativeElement.scrollTop = this.chatConversation.nativeElement.scrollHeigh;
            }
        } catch(err) {
        }
    }

    openImageModal(imageUrl: string): void {
        this.selectedImage = imageUrl;
    }

    closeImageModal(): void {
        this.selectedImage = null;
    }


    // ========== MODAL CHAT ==========

    openAddChatModal(): void {
        this.showAddChatModal = true;
        this.userSearchQuery = '';
        this.loadUsers();
    }

    closeAddChatModal(): void {
        this.showAddChatModal = false;
        this.userSearchQuery = '';
        this.filteredUsers = [];
        this.allUsers = [];
    }

    loadUsers(): void {
        this.loadingUsers = true;
        const currentUserId = this.currentUserId ? [parseInt(this.currentUserId)] : [];

        this.apiService.getUsers(currentUserId).subscribe({
            next: (response: any) => {
                this.allUsers = response;
                this.filteredUsers = [...this.allUsers];
                this.loadingUsers = false;
            },
            error: (error) => {
                console.error("Error loading users: ", error);
                this.loadingUsers = false;
            }
        });
    }

    filterUsers(): void {
        const query = this.userSearchQuery.toLowerCase().trim();

        if (!query) {
            this.filteredUsers = [...this.allUsers];
            return;
        }

        this.filteredUsers = this.allUsers.filter(user => {
            return user.username.toLowerCase().includes(query) ||
            user.first_name?.toLowerCase().includes(query) ||
            user.last_name?.toLowerCase().includes(query) ||
            user.email?.toLowerCase().includes(query)
        });
    }

    startChatWithUser(user: any): void {

        const existingChat = this.chats.find(chat => 
            chat.type === 'DM' &&
            chat.member.some((m:any) => m.userId === user.userId)
        )


        if (existingChat) {
            this.selectChat(existingChat);
            this.closeAddChatModal();
            return;
        }

        this.apiService.createChat('', 'DM', [user.userId, this.currentUserId]).subscribe({
            next: (response:any) => {
                console.log('Chat created:', response); 
                this.loadChats();
                this.closeAddChatModal();
            },
            error: (error) => {
                console.error("Error creating chat: ", error)
                alert("Error creating chat. Try again later.");
            }
        })
    }

    filtersChats(): void {
        const query = this.chatSearchQuery.toLowerCase().trim();

        if (!query) {
            this.filteredChats = [...this.chats];
            return;
        }

        this.filteredChats = this.chats.filter(chat => {
            const displayName = this.getChatDisplayName(chat).toLowerCase();
            return displayName.includes(query);
        });
    }

    onFileSelected(event: Event): void {
        const input = event.target as HTMLInputElement;

        if (input.files && input.files[0]) {
            const file = input.files[0];

            if(!file.type.startsWith('image/')){
                alert("Please select a valid image file.");
                return;
            }

            if(file.size > 5 * 1024 * 1024){
                alert("Image size exceeds 5MB limit.");
                return;
            }

            this.selectedFile = file;

            const reader = new FileReader();

            reader.onload = (e: ProgressEvent<FileReader>) => {
                this.imagePreview = e.target?.result as string;
            };
            reader.readAsDataURL(file);
        }
    }

    cancelImageSelection(): void {
        this.selectedFile = null;
        this.imagePreview = null;
        if (this.fileInput) {
            this.fileInput.nativeElement.value = '';
        }
    }

    // Send image with message

    sendMessageWithImage(): void {

        if(!this.selectedFile || !this.selectedChat) return;

        this.uploadingImage = true;

        this.apiService.uploadChatImage(
            this.selectedChat.roomId,
            this.selectedFile,
            this.newMessage.trim()
        ).subscribe({
            next: (response) => {
                const wsMessage = {
                    action: 'message',
                    roomId : this.selectedChat?.roomId,
                    user: this.currentUserId,
                    message: response.message,
                    image: response.image,
                    fromUpload: true
                };
                this.ws?.send(JSON.stringify(wsMessage));

                this.ngZone.run( () => {
                    this.messages.push({
                        user: response.user,
                        userId: response.userId,
                        message: response.message,
                        timestamp: new Date(response.timestamp),
                        userName: response.userName,
                        userImage: response.userImage,
                        image: response.image
                    });
                    this.shouldScrollToBottom = true;
                });

                this.uploadingImage = false;
                this.cancelImageSelection();
                this.newMessage = '';

            },
            error: (err) =>{
                console.log("Error uploading image: ", err);
                alert("Error uploading image. Please try again.");
                this.uploadingImage = false;
            }
        })
    }

}