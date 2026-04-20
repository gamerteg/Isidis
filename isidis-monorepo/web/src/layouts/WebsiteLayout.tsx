import { Outlet } from 'react-router-dom';
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

export default function WebsiteLayout() {
    return (
        <>
            <Navbar />
            <main className="flex-1">
                <Outlet />
            </main>
            <Footer />
        </>
    )
}
