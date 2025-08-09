import React, { useState, useEffect, createContext, useContext } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from "react-router-dom";
import axios from "axios";
import { 
  CalendarIcon, 
  RectangleStackIcon, 
  PlusIcon,
  UserIcon,
  ChartBarIcon,
  Cog6ToothIcon,
  MoonIcon,
  SunIcon,
  HomeIcon
} from "@heroicons/react/24/outline";
import { 
  CheckIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  FireIcon
} from "@heroicons/react/24/solid";
import toast, { Toaster } from "react-hot-toast";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // You could verify token here
    }
    setLoading(false);
  }, [token]);

  const login = (token) => {
    localStorage.setItem('token', token);
    setToken(token);
    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common['Authorization'];
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

// Theme Context
const ThemeContext = createContext();

const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(false);

  const toggleTheme = () => setIsDark(!isDark);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      <div className={isDark ? 'dark' : ''}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

const useTheme = () => useContext(ThemeContext);

// Components
const Navigation = () => {
  const location = useLocation();
  const { logout } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const navItems = [
    { path: '/dashboard', icon: HomeIcon, label: 'Dashboard' },
    { path: '/tasks', icon: RectangleStackIcon, label: 'Tasks' },
    { path: '/projects', icon: ChartBarIcon, label: 'Projects' },
    { path: '/calendar', icon: CalendarIcon, label: 'Calendar' },
  ];

  return (
    <nav className="bg-white shadow-sm border-r border-gray-200 w-64 min-h-screen">
      <div className="p-6">
        <div className="flex items-center space-x-3 mb-8">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">Z</span>
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            ZenDo
          </h1>
        </div>

        <div className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  isActive 
                    ? 'nav-item-active bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg transform scale-105' 
                    : 'nav-item-inactive text-gray-600 hover:bg-purple-50 hover:text-purple-600'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <div className="mt-8 pt-8 border-t border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={toggleTheme}
              className="flex items-center space-x-2 text-gray-600 hover:text-purple-600 transition-colors"
            >
              {isDark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
              <span className="text-sm">{isDark ? 'Light' : 'Dark'}</span>
            </button>
          </div>
          
          <button
            onClick={logout}
            className="flex items-center space-x-2 text-gray-600 hover:text-red-600 transition-colors w-full"
          >
            <UserIcon className="w-5 h-5" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </div>
    </nav>
  );
};

const StatsCard = ({ title, value, icon: Icon, color, trend }) => (
  <div className={`stats-card ${color} p-6 rounded-2xl transform hover:-translate-y-2 transition-all duration-300 shadow-lg hover:shadow-xl`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-white/80 text-sm font-medium">{title}</p>
        <p className="text-3xl font-bold text-white mt-1">{value}</p>
        {trend && (
          <p className="text-white/60 text-xs mt-2">{trend}</p>
        )}
      </div>
      <div className="bg-white/20 p-3 rounded-xl">
        <Icon className="w-8 h-8 text-white" />
      </div>
    </div>
  </div>
);

const TaskCard = ({ task, onEdit, onDelete, onStatusChange }) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckIcon className="w-4 h-4 text-green-600" />;
      case 'in_progress': return <ClockIcon className="w-4 h-4 text-yellow-600" />;
      default: return <ExclamationTriangleIcon className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
      <div className="flex items-start justify-between mb-4">
        <h3 className="font-semibold text-gray-900 text-lg">{task.title}</h3>
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </span>
          {getStatusIcon(task.status)}
        </div>
      </div>
      
      {task.description && (
        <p className="text-gray-600 mb-4 text-sm">{task.description}</p>
      )}
      
      <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
        <span>{new Date(task.start_time).toLocaleString()}</span>
        <span>→</span>
        <span>{new Date(task.end_time).toLocaleString()}</span>
      </div>

      <div className="flex items-center space-x-2">
        <select
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value)}
          className="text-xs border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500"
        >
          <option value="todo">To Do</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
        </select>
        
        <button
          onClick={() => onEdit(task)}
          className="text-purple-600 hover:text-purple-700 text-xs font-medium"
        >
          Edit
        </button>
        
        <button
          onClick={() => onDelete(task.id)}
          className="text-red-600 hover:text-red-700 text-xs font-medium"
        >
          Delete
        </button>
      </div>
    </div>
  );
};

