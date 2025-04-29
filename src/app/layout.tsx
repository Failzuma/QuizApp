import type { Metadata } from 'next';
import { Inter } from 'next/font/google'; // Use Inter font
import './globals.css';
import { cn } from '@/lib/utils';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' }); // Configure Inter font

export const metadata: Metadata = {
  title: 'QuizApp - Gamified Learning', // Updated title
  description: 'Interactive and gamified learning platform.', // Simplified description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      {/* Apply the font variable to the body */}
      <body className={cn("min-h-screen bg-background font-sans antialiased", inter.variable)}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
