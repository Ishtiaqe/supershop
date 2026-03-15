import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Expenses | SuperShop Dashboard",
  description: "Track and manage store operational expenses.",
}

export default function ExpensesLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
