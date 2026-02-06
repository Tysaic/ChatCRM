import { 
    Component, OnInit, OnDestroy, 
    ViewChild, ElementRef, AfterViewChecked, 
    NgZone, viewChild, HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { 
    CHAT_TYPES, ALLOWED_IMAGE_TYPES, ALLOWED_DOC_TYPES, 
    MAX_FILE_SIZE, selectedFileType 
} from '../../constants/chat.constants';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { ThemeService } from '../../services/theme.service';
import { ChatTabsComponent } from './chat-tabs/chat-tabs.component';
import { SupportChatItemComponent } from './support-chat-item/support-chat-item.component';

interface ChatRoom {
    roomId: string;
    name: string;
    type: string;
    member: any[];
    hasUnread: boolean;
    unread_count: number;
    last_message: string | null;
    lastMessageAt?: Date;
    assigned_agent?: number;
    assigned_agent_info?: { name: string; image?: string}
}

interface Message {
    user: string;
    userId: number;
    message: string | null;
    timestamp: Date;
    userName: string;
    userImage: string;
    image?: string;
    file?: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    type: 'image' | 'file' | 'text';
}


@Component({
    selector: 'app-chat',
    standalone: true,
    imports:[
        CommonModule,
        FormsModule,
        RouterModule,
        ChatTabsComponent,
        SupportChatItemComponent,
    ],
    templateUrl: './chat.component.html',
    styleUrls: ['./chat.component.scss']
})

export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked
 {

    // Usuario actual
    currentUser: any = null;
    currentUserId: number | null = null;
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
    selectedFileType: selectedFileType = null;
    imagePreview: string | null = null;
    uploadingImage = false;
    // WebSocket
    private ws: WebSocket | null = null;
    // Estado y referencias
    private shouldScrollToBottom = false;
    @ViewChild('chatConversation') private chatConversation!: ElementRef;
    @ViewChild('fileInput') fileInput!: ElementRef;
    // Pagination Chat 
    messageLimit = 50;
    messageOffset = 0;
    loadingMoreMessages = false;
    hasMoreMessages = true;
    totalMessages = 0;
    private scrollSubject = new Subject<void>();
    searchingUsers = false;
    private searchSubject = new Subject<string>();
    readonly USERS_LIMIT = 20;
    usersOffset = 0;
    hasMoreUsers = true;
    totalUsers = 0;
    loadingMoreUsers = false;
    readonly CHATS_LIMITS = 20;
    chatsOffset = 0;
    hasMoreChats = true;
    totalChats = 0;
    loadingChats = false;
    loadingMoreChats = false;
    //Support Chats
    activeTab: 'internal' | 'support' = 'internal';
    supportChats: ChatRoom[] = [];
    filteredSupportChats: ChatRoom[] = [];
    supportUnreadCount = 0;
    loadingSupportChats = false;

    constructor(
        private apiService: ApiService,
        private router: Router,
        private ngZone: NgZone,
        public themeService: ThemeService
    ) {}

    ngOnInit(): void {
        const storedUserId = localStorage.getItem('userId');
        this.currentUserId = storedUserId ? parseInt(storedUserId, 10) : null;
        this.loadCurrentUser();
        this.loadChats();
        this.connectWebSocket();

        this.scrollSubject.pipe(
            debounceTime(2000)
        ).subscribe( () => {
            if(this.selectedChat && !this.loadingMoreMessages && this.hasMoreMessages){
                this.loadMessages(this.selectedChat.roomId, true);
            }
        })

        this.searchSubject.pipe(
            debounceTime(300),
            distinctUntilChanged()
        ).subscribe(searchTerm => {
            this.searchUsersFromBackend(searchTerm);
        });
    }

    ngOnDestroy(): void {
        this.ws?.close();
        this.scrollSubject.complete();
        this.searchSubject.complete()
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

    loadChats(loadMore = false): void {

        if(this.loadingChats || this.loadingMoreChats) return;
        if(loadMore && !this.hasMoreChats) return;

        if(loadMore){
            this.loadingMoreChats = true;
        } else{
            this.loadingChats = true;
            this.chatsOffset = 0;
            this.chats = [];
            this.hasMoreChats = true;
        }

        this.apiService.getUserChats({
            limit: this.CHATS_LIMITS,
            offset: this.chatsOffset
        }).subscribe({
            next: (response) => {
                const newChats = response.results || response;
                this.totalChats = response.count || newChats.length;

                const mappedChats = newChats.map((chat:any) => ({
                    ...chat,
                    hasUnread: false,
                    lastMessageAt: chat.last_message_at ? new Date(chat.last_message_at) : new Date()
                }));

                if (loadMore) {
                    const existingIds = new Set(this.chats.map( c => c.roomId ));
                    const uniqueChats = mappedChats.filter(
                        (c: ChatRoom) => !existingIds.has(c.roomId)
                    );
                    this.chats = [...this.chats, ...uniqueChats];
                } else {
                    this.chats = mappedChats;

                    if (this.chats.length > 0 && !this.selectedChat) {
                        this.selectChat(this.chats[0]);
                    }
                }


                this.applyChatsFilter();
                this.chatsOffset += this.CHATS_LIMITS;
                this.hasMoreChats = this.chatsOffset < this.totalChats;

                this.loadingChats = false;
                this.loadingMoreChats = false;
                this.shouldScrollToBottom = true;
            },
            error: (error) => {
                console.error("Error loading Chats", error);
                if(error.status === 401){
                    this.router.navigate(['/login']);
                }
                this.loadingChats = false;
                this.loadingMoreChats = false;
            }
        });
    }

    loadMoreChats(): void {
        this.loadChats(true);
    }

    applyChatsFilter(): void {
        if (this.filterMode === 'unread'){
            this.filteredChats = this.chats.filter(chat => chat.unread_count > 0 );
        } else if(this.chatSearchQuery.trim()) {
            const query = this.chatSearchQuery.toLowerCase();

            this.filteredChats = this.chats.filter( chat => {
                const displayName = this.getChatDisplayName(chat).toLowerCase();
                return displayName.includes(query);
            })

        } else{
            this.filteredChats = [...this.chats];
        }
    }

    selectChat(chat: ChatRoom): void {
        this.selectedChat = chat;

        if(chat.unread_count > 0 && !this.isChatBlocker && chat.type !== 'SUPPORT') {
            this.apiService.markChatAsRead(chat.roomId).subscribe({
                next: () => {
                    const chatIndex = this.chats.findIndex( c=> c.roomId === chat.roomId);
                    if(chatIndex !== -1){
                        this.chats[chatIndex].unread_count = 0;
                    }
                    const supportIndex = this.supportChats.findIndex( c=> c.roomId === chat.roomId);
                    if(supportIndex !== -1){
                        this.supportChats[supportIndex].unread_count = 0;
                    }
                },
                error: (err) =>  console.error("Error marking chat as read: ", err)
            });
        }

        this.messageOffset = 0;
        this.messages = [];
        this.hasMoreMessages = true;
        this.loadMessages(chat.roomId);
    }

    onMessagesScroll(event: Event): void {
        const container = event.target as HTMLElement;
        
        if(container.scrollTop < 100 && !this.loadingMoreMessages && this.hasMoreMessages){
            this.loadMessages(this.selectedChat!.roomId, true);
        }
    }

    loadMessages(roomId: string, loadMore=false): void {
        if (this.loadingMoreMessages || (!loadMore && this.messages.length > 0)) return;
        if (loadMore && !this.hasMoreMessages) return;

        this.loadingMoreMessages = true;

        if(!loadMore) {
            this.messageOffset = 0;
            this.messages = [];
            this.hasMoreMessages = true;
        }

        this.apiService.getMessages(roomId, this.messageLimit, this.messageOffset).subscribe({
            next: (response) => {
                // Invierte mensajes (backend envia desc, UI necesita ASC)
                const newMessages = response.results.reverse();
                this.totalMessages = response.count;

                if(loadMore){
                    // Guarda altura anterior para preservar posición visual
                    const container = this.chatConversation?.nativeElement;
                    const previousHeight = container?.scrollHeight || 0;

                    // Añade mensajes al principio del array
                    this.messages = [...newMessages, ...this.messages];

                    // Ajusta scroll para mantener visualización
                    setTimeout(() => {
                        const newScrollHeight = container.scrollHeight;
                        container.scrollTop = newScrollHeight - previousHeight;
                    }, 0);
                } else {
                    // Primera carga: scroll automático al final
                    this.messages = newMessages;
                    this.shouldScrollToBottom = true;
                }
                // Actualiza offset para próxima carga
                this.messageOffset += this.messageLimit;
                // Verifica si hay más mensajes
                this.hasMoreMessages = this.messageOffset < this.totalMessages;
                this.loadingMoreMessages = false;
            },
            error: (error) => {
                console.error("Error loading messages: ", error);
                this.loadingMoreMessages = false;
            }
        })
    }

    connectWebSocket(): void {
        const visitorId = localStorage.getItem('userId');

        this.ws = new WebSocket(`${this.apiService.getWebSocketUrl()}/ws/user/${visitorId}/chat/`);

        this.ws.onmessage = (event) => {
            
            const data = JSON.parse(event.data);

            if(data.action === 'message'){
                this.ngZone.run( () => {
                    const roomId = data.roomId;
                    const isOwnMessage = data.userId === this.currentUserId;
                    const chatExists = this.chats.some( c => c.roomId === roomId) || 
                    this.supportChats.some( c => c.roomId === roomId);

                    if(!chatExists){
                        if(isOwnMessage) return;

                        if(data.chatType === 'SUPPORT'){
                            this.loadSupportChats();
                            if(this.activeTab !== 'support'){
                                this.supportUnreadCount++;
                            }
                            this.ws?.send(JSON.stringify({
                                action: "join_room",
                                roomId: roomId
                            }));
                            return;
                        }
                        this.apiService.getUserChats({ limit:1, offset:0 }).subscribe({
                            next: (response) => {
                                const newChats = response.results || response;
                                const newChatData = newChats.find((c:any) => c.roomId === roomId);


                                if(newChatData){
                                    const newChat: ChatRoom = {
                                        ...newChatData,
                                        hasUnread: true,
                                        unread_count: 1,
                                        lastMessageAt: new Date()
                                    };

                                    this.chats.unshift(newChat);
                                    this.totalChats++;
                                    this.applyChatsFilter();

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
                                type: data.type || 'text',
                            })
                        }
                        this.shouldScrollToBottom = true;
                        if(!isOwnMessage && !this.isChatBlocker && this.selectedChat?.type !== 'SUPPORT') {
                            this.apiService.markChatAsRead(data.roomId).subscribe();
                        }
                    } else if(!isOwnMessage){
                        this.incrementUnreadCount(data.roomId);
                    }


                    this.moveChatToTop(data.roomId);
                    this.moveSupportChatToTop(data.roomId);

                    if(!isOwnMessage && (data.chatType === 'SUPPORT' || this.isSupportChat(data.roomId))){
                        if(this.activeTab !== 'support') {
                            this.supportUnreadCount++;
                        }
                        this.loadSupportChats();
                    }
                });
            }
            if(data.action === 'support_update'){
                this.ngZone.run( () => {
                    this.loadSupportChats();
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
            this.sendMessageWithFile();
            return;
        }

        const messageText = this.newMessage.trim();
        const now = new Date();

        this.messages.push({
            user: this.currentUser?.id || '',
            userId: this.currentUserId || 0,
            message: messageText,
            timestamp: now,
            userName: this.currentUser ? `${this.currentUser.first_name} ${this.currentUser.last_name}` : '',
            userImage: this.currentUser?.image || null,
            type: 'text',
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

        if(this.selectedChat.type === 'SUPPORT' && this.selectedChat.assigned_agent === this.currentUserId){
            this.apiService.markChatAsRead(this.selectedChat.roomId).subscribe({
                next: () => {
                    const chatIndex = this.supportChats.findIndex(
                        c => c.roomId === this.selectedChat!.roomId 
                    );

                    if(chatIndex !== -1){
                        this.supportChats[chatIndex].unread_count = 0;
                    }
                }
            });
        }
    }

    logout(): void {
        this.apiService.logout();
        this.router.navigate(['/login']);
    }

    getChatDisplayName(chat: ChatRoom): string {

        if(chat.type === CHAT_TYPES.DM){
            const otherMember = chat.member.find(m => m.id !== this.currentUserId);
            return otherMember ? `${otherMember.first_name} ${otherMember.last_name}` : 'Chat Interno';
        }
        return chat.name || 'Chat Group';
    }

    getChatDisplayImage(chat: ChatRoom): string  | null {
        if(chat.type === CHAT_TYPES.DM){
            const otherMember = chat.member.find(m => m.id !== this.currentUserId);
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
        this.filteredUsers = [];
        this.loadUsers();
    }

    closeAddChatModal(): void {
        this.showAddChatModal = false;
        this.userSearchQuery = '';
        this.filteredUsers = [];
        this.allUsers = [];
        //Reset pagination
        this.usersOffset = 0;
        this.hasMoreUsers = true;
        this.totalUsers = 0;
    }

    loadUsers(loadMore = false): void {

        if(this.loadingUsers || this.loadingMoreUsers) return;
        if(loadMore && !this.hasMoreUsers) return;

        if(loadMore){
            this.loadingMoreUsers = true;
        } else {
            this.loadingUsers = true;
            this.usersOffset = 0;
            this.allUsers = [];
            this.hasMoreUsers = true;
        }

        this.apiService.getUsers({
            limit: this.USERS_LIMIT,
            offset: this.usersOffset
        }).subscribe({
            next: (response: any) => {
                const newUsers = response.results || response;
                this.totalUsers = response.count || newUsers.length;

                if (loadMore){
                    const existingIds = new Set(this.allUsers.map( u => u.id));
                    const uniqueUsers = newUsers.filter(
                        (u: any) => !existingIds.has(u.id)
                    );
                    this.allUsers = [...this.allUsers, ...uniqueUsers];
                } else {
                    this.allUsers = newUsers;
                }

                if(this.userSearchQuery.trim()){
                    this.filterUsers(this.userSearchQuery);
                } else {
                    this.filteredUsers = [...this.allUsers];
                }

                this.usersOffset += this.USERS_LIMIT;
                this.hasMoreUsers = this.usersOffset < this.totalUsers;
                this.loadingUsers = false;
                this.loadingMoreUsers = false;
            },
            error: (error) => {
                console.error("Error Loading Users:", error);
                this.loadingUsers = false;
                this.loadingMoreUsers = false;
            }
        });
    }

    onUserSearchInput(): void {
        const query = this.userSearchQuery.toLowerCase().trim();

        this.usersOffset = 0;
        this.hasMoreUsers = true;

        if(!query){
            this.filteredUsers = [...this.allUsers];
            return;
        }

        if(query.length < 2){
            this.filterUsers(query);
        }

        this.searchSubject.next(query);
    }

    searchUsersFromBackend(searchTerm: string, loadMore = false): void {
        if(this.searchingUsers || this.loadingMoreUsers) return;
        if(loadMore && !this.hasMoreUsers) return;

        if(loadMore){
            this.loadingMoreUsers = true;
        } else {
            this.searchingUsers = true;
            this.usersOffset = 0;
            this.hasMoreUsers = true;
        }

        this.apiService.getUsers({
            search: searchTerm,
            limit: this.USERS_LIMIT,
            offset: this.usersOffset
        }).subscribe({
            next: (response: any) => {
                const newUsers = response.results || response;
                this.totalUsers = response.count || newUsers.length;

                if(loadMore){
                    const existingIds = new Set(
                        this.filteredUsers.map( u=> u.id )
                    );
                    const uniqueUsers = newUsers.filter(
                        (u: any) => !existingIds.has(u.id)
                    );
                    this.filteredUsers = [...this.filteredUsers, ...uniqueUsers];
                } else {
                    this.filteredUsers = newUsers;
                }

                this.usersOffset += this.USERS_LIMIT;
                this.hasMoreUsers = this.usersOffset < this.totalUsers;

                this.searchingUsers = false;
                this.loadingMoreUsers = false;
            },
            error: (error) => {
                console.error("Error searching errors:", error);
                this.searchingUsers = false;
                this.loadingMoreUsers = false;
            }
        });

    }

    loadMoreUsers(): void{
        if(this.userSearchQuery.trim()){
            this.searchUsersFromBackend(this.userSearchQuery, true);
        } else{
            this.loadUsers(true);
        }
    }

    filterUsers(query: string): void {

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
        } else {
            this.filterMode = 'unread';
        }
        this.applyChatsFilter();
    }

    filtersChats(): void {
        this.applyChatsFilter();
    }

    get totalUnreadCount(): number {
        return this.chats.reduce((sum, chat) => sum + (chat.unread_count || 0), 0);
    }

    get isChatBlocker(): boolean {
        if(!this.selectedChat) return false;
        if(this.selectedChat.type !== 'SUPPORT') return false;
        if(!this.selectedChat.assigned_agent) return true;
        return this.selectedChat.assigned_agent !== this.currentUserId;
    }

    startChatWithUser(user: any): void {

        const existingChat = this.chats.find(chat => 
            chat.type === CHAT_TYPES.DM &&
            chat.member.some((m:any) => m.id === user.id)
        )


        if (existingChat) {
            this.selectChat(existingChat);
            this.closeAddChatModal();
            return;
        }

        this.apiService.createChat('', CHAT_TYPES.DM, [user.id, this.currentUserId]).subscribe({
            next: (response:any) => {
                const newRoomId = response.roomId || response.chat?.roomId;

                this.apiService.getUserChats({ limit: this.CHATS_LIMITS, offset: 0}).subscribe({
                    next: (response) => {
                        const chatsData = response.results || response;
                        
                        this.chats = chatsData.map((chat: any) => ({
                            ...chat,
                            hasUnread: false,
                            lastMessageAt: chat.last_message_at ? new Date(chat.last_message_at) : new Date()
                        }));
                        
                        this.totalChats = response.count || chatsData.length;
                        this.applyChatsFilter();

                        const newChat = this.chats.find( (c: ChatRoom) => c.roomId === newRoomId);
                        if(newChat){
                            this.selectChat(newChat);
                            this.reconnectWebSocket();
                        }
                    },
                    error: (error) => {
                        console.error("Error loading chats after creation:", error);
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
            const isImage = ALLOWED_IMAGE_TYPES.includes(file.type);
            const isDocument = ALLOWED_DOC_TYPES.includes(file.type);

            if(!isImage && !isDocument){
                alert("Solo se permiten imágenes, PDFs y documentos de Office.");
                return;
            }

            if(file.size > MAX_FILE_SIZE){
                alert("El archivo excede el tamaño maximo de 10 mb.");
                return;
            }

            this.selectedFile = file;
            this.selectedFileType = isImage ? 'image' : 'file';

            if(isImage) {
                const reader = new FileReader();
                reader.onload = (e: any) => {
                    this.imagePreview = e.target?.result as string;
                };
                reader.readAsDataURL(file);
            } else {
                this.imagePreview = null;
            }


        }
    }

    cancelFileSelection(): void {
        this.selectedFile = null;
        this.selectedFileType = null;
        this.imagePreview = null;
        if (this.fileInput) {
            this.fileInput.nativeElement.value = '';
        }
    }

    // Send image with message

    sendMessageWithFile(): void {

        if(!this.selectedFile || !this.selectedChat) return;

        this.uploadingImage = true;

        this.apiService.uploadChatFile(
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
                    file: response.file || null,
                    fileName: response.fileName || null,
                    fileType: response.fileType || null,
                    fileSize: response.fileSize || null,
                    type: response.type,
                    fromUpload: true,
                    userName: response.userName,
                    userImage: response.userImage,
                    timestamp: response.timestamp
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
                        image: response.image,
                        file: response.file || null,
                        fileName: response.fileName,
                        fileType: response.fileType || null,
                        fileSize: response.fileSize || null,
                        type: response.type,
                    });
                    this.shouldScrollToBottom = true;
                });

                this.uploadingImage = false;
                this.cancelFileSelection();
                this.newMessage = '';


                if(this.selectedChat?.type === 'SUPPORT' && this.selectedChat?.assigned_agent === this.currentUserId){
                    this.apiService.markChatAsRead(this.selectedChat.roomId).subscribe({
                        next: () => {
                            const chatIndex = this.supportChats.findIndex(
                                c => c.roomId === this.selectedChat!.roomId 
                            );

                            if(chatIndex !== -1){
                                this.supportChats[chatIndex].unread_count = 0;
                            }
                    }
            });
        }

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

    moveSupportChatToTop(roomId: string): void {
        const chatIndex = this.supportChats.findIndex( c=> c.roomId === roomId);

        if(chatIndex > 0){
            const [chat] = this.supportChats.splice(chatIndex, 1);
            this.supportChats.unshift(chat);
            this.filteredSupportChats = [...this.supportChats];
        }
    }

    incrementUnreadCount(roomId: string): void {
        const chatIndex = this.chats.findIndex( c=> c.roomId === roomId);

        if(chatIndex !== -1){
            this.chats[chatIndex].unread_count = (this.chats[chatIndex].unread_count || 0) + 1
        }
    }

    formatFileSize(bytes: number): string {
        if(bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getFileIcon(fileType: string): string {
        if(fileType.includes('pdf')) return 'ri-files-pdf-line';

        if( fileType.includes('word') || fileType.includes('document') ) return  'ri-file-word-line';

        if( fileType.includes('excel') || fileType.includes('spreadsheet') ) return 'ri-file-excel-line';

        if( fileType.includes('powerpoint') || fileType.includes('presentation') ) return 'ri-file-powerpoint-line';

        if( fileType.includes('text') ) return 'ri-file-text-line';

        return 'ri-file-line'
    }

    @HostListener('document:paste', ['$event'])
    onPaste(event: ClipboardEvent): void {
        if(!this.selectedChat) return;

        const clipboardData = event.clipboardData;

        if(!clipboardData) return;

        const items = clipboardData.items;

        for(let i=0; i < items.length; i++){
            const item = items[i];

            if(item.kind === 'file'){
                const file = item.getAsFile();
                if(!file) continue;

                if(this.isValidFileType(file)){
                    event.preventDefault();
                    this.handlePastedFile(file);
                    return;
                }
            }
        }

    }

    isValidFileType(file: File): boolean {
        const allowedTypes = [
            // Imagenes
            'image/jpeg', 'image/png', 'image/gif', 'image/webp',
            // Documentos
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain'
        ];

        return allowedTypes.includes(file.type);
    }

    handlePastedFile(file: File): void {
        
        if(file.size > MAX_FILE_SIZE){
            alert("¡Archivo excede el peso máximo de 10MB!");
            return;
        }

        let fileName = file.name;

        if(fileName === 'image.png' || !fileName) {
            const timestamp = new Date().toISOString().replace(/[:.-]/g, '-');
            fileName = `captura-${timestamp}.png`;
        }

        this.selectedFile = new File([file], fileName, { type: file.type});
        this.selectedFileType = file.type.startsWith('image/') ? 'image' : 'file';

        if(this.selectedFileType === 'image'){
            const reader = new FileReader();
            reader.onload = (e: any) => {
                this.ngZone.run(() => {
                    this.imagePreview = e.target?.result as string;
                });
            }
            reader.readAsDataURL(this.selectedFile);
        } else {
            this.imagePreview = null;
        }

    }

    loadSupportChats(): void {
        this.loadingSupportChats = true;

        this.apiService.getSupportChats().subscribe({
            next: (response) => {
                const chats = response.result || response;
                this.supportChats = chats.map((chat: any) => ({
                    ...chat,
                    hasUnread: false,
                    lastMessageAt: chat.last_message_at ? new Date(chat.last_message_at) : new Date()
                }));
                this.filteredSupportChats = [...this.supportChats];

                if(this.selectedChat) {
                    const updated = this.supportChats.find(c => c.roomId === this.selectedChat!.roomId);
                    if(updated){
                        this.selectedChat = updated;
                    }
                }

                this.loadingSupportChats = false;
            },
            error: (error) => {
                console.error("Error loading support chats:", error);
                this.loadingSupportChats = false;
            }
        })
    }

    onTabChange(tab: 'internal' | 'support'): void {
        this.activeTab = tab;

        if(tab === 'support') {
            this.supportUnreadCount = 0;
            this.loadSupportChats();
        }
    }

    onTakeChat(roomId: string): void {
        this.apiService.takeSupportChat(roomId).subscribe({
            next: () => {
                const chat = this.supportChats.find( c => c.roomId === roomId);
                if(chat) {
                    chat.assigned_agent = this.currentUserId ?? undefined;
                    this.selectChat(chat);
                }
                this.loadSupportChats();

                this.ws?.send(JSON.stringify({
                    action: 'support_update',
                    roomId: roomId
                }));
            },
            error: (err) => {
                console.error('Error taking support chat:', err);
                alert('Error taking support chat. Please try again.');
            }
        });
    }

    onReleaseChat(roomId: string): void {
        this.apiService.releaseSupportChat(roomId).subscribe({
            next: () => {
                this.loadSupportChats();

                this.ws?.send(JSON.stringify({
                    action: 'support_update',
                    roomId: roomId
                }));
            },
            error: (err) => {
                console.error('Error releasing support chat:', err);
                alert('Error releasing support chat. Please try again.')
            }
        })
    }

    private isSupportChat(roomId: string): boolean {
        return this.supportChats.some( c => c.roomId === roomId);
    }

}