import React, { useState, useEffect, createContext, useContext, useRef } from "react";
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation, useSearchParams } from "react-router-dom";
import axios from "axios";
import {
  CalendarIcon,
  RectangleStackIcon,
  PlusIcon,
  UserIcon,
  Cog6ToothIcon,
  MoonIcon,
  SunIcon,
  HomeIcon,
  BellIcon,
  MagnifyingGlassIcon,
  ChatBubbleBottomCenterTextIcon,
  Bars3Icon,
  EyeIcon,
  EyeSlashIcon,
  TrashIcon,
  PencilSquareIcon,
  ArrowRightOnRectangleIcon
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
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import Fuse from 'fuse.js';

// Load Tailwind CSS from CDN
const tailwindScript = document.createElement('script');
tailwindScript.src = 'https://cdn.tailwindcss.com';
document.head.appendChild(tailwindScript);

// Centralized Backend URL configuration
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// --- Contexts ---

// Auth Context
const AuthContext = createContext();

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        await fetchProfile();
      }
      setLoading(false);
    };
    initializeAuth();
  }, [token]);

  const fetchProfile = async () => {
    try {
      const response = await axios.get(`${API}/profile`);
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      // If fetching the profile fails, it might be due to an invalid token.
      // We should log the user out in this case.
      logout();
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
    window.location.href = '/'; // Redirect to home/login page after logout
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

// Tasks Context - NEW
const TasksContext = createContext();

const TasksProvider = ({ children }) => {
  const { token } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch tasks on initial load and when auth token is available
  useEffect(() => {
    if (token) {
      fetchTasks();
    }
  }, [token]);

  const fetchTasks = async () => {
    setIsLoading(true);
    try {
      const response = await axios.get(`${API}/tasks`);
      setTasks(response.data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      toast.error('Failed to fetch tasks');
    } finally {
      setIsLoading(false);
    }
  };

const updateTaskStatus = async (taskId, newStatus) => {
  const originalStatus = tasks.find(task => String(task.id) === String(taskId))?.status;
  
  // Optimistically update the UI
  setTasks(prevTasks =>
    prevTasks.map(task =>
      String(task.id) === String(taskId) ? { ...task, status: newStatus } : task
    )
  );
  toast.success('Task status updated!');

  // Now, call the backend asynchronously
  try {
    await axios.put(`${API}/tasks/${taskId}`, { status: newStatus });
  } catch (error) {
    console.error('Failed to update task status:', error);
    toast.error('Failed to update task status');
    // Revert the state if the API call fails
    setTasks(prevTasks =>
      prevTasks.map(task =>
        String(task.id) === String(taskId) ? { ...task, status: originalStatus } : task
      )
    );
  }
};
  const deleteTask = async (taskId) => {
    try {
      await axios.delete(`${API}/tasks/${taskId}`);
      setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
      toast.success('Task deleted successfully!');
    } catch (error) {
      console.error('Failed to delete task:', error);
      toast.error('Failed to delete task');
    }
  };

  return (
    <TasksContext.Provider value={{ tasks, isLoading, fetchTasks, updateTaskStatus, deleteTask }}>
      {children}
    </TasksContext.Provider>
  );
};

const useTasks = () => useContext(TasksContext);


// --- Components ---

const Navigation = () => {
  const location = useLocation();
  const { logout, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [notifications, setNotifications] = useState([]);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    fetchNotifications();
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
    { path: '/calendar', icon: CalendarIcon, label: 'Calendar' },
    { path: '/search', icon: MagnifyingGlassIcon, label: 'Search' },
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

              {/* User Menu and Logout */}
              <div className="relative flex items-center space-x-2">
                <div className="hidden sm:block text-right">
                  <div className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{user?.username}</div>
                  {user?.is_premium && (
                    <div className="text-xs text-yellow-600 font-medium">Premium</div>
                  )}
                </div>
                <button
                  onClick={logout}
                  className={`p-2 rounded-lg ${isDark ? 'text-gray-300 hover:bg-gray-700 hover:text-red-400' : 'text-gray-600 hover:bg-purple-50 hover:text-red-600'} transition-colors flex items-center space-x-2`}
                >
                  <ArrowRightOnRectangleIcon className="w-5 h-5" />
                  <span className="hidden md:inline">Logout</span>
                </button>
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`md:hidden p-2 rounded-lg ${isDark ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-purple-50 hover:text-purple-600'} transition-colors`}
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
              {/* Mobile logout button */}
              <button
                onClick={() => {
                  logout();
                  setIsMobileMenuOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-all duration-200 ${isDark ? 'text-gray-300 hover:bg-gray-700 hover:text-red-400' : 'text-gray-600 hover:bg-purple-50 hover:text-red-600'}`}
              >
                <ArrowRightOnRectangleIcon className="w-5 h-5" />
                <span className="font-medium">Logout</span>
              </button>
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

// Updated TaskCard component with onClick and no action buttons
const TaskCard = ({ task, onClick, isDark }) => {
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
    <div
      onClick={() => onClick(task)}
      className={`${isDark ? 'bg-gray-800 border-gray-700 hover:bg-gray-750' : 'bg-white border-gray-200 hover:bg-gray-50'} rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-sm border transition-all duration-300 transform hover:-translate-y-1 cursor-pointer`}>
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

    </div>
  );
};

// Confirmation modal for deleting tasks
const ConfirmationModal = ({ isOpen, onClose, onConfirm, isDark, message }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-8 max-w-sm w-full mx-auto shadow-2xl text-center`}>
        <div className="flex items-center justify-center mb-4">
          <ExclamationTriangleIcon className="w-12 h-12 text-yellow-500" />
        </div>
        <h3 className={`text-xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>Are you sure?</h3>
        <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'} mb-6`}>{message}</p>
        <div className="flex space-x-4 justify-center">
          <button
            onClick={onConfirm}
            className="bg-red-500 text-white px-6 py-3 rounded-xl font-medium hover:bg-red-600 transition-colors transform hover:scale-105 shadow-lg"
          >
            Delete
          </button>
          <button
            onClick={onClose}
            className={`${isDark ? 'text-gray-300 hover:text-gray-100' : 'text-gray-600 hover:text-gray-700'} px-6 py-3 font-medium transition-colors`}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};


// Updated TaskModal with Delete functionality
const TaskModal = ({ isOpen, onClose, task, onSave, isDark }) => {
  const { deleteTask } = useTasks();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    recurring_pattern: ''
  });
  
  // State for the custom confirmation modal
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return isDark ? 'text-gray-300 bg-gray-700' : 'text-gray-600 bg-gray-50';
    }
  };
  
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (task) {
      // Helper function to format a UTC date string into a local datetime-local format
      const formatToLocalDatetime = (utcString) => {
        if (!utcString) return '';
        const date = new Date(utcString);
        
        // Extract local date components
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${year}-${month}-${day}T${hours}:${minutes}`;
      };

      setFormData({
        title: task.title || '',
        description: task.description || '',
        // Use the helper function to correctly format the date for the input
        start_time: formatToLocalDatetime(task.start_time),
        end_time: formatToLocalDatetime(task.end_time),
        priority: task.priority || 'medium',
        status: task.status || 'todo',
        tags: task.tags ? task.tags.join(', ') : '',
        recurring_pattern: task.recurring_pattern || '',
      });
      setIsEditing(false);
    } else {
      // Reset form for new task creation
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
      setIsEditing(true);
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

  const handleDelete = () => {
    setIsConfirmModalOpen(true);
  };
  
  const handleConfirmDelete = async () => {
    await deleteTask(task.id);
    setIsConfirmModalOpen(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`${isDark ? 'bg-gray-800' : 'bg-white'} rounded-2xl p-8 max-w-md w-full mx-auto shadow-2xl max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            {task ? (isEditing ? 'Edit Task' : 'Task Details') : 'Create New Task'}
          </h2>
          <button
            onClick={onClose}
            className={`${isDark ? 'text-gray-400 hover:text-gray-200' : 'text-gray-500 hover:text-gray-700'} transition-colors`}
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {task && !isEditing && (
  <div className="space-y-6">
    <div className={`grid grid-cols-2 gap-y-2 gap-x-4 p-4 rounded-xl ${isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
      <div className="font-semibold">Title:</div>
      <div>{task.title}</div>
      <div className="font-semibold">Priority:</div>
      <div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
          {task.priority}
        </span>
      </div>
      <div className="font-semibold">Status:</div>
      <div>{task.status}</div>
      <div className="font-semibold">Start:</div>
      <div>{new Date(task.start_time).toLocaleString()}</div>
      <div className="font-semibold">End:</div>
      <div>{new Date(task.end_time).toLocaleString()}</div>
    </div>
    {task.description && (
      <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
        <p className="font-semibold mb-2">Description:</p>
        <p>{task.description}</p>
      </div>
    )}
    {task.tags && task.tags.length > 0 && (
      <div className={`p-4 rounded-xl ${isDark ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'}`}>
        <p className="font-semibold mb-2">Tags:</p>
        <div className="flex flex-wrap gap-2">
          {task.tags.map((tag, index) => (
            <span key={index} className={`px-2 py-1 rounded-full text-xs ${isDark ? 'bg-purple-900 text-purple-200' : 'bg-purple-100 text-purple-600'}`}>
              #{tag}
            </span>
          ))}
        </div>
      </div>
    )}
    <div className="flex space-x-4 mt-4">
      <button
        onClick={() => setIsEditing(true)}
        className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-purple-700 transition-colors transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2"
      >
        <PencilSquareIcon className="w-5 h-5" />
        <span>Edit</span>
      </button>
      <button
        onClick={handleDelete}
        className="flex-1 bg-red-500 text-white px-4 py-2 rounded-xl font-medium hover:bg-red-600 transition-colors transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2"
      >
        <TrashIcon className="w-5 h-5" />
        <span>Delete</span>
      </button>
    </div>
  </div>
)}

        {(isEditing || !task) && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Form fields */}
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
        )}
      </div>
      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        onConfirm={handleConfirmDelete}
        isDark={isDark}
        message="This action cannot be undone."
      />
    </div>
  );
};

