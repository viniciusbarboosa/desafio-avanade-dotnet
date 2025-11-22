import PrivateRoute from '@/components/PrivateRoute';
import { Sidebar } from '@/components/Sidebar';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PrivateRoute>
      <div className="flex min-h-screen w-full flex-col md:flex-row bg-gray-100 dark:bg-zinc-950">
        <Sidebar />
        <main className="flex-1 bg-muted/40 p-4 md:p-8">
          {children}
        </main>
      </div>
    </PrivateRoute>
  );
}