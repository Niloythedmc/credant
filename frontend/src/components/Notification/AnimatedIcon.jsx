import React, { useEffect, useState, useRef } from 'react';
import Lottie from 'lottie-react';
import pako from 'pako';

const AnimatedIcon = ({ emojiId, size = 40, loop = false }) => {
    const [animationData, setAnimationData] = useState(null);

    useEffect(() => {
        const fetchAnimation = async () => {
            if (!emojiId) return;

            try {
                const response = await fetch(`https://renderapi-675689082615.us-central1.run.app/api/telegram-proxy/getFile?custom_emoji_id=${emojiId}`);
                if (!response.ok) throw new Error('Failed to fetch emoji');

                const blob = await response.blob();
                const arrayBuffer = await blob.arrayBuffer();

                // Inflate the gzipped TGS data
                const inflated = pako.inflate(new Uint8Array(arrayBuffer), { to: 'string' });
                const json = JSON.parse(inflated);

                setAnimationData(json);
            } catch (err) {
                console.error("Error loading animated icon:", err);
            }
        };

        fetchAnimation();
    }, [emojiId]);

    if (!animationData) {
        // Fallback placeholder while loading
        return <div style={{ width: size, height: size, background: 'rgba(255,255,255,0.1)', borderRadius: '50%' }} />;
    }

    return (
        <div style={{ width: size, height: size }}>
            <Lottie
                animationData={animationData}
                loop={loop}
                autoplay={true}
                style={{ width: '100%', height: '100%' }}
            />
        </div>
    );
};

export default AnimatedIcon;