const TaskModal = ({ isOpen, onClose, task, onSave }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    priority: 'medium',
    status: 'todo'
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        start_time: task.start_time ? new Date(task.start_time).toISOString().slice(0, 16) : '',
        end_time: task.end_time ? new Date(task.end_time).toISOString().slice(0, 16) : '',
        priority: task.priority || 'medium',
        status: task.status || 'todo'
      });
    } else {
      setFormData({
        title: '',
        description: '',
        start_time: '',
        end_time: '',
        priority: 'medium',
        status: 'todo'
      });
    }
  }, [task]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const taskData = {
        ...formData,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString()
      };

      if (task) {
        await axios.put(`${API}/tasks/${task.id}`, taskData);
        toast.success('Task updated successfully!');
      } else {
        await axios.post(`${API}/tasks`, taskData);
        toast.success('Task created successfully!');
      }
      
      onSave();
      onClose();
    } catch (error) {
      toast.error('Failed to save task');
      console.error(error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          {task ? 'Edit Task' : 'Create New Task'}
        </h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 h-24"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
              <input
                type="datetime-local"
                required
                value={formData.start_time}
                onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
              <input
                type="datetime-local"
                required
                value={formData.end_time}
                onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          
          <div className="flex items-center space-x-4 pt-4">
            <button
              type="submit"
              className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              {task ? 'Update Task' : 'Create Task'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-600 hover:text-gray-700 px-6 py-3 font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Pages
const LoginPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isLogin ? '/login' : '/register';
      const data = isLogin 
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await axios.post(`${API}${endpoint}`, data);
      login(response.data.access_token);
      toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Authentication failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">Z</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            ZenDo
          </h1>
          <p className="text-gray-600 mt-2">Your personal taskflow manager</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {!isLogin && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                type="text"
                required={!isLogin}
                value={formData.username}
                onChange={(e) => setFormData({...formData, username: e.target.value})}
                className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              required
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-3 rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="text-center mt-6">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-purple-600 hover:text-purple-700 text-sm font-medium"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [stats, setStats] = useState({
    total_tasks: 0,
    completed_tasks: 0,
    pending_tasks: 0,
    total_projects: 0,
    today_tasks: 0
  });
  const [recentTasks, setRecentTasks] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, tasksRes] = await Promise.all([
        axios.get(`${API}/dashboard/stats`),
        axios.get(`${API}/tasks`)
      ]);
      setStats(statsRes.data);
      setRecentTasks(tasksRes.data.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    }
  };

  const handleStatusChange = async (taskId, status) => {
    try {
      await axios.put(`${API}/tasks/${taskId}`, { status });
      fetchDashboardData();
      toast.success('Task status updated!');
    } catch (error) {
      toast.error('Failed to update task status');
    }
  };

  return (
    <div className="p-8 bg-gradient-to-br from-purple-50 via-white to-indigo-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to ZenDo</h1>
          <p className="text-gray-600">Here's an overview of your productivity today</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <StatsCard
            title="Total Tasks"
            value={stats.total_tasks}
            icon={RectangleStackIcon}
            color="stats-card-total bg-gradient-to-br from-blue-500 to-cyan-600"
          />
          <StatsCard
            title="Completed"
            value={stats.completed_tasks}
            icon={CheckIcon}
            color="stats-card-completed bg-gradient-to-br from-green-500 to-emerald-600"
          />
          <StatsCard
            title="Pending"
            value={stats.pending_tasks}
            icon={ClockIcon}
            color="stats-card-pending bg-gradient-to-br from-yellow-500 to-orange-600"
          />
          <StatsCard
            title="Projects"
            value={stats.total_projects}
            icon={ChartBarIcon}
            color="stats-card-projects bg-gradient-to-br from-purple-500 to-indigo-600"
          />
          <StatsCard
            title="Today's Tasks"
            value={stats.today_tasks}
            icon={FireIcon}
            color="stats-card-today bg-gradient-to-br from-red-500 to-pink-600"
          />
        </div>

        {recentTasks.length > 0 && (
          <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Tasks</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={handleStatusChange}
                  onEdit={() => {}}
                  onDelete={() => {}}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const TasksPage = () => {
  const [tasks, setTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API}/tasks`);
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  };

  const handleStatusChange = async (taskId, status) => {
    try {
      await axios.put(`${API}/tasks/${taskId}`, { status });
      fetchTasks();
      toast.success('Task status updated!');
    } catch (error) {
      toast.error('Failed to update task status');
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleDelete = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await axios.delete(`${API}/tasks/${taskId}`);
        fetchTasks();
        toast.success('Task deleted successfully!');
      } catch (error) {
        toast.error('Failed to delete task');
      }
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  return (
    <div className="p-8 bg-gradient-to-br from-purple-50 via-white to-indigo-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Tasks</h1>
            <p className="text-gray-600">Manage your personal tasks and stay organized</p>
          </div>
          <button
            onClick={() => {
              setEditingTask(null);
              setIsModalOpen(true);
            }}
            className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-2"
          >
            <PlusIcon className="w-5 h-5" />
            <span>New Task</span>
          </button>
        </div>

        <div className="flex items-center space-x-4 mb-8">
          <span className="text-gray-700 font-medium">Filter:</span>
          {[
            { key: 'all', label: 'All Tasks' },
            { key: 'todo', label: 'To Do' },
            { key: 'in_progress', label: 'In Progress' },
            { key: 'completed', label: 'Completed' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                filter === key
                  ? 'bg-purple-500 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-purple-50 hover:text-purple-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>

        {filteredTasks.length === 0 && (
          <div className="text-center py-16">
            <RectangleStackIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-500 mb-2">No tasks found</h3>
            <p className="text-gray-400">Create your first task to get started!</p>
          </div>
        )}

        <TaskModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTask(null);
          }}
          task={editingTask}
          onSave={fetchTasks}
        />
      </div>
    </div>
  );
};

const ProjectsPage = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectTasks, setProjectTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchProjectTasks(selectedProject.id);
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const response = await axios.get(`${API}/projects`);
      setProjects(response.data);
      if (response.data.length > 0 && !selectedProject) {
        setSelectedProject(response.data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  };

  const fetchProjectTasks = async (projectId) => {
    try {
      const response = await axios.get(`${API}/tasks?project_id=${projectId}`);
      setProjectTasks(response.data);
    } catch (error) {
      console.error('Failed to fetch project tasks:', error);
    }
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newStatus = destination.droppableId;

    try {
      await axios.put(`${API}/tasks/${draggableId}`, { status: newStatus });
      fetchProjectTasks(selectedProject.id);
      toast.success('Task status updated!');
    } catch (error) {
      toast.error('Failed to update task status');
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const handleDelete = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      try {
        await axios.delete(`${API}/tasks/${taskId}`);
        fetchProjectTasks(selectedProject.id);
        toast.success('Task deleted successfully!');
      } catch (error) {
        toast.error('Failed to delete task');
      }
    }
  };

  const tasksByStatus = {
    todo: projectTasks.filter(task => task.status === 'todo'),
    in_progress: projectTasks.filter(task => task.status === 'in_progress'),
    completed: projectTasks.filter(task => task.status === 'completed')
  };

  return (
    <div className="p-8 bg-gradient-to-br from-purple-50 via-white to-indigo-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Projects</h1>
            <p className="text-gray-600">Manage your project tasks with Kanban boards</p>
          </div>
          <button
            onClick={() => {
              setEditingTask({ project_id: selectedProject?.id });
              setIsModalOpen(true);
            }}
            disabled={!selectedProject}
            className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center space-x-2 disabled:opacity-50"
          >
            <PlusIcon className="w-5 h-5" />
            <span>New Task</span>
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="text-center py-16">
            <ChartBarIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-500 mb-2">No projects found</h3>
            <p className="text-gray-400">Create your first project to get started!</p>
          </div>
        ) : (
          <>
            <div className="flex items-center space-x-4 mb-8">
              <span className="text-gray-700 font-medium">Projects:</span>
              {projects.map(project => (
                <button
                  key={project.id}
                  onClick={() => setSelectedProject(project)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 ${
                    selectedProject?.id === project.id
                      ? 'bg-purple-500 text-white shadow-lg'
                      : 'bg-white text-gray-600 hover:bg-purple-50 hover:text-purple-600'
                  }`}
                >
                  {project.name}
                </button>
              ))}
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { key: 'todo', title: 'To Do', color: 'bg-gray-100' },
                  { key: 'in_progress', title: 'In Progress', color: 'bg-yellow-100' },
                  { key: 'completed', title: 'Completed', color: 'bg-green-100' }
                ].map(column => (
                  <div key={column.key} className={`${column.color} rounded-2xl p-6`}>
                    <h3 className="font-semibold text-gray-900 mb-4 flex items-center justify-between">
                      {column.title}
                      <span className="bg-white text-gray-600 text-sm px-2 py-1 rounded-full">
                        {tasksByStatus[column.key].length}
                      </span>
                    </h3>
                    
                    <Droppable droppableId={column.key}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="space-y-4 min-h-96"
                        >
                          {tasksByStatus[column.key].map((task, index) => (
                            <Draggable
                              key={task.id}
                              draggableId={task.id}
                              index={index}
                            >
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                >
                                  <TaskCard
                                    task={task}
                                    onEdit={handleEdit}
                                    onDelete={handleDelete}
                                    onStatusChange={() => {}}
                                  />
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                ))}
              </div>
            </DragDropContext>
          </>
        )}

        <TaskModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTask(null);
          }}
          task={editingTask}
          onSave={() => fetchProjectTasks(selectedProject.id)}
        />
      </div>
    </div>
  );
};

