import { useState, useRef, useEffect } from 'react';
import { Search, Plus, Filter, MoreHorizontal, Sparkles, ChevronLeft, Upload, GitBranch, Trash2, Download, X, Check, Clock, Play, PenLine, RefreshCw, FileText, FolderOpen, ChevronRight, Copy, Maximize2, Minimize2, MessageSquare } from 'lucide-react';
import { useRequireAuth } from '../lib/authGate.jsx';

// ── Simple Markdown Renderer ──────────────────────────────────────────────
const renderMarkdown = (md) => {
  if (!md) return null;
  const lines = md.split('\n');
  const elements = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Headings
    if (line.startsWith('# ')) {
      elements.push(<h1 key={key++} className="text-[22px] font-bold text-slate-900 mt-6 mb-3">{parseInline(line.slice(2))}</h1>);
      i++; continue;
    }
    if (line.startsWith('## ')) {
      elements.push(<h2 key={key++} className="text-[18px] font-bold text-slate-800 mt-5 mb-2">{parseInline(line.slice(3))}</h2>);
      i++; continue;
    }
    if (line.startsWith('### ')) {
      elements.push(<h3 key={key++} className="text-[15px] font-bold text-slate-700 mt-4 mb-2">{parseInline(line.slice(4))}</h3>);
      i++; continue;
    }

    // Code blocks
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <pre key={key++} className="bg-slate-900 text-slate-100 rounded-lg p-4 my-3 overflow-x-auto text-[12px] leading-relaxed font-mono">
          <code>{codeLines.join('\n')}</code>
        </pre>
      );
      continue;
    }

    // Ordered list items
    if (/^\d+\.\s/.test(line)) {
      const listItems = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        // Check for sub-items
        const mainText = lines[i].replace(/^\d+\.\s/, '');
        const subItems = [];
        i++;
        while (i < lines.length && /^\s+\d+\.\s/.test(lines[i])) {
          subItems.push(lines[i].replace(/^\s+\d+\.\s/, ''));
          i++;
        }
        listItems.push({ text: mainText, subs: subItems });
      }
      elements.push(
        <ol key={key++} className="list-decimal list-inside space-y-2 my-3 text-[13px] text-slate-600 leading-relaxed">
          {listItems.map((item, idx) => (
            <li key={idx}>
              {parseInline(item.text)}
              {item.subs.length > 0 && (
                <ol className="list-decimal list-inside ml-5 mt-1.5 space-y-1">
                  {item.subs.map((sub, si) => <li key={si}>{parseInline(sub)}</li>)}
                </ol>
              )}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Unordered list items
    if (/^[-*]\s/.test(line)) {
      const listItems = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i])) {
        listItems.push(lines[i].replace(/^[-*]\s/, ''));
        i++;
      }
      elements.push(
        <ul key={key++} className="list-disc list-inside space-y-1.5 my-3 text-[13px] text-slate-600 leading-relaxed">
          {listItems.map((item, idx) => <li key={idx}>{parseInline(item)}</li>)}
        </ul>
      );
      continue;
    }

    // Table (lines starting with |)
    if (line.startsWith('|') && line.endsWith('|')) {
      const tableRows = [];
      while (i < lines.length && lines[i].startsWith('|') && lines[i].endsWith('|')) {
        tableRows.push(lines[i]);
        i++;
      }
      // Filter out separator rows (|---|---|)
      const isSeparator = (row) => /^\|[\s\-:|]+\|$/.test(row);
      const parseRow = (row) => row.split('|').slice(1, -1).map(cell => cell.trim());
      const headerRow = tableRows[0] ? parseRow(tableRows[0]) : [];
      const dataRows = tableRows.filter((r, idx) => idx > 0 && !isSeparator(r)).map(parseRow);
      elements.push(
        <div key={key++} className="my-4 overflow-x-auto rounded-xl border border-slate-200/80">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-slate-50/80">
                {headerRow.map((cell, ci) => (
                  <th key={ci} className="px-4 py-2.5 text-left font-bold text-slate-700 border-b border-slate-200/80">{parseInline(cell)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, ri) => (
                <tr key={ri} className="border-b border-slate-100 last:border-0 hover:bg-orange-50/20">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-4 py-2.5 text-slate-600">{parseInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Empty line
    if (!line.trim()) { i++; continue; }

    // Paragraph
    elements.push(<p key={key++} className="text-[13px] text-slate-600 leading-relaxed my-2">{parseInline(line)}</p>);
    i++;
  }

  return elements;
};

// Parse inline markdown: **bold**, *italic*, `code`, [links](url)
const parseInline = (text) => {
  if (!text) return text;
  const parts = [];
  let remaining = text;
  let k = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Inline code
    const codeMatch = remaining.match(/`([^`]+)`/);
    // Find the earliest match
    const matches = [
      boldMatch ? { type: 'bold', index: remaining.indexOf(boldMatch[0]), match: boldMatch } : null,
      codeMatch ? { type: 'code', index: remaining.indexOf(codeMatch[0]), match: codeMatch } : null,
    ].filter(Boolean).sort((a, b) => a.index - b.index);

    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }

    const first = matches[0];
    if (first.index > 0) {
      parts.push(remaining.slice(0, first.index));
    }

    if (first.type === 'bold') {
      parts.push(<strong key={k++} className="font-semibold text-slate-800">{first.match[1]}</strong>);
      remaining = remaining.slice(first.index + first.match[0].length);
    } else if (first.type === 'code') {
      parts.push(<code key={k++} className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[11px] font-mono">{first.match[1]}</code>);
      remaining = remaining.slice(first.index + first.match[0].length);
    }
  }

  return parts;
};

// ── Skill Detail View ─────────────────────────────────────────────────────
const SkillDetailView = ({ skill, onClose, onTrySkill, onDownload }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileName = `${skill.id || skill.name.toLowerCase().replace(/\s+/g, '_')}.md`;

  const yamlFrontmatter = `name: ${skill.name}\ndescription: "${skill.description || ''}"`;

  const handleCopy = () => {
    const full = `---\n${yamlFrontmatter}\ntype: skill\n---\n\n${skill.content || ''}`;
    navigator.clipboard.writeText(full).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const panelClass = expanded
    ? 'fixed inset-0 z-50 bg-white/95 backdrop-blur-xl flex flex-col animate-[fadeSlideUp_0.3s_ease-out]'
    : 'fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-[780px] max-h-[85vh] bg-white/95 backdrop-blur-xl shadow-2xl shadow-orange-500/5 border border-slate-200/60 rounded-2xl flex flex-col animate-[fadeSlideUp_0.3s_ease-out]';

  return (
    <>
      {!expanded && <div className="fixed inset-0 bg-black/40 backdrop-blur-md animate-[fadeIn_0.2s_ease-out] z-40" onClick={onClose} />}
      <div className={panelClass}>
        {/* Header */}
        <div className="relative flex items-center justify-between px-5 py-3.5 border-b border-slate-700 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shrink-0">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(249,115,22,0.15),transparent_60%)]" />
          </div>
          <div className="relative flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center shrink-0">
              <Sparkles size={15} className="text-orange-400" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[13px] font-bold text-white truncate">{fileName}</h3>
              <p className="text-[10px] text-slate-400">Skill</p>
            </div>
          </div>
          <div className="relative flex items-center gap-1.5">
            {onTrySkill && (
              <button onClick={() => onTrySkill(skill)}
                className="px-3.5 py-1.5 rounded-lg text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-white/10 border border-slate-700 transition-colors">
                Try it out
              </button>
            )}
            <button onClick={() => onDownload(skill)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors" title="Download">
              <Download size={15} />
            </button>
            <button onClick={() => setExpanded(prev => !prev)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors" title={expanded ? 'Collapse' : 'Expand'}>
              {expanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>
            <button onClick={onClose}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* Content */}
          <div className="flex-1 overflow-auto p-6">
            {/* YAML frontmatter block */}
            <div className="bg-slate-900 rounded-lg overflow-hidden mb-6">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
                <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">YAML</span>
                <button onClick={handleCopy}
                  className="text-slate-500 hover:text-slate-300 transition-colors" title="Copy">
                  {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                </button>
              </div>
              <pre className="px-4 py-3 text-[12px] leading-relaxed font-mono overflow-x-auto">
                <code>
                  <span className="text-emerald-400">name</span><span className="text-slate-400">: </span><span className="text-amber-300">{skill.name}</span>{'\n'}
                  <span className="text-emerald-400">description</span><span className="text-slate-400">: </span><span className="text-amber-300">"{skill.description || ''}"</span>
                </code>
              </pre>
            </div>

            {/* Rendered markdown content */}
            <div className="prose-custom">
              {renderMarkdown(skill.content)}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

// ── Skill Card ─────────────────────────────────────────────────────────────
const SkillCard = ({ skill, isActive, onToggle, onMenuAction, onView }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const menuBtnRef = useRef(null);
  const isOfficial = skill.isOfficial;

  const openMenu = (e) => {
    e.stopPropagation();
    setMenuOpen(!menuOpen);
  };

  // Close menu on any click outside
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target) && !menuBtnRef.current?.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  return (
    <div onClick={() => { if (!menuOpen) onView?.(skill); }} className={`relative bg-white/80 backdrop-blur-sm rounded-2xl border border-slate-200/80 p-5 flex flex-col gap-3 group hover:border-orange-200/60 hover:shadow-lg hover:shadow-orange-500/5 hover:-translate-y-0.5 transition-all duration-300 cursor-pointer ${menuOpen ? 'z-50' : ''}`}>
      {/* Hover gradient overlay */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-500/[0.02] via-transparent to-amber-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

      {/* Top row: name + toggle */}
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="text-[13px] font-bold text-slate-800 truncate group-hover:text-orange-700 transition-colors">{skill.name}</h3>
            {(skill.featured || isOfficial) && <Sparkles size={12} className="text-orange-400 shrink-0" />}
            {/* Version badge — only on custom skills that have at least one
                recorded revision. Hidden for official/system skills (they're
                file-based, no DB versioning) and for legacy custom skills
                created before history existed (their version is null). */}
            {!isOfficial && skill.version != null && (
              <span
                className="shrink-0 inline-flex items-center text-[9.5px] font-bold tracking-wide text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded-md font-mono"
                title={`Current version — open the skill and click History to browse all ${skill.version} version${skill.version === 1 ? '' : 's'}`}
              >
                v{skill.version}
              </span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggle(skill.id); }}
          className={`relative w-9 h-[20px] rounded-full shrink-0 transition-all duration-300 ${isActive ? 'bg-gradient-to-r from-orange-500 to-amber-500 shadow-sm shadow-orange-500/30' : 'bg-slate-200'}`}
        >
          <span className={`absolute top-[2px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${isActive ? 'left-[18px]' : 'left-[2px]'}`} />
        </button>
      </div>

      {/* Description */}
      <p className="relative text-[11px] text-slate-500 leading-relaxed line-clamp-2 min-h-[32px]">{skill.description}</p>

      {/* Bottom: badge + date + menu */}
      <div className="relative flex items-center justify-between mt-auto pt-1">
        <div className="flex items-center gap-2 min-w-0">
          {isOfficial && (
            <span className="flex items-center gap-1 text-[10px] text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full">
              <Check size={9} />
              Official
            </span>
          )}
          {!isOfficial && skill.isPersonal && (
            <span className="text-[10px] text-orange-600 font-medium flex items-center gap-1 bg-orange-50 px-2 py-0.5 rounded-full">
              Custom
            </span>
          )}
          {skill.updatedAt && (
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <Clock size={9} className="shrink-0 text-orange-400/60" />
              {new Date(skill.updatedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          )}
        </div>

        {/* Context menu trigger */}
        <div className="relative">
          <button
            ref={menuBtnRef}
            onClick={openMenu}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition-all shrink-0"
          >
            <MoreHorizontal size={14} />
          </button>

          {/* Context menu — positioned relative to button */}
          {menuOpen && (
            <>
              <div ref={menuRef} className="absolute right-0 top-full mt-1 w-52 bg-white backdrop-blur-xl rounded-xl shadow-2xl shadow-orange-500/5 border border-slate-200/60 z-[100] py-1.5 animate-[fadeSlideUp_0.15s_ease-out]">

            <button onClick={() => { setMenuOpen(false); onMenuAction('tryit', skill); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50">
              <Play size={14} className="text-slate-400" /> Try it out
            </button>
            <button onClick={() => { setMenuOpen(false); onMenuAction('download', skill); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50">
              <Download size={14} className="text-slate-400" /> Download
            </button>
            {/* Edit, Replace, Publish — only for private/team skills */}
            {!isOfficial && (
              <>
                <button onClick={() => { setMenuOpen(false); onMenuAction('edit', skill); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50">
                  <PenLine size={14} className="text-slate-400" /> Edit with AI Ad Manager
                </button>
                <button onClick={() => { setMenuOpen(false); onMenuAction('replace', skill); }}
                  className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-slate-700 hover:bg-slate-50">
                  <RefreshCw size={14} className="text-slate-400" /> Replace
                </button>
              </>
            )}
            <div className="border-t border-slate-100 my-1" />
            <button onClick={() => { setMenuOpen(false); onMenuAction('delete', skill); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-[13px] text-red-500 hover:bg-red-50">
              <Trash2 size={14} /> {isOfficial ? 'Remove' : 'Delete'}
            </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Add Dropdown ───────────────────────────────────────────────────────────
const AddDropdown = ({ open, onClose, onSelect }) => {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const options = [
    { id: 'build', icon: <Sparkles size={16} className="text-indigo-500" />, label: 'Build with AI Agent', desc: 'Build great skills through conversation' },
    { id: 'upload', icon: <Upload size={16} className="text-emerald-500" />, label: 'Upload a skill', desc: 'Upload one or more .md files' },
  ];

  return (
    <div ref={ref} className="absolute right-0 top-full mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 py-1.5">
      {options.map(opt => (
        <button
          key={opt.id}
          onClick={() => { if (!opt.soon) { onSelect(opt.id); onClose(); } }}
          disabled={opt.soon}
          className={`w-full flex items-start gap-3 px-4 py-3 transition-colors text-left ${opt.soon ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'}`}
        >
          <div className="mt-0.5 shrink-0">{opt.icon}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className={`text-[13px] font-medium ${opt.soon ? 'text-slate-400' : 'text-slate-800'}`}>{opt.label}</p>
              {opt.soon && <span className="text-[9px] font-medium text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">Soon</span>}
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">{opt.desc}</p>
          </div>
        </button>
      ))}
    </div>
  );
};

// ── Delete Confirm ─────────────────────────────────────────────────────────
const DeleteConfirm = ({ skill, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-md animate-[fadeIn_0.2s_ease-out] flex items-center justify-center p-4" onClick={onCancel}>
    <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl w-full max-w-sm animate-[fadeSlideUp_0.3s_ease-out]" onClick={e => e.stopPropagation()}>
      <div className="px-5 pt-5 pb-3">
        <h3 className="text-sm font-bold text-slate-900 mb-1">Delete "{skill.name}"?</h3>
        <p className="text-xs text-slate-500">This skill will be permanently deleted. This cannot be undone.</p>
      </div>
      <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-slate-100">
        <button onClick={onCancel} className="px-4 py-2 rounded-lg text-xs font-medium text-slate-500 hover:bg-slate-100">Cancel</button>
        <button onClick={onConfirm} className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-red-600 hover:bg-red-500 transition-colors">Delete</button>
      </div>
    </div>
  </div>
);

// ── GitHub Import Bar ──────────────────────────────────────────────────────
const GitHubImportBar = ({ onClose, onImport }) => {
  const [url, setUrl] = useState('');

  return (
    <div className="flex items-center gap-3 px-5 py-3 bg-white rounded-xl border border-slate-200 shadow-sm">
      <GitBranch size={16} className="text-slate-400 shrink-0" />
      <input
        value={url}
        onChange={e => setUrl(e.target.value)}
        placeholder="Paste a GitHub repository link..."
        className="flex-1 bg-transparent text-sm text-slate-700 placeholder-slate-400 outline-none"
        autoFocus
        onKeyDown={e => e.key === 'Enter' && url.trim() && onImport(url.trim())}
      />
      <button onClick={() => url.trim() && onImport(url.trim())} disabled={!url.trim()}
        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white hover:bg-indigo-500 disabled:bg-slate-200 disabled:text-slate-400 transition-colors">
        Import
      </button>
      <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
        <X size={14} />
      </button>
    </div>
  );
};

// ── Main Skills Library ────────────────────────────────────────────────────
export const SkillsLibrary = ({ skills, onCreate, onDelete, onBack, onBuildWithAI, onTrySkill, onEditSkill, onRefresh, onEnrich, skillToggles, onToggleChange }) => {
  // Re-fetch skills on mount to pick up skills created by AI agent
  useEffect(() => { if (onRefresh) onRefresh(); }, [onRefresh]);

  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all' | 'private' | 'team' | 'official'
  const [filterOpen, setFilterOpen] = useState(false);
  const [addDropdownOpen, setAddDropdownOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [viewingSkill, setViewingSkill] = useState(null);
  const activeToggles = skillToggles || {};
  const setActiveToggles = (updater) => {
    if (onToggleChange) {
      onToggleChange(typeof updater === 'function' ? updater(activeToggles) : updater);
    }
  };
  const fileInputRef = useRef(null);

  const handleToggle = (id) => {
    setActiveToggles(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleMenuAction = (action, skill) => {
    switch (action) {
      case 'tryit':
        if (onTrySkill) { onTrySkill(skill); }
        break;
      case 'download': {
        const md = `---\nname: ${skill.name}\ndescription: ${skill.description || ''}\ntype: skill\n---\n\n${skill.content || ''}`;
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = `${skill.id || skill.name.toLowerCase().replace(/\s+/g, '-')}.skill`; a.click();
        URL.revokeObjectURL(url);
        break;
      }
      case 'edit':
        // Open the skill's config page (StrategistConfig) — name/desc/instructions
        // editor + version history. Falls back to "Build with AI" only if the
        // host didn't wire onEditSkill, to preserve old behaviour.
        if (onEditSkill) onEditSkill(skill);
        else if (onBuildWithAI) onBuildWithAI();
        break;
      case 'replace':
        // Open file picker to replace skill content
        fileInputRef.current?.click();
        break;
      case 'delete':
        setDeleteTarget(skill);
        break;
    }
  };

  // Auth gate — Skills Library writes are: build-with-AI, upload skill
  // file, delete skill. All three pass through the wrapped handlers below.
  const requireAuth = useRequireAuth();

  const handleAddSelect = requireAuth((type) => {
    switch (type) {
      case 'build':
        if (onBuildWithAI) onBuildWithAI();
        break;
      case 'upload':
        fileInputRef.current?.click();
        break;
    }
  });

  const [uploadError, setUploadError] = useState(null);

  const handleFileUpload = requireAuth(async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadError(null);

    const parseAndCreate = async (file) => {
      const text = await file.text();
      if (!text.trim()) return;

      let name, description = '', preview = '', content = text;
      const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
      if (match) {
        const meta = {};
        match[1].split('\n').forEach(line => {
          const [key, ...rest] = line.split(':');
          if (key && rest.length) meta[key.trim()] = rest.join(':').trim();
        });
        name = meta.name;
        description = meta.description || '';
        preview = meta.preview || '';
        content = match[2].trim() || text;
      }
      if (!name) name = file.name.replace(/\.(md|txt)$/, '');

      // Auto-generate missing description/preview via AI
      if (onEnrich && (!description || !preview)) {
        const enriched = await onEnrich(name, content);
        if (!description) description = enriched.description || '';
        if (!preview) preview = enriched.preview || '';
      }

      await onCreate({ name, description, content, preview, type: 'strategy' });
    };

    const errors = [];
    await Promise.all(files.map(async (file) => {
      try { await parseAndCreate(file); }
      catch (err) {
        const msg = err.response?.data?.error;
        errors.push(typeof msg === 'string' ? msg : (err.message || 'Upload failed'));
      }
    }));
    if (onRefresh) await onRefresh();
    if (errors.length) setUploadError(errors.join('; '));
    e.target.value = '';
  });

const handleDelete = requireAuth(async () => {
    if (!deleteTarget) return;
    try { await onDelete(deleteTarget.id); } catch (err) { console.error('Delete failed:', err); }
    setDeleteTarget(null);
  });

  // Show all skills: official + personal
  const filtered = skills
    .map(s => ({
      ...s,
      isOfficial: s.visibility === 'official' || s.isDefault,
      isPersonal: s.visibility === 'private' || s.visibility === 'custom',
      updatedAt: s.updatedAt || (s.isDefault ? '2026-04-09' : new Date().toISOString()),
    }))
    .filter(s => {
      // Apply type filter
      if (filterType === 'private' && !s.isPersonal) return false;
      if (filterType === 'official' && !s.isOfficial) return false;
      // Apply search
      if (search) {
        const q = search.toLowerCase();
        return s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q);
      }
      return true;
    });

  return (
    <div className="w-full h-full bg-gradient-to-br from-orange-50/60 via-white to-amber-50/40 flex flex-col">
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept=".md,.txt" multiple onChange={handleFileUpload} className="hidden" />

      {/* Upload error */}
      {uploadError && (
        <div className="mx-8 mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg flex items-center justify-between">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="text-red-400 hover:text-red-600"><X size={14} /></button>
        </div>
      )}

      {/* Header — compact dark bar (hidden when embedded in settings) */}
      {/* Header — compact dark bar */}
      <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 shrink-0">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(249,115,22,0.15),transparent_60%)]" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-orange-500/10 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        </div>
        <div className="relative flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-extrabold text-white tracking-tight">Skills</h1>
            <p className="text-xs text-slate-400 mt-0.5">Prepackaged and repeatable best practices & tools for your agents</p>
          </div>
          <div className="relative">
            <button
              onClick={() => setAddDropdownOpen(!addDropdownOpen)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 transition-all shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50"
            >
              <Plus size={13} />
              Add
            </button>
            <AddDropdown
              open={addDropdownOpen}
              onClose={() => setAddDropdownOpen(false)}
              onSelect={handleAddSelect}
            />
          </div>
        </div>
      </div>

      {/* Search + Filter tabs — light background */}
      <div className="px-6 py-3 bg-white/80 backdrop-blur-sm border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-orange-400/60" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search skills..."
              className="w-full pl-9 pr-3 py-2 text-[12px] rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-300 placeholder:text-slate-300"
            />
          </div>
          <div className="flex rounded-xl border border-slate-200/80 bg-white/80 backdrop-blur-sm overflow-hidden">
            {[
              { value: 'all', label: 'All Skills' },
              { value: 'official', label: 'Official' },
              { value: 'private', label: 'Custom' },
            ].map(tab => (
              <button key={tab.value} onClick={() => setFilterType(tab.value)}
                className={`px-3 py-1.5 text-[11px] font-semibold transition-all ${filterType === tab.value ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-sm' : 'text-slate-500 hover:text-orange-600'}`}>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* Skill Cards Grid */}
      <div className="flex-1 overflow-y-auto px-6 py-6">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
              <Sparkles size={24} className="text-slate-300" />
            </div>
            <p className="text-sm font-medium text-slate-500">
              {search ? 'No skills found' : 'No custom skills yet'}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {search ? 'Try adjusting your search' : 'Click "+ Add" to create or import your first skill'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(skill => (
              <SkillCard
                key={skill.id}
                skill={skill}
                isActive={!!activeToggles[skill.id]}
                onToggle={handleToggle}
                onMenuAction={handleMenuAction}
                onView={setViewingSkill}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirm */}
      {deleteTarget && (
        <DeleteConfirm
          skill={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Skill Detail View */}
      {viewingSkill && (
        <SkillDetailView
          skill={viewingSkill}
          onClose={() => setViewingSkill(null)}
          onTrySkill={(s) => { setViewingSkill(null); onTrySkill?.(s); }}
          onDownload={(s) => handleMenuAction('download', s)}
        />
      )}
    </div>
  );
};
