import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

interface SupportChat {
    roomId: string;
    name: string;
    type: string;
    member: any[];
    last_message: string | null;
    assigned_agent?: string;
    assigned_agent_info?: { name: string; image?: string };
    guest_user?: { image?: string; name?: string };
}

@Component({
    selector: 'app-support-chat-item',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './support-chat-item.component.html',
    styleUrls: ['./support-chat-item.component.scss']
})

export class SupportChatItemComponent {

    @Input() chat!: SupportChat;

    @Input() isSelected: boolean = false;

    @Output() take = new EventEmitter<string>();

    @Output() select = new EventEmitter<SupportChat>();

    @Output() release = new EventEmitter<string>();

    get isTaken(): boolean {
        return Boolean(this.chat.assigned_agent);
    }

    get agentName(): string {
        return this.chat.assigned_agent_info?.name || 'Agente';
    }

    onTake(event: Event): void {
        event.stopPropagation();
        this.take.emit(this.chat.roomId);
    }

    onRelease(event: Event): void {
        event.stopPropagation();
        this.release.emit(this.chat.roomId);
    }

    @Input() currentUserId: string = '';

    get isAssignedToCurrentAgent(): boolean {
        return String(this.chat.assigned_agent) === String(this.currentUserId);
    }

    get canTake(): boolean {
        return !this.isTaken;
    }

    get canSendMessage(): boolean {
        return !this.isTaken || this.isAssignedToCurrentAgent;
    }

}