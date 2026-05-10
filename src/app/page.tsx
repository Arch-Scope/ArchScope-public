import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Network } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur-sm">
        <div className="h-12 max-w-7xl mx-auto px-4 flex items-center justify-center">
          <Link href="/">
            <div className="flex items-center gap-2 cursor-pointer">
              <Network className="w-6 h-6 text-gray-900" />
              <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
                Arch<span className="text-cyan-600">Scope</span>
              </h1>
            </div>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center space-y-6">
          <h2 className="text-5xl font-bold tracking-tight text-gray-900">
            Design. Simulate. Optimize.
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            A powerful tool for designing and simulating high-load distributed
            system architectures. Test your system's performance under various
            load scenarios before deployment.
          </p>
          <div className="flex gap-4 justify-center pt-4">
            <Link href="/simulator">
              <Button size="lg" className="btn-cyan-variant">
                Launch App
              </Button>
            </Link>
            <Link href="/guide">
              <Button size="lg" variant="outline">
                Get Started
              </Button>
            </Link>
            <Link href="/about">
              <Button size="lg" variant="outline">
                About Us
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-20">
          <div className="panel-container">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-cyan-600"
                >
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18" />
                  <path d="M9 21V9" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Visual Design</h3>
              <p className="text-sm text-gray-600">
                Drag-and-drop interface to design your system architecture
              </p>
            </div>
          </div>

          <div className="panel-container">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-green-500/10 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-green-600"
                >
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">
                Load Simulation
              </h3>
              <p className="text-sm text-gray-600">
                Simulate realistic traffic patterns and analyze performance
              </p>
            </div>
          </div>

          <div className="panel-container">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="text-purple-600"
                >
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold mb-2">Cost Analysis</h3>
              <p className="text-sm text-gray-600">
                Estimate infrastructure costs and optimize resource allocation
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
