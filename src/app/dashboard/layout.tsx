import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Dashboard | Trellis PM",
  description: "Manage your projects and work items",
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

