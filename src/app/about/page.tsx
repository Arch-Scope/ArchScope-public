'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import {
  ArrowLeft,
  Network,
  Boxes,
  Brain,
  Rocket,
  Code2,
  Home,
  Mail
} from 'lucide-react';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50">

      {/* HEADER */}
      <div className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

          {/* LEFT */}
          <div className="flex items-center gap-4">
            <Link href="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>

            <div className="flex items-center gap-2">
              <Network className="w-6 h-6 text-cyan-600" />

              <h1 className="text-xl font-bold text-gray-900">
                About <span className="text-cyan-600">ArchScope</span>
              </h1>
            </div>
          </div>

          {/* RIGHT */}
          <Link href="/">
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Home className="w-4 h-4" />
              Open App
            </Button>
          </Link>
        </div>
      </div>

      {/* MAIN */}
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">

        {/* HERO */}
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">
              Why ArchScope Exists
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4 text-gray-700 leading-7">
            <p>
              Modern distributed systems are incredibly difficult to reason about.
              Designing scalable architectures usually happens on whiteboards,
              static diagrams, or expensive production environments.
            </p>

            <p>
              ArchScope was built to make architecture interactive.
              Instead of just drawing systems, you can simulate them,
              experiment with them, and understand how different
              infrastructure decisions affect performance and behavior.
            </p>

            <p>
              The goal is simple:
              make system design visual, educational, and exploratory.
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
              ArchScope is heavily inspired by the belief that
              architecture should be learned through experimentation.
            </p>

            <p>
              Reading about distributed systems is valuable,
              but interacting with them creates much deeper intuition.
            </p>

            <p>
              The platform focuses on:
            </p>

            <ul className="list-disc pl-6 space-y-2">
              <li>Visual learning</li>
              <li>Systems thinking</li>
              <li>Rapid experimentation</li>
              <li>Infrastructure intuition</li>
              <li>Interactive simulation</li>
            </ul>
          </CardContent>
        </Card>

        {/* TECH */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <Code2 className="w-5 h-5 text-orange-600" />

              <CardTitle>
                Built With
              </CardTitle>
            </div>
          </CardHeader>

          <CardContent>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">

              {[
                'Next.js',
                'React',
                'TypeScript',
                'Tailwind CSS',
                'React Flow',
                'Prisma',
              ].map((tech) => (
                <div
                  key={tech}
                  className="px-4 py-3 rounded-lg border bg-white text-sm font-medium text-gray-700"
                >
                  {tech}
                </div>
              ))}

            </div>
          </CardContent>
        </Card>

        {/* CREATORS */}
        <Card>
          <CardHeader>
            <CardTitle>
              Created By
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
                  </div>

                  <div className="text-sm text-cyan-700 font-medium">
                    System Design • Simulation • Product Vision
                  </div>

                  <p className="text-sm text-gray-600 leading-6 pt-2">
                    Focused on building interactive tools for understanding
                    distributed systems and infrastructure behavior visually.
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
                  </div>

                  <div className="text-sm text-purple-700 font-medium">
                    Engineering • Architecture • Experience Design
                  </div>

                  <p className="text-sm text-gray-600 leading-6 pt-2">
                    Passionate about creating intuitive developer experiences
                    and simplifying complex architectural concepts.
                  </p>
                </div>
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