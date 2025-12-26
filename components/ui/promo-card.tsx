import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

interface PromoCardProps {
  title: string;
  subtitle?: string;
  description?: string;
  bgColor?: string;
  href: string;
  fullWidth?: boolean;
  children?: React.ReactNode;
}

const PromoCard: React.FC<PromoCardProps> = ({
  title,
  subtitle,
  description,
  bgColor = "from-primary-50 to-primary-100",
  href,
  fullWidth = false,
  children,
}) => {
  return (
    <Link
      href={href}
      className={`block relative rounded-xl overflow-hidden modern-card group ${
        fullWidth ? "col-span-2" : ""
      }`}
    >
      <div className={`bg-gradient-to-br ${bgColor} p-6 h-full border border-primary-200`}>
        <div className="flex flex-col h-full">
          {subtitle && (
            <div className="text-xs text-gray-600 mb-1">{subtitle}</div>
          )}
          <h3 className="text-2xl font-semibold text-gray-900 mb-2 group-hover:text-primary-700 transition-colors">{title}</h3>
          {description && (
            <p className="text-sm text-gray-600 mb-4">{description}</p>
          )}

          {children}

          <div className="absolute top-4 right-4">
            <ArrowUpRight className="h-5 w-5 text-gray-500 group-hover:text-primary-500 transition-colors" />
          </div>
        </div>
      </div>
    </Link>
  );
};

export default PromoCard;
