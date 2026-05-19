import type { Metadata } from "next";
import "./globals.css";
import { FriendRequestNotifications } from "@/widgets/friend-request-notifications/ui/FriendRequestNotifications";

export const metadata: Metadata = {
  title: "Tent",
  description: "Tent — соцсеть на Next.js + NestJS + Prisma",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
        <FriendRequestNotifications />
      </body>
    </html>
  );
}
