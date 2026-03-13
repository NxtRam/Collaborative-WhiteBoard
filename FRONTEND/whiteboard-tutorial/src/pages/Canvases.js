import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import {
  FolderKanban,
  Users,
  LogOut,
  Plus,
  Edit3,
  Share2,
  Clock,
  Layers
} from 'lucide-react';

function Canvases() {
  const [canvases, setCanvases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [canvasName, setCanvasName] = useState('');
  const [creating, setCreating] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareEmail, setShareEmail] = useState('');
  const [sharingCanvasId, setSharingCanvasId] = useState(null);
  const [sharing, setSharing] = useState(false);
  const [shareSuccess, setShareSuccess] = useState('');
  // Theme context is kept for potential future use or state but we are forcing light mode per specs.
  const navigate = useNavigate();

  const fetchCanvases = async () => {
    const token = localStorage.getItem('token');

    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/canvas`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('token');
          navigate('/login');
          return;
        }
        throw new Error(data.error || 'Failed to fetch canvases');
      }

      setCanvases(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCanvases();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateCanvas = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');

    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${API_URL}/api/canvas`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: canvasName || 'Untitled Canvas' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create canvas');
      }

      setCanvases([...canvases, data]);
      setShowCreateModal(false);
      setCanvasName('');
    } catch (error) {
      setError(error.message);
    } finally {
      setCreating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    navigate('/login');
  };

  const handleShareCanvas = async (e) => {
    e.preventDefault();
    setSharing(true);
    setError('');
    setShareSuccess('');

    const token = localStorage.getItem('token');

    try {
      const response = await fetch(`${API_URL}/api/canvas/share/${sharingCanvasId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ shareWithEmail: shareEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to share canvas');
      }

      setCanvases(prevCanvases =>
        prevCanvases.map(canvas =>
          canvas._id === sharingCanvasId ? data : canvas
        )
      );

      setShareSuccess('Canvas shared successfully!');
      setTimeout(() => {
        setShowShareModal(false);
        setShareEmail('');
        setSharingCanvasId(null);
        setShareSuccess('');
      }, 1500);
    } catch (error) {
      setError(error.message);
    } finally {
      setSharing(false);
    }
  };

  const openShareModal = (e, canvasId) => {
    e.stopPropagation();
    setSharingCanvasId(canvasId);
    setShowShareModal(true);
    setError('');
    setShareSuccess('');
  };

  // Calculate stats
  const totalCanvases = canvases.length;
  const totalElements = canvases.reduce((acc, canvas) => acc + (canvas.elements?.length || 0), 0);
  const sharedCanvases = canvases.filter(canvas => canvas.sharedWith?.length > 0).length;

  // Find last activity (newest modifiedAt)
  let lastActivityText = "No activity";
  if (canvases.length > 0) {
    const newestCanvas = [...canvases].sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt))[0];
    const diffDays = Math.floor((new Date() - new Date(newestCanvas.modifiedAt)) / (1000 * 60 * 60 * 24));
    if (diffDays === 0) lastActivityText = "Today";
    else if (diffDays === 1) lastActivityText = "Yesterday";
    else lastActivityText = `${diffDays} days ago`;
  }

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800 font-['Inter'] overflow-hidden">

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-50/50">

        {/* Top Header */}
        <header className="h-[76px] flex items-center justify-between px-10 border-b border-slate-200 bg-white flex-shrink-0 z-0">
          <h1 className="text-xl font-semibold text-slate-900 tracking-tight">All Canvases</h1>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-600 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              System Nomimal
            </div>
            <div className="h-6 w-px bg-slate-200"></div>
            <button onClick={() => navigate('/profile')} className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
              Directory
            </button>
            <button onClick={handleLogout} className="text-sm font-medium text-slate-600 hover:text-rose-600 transition-colors flex items-center gap-2">
              <LogOut size={16} strokeWidth={2} />
              Sign Out
            </button>
          </div>
        </header>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-10">

          {error && (
            <div className="mb-6 p-4 bg-rose-50 text-rose-700 rounded-md border border-rose-200 text-sm font-medium">
              {error}
            </div>
          )}

          {/* Stats Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-sm text-slate-500 font-semibold uppercase tracking-wider mb-2">Total Canvases</span>
              <span className="text-3xl font-bold text-slate-800 tracking-tight">{totalCanvases}</span>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-sm text-slate-500 font-semibold uppercase tracking-wider mb-2">Total Elements</span>
              <span className="text-3xl font-bold text-slate-800 tracking-tight">{totalElements}</span>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-sm text-slate-500 font-semibold uppercase tracking-wider mb-2">Shared Canvases</span>
              <span className="text-3xl font-bold text-slate-800 tracking-tight">{sharedCanvases}</span>
            </div>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
              <span className="text-sm text-slate-500 font-semibold uppercase tracking-wider mb-2">Last Activity</span>
              <span className="text-3xl font-bold text-slate-800 tracking-tight">{lastActivityText}</span>
            </div>
          </div>

          <div className="flex justify-between items-center mb-6 px-1">
            <h2 className="text-lg font-semibold text-slate-800">Recent Projects</h2>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-medium text-sm flex items-center gap-2 transition-colors shadow-sm focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
            >
              <Plus size={16} strokeWidth={2.5} />
              New Canvas
            </button>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-24 text-slate-500">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900 mb-4"></div>
              <span className="font-medium">Loading canvases...</span>
            </div>
          ) : canvases.length === 0 ? (
            <div className="text-center py-24 bg-white border border-slate-200 border-dashed rounded-xl shadow-sm">
              <FolderKanban size={48} className="mx-auto text-slate-300 mb-5" strokeWidth={1.5} />
              <h3 className="text-slate-800 font-semibold text-lg mb-2">No canvases found</h3>
              <p className="text-slate-500 text-sm mb-6 max-w-sm mx-auto">Get started by creating your first enterprise canvas project to collaborate with your team.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg font-medium text-sm transition-colors shadow-sm"
              >
                Create First Canvas
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {canvases.map((canvas) => (
                <div
                  key={canvas._id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer group flex flex-col overflow-hidden"
                  onClick={() => navigate(`/canvas/${canvas._id}`)}
                >
                  <div className="p-6 flex-1">
                    <div className="flex justify-between items-start mb-5">
                      <h3 className="text-base font-semibold text-slate-800 truncate pr-4 leading-tight">{canvas.name}</h3>
                      <button
                        onClick={(e) => openShareModal(e, canvas._id)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors opacity-0 group-hover:opacity-100 border border-transparent hover:border-indigo-100"
                        title="Share canvas"
                      >
                        <Share2 size={16} strokeWidth={2} />
                      </button>
                    </div>

                    <div className="space-y-3 mt-auto text-sm text-slate-500 font-medium">
                      <div className="flex items-center gap-2.5">
                        <Clock size={16} className="text-slate-400" strokeWidth={2} />
                        <span>Created {new Date(canvas.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Edit3 size={16} className="text-slate-400" strokeWidth={2} />
                        <span>Modified {new Date(canvas.modifiedAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <div className="flex items-center gap-2">
                      <Layers size={14} className="text-slate-400" strokeWidth={2} />
                      {canvas.elements?.length || 0} Elements
                    </div>
                    <div className="flex items-center gap-2">
                      <Users size={14} className="text-slate-400" strokeWidth={2} />
                      {canvas.sharedWith?.length || 0} Shared
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* Modals stay mostly the same but Tailwind-ified and Enterprise themed */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl w-full max-w-md shadow-xl border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-6 tracking-tight">Create New Canvas</h2>
            <form onSubmit={handleCreateCanvas}>
              <div className="space-y-1 mb-6">
                <label className="text-sm font-semibold text-slate-700">Canvas Name</label>
                <input
                  type="text"
                  placeholder="e.g. Q3 Architecture Planning"
                  value={canvasName}
                  onChange={(e) => setCanvasName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-slate-900 text-sm placeholder-slate-400 shadow-sm"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setCanvasName('');
                    setError('');
                  }}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-5 py-2.5 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors shadow-sm disabled:opacity-70"
                >
                  {creating ? 'Creating...' : 'Create Canvas'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showShareModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white p-8 rounded-xl w-full max-w-md shadow-xl border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 mb-6 tracking-tight">Share Workspace</h2>
            {shareSuccess && <p className="mb-6 text-sm font-medium text-emerald-700 bg-emerald-50 p-3 rounded-lg border border-emerald-200">{shareSuccess}</p>}
            {error && <p className="mb-6 text-sm font-medium text-rose-700 bg-rose-50 p-3 rounded-lg border border-rose-200">{error}</p>}
            <form onSubmit={handleShareCanvas}>
              <div className="space-y-1 mb-6">
                <label className="text-sm font-semibold text-slate-700">Collaborator Email</label>
                <input
                  type="email"
                  placeholder="colleague@company.com"
                  value={shareEmail}
                  onChange={(e) => setShareEmail(e.target.value)}
                  required
                  className="w-full px-4 py-2.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent text-slate-900 text-sm placeholder-slate-400 shadow-sm"
                  autoFocus
                />
              </div>
              <div className="flex justify-end gap-3 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowShareModal(false);
                    setShareEmail('');
                    setSharingCanvasId(null);
                    setError('');
                    setShareSuccess('');
                  }}
                  className="px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sharing}
                  className="px-5 py-2.5 text-sm font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors shadow-sm disabled:opacity-70"
                >
                  {sharing ? 'Sending Invite...' : 'Send Invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Canvases;
