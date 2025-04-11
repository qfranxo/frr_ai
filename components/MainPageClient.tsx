'use client';

import { ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface MainPageClientProps {
  posts: any[];  // 필요한 타입으로 수정
}

export default function MainPageClient({ posts }: MainPageClientProps) {
  const promptOptions = [
    {
      icon: "💼",
      title: "Professional Business Model",
      description: "She is a confident Asian business professional in her 30s, wearing a modern black suit, standing in an office setting"
    },
    {
      icon: "👔",
      title: "Young Fashion Model",
      description: "He is a trendy Asian fashion model in his 20s, wearing casual streetwear, posing in an urban environment"
    },
    {
      icon: "🏃",
      title: "Active Sports Model",
      description: "She is an energetic Asian athlete in her 20s, wearing stylish sportswear, in dynamic motion at a gym"
    },
    {
      icon: "✨",
      title: "High-end Fashion Model",
      description: "He is a sophisticated Asian model in his 30s, wearing luxury designer clothing, in an elegant studio setting"
    }
  ];

  return (
    <div>
      <h1>AI Generated</h1>
      <h1>Perfect Advertising Model</h1>
      
      <p>Generate your desired model instantly</p>
      <p>Make your brand stand out</p>
      
      <textarea
        placeholder="Describe the model you want to create..."
      />
      
      <h3>Featured Prompts</h3>
      
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-4xl font-bold text-center mb-6 font-kode-mono">
          AI Model Gallery
        </h1>
        <p className="text-xl text-gray-600 text-center mb-8 font-kode-mono">
          Discover Amazing AI-Generated Advertising Models
        </p>
        <Link 
          href="/gallery" 
          className="mt-8 inline-flex items-center text-blue-600 hover:text-blue-700 font-medium font-kode-mono"
        >
          Explore More Models
          <ArrowRight className="ml-2 w-4 h-4" />
        </Link>
      </div>

      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 font-kode-mono">
              Innovative Technology
            </h3>
            <p className="text-gray-600 max-w-3xl mx-auto font-kode-mono">
              Create stunning models with our cutting-edge AI engine
            </p>
          </div>
        </div>
      </section>

      <section className="bg-gray-50 py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-12">
            <h3 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4 font-kode-mono">
              Creator-Centric Platform
            </h3>
            <p className="text-gray-600 max-w-3xl mx-auto font-kode-mono">
              Empower your creativity with intuitive tools and community support
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {posts.map((post) => (
            <div key={post.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {post.title}
                </h3>
                <p className="text-gray-600 text-sm">{post.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 