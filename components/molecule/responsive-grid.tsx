import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveGridProps extends React.HTMLAttributes<HTMLDivElement> {
    cols?: {
        default: number;
        sm?: number;
        md?: number;
        lg?: number;
        xl?: number;
    };
    gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg';
    itemMinWidth?: string;
}

/**
 * A responsive grid component that adjusts columns based on screen size
 */
const ResponsiveGrid = React.forwardRef<HTMLDivElement, ResponsiveGridProps>(
    ({
        className,
        children,
        cols = { default: 1, sm: 2, lg: 3 },
        gap = 'md',
        itemMinWidth,
        ...props
    }, ref) => {
        // Grid gap classes
        const gapClasses = {
            none: 'gap-0',
            xs: 'gap-2',
            sm: 'gap-3 sm:gap-4',
            md: 'gap-4 sm:gap-5 md:gap-6',
            lg: 'gap-5 sm:gap-6 md:gap-8',
        };

        // Generate responsive grid columns
        const getGridColsClasses = () => {
            const { default: defaultCols, sm, md, lg, xl } = cols;

            return cn(
                `grid-cols-${defaultCols}`,
                sm && `sm:grid-cols-${sm}`,
                md && `md:grid-cols-${md}`,
                lg && `lg:grid-cols-${lg}`,
                xl && `xl:grid-cols-${xl}`
            );
        };

        // If itemMinWidth is provided, use auto-fit layout instead of explicit columns
        const gridTemplateColumns = itemMinWidth
            ? `grid-template-columns: repeat(auto-fit, minmax(${itemMinWidth}, 1fr));`
            : '';

        return (
            <div
                ref={ref}
                className={cn(
                    'grid w-full',
                    !itemMinWidth && getGridColsClasses(),
                    gapClasses[gap],
                    className
                )}
                style={itemMinWidth ? { gridTemplateColumns } : undefined}
                {...props}
            >
                {children}
            </div>
        );
    }
);

ResponsiveGrid.displayName = 'ResponsiveGrid';

export { ResponsiveGrid }; 