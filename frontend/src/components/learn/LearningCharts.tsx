"use client";

import React from "react";
import {
    Chart as ChartJS,
    RadialLinearScale,
    ArcElement,
    Tooltip,
    Legend,
    PointElement,
    LineElement,
    Filler,
} from "chart.js";
import { Doughnut, Radar } from "react-chartjs-2";

ChartJS.register(
    RadialLinearScale,
    ArcElement,
    Tooltip,
    Legend,
    PointElement,
    LineElement,
    Filler
);

export function MarketVolumeChart() {
    const data = {
        labels: ["Forex ($6.6T)", "Stocks ($84B)", "Crypto ($50B)"],
        datasets: [
            {
                data: [6600, 84, 50],
                backgroundColor: ["#06b6d4", "#8b5cf6", "#10b981"],
                borderColor: "#0f172a",
                borderWidth: 4,
                hoverOffset: 10,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "60%",
        plugins: {
            legend: {
                position: "right" as const,
                labels: {
                    color: "#94a3b8",
                    font: { family: "'JetBrains Mono', monospace" },
                    padding: 20,
                },
            },
            tooltip: {
                callbacks: {
                    label: (context: any) => {
                        return ` ${context.label}: ${context.raw}`;
                    },
                },
            },
        },
    };

    return (
        <div className="h-80 w-full">
            <Doughnut data={data} options={options} />
        </div>
    );
}

export function PsychologyRadarChart() {
    const data = {
        labels: [
            "Risk Mgmt",
            "Emotional Control",
            "Strategy",
            "Patience",
            "Market Knowledge",
        ],
        datasets: [
            {
                label: "Pro Trader",
                data: [95, 90, 95, 85, 90],
                backgroundColor: "rgba(16, 185, 129, 0.2)", // Emerald transparent
                borderColor: "#10b981",
                pointBackgroundColor: "#10b981",
                borderWidth: 2,
            },
            {
                label: "Novice Trader",
                data: [30, 20, 40, 25, 60],
                backgroundColor: "rgba(239, 68, 68, 0.2)", // Red transparent
                borderColor: "#ef4444",
                pointBackgroundColor: "#ef4444",
                borderWidth: 2,
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            r: {
                angleLines: { color: "#334155" },
                grid: { color: "#334155" },
                pointLabels: {
                    color: "#cbd5e1",
                    font: { size: 12 },
                },
                ticks: { display: false, backdropColor: "transparent" },
            },
        },
        plugins: {
            legend: {
                labels: {
                    color: "#94a3b8",
                },
            },
        },
    };

    return (
        <div className="h-80 w-full flex justify-center">
            <Radar data={data} options={options} />
        </div>
    );
}