const CalendarPage = () => {
  const [tasks, setTasks] = useState([]);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await axios.get(`${API}/tasks`);
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  };

  const events = tasks.map(task => ({
    id: task.id,
    title: task.title,
    start: task.start_time,
    end: task.end_time,
    backgroundColor: task.status === 'completed' ? '#10B981' : 
                     task.status === 'in_progress' ? '#F59E0B' : '#8B5CF6',
    borderColor: task.status === 'completed' ? '#10B981' : 
                 task.status === 'in_progress' ? '#F59E0B' : '#8B5CF6'
  }));

  return (
    <div className="p-8 bg-gradient-to-br from-purple-50 via-white to-indigo-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Calendar</h1>
          <p className="text-gray-600">View and manage your tasks in calendar format</p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-200">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            events={events}
            editable={true}
            selectable={true}
            height="700px"
            eventClick={(info) => {
              const task = tasks.find(t => t.id === info.event.id);
              if (task) {
                toast.success(`Task: ${task.title}\nStatus: ${task.status}`);
              }
            }}
          />
        </div>
      </div>
    </div>
  );
};

// Layout component
const Layout = ({ children }) => (
  <div className="flex">
    <Navigation />
    <div className="flex-1">
      {children}
    </div>
  </div>
);

// Main App component
function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <div className="App">
            <AppRoutes />
            <Toaster position="top-right" />
          </div>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

const AppRoutes = () => {
  const { token, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center animate-pulse">
          <span className="text-white font-bold text-2xl">Z</span>
        </div>
      </div>
    );
  }

  if (!token) {
    return <LoginPage />;
  }

  return (
    <Routes>
      <Route path="/dashboard" element={<Layout><Dashboard /></Layout>} />
      <Route path="/tasks" element={<Layout><TasksPage /></Layout>} />
      <Route path="/projects" element={<Layout><ProjectsPage /></Layout>} />
      <Route path="/calendar" element={<Layout><CalendarPage /></Layout>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;