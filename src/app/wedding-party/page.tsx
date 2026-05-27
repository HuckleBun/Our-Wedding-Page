import { PageHeader } from "@/components/PageHeader";
// import { WeddingPartyGrid } from "@/components/WeddingPartyGrid";

export default function WeddingPartyPage() {
  return (
    <div className="container">
      <PageHeader
        title="Wedding Party"
        lead="The people standing with us on our big day."
      />
      <p className="page-lead coming-soon">Coming soon</p>
      {/* <WeddingPartyGrid /> */}
    </div>
  );
}
