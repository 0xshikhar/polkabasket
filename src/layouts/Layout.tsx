import { Navbar } from "../components/Navbar";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-sans">
      <Navbar />
      <main>{children}</main>
    </div>
  );
}
