import React, { lazy, Suspense, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import Header from '@/components/Header'
import { TOOLS } from '@/data/tools'
import { useRecentTools } from '@/hooks/useRecentTools'

export default function ToolPage() {
  const { slug } = useParams<{ slug: string }>()
  const tool = TOOLS.find(t => t.slug === slug)
  const { push } = useRecentTools()

  useEffect(() => {
    if (slug) push(slug)
  }, [slug, push])

  if (!tool) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="max-w-4xl mx-auto px-4 md:px-6 py-12">
          <div className="opacity-80">Không tìm thấy công cụ.</div>
        </main>
      </div>
    )
  }

  let ToolComp: React.ComponentType | null = null
  if (tool.componentPath) {
    ToolComp = lazy(() => import(/* @vite-ignore */ tool.componentPath))
  }

  return (
    <div className="min-h-screen">
      <Header />
      <main className="max-w-4xl mx-auto px-4 md:px-6 py-12">
        <h1 className="text-2xl md:text-3xl font-bold">{tool.name}</h1>
        {tool.shortDesc && <p className="opacity-80">{tool.shortDesc}</p>}

        <div className="mt-6">
          {ToolComp ? (
            <Suspense fallback={<div className="rounded-2xl glass p-6">Đang tải công cụ...</div>}>
              <ToolComp />
            </Suspense>
          ) : (
            <div className="rounded-2xl glass p-6">
              Tool <strong>{tool.slug}</strong> chưa được khai báo componentPath.
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
