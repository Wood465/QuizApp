import "./globals.css";

export const metadata = {
  title: "Smart Quiz",
  description: "Smart Quiz App",
};

export default function RootLayout({ children }) {
  return (
    <html lang="sl">
      <body>{children}</body>
    </html>
  );
}
