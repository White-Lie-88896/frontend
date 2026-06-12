import { useState, useCallback, useRef, useEffect } from 'react';
import { copyToClipboard } from '../../utils/copy-to-clipboard.util';

interface RobustCopyButtonProps {
    value: string;
    timeout?: number;
    children: (payload: { copied: boolean; copy: () => void }) => React.ReactNode;
}

export const RobustCopyButton = ({ value, timeout = 2000, children }: RobustCopyButtonProps) => {
    const [copied, setCopied] = useState(false);
    const timeoutRef = useRef<number | null>(null);

    const copy = useCallback(() => {
        copyToClipboard(value).then((success) => {
            if (success) {
                setCopied(true);
                if (timeoutRef.current !== null) {
                    window.clearTimeout(timeoutRef.current);
                }
                timeoutRef.current = window.setTimeout(() => {
                    setCopied(false);
                }, timeout);
            }
        });
    }, [value, timeout]);

    useEffect(() => {
        return () => {
            if (timeoutRef.current !== null) {
                window.clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    return <>{children({ copied, copy })}</>;
};
