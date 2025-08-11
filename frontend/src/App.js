import React, { useState, useEffect, createContext, useContext } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useSearchParams } from "react-router-dom";
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
  HomeIcon,
  BellIcon,
  MagnifyingGlassIcon,
  StarIcon,
  CreditCardIcon,
  ChatBubbleBottomCenterTextIcon,
  Bars3Icon,
  EyeIcon,
  EyeSlashIcon
} from "@heroicons/react/24/outline";
import { 
  CheckIcon, 
  ClockIcon, 
  ExclamationTriangleIcon,
  FireIcon,
  SparklesIcon,
  XMarkIcon
} from "@heroicons/react/24/solid";
import toast, { Toaster } from "react-hot-toast";
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import Fuse from 'fuse.js';

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
      fetchProfile();
    }
    setLoading(false);
  }, [token]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API}/profile`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
    }
  };

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

  const updateUser = (userData) => {
    setUser(prevUser => ({ ...prevUser, ...userData }));
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, loading, fetchProfile, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => useContext(AuthContext);

// Theme Context
const ThemeContext = createContext();

const ThemeProvider = ({ children }) => {
  const [isDark, setIsDark] = useState(localStorage.getItem('theme') === 'dark');

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem('theme', newTheme ? 'dark' : 'light');
  };

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
  const { logout, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();
    // Poll for notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await axios.get(`${API}/notifications`);
      setNotifications(response.data);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const navItems = [
    { path: '/dashboard', icon: HomeIcon, label: 'Dashboard' },
    { path: '/tasks', icon: RectangleStackIcon, label: 'Tasks' },
    { path: '/projects', icon: ChartBarIcon, label: 'Projects' },
    { path: '/calendar', icon: CalendarIcon, label: 'Calendar' },
    { path: '/search', icon: MagnifyingGlassIcon, label: 'Search' },
    // { path: '/slack', icon: ChatBubbleBottomCenterTextIcon, label: 'Slack' },
  ];

  return (
    <>
      {/* Top Navigation Bar */}
      <nav className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} shadow-sm border-b transition-colors duration-200 sticky top-0 z-50`}>
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">Z</span>
              </div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent hidden sm:block">
                ZenDo
              </h1>
              {user?.is_premium && (
                <SparklesIcon className="w-5 h-5 text-yellow-500 hidden sm:block" />
              )}
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                      isActive 
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg' 
                        : `${isDark ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'}`
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* Right side actions */}
            <div className="flex items-center space-x-4">
              {/* Notifications */}
              {notifications.length > 0 && (
                <div className="relative">
                  <BellIcon className="w-6 h-6 text-red-500" />
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {notifications.length}
                  </span>
                </div>
              )}

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className={`p-2 rounded-lg ${isDark ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'} transition-colors`}
              >
                {isDark ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
              </button>

              {/* User Menu */}
              <div className="relative">
                <div className={`flex items-center space-x-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  <div className="hidden sm:block text-right">
                    <div className="text-sm font-medium">{user?.username}</div>
                    {user?.is_premium && (
                      <div className="text-xs text-yellow-600 font-medium">Premium</div>
                    )}
                  </div>
                  <button
                    onClick={logout}
                    className={`p-2 rounded-lg ${isDark ? 'text-gray-300 hover:bg-gray-700 hover:text-red-400' : 'text-gray-600 hover:bg-purple-50 hover:text-red-600'} transition-colors`}
                  >
                    <UserIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-purple-50 hover:text-purple-600 transition-colors"
              >
                {isMobileMenuOpen ? <XMarkIcon className="w-6 h-6" /> : <Bars3Icon className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className={`md:hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-t`}>
            <div className="px-2 pt-2 pb-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${
                      isActive 
                        ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg' 
                        : `${isDark ? 'text-gray-300 hover:bg-gray-700 hover:text-white' : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'}`
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </Link>
                );
              })}
              
              {/* Mobile user info */}
              <div className={`px-3 py-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                <div className="text-sm font-medium">{user?.username}</div>
                {user?.is_premium && (
                  <div className="text-xs text-yellow-600 font-medium">Premium User</div>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>
    </>
  );
};

const StatsCard = ({ title, value, icon: Icon, color, trend, isDark }) => (
  <div className={`stats-card ${color} p-3 sm:p-6 rounded-xl sm:rounded-2xl transform hover:-translate-y-2 transition-all duration-300 shadow-lg hover:shadow-xl`}>
    <div className="flex items-center justify-between">
      <div>
        <p className="text-white/80 text-xs sm:text-sm font-medium">{title}</p>
        <p className="text-lg sm:text-3xl font-bold text-white mt-1">{value}</p>
        {trend && (
          <p className="text-white/60 text-xs mt-2">{trend}</p>
        )}
      </div>
      <div className="bg-white/20 p-2 sm:p-3 rounded-lg sm:rounded-xl">
        <Icon className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
      </div>
    </div>
  </div>
);

const TaskCard = ({ task, onEdit, onDelete, onStatusChange, isDark }) => {
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return isDark ? 'text-gray-300 bg-gray-700' : 'text-gray-600 bg-gray-50';
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
    <div className={`${isDark ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-white border-gray-200 hover:bg-gray-50'} rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border transition-all duration-300 transform hover:-translate-y-1`}>
      <div className="flex items-start justify-between mb-3 sm:mb-4">
        <h3 className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} text-base sm:text-lg`}>{task.title}</h3>
        <div className="flex items-center space-x-1 sm:space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
            {task.priority}
          </span>
          {getStatusIcon(task.status)}
        </div>
      </div>
      
      {task.description && (
        <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mb-3 sm:mb-4 text-sm`}>{task.description}</p>
      )}

      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3 sm:mb-4">
          {task.tags.map((tag, index) => (
            <span key={index} className={`px-2 py-1 rounded-full text-xs ${isDark ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-600'}`}>
              #{tag}
            </span>
          ))}
        </div>
      )}
      
      <div className={`flex items-center justify-between text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-3 sm:mb-4`}>
        <span className="hidden sm:block">{new Date(task.start_time).toLocaleString()}</span>
        <span className="sm:hidden">{new Date(task.start_time).toLocaleDateString()}</span>
        <span className="hidden sm:block">→</span>
        <span className="hidden sm:block">{new Date(task.end_time).toLocaleString()}</span>
        <span className="sm:hidden">{new Date(task.end_time).toLocaleDateString()}</span>
      </div>

      <div className="flex items-center space-x-1 sm:space-x-2">
        <select
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value)}
          className={`text-xs border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-900'} rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-purple-500`}
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

