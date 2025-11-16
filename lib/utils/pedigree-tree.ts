export interface PedigreeNode {
  id: string
  name: string
  generation: number // 1 = horse, 2 = parents, 3 = grandparents, 4 = great-grandparents
  position: number // Position within generation (0-indexed)
  type: 'sire' | 'dam' | 'unknown' // Paternal or maternal line
  x: number // Calculated X position for rendering
  y: number // Calculated Y position for rendering
  parentId?: string // ID of parent node for drawing connections
}

export interface PedigreeTree {
  nodes: PedigreeNode[]
  connections: Array<{ from: string; to: string }>
}

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

/**
 * Build a pedigree tree structure from horse data
 */
export function buildPedigreeTree(horse: HorseWithPedigree): PedigreeTree {
  const nodes: PedigreeNode[] = []
  const connections: Array<{ from: string; to: string }> = []
  
  // Generation 1: The horse itself
  const horseNode: PedigreeNode = {
    id: 'horse',
    name: horse.name,
    generation: 1,
    position: 0,
    type: 'unknown',
    x: 0,
    y: 0,
  }
  nodes.push(horseNode)
  
  // Generation 2: Parents
  if (horse.sireName) {
    const sireNode: PedigreeNode = {
      id: 'sire',
      name: horse.sireName,
      generation: 2,
      position: 0,
      type: 'sire',
      x: 0,
      y: 0,
      parentId: 'horse',
    }
    nodes.push(sireNode)
    connections.push({ from: 'horse', to: 'sire' })
  }
  
  if (horse.damName) {
    const damNode: PedigreeNode = {
      id: 'dam',
      name: horse.damName,
      generation: 2,
      position: 1,
      type: 'dam',
      x: 0,
      y: 0,
      parentId: 'horse',
    }
    nodes.push(damNode)
    connections.push({ from: 'horse', to: 'dam' })
  }
  
  // Generation 3: Grandparents
  if (horse.sireSire) {
    nodes.push({
      id: 'sire-sire',
      name: horse.sireSire,
      generation: 3,
      position: 0,
      type: 'sire',
      x: 0,
      y: 0,
      parentId: 'sire',
    })
    connections.push({ from: 'sire', to: 'sire-sire' })
  }
  
  if (horse.sireDam) {
    nodes.push({
      id: 'sire-dam',
      name: horse.sireDam,
      generation: 3,
      position: 1,
      type: 'dam',
      x: 0,
      y: 0,
      parentId: 'sire',
    })
    connections.push({ from: 'sire', to: 'sire-dam' })
  }
  
  if (horse.damSire) {
    nodes.push({
      id: 'dam-sire',
      name: horse.damSire,
      generation: 3,
      position: 2,
      type: 'sire',
      x: 0,
      y: 0,
      parentId: 'dam',
    })
    connections.push({ from: 'dam', to: 'dam-sire' })
  }
  
  if (horse.damDam) {
    nodes.push({
      id: 'dam-dam',
      name: horse.damDam,
      generation: 3,
      position: 3,
      type: 'dam',
      x: 0,
      y: 0,
      parentId: 'dam',
    })
    connections.push({ from: 'dam', to: 'dam-dam' })
  }
  
  // Generation 4: Great-grandparents
  const gen4Map = [
    { id: 'sire-sire-sire', name: horse.sireSireSire, parent: 'sire-sire', pos: 0 },
    { id: 'sire-sire-dam', name: horse.sireSireDam, parent: 'sire-sire', pos: 1 },
    { id: 'sire-dam-sire', name: horse.sireDamSire, parent: 'sire-dam', pos: 2 },
    { id: 'sire-dam-dam', name: horse.sireDamDam, parent: 'sire-dam', pos: 3 },
    { id: 'dam-sire-sire', name: horse.damSireSire, parent: 'dam-sire', pos: 4 },
    { id: 'dam-sire-dam', name: horse.damSireDam, parent: 'dam-sire', pos: 5 },
    { id: 'dam-dam-sire', name: horse.damDamSire, parent: 'dam-dam', pos: 6 },
    { id: 'dam-dam-dam', name: horse.damDamDam, parent: 'dam-dam', pos: 7 },
  ]
  
  gen4Map.forEach(({ id, name, parent, pos }) => {
    if (name) {
      // Determine type based on last part of ID
      const type = id.endsWith('-sire') ? 'sire' : 'dam'
      
      nodes.push({
        id,
        name,
        generation: 4,
        position: pos,
        type,
        x: 0,
        y: 0,
        parentId: parent,
      })
      connections.push({ from: parent, to: id })
    }
  })
  
  return { nodes, connections }
}

