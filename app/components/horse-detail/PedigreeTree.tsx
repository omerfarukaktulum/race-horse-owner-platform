'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card'
import { buildPedigreeTree, calculateTreePositions, getNodeColor, PedigreeTree as PedigreeTreeType } from '@/lib/utils/pedigree-tree'

interface HorseWithPedigree {
  name: string
  sireName?: string
  damName?: string
  sireSire?: string
  sireDam?: string
  damSire?: string
  damDam?: string
  sireSireSire?: string
  sireSireDam?: string
  sireDamSire?: string
  sireDamDam?: string
  damSireSire?: string
  damSireDam?: string
  damDamSire?: string
  damDamDam?: string
}

interface Props {
  horse: HorseWithPedigree
}

export function PedigreeTree({ horse }: Props) {
  const [tree, setTree] = useState<PedigreeTreeType | null>(null)
  const [hoveredNode, setHoveredNode] = useState<string | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  
  useEffect(() => {
    // Debug: Log what data we're receiving
    console.log('[PedigreeTree] Received horse data:', {
      name: horse.name,
      sireName: horse.sireName,
      damName: horse.damName,
      sireSire: horse.sireSire,
      sireDam: horse.sireDam,
      damSire: horse.damSire,
      damDam: horse.damDam,
      sireSireSire: horse.sireSireSire,
      sireSireDam: horse.sireSireDam,
      sireDamSire: horse.sireDamSire,
      sireDamDam: horse.sireDamDam,
      damSireSire: horse.damSireSire,
      damSireDam: horse.damSireDam,
      damDamSire: horse.damDamSire,
      damDamDam: horse.damDamDam,
    })
    
    // Build and calculate tree positions
    const builtTree = buildPedigreeTree(horse)
    console.log('[PedigreeTree] Built tree with', builtTree.nodes.length, 'nodes:', builtTree.nodes.map(n => `${n.id}: ${n.name} (gen ${n.generation})`))
    
    const positionedTree = calculateTreePositions(builtTree, {
      generationWidth: 280,
      nodeHeight: 100,
      startX: 50,
      startY: 300,
    })
    setTree(positionedTree)
  }, [horse])
  
  if (!tree || tree.nodes.length === 0) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
        <CardContent className="py-16 text-center">
          <p className="text-gray-500">Pedigri bilgisi bulunmuyor</p>
        </CardContent>
      </Card>
    )
  }
  
  // Calculate SVG dimensions based on node positions
  const maxX = Math.max(...tree.nodes.map(n => n.x)) + 250
  const maxY = Math.max(...tree.nodes.map(n => n.y)) + 150
  const minY = Math.min(...tree.nodes.map(n => n.y)) - 150
  const svgHeight = Math.max(maxY - minY, 600) // Minimum 600px height
  
  return (
    <div>
      <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
        <CardContent className="p-6">
          {/* Desktop: Horizontal Tree */}
          <div className="hidden md:block overflow-x-auto overflow-y-auto" style={{ maxHeight: '800px' }}>
            <div style={{ minWidth: `${maxX}px`, minHeight: `${svgHeight}px` }}>
              <svg
                ref={svgRef}
                width={maxX}
                height={svgHeight}
                viewBox={`0 0 ${maxX} ${svgHeight}`}
                className="mx-auto"
              >
              {/* Draw connections first (lines behind nodes) */}
              {tree.connections.map((conn, index) => {
                const fromNode = tree.nodes.find(n => n.id === conn.from)
                const toNode = tree.nodes.find(n => n.id === conn.to)
                
                if (!fromNode || !toNode) return null
                
                // Adjust Y to account for offset
                const fromY = fromNode.y - minY + 100
                const toY = toNode.y - minY + 100
                
                return (
                  <line
                    key={`conn-${index}`}
                    x1={fromNode.x + 140} // Right edge of from node
                    y1={fromY}
                    x2={toNode.x - 10} // Left edge of to node
                    y2={toY}
                    stroke="#cbd5e1"
                    strokeWidth="2"
                    className="transition-all duration-300"
                  />
                )
              })}
              
              {/* Draw nodes */}
              {tree.nodes.map((node) => {
                const colors = getNodeColor(node.type)
                const isHovered = hoveredNode === node.id
                const adjustedY = node.y - minY + 100
                
                // Node size based on generation
                const nodeWidth = node.generation === 1 ? 160 : node.generation === 2 ? 140 : node.generation === 3 ? 120 : 100
                const nodeHeight = node.generation === 1 ? 60 : node.generation === 2 ? 50 : node.generation === 3 ? 45 : 40
                const fontSize = node.generation === 1 ? 16 : node.generation === 2 ? 14 : node.generation === 3 ? 12 : 11
                
                return (
                  <g
                    key={node.id}
                    onMouseEnter={() => setHoveredNode(node.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    className="cursor-pointer"
                  >
                    {/* Node background with gradient */}
                    <defs>
                      <linearGradient id={`gradient-${node.id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor={node.type === 'sire' ? '#dbeafe' : node.type === 'dam' ? '#fce7f3' : '#e0e7ff'} />
                        <stop offset="100%" stopColor={node.type === 'sire' ? '#bfdbfe' : node.type === 'dam' ? '#fbcfe8' : '#c7d2fe'} />
                      </linearGradient>
                    </defs>
                    
                    <rect
                      x={node.x - nodeWidth / 2}
                      y={adjustedY - nodeHeight / 2}
                      width={nodeWidth}
                      height={nodeHeight}
                      rx="8"
                      fill={`url(#gradient-${node.id})`}
                      stroke={node.type === 'sire' ? '#93c5fd' : node.type === 'dam' ? '#f9a8d4' : '#a5b4fc'}
                      strokeWidth={isHovered ? "3" : "2"}
                      className="transition-all duration-300"
                      style={{
                        filter: isHovered ? 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                      }}
                    />
                    
                    {/* Node text */}
                    <text
                      x={node.x}
                      y={adjustedY}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={fontSize}
                      fontWeight={node.generation === 1 ? "700" : node.generation === 2 ? "600" : "500"}
                      fill={node.type === 'sire' ? '#1e3a8a' : node.type === 'dam' ? '#831843' : '#312e81'}
                      className="pointer-events-none"
                    >
                      {node.name.length > 15 ? node.name.substring(0, 13) + '...' : node.name}
                    </text>
                  </g>
                )
              })}
              </svg>
            </div>
          </div>
          
          {/* Mobile: Vertical List */}
          <div className="md:hidden space-y-4">
            {/* Generation 1: Horse */}
            <div className="bg-gradient-to-r from-indigo-100 to-indigo-200 rounded-lg p-4 border-2 border-indigo-300">
              <p className="text-sm text-gray-600 mb-1">At</p>
              <p className="text-lg font-bold text-indigo-900">{horse.name}</p>
            </div>
            
            {/* Generation 2: Parents */}
            <div className="grid grid-cols-2 gap-3">
              {horse.sireName && (
                <div className="bg-gradient-to-r from-blue-100 to-blue-200 rounded-lg p-3 border border-blue-300">
                  <p className="text-xs text-gray-600 mb-1">Baba</p>
                  <p className="text-sm font-semibold text-blue-900">{horse.sireName}</p>
                </div>
              )}
              {horse.damName && (
                <div className="bg-gradient-to-r from-pink-100 to-pink-200 rounded-lg p-3 border border-pink-300">
                  <p className="text-xs text-gray-600 mb-1">Anne</p>
                  <p className="text-sm font-semibold text-pink-900">{horse.damName}</p>
                </div>
              )}
            </div>
            
            {/* Generation 3: Grandparents */}
            {(horse.sireSire || horse.sireDam || horse.damSire || horse.damDam) && (
              <>
                <p className="text-sm font-semibold text-gray-700 mt-4">Büyükanne & Büyükbaba</p>
                <div className="grid grid-cols-2 gap-2">
                  {horse.sireSire && (
                    <div className="bg-blue-50 rounded p-2 border border-blue-200">
                      <p className="text-xs text-gray-500">Baba'nın Babası</p>
                      <p className="text-xs font-medium text-blue-900">{horse.sireSire}</p>
                    </div>
                  )}
                  {horse.sireDam && (
                    <div className="bg-pink-50 rounded p-2 border border-pink-200">
                      <p className="text-xs text-gray-500">Baba'nın Annesi</p>
                      <p className="text-xs font-medium text-pink-900">{horse.sireDam}</p>
                    </div>
                  )}
                  {horse.damSire && (
                    <div className="bg-blue-50 rounded p-2 border border-blue-200">
                      <p className="text-xs text-gray-500">Anne'nin Babası</p>
                      <p className="text-xs font-medium text-blue-900">{horse.damSire}</p>
                    </div>
                  )}
                  {horse.damDam && (
                    <div className="bg-pink-50 rounded p-2 border border-pink-200">
                      <p className="text-xs text-gray-500">Anne'nin Annesi</p>
                      <p className="text-xs font-medium text-pink-900">{horse.damDam}</p>
                    </div>
                  )}
                </div>
              </>
            )}
            
            {/* Generation 4: Great-grandparents - Compact View */}
            {(horse.sireSireSire || horse.sireSireDam || horse.sireDamSire || horse.sireDamDam || 
              horse.damSireSire || horse.damSireDam || horse.damDamSire || horse.damDamDam) && (
              <>
                <p className="text-sm font-semibold text-gray-700 mt-4">Büyük Büyükanne & Büyük Büyükbaba</p>
                <div className="space-y-1 text-xs">
                  {horse.sireSireSire && <p className="text-gray-700">• {horse.sireSireSire}</p>}
                  {horse.sireSireDam && <p className="text-gray-700">• {horse.sireSireDam}</p>}
                  {horse.sireDamSire && <p className="text-gray-700">• {horse.sireDamSire}</p>}
                  {horse.sireDamDam && <p className="text-gray-700">• {horse.sireDamDam}</p>}
                  {horse.damSireSire && <p className="text-gray-700">• {horse.damSireSire}</p>}
                  {horse.damSireDam && <p className="text-gray-700">• {horse.damSireDam}</p>}
                  {horse.damDamSire && <p className="text-gray-700">• {horse.damDamSire}</p>}
                  {horse.damDamDam && <p className="text-gray-700">• {horse.damDamDam}</p>}
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

