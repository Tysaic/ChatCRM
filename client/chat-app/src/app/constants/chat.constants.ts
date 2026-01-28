export const CHAT_TYPES = {
    DM: 'DM',
    SELF: 'SELF',
    GROUP: 'GROUP'
} as const;


export type ChatType = typeof CHAT_TYPES[keyof typeof CHAT_TYPES];