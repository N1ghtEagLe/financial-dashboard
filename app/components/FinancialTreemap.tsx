'use client'

import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'
import { SummaryData } from './FinancialDashboard'

interface FinancialTreemapProps {
    data: SummaryData[]
    viewMode: 'team' | 'category'
}

const COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042', 
    '#8884d8', '#83a6ed', '#8dd1e1', '#82ca9d'
]

export default function FinancialTreemap({ data, viewMode }: FinancialTreemapProps) {
    const transformData = () => {
        const filteredData = data.filter(item => 
            item.Team !== 'GRAND TOTAL' &&    // Begone, GRAND TOTAL!
            item.Category !== 'GRAND TOTAL' && // Double banishment!
            item.Category !== 'TOTAL' &&      // No TOTALs allowed
            item[viewMode] !== 'TOTAL'        // Not a single TOTAL shall pass
        )

        const groupedData = filteredData.reduce((acc, item) => {
            const key = viewMode === 'team' ? item.Team : item.Category
            if (!acc[key]) {
                acc[key] = 0
            }
            acc[key] += Math.abs(item['Total USD'])
            return acc
        }, {} as Record<string, number>)

        return [{
            name: 'root',
            children: Object.entries(groupedData)
                .filter(([name]) => name !== 'GRAND TOTAL') // One last check, just to be sure!
                .map(([name, value], index) => ({
                    name,
                    size: value,
                    value: value,
                    color: COLORS[index % COLORS.length]
                }))
        }]
    }

    return (
        <div style={{ width: '100%', height: 600 }}>
            <ResponsiveContainer>
                <Treemap
                    data={transformData()}
                    dataKey="size"
                    ratio={4/3}
                    stroke="#fff"
                    content={({ root, depth, x, y, width, height, index, payload, colors, rank, name }) => {
                        return (
                            <g>
                                <rect
                                    x={x}
                                    y={y}
                                    width={width}
                                    height={height}
                                    style={{
                                        fill: COLORS[index % COLORS.length],
                                        stroke: '#fff',
                                        strokeWidth: 2,
                                        strokeOpacity: 1 / (depth + 1e-10),
                                    }}
                                />
                                {width > 50 && height > 30 && (
                                    <text
                                        x={x + width / 2}
                                        y={y + height / 2}
                                        textAnchor="middle"
                                        fill="#fff"
                                        fontSize={14}
                                    >
                                        {name}
                                    </text>
                                )}
                            </g>
                        )
                    }}
                >
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const data = payload[0].payload
                                return (
                                    <div className="bg-gray-800 p-2 rounded shadow">
                                        <p className="text-white font-semibold">{data.name}</p>
                                        <p className="text-white">
                                            ${Math.abs(data.value).toLocaleString()}
                                        </p>
                                    </div>
                                )
                            }
                            return null
                        }}
                    />
                </Treemap>
            </ResponsiveContainer>
        </div>
    )
}