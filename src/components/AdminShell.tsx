import { AdminNav } from "@/components/AdminNav";
import { PageHeader } from "@/components/PageHeader";

type AdminShellProps = {
  title: string;
  lead?: string;
  children: React.ReactNode;
};

export function AdminShell({ title, lead, children }: AdminShellProps) {
  return (
    <div className="container">
      <PageHeader title={title} lead={lead} />
      <AdminNav />
      {children}
    </div>
  );
}
