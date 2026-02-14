import React from 'react';
import styles from './TelegramPostRenderer.module.css';
import AnimatedIcon from './Notification/AnimatedIcon';

const TelegramPostRenderer = ({ text, entities, style = {}, staticEmoji = false }) => {
    if (!text) return null;

    const baseStyle = {
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        fontSize: '15px',
        lineHeight: '1.5',
        color: '#ccc',
        ...style
    };

    // Highlight Text Helper
    const highlightText = (txt) => {
        const parts = txt.split(/(\s+)/);
        return (
            <span style={baseStyle}>
                {parts.map((part, i) => {
                    if (part.trim() === '') return <span key={i}>{part}</span>;
                    const hasDot = part.includes('.');
                    const endsWithDot = part.endsWith('.');
                    const isLink = part.startsWith('http') || (hasDot && (!endsWithDot || part.slice(0, -1).includes('.')));
                    const shouldHighlight = part.startsWith('@') || part.startsWith('#') || isLink;
                    return <span key={i} className={shouldHighlight ? styles.highlight : ''}>{part}</span>;
                })}
            </span>
        );
    };

    if (!entities || entities.length === 0) {
        return <div style={baseStyle}>{highlightText(text)}</div>;
    }

    // 1. Collect all boundaries
    const boundaries = new Set([0, text.length]);
    entities.forEach(e => {
        boundaries.add(e.offset);
        boundaries.add(e.offset + e.length);
    });

    // 2. Sort boundaries
    const sortedPoints = Array.from(boundaries).sort((a, b) => a - b);
    const result = [];

    // 3. Iterate segments
    for (let i = 0; i < sortedPoints.length - 1; i++) {
        const start = sortedPoints[i];
        const end = sortedPoints[i + 1];
        if (start >= end) continue;

        let content = text.slice(start, end);

        // Find active entities for this segment
        const activeEntities = entities.filter(e => start >= e.offset && end <= (e.offset + e.length));

        // Prioritize: Emoji replaces content
        const emojiEntity = activeEntities.find(e => e.type === 'custom_emoji');
        if (emojiEntity) {
            content = (
                <span key={`emoji-${i}`} style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 1px' }}>
                    <AnimatedIcon
                        emojiId={emojiEntity.custom_emoji_id}
                        size={parseInt(baseStyle.fontSize) + 4 || 20}
                        loop={!staticEmoji}
                    />
                </span>
            );
        }

        // Apply styles (wrapping)
        let wrapped = content;

        // Bold
        if (activeEntities.some(e => e.type === 'bold')) {
            wrapped = <strong key={`bold-${i}`} className={styles.bold}>{wrapped}</strong>;
        }

        // Italic
        if (activeEntities.some(e => e.type === 'italic')) {
            wrapped = <em key={`italic-${i}`} className={styles.italic}>{wrapped}</em>;
        }

        // Link
        const linkEntity = activeEntities.find(e => e.type === 'text_link' || e.type === 'url');
        if (linkEntity) {
            wrapped = (
                <a
                    key={`link-${i}`}
                    href={linkEntity.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.link}
                    onClick={(e) => e.stopPropagation()}
                >
                    {wrapped}
                </a>
            );
        }

        result.push(<React.Fragment key={i}>{wrapped}</React.Fragment>);
    }

    return <div style={baseStyle}>{result}</div>;
};

export default TelegramPostRenderer;
