import React from 'react';

export function Footer() {
  return (
    <footer className="py-6 md:px-8 md:py-0 border-t bg-background">
      {/* Container uses flex and justify-center for centering */}
      <div className="container flex flex-col items-center justify-center gap-4 md:h-24 md:flex-row"> {/* Use justify-center */}
        {/* Added text-balance for better wrapping and text-center for explicit centering */}
        <p className="text-balance text-center text-sm leading-loose text-muted-foreground"> {/* Removed md:text-left, keep text-center */}
          © 2025 QuizApp. Copyright and Trademark failzuma.
        </p>
      </div>
    </footer>
  );
}