// --- Pages ---

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
  const { tasks, fetchTasks } = useTasks();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const stats = {
    total_tasks: tasks.length,
    completed_tasks: tasks.filter(t => t.status === 'completed').length,
    pending_tasks: tasks.filter(t => t.status === 'in_progress' || t.status === 'todo').length,
    today_tasks: tasks.filter(t => new Date(t.start_time).toDateString() === new Date().toDateString()).length,
    upcoming_tasks: tasks.filter(t => new Date(t.start_time) > new Date() && t.status !== 'completed').length,
  };

  const recentTasks = tasks.slice(0, 3);

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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-6 mb-6 sm:mb-8">
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
                  onClick={(task) => {
                    setEditingTask(task);
                    setIsModalOpen(true);
                  }}
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
          onSave={fetchTasks}
          isDark={isDark}
        />
      </div>
    </div>
  );
};

// Add this new component within App.js, ideally near the other components.
const StrictModeDroppable = ({ children, ...props }) => {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    const animation = requestAnimationFrame(() => setEnabled(true));
    return () => {
      cancelAnimationFrame(animation);
      setEnabled(false);
    };
  }, []);
  if (!enabled) {
    return null;
  }
  return <Droppable {...props}>{children}</Droppable>;
};

// ... inside the TasksPage component
const TasksPage = () => {
  const { isDark } = useTheme();
  const { tasks, fetchTasks, updateTaskStatus } = useTasks();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const handleDragEnd = (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) {
      return;
    }

    if (destination.droppableId === source.droppableId) {
      return;
    }

    updateTaskStatus(draggableId, destination.droppableId);
  };

  const tasksByStatus = {
    todo: tasks.filter(task => task.status === 'todo'),
    in_progress: tasks.filter(task => task.status === 'in_progress'),
    completed: tasks.filter(task => task.status === 'completed')
  };

  return (
    <div className={`p-4 sm:p-6 lg:p-8 ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 via-white to-indigo-50'} min-h-screen transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 space-y-4 sm:space-y-0">
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>Tasks</h1>
            <p className={`${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Manage your personal tasks with a Kanban board</p>
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

        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { key: 'todo', title: 'To Do', color: isDark ? 'bg-gray-800' : 'bg-gray-100' },
              { key: 'in_progress', title: 'In Progress', color: isDark ? 'bg-yellow-900' : 'bg-yellow-100' },
              { key: 'completed', title: 'Completed', color: isDark ? 'bg-green-900' : 'bg-green-100' }
            ].map(column => (
              <StrictModeDroppable key={column.key} droppableId={column.key} direction="vertical">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`
                      ${column.color} 
                      rounded-2xl p-6 transition-all duration-200 
                      ${snapshot.isDraggingOver 
                        ? (isDark ? 'bg-gray-700' : 'bg-indigo-100') // Highlight color
                        : ''
                      }
                      flex flex-col
                    `}
                  >
                    <h3 className={`font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-4 flex items-center justify-between`}>
                      {column.title}
                      <span className={`${isDark ? 'bg-gray-700 text-gray-200' : 'bg-white text-gray-600'} text-sm px-2 py-1 rounded-full`}>
                        {tasksByStatus[column.key].length}
                      </span>
                    </h3>
                    <div className="space-y-4 min-h-96 flex-grow">
                      {tasksByStatus[column.key].map((task, index) => (
                        <Draggable
                          key={task.id}
                          draggableId={String(task.id)}
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
                                onClick={(task) => {
                                  setEditingTask(task);
                                  setIsModalOpen(true);
                                }}
                                isDark={isDark}
                              />
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </StrictModeDroppable>
            ))}
          </div>
        </DragDropContext>

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
  const { tasks,fetchTasks, updateTaskStatus } = useTasks();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    tags: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  const handleSearch = (e) => {
    if (e) e.preventDefault();
    setIsLoading(true);

    const fuseOptions = {
      keys: ['title', 'description', 'tags'],
      threshold: 0.3
    };
    const fuse = new Fuse(tasks, fuseOptions);

    let filteredTasks = searchQuery ? fuse.search(searchQuery).map(result => result.item) : tasks;

    // Apply additional filters
    if (filters.status) {
      filteredTasks = filteredTasks.filter(task => task.status === filters.status);
    }
    if (filters.priority) {
      filteredTasks = filteredTasks.filter(task => task.priority === filters.priority);
    }
    if (filters.tags) {
      const searchTags = filters.tags.split(',').map(tag => tag.trim().toLowerCase());
      filteredTasks = filteredTasks.filter(task =>
        task.tags.some(tag => searchTags.includes(tag.toLowerCase()))
      );
    }

    setSearchResults(filteredTasks);
    setIsLoading(false);
  };

  useEffect(() => {
    // Perform an initial search on load
    handleSearch();
  }, [tasks]);

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
                  onClick={(task) => {
                    setEditingTask(task);
                    setIsModalOpen(true);
                  }}
                  isDark={isDark}
                />
              ))}
            </div>
          </div>
        )}

        {searchResults.length === 0 && (searchQuery || filters.status || filters.priority || filters.tags) && !isLoading && (
          <div className="text-center py-16">
            <MagnifyingGlassIcon className={`w-16 h-16 ${isDark ? 'text-gray-600' : 'text-gray-300'} mx-auto mb-4`} />
            <h3 className={`text-xl font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'} mb-2`}>No results found</h3>
            <p className={`${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Try adjusting your search terms or filters</p>
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
const CalendarPage = () => {
  const { isDark } = useTheme();
  const { tasks, fetchTasks } = useTasks();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const calendarRef = useRef(null);

  // Function to set the initial view based on screen width
  const getInitialView = () => {
    return window.innerWidth < 768 ? 'listWeek' : 'dayGridMonth';
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

  const handleEventClick = (clickInfo) => {
    const task = tasks.find(t => String(t.id) === String(clickInfo.event.id));
    if (task) {
      setEditingTask(task);
      setIsModalOpen(true);
    }
  };

  // Adjust calendar view on window resize
  useEffect(() => {
    const handleResize = () => {
      if (calendarRef.current) {
        const calendarApi = calendarRef.current.getApi();
        if (window.innerWidth < 768) {
          calendarApi.changeView('listWeek');
        } else {
          calendarApi.changeView('dayGridMonth');
        }
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className={`p-4 sm:p-6 lg:p-8 ${isDark ? 'bg-gray-900' : 'bg-gradient-to-br from-purple-50 via-white to-indigo-50'} min-h-screen transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 space-y-4 sm:space-y-0">
          <div>
            <h1 className={`text-2xl sm:text-3xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'} mb-2`}>Calendar</h1>
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

        <div className={`${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl p-4 sm:p-6 shadow-lg border transition-colors duration-200`}>
          <style>
            {`.fc .fc-toolbar-title, .fc-button-group {
                font-size: 0.875rem; /* text-sm */
            }
            @media (max-width: 640px) {
                .fc .fc-toolbar-title, .fc-button-group {
                    font-size: 0.75rem; /* text-xs */
                }
            }`}
          </style>
          <div className={isDark ? 'calendar-dark' : ''}>
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
              initialView={getInitialView()}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,listWeek'
              }}
              events={events}
              editable={true}
              selectable={true}
              height="auto" // Changed height to auto
              eventClick={handleEventClick}
              eventContent={(eventInfo) => (
                <div className="p-1 text-xs font-medium">
                  {eventInfo.event.title}
                </div>
              )}
            />
          </div>
        </div>
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
        <TasksProvider>
          <BrowserRouter>
            <div className="App">
              <AppRoutes />
              <Toaster position="top-right" />
            </div>
          </BrowserRouter>
        </TasksProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

const AppRoutes = () => {
  const { token, loading } = useAuth();
  const { isLoading } = useTasks();

  if (loading || isLoading) {
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
      <Route path="/calendar" element={<Layout><CalendarPage /></Layout>} />
      <Route path="/search" element={<Layout><SearchPage /></Layout>} />
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};

export default App;
