import React from 'react';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';

interface CategoryCardProps {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  bgColor?: string;
}

const CategoryCard: React.FC<CategoryCardProps> = ({
  title,
  description,
  icon,
  href,
  bgColor = 'from-white to-gray-50'
}) => {
  return (
    <Link 
      href={href}
      className="block relative rounded-xl overflow-hidden modern-card group"
    >
      <div className={`bg-gradient-to-br ${bgColor} p-6 h-full border border-gray-200`}>
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <div className="text-gray-900 text-xl font-semibold group-hover:text-primary-600 transition-colors">{title}</div>
            <ArrowUpRight className="h-5 w-5 text-gray-500 group-hover:text-primary-500 transition-colors" />
          </div>
          <p className="text-sm text-gray-600 mb-4">{description}</p>
          <div className="mt-auto">
            {icon}
          </div>
        </div>
      </div>
    </Link>
  );
};

export default CategoryCard;
