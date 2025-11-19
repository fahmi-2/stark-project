import React, { useState, useEffect } from 'react';

const PageTransition = ({ isActive, onComplete }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        if (isActive) {
            setIsExiting(false);
            const timer = setTimeout(() => {
                setIsExiting(true);
                setTimeout(() => {
                    onComplete();
                }, 400);
            }, 800);
            return () => clearTimeout(timer);
        }
    }, [isActive, onComplete]);

    if (!isActive && !isExiting) return null;

    return (
        <div className={`stark-page-transition ${isExiting ? 'out' : ''}`}>
            <div className="stark-transition-content">
                <img
                    src="/robot.png"
                    alt="STARK"
                    className="stark-transition-robot"
                />
                <p className="stark-transition-text">STARK</p>
            </div>
        </div>
    );
};

export default PageTransition;