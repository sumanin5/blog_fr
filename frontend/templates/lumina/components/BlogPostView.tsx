import React, { useState, useEffect } from 'react';
import { BlogPost } from '../types';
import { ArrowLeft, Sparkles, Calendar, Clock, Share2 } from 'lucide-react';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';
import { summarizePost } from '../services/geminiService';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { BLOG_POSTS } from '../data/posts';

export const BlogPostView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    const foundPost = BLOG_POSTS.find(p => p.id === id);
    if (foundPost) {
      setPost(foundPost);
      // Reset summary when post changes
      setSummary(null);
    } else {
      // Handle not found
      navigate('/blog', { replace: true });
    }
  }, [id, navigate]);

  const handleSummarize = async () => {
    if (!post) return;
    setLoadingSummary(true);
    const result = await summarizePost(post.content);
    setSummary(result);
    setLoadingSummary(false);
  };

  if (!post) return null;

  return (
    <article className="container py-10 mx-auto px-4 max-w-screen-lg animate-in fade-in duration-500">
      <Link to="/blog">
        <Button variant="ghost" className="mb-8 pl-0 hover:pl-2 transition-all">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Articles
        </Button>
      </Link>

      <div className="space-y-4 text-center mb-10">
        <div className="flex items-center justify-center gap-2 mb-4">
          {post.tags.map(tag => (
            <Badge key={tag} variant="secondary" className="px-3 py-1 text-sm">{tag}</Badge>
          ))}
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight lg:text-6xl text-primary">
          {post.title}
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          {post.excerpt}
        </p>
        
        <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground pt-4">
          <div className="flex items-center gap-2">
            <img src={post.author.avatar} alt={post.author.name} className="w-10 h-10 rounded-full border border-border" />
            <div className="text-left">
              <p className="font-medium text-foreground">{post.author.name}</p>
              <p className="text-xs">{post.author.role}</p>
            </div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex flex-col items-start gap-1">
             <span className="flex items-center"><Calendar className="w-3 h-3 mr-2" /> {post.date}</span>
             <span className="flex items-center"><Clock className="w-3 h-3 mr-2" /> {post.readTime}</span>
          </div>
        </div>
      </div>

      <div className="aspect-video w-full overflow-hidden rounded-xl bg-muted mb-10 border border-border">
        <img 
          src={post.imageUrl} 
          alt={post.title} 
          className="h-full w-full object-cover"
        />
      </div>

      {/* AI Summary Section */}
      <div className="mb-10 p-6 rounded-xl border border-blue-100 bg-blue-50/50 dark:bg-blue-950/10 dark:border-blue-900/50">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <Sparkles className="h-5 w-5" />
            <h3 className="font-semibold text-lg">AI Summary</h3>
          </div>
          {!summary && (
            <Button 
              onClick={handleSummarize} 
              isLoading={loadingSummary}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              size="sm"
            >
              Generate Summary
            </Button>
          )}
        </div>
        
        {loadingSummary && (
          <div className="space-y-2 animate-pulse">
            <div className="h-4 bg-blue-200/50 rounded w-3/4"></div>
            <div className="h-4 bg-blue-200/50 rounded w-full"></div>
            <div className="h-4 bg-blue-200/50 rounded w-5/6"></div>
          </div>
        )}

        {summary && (
          <div className="prose prose-blue max-w-none text-blue-900/80 dark:text-blue-100/80 leading-relaxed text-sm md:text-base animate-in slide-in-from-top-2 duration-300">
            {summary}
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="prose prose-slate dark:prose-invert max-w-none prose-lg prose-headings:font-bold prose-headings:tracking-tight prose-a:text-blue-600 hover:prose-a:text-blue-500">
        {post.content.split('\n\n').map((paragraph, index) => (
          <p key={index} className="mb-4 leading-7 text-foreground/90">{paragraph}</p>
        ))}
      </div>

      <div className="mt-12 pt-8 border-t border-border flex justify-between items-center">
        <div className="text-muted-foreground text-sm">
          Liked this article? Share it with your friends.
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Share2 className="mr-2 h-4 w-4" /> Share
          </Button>
        </div>
      </div>
    </article>
  );
};