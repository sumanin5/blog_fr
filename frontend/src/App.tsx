import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "@/features/theme";
import { AuthProvider } from "@/features/auth";
import AppRoutes from "@/app/routes";

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="my-blog-theme">
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/*" element={<AppRoutes />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
