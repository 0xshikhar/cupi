import React from 'react';

interface AutoInvestFlowProps {
    isOpen: boolean;
    onClose: () => void;
    amount: string;
    token: string;
    onInvestmentComplete: (success: boolean) => void;
}

const AutoInvestFlow: React.FC<AutoInvestFlowProps> = ({ isOpen, onClose, amount, token, onInvestmentComplete }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white p-6 rounded-lg text-black">
                <h2 className="text-xl mb-4">Auto Invest</h2>
                <p>Investing {amount} {token}</p>
                <button onClick={onClose} className="mr-2 px-4 py-2 bg-gray-200">Cancel</button>
                <button
                    onClick={() => onInvestmentComplete(true)}
                    className="px-4 py-2 bg-green-500 text-white"
                >
                    Invest
                </button>
            </div>
        </div>
    );
};

export default AutoInvestFlow;
