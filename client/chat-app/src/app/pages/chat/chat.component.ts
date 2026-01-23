import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
    imports: [CommonModule, FormsModule],
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

    @ViewChild('chatConversation') private chatConversation!: ElementRef;
    private shouldScrollToBottom = false;

    constructor(
        private apiService: ApiService,
        private router: Router
    ) {}

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
                console.log(data);
                this.messages.push(data);
            }
        }

        this.ws.onclose = () => {
            setTimeout( () => this.connectWebSocket(), 5000);
        };
    }

    sendMessage(): void {
        
        if(!this.newMessage.trim() || !this.selectedChat) return;
        console.log("Enviando el mensaje: ", this.currentUserId, typeof this.currentUserId);
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
        //if (chat.type === 'SELF') return 'Personal Chat';
        if (chat.name) return chat.name;

        const otherMember = chat.member.find(m => m.id !== this.currentUserId);
        return otherMember ? `${otherMember.first_name} ${otherMember.last_name}` : 'Chat';
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
}