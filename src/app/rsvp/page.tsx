import { PageHeader } from "@/components/PageHeader";
import { RsvpForm } from "@/components/RsvpForm";

export default function RsvpPage() {
  return (
    <div className="container">
      <PageHeader
        title="RSVP"
        lead="Please respond by the date on your invitation. We can't wait to celebrate with you."
      />
      <RsvpForm />
    </div>
  );
}
