"use client";

import { X } from "lucide-react";
import { TradeWidget } from "./TradeWidget";

interface TradeModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialSymbol?: string;
    initialSide?: "buy" | "sell";
    initialPrice?: number;
}

export function TradeModal({ isOpen, onClose, initialSymbol, initialSide, initialPrice }: TradeModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Modal Payload */}
            <div className="relative w-full max-w-md animate-in zoom-in-95 duration-200">
                <button
                    onClick={onClose}
                    className="absolute -top-12 right-0 p-2 text-slate-400 hover:text-white transition-colors"
                >
                    <X size={24} />
                </button>

                <TradeWidget
                    symbol={initialSymbol}
                    defaultSide={initialSide}
                    initialPrice={initialPrice}
                    className="shadow-2xl shadow-black ring-1 ring-white/10 bg-[#0b1221]"
                />
            </div>
        </div>
    );
}
