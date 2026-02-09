import { ReactNode } from "react";
import { Header } from "./Header";
import { Footer } from "./Footer";

interface LayoutProps {
  children: ReactNode;
  showFooter?: boolean;
  showHeader?: boolean;
}

export function Layout({ children, showFooter = true, showHeader = true }: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {showHeader && <Header />}
      <main className={`flex-1 ${showHeader ? 'pt-[72px]' : ''}`} role="main">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  );
}