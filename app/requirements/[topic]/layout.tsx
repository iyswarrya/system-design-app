"use client";

import { useParams } from "next/navigation";
import { SummaryProvider } from "@/context/SummaryContext";
import SummaryPane from "@/components/SummaryPane";

export default function TopicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const topic = (params?.topic as string) ?? "";

  return (
    <SummaryProvider topic={topic}>
      <div className="flex min-h-screen gap-6 p-4 md:p-6">
        <div className="min-w-0 flex-1">{children}</div>
        <SummaryPane />
      </div>
    </SummaryProvider>
  );
}
