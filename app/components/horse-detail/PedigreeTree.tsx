'use client'

import { Card, CardContent } from '@/app/components/ui/card'

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
  // Check if we have any pedigree data
  const hasPedigree = horse.sireName || horse.damName

  if (!hasPedigree) {
    return (
      <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
        <CardContent className="py-16 text-center">
          <p className="text-gray-500">Pedigri bilgisi bulunmuyor</p>
        </CardContent>
      </Card>
    )
  }

  // Build pedigree data structure
  const pedigree = {
    // Generation 1: The horse itself (we'll show parents in Gen 2)
    // Generation 2: Parents
    sire: horse.sireName,
    dam: horse.damName,
    // Generation 3: Grandparents
    sireSire: horse.sireSire,
    sireDam: horse.sireDam,
    damSire: horse.damSire,
    damDam: horse.damDam,
    // Generation 4: Great-grandparents
    sireSireSire: horse.sireSireSire,
    sireSireDam: horse.sireSireDam,
    sireDamSire: horse.sireDamSire,
    sireDamDam: horse.sireDamDam,
    damSireSire: horse.damSireSire,
    damSireDam: horse.damSireDam,
    damDamSire: horse.damDamSire,
    damDamDam: horse.damDamDam,
  }

  // Calculate rowspan for each generation
  // Generation 2 (parents): 4 rows each (for their 2 children + 2 grandchildren each)
  // Generation 3 (grandparents): 2 rows each (for their 2 children)
  // Generation 4 (great-grandparents): 1 row each

  return (
    <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
      <CardContent className="p-6">
        <div className="overflow-x-auto">
          <div className="mb-4 text-center">
            <h3 className="text-lg font-semibold text-gray-800">{horse.name}</h3>
          </div>
          <table 
            id="pedigri"
            className="border-collapse"
            style={{ 
              width: '940px',
              border: '1px solid black'
            }}
          >
            <tbody>
              {/* Row 1: Sire line - Generation 2, 3, 4 */}
              <tr>
                {/* Generation 2: Sire */}
                {pedigree.sire && (
                  <td
                    rowSpan={4}
                    className="text-center p-2 border border-black align-middle"
                    style={{ 
                      backgroundColor: '#dbdbdb',
                      fontSize: '15px',
                      border: '1px solid black',
                      textAlign: 'center',
                      verticalAlign: 'middle'
                    }}
                  >
                    {pedigree.sire}
                  </td>
                )}
                {/* Generation 3: Sire's Sire */}
                {pedigree.sireSire && (
                  <td
                    rowSpan={2}
                    className="text-center p-2 border border-black align-middle"
                    style={{ 
                      backgroundColor: '#dbdbdb',
                      fontSize: '15px',
                      border: '1px solid black',
                      textAlign: 'center',
                      verticalAlign: 'middle'
                    }}
                  >
                    {pedigree.sireSire}
                  </td>
                )}
                {/* Generation 4: Sire's Sire's Sire */}
                {pedigree.sireSireSire && (
                  <td
                    className="text-center p-2 border border-black align-middle"
                    style={{ 
                      backgroundColor: '#dbdbdb',
                      fontSize: '15px',
                      border: '1px solid black',
                      textAlign: 'center',
                      verticalAlign: 'middle'
                    }}
                  >
                    {pedigree.sireSireSire}
                  </td>
                )}
              </tr>
              
              {/* Row 2: Sire's Sire's Dam */}
              <tr>
                {pedigree.sireSireDam && (
                  <td
                    className="text-center p-2 border border-black align-middle"
                    style={{ 
                      backgroundColor: '#ffffff',
                      fontSize: '15px',
                      border: '1px solid black',
                      textAlign: 'center',
                      verticalAlign: 'middle'
                    }}
                  >
                    {pedigree.sireSireDam}
                  </td>
                )}
              </tr>
              
              {/* Row 3: Sire's Dam */}
              <tr>
                {pedigree.sireDam && (
                  <td
                    rowSpan={2}
                    className="text-center p-2 border border-black"
                    style={{ 
                      backgroundColor: '#ffffff',
                      fontSize: '15px',
                      border: '1px solid black',
                      textAlign: 'center',
                      verticalAlign: 'middle'
                    }}
                  >
                    {pedigree.sireDam}
                  </td>
                )}
                {/* Generation 4: Sire's Dam's Sire */}
                {pedigree.sireDamSire && (
                  <td
                    className="text-center p-2 border border-black"
                    style={{ 
                      backgroundColor: '#dbdbdb',
                      fontSize: '15px',
                      border: '1px solid black',
                      textAlign: 'center',
                      verticalAlign: 'middle'
                    }}
                  >
                    {pedigree.sireDamSire}
                  </td>
                )}
              </tr>
              
              {/* Row 4: Sire's Dam's Dam */}
              <tr>
                {pedigree.sireDamDam && (
                  <td
                    className="text-center p-2 border border-black"
                    style={{ 
                      backgroundColor: '#ffffff',
                      fontSize: '15px',
                      border: '1px solid black',
                      textAlign: 'center',
                      verticalAlign: 'middle'
                    }}
                  >
                    {pedigree.sireDamDam}
                  </td>
                )}
              </tr>
              
              {/* Row 5: Dam line - Generation 2, 3, 4 */}
              <tr>
                {/* Generation 2: Dam */}
                {pedigree.dam && (
                  <td
                    rowSpan={4}
                    className="text-center p-2 border border-black"
                    style={{ 
                      backgroundColor: '#ffffff',
                      fontSize: '15px',
                      border: '1px solid black',
                      textAlign: 'center',
                      verticalAlign: 'middle'
                    }}
                  >
                    {pedigree.dam}
                  </td>
                )}
                {/* Generation 3: Dam's Sire */}
                {pedigree.damSire && (
                  <td
                    rowSpan={2}
                    className="text-center p-2 border border-black"
                    style={{ 
                      backgroundColor: '#dbdbdb',
                      fontSize: '15px',
                      border: '1px solid black',
                      textAlign: 'center',
                      verticalAlign: 'middle'
                    }}
                  >
                    {pedigree.damSire}
                  </td>
                )}
                {/* Generation 4: Dam's Sire's Sire */}
                {pedigree.damSireSire && (
                  <td
                    className="text-center p-2 border border-black"
                    style={{ 
                      backgroundColor: '#dbdbdb',
                      fontSize: '15px',
                      border: '1px solid black',
                      textAlign: 'center',
                      verticalAlign: 'middle'
                    }}
                  >
                    {pedigree.damSireSire}
                  </td>
                )}
              </tr>
              
              {/* Row 6: Dam's Sire's Dam */}
              <tr>
                {pedigree.damSireDam && (
                  <td
                    className="text-center p-2 border border-black"
                    style={{ 
                      backgroundColor: '#ffffff',
                      fontSize: '15px',
                      border: '1px solid black',
                      textAlign: 'center',
                      verticalAlign: 'middle'
                    }}
                  >
                    {pedigree.damSireDam}
                  </td>
                )}
              </tr>
              
              {/* Row 7: Dam's Dam */}
              <tr>
                {pedigree.damDam && (
                  <td
                    rowSpan={2}
                    className="text-center p-2 border border-black"
                    style={{ 
                      backgroundColor: '#ffffff',
                      fontSize: '15px',
                      border: '1px solid black',
                      textAlign: 'center',
                      verticalAlign: 'middle'
                    }}
                  >
                    {pedigree.damDam}
                  </td>
                )}
                {/* Generation 4: Dam's Dam's Sire */}
                {pedigree.damDamSire && (
                  <td
                    className="text-center p-2 border border-black"
                    style={{ 
                      backgroundColor: '#dbdbdb',
                      fontSize: '15px',
                      border: '1px solid black',
                      textAlign: 'center',
                      verticalAlign: 'middle'
                    }}
                  >
                    {pedigree.damDamSire}
                  </td>
                )}
              </tr>
              
              {/* Row 8: Dam's Dam's Dam */}
              <tr>
                {pedigree.damDamDam && (
                  <td
                    className="text-center p-2 border border-black"
                    style={{ 
                      backgroundColor: '#ffffff',
                      fontSize: '15px',
                      border: '1px solid black',
                      textAlign: 'center',
                      verticalAlign: 'middle'
                    }}
                  >
                    {pedigree.damDamDam}
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
