import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import HoverPreview from './HoverPreview';
import styles from './RichTextParser.module.css'; // Reusing link styles or specific mention styles

const Mention = ({ username, onProfileClick }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [coords, setCoords] = useState({ x: 0, y: 0 });
    const ref = useRef(null);
    const timeoutRef = useRef(null);

    const handleMouseEnter = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);

        if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            // Position above the text
            let top = rect.top + window.scrollY;
            let left = rect.left + window.scrollX;

            setCoords({ x: left, y: top });
            setIsHovered(true);
        }
    };

    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => {
            setIsHovered(false);
        }, 300); // Small delay to allow moving to the tooltip
    };

    // Click handler removed as per request (only hover preview)

    return (
        <>
            <span
                ref={ref}
                className={styles.link} // Reusing link style (blue)
                style={{ cursor: 'pointer', fontWeight: 500 }}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                @{username}
            </span>
            {isHovered && createPortal(
                <div
                    onMouseEnter={() => { if (timeoutRef.current) clearTimeout(timeoutRef.current); }}
                    onMouseLeave={() => setIsHovered(false)}
                >
                    <HoverPreview username={username} position={coords} />
                </div>,
                document.body
            )}
        </>
    );
};

export default Mention;
