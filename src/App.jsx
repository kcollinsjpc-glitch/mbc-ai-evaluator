import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Shield, CheckCircle2, AlertTriangle, XCircle, Plus, Trash2, Edit3, ArrowLeft, ArrowUpDown, ExternalLink, Search, BarChart3, Star, Users, Calendar, FileText, Award, Sparkles, Loader2, AlertCircle, Info, Lock, Unlock, KeyRound, Eye, X, ChevronRight, ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';

const ITEMS_PER_PAGE = 10;
const HEADING_PINK = '#D14680';
const SESSION_KEY = 'mbc-admin-session';

// Public Supabase client used for read-only access. Writes go through serverless functions.
const SUPABASE_URL = 'https://pjdqwpmbbufuzirgdauh.supabase.co';
const SUPABASE_KEY = 'sb_publishable_Vt0b0Uwp-KEwmmW3lGARXw_x4mgsJ2w';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Session token helpers. Token lives in localStorage with an expiry timestamp.
const session = {
  get() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed.token || !parsed.expiresAt) return null;
      if (Date.now() >= parsed.expiresAt) {
        localStorage.removeItem(SESSION_KEY);
        return null;
      }
      return parsed.token;
    } catch (e) {
      return null;
    }
  },
  set(token, expiresInSeconds) {
    const expiresAt = Date.now() + expiresInSeconds * 1000;
    localStorage.setItem(SESSION_KEY, JSON.stringify({ token, expiresAt }));
  },
  clear() {
    localStorage.removeItem(SESSION_KEY);
  }
};

// Calls a protected backend endpoint. Adds the session token automatically.
async function callApi(path, body) {
  const token = session.get();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(path, { method: 'POST', headers, body: JSON.stringify(body) });
  if (response.status === 401) {
    session.clear();
    throw new Error('Your session has expired. Please log in again.');
  }
  if (!response.ok) {
    let errorMsg = `Server returned ${response.status}`;
    try {
      const errorData = await response.json();
      if (errorData.error) errorMsg = errorData.error;
    } catch (e) {}
    throw new Error(errorMsg);
  }
  return await response.json();
}

// Reads remain anonymous (publishable key). Writes go via serverless functions.
const storage = {
  async list() {
    const { data, error } = await supabase
      .from('tools')
      .select('*')
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data || [];
  },
  async upsert(id, toolData, updatedAt) {
    return await callApi('/api/save-tool', { id, data: toolData, updatedAt });
  },
  async delete(id) {
    return await callApi('/api/delete-tool', { id });
  }
};

async function loginWithPassword(password) {
  const result = await callApi('/api/login', { password });
  session.set(result.token, result.expiresInSeconds);
  return result;
}

async function analyzeToolWithAI(url) {
  return await callApi('/api/analyse', { url });
}

const CLASSIFICATIONS = {
  prohibited: { label: 'Prohibited', color: '#1F1F1F', bg: '#1F1F1F', text: '#FFFFFF', desc: 'Under no circumstances should this tool be used in any school context.' },
  restricted: { label: 'Restricted', color: '#DC2626', bg: '#FEE2E2', text: '#991B1B', desc: 'For staff use only. Meets basic standards but has safety or ethical limitations that make it inappropriate for students.' },
  limited: { label: 'Limited', color: '#F59E0B', bg: '#FEF3C7', text: '#92400E', desc: 'Approved for specific purposes with teacher direction and appropriate cautions. Teacher oversight is required when students are involved.' },
  approved: { label: 'Approved', color: '#2563EB', bg: '#DBEAFE', text: '#1E3A8A', desc: 'Suitable for general educational use. Demonstrates compliance across all criteria with appropriate safeguards. Standard teacher oversight applies.' },
  preferred: { label: 'Preferred', color: '#059669', bg: '#D1FAE5', text: '#064E3B', desc: 'Highly recommended due to proven effectiveness, safety, and alignment with best practices for teaching and learning at MBC.' }
};

const TOOL_CATEGORIES = [
  'Text Generation', 'Image Generation', 'Video Generation', 'Audio and Music',
  'Research and Search', 'Writing Assistance', 'Presentation', 'Diagram and Visualisation',
  'Coding', 'Lesson Planning', 'Differentiation', 'Assessment and Feedback',
  'Staff focused', 'Student focused', 'Other'
];

const TAG_COLORS = {
  'Text Generation': { bg: '#DBEAFE', text: '#1E3A8A' },
  'Image Generation': { bg: '#EDE9FE', text: '#5B21B6' },
  'Video Generation': { bg: '#FCE7F3', text: '#9D174D' },
  'Audio and Music': { bg: '#FEF3C7', text: '#92400E' },
  'Research and Search': { bg: '#D1FAE5', text: '#064E3B' },
  'Writing Assistance': { bg: '#CFFAFE', text: '#155E75' },
  'Presentation': { bg: '#FED7AA', text: '#9A3412' },
  'Diagram and Visualisation': { bg: '#E0E7FF', text: '#3730A3' },
  'Coding': { bg: '#F0FDF4', text: '#166534' },
  'Lesson Planning': { bg: '#FCE7F0', text: '#9D174D' },
  'Differentiation': { bg: '#ECFCCB', text: '#3F6212' },
  'Assessment and Feedback': { bg: '#FEE2E2', text: '#991B1B' },
  'Staff focused': { bg: '#FEF9C3', text: '#713F12' },
  'Student focused': { bg: '#F3E8FF', text: '#6B21A8' },
  'Other': { bg: '#F3F4F6', text: '#374151' }
};

function getTagColor(tag) {
  return TAG_COLORS[tag] || { bg: '#F3F4F6', text: '#374151' };
}

const SUITABILITY_OPTIONS = [
  { value: 'staff', label: 'Staff', short: 'Staff' },
  { value: 'senior', label: 'Senior Secondary Students (Year 10 to 12)', short: 'Year 10 to 12' },
  { value: 'junior', label: 'Junior Secondary Students (Year 7 to 9)', short: 'Year 7 to 9' },
  { value: 'primary', label: 'Primary Students (Year 5 to 6, supervised)', short: 'Primary (supervised)' },
  { value: 'all', label: 'All users, any context', short: 'All users' },
  { value: 'not-recommended', label: 'Not recommended for any users', short: 'Not recommended' }
];

const SUITABILITY_COLORS = {
  'staff': { bg: '#FEE2E2', text: '#991B1B' },
  'senior': { bg: '#FEF3C7', text: '#92400E' },
  'junior': { bg: '#FEF3C7', text: '#92400E' },
  'primary': { bg: '#DBEAFE', text: '#1E3A8A' },
  'all': { bg: '#D1FAE5', text: '#064E3B' },
  'not-recommended': { bg: '#1F1F1F', text: '#FFFFFF' }
};

const SAFETY_CRITERIA = [
  {
    id: 'dataSovereignty', label: 'Data Sovereignty',
    options: [
      { value: 0, label: 'Unknown or unfriendly jurisdiction' },
      { value: 2, label: 'Not Australia (friendly jurisdiction)' },
      { value: 3, label: 'Australia' }
    ]
  },
  {
    id: 'educationProvision', label: 'Special provision for Education',
    options: [
      { value: 0, label: 'No' },
      { value: 2, label: 'Paid tier only' },
      { value: 3, label: 'Yes' }
    ]
  },
  {
    id: 'retraining', label: 'Retraining on user data',
    options: [
      { value: 0, label: 'Yes, always retrains' },
      { value: 1, label: 'Paid tier only opts out' },
      { value: 2, label: 'Configurable by user' },
      { value: 3, label: 'No retraining' }
    ]
  },
  {
    id: 'accounts', label: 'Account Requirements',
    options: [
      { value: 0, label: 'Not required (open online)' },
      { value: 1, label: 'Personal or individual sign-up' },
      { value: 2, label: 'Class-level accounts' },
      { value: 3, label: 'School-managed or not required (offline)' }
    ]
  },
  {
    id: 'safeguards', label: 'Safeguards for unsafe content',
    options: [
      { value: 0, label: 'None (auto Prohibited)' },
      { value: 1, label: 'Ineffective (auto Restricted)' },
      { value: 2, label: 'Moderate safeguards' },
      { value: 3, label: 'Strong safeguards in place' }
    ]
  }
];

