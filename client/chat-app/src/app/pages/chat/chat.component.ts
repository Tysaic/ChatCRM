import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked, NgZone, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { CHAT_TYPES } from '../../constants/chat.constants';

interface ChatRoom {
    roomId: string;
    name: string;
    type: string;
    member: any[];
    hasUnread: boolean;
    unread_count: number;
    last_message: string | null;
    lastMessageAt?: Date;
}

interface Message {
    user: string;
    userId: string;
    message: string | null;
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

    // Usuario actual
    currentUser: any = null;
    currentUserId: string | null = null;

    // Chats y mensajes
    chats: ChatRoom[] = [];
    filteredChats: ChatRoom[] = [];
    selectedChat: ChatRoom | null = null;
    messages: Message[] = [];
    newMessage = '';

    // Búsqueda
    chatSearchQuery = '';
    userSearchQuery = '';

    // Modal de usuarios
    showAddChatModal = false;
    allUsers: any[] = [];
    filteredUsers: any[] = [];
    loadingUsers = false;
    filterMode: 'all' | 'unread' = 'all';

    // Imágenes
    selectedImage: string | null = null;
    selectedFile: File | null = null;
    imagePreview: string | null = null;
    uploadingImage = false;

    // WebSocket
    private ws: WebSocket | null = null;

    // Estado y referencias
    private shouldScrollToBottom = false;
    @ViewChild('chatConversation') private chatConversation!: ElementRef;
    @ViewChild('fileInput') fileInput!: ElementRef;

    constructor(
        private apiService: ApiService,
        private router: Router,
        private ngZone: NgZone
    ) {}

    ngOnInit(): void {
        this.currentUserId = localStorage.getItem('userId');
        this.loadCurrentUser();
        this.loadChats();
        this.connectWebSocket();
    }

    ngOnDestroy(): void {
        this.ws?.close();
    }

    loadCurrentUser(): void {
        this.apiService.getProfile().subscribe({
            next: (user) => {
                this.currentUser = user;
            },
            error: (err) => {
                console.error("Error loading user profile: ", err);
            }
        })
    }

