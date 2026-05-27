import { PageHeader } from "@/components/PageHeader";
import { getSite } from "@/lib/site";

export default function AboutPage() {
  const site = getSite();

  return (
    <div className="container">
      <PageHeader
        title="About Us"
        lead="A little more about the couple."
      />
      {site.about.sections.map((section) => (
        <article key={section.title} className="panel">
          <h2>{section.title}</h2>
          <p>{section.body}</p>
        </article>
      ))}
    </div>
  );
}
