import { useState, useCallback } from 'react';

const STORAGE_KEY = 'aam_projects';

const load = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
};
const save = (projects) => localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));

export const useProjects = () => {
  const [projects, setProjects] = useState(load);

  const persist = (updater) => {
    setProjects(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      save(next);
      return next;
    });
  };

  const createProject = useCallback((name) => {
    const project = {
      id: `proj_${Date.now()}`,
      name,
      description: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      tasks: [],       // { id, title, completed, createdAt }
      instructions: '', // custom instructions text
      files: [],        // { id, name, type, size, createdAt }
      skillIds: [],     // linked skill IDs
      connectors: [],   // { id, type, name, config }
    };
    persist(prev => [project, ...prev]);
    return project;
  }, []);

  const updateProject = useCallback((projectId, updates) => {
    persist(prev => prev.map(p =>
      p.id === projectId ? { ...p, ...updates, updatedAt: Date.now() } : p
    ));
  }, []);

  const deleteProject = useCallback((projectId) => {
    persist(prev => prev.filter(p => p.id !== projectId));
  }, []);

  // Task operations within a project
  const addTask = useCallback((projectId, title) => {
    const task = { id: `task_${Date.now()}`, title, completed: false, createdAt: Date.now() };
    persist(prev => prev.map(p =>
      p.id === projectId ? { ...p, tasks: [...p.tasks, task], updatedAt: Date.now() } : p
    ));
    return task;
  }, []);

  const toggleTask = useCallback((projectId, taskId) => {
    persist(prev => prev.map(p =>
      p.id === projectId ? {
        ...p,
        tasks: p.tasks.map(t => t.id === taskId ? { ...t, completed: !t.completed } : t),
        updatedAt: Date.now(),
      } : p
    ));
  }, []);

  const deleteTask = useCallback((projectId, taskId) => {
    persist(prev => prev.map(p =>
      p.id === projectId ? {
        ...p,
        tasks: p.tasks.filter(t => t.id !== taskId),
        updatedAt: Date.now(),
      } : p
    ));
  }, []);

  const updateInstructions = useCallback((projectId, instructions) => {
    persist(prev => prev.map(p =>
      p.id === projectId ? { ...p, instructions, updatedAt: Date.now() } : p
    ));
  }, []);

  const addFile = useCallback((projectId, file) => {
    const f = { id: `file_${Date.now()}`, name: file.name, type: file.type, size: file.size, createdAt: Date.now() };
    persist(prev => prev.map(p =>
      p.id === projectId ? { ...p, files: [...p.files, f], updatedAt: Date.now() } : p
    ));
    return f;
  }, []);

  const deleteFile = useCallback((projectId, fileId) => {
    persist(prev => prev.map(p =>
      p.id === projectId ? {
        ...p,
        files: p.files.filter(f => f.id !== fileId),
        updatedAt: Date.now(),
      } : p
    ));
  }, []);

  const toggleSkill = useCallback((projectId, skillId) => {
    persist(prev => prev.map(p => {
      if (p.id !== projectId) return p;
      const has = p.skillIds.includes(skillId);
      return { ...p, skillIds: has ? p.skillIds.filter(s => s !== skillId) : [...p.skillIds, skillId], updatedAt: Date.now() };
    }));
  }, []);

  const addConnector = useCallback((projectId, connector) => {
    // connector: { type: 'meta', accountId, accountName, businessId, businessName }
    const c = { id: `conn_${Date.now()}`, ...connector };
    persist(prev => prev.map(p =>
      p.id === projectId ? { ...p, connectors: [...(p.connectors || []), c], updatedAt: Date.now() } : p
    ));
    return c;
  }, []);

  const removeConnector = useCallback((projectId, connectorId) => {
    persist(prev => prev.map(p =>
      p.id === projectId ? { ...p, connectors: (p.connectors || []).filter(c => c.id !== connectorId), updatedAt: Date.now() } : p
    ));
  }, []);

  return {
    projects,
    createProject,
    updateProject,
    deleteProject,
    addTask,
    toggleTask,
    deleteTask,
    updateInstructions,
    addFile,
    deleteFile,
    toggleSkill,
    addConnector,
    removeConnector,
  };
};
