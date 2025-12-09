import React from 'react';
import { BlogPost } from '../types';
import { Card, CardContent, CardFooter, CardHeader } from './ui/Card';
import { Badge } from './ui/Badge';
import { Clock, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

interface BlogListProps {
  posts: BlogPost[];
}

export const BlogList: React.FC<BlogListProps> = ({ posts }) => {
  return (
    <div className="container py-8 mx-auto px-4 max-w-screen-xl">
      <div className="flex flex-col items-start gap-4 md:flex-row md:justify-between md:gap-8 mb-10">
        <div className="grid gap-1">
          <h1 className="text-3xl font-bold tracking-tight text-primary">Latest Writings</h1>
          <p className="text-lg text-muted-foreground">
            Thoughts, tutorials, and insights on development, design, and AI.
          </p>
        </div>
      </div>
      
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <Link key={post.id} to={`/blog/${post.id}`} className="block h-full">
            <Card 
              className="group flex flex-col h-full overflow-hidden transition-all hover:shadow-lg cursor-pointer border-border/60"
            >
              <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
                <img 
                  src={post.imageUrl} 
                  alt={post.title} 
                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
              </div>
              <CardHeader className="space-y-2 p-5">
                <div className="flex gap-2 mb-1">
                  {post.tags.slice(0, 2).map(tag => (
                    <Badge key={tag} variant="secondary">{tag}</Badge>
                  ))}
                </div>
                <h3 className="font-bold text-xl leading-tight group-hover:text-blue-600 transition-colors">
                  {post.title}
                </h3>
              </CardHeader>
              <CardContent className="flex-1 p-5 pt-0">
                <p className="text-muted-foreground line-clamp-3">
                  {post.excerpt}
                </p>
              </CardContent>
              <CardFooter className="p-5 pt-0 text-sm text-muted-foreground flex justify-between items-center border-t border-border/50 mt-auto pt-4">
                <div className="flex items-center gap-2">
                  <img src={post.author.avatar} alt={post.author.name} className="w-6 h-6 rounded-full" />
                  <span className="font-medium">{post.author.name}</span>
                </div>
                <div className="flex items-center gap-4 text-xs">
                  <span className="flex items-center"><Calendar className="w-3 h-3 mr-1" /> {post.date}</span>
                  <span className="flex items-center"><Clock className="w-3 h-3 mr-1" /> {post.readTime}</span>
                </div>
              </CardFooter>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
};