const TaskModal = ({ isOpen, onClose, task, onSave, isDark }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    priority: 'medium',
    status: 'todo',
    tags: '',
    recurring_pattern: ''
  });

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        start_time: task.start_time ? new Date(task.start_time).toISOString().slice(0, 16) : '',
        end_time: task.end_time ? new Date(task.end_time).toISOString().slice(0, 16) : '',
        priority: task.priority || 'medium',
        status: task.status || 'todo',
        tags: task.tags ? task.tags.join(', ') : '',
        recurring_pattern: task.recurring_pattern || ''
      });
    } else {
      setFormData({
        title: '',
        description: '',
        start_time: '',
        end_time: '',
        priority: 'medium',
        status: 'todo',
        tags: '',
        recurring_pattern: ''
      });
    }
  }, [task]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const taskData = {
        ...formData,
        start_time: new Date(formData.start_time).toISOString(),
        end_time: new Date(formData.end_time).toISOString(),
        tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0),
        recurring_pattern: formData.recurring_pattern || null
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
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            {task ? 'Edit Task' : 'Create New Task'}
          </h2>
          <button
            onClick={onClose}
            className={`${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} transition-colors`}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'} mb-2`}>Title</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className={`w-full border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500`}
            />
          </div>
          
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'} mb-2`}>Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className={`w-full border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 h-24`}
            />
          </div>
          
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'} mb-2`}>Tags (comma separated)</label>
            <input
              type="text"
              value={formData.tags}
              onChange={(e) => setFormData({...formData, tags: e.target.value})}
              placeholder="work, urgent, meeting"
              className={`w-full border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500`}
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'} mb-2`}>Start Time</label>
              <input
                type="datetime-local"
                required
                value={formData.start_time}
                onChange={(e) => setFormData({...formData, start_time: e.target.value})}
                className={`w-full border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500`}
              />
            </div>
            
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'} mb-2`}>End Time</label>
              <input
                type="datetime-local"
                required
                value={formData.end_time}
                onChange={(e) => setFormData({...formData, end_time: e.target.value})}
                className={`w-full border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500`}
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'} mb-2`}>Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({...formData, priority: e.target.value})}
                className={`w-full border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500`}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'} mb-2`}>Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({...formData, status: e.target.value})}
                className={`w-full border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500`}
              >
                <option value="todo">To Do</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>

          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'} mb-2`}>Recurring Pattern (Cron)</label>
            <select
              value={formData.recurring_pattern}
              onChange={(e) => setFormData({...formData, recurring_pattern: e.target.value})}
              className={`w-full border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500`}
            >
              <option value="">None</option>
              <option value="0 9 * * *">Daily at 9:00 AM</option>
              <option value="0 9 * * 1">Weekly on Monday at 9:00 AM</option>
              <option value="0 9 1 * *">Monthly on 1st at 9:00 AM</option>
            </select>
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
              className={`${isDark ? 'text-gray-300 hover:text-gray-100' : 'text-gray-600 hover:text-gray-700'} px-6 py-3 font-medium transition-colors`}
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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: ''
  });
  const { login } = useAuth();
  const { isDark } = useTheme();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const endpoint = isLogin ? '/login' : '/register';
      const data = isLogin 
        ? { email: formData.email, password: formData.password }
        : formData;

      const response = await axios.post(`${API}${endpoint}`, data);
      login(response.data.access_token);
      toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!');
    } catch (error) {
      setError(error.response?.data?.detail || 'Authentication failed');
    }
  };

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 via-white to-indigo-50'} flex items-center justify-center transition-colors duration-200 p-4`}>
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} p-6 sm:p-8 rounded-xl sm:rounded-2xl shadow-2xl w-full max-w-md`}>
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-xl sm:text-2xl">Z</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
            ZenDo
          </h1>
          <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mt-2 text-sm sm:text-base`}>Your personal taskflow manager</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          {!isLogin && (
            <div>
              <label className={`block text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'} mb-2`}>Username</label>
              <input
                type="text"
                required={!isLogin}
                value={formData.username}
                onChange={(e) => {
                  setFormData({...formData, username: e.target.value});
                  setError('');
                }}
                className={`w-full border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} rounded-lg sm:rounded-xl px-3 sm:px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 text-base`}
              />
            </div>
          )}
          
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'} mb-2`}>Email</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => {
                setFormData({...formData, email: e.target.value});
                setError('');
              }}
              className={`w-full border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} rounded-lg sm:rounded-xl px-3 sm:px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 text-base`}
            />
          </div>
          
          <div>
            <label className={`block text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'} mb-2`}>Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={formData.password}
                onChange={(e) => {
                  setFormData({...formData, password: e.target.value});
                  setError('');
                }}
                className={`w-full border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} rounded-lg sm:rounded-xl px-3 sm:px-4 py-3 pr-10 focus:outline-none focus:ring-2 focus:ring-purple-500 text-base`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-sm leading-5"
              >
                {showPassword ? (
                  <EyeSlashIcon className={`h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                ) : (
                  <EyeIcon className={`h-5 w-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} />
                )}
              </button>
            </div>
          </div>
          
          <button
            type="submit"
            className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-3 rounded-lg sm:rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-lg text-base"
          >
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
          {error && (
            <p className="text-red-500 text-sm text-center pt-2">{error}</p>
          )}
        </form>

        <div className="text-center mt-6">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError('');
            }}
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
  const { isDark } = useTheme();
  const [stats, setStats] = useState({
    total_tasks: 0,
    completed_tasks: 0,
    pending_tasks: 0,
    total_projects: 0,
    today_tasks: 0,
    upcoming_tasks: 0,
    is_premium: false
  });
  const [recentTasks, setRecentTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

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
    <div className={`p-4 sm:p-6 lg:p-8 ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 via-white to-indigo-50'} min-h-screen transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 space-y-4 sm:space-y-0">
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>Welcome to ZenDo</h1>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Here's an overview of your productivity today</p>
          </div>
          <button
            onClick={() => {
              setEditingTask(null);
              setIsModalOpen(true);
            }}
            className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 sm:px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2"
          >
            <PlusIcon className="w-5 h-5" />
            <span>New Task</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-6 mb-6 sm:mb-8">
          <StatsCard
            title="Total Tasks"
            value={stats.total_tasks}
            icon={RectangleStackIcon}
            color="stats-card-total bg-gradient-to-br from-blue-500 to-cyan-600"
            isDark={isDark}
          />
          <StatsCard
            title="Completed"
            value={stats.completed_tasks}
            icon={CheckIcon}
            color="stats-card-completed bg-gradient-to-br from-green-500 to-emerald-600"
            isDark={isDark}
          />
          <StatsCard
            title="Pending"
            value={stats.pending_tasks}
            icon={ClockIcon}
            color="stats-card-pending bg-gradient-to-br from-yellow-500 to-orange-600"
            isDark={isDark}
          />
          <StatsCard
            title="Projects"
            value={stats.total_projects}
            icon={ChartBarIcon}
            color="stats-card-projects bg-gradient-to-br from-purple-500 to-indigo-600"
            isDark={isDark}
          />
          <StatsCard
            title="Today's Tasks"
            value={stats.today_tasks}
            icon={FireIcon}
            color="stats-card-today bg-gradient-to-br from-red-500 to-pink-600"
            isDark={isDark}
          />
          <StatsCard
            title="Upcoming"
            value={stats.upcoming_tasks}
            icon={BellIcon}
            color="stats-card-upcoming bg-gradient-to-br from-indigo-500 to-purple-600"
            isDark={isDark}
          />
        </div>

        {recentTasks.length > 0 && (
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl p-8 shadow-lg border transition-colors duration-200`}>
            <h2 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-6`}>Recent Tasks</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentTasks.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onStatusChange={handleStatusChange}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  isDark={isDark}
                />
              ))}
            </div>
          </div>
        )}

        <TaskModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTask(null);
          }}
          task={editingTask}
          onSave={fetchDashboardData}
          isDark={isDark}
        />
      </div>
    </div>
  );
};

const TasksPage = () => {
  const { isDark } = useTheme();
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

  const handleGenerateRecurring = async (taskId) => {
    try {
      await axios.post(`${API}/tasks/${taskId}/generate-recurring`);
      fetchTasks();
      toast.success('Recurring tasks generated!');
    } catch (error) {
      toast.error('Failed to generate recurring tasks');
    }
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === 'all') return true;
    return task.status === filter;
  });

  return (
    <div className={`p-4 sm:p-6 lg:p-8 ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 via-white to-indigo-50'} min-h-screen transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 space-y-4 sm:space-y-0">
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>Tasks</h1>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Manage your personal tasks and stay organized</p>
          </div>
          <button
            onClick={() => {
              setEditingTask(null);
              setIsModalOpen(true);
            }}
            className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 sm:px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2"
          >
            <PlusIcon className="w-5 h-5" />
            <span>New Task</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mb-6 sm:mb-8">
          <span className={`${isDark ? 'text-gray-200' : 'text-gray-700'} font-medium`}>Filter:</span>
          {[
            { key: 'all', label: 'All Tasks' },
            { key: 'todo', label: 'To Do' },
            { key: 'in_progress', label: 'In Progress' },
            { key: 'completed', label: 'Completed' }
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 sm:px-4 py-2 rounded-lg sm:rounded-xl font-medium transition-all duration-200 text-sm sm:text-base ${
                filter === key
                  ? 'bg-purple-500 text-white shadow-lg'
                  : `${isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-purple-50 hover:text-purple-600'}`
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {filteredTasks.map(task => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onStatusChange={handleStatusChange}
              isDark={isDark}
            />
          ))}
        </div>

        {filteredTasks.length === 0 && (
          <div className="text-center py-16">
            <RectangleStackIcon className={`w-16 h-16 ${isDark ? 'text-gray-600' : 'text-gray-300'} mx-auto mb-4`} />
            <h3 className={`text-xl font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-2`}>No tasks found</h3>
            <p className={`${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Create your first task to get started!</p>
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
          isDark={isDark}
        />
      </div>
    </div>
  );
};

const SearchPage = () => {
  const { isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    tags: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    
    try {
      const searchFilters = {
        query: searchQuery,
        status: filters.status || null,
        priority: filters.priority || null,
        tags: filters.tags ? filters.tags.split(',').map(t => t.trim()) : null
      };

      const response = await axios.post(`${API}/tasks/search`, searchFilters);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Search failed:', error);
      toast.error('Search failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async (taskId, status) => {
    try {
      await axios.put(`${API}/tasks/${taskId}`, { status });
      handleSearch(); // Refresh search results
      toast.success('Task status updated!');
    } catch (error) {
      toast.error('Failed to update task status');
    }
  };

  return (
    <div className={`p-4 sm:p-6 lg:p-8 ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 via-white to-indigo-50'} min-h-screen transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 sm:mb-8">
          <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>Search Tasks</h1>
          <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Find your tasks quickly with advanced search and filters</p>
        </div>

        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl p-6 shadow-lg border mb-8`}>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search tasks by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className={`w-full pl-10 pr-4 py-3 border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500`}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'} mb-2`}>Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({...filters, status: e.target.value})}
                  className={`w-full border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500`}
                >
                  <option value="">All Status</option>
                  <option value="todo">To Do</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'} mb-2`}>Priority</label>
                <select
                  value={filters.priority}
                  onChange={(e) => setFilters({...filters, priority: e.target.value})}
                  className={`w-full border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500`}
                >
                  <option value="">All Priorities</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>

              <div>
                <label className={`block text-sm font-medium ${isDark ? 'text-gray-200' : 'text-gray-700'} mb-2`}>Tags</label>
                <input
                  type="text"
                  placeholder="work, urgent"
                  value={filters.tags}
                  onChange={(e) => setFilters({...filters, tags: e.target.value})}
                  className={`w-full border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500`}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50"
            >
              {isLoading ? 'Searching...' : 'Search Tasks'}
            </button>
          </form>
        </div>

        {searchResults.length > 0 && (
          <div>
            <h2 className={`text-xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-6`}>
              Search Results ({searchResults.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {searchResults.map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  onStatusChange={handleStatusChange}
                  isDark={isDark}
                />
              ))}
            </div>
          </div>
        )}

        {searchResults.length === 0 && searchQuery && !isLoading && (
          <div className="text-center py-16">
            <MagnifyingGlassIcon className={`w-16 h-16 ${isDark ? 'text-gray-600' : 'text-gray-300'} mx-auto mb-4`} />
            <h3 className={`text-xl font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-2`}>No results found</h3>
            <p className={`${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Try adjusting your search terms or filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

const ProjectsPage = () => {
  const { isDark } = useTheme();
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
    <div className={`p-8 ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 via-white to-indigo-50'} min-h-screen transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className={`text-3xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>Projects</h1>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Manage your project tasks with Kanban boards</p>
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
            <ChartBarIcon className={`w-16 h-16 ${isDark ? 'text-gray-600' : 'text-gray-300'} mx-auto mb-4`} />
            <h3 className={`text-xl font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-2`}>No projects found</h3>
            <p className={`${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Create your first project to get started!</p>
          </div>
        ) : (
          <>
            <div className="flex items-center space-x-4 mb-8 overflow-x-auto">
              <span className={`${isDark ? 'text-gray-200' : 'text-gray-700'} font-medium whitespace-nowrap`}>Projects:</span>
              {projects.map(project => (
                <button
                  key={project.id}
                  onClick={() => setSelectedProject(project)}
                  className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 whitespace-nowrap ${
                    selectedProject?.id === project.id
                      ? 'bg-purple-500 text-white shadow-lg'
                      : `${isDark ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' : 'bg-white text-gray-600 hover:bg-purple-50 hover:text-purple-600'}`
                  }`}
                >
                  {project.name}
                </button>
              ))}
            </div>

            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { key: 'todo', title: 'To Do', color: isDark ? 'bg-gray-800' : 'bg-gray-100' },
                  { key: 'in_progress', title: 'In Progress', color: isDark ? 'bg-yellow-900' : 'bg-yellow-100' },
                  { key: 'completed', title: 'Completed', color: isDark ? 'bg-green-900' : 'bg-green-100' }
                ].map(column => (
                  <div key={column.key} className={`${column.color} rounded-2xl p-6 transition-colors duration-200`}>
                    <h3 className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-4 flex items-center justify-between`}>
                      {column.title}
                      <span className={`${isDark ? 'bg-gray-700 text-gray-200' : 'bg-white text-gray-600'} text-sm px-2 py-1 rounded-full`}>
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
                                    isDark={isDark}
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
          isDark={isDark}
        />
      </div>
    </div>
  );
};

const CalendarPage = () => {
  const { isDark } = useTheme();
  const [tasks, setTasks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

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
                 task.status === 'in_progress' ? '#F59E0B' : '#8B5CF6',
    textColor: '#ffffff'
  }));

  return (
    <div className={`p-8 ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 via-white to-indigo-50'} min-h-screen transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>Calendar</h1>
          <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>View and manage your tasks in calendar format</p>
        </div>
          <button
            onClick={() => {
              setEditingTask(null);
              setIsModalOpen(true);
            }}
            className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 sm:px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2"
          >
            <PlusIcon className="w-5 h-5" />
            <span>New Task</span>
          </button>
        </div>


        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl p-8 shadow-lg border transition-colors duration-200`}>
          <div className={isDark ? 'calendar-dark' : ''}>
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
              eventContent={(eventInfo) => (
                <div className="p-1 text-xs font-medium">
                  {eventInfo.event.title}
                </div>
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

const SlackPage = () => {
  const { isDark } = useTheme();
  const [slackStatus, setSlackStatus] = useState(null);
  const [slackUsers, setSlackUsers] = useState([]);
  const [userMappings, setUserMappings] = useState([]);
  const [newMapping, setNewMapping] = useState({ slack_user_id: '', email: '' });

  useEffect(() => {
    checkSlackStatus();
    fetchSlackUsers();
  }, []);

  const checkSlackStatus = async () => {
    try {
      const response = await axios.get(`${API}/slack/status`);
      setSlackStatus(response.data);
    } catch (error) {
      console.error('Failed to check Slack status:', error);
    }
  };

  const fetchSlackUsers = async () => {
    try {
      const response = await axios.get(`${API}/users/slack`);
      setSlackUsers(response.data.users || []);
    } catch (error) {
      console.error('Failed to fetch Slack users:', error);
    }
  };

  const createMapping = async () => {
    if (!newMapping.slack_user_id || !newMapping.email) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      await axios.post(`${API}/users/mapping`, newMapping);
      setNewMapping({ slack_user_id: '', email: '' });
      toast.success('User mapping created successfully!');
    } catch (error) {
      toast.error('Failed to create mapping');
    }
  };

  return (
    <div className={`p-8 ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 via-white to-indigo-50'} min-h-screen transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className={`text-3xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>Slack Integration</h1>
          <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Connect ZenDo with your Slack workspace for team collaboration</p>
        </div>

        {/* Status Section */}
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl p-6 shadow-lg border mb-8 transition-colors duration-200`}>
          <h2 className={`text-xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-4`}>Connection Status</h2>
          {slackStatus && (
            <div className="flex items-center space-x-4">
              <div className={`w-4 h-4 rounded-full ${slackStatus.status === 'connected' ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                Status: {slackStatus.status === 'connected' ? 'Connected' : slackStatus.status === 'not_configured' ? 'Not Configured' : 'Error'}
              </span>
              {slackStatus.bot_user_id && (
                <span className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  Bot ID: {slackStatus.bot_user_id}
                </span>
              )}
            </div>
          )}
        </div>

        {/* User Mapping Section */}
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl p-6 shadow-lg border mb-8 transition-colors duration-200`}>
          <h2 className={`text-xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-4`}>User Mapping</h2>
          <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'} mb-6`}>
            Map Slack users to ZenDo accounts for task assignment
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <select
              value={newMapping.slack_user_id}
              onChange={(e) => setNewMapping({...newMapping, slack_user_id: e.target.value})}
              className={`w-full border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500`}
            >
              <option value="">Select Slack User</option>
              {slackUsers.map(user => (
                <option key={user.id} value={user.id}>
                  {user.real_name} (@{user.name})
                </option>
              ))}
            </select>

            <input
              type="email"
              placeholder="ZenDo email address"
              value={newMapping.email}
              onChange={(e) => setNewMapping({...newMapping, email: e.target.value})}
              className={`w-full border ${isDark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-900'} rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500`}
            />

            <button
              onClick={createMapping}
              className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-lg"
            >
              Create Mapping
            </button>
          </div>
        </div>

        {/* Instructions */}
        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl p-6 shadow-lg border transition-colors duration-200`}>
          <h2 className={`text-xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-4`}>How to Use</h2>
          <div className={`space-y-3 text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            <p>1. In any Slack channel, mention the ZenDo bot with a user and task description:</p>
            <code className={`block ${isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'} p-3 rounded-lg font-mono`}>
              @zendobot @username "Complete the project documentation"
            </code>
            <p>2. This will automatically create a task in the project named after the channel.</p>
            <p>3. If no project exists for the channel, it will be created automatically.</p>
            <p>4. Make sure users are properly mapped between Slack and ZenDo for task assignment to work.</p>
          </div>

          {slackStatus?.status === 'not_configured' && (
            <div className={`mt-6 p-4 rounded-lg ${isDark ? 'bg-yellow-900 text-yellow-200' : 'bg-yellow-50 text-yellow-800'}`}>
              <h3 className="font-semibold mb-2">Setup Required</h3>
              <p className="text-sm">
                To use Slack integration, you need to configure SLACK_BOT_TOKEN and SLACK_SIGNING_SECRET 
                in your environment variables. Contact your administrator for setup.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PremiumPage = () => {
  const { isDark } = useTheme();
  const { user, updateUser } = useAuth();
  const [plans, setPlans] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    fetchPlans();
    
    // Check for payment success
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      checkPaymentStatus(sessionId);
    }
  }, [searchParams]);

  const fetchPlans = async () => {
    try {
      const response = await axios.get(`${API}/plans`);
      setPlans(response.data.plans);
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    }
  };

  const handleUpgrade = async (planKey) => {
    setIsLoading(true);
    
    try {
      const response = await axios.post(`${API}/checkout`, {
        plan: planKey,
        origin_url: window.location.origin
      });
      
      if (response.data.url) {
        window.location.href = response.data.url;
      }
    } catch (error) {
      toast.error('Failed to create checkout session');
      console.error('Checkout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const checkPaymentStatus = async (sessionId) => {
    try {
      const response = await axios.get(`${API}/checkout/status/${sessionId}`);
      
      if (response.data.payment_status === 'paid') {
        toast.success('Payment successful! Welcome to ZenDo Premium!');
        updateUser({ is_premium: true });
      } else if (response.data.status === 'expired') {
        toast.error('Payment session expired. Please try again.');
      }
    } catch (error) {
      console.error('Payment status check failed:', error);
    }
  };

  if (user?.is_premium) {
    return (
      <div className={`p-8 ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 via-white to-indigo-50'} min-h-screen transition-colors duration-200`}>
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <SparklesIcon className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h1 className={`text-3xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>You're Premium!</h1>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              Thank you for upgrading to ZenDo Premium. Enjoy all the advanced features!
            </p>
          </div>

          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl p-8 shadow-lg border inline-block`}>
            <h2 className={`text-2xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-4`}>
              Premium Features Unlocked
            </h2>
            <ul className={`text-left space-y-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              <li className="flex items-center space-x-2">
                <CheckIcon className="w-5 h-5 text-green-500" />
                <span>Unlimited tasks and projects</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckIcon className="w-5 h-5 text-green-500" />
                <span>Slack integration</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckIcon className="w-5 h-5 text-green-500" />
                <span>Advanced search and filters</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckIcon className="w-5 h-5 text-green-500" />
                <span>Recurring tasks with cron scheduling</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckIcon className="w-5 h-5 text-green-500" />
                <span>Priority support</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-8 ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 via-white to-indigo-50'} min-h-screen transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h1 className={`text-4xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-4`}>Upgrade to ZenDo Premium</h1>
          <p className={`text-xl ${isDark ? 'text-gray-300' : 'text-gray-600'} max-w-3xl mx-auto`}>
            Unlock powerful features to supercharge your productivity and take your task management to the next level
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {Object.entries(plans).map(([key, plan]) => (
            <div key={key} className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl p-8 shadow-lg border transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}>
              <div className="text-center mb-8">
                <h3 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>{plan.name}</h3>
                <div className="flex items-center justify-center mb-4">
                  <span className={`text-4xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
                    ${plan.price}
                  </span>
                  <span className={`text-lg ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>/month</span>
                </div>
              </div>

              <ul className={`space-y-3 mb-8 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center space-x-3">
                    <CheckIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade(key)}
                disabled={isLoading}
                className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-4 rounded-xl font-semibold hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 transform hover:scale-105 shadow-lg disabled:opacity-50 disabled:transform-none"
              >
                {isLoading ? 'Processing...' : `Upgrade to ${plan.name}`}
              </button>
            </div>
          ))}
        </div>

        <div className="mt-16 text-center">
          <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl p-8 shadow-lg border max-w-4xl mx-auto`}>
            <h2 className={`text-2xl font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-4`}>
              Why Choose ZenDo Premium?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
              <div>
                <h3 className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>Team Collaboration</h3>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Integrate with Slack to create tasks directly from your team conversations
                </p>
              </div>
              <div>
                <h3 className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>Smart Automation</h3>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Set up recurring tasks with flexible cron scheduling
                </p>
              </div>
              <div>
                <h3 className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>Advanced Search</h3>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Find tasks quickly with powerful filters and search capabilities
                </p>
              </div>
              <div>
                <h3 className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>Priority Support</h3>
                <p className={`text-sm ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
                  Get help when you need it with dedicated premium support
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Layout component
const Layout = ({ children }) => {
  const { isDark } = useTheme();
  
  return (
    <div className={`${isDark ? 'bg-gray-900' : 'bg-gray-50'} transition-colors duration-200 min-h-screen`}>
      <Navigation />
      <div className="flex-1">
        {children}
      </div>
    </div>
  );
};

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
    const isDark = localStorage.getItem('theme') === 'dark';
    return (
      <div className={`flex items-center justify-center min-h-screen ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 via-white to-indigo-50'} transition-colors duration-200`}>
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
      <Route path="/search" element={<Layout><SearchPage /></Layout>} />
      <Route path="/slack" element={<Layout><SlackPage /></Layout>} />
      <Route path="/premium/*" element={<Layout><PremiumPage /></Layout>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;