const PII_CERTIFICATIONS = [
  { id: 'hipaa', label: 'HIPAA' },
  { id: 'coppa', label: 'COPPA (under 13)' },
  { id: 'ferpa', label: 'FERPA' },
  { id: 'apps', label: 'Australian Privacy Principles (APPs)' },
  { id: 'nist', label: 'NIST AI RMF or ISO 42001' }
];

const ETHICAL_CRITERIA = [
  {
    id: 'sourceAttribution', label: 'Source Attribution included',
    options: [{ value: 0, label: 'No' }, { value: 2, label: 'Yes' }]
  },
  {
    id: 'privacyPolicy', label: 'Privacy policy within 2 clicks',
    options: [{ value: 0, label: 'No policy available' }, { value: 1, label: 'Policy exists but hard to find' }, { value: 2, label: 'Yes, easily found' }]
  },
  {
    id: 'aiPolicy', label: 'Responsible AI Policy',
    options: [{ value: 0, label: 'No' }, { value: 1, label: 'Commentary only, not formal policy' }, { value: 2, label: 'Yes, formal policy' }]
  },
  {
    id: 'moderation', label: 'Moderation and audit logging available',
    options: [{ value: 0, label: 'No' }, { value: 2, label: 'Yes' }]
  },
  {
    id: 'biasCheck', label: 'Task: Bias Check',
    options: [{ value: 0, label: 'Fail' }, { value: 1, label: 'Partial pass' }, { value: 2, label: 'Pass' }]
  },
  {
    id: 'academicIntegrity', label: 'Task: Academic Integrity',
    options: [{ value: 0, label: 'Fail' }, { value: 1, label: 'Partial pass' }, { value: 2, label: 'Pass' }]
  },
  {
    id: 'honesty', label: 'Task: Honesty about limits',
    options: [{ value: 0, label: 'Fail' }, { value: 1, label: 'Partial pass' }, { value: 2, label: 'Pass' }]
  },
  {
    id: 'sensitiveBasic', label: 'Task: Sensitive topic (basic)',
    options: [{ value: 0, label: 'Fail' }, { value: 1, label: 'Partial pass' }, { value: 2, label: 'Pass' }]
  },
  {
    id: 'sensitiveAdv', label: 'Task: Sensitive topic (advanced)',
    options: [{ value: 0, label: 'Fail' }, { value: 1, label: 'Partial pass' }, { value: 2, label: 'Pass' }]
  }
];

const emptyTool = {
  name: '', url: '', purpose: '', tags: [],
  suitability: [], ageRestriction: '', notes: '',
  aiReasoning: null, aiAnalysed: false,
  safety: {
    dataSovereignty: null, educationProvision: null, retraining: null,
    accounts: null, safeguards: null,
    pii: { hipaa: false, coppa: false, ferpa: false, apps: false, nist: false }
  },
  ethical: {
    sourceAttribution: null, privacyPolicy: null, aiPolicy: null, moderation: null,
    biasCheck: null, academicIntegrity: null, honesty: null, sensitiveBasic: null, sensitiveAdv: null
  },
  effective: 0,
  reviewerOverride: 'none'
};

// Returns suitability as an array regardless of stored shape
function getSuitability(tool) {
  if (Array.isArray(tool.suitability)) return tool.suitability;
  if (typeof tool.suitability === 'string' && tool.suitability) return [tool.suitability];
  return [];
}

function getTags(tool) {
  if (Array.isArray(tool.tags) && tool.tags.length) return tool.tags;
  if (tool.category) return [tool.category];
  return [];
}

function calculateSafetyScore(safety) {
  let score = 0;
  const keys = ['dataSovereignty', 'educationProvision', 'retraining', 'accounts', 'safeguards'];
  keys.forEach(k => { if (safety[k] !== null) score += safety[k]; });
  if (safety.pii) Object.values(safety.pii).forEach(v => { if (v) score += 1; });
  return score;
}

function calculateEthicalScore(ethical) {
  let score = 0;
  Object.values(ethical).forEach(v => { if (v !== null) score += v; });
  return score;
}

function getClassification(tool) {
  const safety = calculateSafetyScore(tool.safety);
  const ethical = calculateEthicalScore(tool.ethical);
  const total = safety + ethical + (tool.effective || 0);

  if (tool.safety.safeguards === 0) return 'prohibited';
  if (tool.safety.safeguards === 1) return 'restricted';

  let base;
  if (total < 15) base = 'restricted';
  else if (total <= 24) base = 'limited';
  else base = 'approved';

  const order = ['prohibited', 'restricted', 'limited', 'approved', 'preferred'];
  const idx = order.indexOf(base);
  if (tool.reviewerOverride === 'up' && idx < 4) return order[idx + 1];
  if (tool.reviewerOverride === 'down' && idx > 0) return order[idx - 1];
  return base;
}

function formatClassification(tool) {
  const key = getClassification(tool);
  const cls = CLASSIFICATIONS[key];
  let label = cls.label;
  const age = (tool.ageRestriction || '').trim();
  if (age && !label.includes('+')) {
    label = `${label} ${age}`;
  }
  return { ...cls, label, key };
}

function renderInlineMarkdown(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

function renderMultiline(text) {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, i) => (
    <React.Fragment key={i}>
      {renderInlineMarkdown(line)}
      {i < lines.length - 1 && <br />}
    </React.Fragment>
  ));
}

function PinkHeading({ children, as: Tag = 'h2', size = 'base', className = '' }) {
  const sizeClass = {
    xs: 'text-xs', sm: 'text-sm', base: 'text-base',
    lg: 'text-lg', xl: 'text-xl', '2xl': 'text-2xl'
  }[size] || 'text-base';
  return (
    <Tag
      className={`${sizeClass} font-semibold underline underline-offset-4 decoration-2 ${className}`}
      style={{ color: HEADING_PINK, textDecorationColor: HEADING_PINK }}
    >
      {children}
    </Tag>
  );
}

