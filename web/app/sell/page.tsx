import { ListingForm } from "@/components/ListingForm";

export const metadata = { title: "Sell an item" };
export default function Page() {
  return (
    <div className="stack" style={{ maxWidth: 720 }}>
      <h1>Sell an item</h1>
      <ListingForm />
    </div>
  );
}
