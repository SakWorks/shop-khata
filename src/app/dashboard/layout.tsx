import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "@/components/Sidebar";
import MobileNav from "@/components/MobileNav";
import FatherWelcome from "@/components/FatherWelcome";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("shop_name, full_name")
    .eq("id", user.id)
    .single();

  const shopName = profile?.shop_name || "My Shop";
  const fullName = profile?.full_name || "";

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar
        shopName={shopName}
        fullName={fullName}
      />

      <div className="flex-1 min-w-0">
        <main className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8 pb-24 md:pb-8">
          {children}
        </main>
      </div>

      <MobileNav />

      <FatherWelcome email={user.email} />
    </div>
  );
}