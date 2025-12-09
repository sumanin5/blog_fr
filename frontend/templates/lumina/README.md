# Lumina Blog System

A modern, tech-focused blog platform built with React, Tailwind CSS, and Shadcn UI concepts. Features AI summaries, Dark Mode, and a sci-fi aesthetic.

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have Node.js installed on your machine.

### 2. Create Project
Run the following commands in your terminal:

```bash
# Create a Vite project with React and TypeScript
npm create vite@latest lumina-blog -- --template react-ts
cd lumina-blog

# Install dependencies
npm install lucide-react @google/genai clsx tailwind-merge react-router-dom
```

### 3. Setup Tailwind CSS
If you are copying this code into a fresh project (not using the CDN version from the demo), initialize Tailwind:

```bash
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

Update your `tailwind.config.js`:
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class', // IMPORTANT for the theme toggle
  theme: {
    extend: {
      // Copy the `theme.extend` section from the provided index.html here
      // if you want to use the exact same custom colors/animations.
      animation: {
        'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      }
    },
  },
  plugins: [],
}
```

Add these to your `src/index.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

/* Copy the :root and .dark variables from the provided index.html here */
```

### 4. Run Locally
```bash
npm run dev
```

## 📦 Localization (No External Links)

To make the project completely offline-capable (removing dependencies on `picsum.photos`):

1.  **Images:**
    *   Create a folder `src/assets/images`.
    *   Download your preferred images and save them there (e.g., `avatar1.jpg`, `blog1.jpg`).
    *   In `data/posts.ts`:
        ```typescript
        // Import the images
        import avatar1 from '../assets/images/avatar1.jpg';
        import blog1 from '../assets/images/blog1.jpg';

        // Use them in the data object
        export const BLOG_POSTS = [
          {
             // ...
             imageUrl: blog1,
             author: {
               // ...
               avatar: avatar1
             }
          }
        ]
        ```

2.  **Icons:**
    *   The project uses `lucide-react`, which installs as an NPM package. It bundles the SVGs directly into your JavaScript code, so **no external network request is needed** for icons to show up. It is already "local".

3.  **Fonts:**
    *   Currently, fonts are loaded from Google Fonts.
    *   To localize: Download the "Inter" and "JetBrains Mono" font families.
    *   Place them in `src/assets/fonts`.
    *   Use `@font-face` in your CSS to load them locally.

## 🔑 AI Features
To enable Gemini AI summaries:
1.  Get an API Key from Google AI Studio.
2.  Create a `.env` file in the root directory:
    ```
    VITE_API_KEY=your_actual_api_key_here
    ```