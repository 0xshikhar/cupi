import React from 'react';
import { cn } from '@/lib/utils';

interface ResponsiveContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    as?: React.ElementType;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full' | 'none';
    padding?: 'none' | 'sm' | 'md' | 'lg';
    centerContent?: boolean;
}

/**
 * A responsive container component with standardized spacing and layout
 */
const ResponsiveContainer = React.forwardRef<HTMLDivElement, ResponsiveContainerProps>(
    ({
        className,
        children,
        as: Component = 'div',
        maxWidth = 'xl',
        padding = 'md',
        centerContent = false,
        ...props
    }, ref) => {
        const maxWidthClasses = {
            none: '',
            sm: 'max-w-screen-sm',
            md: 'max-w-screen-md',
            lg: 'max-w-screen-lg',
            xl: 'max-w-screen-xl',
            '2xl': 'max-w-screen-2xl',
            full: 'max-w-full',
        };

        const paddingClasses = {
            none: '',
            sm: 'px-3 py-2 sm:px-4 sm:py-3',
            md: 'px-4 py-3 sm:px-5 sm:py-4 md:px-6 md:py-5',
            lg: 'px-5 py-4 sm:px-6 sm:py-5 md:px-8 md:py-6',
        };

        return (
            <Component
                ref={ref}
                className={cn(
                    'w-full mx-auto',
                    maxWidthClasses[maxWidth],
                    paddingClasses[padding],
                    centerContent && 'flex flex-col items-center',
                    className
                )}
                {...props}
            >
                {children}
            </Component>
        );
    }
);

ResponsiveContainer.displayName = 'ResponsiveContainer';

export { ResponsiveContainer }; 