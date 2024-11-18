'use client'

import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'
import { SummaryData } from './FinancialDashboard'
import React, { ReactElement } from 'react'

interface FinancialTreemapProps {
    data: SummaryData[]
    viewMode: 'team' | 'category'
}

const COLORS = [
    '#FF6B6B',  // Red
    '#4ECDC4',  // Turquoise
    '#45B7D1',  // Blue
    '#96CEB4',  // Green
    '#FFD93D',  // Yellow
    '#FF8C42',  // Orange
    '#9370DB',  // Purple
    '#20B2AA',  // Teal
    '#FF69B4',  // Hot Pink - Our new color for harmony
]

const CustomizedContent: React.FC<any> = (props) => {
    const { x, y, width, height, depth, index, name } = props;
    
    if (depth === 0) return null;
    
    return (
        <g>
            <rect
                x={x}
                y={y}
                width={width}
                height={height}
                fill={COLORS[index % COLORS.length]}
                stroke="#fff"
                strokeWidth={2}
            />
            {width > 50 && height > 30 && (
                <text
                    x={x + width / 2}
                    y={y + height / 2}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#fff"
                    fontSize={14}
                    fontWeight="bold"
                >
                    {name}
                </text>
            )}
        </g>
    );
};

export default function FinancialTreemap({ data, viewMode }: FinancialTreemapProps) {
    const transformData = () => {
        const filteredData = data.filter(item => 
            item.Team !== 'GRAND TOTAL' &&
            item.Category !== 'GRAND TOTAL' &&
            item.Category !== 'TOTAL' &&
            item.Team !== 'TOTAL'
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
                .filter(([name]) => name !== 'TOTAL' && name !== 'GRAND TOTAL')
                .map(([name, value], index) => ({
                    name,
                    size: value,
                    value,
                    index,
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
                    stroke="#fff"
                    fill="#8884d8"
                    content={<CustomizedContent />}
                >
                    <Tooltip
                        content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                                const data = payload[0].payload
                                return (
                                    <div className="bg-gray-800 p-2 rounded shadow">
                                        <p className="text-white font-semibold">
                                            {data.name}
                                        </p>
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