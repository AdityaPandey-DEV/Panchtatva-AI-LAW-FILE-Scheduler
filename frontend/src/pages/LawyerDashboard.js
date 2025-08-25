/**
 * Lawyer Dashboard - Complete Case Management Interface
 * 
 * AI-powered case prioritization, scheduling, and management
 * specifically designed for lawyers
 * 
 * Features: Case prioritization, AI scheduling, client communication
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  PieChart, Pie, Cell, ResponsiveContainer 
} from 'recharts';

const LawyerDashboard = () => {
  const { user, isLawyer } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [cases, setCases] = useState([]);
  const [stats, setStats] = useState({
    totalCases: 0,
    pendingCases: 0,
    inProgressCases: 0,
    completedCases: 0,
    highPriorityCases: 0,
    todayDeadlines: 0
  });
  const [aiInsights, setAiInsights] = useState({
    priorityDistribution: [],
    caseTypeDistribution: [],
    recommendations: []
  });

  useEffect(() => {
    if (user?.role === 'lawyer') {
      fetchLawyerData();
    }
  }, [user]);

  const fetchLawyerData = async () => {
    try {
      setLoading(true);
      
      // Try to fetch real data, fallback to demo
      let casesData = [];
      
      try {
        const casesResponse = await axios.get('/cases/lawyer', {
          params: { lawyerId: user._id }
        });
        casesData = casesResponse.data.data || [];
      } catch (error) {
        // Demo data for lawyer
        casesData = [
          {
            _id: '1',
            title: 'Property Dispute - Sharma vs. Patel',
            caseNumber: 'CASE-2024-001',
            status: 'pending',
            priorityScore: 9,
            caseType: 'Property',
            client: { name: 'Rajesh Sharma', email: 'rajesh@example.com', phone: '+91 9876543210' },
            nextHearing: '2024-08-30',
            deadline: '2024-08-28',
            description: 'Property boundary dispute requiring urgent resolution',
            aiRecommendation: 'High priority - court deadline approaching',
            estimatedHours: 25,
            billableRate: 5000,
            documents: ['property_deed.pdf', 'survey_report.pdf']
          },
          {
            _id: '2',
            title: 'Contract Breach - TechCorp Ltd',
            caseNumber: 'CASE-2024-002',
            status: 'in_progress',
            priorityScore: 7,
            caseType: 'Contract',
            client: { name: 'Priya Patel', email: 'priya@techcorp.com', phone: '+91 9876543211' },
            nextHearing: '2024-09-05',
            deadline: '2024-09-01',
            description: 'Software licensing agreement breach',
            aiRecommendation: 'Medium priority - prepare contract analysis',
            estimatedHours: 15,
            billableRate: 4500,
            documents: ['contract.pdf', 'breach_notice.pdf']
          },
          {
            _id: '3',
            title: 'Employment Dispute Resolution',
            caseNumber: 'CASE-2024-003',
            status: 'completed',
            priorityScore: 5,
            caseType: 'Employment',
            client: { name: 'Amit Kumar', email: 'amit@example.com', phone: '+91 9876543212' },
            nextHearing: null,
            deadline: null,
            description: 'Wrongful termination case - settled',
            aiRecommendation: 'Completed successfully',
            estimatedHours: 20,
            billableRate: 4000,
            documents: ['settlement_agreement.pdf']
          },
          {
            _id: '4',
            title: 'Divorce Proceedings - Kumar Family',
            caseNumber: 'CASE-2024-004',
            status: 'pending',
            priorityScore: 8,
            caseType: 'Family',
            client: { name: 'Sneha Singh', email: 'sneha@example.com', phone: '+91 9876543213' },
            nextHearing: '2024-08-26',
            deadline: '2024-08-25',
            description: 'Mutual consent divorce with child custody',
            aiRecommendation: 'High priority - hearing tomorrow',
            estimatedHours: 30,
            billableRate: 3500,
            documents: ['marriage_certificate.pdf', 'custody_proposal.pdf']
          },
          {
            _id: '5',
            title: 'Criminal Defense - Traffic Violation',
            caseNumber: 'CASE-2024-005',
            status: 'in_progress',
            priorityScore: 4,
            caseType: 'Criminal',
            client: { name: 'Rohit Gupta', email: 'rohit@example.com', phone: '+91 9876543214' },
            nextHearing: '2024-09-10',
            deadline: '2024-09-08',
            description: 'Rash driving case defense',
            aiRecommendation: 'Low priority - routine case',
            estimatedHours: 8,
            billableRate: 3000,
            documents: ['fir_copy.pdf', 'witness_statements.pdf']
          }
        ];
        toast.success('Demo data loaded - showing sample lawyer cases');
      }

      setCases(casesData);
      calculateStats(casesData);
      generateAIInsights(casesData);
      
    } catch (error) {
      console.error('Error fetching lawyer data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (casesData) => {
    const totalCases = casesData.length;
    const pendingCases = casesData.filter(c => c.status === 'pending').length;
    const inProgressCases = casesData.filter(c => c.status === 'in_progress').length;
    const completedCases = casesData.filter(c => c.status === 'completed').length;
    const highPriorityCases = casesData.filter(c => c.priorityScore >= 8).length;
    
    // Calculate today's deadlines
    const today = new Date().toISOString().split('T')[0];
    const todayDeadlines = casesData.filter(c => 
      c.deadline && c.deadline <= today && c.status !== 'completed'
    ).length;

    setStats({
      totalCases,
      pendingCases,
      inProgressCases,
      completedCases,
      highPriorityCases,
      todayDeadlines
    });
  };

  const generateAIInsights = (casesData) => {
    // Priority distribution
    const priorityMap = { High: 0, Medium: 0, Low: 0 };
    casesData.forEach(c => {
      const score = c.priorityScore || 0;
      if (score >= 8) priorityMap.High++;
      else if (score >= 5) priorityMap.Medium++;
      else priorityMap.Low++;
    });
    const priorityDistribution = Object.entries(priorityMap).map(([name, value]) => ({ name, value }));

    // Case type distribution
    const typeMap = {};
    casesData.forEach(c => {
      const type = c.caseType || 'Other';
      typeMap[type] = (typeMap[type] || 0) + 1;
    });
    const caseTypeDistribution = Object.entries(typeMap).map(([name, value]) => ({ name, value }));

    // AI Recommendations
    const recommendations = [
      {
        id: 1,
        type: 'urgent',
        title: 'Urgent Deadline Alert',
        message: `${stats.todayDeadlines} cases have deadlines today or overdue`,
        action: 'Review urgent cases',
        priority: 'high'
      },
      {
        id: 2,
        type: 'scheduling',
        title: 'Optimal Schedule Suggestion',
        message: 'Focus on high-priority Property and Family law cases this week',
        action: 'View AI schedule',
        priority: 'medium'
      },
      {
        id: 3,
        type: 'efficiency',
        title: 'Efficiency Insight',
        message: 'You complete cases 15% faster than average for your practice area',
        action: 'View analytics',
        priority: 'low'
      }
    ];

    setAiInsights({
      priorityDistribution,
      caseTypeDistribution,
      recommendations
    });
  };

  const handleCaseStatusUpdate = async (caseId, newStatus) => {
    try {
      await axios.patch(`/cases/${caseId}`, { status: newStatus });
      toast.success('Case status updated successfully');
      fetchLawyerData();
    } catch (error) {
      toast.error('Demo mode - status updated locally');
      // Update local state for demo
      setCases(cases.map(c => 
        c._id === caseId ? { ...c, status: newStatus } : c
      ));
    }
  };

  if (!isLawyer()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">This page is only accessible to lawyers.</p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner />;
  }

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Lawyer Dashboard</h1>
        <p className="text-gray-600">AI-powered case management and scheduling</p>
        <p className="text-sm text-gray-500">Welcome back, {user?.name}! Here's your case overview.</p>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-8">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'cases', label: 'My Cases', icon: '📁' },
            { id: 'schedule', label: 'AI Schedule', icon: '📅' },
            { id: 'clients', label: 'Clients', icon: '👥' },
            { id: 'analytics', label: 'Performance', icon: '📈' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Cases</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalCases}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-full">
                  📁
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingCases}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  ⏳
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.inProgressCases}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">
                  🔄
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completedCases}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  ✅
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">High Priority</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.highPriorityCases}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">
                  🚨
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Due Today</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.todayDeadlines}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-full">
                  📅
                </div>
              </div>
            </div>
          </div>

          {/* AI Recommendations */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              🤖 AI Insights & Recommendations
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {aiInsights.recommendations.map((rec) => (
                <div key={rec.id} className={`bg-white rounded-lg p-4 border-l-4 ${
                  rec.priority === 'high' ? 'border-red-500' :
                  rec.priority === 'medium' ? 'border-yellow-500' : 'border-green-500'
                }`}>
                  <h4 className="font-medium text-gray-900">{rec.title}</h4>
                  <p className="text-sm text-gray-600 mt-1">{rec.message}</p>
                  <button className="mt-2 text-sm text-blue-600 hover:text-blue-800">
                    {rec.action} →
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Case Priority Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={aiInsights.priorityDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {aiInsights.priorityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Cases by Practice Area</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={aiInsights.caseTypeDistribution}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" fill="#8884d8" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Urgent Cases */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Urgent Cases Requiring Attention</h3>
            </div>
            <div className="p-6">
              {cases
                .filter(c => c.priorityScore >= 8 && c.status !== 'completed')
                .slice(0, 3)
                .map((caseItem) => (
                <div key={caseItem._id} className="border-l-4 border-red-500 bg-red-50 p-4 mb-4 rounded-r-lg">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900">{caseItem.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{caseItem.description}</p>
                      <div className="flex items-center mt-2 space-x-4 text-sm">
                        <span className="text-gray-500">Client: {caseItem.client?.name}</span>
                        <span className="text-red-600 font-medium">
                          Priority: {caseItem.priorityScore}/10
                        </span>
                        {caseItem.deadline && (
                          <span className="text-red-600">
                            Due: {new Date(caseItem.deadline).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Link
                        to={`/cases/${caseItem._id}`}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        View
                      </Link>
                      <button
                        onClick={() => handleCaseStatusUpdate(caseItem._id, 'in_progress')}
                        className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                      >
                        Start Work
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* My Cases Tab */}
      {activeTab === 'cases' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900">My Cases</h2>
            <div className="flex space-x-2">
              <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
              <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm">
                <option value="">All Types</option>
                <option value="Property">Property</option>
                <option value="Contract">Contract</option>
                <option value="Family">Family</option>
                <option value="Criminal">Criminal</option>
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Case</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Deadline</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cases.map((caseItem) => (
                  <tr key={caseItem._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{caseItem.title}</div>
                        <div className="text-sm text-gray-500">{caseItem.caseNumber}</div>
                        <div className="text-xs text-gray-400 mt-1">{caseItem.caseType}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm text-gray-900">{caseItem.client?.name}</div>
                        <div className="text-sm text-gray-500">{caseItem.client?.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                          caseItem.priorityScore >= 8 ? 'bg-red-100 text-red-800' :
                          caseItem.priorityScore >= 5 ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {caseItem.priorityScore}/10
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                        caseItem.status === 'completed' ? 'bg-green-100 text-green-800' :
                        caseItem.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                        'bg-yellow-100 text-yellow-800'
                      }`}>
                        {caseItem.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {caseItem.deadline ? (
                        <span className={new Date(caseItem.deadline) < new Date() ? 'text-red-600 font-medium' : ''}>
                          {new Date(caseItem.deadline).toLocaleDateString()}
                        </span>
                      ) : 'No deadline'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <Link
                        to={`/cases/${caseItem._id}`}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        View
                      </Link>
                      <button className="text-green-600 hover:text-green-900">
                        Update
                      </button>
                      <button className="text-purple-600 hover:text-purple-900">
                        Contact Client
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Schedule Tab */}
      {activeTab === 'schedule' && (
        <div className="space-y-8">
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              🤖 AI-Generated Optimal Schedule
            </h3>
            <p className="text-gray-600 mb-4">
              Based on case priorities, deadlines, and your historical productivity patterns
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">This Week's Focus</h3>
              <div className="space-y-4">
                <div className="border-l-4 border-red-500 pl-4">
                  <h4 className="font-medium text-red-800">Monday - High Priority</h4>
                  <p className="text-sm text-gray-600">Property Dispute - Sharma vs. Patel</p>
                  <p className="text-xs text-gray-500">Estimated: 6 hours</p>
                </div>
                <div className="border-l-4 border-yellow-500 pl-4">
                  <h4 className="font-medium text-yellow-800">Tuesday - Medium Priority</h4>
                  <p className="text-sm text-gray-600">Contract Breach - TechCorp Ltd</p>
                  <p className="text-xs text-gray-500">Estimated: 4 hours</p>
                </div>
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-medium text-blue-800">Wednesday - Client Meetings</h4>
                  <p className="text-sm text-gray-600">3 scheduled consultations</p>
                  <p className="text-xs text-gray-500">Estimated: 3 hours</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Productivity Insights</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Peak Performance Hours</span>
                  <span className="text-sm font-medium">9 AM - 12 PM</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Average Case Completion</span>
                  <span className="text-sm font-medium">18.5 days</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Success Rate</span>
                  <span className="text-sm font-medium text-green-600">94%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Clients Tab */}
      {activeTab === 'clients' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold text-gray-900">My Clients</h2>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...new Map(cases.map(c => [c.client?.email, c.client])).values()]
                .filter(client => client)
                .map((client, index) => (
                <div key={index} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center mb-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {client.name?.charAt(0)?.toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-3">
                      <h4 className="font-medium text-gray-900">{client.name}</h4>
                      <p className="text-sm text-gray-500">{client.email}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Active Cases:</span>
                      <span className="font-medium">
                        {cases.filter(c => c.client?.email === client.email && c.status !== 'completed').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Phone:</span>
                      <span className="font-medium">{client.phone || 'Not provided'}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    <button className="flex-1 bg-blue-600 text-white py-1 px-3 rounded text-sm hover:bg-blue-700">
                      Message
                    </button>
                    <button className="flex-1 border border-gray-300 py-1 px-3 rounded text-sm hover:bg-gray-50">
                      Call
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Performance Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <h3 className="text-sm font-medium text-gray-500">Billable Hours (This Month)</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">156.5</p>
              <p className="text-sm text-green-600 mt-1">+12% from last month</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <h3 className="text-sm font-medium text-gray-500">Revenue Generated</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">₹6,82,500</p>
              <p className="text-sm text-green-600 mt-1">+18% from last month</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <h3 className="text-sm font-medium text-gray-500">Client Satisfaction</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">4.8/5</p>
              <p className="text-sm text-blue-600 mt-1">Based on 24 reviews</p>
            </div>
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <h3 className="text-sm font-medium text-gray-500">Case Win Rate</h3>
              <p className="text-2xl font-bold text-gray-900 mt-2">94%</p>
              <p className="text-sm text-green-600 mt-1">Industry avg: 78%</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">Performance Trends</h3>
            <div className="text-center text-gray-500 py-8">
              📈 Detailed analytics charts will be available in the full version
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LawyerDashboard;
