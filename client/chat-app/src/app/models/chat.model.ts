export interface User {
  id: number;
  username: string;
  email: string;
  first_name?: string;
  last_name?: string;
  avatar?: string;
}

export interface Message {
  id: number;
  chat: number;
  sender: User;
  content: string;
  image?: string;
  created_at: string;
  is_read: boolean;
}

export interface Chat {
  id: number;
  participants: User[];
  last_message?: Message;
  created_at: string;
  updated_at: string;
}

export interface Contact {
  id: number;
  user: User;
  is_favorite: boolean;
}
