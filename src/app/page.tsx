import { WorkspaceShell } from "@/components/workspace-shell";
import { providerRegistry } from "@/lib/runtime/adapters/providers";

export default function Home() {
  const providers = providerRegistry.map((provider) => ({
    id: provider.id,
    label: provider.label,
    configured: provider.isConfigured(),
  }));

  return <WorkspaceShell providers={providers} />;
}
