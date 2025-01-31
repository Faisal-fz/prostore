import Footer from "@/components/footer";
import Header from "@/components/shared/header";

export default function RootLayout({
    children,
  }: Readonly<{
    children: React.ReactNode;
  }>) {
    return (
      <html lang="en">
       <div className="flex h-screen flex-col">
       <Header />
        <main className="flex-1 wrapper">
            {children}
        </main>
        <Footer />
       </div>
      </html>
    );
  }