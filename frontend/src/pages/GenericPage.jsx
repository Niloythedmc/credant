import React from 'react';
import PageContainer from '../components/PageContainer';

const GenericPage = ({ id, activePage, title }) => {
    // Determine if this is a nav page to assign index
    const NAV_ORDER = ['feed', 'ads', 'insights', 'channels', 'profile'];
    const index = NAV_ORDER.indexOf(id);

    return (
        <PageContainer id={id} activePage={activePage} index={index !== -1 ? index : undefined}>
            <div style={{ padding: '20px', paddingTop: '40px' }}>
                <h1 className="text-2xl font-bold mb-4" style={{
                    color: 'var(--text-main)',
                    fontSize: '2rem',
                    fontWeight: 700
                }}>
                    {title || id}
                </h1>

                <div className="glass" style={{ padding: '24px', borderRadius: '16px', marginBottom: '16px' }}>
                    <p>This is the {title} page.</p>
                    <p style={{ marginTop: '10px', opacity: 0.7 }}>
                        Demonstrating the sliding transition effect.
                    </p>
                </div>

                {/* Dummy content to show scrolling */}
                {Array.from({ length: 15 }).map((_, i) => (
                    <div key={i} className="glass" style={{
                        padding: '16px',
                        borderRadius: '12px',
                        marginBottom: '10px',
                        opacity: 0.5
                    }}>
                        Item {i + 1}
                    </div>
                ))}
            </div>
        </PageContainer>
    );
};

export default GenericPage;
