import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { BlogList } from './components/BlogList';
import { BlogPostView } from './components/BlogPostView';
import { LoginPage } from './components/auth/LoginPage';
import { RegisterPage } from './components/auth/RegisterPage';
import { ThemeProvider } from './components/ThemeContext';
import { HomePage } from './components/HomePage';
import { BLOG_POSTS } from './data/posts';

const App: React.FC = () => {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="lumina-theme">
      <BrowserRouter>
        <div className="min-h-screen bg-background font-sans antialiased text-foreground transition-colors duration-300 flex flex-col">
          <Header />

          <main className="flex-1 relative">
            {/* Subtle Global Gradient for that "Tech" feel */}
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-secondary/5 pointer-events-none -z-10" />

            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/blog" element={<BlogList posts={BLOG_POSTS} />} />
              <Route path="/blog/:id" element={<BlogPostView />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
            </Routes>
          </main>

          <footer className="border-t border-border/40 py-6 md:py-0 bg-background/80 backdrop-blur-sm">
            <div className="container flex flex-col items-center justify-between gap-4 md:h-24 md:flex-row mx-auto px-4 max-w-screen-2xl">
              <p className="text-center text-sm leading-loose text-muted-foreground md:text-left font-mono">
                SYSTEM_STATUS: <span className="text-green-500">ONLINE</span> // BUILT_BY_LUMINA
              </p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <a href="#" className="hover:underline hover:text-primary transition-colors">Protocol</a>
                <a href="#" className="hover:underline hover:text-primary transition-colors">Data_Policy</a>
              </div>
            </div>
          </footer>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
