import React from 'react';
import Mention from './Mention';
import styles from './RichTextParser.module.css';

const RichTextParser = ({ content, onProfileClick }) => {
    if (!content) return null;

    // Regex configuration
    // URL: http/https, ignoring trailing punctuation like . , ! ?
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    // Mention: @username (alphanumeric + underscore code)
    const mentionRegex = /@(\w+)/g;
    // Hashtag: #tag
    const hashtagRegex = /#(\w+)/g;

    // Tokenize logic
    // We can split by space and process, but that's naive. 
    // Better to match all patterns and replace.
    // However, React needs components, so we need to return an array of elements.

    const words = content.split(/(\s+)/); // Split by whitespace but keep delimiters

    return (
        <span className={styles.textBody}>
            {words.map((word, index) => {
                // Check for URL
                if (urlRegex.test(word)) {
                    // Strip trailing punctuation if needed (naive regex above captures it)
                    // Let's refine the regex or cleaning here.
                    // Simple approach: match the URL part strictly. 
                    const match = word.match(urlRegex)[0];
                    const tail = word.replace(match, '');
                    return (
                        <React.Fragment key={index}>
                            <a
                                href={match}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={styles.link}
                                onClick={(e) => e.stopPropagation()}
                            >
                                {match}
                            </a>
                            {tail}
                        </React.Fragment>
                    );
                }

                // Check for Mention
                if (word.match(mentionRegex)) {
                    // Handle case where @username is followed by punctuation like @user.
                    const match = word.match(/@(\w+)/)[0];
                    const username = match.substring(1); // remove @
                    const tail = word.replace(match, '');

                    return (
                        <React.Fragment key={index}>
                            <Mention username={username} onProfileClick={onProfileClick} />
                            {tail}
                        </React.Fragment>
                    );
                }

                // Check for Hashtag
                if (word.match(hashtagRegex)) {
                    const match = word.match(/#(\w+)/)[0];
                    const tail = word.replace(match, '');
                    return (
                        <React.Fragment key={index}>
                            <span className={styles.hashtag}>{match}</span>
                            {tail}
                        </React.Fragment>
                    );
                }

                return word;
            })}
        </span>
    );
};

export default RichTextParser;
