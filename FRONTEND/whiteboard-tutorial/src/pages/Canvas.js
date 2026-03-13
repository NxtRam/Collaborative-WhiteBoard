import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState, useRef, useContext, useCallback } from 'react';
import { io } from 'socket.io-client';
import { API_URL } from '../config';
import Board from '../components/Board';
import Toolbox from '../components/Toolbox';
import BoardProvider from '../store/BoardProvider';
import ToolboxProvider from '../store/ToolboxProvider';
import boardContext from '../store/board-context';
import themeContext from '../store/theme-context';
import { serializeElements, deserializeElements } from '../utils/element';
import { TOOL_ITEMS } from '../constants';
import {
  FaSlash,
  FaRegCircle,
  FaArrowRight,
  FaPaintBrush,
  FaEraser,
  FaUndoAlt,
  FaRedoAlt,
  FaFont,
  FaDownload,
  FaTrash,
} from "react-icons/fa";
import { LuRectangleHorizontal } from "react-icons/lu";

 function CanvasContent({ canvasId, canvasName }) {
   const { activeToolItem, changeToolHandler, undo, redo, loadElements, clearAll } = useContext(boardContext);
  const { isDarkMode, toggleTheme } = useContext(themeContext);
  const navigate = useNavigate();
  const [saveStatus, setSaveStatus] = useState('saved');
  const socketRef = useRef(null);
  const isRemoteUpdateRef = useRef(false);

  // Initialize socket connection
  useEffect(() => {
    console.log('🔌 Connecting to:', API_URL);
    socketRef.current = io(API_URL);

    socketRef.current.on('connect', () => {
      console.log('✅ Connected! Socket ID:', socketRef.current.id);
      console.log('📍 Joining canvas:', canvasId);
      socketRef.current.emit('joinCanvas', canvasId);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('❌ Connection error:', error.message);
    });

    socketRef.current.on('canvasUpdate', ({ elements: remoteElements }) => {
      console.log('📥 Received update from another user');
      isRemoteUpdateRef.current = true;
      const deserializedElements = deserializeElements(remoteElements);
      loadElements(deserializedElements);
      
      // Reset any active drawing state to prevent errors
      window.dispatchEvent(new CustomEvent('resetDrawingState'));
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leaveCanvas', canvasId);
        socketRef.current.disconnect();
      }
    };
  }, [canvasId, loadElements]);

  const handleDownloadClick = () => {
    const canvas = document.getElementById("canvas");
    const data = canvas.toDataURL("image/png");
    const anchor = document.createElement("a");
    anchor.href = data;
    anchor.download = `${canvasName || 'board'}.png`;
    anchor.click();
  };

  const handleClearAll = useCallback(async () => {
    if (!window.confirm('Are you sure you want to clear the entire canvas? This cannot be undone.')) {
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      console.log('🗑️ Clearing canvas');
      clearAll();

      // Broadcast clear to other users
      if (socketRef.current && socketRef.current.connected) {
        console.log('📤 Broadcasting clear to other users');
        socketRef.current.emit('canvasUpdate', {
          canvasId,
          elements: []
        });
      }

      // Save empty canvas to database
      const response = await fetch(`${API_URL}/api/canvas/${canvasId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ elements: [] }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }
        throw new Error('Failed to clear canvas');
      }

      console.log('✅ Canvas cleared successfully');
    } catch (error) {
      console.error('Error clearing canvas:', error);
      alert('Failed to clear canvas. Please try again.');
    }
  }, [canvasId, navigate, clearAll]);

  // Save function to be called on draw complete
  const saveCanvas = useCallback(async (elementsToSave) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Skip saving if this was triggered by a remote update
    if (isRemoteUpdateRef.current) {
      isRemoteUpdateRef.current = false;
      return;
    }

    setSaveStatus('saving...');

    try {
      const serializedElements = serializeElements(elementsToSave);
      
      // Emit to other users in real-time
      if (socketRef.current && socketRef.current.connected) {
        console.log('📤 Broadcasting update to canvas:', canvasId);
        socketRef.current.emit('canvasUpdate', {
          canvasId,
          elements: serializedElements
        });
      } else {
        console.warn('⚠️ Socket not connected, cannot broadcast');
      }

      // Save to database
      const response = await fetch(`${API_URL}/api/canvas/${canvasId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ elements: serializedElements }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }
        throw new Error('Failed to save canvas');
      }

      setSaveStatus('saved');
    } catch (error) {
      console.error('Error saving canvas:', error);
      setSaveStatus('error saving');
    }
  }, [canvasId, navigate]);

  // Listen for canvas updates (on mouseup events)
  useEffect(() => {
    const handleCanvasUpdate = (event) => {
      if (event.detail && event.detail.elements) {
        saveCanvas(event.detail.elements);
      }
    };

    window.addEventListener('canvasUpdated', handleCanvasUpdate);
    return () => {
      window.removeEventListener('canvasUpdated', handleCanvasUpdate);
    };
  }, [saveCanvas]);

  return (
    <div style={styles.container}>
      <div style={{...styles.topBar, backgroundColor: isDarkMode ? 'rgba(45, 45, 45, 0.95)' : 'rgba(255, 255, 255, 0.95)'}}>
        <div style={styles.leftSection}>
          <button onClick={() => navigate('/canvases')} style={{...styles.backBtn, backgroundColor: isDarkMode ? '#6366f1' : '#4f46e5'}}>
            ← Back
          </button>
          <h1 style={{...styles.title, color: isDarkMode ? '#e5e5e5' : '#1a1a1a'}}>{canvasName || 'Canvas Editor'}</h1>
        </div>
        
        <div style={styles.toolbarSection}>
          <div style={styles.toolsContainer}>
            <div
              style={{
                ...styles.toolItem,
                ...(activeToolItem === TOOL_ITEMS.BRUSH ? styles.toolItemActive : {}),
                backgroundColor: activeToolItem === TOOL_ITEMS.BRUSH ? (isDarkMode ? '#6366f1' : '#4f46e5') : 'transparent',
                color: activeToolItem === TOOL_ITEMS.BRUSH ? '#ffffff' : (isDarkMode ? '#9ca3af' : '#4b5563')
              }}
              onClick={() => changeToolHandler(TOOL_ITEMS.BRUSH)}
            >
              <FaPaintBrush />
            </div>
            <div
              style={{
                ...styles.toolItem,
                backgroundColor: activeToolItem === TOOL_ITEMS.LINE ? (isDarkMode ? '#6366f1' : '#4f46e5') : 'transparent',
                color: activeToolItem === TOOL_ITEMS.LINE ? '#ffffff' : (isDarkMode ? '#9ca3af' : '#4b5563')
              }}
              onClick={() => changeToolHandler(TOOL_ITEMS.LINE)}
            >
              <FaSlash />
            </div>
            <div
              style={{
                ...styles.toolItem,
                backgroundColor: activeToolItem === TOOL_ITEMS.RECTANGLE ? (isDarkMode ? '#6366f1' : '#4f46e5') : 'transparent',
                color: activeToolItem === TOOL_ITEMS.RECTANGLE ? '#ffffff' : (isDarkMode ? '#9ca3af' : '#4b5563')
              }}
              onClick={() => changeToolHandler(TOOL_ITEMS.RECTANGLE)}
            >
              <LuRectangleHorizontal />
            </div>
            <div
              style={{
                ...styles.toolItem,
                backgroundColor: activeToolItem === TOOL_ITEMS.CIRCLE ? (isDarkMode ? '#6366f1' : '#4f46e5') : 'transparent',
                color: activeToolItem === TOOL_ITEMS.CIRCLE ? '#ffffff' : (isDarkMode ? '#9ca3af' : '#4b5563')
              }}
              onClick={() => changeToolHandler(TOOL_ITEMS.CIRCLE)}
            >
              <FaRegCircle />
            </div>
            <div
              style={{
                ...styles.toolItem,
                backgroundColor: activeToolItem === TOOL_ITEMS.ARROW ? (isDarkMode ? '#6366f1' : '#4f46e5') : 'transparent',
                color: activeToolItem === TOOL_ITEMS.ARROW ? '#ffffff' : (isDarkMode ? '#9ca3af' : '#4b5563')
              }}
              onClick={() => changeToolHandler(TOOL_ITEMS.ARROW)}
            >
              <FaArrowRight />
            </div>
            <div
              style={{
                ...styles.toolItem,
                backgroundColor: activeToolItem === TOOL_ITEMS.ERASER ? (isDarkMode ? '#6366f1' : '#4f46e5') : 'transparent',
                color: activeToolItem === TOOL_ITEMS.ERASER ? '#ffffff' : (isDarkMode ? '#9ca3af' : '#4b5563')
              }}
              onClick={() => changeToolHandler(TOOL_ITEMS.ERASER)}
            >
              <FaEraser />
            </div>
            <div
              style={{
                ...styles.toolItem,
                backgroundColor: activeToolItem === TOOL_ITEMS.TEXT ? (isDarkMode ? '#6366f1' : '#4f46e5') : 'transparent',
                color: activeToolItem === TOOL_ITEMS.TEXT ? '#ffffff' : (isDarkMode ? '#9ca3af' : '#4b5563')
              }}
              onClick={() => changeToolHandler(TOOL_ITEMS.TEXT)}
            >
              <FaFont />
            </div>
            <div style={{...styles.separator, backgroundColor: isDarkMode ? '#4b5563' : '#e5e7eb'}} />
            <div
              style={{...styles.toolItem, color: isDarkMode ? '#9ca3af' : '#4b5563'}}
              onClick={undo}
            >
              <FaUndoAlt />
            </div>
            <div
              style={{...styles.toolItem, color: isDarkMode ? '#9ca3af' : '#4b5563'}}
              onClick={redo}
            >
              <FaRedoAlt />
            </div>
            <div
              style={{...styles.toolItem, color: isDarkMode ? '#9ca3af' : '#4b5563'}}
              onClick={handleDownloadClick}
            >
              <FaDownload />
            </div>
            <div style={{...styles.separator, backgroundColor: isDarkMode ? '#4b5563' : '#e5e7eb'}} />
            <div
              style={{...styles.toolItem, color: '#ef4444'}}
              onClick={handleClearAll}
              title="Clear All"
            >
              <FaTrash />
            </div>
          </div>
        </div>

        <div style={styles.rightSection}>
          <span style={{
            ...styles.saveStatus,
            color: saveStatus === 'error saving' ? '#ef4444' : (isDarkMode ? '#10b981' : '#059669')
          }}>
            {saveStatus}
          </span>
          <button onClick={toggleTheme} style={{...styles.themeBtn, backgroundColor: isDarkMode ? '#6366f1' : '#4f46e5'}} title="Toggle theme">
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
      </div>
      <Board />
      <Toolbox />
    </div>
  );
}

