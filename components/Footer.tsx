import React from "react";

const Footer: React.FC = () => {
  return (
    <footer className="bg-background border-t border-border py-5 px-6 shadow-lg">
      <div className="flex flex-col md:flex-row justify-between items-center max-w-7xl mx-auto">
        <div className="flex items-center mb-4 md:mb-0">
          <h2 className="text-lg font-normal text-foreground mr-4 flex items-center">
            <span className="text-primary mr-1">Strati</span>fi
          </h2>
          <span className="text-xs text-muted-foreground">
            © 2025 All rights reserved
          </span>
        </div>

        <div className="flex flex-wrap gap-6">
          <a
            href="https://x.com/gangstrxyz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors text-xs"
            aria-label="Gangstr on X"
          >
            X (Twitter)
          </a>
          <a
            href="https://t.me/gangstrxyz"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-primary transition-colors text-xs"
            aria-label="Gangstr on Telegram"
          >
            Telegram
          </a>
          <a
            href="#"
            className="text-muted-foreground hover:text-primary transition-colors text-xs"
          >
            Privacy Policy
          </a>
          <a
            href="#"
            className="text-muted-foreground hover:text-primary transition-colors text-xs"
          >
            Terms of Service
          </a>
          <a
            href="#"
            className="text-muted-foreground hover:text-primary transition-colors text-xs"
          >
            Security
          </a>
          <a
            href="#"
            className="text-muted-foreground hover:text-primary transition-colors text-xs"
          >
            Support
          </a>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
