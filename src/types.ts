
export interface Memory {
  slug: string;
  title: string;
  shortMessage: string;
  memoryContent: string;
  images: string[]; // Array of public image URLs from R2
  createdAt: string; // ISO date string
  editKey: string; // Secret key for editing/deleting
  avatarUrl?: string;
  coverImageUrl?: string;
}

export interface MemorySummary {
  slug: string;
  title: string;
  createdAt: string;
}

export interface CreatedMemoryInfo {
  slug:string;
  editKey: string;
}

export interface MemoryUpdatePayload {
  title: string;
  shortMessage: string;
  memoryContent: string;
  images: string[];
  avatarUrl?: string | null;
  coverImageUrl?: string | null;
}