/**
 * Calculate positions for pedigree tree nodes
 * Horizontal layout (left to right)
 */
export function calculateTreePositions(
  tree: PedigreeTree,
  options: {
    generationWidth?: number // Horizontal distance between generations
    nodeHeight?: number // Vertical distance between nodes in same generation
    startX?: number // Starting X position
    startY?: number // Starting Y position
  } = {}
): PedigreeTree {
  const {
    generationWidth = 280,
    nodeHeight = 100,
    startX = 50,
    startY = 300,
  } = options
  
  const { nodes, connections } = tree
  
  // Group nodes by generation
  const generations: Record<number, PedigreeNode[]> = {}
  nodes.forEach((node) => {
    if (!generations[node.generation]) {
      generations[node.generation] = []
    }
    generations[node.generation].push(node)
  })
  
  // Calculate positions for each generation
  Object.keys(generations).forEach((genKey) => {
    const generation = parseInt(genKey)
    const genNodes = generations[generation]
    
    // X position based on generation
    const x = startX + (generation - 1) * generationWidth
    
    // Y position: center the generation vertically
    const totalHeight = genNodes.length * nodeHeight
    const startGenY = startY - totalHeight / 2
    
    genNodes.forEach((node, index) => {
      node.x = x
      node.y = startGenY + index * nodeHeight + nodeHeight / 2
    })
  })
  
  // Adjust Y positions to align children with their parents
  // Start from generation 2 and adjust based on parent position
  for (let gen = 2; gen <= 4; gen++) {
    const genNodes = generations[gen] || []
    
    // Group nodes by parent
    const parentGroups: Record<string, PedigreeNode[]> = {}
    genNodes.forEach((node) => {
      if (node.parentId) {
        if (!parentGroups[node.parentId]) {
          parentGroups[node.parentId] = []
        }
        parentGroups[node.parentId].push(node)
      }
    })
    
    // For each parent, center its children around it
    Object.entries(parentGroups).forEach(([parentId, children]) => {
      const parent = nodes.find((n) => n.id === parentId)
      if (parent && children.length > 0) {
        // Calculate the center Y position for these children
        const childrenHeight = children.length * nodeHeight
        const centerY = parent.y
        const startChildY = centerY - childrenHeight / 2 + nodeHeight / 2
        
        children.forEach((child, index) => {
          child.y = startChildY + index * nodeHeight
        })
      }
    })
  }
  
  return { nodes, connections }
}

/**
 * Get color for node based on type
 */
export function getNodeColor(type: 'sire' | 'dam' | 'unknown'): {
  gradient: string
  border: string
  text: string
} {
  if (type === 'sire') {
    return {
      gradient: 'from-blue-100 to-blue-200',
      border: 'border-blue-300',
      text: 'text-blue-900',
    }
  } else if (type === 'dam') {
    return {
      gradient: 'from-pink-100 to-pink-200',
      border: 'border-pink-300',
      text: 'text-pink-900',
    }
  } else {
    return {
      gradient: 'from-indigo-100 to-indigo-200',
      border: 'border-indigo-300',
      text: 'text-indigo-900',
    }
  }
}

