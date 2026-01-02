import React from 'react';

interface TopUpModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: (amount: string, token: string) => void;
}

const TopUpModal: React.FC<TopUpModalProps> = ({ isOpen, onClose, onSuccess }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white p-6 rounded-lg text-black">
                <h2 className="text-xl mb-4">Top Up</h2>
                <button onClick={onClose} className="mr-2 px-4 py-2 bg-gray-200">Cancel</button>
                <button
                    onClick={() => onSuccess?.("100", "USDC")}
                    className="px-4 py-2 bg-blue-500 text-white"
                >
                    Confirm
                </button>
            </div>
        </div>
    );
};

export default TopUpModal;
