import React from 'react';
import styles from './TelegramPostRenderer.module.css';
import AnimatedIcon from './Notification/AnimatedIcon';

const TelegramPostRenderer = ({
    text,
    entities,
    style = {},
    staticEmoji = false,
    // Card Mode Props
    showCard = false,
    mediaPreview = null,
    buttonText = null,
    link = null
}) => {
    // If invalid text, just don't render or render empty?
    // If card mode, we might still want to show image.
    const hasContent = text || mediaPreview;
    if (!hasContent) return null;

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
        if (!txt) return null;
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

    const renderTextContent = () => {
        if (!text) return null;
        if (!entities || entities.length === 0) {
            return highlightText(text);
        }

        const boundaries = new Set([0, text.length]);
        entities.forEach(e => {
            boundaries.add(e.offset);
            boundaries.add(e.offset + e.length);
        });

        const sortedPoints = Array.from(boundaries).sort((a, b) => a - b);
        const result = [];

        for (let i = 0; i < sortedPoints.length - 1; i++) {
            const start = sortedPoints[i];
            const end = sortedPoints[i + 1];
            if (start >= end) continue;

            let content = text.slice(start, end);
            const activeEntities = entities.filter(e => start >= e.offset && end <= (e.offset + e.length));
            const emojiEntity = activeEntities.find(e => e.type === 'custom_emoji');

            if (emojiEntity) {
                // Static vs Animated
                content = staticEmoji ? (
                    <span key={`emoji-${i}`} style={{ fontSize: 'inherit' }}>💎</span> // Fallback for static if no image logic, but AnimatedIcon handles check.
                ) : (
                    <span key={`emoji-${i}`} style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 1px' }}>
                        <AnimatedIcon
                            emojiId={emojiEntity.custom_emoji_id}
                            size={parseInt(baseStyle.fontSize) + 4 || 20}
                            loop={!staticEmoji}
                            staticMode={staticEmoji}
                        />
                    </span>
                );

                // For static, we might still want AnimatedIcon to fetch the "Static" frame.
                // Or user requested "Not animated".
                // AnimatedIcon can have a prop `staticMode`.
                content = (
                    <span key={`emoji-${i}`} style={{ display: 'inline-block', verticalAlign: 'middle', margin: '0 1px' }}>
                        <AnimatedIcon
                            emojiId={emojiEntity.custom_emoji_id}
                            size={parseInt(baseStyle.fontSize) + 4 || 20}
                            loop={false}
                            staticMode={staticEmoji}
                        />
                    </span>
                );
            }

            let wrapped = content;
            if (activeEntities.some(e => e.type === 'bold')) wrapped = <strong key={`bold-${i}`} className={styles.bold}>{wrapped}</strong>;
            if (activeEntities.some(e => e.type === 'italic')) wrapped = <em key={`italic-${i}`} className={styles.italic}>{wrapped}</em>;

            const linkEntity = activeEntities.find(e => e.type === 'text_link' || e.type === 'url');
            if (linkEntity) {
                wrapped = (
                    <a key={`link-${i}`} href={linkEntity.url} target="_blank" rel="noopener noreferrer" className={styles.link} onClick={(e) => e.stopPropagation()}>
                        {wrapped}
                    </a>
                );
            }
            result.push(<React.Fragment key={i}>{wrapped}</React.Fragment>);
        }
        return result;
    };

    // Render logic
    const content = <div style={baseStyle}>{renderTextContent()}</div>;

    if (showCard) {
        return (
            <div className={styles.card}>
                <div style={{ position: 'relative' }}>
                    {mediaPreview && <img src={mediaPreview} className={styles.cardImage} alt="Post Media" />}
                </div>
                <div className={styles.cardContent}>
                    {content}
                    {link && (
                        <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'block',
                                width: '100%',
                                padding: '10px 0',
                                textAlign: 'center',
                                background: 'rgba(0, 0, 0, 0.2)', // #0002 representation
                                borderRadius: '8px', // Different border radius
                                color: '#fff',
                                textDecoration: 'none',
                                fontWeight: '600',
                                marginTop: '12px',
                                fontSize: '14px',
                                transition: 'background 0.2s'
                            }}
                            onClick={(e) => {
                                e.stopPropagation();
                                // Add hover effect manually or via CSS? Inline is safer for now given instructions.
                            }}
                        >
                            {buttonText || 'View'}
                        </a>
                    )}
                </div>
            </div >
        );
    }

    return content;
};

export default TelegramPostRenderer;
