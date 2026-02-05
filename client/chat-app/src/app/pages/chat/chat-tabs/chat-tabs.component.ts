import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

export type TabId = 'internal' | 'support';

interface ChatId {
    id: TabId;
    label: string;
    unreadCount: number;
}

@Component({
    selector: 'app-chat-tabs',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './chat-tabs.component.html',
    styleUrls: ['./chat-tabs.component.scss']
})

export class ChatTabsComponent implements OnChanges {

    @Input() supportUnread: number = 0;

    @Input() adminUnread: number = 0;

    @Input() initialTab: TabId = 'internal';

    @Output() tabChanged = new EventEmitter<TabId>();

    activeTab: TabId = 'internal';

    tabs: ChatId[] = [
        { id: 'internal', label: 'Internos', unreadCount: 0 },
        { id: 'support', label: 'Vendedors', unreadCount: 0 },
    ]

    ngOnInit(): void {
        this.activeTab = this.initialTab;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if(changes['supportUnread']) {
            this.tabs[1].unreadCount = changes['supportUnread'].currentValue;
        }
        if(changes['adminUnread']) {
            this.tabs[0].unreadCount = changes['adminUnread'].currentValue;
        }
    }

    selectTab(tabId: TabId): void {
        this.activeTab = tabId;
        this.tabChanged.emit(tabId);
    }

    isActive(tabId: TabId): boolean {
        return this.activeTab === tabId;
    }

}