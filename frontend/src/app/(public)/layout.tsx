import { Header } from "@/components/public/layout/header";
import { Footer } from "@/components/public/layout/footer";
import { GlobalBackground } from "@/components/public/layout/global-background";

export default function PublicLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="relative flex min-h-screen flex-col">
      <GlobalBackground />
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
