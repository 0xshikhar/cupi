import React from 'react';

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-y-0 left-0 z-40 w-64 bg-gray-900 text-white p-4">
            <button onClick={onClose} className="mb-4">Close</button>
            <nav>
                <ul>
                    <li>Dashboard</li>
                    <li>Settings</li>
                </ul>
            </nav>
        </div>
    );
};

export default Sidebar;
