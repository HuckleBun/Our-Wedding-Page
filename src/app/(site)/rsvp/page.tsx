import { PageHeader } from "@/components/PageHeader";
import { RsvpForm } from "@/components/RsvpForm";

export default function RsvpPage() {
  return (
    <div className="container">
      <PageHeader
        title="RSVP"
        lead="We can't wait to celebrate with you. Look up your name below to let us know if you can make it."
      />
      <RsvpForm />
    </div>
  );
}
