import Nav from "@/components/landing/Nav";
import Hero from "@/components/landing/Hero";
import About from "@/components/landing/About";
import HowItWorks from "@/components/landing/HowItWorks";
import Footer from "@/components/landing/Footer";

export default function Home() {
  return (
    <div className="flex min-h-full flex-col bg-paper text-ink dark:bg-night dark:text-mist">
      <Nav />
      <main className="flex-1">
        <Hero />
        <About />
        <HowItWorks />
      </main>
      <Footer />
    </div>
  );
}