function Canvas() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [canvas, setCanvas] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCanvas = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await fetch(`${API_URL}/api/canvas/${id}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 401) {
            localStorage.removeItem('token');
            navigate('/login');
            return;
          }
          throw new Error(data.error || 'Failed to load canvas');
        }

        setCanvas(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCanvas();
  }, [id, navigate]);

  if (loading) {
    return <div style={styles.loading}>Loading canvas...</div>;
  }

  if (error) {
    return (
      <div style={styles.container}>
        <button onClick={() => navigate('/canvases')} style={styles.backBtn}>
          ← Back to Canvases
        </button>
        <div style={styles.error}>{error}</div>
      </div>
    );
  }

  return (
    <BoardProvider initialElements={canvas?.elements || []}>
      <ToolboxProvider>
        <CanvasContent canvasId={id} canvasName={canvas?.name} />
      </ToolboxProvider>
    </BoardProvider>
  );
}

const styles = {
  container: {
    position: 'relative',
    width: '100%',
    height: '100vh',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 24px',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.08)',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s ease',
    gap: '24px',
  },
  leftSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '20px',
    minWidth: '200px',
  },
  toolbarSection: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  toolsContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '6px 12px',
    backgroundColor: 'rgba(0, 0, 0, 0.03)',
    borderRadius: '10px',
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    minWidth: '200px',
    justifyContent: 'flex-end',
  },
  backBtn: {
    padding: '10px 18px',
    backgroundColor: '#4f46e5',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    transition: 'all 0.2s ease',
    boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)',
    whiteSpace: 'nowrap',
  },
  title: {
    margin: 0,
    fontSize: '18px',
    fontWeight: '700',
    color: '#1a1a1a',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '250px',
  },
  toolItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '40px',
    height: '40px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '18px',
    transition: 'all 0.2s ease',
  },
  toolItemActive: {
    boxShadow: '0 4px 12px rgba(79, 70, 229, 0.4)',
  },
  separator: {
    width: '1px',
    height: '24px',
    backgroundColor: '#e5e7eb',
    margin: '0 4px',
  },
  saveStatus: {
    fontSize: '13px',
    fontStyle: 'italic',
    fontWeight: '500',
    whiteSpace: 'nowrap',
  },
  themeBtn: {
    padding: '8px 12px',
    backgroundColor: '#4f46e5',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '18px',
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '44px',
    height: '44px',
  },
  loading: {
    textAlign: 'center',
    marginTop: '50px',
    fontSize: '18px',
    color: 'var(--text-secondary)',
  },
  error: {
    color: '#ef4444',
    backgroundColor: '#fee2e2',
    padding: '20px',
    borderRadius: '8px',
    marginTop: '20px',
  },
};

export default Canvas;
