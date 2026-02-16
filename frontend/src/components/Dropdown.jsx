import React, { useState, useRef, useEffect } from 'react';
// import { FiChevronDown } from 'react-icons/fi'; // REMOVED

console.log('Dropdown module evaluated');

const Dropdown = ({ options, value, onChange, placeholder }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef(null);

    const selectedLabel = options.find(o => o.value === value)?.label || placeholder || 'Select';

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (ref.current && !ref.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    return (
        <div ref={ref} style={{ position: 'relative', minWidth: '140px' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    border: '1px solid var(--glass-border)',
                    background: 'var(--modal-bg)',
                    color: 'var(--text-main)',
                    fontSize: '14px',
                    fontWeight: '500',
                    cursor: 'pointer',
                    gap: '8px'
                }}
            >
                {selectedLabel}
                {/* <FiChevronDown style={{
                    transition: 'transform 0.2s',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                }} /> */}
                <span style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', display: 'inline-block' }}>v</span>
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    marginTop: '6px',
                    width: '100%',
                    background: 'var(--modal-bg)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    zIndex: 50,
                    boxShadow: 'var(--card-shadow)',
                    backdropFilter: 'blur(10px)'
                }}>
                    {options.map((option) => (
                        <div
                            key={option.value}
                            onClick={() => {
                                onChange(option.value);
                                setIsOpen(false);
                            }}
                            style={{
                                padding: '10px 14px',
                                fontSize: '14px',
                                color: option.value === value ? 'var(--primary)' : 'var(--text-main)',
                                background: option.value === value ? 'var(--glass-highlight)' : 'transparent',
                                cursor: 'pointer',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'var(--glass-highlight)'}
                            onMouseLeave={(e) => e.target.style.background = option.value === value ? 'var(--glass-highlight)' : 'transparent'}
                        >
                            {option.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default Dropdown;
