import { NavSidebar } from "@/components/nav-sidebar";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <NavSidebar />
      <main className="flex-1 overflow-auto p-6">{children}</main>
    </div>
  );
}
