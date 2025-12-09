export interface Author {
  name: string;
  avatar: string;
  role: string;
}

export interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: Author;
  date: string;
  readTime: string;
  imageUrl: string;
  tags: string[];
}
