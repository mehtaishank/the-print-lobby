import "./globals.css";

export const metadata = {
  title: "The Print Lobby — upload & print",
  description:
    "Upload your notes or documents, choose print options, pay, and pick up or get them delivered.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