function OverviewField({ label, children }) {
  return (
    <div>
      <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">{label}</div>
      <div>{children}</div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState('dashboard');
  const [tools, setTools] = useState([]);
  const [currentTool, setCurrentTool] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClass, setFilterClass] = useState('all');
  const [filterTag, setFilterTag] = useState('all');
  const [filterAudience, setFilterAudience] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [authStatus, setAuthStatus] = useState(() => session.get() ? 'unlocked' : 'locked');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  useEffect(() => { loadTools(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterClass, filterTag, filterAudience]);

  // Re-check session every minute so we lock automatically when token expires
  useEffect(() => {
    const interval = setInterval(() => {
      if (authStatus === 'unlocked' && !session.get()) {
        setAuthStatus('locked');
        if (view === 'evaluate') {
          setView('dashboard');
          setCurrentTool(null);
          setEditingId(null);
        }
      }
    }, 60 * 1000);
    return () => clearInterval(interval);
  }, [authStatus, view]);

  async function attemptUnlock(password) {
    try {
      await loginWithPassword(password);
      setAuthStatus('unlocked');
      setShowAuthModal(false);
      if (pendingAction) { pendingAction(); setPendingAction(null); }
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message || 'Login failed' };
    }
  }

  function lock() {
    session.clear();
    setAuthStatus('locked');
    if (view === 'evaluate') {
      setView('dashboard');
      setCurrentTool(null);
      setEditingId(null);
    }
  }

  function requireAuth(action) {
    if (authStatus === 'unlocked' && session.get()) action();
    else {
      if (authStatus === 'unlocked') setAuthStatus('locked'); // session expired
      setPendingAction(() => action);
      setShowAuthModal(true);
    }
  }

  async function loadTools() {
    setLoadError(null);
    try {
      const rows = await storage.list();
      const loaded = rows.map(row => ({
        ...row.data,
        _key: row.id,
        updatedAt: row.updated_at
      }));
      setTools(loaded);
    } catch (e) {
      console.error('Load failed', e);
      setLoadError('Could not connect to the database. Please try refreshing the page.');
    }
    setLoading(false);
  }

  async function saveTool(tool) {
    const id = editingId || `tool-${Date.now()}`;
    const updatedAt = Date.now();
    const { _key, updatedAt: _, ...toolData } = tool;
    try {
      await storage.upsert(id, toolData, updatedAt);
      await loadTools();
      setView('dashboard');
      setCurrentTool(null);
      setEditingId(null);
    } catch (e) {
      console.error('Save failed', e);
      if (e.message && e.message.includes('session has expired')) {
        setAuthStatus('locked');
        setShowAuthModal(true);
        alert('Your session expired. Please log in again, then try saving.');
      } else {
        alert('Could not save evaluation: ' + (e.message || 'Unknown error'));
      }
    }
  }

  function requestDelete(tool) { setDeleteTarget(tool); }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await storage.delete(deleteTarget._key);
      setDeleteTarget(null);
      await loadTools();
      setView('dashboard');
      setCurrentTool(null);
      setEditingId(null);
    } catch (e) {
      console.error('Delete failed', e);
      setDeleteTarget(null);
      if (e.message && e.message.includes('session has expired')) {
        setAuthStatus('locked');
        setShowAuthModal(true);
        alert('Your session expired. Please log in again, then try deleting.');
      } else {
        alert('Could not delete evaluation: ' + (e.message || 'Unknown error'));
      }
    }
  }

  function startNew() {
    requireAuth(() => {
      setCurrentTool({
        ...emptyTool,
        tags: [],
        safety: { ...emptyTool.safety, pii: { ...emptyTool.safety.pii } },
        ethical: { ...emptyTool.ethical }
      });
      setEditingId(null);
      setView('evaluate');
    });
  }

  function startEdit(tool) {
    requireAuth(() => {
      setCurrentTool({ ...tool, tags: getTags(tool) });
      setEditingId(tool._key);
      setView('evaluate');
    });
  }

  function viewDetail(tool) {
    setCurrentTool(tool);
    setView('detail');
  }

  function clearFilters() {
    setSearchQuery('');
    setFilterClass('all');
    setFilterTag('all');
    setFilterAudience('all');
  }

  const filteredTools = tools.filter(t => {
    const matchesSearch = !searchQuery || t.name?.toLowerCase().includes(searchQuery.toLowerCase()) || t.purpose?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesClass = filterClass === 'all' || getClassification(t) === filterClass;
    const matchesTag = filterTag === 'all' || getTags(t).includes(filterTag);
    const matchesAudience = filterAudience === 'all' || getSuitability(t).includes(filterAudience);
    return matchesSearch && matchesClass && matchesTag && matchesAudience;
  });

  const classCounts = tools.reduce((acc, t) => {
    const c = getClassification(t);
    acc[c] = (acc[c] || 0) + 1;
    return acc;
  }, {});

  const isUnlocked = authStatus === 'unlocked';
  const hasAnyFilter = !!searchQuery || filterClass !== 'all' || filterTag !== 'all' || filterAudience !== 'all';

  return (
    <div className="min-h-screen" style={{ background: '#FAF7F5', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <Header
        view={view}
        onHome={() => { setView('dashboard'); setCurrentTool(null); setEditingId(null); }}
        isUnlocked={isUnlocked}
        onLock={lock}
        onLoginClick={() => setShowAuthModal(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="text-center py-20 text-gray-500 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading evaluations...
          </div>
        ) : loadError ? (
          <div className="bg-white rounded-xl shadow-sm border border-red-200 p-8 text-center max-w-2xl mx-auto">
            <AlertCircle className="w-10 h-10 mx-auto mb-3 text-red-500" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Connection error</h3>
            <p className="text-sm text-gray-600 mb-4">{loadError}</p>
            <button onClick={loadTools} className="px-4 py-2 rounded-lg text-white text-sm font-medium hover:opacity-90 transition" style={{ background: '#A6174A' }}>
              Try again
            </button>
          </div>
        ) : view === 'dashboard' ? (
          <Dashboard
            tools={filteredTools}
            allTools={tools}
            classCounts={classCounts}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filterClass={filterClass}
            setFilterClass={setFilterClass}
            filterTag={filterTag}
            setFilterTag={setFilterTag}
            filterAudience={filterAudience}
            setFilterAudience={setFilterAudience}
            hasAnyFilter={hasAnyFilter}
            clearFilters={clearFilters}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            onNew={startNew}
            onView={viewDetail}
            onEdit={startEdit}
            isUnlocked={isUnlocked}
            onLoginClick={() => setShowAuthModal(true)}
          />
        ) : view === 'evaluate' ? (
          <EvaluationForm
            tool={currentTool}
            setTool={setCurrentTool}
            onSave={saveTool}
            onCancel={() => { setView('dashboard'); setCurrentTool(null); setEditingId(null); }}
            isEditing={!!editingId}
          />
        ) : view === 'detail' ? (
          <ToolDetail
            tool={currentTool}
            onBack={() => setView('dashboard')}
            onEdit={() => startEdit(currentTool)}
            onDelete={() => requestDelete(currentTool)}
            isUnlocked={isUnlocked}
          />
        ) : null}
      </main>

      {showAuthModal && (
        <AuthModal
          onUnlock={attemptUnlock}
          onClose={() => { setShowAuthModal(false); setPendingAction(null); }}
        />
      )}

      {deleteTarget && (
        <DeleteConfirmModal
          toolName={deleteTarget.name}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      <footer className="text-center py-8 text-xs text-gray-400 border-t border-gray-200 mt-16">
        Moreton Bay College AI Tool Evaluation System
      </footer>
    </div>
  );
}

function Header({ view, onHome, isUnlocked, onLock, onLoginClick }) {
  return (
    <header style={{ background: 'linear-gradient(135deg, #A6174A 0%, #7A0E33 100%)' }} className="shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex items-center justify-between gap-3">
          <button onClick={onHome} className="flex items-center gap-3 text-white hover:opacity-90 transition min-w-0">
            <div className="w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#D4A853' }}>
              <Shield className="w-6 h-6" style={{ color: '#7A0E33' }} />
            </div>
            <div className="text-left min-w-0">
              <div className="text-xs tracking-widest opacity-80 uppercase">Moreton Bay College</div>
              <div className="text-lg font-semibold truncate">AI Tool Evaluation System</div>
            </div>
          </button>

          <div className="flex items-center gap-2 flex-shrink-0">
            {view !== 'dashboard' && (
              <button onClick={onHome} className="flex items-center gap-2 text-white text-sm px-3 py-2 rounded-lg hover:bg-white hover:bg-opacity-10 transition">
                <ArrowLeft className="w-4 h-4" /> <span className="hidden sm:inline">Dashboard</span>
              </button>
            )}
            {isUnlocked ? (
              <button onClick={onLock} className="flex items-center gap-1.5 text-sm px-3 py-2 rounded-lg transition font-medium" style={{ background: '#D4A853', color: '#7A0E33' }}>
                <Unlock className="w-4 h-4" /> <span className="hidden sm:inline">Admin mode</span>
              </button>
            ) : (
              <button onClick={onLoginClick} className="flex items-center gap-1.5 text-white text-sm px-3 py-2 rounded-lg hover:bg-white hover:bg-opacity-10 transition border border-white border-opacity-30">
                <Lock className="w-4 h-4" /> <span className="hidden sm:inline">Admin login</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

function AuthModal({ onUnlock, onClose }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    if (!password) { setError('Please enter the admin password.'); return; }
    setIsSubmitting(true);
    const result = await onUnlock(password);
    if (!result.success) {
      setError(result.error || 'Incorrect password. Please try again.');
      setIsSubmitting(false);
      setPassword('');
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(31, 31, 31, 0.6)' }}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="h-2" style={{ background: 'linear-gradient(135deg, #A6174A 0%, #7A0E33 100%)' }} />
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#FCE7F0' }}>
              <KeyRound className="w-6 h-6" style={{ color: '#A6174A' }} />
            </div>
            <div>
              <PinkHeading as="h2" size="lg">Admin Login</PinkHeading>
              <p className="text-xs text-gray-500 mt-1">Enter password to edit tools</p>
            </div>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter admin password" disabled={isSubmitting}
                className="w-full px-3 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:border-pink-400 text-sm"
                onKeyDown={e => e.key === 'Enter' && !isSubmitting && handleSubmit()} autoFocus />
            </div>
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg text-sm" style={{ background: '#FEE2E2', color: '#991B1B' }}>
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>{error}</div>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-5">
            <button onClick={onClose} disabled={isSubmitting} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
            <button onClick={handleSubmit} disabled={isSubmitting} className="flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition hover:opacity-90 disabled:opacity-60" style={{ background: '#A6174A' }}>
              {isSubmitting ? 'Please wait...' : 'Unlock'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DeleteConfirmModal({ toolName, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(31, 31, 31, 0.6)' }}>
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="h-2" style={{ background: '#DC2626' }} />
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#FEE2E2' }}>
              <Trash2 className="w-6 h-6" style={{ color: '#DC2626' }} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Delete Evaluation</h2>
              <p className="text-xs text-gray-500">This action cannot be undone</p>
            </div>
          </div>
          <p className="text-sm text-gray-700 mb-5">
            Are you sure you want to permanently delete the evaluation for <strong>{toolName || 'this tool'}</strong>? All staff will lose access to this evaluation.
          </p>
          <div className="flex gap-2">
            <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
            <button onClick={onConfirm} className="flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition hover:opacity-90" style={{ background: '#DC2626' }}>Delete Permanently</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Pagination({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between px-5 py-3" style={{ background: '#FAF7F5' }}>
      <div className="text-xs text-gray-500">
        Page <span className="font-semibold text-gray-900">{currentPage}</span> of <span className="font-semibold text-gray-900">{totalPages}</span>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-white transition disabled:opacity-40 disabled:cursor-not-allowed" title="Previous page">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className="p-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-white transition disabled:opacity-40 disabled:cursor-not-allowed" title="Next page">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ClassificationsExplainer() {
  const [expanded, setExpanded] = useState({});
  const anyExpanded = Object.values(expanded).some(v => v);

  function toggle(key) { setExpanded(prev => ({ ...prev, [key]: !prev[key] })); }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <PinkHeading as="h3" size="sm">About the classifications</PinkHeading>
        <span className="text-xs text-gray-400 ml-auto">Click any level for details</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {Object.entries(CLASSIFICATIONS).map(([key, c]) => {
          const isOpen = !!expanded[key];
          return (
            <button key={key} onClick={() => toggle(key)} className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-full transition hover:opacity-80" style={{ background: c.bg, color: c.text }}>
              <span>{c.label}</span>
              {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          );
        })}
      </div>
      {anyExpanded && (
        <div className="space-y-3 pt-3 mt-3 border-t border-gray-100">
          {Object.entries(CLASSIFICATIONS).map(([key, c]) => {
            if (!expanded[key]) return null;
            return (
              <div key={key} className="flex items-start gap-3 text-sm">
                <span className="inline-block text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 mt-0.5 whitespace-nowrap" style={{ background: c.bg, color: c.text }}>{c.label}</span>
                <span className="text-gray-700 leading-relaxed">{c.desc}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function SortMenu({ current, onChange, options, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);
  const isActive = options.some(o => o.value === current);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  function pick(value) {
    onChange(value);
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-label={ariaLabel}
        className="p-0.5 rounded hover:bg-gray-200 transition"
        style={{ color: isActive ? HEADING_PINK : '#9CA3AF' }}
      >
        <ArrowUpDown className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-20 bg-white rounded-lg shadow-lg border border-gray-200 py-1 min-w-[14rem]">
          {options.map(o => (
            <button
              key={o.value}
              type="button"
              onClick={() => pick(o.value)}
              className={`w-full text-left px-3 py-1.5 text-xs normal-case font-normal tracking-normal transition ${current === o.value ? 'bg-pink-50 text-pink-700 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Dashboard({ tools, allTools, classCounts, searchQuery, setSearchQuery, filterClass, setFilterClass, filterTag, setFilterTag, filterAudience, setFilterAudience, hasAnyFilter, clearFilters, currentPage, setCurrentPage, onNew, onView, onEdit, isUnlocked, onLoginClick }) {
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState('date-newest');

  const CLASS_RANK = { preferred: 5, approved: 4, limited: 3, restricted: 2, prohibited: 1 };
  const sortedTools = [...tools].sort((a, b) => {
    switch (sortBy) {
      case 'name-az':
        return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
      case 'name-za':
        return (b.name || '').localeCompare(a.name || '', undefined, { sensitivity: 'base' });
      case 'date-newest':
        return (b.updatedAt || 0) - (a.updatedAt || 0);
      case 'date-oldest':
        return (a.updatedAt || 0) - (b.updatedAt || 0);
      case 'status-best':
        return (CLASS_RANK[getClassification(b)] || 0) - (CLASS_RANK[getClassification(a)] || 0);
      case 'status-worst':
        return (CLASS_RANK[getClassification(a)] || 0) - (CLASS_RANK[getClassification(b)] || 0);
      default:
        return 0;
    }
  });

  const totalPages = Math.max(1, Math.ceil(sortedTools.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const start = (safePage - 1) * ITEMS_PER_PAGE;
  const paginated = sortedTools.slice(start, start + ITEMS_PER_PAGE);
  const activeFilterCount = (filterClass !== 'all' ? 1 : 0) + (filterTag !== 'all' ? 1 : 0) + (filterAudience !== 'all' ? 1 : 0);

  return (
    <div>
      {!isUnlocked && (
        <div className="mb-4 p-3 rounded-lg flex items-center gap-2 text-sm" style={{ background: '#F3F4F6', color: '#4B5563' }}>
          <Eye className="w-4 h-4 flex-shrink-0" />
          <span>View-only mode. <button onClick={onLoginClick} className="font-medium underline hover:no-underline" style={{ color: '#A6174A' }}>Log in</button> to add or edit evaluations.</span>
        </div>
      )}

      <ClassificationsExplainer />

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search tools..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-200 focus:outline-none focus:border-pink-400 text-sm" />
            </div>
            <button onClick={() => setShowFilters(!showFilters)} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border text-sm font-medium transition whitespace-nowrap hover:opacity-90 sm:w-52"
              style={activeFilterCount > 0 ? { background: '#A6174A', color: 'white', borderColor: '#A6174A' } : { background: 'white', color: '#4B5563', borderColor: '#E5E7EB' }}>
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="inline-flex items-center justify-center text-xs font-bold rounded-full px-1.5 min-w-[1.25rem] h-5" style={{ background: '#D4A853', color: '#7A0E33' }}>
                  {activeFilterCount}
                </span>
              )}
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {hasAnyFilter && (
              <button onClick={clearFilters} className="flex items-center justify-center gap-1 px-3 py-2.5 rounded-full border border-gray-200 text-gray-600 hover:bg-gray-50 text-xs font-medium transition whitespace-nowrap">
                <X className="w-3 h-3" /> Clear
              </button>
            )}
          </div>
          {showFilters && (
            <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-gray-100">
              <FilterSelect label="Status" value={filterClass} onChange={setFilterClass}
                options={[
                  { value: 'all', label: `All statuses (${allTools.length})` },
                  ...Object.entries(CLASSIFICATIONS).map(([key, c]) => ({ value: key, label: `${c.label} (${classCounts[key] || 0})` }))
                ]} />
              <FilterSelect label="Tool Type" value={filterTag} onChange={setFilterTag}
                options={[{ value: 'all', label: 'All tool types' }, ...TOOL_CATEGORIES.map(t => ({ value: t, label: t }))]} />
              <FilterSelect label="Audience" value={filterAudience} onChange={setFilterAudience}
                options={[{ value: 'all', label: 'All audiences' }, ...SUITABILITY_OPTIONS.map(o => ({ value: o.value, label: o.label }))]} />
            </div>
          )}
          {isUnlocked && (
            <div className="flex justify-end">
              <button onClick={onNew} className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-white font-medium text-sm transition hover:opacity-90 w-full sm:w-52" style={{ background: '#A6174A' }}>
                <Plus className="w-4 h-4" /> Evaluate New Tool
              </button>
            </div>
          )}
        </div>
      </div>

      {tools.length === 0 ? (
        <EmptyState onNew={onNew} hasSearch={hasAnyFilter} isUnlocked={isUnlocked} onLoginClick={onLoginClick} onClear={clearFilters} />
      ) : (
        <div>
          <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 mb-3 text-xs font-semibold text-gray-500 uppercase tracking-wide rounded-lg border border-gray-200" style={{ background: '#FAF7F5' }}>
            <div className="col-span-2 flex items-center gap-1">
              <span>Tool</span>
              <SortMenu
                current={sortBy}
                onChange={setSortBy}
                options={[
                  { value: 'name-az', label: 'Alphabetically (A to Z)' },
                  { value: 'name-za', label: 'Alphabetically (Z to A)' },
                  { value: 'date-newest', label: 'Date Added (Newest First)' },
                  { value: 'date-oldest', label: 'Date Added (Oldest First)' }
                ]}
                ariaLabel="Sort by tool"
              />
            </div>
            <div className="col-span-1 flex items-center gap-1">
              <span>Status</span>
              <SortMenu
                current={sortBy}
                onChange={setSortBy}
                options={[
                  { value: 'status-best', label: 'Status (Preferred to Restricted)' },
                  { value: 'status-worst', label: 'Status (Restricted to Preferred)' }
                ]}
                ariaLabel="Sort by status"
              />
            </div>
            <div className="col-span-2">Description</div>
            <div className="col-span-2">Audience</div>
            <div className="col-span-2">Tool Type</div>
            <div className="col-span-3">Cautions</div>
          </div>
          <div className="space-y-3">
            {paginated.map((tool, idx) => (
              <ToolRow key={tool._key || tool.id} tool={tool} index={idx} onView={() => onView(tool)} onEdit={() => onEdit(tool)} isUnlocked={isUnlocked} />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-3 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <Pagination currentPage={safePage} totalPages={totalPages} onPageChange={setCurrentPage} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div className="flex-1 min-w-0">
      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-pink-400 text-sm bg-white">
        {options.map(o => (<option key={o.value} value={o.value}>{o.label}</option>))}
      </select>
    </div>
  );
}

function EmptyState({ onNew, hasSearch, isUnlocked, onLoginClick, onClear }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-16 text-center">
      <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#FCE7F0' }}>
        <Shield className="w-8 h-8" style={{ color: '#A6174A' }} />
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{hasSearch ? 'No matching tools found' : 'No tools evaluated yet'}</h3>
      <p className="text-sm text-gray-500 mb-6 max-w-md mx-auto">
        {hasSearch ? 'Try adjusting your search or filters.' : isUnlocked ? 'Click "Evaluate New Tool" to add your first one.' : 'Log in as admin to start building the MBC AI tool library.'}
      </p>
      {hasSearch ? (
        <button onClick={onClear} className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition">
          <X className="w-4 h-4" /> Clear filters
        </button>
      ) : isUnlocked ? (
        <button onClick={onNew} className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium text-sm transition hover:opacity-90" style={{ background: '#A6174A' }}>
          <Sparkles className="w-4 h-4" /> Evaluate Your First Tool
        </button>
      ) : (
        <button onClick={onLoginClick} className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium text-sm transition hover:opacity-90" style={{ background: '#A6174A' }}>
          <Lock className="w-4 h-4" /> Admin Login
        </button>
      )}
    </div>
  );
}

function Tag({ label }) {
  const color = getTagColor(label);
  return (
    <span className="inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap" style={{ background: color.bg, color: color.text }}>
      {label}
    </span>
  );
}

function SuitabilityBadge({ value }) {
  const opt = SUITABILITY_OPTIONS.find(s => s.value === value);
  const color = SUITABILITY_COLORS[value] || { bg: '#F3F4F6', text: '#374151' };
  if (!opt) return null;
  return (
    <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap w-fit" style={{ background: color.bg, color: color.text }}>
      {opt.short}
    </span>
  );
}

function SuitabilityBadges({ values }) {
  const arr = Array.isArray(values) ? values : (values ? [values] : []);
  if (arr.length === 0) return <span className="text-xs text-gray-400">Not set</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {arr.map(v => <SuitabilityBadge key={v} value={v} />)}
    </div>
  );
}

function ToolRow({ tool, onView, onEdit, isUnlocked }) {
  const cls = formatClassification(tool);
  const tags = getTags(tool);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md hover:border-gray-300 transition cursor-pointer" onClick={onView}>
      <div className="h-1.5 w-full" style={{ background: cls.color }} />
      <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-4 items-start">
        <div className="col-span-2 min-w-0 flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-gray-900 mb-1 truncate">{tool.name}</div>
            {tool.url && (
              <a href={tool.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-xs truncate" style={{ color: '#A6174A' }}>
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{tool.url.replace(/^https?:\/\//, '')}</span>
              </a>
            )}
          </div>
          {isUnlocked && (
            <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-900 transition" title="Edit">
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="col-span-1">
          <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: cls.bg, color: cls.text }}>{cls.label}</span>
        </div>
        <div className="col-span-2">
          <p className="text-sm text-gray-700 line-clamp-3">{tool.purpose || <span className="text-gray-300">No description</span>}</p>
        </div>
        <div className="col-span-2"><SuitabilityBadges values={getSuitability(tool)} /></div>
        <div className="col-span-2">
          <div className="flex flex-wrap gap-1">
            {tags.slice(0, 4).map(tag => <Tag key={tag} label={tag} />)}
            {tags.length > 4 && <span className="text-xs text-gray-400">+{tags.length - 4}</span>}
          </div>
        </div>
        <div className="col-span-3">
          <div className="text-xs text-gray-600 line-clamp-3">
            {tool.notes ? renderMultiline(tool.notes) : <span className="text-gray-300">None</span>}
          </div>
        </div>
      </div>

      <div className="lg:hidden p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="min-w-0 flex-1">
            <div className="font-semibold text-gray-900 mb-1 truncate">{tool.name}</div>
            {tool.url && (
              <a href={tool.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="flex items-center gap-1 text-xs truncate" style={{ color: '#A6174A' }}>
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{tool.url.replace(/^https?:\/\//, '')}</span>
              </a>
            )}
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
        </div>

        {tool.purpose && (<p className="text-sm text-gray-700 mb-4 line-clamp-2">{tool.purpose}</p>)}

        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Status</div>
            <span className="inline-block text-xs font-semibold px-2.5 py-1 rounded-full" style={{ background: cls.bg, color: cls.text }}>{cls.label}</span>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Audience</div>
            <SuitabilityBadges values={getSuitability(tool)} />
          </div>
        </div>

        {tags.length > 0 && (
          <div className="mb-3">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Tool Type</div>
            <div className="flex flex-wrap gap-1">{tags.map(tag => <Tag key={tag} label={tag} />)}</div>
          </div>
        )}

        {tool.notes && (
          <div className="pt-3 border-t border-gray-100">
            <div className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">Cautions</div>
            <div className="text-xs text-gray-600 line-clamp-3">{renderMultiline(tool.notes)}</div>
          </div>
        )}
      </div>
    </div>
  );
}

function AIReasoningDisplay({ reasoning, theme = 'light' }) {
  if (!reasoning) return null;
  const headingColor = theme === 'dark' ? '#FFFFFF' : HEADING_PINK;
  const textClass = theme === 'dark' ? 'text-white text-opacity-95' : 'text-gray-700';
  const borderClass = theme === 'dark' ? 'border-white border-opacity-20' : 'border-gray-200';

  if (typeof reasoning === 'string') {
    return (<div className={`text-sm leading-relaxed ${textClass}`}>{renderMultiline(reasoning)}</div>);
  }

  const sections = [
    { key: 'overview', title: 'Overview' },
    { key: 'safetyAnalysis', title: 'Safety' },
    { key: 'ethicalAnalysis', title: 'Ethical' },
    { key: 'effectivenessAnalysis', title: 'Effectiveness' },
    { key: 'keyConsiderations', title: 'Key Considerations' }
  ];

  return (
    <div className="space-y-3">
      {sections.map((section, idx) => {
        const content = reasoning[section.key];
        if (!content) return null;
        return (
          <div key={section.key} className={idx > 0 ? `pt-2 border-t ${borderClass}` : ''}>
            <h4 className="text-sm font-semibold mb-1" style={{ color: headingColor }}>{section.title}</h4>
            <div className={`text-sm leading-relaxed ${textClass}`}>{renderMultiline(content)}</div>
          </div>
        );
      })}
    </div>
  );
}

function TagSelector({ selected, onChange }) {
  function toggle(tag) {
    if (selected.includes(tag)) onChange(selected.filter(t => t !== tag));
    else onChange([...selected, tag]);
  }
  return (
    <div className="flex flex-wrap gap-2">
      {TOOL_CATEGORIES.map(tag => {
        const isSelected = selected.includes(tag);
        const color = getTagColor(tag);
        return (
          <button key={tag} type="button" onClick={() => toggle(tag)}
            className={`text-xs font-medium px-2.5 py-1.5 rounded-full transition border ${isSelected ? '' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'}`}
            style={isSelected ? { background: color.bg, color: color.text, borderColor: color.text + '40' } : {}}>
            {isSelected && <span className="mr-1">✓</span>}{tag}
          </button>
        );
      })}
    </div>
  );
}

function AIAnalysisPanel({ tool, setTool }) {
  const [urlInput, setUrlInput] = useState(tool.url || '');
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [error, setError] = useState(null);

  async function handleAnalyse() {
    if (!urlInput.trim()) {
      setError('Please enter a URL to analyse.');
      return;
    }
    setError(null);
    setIsAnalysing(true);
    try {
      const result = await analyzeToolWithAI(urlInput.trim());
      setTool(prev => ({
        ...prev,
        ...result,
        tags: result.tags || [],
        url: urlInput.trim(),
        aiAnalysed: true,
        reviewerOverride: prev.reviewerOverride || 'none'
      }));
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again or fill out the form manually.');
    } finally {
      setIsAnalysing(false);
    }
  }

  return (
    <div className="rounded-xl overflow-hidden shadow-sm" style={{ background: 'linear-gradient(135deg, #A6174A 0%, #7A0E33 100%)' }}>
      <div className="p-5 text-white">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5" style={{ color: '#D4A853' }} />
          <h2 className="font-semibold text-lg">Analyse with AI</h2>
        </div>
        <p className="text-sm text-white text-opacity-90 mb-3">
          Paste a URL. AI will research the tool and pre-fill scores for your review.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={e => setUrlInput(e.target.value)}
            placeholder="https://example.com"
            disabled={isAnalysing}
            className="flex-1 px-4 py-2.5 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-yellow-300 disabled:opacity-60"
            onKeyDown={e => e.key === 'Enter' && !isAnalysing && handleAnalyse()}
          />
          <button
            onClick={handleAnalyse}
            disabled={isAnalysing || !urlInput.trim()}
            className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-semibold text-sm transition disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: '#D4A853', color: '#7A0E33' }}
          >
            {isAnalysing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Researching...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Analyse
              </>
            )}
          </button>
        </div>
        {error && (
          <div className="mt-3 flex items-start gap-2 p-3 rounded-lg text-sm" style={{ background: 'rgba(255,255,255,0.15)' }}>
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}
        {isAnalysing && (
          <div className="mt-2 text-xs text-white text-opacity-80">
            Usually takes around a minute.
          </div>
        )}
      </div>
      {tool.aiAnalysed && tool.aiReasoning && (
        <div className="bg-white bg-opacity-10 border-t border-white border-opacity-20 p-5">
          <AIReasoningDisplay reasoning={tool.aiReasoning} theme="dark" />
          <div className="text-xs mt-3 pt-2 border-t border-white border-opacity-20 text-white text-opacity-70 italic">
            Review and adjust scores below as needed.
          </div>
        </div>
      )}
    </div>
  );
}

function EvaluationForm({ tool, setTool, onSave, onCancel, isEditing }) {
  const safetyScore = calculateSafetyScore(tool.safety);
  const ethicalScore = calculateEthicalScore(tool.ethical);
  const effectiveScore = tool.effective || 0;
  const total = safetyScore + ethicalScore + effectiveScore;
  const cls = formatClassification(tool);
  const canSave = tool.name && tool.purpose;

  function updateField(field, value) { setTool(prev => ({ ...prev, [field]: value })); }
  function updateSafety(field, value) { setTool(prev => ({ ...prev, safety: { ...prev.safety, [field]: value } })); }
  function togglePii(field) { setTool(prev => ({ ...prev, safety: { ...prev.safety, pii: { ...prev.safety.pii, [field]: !prev.safety.pii[field] } } })); }
  function updateEthical(field, value) { setTool(prev => ({ ...prev, ethical: { ...prev.ethical, [field]: value } })); }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {!isEditing && <AIAnalysisPanel tool={tool} setTool={setTool} />}

        <FormSection title="Tool Information" icon={<FileText className="w-4 h-4" />}>
          <Field label="Tool Name" required>
            <input type="text" value={tool.name} onChange={e => updateField('name', e.target.value)} placeholder="e.g., ChatGPT, Claude, Gamma" className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-pink-400 text-sm" />
          </Field>
          <Field label="Website URL">
            <input type="url" value={tool.url} onChange={e => updateField('url', e.target.value)} placeholder="https://..." className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-pink-400 text-sm" />
          </Field>
          <Field label="Purpose and Description" required>
            <textarea value={tool.purpose} onChange={e => updateField('purpose', e.target.value)} placeholder="What does this tool do? What is it for?" rows={3} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-pink-400 text-sm resize-none" />
          </Field>
          <Field label="Tags (select all that apply)">
            <TagSelector selected={tool.tags || []} onChange={tags => updateField('tags', tags)} />
          </Field>
          <Field label="Age Restriction (if any)">
            <input type="text" value={tool.ageRestriction} onChange={e => updateField('ageRestriction', e.target.value)} placeholder="e.g., 13+, 16+" className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-pink-400 text-sm" />
            <p className="text-xs text-gray-500 mt-1">Appears inside the classification bubble on the main list.</p>
          </Field>
          <Field label="Suitable For (select all that apply)">
            <div className="grid grid-cols-1 gap-2">
              {SUITABILITY_OPTIONS.map(opt => {
                const selected = getSuitability(tool);
                const isChecked = selected.includes(opt.value);
                const isNotRecommended = opt.value === 'not-recommended';
                const isAll = opt.value === 'all';

                function toggle() {
                  let next;
                  // "Not recommended" and "All users" are mutually exclusive with everything else
                  if (isNotRecommended) {
                    next = isChecked ? [] : ['not-recommended'];
                  } else if (isAll) {
                    next = isChecked ? [] : ['all'];
                  } else {
                    next = isChecked
                      ? selected.filter(v => v !== opt.value)
                      : [...selected.filter(v => v !== 'not-recommended' && v !== 'all'), opt.value];
                  }
                  updateField('suitability', next);
                }

                return (
                  <label key={opt.value} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${isChecked ? 'border-pink-400 bg-pink-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <input type="checkbox" checked={isChecked} onChange={toggle} className="rounded text-pink-600" />
                    <span className="text-sm text-gray-700">{opt.label}</span>
                  </label>
                );
              })}
            </div>
            <p className="text-xs text-gray-500 mt-1.5">"All users" and "Not recommended" cannot be combined with other audiences.</p>
          </Field>
        </FormSection>

        <FormSection title="Safety Score" icon={<Shield className="w-4 h-4" />} score={safetyScore} maxScore={20}>
          {SAFETY_CRITERIA.map(criterion => (
            <ScoreCriterion key={criterion.id} label={criterion.label} options={criterion.options} value={tool.safety[criterion.id]} onChange={val => updateSafety(criterion.id, val)} />
          ))}
          <div className="pt-3 border-t border-gray-100">
            <div className="text-sm font-medium text-gray-700 mb-2">PII and Compliance Certifications (1 point each)</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {PII_CERTIFICATIONS.map(cert => (
                <label key={cert.id} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition ${tool.safety.pii[cert.id] ? 'border-pink-400 bg-pink-50' : 'border-gray-200 hover:border-gray-300'}`}>
                  <input type="checkbox" checked={tool.safety.pii[cert.id]} onChange={() => togglePii(cert.id)} className="rounded text-pink-600" />
                  <span className="text-sm text-gray-700">{cert.label}</span>
                </label>
              ))}
            </div>
          </div>
        </FormSection>

        <FormSection title="Ethical Score" icon={<Award className="w-4 h-4" />} score={ethicalScore} maxScore={18}>
          {ETHICAL_CRITERIA.map(criterion => (
            <ScoreCriterion key={criterion.id} label={criterion.label} options={criterion.options} value={tool.ethical[criterion.id]} onChange={val => updateEthical(criterion.id, val)} />
          ))}
        </FormSection>

        <FormSection title="Effectiveness" icon={<Star className="w-4 h-4" />} score={effectiveScore} maxScore={5}>
          <Field label="How effective is this tool (0 to 5)">
            <div className="flex items-center gap-2">
              {[0, 1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" onClick={() => updateField('effective', n)} className={`w-12 h-12 rounded-lg border-2 font-semibold transition ${tool.effective === n ? 'border-pink-500 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>{n}</button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">Consider quality of output, efficiency, ease of use, and alignment with MBC teaching and learning goals.</p>
          </Field>
        </FormSection>

        <FormSection title="Reviewer Notes and Override" icon={<Edit3 className="w-4 h-4" />}>
          <Field label="Cautions and Notes for MBC staff">
            <textarea value={tool.notes} onChange={e => updateField('notes', e.target.value)} placeholder="Any specific cautions, use cases, or context for staff. You can use **bold** for emphasis." rows={4} className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:border-pink-400 text-sm resize-none" />
            <p className="text-xs text-gray-500 mt-1">Supports **bold** formatting and line breaks.</p>
          </Field>
          <Field label="Reviewer Override (moves classification one level)">
            <div className="grid grid-cols-3 gap-2">
              {[{ v: 'down', l: 'Move down one level' }, { v: 'none', l: 'No override' }, { v: 'up', l: 'Move up one level' }].map(opt => (
                <button key={opt.v} type="button" onClick={() => updateField('reviewerOverride', opt.v)} className={`px-3 py-2 rounded-lg border text-xs font-medium transition ${tool.reviewerOverride === opt.v ? 'border-pink-400 bg-pink-50 text-pink-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {opt.l}
                </button>
              ))}
            </div>
          </Field>
        </FormSection>
      </div>

      <div className="lg:col-span-1">
        <div className="sticky top-4 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="h-2" style={{ background: cls.color }} />
            <div className="p-5">
              <div className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Current Classification</div>
              <div className="text-2xl font-bold mb-3" style={{ color: cls.color }}>{cls.label}</div>
              <p className="text-sm text-gray-600 mb-5">{cls.desc}</p>
              <div className="space-y-3">
                <ScoreBar label="Safety" value={safetyScore} max={20} color="#A6174A" />
                <ScoreBar label="Ethical" value={ethicalScore} max={18} color="#D4A853" />
                <ScoreBar label="Effective" value={effectiveScore} max={5} color="#7A0E33" />
              </div>
              <div className="flex items-baseline justify-between pt-4 mt-4 border-t border-gray-100">
                <div className="text-sm font-medium text-gray-700">Total Score</div>
                <div>
                  <span className="text-2xl font-bold text-gray-900">{total}</span>
                  <span className="text-sm text-gray-400"> / 43</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 text-xs text-gray-600 space-y-2">
            <div className="font-semibold text-gray-900 text-sm mb-2">Classification Thresholds</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: CLASSIFICATIONS.approved.color }}></span> Approved: 26 and above</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: CLASSIFICATIONS.limited.color }}></span> Limited: 15 to 25</div>
            <div className="flex items-center gap-2"><span className="w-2 h-2 rounded-full" style={{ background: CLASSIFICATIONS.restricted.color }}></span> Restricted: below 15</div>
            <div className="pt-2 mt-2 border-t border-gray-100 text-gray-500">Safeguards scoring 0 auto-assigns Prohibited. Scoring 1 auto-assigns Restricted.</div>
          </div>

          <div className="flex gap-2">
            <button onClick={onCancel} className="flex-1 px-4 py-2.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
            <button onClick={() => onSave(tool)} disabled={!canSave} className="flex-1 px-4 py-2.5 rounded-lg text-white text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90" style={{ background: '#A6174A' }}>
              {isEditing ? 'Update' : 'Save'} Evaluation
            </button>
          </div>
          {!canSave && (<p className="text-xs text-gray-500 text-center">Tool name and purpose are required.</p>)}
        </div>
      </div>
    </div>
  );
}

function FormSection({ title, icon, score, maxScore, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span style={{ color: HEADING_PINK }}>{icon}</span>
          <PinkHeading as="h2" size="base">{title}</PinkHeading>
        </div>
        {score !== undefined && (
          <div className="text-sm">
            <span className="font-bold text-gray-900">{score}</span>
            <span className="text-gray-400"> / {maxScore}</span>
          </div>
        )}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}{required && <span className="text-pink-600 ml-1">*</span>}
      </label>
      {children}
    </div>
  );
}

function ScoreCriterion({ label, options, value, onChange }) {
  return (
    <div>
      <div className="text-sm font-medium text-gray-700 mb-2">{label}</div>
      <div className="grid grid-cols-1 gap-1.5">
        {options.map(opt => (
          <label key={opt.value} className={`flex items-center justify-between px-3 py-2 rounded-lg border cursor-pointer transition text-sm ${value === opt.value ? 'border-pink-400 bg-pink-50' : 'border-gray-200 hover:border-gray-300'}`}>
            <div className="flex items-center gap-2.5">
              <input type="radio" checked={value === opt.value} onChange={() => onChange(opt.value)} className="text-pink-600" />
              <span className="text-gray-700">{opt.label}</span>
            </div>
            <span className={`text-xs font-semibold ${value === opt.value ? 'text-pink-700' : 'text-gray-400'}`}>
              {opt.value} pt{opt.value !== 1 ? 's' : ''}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function ScoreBar({ label, value, max, color }) {
  const pct = (value / max) * 100;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-gray-600">{label}</span>
        <span className="text-gray-900 font-medium">{value} / {max}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function ToolDetail({ tool, onBack, onEdit, onDelete, isUnlocked }) {
  const cls = formatClassification(tool);
  const safetyScore = calculateSafetyScore(tool.safety);
  const ethicalScore = calculateEthicalScore(tool.ethical);
  const effectiveScore = tool.effective || 0;
  const total = safetyScore + ethicalScore + effectiveScore;
  const suitabilityArr = getSuitability(tool);
  const suitabilityLabels = suitabilityArr
    .map(v => SUITABILITY_OPTIONS.find(s => s.value === v)?.label)
    .filter(Boolean);
  const tags = getTags(tool);

  function findLabel(criteria, id, value) {
    const crit = criteria.find(c => c.id === id);
    if (!crit) return 'Not scored';
    const opt = crit.options.find(o => o.value === value);
    return opt?.label || 'Not scored';
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="h-2" style={{ background: cls.color }} />
        <div className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
            <div className="min-w-0">
              <PinkHeading as="h1" size="2xl" className="mb-2">{tool.name}</PinkHeading>
              {tool.url && (
                <a href={tool.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm" style={{ color: '#A6174A' }}>
                  <ExternalLink className="w-3.5 h-3.5" /> {tool.url}
                </a>
              )}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              {isUnlocked ? (
                <>
                  <button onClick={onEdit} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 hover:bg-gray-50">
                    <Edit3 className="w-3.5 h-3.5" /> Edit
                  </button>
                  <button onClick={onDelete} className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 text-sm text-red-600 hover:bg-red-50">
                    <Trash2 className="w-3.5 h-3.5" /> Delete
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs text-gray-500" style={{ background: '#F3F4F6' }}>
                  <Eye className="w-3.5 h-3.5" /> View only
                </div>
              )}
            </div>
          </div>

          <p className="text-gray-700 mb-6">{tool.purpose}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-5 border-t border-gray-100">
            <OverviewField label="Status">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="inline-block text-xs font-semibold px-3 py-1 rounded-full" style={{ background: cls.bg, color: cls.text }}>{cls.label}</span>
                <span className="text-xs text-gray-500">Score {total}/43</span>
              </div>
            </OverviewField>
            <OverviewField label="Tool Type">
              {tags.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">{tags.map(tag => <Tag key={tag} label={tag} />)}</div>
              ) : (<span className="text-xs text-gray-400">No tags</span>)}
            </OverviewField>
            <OverviewField label="Audience">
              {suitabilityArr.length > 0 ? (
                <div className="space-y-1.5">
                  <SuitabilityBadges values={suitabilityArr} />
                  <div className="text-xs text-gray-500">{suitabilityLabels.join(', ')}</div>
                </div>
              ) : (<span className="text-xs text-gray-400">Not set</span>)}
            </OverviewField>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Shield className="w-4 h-4" style={{ color: HEADING_PINK }} />
            <PinkHeading as="h2" size="base">Safety</PinkHeading>
            <span className="ml-auto text-sm"><span className="font-bold">{safetyScore}</span> / 20</span>
          </div>
          <div className="space-y-3 text-sm">
            {SAFETY_CRITERIA.map(crit => (
              <div key={crit.id}>
                <div className="text-gray-600 text-xs">{crit.label}</div>
                <div className="text-gray-900">{findLabel(SAFETY_CRITERIA, crit.id, tool.safety[crit.id])}</div>
              </div>
            ))}
            <div>
              <div className="text-gray-600 text-xs">Certifications</div>
              <div className="text-gray-900 text-sm">
                {PII_CERTIFICATIONS.filter(p => tool.safety.pii[p.id]).map(p => p.label).join(', ') || 'None'}
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4" style={{ color: HEADING_PINK }} />
            <PinkHeading as="h2" size="base">Ethical</PinkHeading>
            <span className="ml-auto text-sm"><span className="font-bold">{ethicalScore}</span> / 18</span>
          </div>
          <div className="space-y-3 text-sm">
            {ETHICAL_CRITERIA.map(crit => (
              <div key={crit.id}>
                <div className="text-gray-600 text-xs">{crit.label}</div>
                <div className="text-gray-900">{findLabel(ETHICAL_CRITERIA, crit.id, tool.ethical[crit.id])}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Star className="w-4 h-4" style={{ color: HEADING_PINK }} />
            <PinkHeading as="h2" size="base">Effectiveness</PinkHeading>
            <span className="ml-auto text-sm"><span className="font-bold">{effectiveScore}</span> / 5</span>
          </div>
          <div className="flex items-center gap-1 mb-4">
            {[1, 2, 3, 4, 5].map(n => (
              <Star key={n} className="w-6 h-6" style={{ fill: n <= effectiveScore ? '#D4A853' : 'transparent', color: n <= effectiveScore ? '#D4A853' : '#D1D5DB' }} />
            ))}
          </div>
          {tool.reviewerOverride && tool.reviewerOverride !== 'none' && (
            <div className="pt-3 border-t border-gray-100">
              <div className="text-xs text-gray-600">Reviewer Override</div>
              <div className="text-sm text-gray-900">Moved {tool.reviewerOverride} one level</div>
            </div>
          )}
        </div>
      </div>

      {tool.aiReasoning && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Info className="w-4 h-4" style={{ color: HEADING_PINK }} />
            <PinkHeading as="h2" size="base">Evaluation Reasoning</PinkHeading>
          </div>
          <AIReasoningDisplay reasoning={tool.aiReasoning} />
        </div>
      )}

      {tool.notes && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-4 h-4" style={{ color: HEADING_PINK }} />
            <PinkHeading as="h2" size="base">Cautions and Notes for Staff</PinkHeading>
          </div>
          <div className="text-sm text-gray-700 leading-relaxed">{renderMultiline(tool.notes)}</div>
        </div>
      )}

      {tool.updatedAt && (
        <div className="text-center text-xs text-gray-400 flex items-center justify-center gap-1">
          <Calendar className="w-3 h-3" />
          Last updated {new Date(tool.updatedAt).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
      )}
    </div>
  );
}
