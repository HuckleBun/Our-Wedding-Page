import { PageHeader } from "@/components/PageHeader";
import { getSite } from "@/lib/site";

export default function RegistryPage() {
  const { registry } = getSite();

  return (
    <div className="container">
      <PageHeader title="Registry" lead={registry.lead} />
      <a
        href={registry.amazonUrl}
        className="registry-amazon-link"
        target="_blank"
        rel="noopener noreferrer"
      >
        {registry.linkLabel}
      </a>
    </div>
  );
}
