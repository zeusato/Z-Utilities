import React from 'react'
import { Link } from 'react-router-dom'
import type { Tool } from '@/data/tools'

export default function ToolCard({ tool }: { tool: Tool }) {
  return (
    <Link to={`/tool/${tool.slug}`} className="rounded-2xl glass p-4 hover:bg-white/15 transition block">
      <div className="text-2xl">{tool.icon || '🛠'}</div>
      <div className="mt-2 font-semibold">{tool.name}</div>
      <div className="text-sm opacity-80">{tool.shortDesc}</div>
    </Link>
  )
}
