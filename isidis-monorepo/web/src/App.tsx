import { BrowserRouter } from 'react-router-dom';
import { AppRoutes } from '@/routes';
import { Toaster } from "@/components/ui/sonner";
import { PresenceProvider } from "@/components/providers/presence-provider";
import { ServiceWorkerRegister } from "@/components/pwa/service-worker-register";

export default function App() {
  return (
    <PresenceProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-background font-sans antialiased flex flex-col dark">
          <AppRoutes />
        </div>
        <Toaster />
        <ServiceWorkerRegister />
      </BrowserRouter>
    </PresenceProvider>
  );
}
