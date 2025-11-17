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

const formatValue = (value?: string) => value || '-'

export function PedigreeTree({ horse }: Props) {
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

  const cellStyle = (isSire: boolean) => ({
    backgroundColor: isSire ? '#dbdbdb' : '#ffffff',
    fontSize: '15px',
    border: '1px solid black',
    textAlign: 'center' as const,
    verticalAlign: 'middle' as const,
  })

  return (
    <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/50 shadow-lg">
      <CardContent className="p-6">
        <div className="overflow-x-auto flex justify-center">
          <table
            className="border-collapse"
            style={{ width: '940px', border: '1px solid black' }}
          >
            <tbody>
              <tr>
                <td rowSpan={4} className="p-2" style={cellStyle(true)}>
                  {formatValue(horse.sireName)}
                </td>
                <td rowSpan={2} className="p-2" style={cellStyle(true)}>
                  {formatValue(horse.sireSire)}
                </td>
                <td className="p-2" style={cellStyle(true)}>
                  {formatValue(horse.sireSireSire)}
                </td>
              </tr>
              <tr>
                <td className="p-2" style={cellStyle(false)}>
                  {formatValue(horse.sireSireDam)}
                </td>
              </tr>
              <tr>
                <td rowSpan={2} className="p-2" style={cellStyle(false)}>
                  {formatValue(horse.sireDam)}
                </td>
                <td className="p-2" style={cellStyle(true)}>
                  {formatValue(horse.sireDamSire)}
                </td>
              </tr>
              <tr>
                <td className="p-2" style={cellStyle(false)}>
                  {formatValue(horse.sireDamDam)}
                </td>
              </tr>
              <tr>
                <td rowSpan={4} className="p-2" style={cellStyle(false)}>
                  {formatValue(horse.damName)}
                </td>
                <td rowSpan={2} className="p-2" style={cellStyle(true)}>
                  {formatValue(horse.damSire)}
                </td>
                <td className="p-2" style={cellStyle(true)}>
                  {formatValue(horse.damSireSire)}
                </td>
              </tr>
              <tr>
                <td className="p-2" style={cellStyle(false)}>
                  {formatValue(horse.damSireDam)}
                </td>
              </tr>
              <tr>
                <td rowSpan={2} className="p-2" style={cellStyle(false)}>
                  {formatValue(horse.damDam)}
                </td>
                <td className="p-2" style={cellStyle(true)}>
                  {formatValue(horse.damDamSire)}
                </td>
              </tr>
              <tr>
                <td className="p-2" style={cellStyle(false)}>
                  {formatValue(horse.damDamDam)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