    loadChats(): void {
        this.apiService.getUserChats().subscribe({
            next: (chats) => {
                this.chats = chats.map((chat: any) => ({
                    ...chat,
                    hasUnread: false,
                    lastMessageAt: new Date()
                }));
                this.filteredChats = [...this.chats];

                if(chats.length > 0 && !this.selectedChat) {
                    this.selectChat(this.chats[0]);
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

        if(chat.unread_count > 0 ) {
            this.apiService.markChatAsRead(chat.roomId).subscribe({
                next: () => {
                    const chatIndex = this.chats.findIndex( c=> c.roomId === chat.roomId);
                    if(chatIndex !== -1){
                        this.chats[chatIndex].unread_count = 0;
                    }
                },
                error: (err) =>  console.error("Error marking chat as read: ", err)
            });
        }

        this.loadMessages(chat.roomId);
    }

    loadMessages(roomId: string): void {
        this.apiService.getMessages(roomId).subscribe({
            next:(response) => {
                this.messages = response.results.reverse();
                this.shouldScrollToBottom = true;
            }
        })
    }

    connectWebSocket(): void {
        const userId = localStorage.getItem('userId');

        this.ws = new WebSocket(`${this.apiService.getWebSocketUrl()}/ws/user/${userId}/chat/`);

        this.ws.onmessage = (event) => {
            
            const data = JSON.parse(event.data);

            if(data.action === 'message'){
                this.ngZone.run( () => {
                    const roomId = data.roomId;
                    const chatExists = this.chats.some( c => c.roomId === roomId);

                    if(!chatExists){
                        this.apiService.getUserChats().subscribe({
                            next: (chats) => {
                                const newChatData = chats.find((c:any) => c.roomId === roomId);

                                if(newChatData){
                                    const newChat: ChatRoom = {
                                        ...newChatData,
                                        hasUnread: false,
                                        unread_count: 1,
                                        lastMessageAt: new Date()
                                    };
                                    this.chats.unshift(newChat);
                                    this.filteredChats = [...this.chats];

                                    this.ws?.send(JSON.stringify({
                                        action: "join_room",
                                        roomId: roomId
                                    }));
                                }
                            }
                        });
                        return;
                    }


                    // Verificar si el mensaje ya existe (evitar duplicados)
                    const isDuplicate = this.messages.some(m =>
                        m.userId === data.userId &&
                        m.message === data.message &&
                        Math.abs(new Date(m.timestamp).getTime() - new Date(data.timestamp).getTime()) < 5000
                    );

                    if (data.roomId === this.selectedChat?.roomId) {

                        if(!isDuplicate) {
                            this.messages.push({
                                user: data.user,
                                userId: data.userId,
                                message: data.message,
                                timestamp: new Date(data.timestamp),
                                userName: data.userName,
                                userImage: data.userImage,
                                image: data.image || null,
                            })
                        }
                        this.shouldScrollToBottom = true;
                        this.apiService.markChatAsRead(data.roomId).subscribe();
                    } else{
                        this.incrementUnreadCount(data.roomId);
                    }


                    this.moveChatToTop(data.roomId);
                });
            }
        }

        this.ws.onclose = () => {
            setTimeout( () => this.connectWebSocket(), 5000);
        };
    }

    reconnectWebSocket(): void {
        if(this.ws){
            this.ws.onclose = null;
            this.ws.close();
        }
        this.connectWebSocket();
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

        const messageText = this.newMessage.trim();
        const now = new Date();

        this.messages.push({
            user: this.currentUser?.id || '',
            userId: this.currentUserId || '',
            message: messageText,
            timestamp: now,
            userName: this.currentUser ? `${this.currentUser.first_name} ${this.currentUser.last_name}` : '',
            userImage: this.currentUser?.image || null,
        })
        
        // Solo mensaje de texto
        const messageData = {
            action: 'message',
            roomId: this.selectedChat.roomId,
            user: this.currentUserId,
            message: messageText
        }

        this.ws?.send(JSON.stringify(messageData));
        this.newMessage = '';
        this.shouldScrollToBottom = true;

        this.moveChatToTop(this.selectedChat.roomId);
    }

    logout(): void {
        this.apiService.logout();
        this.router.navigate(['/login']);
    }

    getChatDisplayName(chat: ChatRoom): string {

        if(chat.type === CHAT_TYPES.DM){
            const otherMember = chat.member.find(m => m.userId !== this.currentUserId);
            return otherMember ? `${otherMember.first_name} ${otherMember.last_name}` : 'Chat Interno';
        }
        return chat.name || 'Chat Group';
    }

    getChatDisplayImage(chat: ChatRoom): string  | null {
        if(chat.type === CHAT_TYPES.DM){
            const otherMember = chat.member.find(m => m.userId !== this.currentUserId);
            return otherMember?.image || null;
        }

        return chat.member[0]?.image || null;
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
                this.chatConversation.nativeElement.scrollTop = this.chatConversation.nativeElement.scrollHeight;
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

    filterByUnread(): void {
        if(this.filterMode === 'unread'){
            this.filterMode = 'all';
            this.filteredChats = [...this.chats];
        } else {
            this.filterMode = 'unread';
            this.filteredChats = this.chats.filter(
                chat => chat.unread_count > 0
            );
        }
    }

    filtersChats(): void {
        const query = this.chatSearchQuery.toLowerCase().trim();


        let baseChats = this.filterMode === 'unread'
        ? this.chats.filter(chat => chat.unread_count > 0)
        : [... this.chats];
        
        if (!query) {
            this.filteredChats = baseChats;
            return;
        }

        this.filteredChats = baseChats.filter(chat => {
            const displayName = this.getChatDisplayName(chat).toLowerCase();
            return displayName.includes(query);
        });
    }

    get totalUnreadCount(): number {
        return this.chats.reduce((sum, chat) => sum + (chat.unread_count || 0), 0);
    }
    startChatWithUser(user: any): void {

        const existingChat = this.chats.find(chat => 
            chat.type === CHAT_TYPES.DM &&
            chat.member.some((m:any) => m.userId === user.userId)
        )


        if (existingChat) {
            this.selectChat(existingChat);
            this.closeAddChatModal();
            return;
        }

        this.apiService.createChat('', CHAT_TYPES.DM, [user.userId, this.currentUserId]).subscribe({
            next: (response:any) => {
                const newRoomId = response.roomId || response.chat?.roomId;

                this.apiService.getUserChats().subscribe({
                    next: (chats) => {
                        this.chats = chats.map((chat: any) => ({
                            ...chat,
                            hasUnread: false,
                            lastMessageAt: new Date()
                        }));
                        this.filteredChats = [...this.chats];

                        const newChat = this.chats.find( (c: ChatRoom) => c.roomId === newRoomId);
                        if(newChat){
                            this.selectChat(newChat);
                            this.reconnectWebSocket();
                        }
                    }
                });
                this.closeAddChatModal();
            },
            error: (error) => {
                console.error("Error creating chat: ", error)
                alert("Error creating chat. Try again later.");
            }
        })
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

    markChatAsUnread(roomId: string): void {
        const chatIndex = this.chats.findIndex( c => c.roomId === roomId);

        if(chatIndex !== -1){
            this.chats[chatIndex].hasUnread = true;
        }
    }

    moveChatToTop(roomId: string): void {
        const chatIndex = this.chats.findIndex( c=> c.roomId === roomId);

        if(chatIndex > 0){
            const [chat] = this.chats.splice(chatIndex, 1);
            this.chats.unshift(chat);
            this.filteredChats = [...this.chats];
        }
    }

    incrementUnreadCount(roomId: string): void {
        const chatIndex = this.chats.findIndex( c=> c.roomId === roomId);

        if(chatIndex !== -1){
            this.chats[chatIndex].unread_count = (this.chats[chatIndex].unread_count || 0) + 1
        }
    }

}