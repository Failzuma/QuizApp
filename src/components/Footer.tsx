import React from 'react';

export function Footer() {
  return (
    <footer className="py-6 border-t bg-background"> {/* Consistent padding */}
      {/* Container centers itself, text-center centers the text */}
      <div className="container">
        <p className="text-balance text-center text-sm leading-loose text-muted-foreground">
          © 2025 QuizApp. Copyright and Trademark failzuma.
        </p>
      </div>
    </footer>
  );
}
