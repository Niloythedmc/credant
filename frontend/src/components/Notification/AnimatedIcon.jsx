import React, { useEffect, useState, useRef } from 'react';
import Lottie from 'lottie-react';
import pako from 'pako';

import { useAuth } from '../../auth/AuthProvider';

const AnimatedIcon = ({ emojiId, size = 40, loop = false, staticMode = false }) => {
    const { backendUrl } = useAuth();
    const [animationData, setAnimationData] = useState(null);
    const [error, setError] = useState(false);

    useEffect(() => {
        let mounted = true;

        const fetchAnimation = async () => {
            if (!emojiId || !backendUrl) return;

            try {
                const response = await fetch(`${backendUrl}/telegram-proxy/getFile?custom_emoji_id=${emojiId}`);
                if (!response.ok) throw new Error('Failed to fetch emoji');

                const blob = await response.blob();
                const arrayBuffer = await blob.arrayBuffer();

                try {
                    // Inflate the gzipped TGS data
                    const inflated = pako.inflate(new Uint8Array(arrayBuffer), { to: 'string' });
                    const json = JSON.parse(inflated);
                    if (mounted) setAnimationData(json);
                } catch (parseError) {
                    console.error("Failed to parse TGS:", parseError);
                    if (mounted) setError(true);
                }

            } catch (err) {
                console.error("Error loading animated icon:", err);
                if (mounted) setError(true);
            }
        };

        fetchAnimation();

        return () => {
            mounted = false;
        };
    }, [emojiId, backendUrl]);

    if (error) {
        return <span style={{ fontSize: size, lineHeight: 1 }}>💎</span>; // Fallback
    }

    if (!animationData) {
        // Fallback placeholder while loading
        return <div style={{ width: size, height: size, background: 'rgba(255,255,255,0.1)', borderRadius: '50%', display: 'inline-block' }} />;
    }

    return (
        <div style={{ width: size, height: size, display: 'inline-block', verticalAlign: 'middle' }}>
            <Lottie
                animationData={animationData}
                loop={loop && !staticMode}
                autoplay={!staticMode}
                style={{ width: '100%', height: '100%' }}
                rendererSettings={{
                    preserveAspectRatio: 'xMidYMid slice'
                }}
            />
        </div>
    );
};

export default AnimatedIcon;
