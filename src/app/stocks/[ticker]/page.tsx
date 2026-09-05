import { redirect } from "next/navigation";

interface Props {
  params: Promise<{
    ticker: string;
  }>;
}

export default async function StockPage({ params }: Props) {
  const { ticker } = await params;
  redirect(`/dashboard/stocks/${ticker.toUpperCase()}`);
}