import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

console.log('Modal module evaluated');

const Modal = ({ isOpen, onClose, title, children, zIndex }) => {
    // Lock body scroll when modal is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            // Also lock html to be safe on some mobile browsers
            document.documentElement.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        }

        // Cleanup
        return () => {
            document.body.style.overflow = '';
            document.documentElement.style.overflow = '';
        };
    }, [isOpen]);

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        style={{
                            position: 'fixed',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            background: 'rgba(0,0,0,0.6)',
                            zIndex: zIndex ? zIndex : 101, // Above Nav (999), Below TonConnect (100000)
                            backdropFilter: 'blur(4px)',
                            overscrollBehavior: 'contain' // Prevent scroll chaining
                        }}
                    />

                    {/* Modal Content */}
                    <motion.div
                        drag="y"
                        dragConstraints={{ top: 0, bottom: 0 }}
                        dragElastic={{ top: 0, bottom: 1 }} // Only elastic downwards
                        onDragEnd={(e, { offset, velocity }) => {
                            if (offset.y > 100 || velocity.y > 100) {
                                onClose();
                            }
                        }}
                        initial={{ y: "100%" }}
                        animate={{ y: 0 }}
                        exit={{ y: "100%" }}
                        transition={{ type: "spring", damping: 25, stiffness: 200 }}
                        style={{
                            position: 'fixed',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            background: 'var(--modal-bg)',
                            backdropFilter: 'blur(30px)',
                            border: '1px solid var(--glass-border)',
                            borderTopLeftRadius: '24px',
                            borderTopRightRadius: '24px',
                            padding: '24px',
                            zIndex: zIndex ? zIndex + 1000 : 1101, // Above Nav (999)
                            maxHeight: '85vh',
                            overflowY: 'auto',
                            overscrollBehavior: 'contain',
                            color: 'var(--text-main)' // Ensure text inherits correct color
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Drag Handle */}
                        <div style={{
                            width: '40px',
                            height: '4px',
                            background: 'var(--text-muted)', // Adaptive handle color
                            opacity: 0.3,
                            borderRadius: '2px',
                            margin: '0 auto 20px auto'
                        }} />

                        {title && (
                            <h2 style={{
                                fontSize: '20px',
                                fontWeight: '700',
                                marginBottom: '24px',
                                textAlign: 'center',
                                color: 'var(--text-main)' // Adaptive title
                            }}>
                                {title}
                            </h2>
                        )}

                        {children}
                    </motion.div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};

export default Modal;
