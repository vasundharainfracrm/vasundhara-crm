import { TopBar } from "@/components/layout/TopBar";
import { ProfileForm } from "@/components/ui/ProfileForm";

export default function DashboardProfilePage() {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background">
      <TopBar title="Profile Settings" mode="employee" />
      <main className="flex-1 overflow-y-auto p-4 lg:p-8">
        <ProfileForm />
      </main>
    </div>
  );
}
