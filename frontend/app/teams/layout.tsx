import { AuthGuard } from "@/components/AuthGuard";

export default function TeamsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AuthGuard>{children}</AuthGuard>;
}
