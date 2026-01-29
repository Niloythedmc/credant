import React from 'react';
import PageContainer from '../components/PageContainer';
import styles from './GenericPage.module.css';

const GenericPage = ({ id, activePage, title }) => {
    // Determine if this is a nav page to assign index
    const NAV_ORDER = ['feed', 'ads', 'insights', 'channels', 'profile'];
    const index = NAV_ORDER.indexOf(id);

    return (
        <PageContainer id={id} activePage={activePage} index={index !== -1 ? index : undefined}>
            <div className={styles.page}>
                <h1 className={styles.title}>
                    {title || id}
                </h1>

                <div className={`glass ${styles.introCard}`}>
                    <p>This is the {title} page.</p>
                    <p className={styles.subtitle}>
                        Demonstrating the sliding transition effect.
                    </p>
                </div>

                {/* Dummy content to show scrolling */}
                {Array.from({ length: 15 }).map((_, i) => (
                    <div key={i} className={`glass ${styles.dummyItem}`}>
                        Item {i + 1}
                    </div>
                ))}
            </div>
        </PageContainer>
    );
};

export default GenericPage;
