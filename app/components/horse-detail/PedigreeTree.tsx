'use client'

import { useState, useEffect, useMemo } from 'react'
import dynamic from 'next/dynamic'
import { Card, CardContent } from '@/app/components/ui/card'

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false })

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

interface GraphNode {
  id: string
  name: string
  generation: number
  type: 'sire' | 'dam' | 'horse'
  x?: number
  y?: number
  fx?: number
  fy?: number
}

interface GraphLink {
  source: string
  target: string
}

export function PedigreeTree({ horse }: Props) {
  const [graphData, setGraphData] = useState<{ nodes: GraphNode[]; links: GraphLink[] } | null>(null)

  // Build graph data from horse pedigree
  useEffect(() => {
    const nodes: GraphNode[] = []
    const links: GraphLink[] = []
    const nodeMap = new Map<string, GraphNode>()

    // Generation 1: The horse itself
    const horseNode: GraphNode = {
      id: 'horse',
      name: horse.name,
      generation: 1,
      type: 'horse',
    }
    nodes.push(horseNode)
    nodeMap.set('horse', horseNode)

    // Generation 2: Parents
    if (horse.sireName) {
      const sireNode: GraphNode = {
        id: 'sire',
        name: horse.sireName,
        generation: 2,
        type: 'sire',
      }
      nodes.push(sireNode)
      nodeMap.set('sire', sireNode)
      links.push({ source: 'horse', target: 'sire' })
    }

    if (horse.damName) {
      const damNode: GraphNode = {
        id: 'dam',
        name: horse.damName,
        generation: 2,
        type: 'dam',
      }
      nodes.push(damNode)
      nodeMap.set('dam', damNode)
      links.push({ source: 'horse', target: 'dam' })
    }

    // Generation 3: Grandparents
    if (horse.sireSire) {
      const node: GraphNode = {
        id: 'sire-sire',
        name: horse.sireSire,
        generation: 3,
        type: 'sire',
      }
      nodes.push(node)
      nodeMap.set('sire-sire', node)
      links.push({ source: 'sire', target: 'sire-sire' })
    }

    if (horse.sireDam) {
      const node: GraphNode = {
        id: 'sire-dam',
        name: horse.sireDam,
        generation: 3,
        type: 'dam',
      }
      nodes.push(node)
      nodeMap.set('sire-dam', node)
      links.push({ source: 'sire', target: 'sire-dam' })
    }

    if (horse.damSire) {
      const node: GraphNode = {
        id: 'dam-sire',
        name: horse.damSire,
        generation: 3,
        type: 'sire',
      }
      nodes.push(node)
      nodeMap.set('dam-sire', node)
      links.push({ source: 'dam', target: 'dam-sire' })
    }

    if (horse.damDam) {
      const node: GraphNode = {
        id: 'dam-dam',
        name: horse.damDam,
        generation: 3,
        type: 'dam',
      }
      nodes.push(node)
      nodeMap.set('dam-dam', node)
      links.push({ source: 'dam', target: 'dam-dam' })
    }

    // Generation 4: Great-grandparents
    const gen4Map = [
      { id: 'sire-sire-sire', name: horse.sireSireSire, parent: 'sire-sire' },
      { id: 'sire-sire-dam', name: horse.sireSireDam, parent: 'sire-sire' },
      { id: 'sire-dam-sire', name: horse.sireDamSire, parent: 'sire-dam' },
      { id: 'sire-dam-dam', name: horse.sireDamDam, parent: 'sire-dam' },
      { id: 'dam-sire-sire', name: horse.damSireSire, parent: 'dam-sire' },
      { id: 'dam-sire-dam', name: horse.damSireDam, parent: 'dam-sire' },
      { id: 'dam-dam-sire', name: horse.damDamSire, parent: 'dam-dam' },
      { id: 'dam-dam-dam', name: horse.damDamDam, parent: 'dam-dam' },
    ]

    gen4Map.forEach(({ id, name, parent }) => {
      if (name && nodeMap.has(parent)) {
        const type = id.endsWith('-sire') ? 'sire' : 'dam'
        const node: GraphNode = {
          id,
          name,
          generation: 4,
          type,
        }
        nodes.push(node)
        nodeMap.set(id, node)
        links.push({ source: parent, target: id })
      }
    })

    // Set initial hierarchical positions (left to right, top to bottom)
    const width = 1000
    const height = 800
    const genWidth = width / 5 // Space between generations
    
    // Generation 1: Center left
    const mainHorseNode = nodeMap.get('horse')
    if (mainHorseNode) {
      mainHorseNode.x = genWidth
      mainHorseNode.y = height / 2
      mainHorseNode.fx = genWidth
      mainHorseNode.fy = height / 2
    }

    // Generation 2: Middle-left, vertically distributed
    const sireNode = nodeMap.get('sire')
    const damNode = nodeMap.get('dam')
    if (sireNode) {
      sireNode.x = genWidth * 2
      sireNode.y = height / 2 - 100
      sireNode.fx = genWidth * 2
      sireNode.fy = height / 2 - 100
    }
    if (damNode) {
      damNode.x = genWidth * 2
      damNode.y = height / 2 + 100
      damNode.fx = genWidth * 2
      damNode.fy = height / 2 + 100
    }

    // Generation 3: Position relative to their parents
    const sireSireNode = nodeMap.get('sire-sire')
    const sireDamNode = nodeMap.get('sire-dam')
    const damSireNode = nodeMap.get('dam-sire')
    const damDamNode = nodeMap.get('dam-dam')
    
    if (sireSireNode && sireNode && sireNode.y !== undefined) {
      sireSireNode.x = genWidth * 3
      sireSireNode.y = sireNode.y - 80
      sireSireNode.fx = genWidth * 3
      sireSireNode.fy = sireNode.y - 80
    }
    if (sireDamNode && sireNode && sireNode.y !== undefined) {
      sireDamNode.x = genWidth * 3
      sireDamNode.y = sireNode.y + 80
      sireDamNode.fx = genWidth * 3
      sireDamNode.fy = sireNode.y + 80
    }
    if (damSireNode && damNode && damNode.y !== undefined) {
      damSireNode.x = genWidth * 3
      damSireNode.y = damNode.y - 80
      damSireNode.fx = genWidth * 3
      damSireNode.fy = damNode.y - 80
    }
    if (damDamNode && damNode && damNode.y !== undefined) {
      damDamNode.x = genWidth * 3
      damDamNode.y = damNode.y + 80
      damDamNode.fx = genWidth * 3
      damDamNode.fy = damNode.y + 80
    }

    // Generation 4: Position relative to their grandparents
    const gen4Pairs = [
      { node: nodeMap.get('sire-sire-sire'), parent: sireSireNode, offset: -60 },
      { node: nodeMap.get('sire-sire-dam'), parent: sireSireNode, offset: 60 },
      { node: nodeMap.get('sire-dam-sire'), parent: sireDamNode, offset: -60 },
      { node: nodeMap.get('sire-dam-dam'), parent: sireDamNode, offset: 60 },
      { node: nodeMap.get('dam-sire-sire'), parent: damSireNode, offset: -60 },
      { node: nodeMap.get('dam-sire-dam'), parent: damSireNode, offset: 60 },
      { node: nodeMap.get('dam-dam-sire'), parent: damDamNode, offset: -60 },
      { node: nodeMap.get('dam-dam-dam'), parent: damDamNode, offset: 60 },
    ]
    
    gen4Pairs.forEach(({ node, parent, offset }) => {
      if (node && parent && parent.y !== undefined) {
        node.x = genWidth * 4
        node.y = parent.y + offset
        node.fx = genWidth * 4
        node.fy = parent.y + offset
      }
    })

    setGraphData({ nodes, links })
  }, [horse])

  if (!graphData || graphData.nodes.length === 0) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
        <CardContent className="py-16 text-center">
          <p className="text-gray-500">Pedigri bilgisi bulunmuyor</p>
        </CardContent>
      </Card>
    )
  }

  // Get node color based on type
  const getNodeColor = (node: GraphNode): string => {
    if (node.type === 'horse') return '#818cf8' // Indigo
    if (node.type === 'sire') return '#60a5fa' // Blue
    return '#f472b6' // Pink
  }

  // Get node size based on generation
  const getNodeSize = (node: GraphNode): number => {
    if (node.generation === 1) return 12
    if (node.generation === 2) return 10
    if (node.generation === 3) return 8
    return 6
  }

  return (
    <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
      <CardContent className="p-6">
        <div className="w-full overflow-auto" style={{ height: '800px' }}>
          <ForceGraph2D
            graphData={graphData}
            width={1000}
            height={800}
            nodeLabel={(node: any) => `${node.name}\n(Generation ${node.generation})`}
            nodeColor={(node: any) => getNodeColor(node)}
            nodeVal={(node: any) => getNodeSize(node)}
            linkColor={() => '#cbd5e1'}
            linkWidth={2}
            linkDirectionalArrowLength={6}
            linkDirectionalArrowRelPos={1}
            linkDirectionalArrowColor={() => '#94a3b8'}
            cooldownTicks={50}
            onEngineStop={() => {
              // Force graph to stabilize
            }}
            d3AlphaDecay={0.1}
            d3VelocityDecay={0.3}
            nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
              const label = node.name
              const fontSize = node.generation === 1 ? 14 : node.generation === 2 ? 12 : node.generation === 3 ? 10 : 9
              ctx.font = `${fontSize}px Sans-Serif`
              ctx.textAlign = 'center'
              ctx.textBaseline = 'middle'
              ctx.fillStyle = node.type === 'horse' ? '#312e81' : node.type === 'sire' ? '#1e3a8a' : '#831843'
              
              // Draw node circle
              ctx.beginPath()
              ctx.arc(node.x, node.y, getNodeSize(node) * 1.5, 0, 2 * Math.PI, false)
              ctx.fillStyle = getNodeColor(node)
              ctx.fill()
              ctx.strokeStyle = node.type === 'horse' ? '#6366f1' : node.type === 'sire' ? '#3b82f6' : '#ec4899'
              ctx.lineWidth = 2
              ctx.stroke()
              
              // Draw text
              ctx.fillStyle = node.type === 'horse' ? '#312e81' : node.type === 'sire' ? '#1e3a8a' : '#831843'
              ctx.fillText(label, node.x, node.y + getNodeSize(node) * 2.5)
            }}
            nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
              ctx.fillStyle = color
              const size = getNodeSize(node) * 2
              ctx.beginPath()
              ctx.arc(node.x, node.y, size, 0, 2 * Math.PI, false)
              ctx.fill()
            }}
          />
        </div>
      </CardContent>
    </Card>
  )
}
