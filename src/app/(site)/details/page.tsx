import { PageHeader } from "@/components/PageHeader";
import { getSite } from "@/lib/site";

export default function DetailsPage() {
  const { details } = getSite();

  return (
    <div className="container">
      <PageHeader title="Details" lead={details.lead} />
      {details.sections.map((section) => (
        <article key={section.title} className="panel">
          <h2>{section.title}</h2>
          <p>{section.body}</p>
        </article>
      ))}
    </div>
  );
}
