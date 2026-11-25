import { Suspense } from "react";
import { Inbox } from "@/components/Inbox";

export const metadata = { title: "Messages" };
export default function Page() {
  return <Suspense><Inbox /></Suspense>;
}
