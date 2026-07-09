'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import {
  ArrowLeft,
  Network,
  Boxes,
  Brain,
  Rocket,
  Code2,
  Mail,
  Users
} from 'lucide-react';
import { ContributorsScroll } from '@/components/common/contributors-scroll';

export default function AboutPage() {
  const router = useRouter();
  return (
    <div className="min-h-screen bg-gray-50">

      {/* HEADER */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="relative max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

          {/* LEFT */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <span className="text-md font-medium text-gray-500">
              About
            </span>
          </div>

          {/* CENTER LOGO */}
          <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2">
            <Network className="w-6 h-6 text-gray-900" />
            <div className="px-2 py-1 rounded-lg">
              <h1 className="text-2xl font-semibold tracking-tight">
                <span className="text-gray-900">Arch</span>
                <span className="text-cyan-600">Scope</span>
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN */}
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">

        {/* HERO */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              Why We Built ArchScope
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 text-gray-700 leading-7">
            <p>
              Modern distributed systems are complex. Learning system design
              often means reading articles or drawing diagrams that never
              come to life.
              <br />
              We built ArchScope to change that - a place where you can
              <strong> design, simulate, and understand</strong> architectures
              interactively before deploying to production.
            </p>
          </CardContent>
        </Card>

        {/* WHAT IT DOES */}
        <div className="grid md:grid-cols-2 gap-6">

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Boxes className="w-5 h-5 text-cyan-600" />
                <CardTitle className="text-lg">
                  Interactive Architecture Design
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="text-gray-700 leading-7">
              Build distributed systems visually using infrastructure
              components like load balancers, databases, caches,
              queues, workers, and APIs.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <Rocket className="w-5 h-5 text-green-600" />
                <CardTitle className="text-lg">
                  Real-Time Simulation
                </CardTitle>
              </div>
            </CardHeader>

            <CardContent className="text-gray-700 leading-7">
              Simulate traffic flow, request handling, latency,
              scaling behavior, and bottlenecks before deploying
              systems in production.
            </CardContent>
          </Card>

        </div>

        {/* PHILOSOPHY */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Brain className="w-6 h-6 text-purple-600" />

              <CardTitle>
                Design Philosophy
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 text-gray-700 leading-7">
            <p>
              Architecture should be learned through experimentation,
              not just reading. Interacting with systems creates
              much deeper intuition than studying diagrams.
              We focus on visual learning, systems thinking,
              and rapid experimentation to make distributed
              systems concepts accessible to everyone.
            </p>
          </CardContent>
        </Card>

        {/* CREATORS */}
        <Card>
          <CardHeader>
            <CardTitle>
              Moderators
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">

              {/* PERSON 1 */}
              <div className="p-5 rounded-xl border bg-gradient-to-br from-cyan-50 to-white">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-semibold text-gray-900">
                      Arpit Godghate
                    </div>

                    <a
                      href="mailto:arpitgodghate24@gmail.com"
                      className="text-gray-400 hover:text-cyan-600 transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                    </a>
                    <a
                      href="https://www.linkedin.com/in/arpit-godghate-3870b61b7/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-cyan-600 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                    </a>
                  </div>

                  <div className="text-sm text-cyan-700 font-medium">
                    System Design • Simulation • Product Vision
                  </div>

                  <p className="text-sm text-gray-600 leading-6 pt-2">
                    Built core simulator engine, multi-selection system, mobile responsiveness, and advanced analytics features including latency breakdown and fast-forward simulation
                  </p>
                </div>
              </div>

              {/* PERSON 2 */}
              <div className="p-5 rounded-xl border bg-gradient-to-br from-purple-50 to-white">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-semibold text-gray-900">
                      Sneha Wasankar
                    </div>

                    <a
                      href="mailto:wasankar.sneha@gmail.com"
                      className="text-gray-400 hover:text-cyan-600 transition-colors"
                    >
                      <Mail className="w-4 h-4" />
                    </a>
                    <a
                      href="https://www.linkedin.com/in/sneha-wasankar-a6a29b1a3/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-cyan-600 transition-colors"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                      </svg>
                    </a>
                  </div>

                  <div className="text-sm text-purple-700 font-medium">
                    Product Engineering • UI/UX • Security
                  </div>

                  <p className="text-sm text-gray-600 leading-6 pt-2">
                    Led UI/UX development along with core business flows such as profile management, routing, design save/restore, and authentication.
                  </p>
                </div>
              </div>

            </div>
          </CardContent>
        </Card>

        {/* OPEN SOURCE */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Code2 className="w-6 h-6 text-orange-600" />
              <CardTitle>
                Open source
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent className="space-y-4 text-gray-700 leading-7">
            <p>
              ArchScope is open source and built independently. We believe
              in the power of community to make tools like this better.
              <br />
              If you're interested in contributing - whether it's adding new
              infrastructure components, improving simulation logic, or
              enhancing the UI - we'd love to have you.
            </p>

            <div className="pt-2">
              <Link href="https://github.com/arpitg24/ArchScope" target="_blank" rel="noopener noreferrer">
                <Button size="lg" className="btn-cyan-variant">
                  View on GitHub
                </Button>
              </Link>
            </div>

            <div className="pt-4 flex flex-col items-center text-center">
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-semibold text-gray-900">Contributors</span>
              </div>
              <div className="w-full sm:w-2/5 mx-auto">
                <ContributorsScroll />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* FOOTER */}
        <div className="text-center text-sm text-gray-500 pt-4">
          Built independently for learning, experimentation,
          and exploring distributed systems visually.
        </div>

      </div>
    </div>
  );
}