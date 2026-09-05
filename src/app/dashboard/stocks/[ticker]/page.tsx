import { notFound } from "next/navigation";
import { getCurrentUser } from "@/lib/auth-server";
import StockDetail from "./stock-detail";

interface PageProps {
  params: Promise<{
    ticker: string;
  }>;
}

export default async function StockPage({
  params,
}: PageProps) {
  const user =
    await getCurrentUser();

  if (!user) { 
    notFound();
  }

  const { ticker } =
    await params;

  return (
    <StockDetail
      ticker={ticker.toUpperCase()}
    />
  );
}