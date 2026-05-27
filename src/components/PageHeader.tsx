type PageHeaderProps = {
  title: string;
  lead?: string;
};

export function PageHeader({ title, lead }: PageHeaderProps) {
  return (
    <header className="page-header">
      <h1 className="page-title">{title}</h1>
      {lead ? <p className="page-lead">{lead}</p> : null}
    </header>
  );
}
