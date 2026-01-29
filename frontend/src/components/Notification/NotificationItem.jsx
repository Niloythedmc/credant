import React from 'react';
import { motion, useIsPresent } from 'framer-motion';
import AnimatedIcon from './AnimatedIcon';
import { useNotification } from '../../context/NotificationContext';

const NotificationItem = ({ id, type, message, emojiId, index }) => {
    const { removeNotification } = useNotification();
    const isPresent = useIsPresent();

    const variants = {
        initial: { opacity: 0, y: -50, scale: 0.9 },
        animate: {
            opacity: 1,
            y: index * 60, // Stack offset
            scale: 1 - index * 0.05, // Slight scale down for items behind
            zIndex: 100 - index,
            transition: { type: "spring", stiffness: 400, damping: 25 }
        },
        exit: {
            opacity: 0,
            y: -50, /* Move back to top */
            scale: 0.5,
            transition: { duration: 0.3 }
        }
    };

    return (
        <motion.div
            layout
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(event, info) => {
                if (Math.abs(info.offset.x) > 100) {
                    removeNotification(id);
                }
            }}
            style={{
                position: 'absolute',
                top: 20, // Base top position
                left: 0,
                right: 0,
                margin: '0 auto',
                width: '90%',
                maxWidth: '400px',
                background: 'var(--bg-card)', // Ensure this var exists or use generic
                backdropFilter: 'blur(12px)',
                backgroundColor: 'rgba(30, 41, 59, 0.9)', // Fallback dark
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '16px',
                padding: '12px 16px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                cursor: 'grab'
            }}
        >
            <AnimatedIcon emojiId={emojiId} size={32} />
            <div style={{ flex: 1 }}>
                <p style={{
                    margin: 0,
                    fontSize: '14px',
                    fontWeight: '600',
                    color: 'var(--text-main, white)',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                    {message}
                </p>
            </div>
            {/* Small close indicator or visual cue for swipe could go here */}
        </motion.div>
    );
};

export default NotificationItem;
