export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
export const ALLOWED_DOC_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]
export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export type selectedFileType =  'image' | 'file' | null;

export const CHAT_TYPES = {
    DM: 'DM',
    GROUP: 'GROUP'
} as const;