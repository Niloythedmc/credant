import React, { useState, useEffect } from 'react';
import PageContainer from '../components/PageContainer';
import styles from './Feed.module.css';
import AdCard from '../components/AdCard';
import { useTranslation } from 'react-i18next';
import { useApi } from '../auth/useApi';
import { useAuth } from '../auth/AuthProvider';
import Post from '../components/Post';
import UserProfileModal from '../components/UserProfileModal';

const Feed = ({ activePage, onNavigate }) => {
    const { t } = useTranslation();
    const index = 0;
    const { get, post } = useApi();
    const { user, tgUser } = useAuth();
    const [posts, setPosts] = useState([]);
    const [channels, setChannels] = useState([]); // State for channels
    const [ads, setAds] = useState([]); // State for ads
    const [loading, setLoading] = useState(true);

    // Profile Modal State
    const [profileModal, setProfileModal] = useState({ isOpen: false, userId: null, username: null });

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Parallel fetching
                const [feedData, channelsData, adsData] = await Promise.all([
                    get('/feed').catch(e => ({ posts: [] })),
                    get('/channels').catch(e => ({ channels: [] })),
                    get('/ads').catch(e => ({ ads: [] })) // Assuming GET /ads returns all ads, we might want to filter for active ones later or backend does it
                ]);

                setPosts(feedData.posts || []);
                setChannels((channelsData.channels || []).slice(0, 10)); // Top 10 channels for stories
                setAds((adsData.ads || []).filter(ad => ad.status === 'active')); // Only active ads
            } catch (error) {
                console.error("Failed to load feed data", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleLike = async (postId) => {
        try {
            await post('/feed/like', { postId });
            setPosts(prev => prev.map(p => {
                if (p.id === postId) {
                    return { ...p, likesCount: (p.likesCount || 0) + 1 };
                }
                return p;
            }));
        } catch (e) {
            console.error("Like failed", e);
        }
    };

    const handleProfileClick = (identifier) => {
        // Identifier can be userId or username
        // If it starts with @, treat as username? No, Post.jsx handles logic.
        // Actually Post.jsx passes username if available, else userId.
        // But identifier from Mention is always username (string).
        // Identifier from Post user click is username or userId.

        // Let's assume username if string and not a UID pattern, but UIDs are strings too.
        // Simple heuristic: passed from Post.jsx

        if (identifier && identifier.length < 20 && identifier.indexOf(' ') === -1) {
            // likely username if short? Or we rely on explicit props.
            // Let's just pass both to modal and let it figure it out?
            // Or better, update modal to accept either.
        }

        // Actually, if we just pass it as 'username' to modal if it looks like one, or 'userId' otherwise.
        // Users collection UIDs are usually long alphanumeric. Usernames are usually shorter.
        // But easiest is to detect if it was a mention click (always username) or avatar click (could be either).

        // Let's just try:
        if (typeof identifier === 'string' && identifier.length < 25) {
            // Most usernames are < 32 chars, UIDs are usually 28 (Firebase) or UUID (36).
            // Let's rely on the fact that if it's from mention, it's username.
            // If from Post avatar, it prefers username but falls back to userId.

            // To be safe, let's just pass it to modal and let modal logic handle:
            // The modal has: if (username) resolve; else if (userId) profile;

            // We can determine if it's a userId or username based on context?
            // No, 'Post' component just calls onProfileClick(username || userId).

            // Refinement: update Post `handleProfileClick` to pass object { type: 'username' | 'id', value: ... }?
            // Or just check if it matches UID format.
        }

        // Simplified approach: pass as is to state, and modal logic helps.
        // If we pass `username: identifier` it calls resolve.
        // If we pass `userId: identifier` it calls profile.

        // Let's update helper:
        const isUsername = typeof identifier === 'string' && !identifier.match(/^[a-zA-Z0-9]{28}$/); // Basic Firebase UID check

        if (isUsername) {
            setProfileModal({ isOpen: true, username: identifier, userId: null });
        } else {
            setProfileModal({ isOpen: true, userId: identifier, username: null });
        }
    };

    // Helper to inject ads
    const renderFeedItems = () => {
        const items = [];
        let adIndex = 0;

        posts.forEach((post, i) => {
            // Render Post
            items.push(
                <Post
                    key={post.id}
                    post={post}
                    onLike={handleLike}
                    onProfileClick={handleProfileClick}
                />
            );

            // Inject Ad every 5 posts
            if ((i + 1) % 5 === 0 && ads.length > 0) {
                const ad = ads[adIndex % ads.length];
                items.push(
                    <div key={`ad-${ad.id}-${i}`} className={styles.adContainer}>
                        <div className={styles.sponsoredLabel}>
                            <span style={{ fontWeight: 'bold' }}>Sponsored</span> • {ad.title}
                        </div>
                        <AdCard
                            ad={ad}
                            isExpanded={false}
                            onToggle={() => { }} // Basic click handler (maybe open details?)
                            variant="preview" // Use a variant if AdCard supports it, or generic
                        />
                    </div>
                );
                adIndex++;
            }
        });
        return items;
    };

    return (
        <PageContainer id="feed" activePage={activePage} index={index}>
            <div className={styles.page}>
                <header className={styles.header}>
                    <h1 className={styles.headerTitle}>{t('feed.title')}</h1>
                </header>



                {/* Stories Bar (Channels) */}
                {channels.length > 0 && (
                    <div className={styles.storiesContainer}>
                        {channels.map(channel => (
                            <div key={channel.id} className={styles.storyItem} onClick={() => onNavigate('channels')}>
                                <div className={styles.storyRing}>
                                    <img
                                        src={channel.photoUrl || "https://upload.wikimedia.org/wikipedia/commons/8/82/Telegram_logo.svg"}
                                        alt={channel.title}
                                        className={styles.storyAvatar}
                                    />
                                </div>
                                <span className={styles.storyName}>{channel.title || 'Channel'}</span>
                            </div>
                        ))}
                    </div>
                )}

                <div className={styles.feedList}>
                    {loading && <div className={styles.loading}>{t('feed.loading')}</div>}

                    {!loading && posts.length === 0 && (
                        <div className={styles.emptyState}>
                            <p>{t('feed.empty')}</p>
                        </div>
                    )}

                    {!loading && renderFeedItems()}
                </div>
            </div>

            {/* Profile Modal */}
            <UserProfileModal
                isOpen={profileModal.isOpen}
                onClose={() => setProfileModal({ isOpen: false, userId: null, username: null })}
                userId={profileModal.userId}
                username={profileModal.username}
            />
        </PageContainer>
    );
};

export default Feed;
