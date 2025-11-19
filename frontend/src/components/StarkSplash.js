import React, { useState, useEffect } from 'react';

const StarkSplash = ({ onComplete }) => {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => {
                onComplete();
            }, 600);
        }, 2500);

        return () => clearTimeout(timer);
    }, [onComplete]);

    return (
        <div className={`stark-splash ${isExiting ? 'exit' : ''}`}>
            <div className="stark-splash-content">
                <img
                    src="/robot.png"
                    alt="STARK Robot"
                    className="stark-robot-image"
                />
                <h1 className="stark-splash-text">STARK</h1>
                <div className="stark-loading-dots">
                    <div className="stark-dot"></div>
                    <div className="stark-dot"></div>
                    <div className="stark-dot"></div>
                </div>
            </div>
        </div>
    );
};

export default StarkSplash;