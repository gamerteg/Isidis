import { Outlet } from 'react-router-dom';
import { DashboardBottomNav } from "@/components/layout/dashboard-bottom-nav"
import { Footer } from "@/components/layout/Footer"

export default function DashboardLayout() {
    return (
        <div className="min-h-screen pb-24 md:pb-0 flex flex-col">
            <main className="flex-1">
                <Outlet />
            </main>
            <Footer />
            <DashboardBottomNav />
        </div>
    )
}
