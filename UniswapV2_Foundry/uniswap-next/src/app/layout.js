// app/layout.js
import "./globals.css";

export const metadata = {
  title: "My Uniswap UI",
  description: "A Next.js app with Web3.js integration",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {/* Shared header, nav, etc. */}
        {children}
      </body>
    </html>
  );
}
