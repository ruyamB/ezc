"use client";
import { WalletProvider } from "@/lib/wallet";
import { ProjectProvider } from "@/lib/project";

// Route-group layout for /config, /dashboard, /export, /deploy.
// Wallet + project (canvas + code) state is shared across all studio pages.
export default function StudioLayout({ children }: { children: React.ReactNode }) {
  return (
    <WalletProvider>
      <ProjectProvider>
        <div className="min-h-full bg-paper text-ink dark:bg-night dark:text-mist">{children}</div>
      </ProjectProvider>
    </WalletProvider>
  );
}
