
import React, { useState, useEffect, useRef } from 'react';

const DraggableWindow = ({
    id,
    title,
    initialPos = { x: 0, y: 0, w: 300, h: 200 },
    zIndex,
    onFocus,
    children,
    resizeMode = 'both' // 'both', 'horizontal', 'vertical', 'none'
}) => {
    const [pos, setPos] = useState(initialPos);
    const [isDragging, setIsDragging] = useState(false);
    const [isResizing, setIsResizing] = useState(false);
    const dragStartRef = useRef({ x: 0, y: 0 });

    // Snap/Constrain logic can be added here

    const handleMouseDown = (e) => {
        if (e.button !== 0) return; // Only left click
        e.stopPropagation();
        onFocus(id);
        setIsDragging(true);
        dragStartRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    };

    const handleResizeStart = (e) => {
        if (e.button !== 0) return;
        e.stopPropagation();
        onFocus(id);
        setIsResizing(true);
        dragStartRef.current = { x: e.clientX, y: e.clientY, w: pos.w, h: pos.h };
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDragging) {
                let newX = e.clientX - dragStartRef.current.x;
                let newY = e.clientY - dragStartRef.current.y;
                setPos(p => ({ ...p, x: newX, y: newY }));
            } else if (isResizing) {
                const dx = e.clientX - dragStartRef.current.x;
                const dy = e.clientY - dragStartRef.current.y;
                setPos(p => ({
                    ...p,
                    w: (resizeMode === 'both' || resizeMode === 'horizontal') ? Math.max(200, dragStartRef.current.w + dx) : p.w,
                    h: (resizeMode === 'both' || resizeMode === 'vertical') ? Math.max(50, dragStartRef.current.h + dy) : p.h
                }));
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            setIsResizing(false);
        };

        if (isDragging || isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, id, pos.w, pos.h, resizeMode]);

    const getResizeCursor = () => {
        if (resizeMode === 'horizontal') return 'ew-resize';
        if (resizeMode === 'vertical') return 'ns-resize';
        if (resizeMode === 'none') return 'default';
        return 'nwse-resize';
    };

    return (
        <div
            className="draggable-window glass-panel"
            style={{
                position: 'absolute',
                left: pos.x,
                top: pos.y,
                width: pos.w,
                height: pos.h,
                zIndex: zIndex,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden',
                boxShadow: isDragging ? '0 10px 20px rgba(0,0,0,0.5)' : '0 4px 10px rgba(0,0,0,0.3)',
                transition: isDragging ? 'none' : 'box-shadow 0.2s',
                border: '1px solid rgba(255,255,255,0.1)'
            }}
            onMouseDown={() => onFocus(id)}
        >
            {/* Header / Drag Handle */}
            <div
                className="window-header"
                onMouseDown={handleMouseDown}
                style={{
                    padding: '8px 10px',
                    background: 'rgba(255,255,255,0.05)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    cursor: 'grab',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    userSelect: 'none'
                }}
            >
                <span style={{ fontWeight: 'bold', fontSize: '0.8rem', color: '#aaa', textTransform: 'uppercase' }}>{title}</span>
                <div className="window-controls" style={{ display: 'flex', gap: '5px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff5f56' }}></div>
                </div>
            </div>

            {/* Content */}
            <div className="window-content" style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
                {children}
            </div>

            {/* Resize Handle */}
            {resizeMode !== 'none' && (
                <div
                    className="resize-handle"
                    onMouseDown={handleResizeStart}
                    style={{
                        position: 'absolute',
                        bottom: 0,
                        right: 0,
                        width: '15px',
                        height: '15px',
                        cursor: getResizeCursor(),
                        zIndex: 10
                    }}
                >
                    <svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="#666" strokeWidth="2">
                        <path d="M14 20 L20 14 M8 20 L20 8" />
                    </svg>
                </div>
            )}
        </div>
    );
};

export default DraggableWindow;
