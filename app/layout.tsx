import "./globals.css";

export const metadata = {
  title: "ClubMatch",
  description: "Mobile-first racquet club matchmaking prototype"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
