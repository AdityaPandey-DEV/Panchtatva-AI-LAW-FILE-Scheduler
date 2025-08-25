/**
 * Client Dashboard - Complete Case Tracking Interface
 * 
 * Comprehensive client portal for case tracking, lawyer communication,
 * document management, and legal consultation
 * 
 * Features: Case tracking, file upload, lawyer communication, progress monitoring
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/common/LoadingSpinner';
import axios from 'axios';
import toast from 'react-hot-toast';
import { 
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, 
  CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';

const ClientDashboard = () => {
  const { user, isClient } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [cases, setCases] = useState([]);
  const [lawyers, setLawyers] = useState([]);
  const [stats, setStats] = useState({
    totalCases: 0,
    activeCases: 0,
    completedCases: 0,
    pendingPayments: 0,
    totalSpent: 0,
    avgCaseTime: 0
  });
  const [uploadingFile, setUploadingFile] = useState(false);

  useEffect(() => {
    if (user?.role === 'client') {
      fetchClientData();
    }
  }, [user]);

  const fetchClientData = async () => {
    try {
      setLoading(true);
      
      // Try to fetch real data, fallback to demo
      let casesData = [];
      let lawyersData = [];
      
      try {
        const casesResponse = await axios.get('/cases/client', {
          params: { clientId: user._id }
        });
        casesData = casesResponse.data.data || [];
      } catch (error) {
        // Demo data for client
        casesData = [
          {
            _id: '1',
            title: 'Property Documentation Review',
            caseNumber: 'CASE-2024-001',
            status: 'in_progress',
            priorityScore: 7,
            caseType: 'Property',
            assignedLawyer: { 
              name: 'Adv. Rajesh Sharma', 
              email: 'rajesh@lawfirm.com',
              phone: '+91 9876543210',
              experience: '15 years',
              specialization: 'Property Law'
            },
            createdAt: '2024-08-15',
            lastUpdate: '2024-08-23',
            nextHearing: '2024-08-30',
            description: 'Review and verification of property documents for purchase',
            progress: 65,
            totalCost: 25000,
            paidAmount: 15000,
            documents: [
              { name: 'property_deed.pdf', uploadedAt: '2024-08-15', size: '2.3 MB' },
              { name: 'survey_report.pdf', uploadedAt: '2024-08-20', size: '1.8 MB' }
            ],
            timeline: [
              { date: '2024-08-15', event: 'Case initiated', status: 'completed' },
              { date: '2024-08-18', event: 'Document review started', status: 'completed' },
              { date: '2024-08-23', event: 'Initial assessment completed', status: 'completed' },
              { date: '2024-08-30', event: 'Court hearing scheduled', status: 'pending' }
            ]
          },
          {
            _id: '2',
            title: 'Employment Contract Dispute',
            caseNumber: 'CASE-2024-002',
            status: 'pending',
            priorityScore: 8,
            caseType: 'Employment',
            assignedLawyer: { 
              name: 'Adv. Priya Patel', 
              email: 'priya@lawfirm.com',
              phone: '+91 9876543211',
              experience: '12 years',
              specialization: 'Employment Law'
            },
            createdAt: '2024-08-20',
            lastUpdate: '2024-08-24',
            nextHearing: '2024-09-05',
            description: 'Wrongful termination and compensation claim',
            progress: 25,
            totalCost: 40000,
            paidAmount: 10000,
            documents: [
              { name: 'employment_contract.pdf', uploadedAt: '2024-08-20', size: '1.5 MB' },
              { name: 'termination_letter.pdf', uploadedAt: '2024-08-21', size: '0.8 MB' }
            ],
            timeline: [
              { date: '2024-08-20', event: 'Case filed', status: 'completed' },
              { date: '2024-08-22', event: 'Lawyer assigned', status: 'completed' },
              { date: '2024-08-25', event: 'Evidence collection', status: 'in_progress' },
              { date: '2024-09-05', event: 'First hearing', status: 'pending' }
            ]
          },
          {
            _id: '3',
            title: 'Consumer Rights Violation',
            caseNumber: 'CASE-2024-003',
            status: 'completed',
            priorityScore: 5,
            caseType: 'Consumer',
            assignedLawyer: { 
              name: 'Adv. Amit Kumar', 
              email: 'amit@lawfirm.com',
              phone: '+91 9876543212',
              experience: '10 years',
              specialization: 'Consumer Law'
            },
            createdAt: '2024-07-10',
            lastUpdate: '2024-08-15',
            nextHearing: null,
            description: 'Defective product compensation claim - Successfully resolved',
            progress: 100,
            totalCost: 15000,
            paidAmount: 15000,
            documents: [
              { name: 'product_receipt.pdf', uploadedAt: '2024-07-10', size: '0.5 MB' },
              { name: 'settlement_agreement.pdf', uploadedAt: '2024-08-15', size: '1.2 MB' }
            ],
            timeline: [
              { date: '2024-07-10', event: 'Complaint filed', status: 'completed' },
              { date: '2024-07-15', event: 'Notice sent to company', status: 'completed' },
              { date: '2024-08-01', event: 'Mediation successful', status: 'completed' },
              { date: '2024-08-15', event: 'Settlement completed', status: 'completed' }
            ]
          }
        ];
        toast.success('Demo data loaded - showing sample client cases');
      }

      try {
        const lawyersResponse = await axios.get('/lawyers');
        lawyersData = lawyersResponse.data.data || [];
      } catch (error) {
        // Demo lawyers data
        lawyersData = [
          { _id: '1', name: 'Adv. Rajesh Sharma', specialization: 'Property Law', experience: '15 years', rating: 4.8, cases: 156 },
          { _id: '2', name: 'Adv. Priya Patel', specialization: 'Employment Law', experience: '12 years', rating: 4.9, cases: 98 },
          { _id: '3', name: 'Adv. Amit Kumar', specialization: 'Consumer Law', experience: '10 years', rating: 4.7, cases: 87 }
        ];
      }

      setCases(casesData);
      setLawyers(lawyersData);
      calculateStats(casesData);
      
    } catch (error) {
      console.error('Error fetching client data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (casesData) => {
    const totalCases = casesData.length;
    const activeCases = casesData.filter(c => c.status !== 'completed').length;
    const completedCases = casesData.filter(c => c.status === 'completed').length;
    const pendingPayments = casesData.reduce((sum, c) => sum + (c.totalCost - c.paidAmount), 0);
    const totalSpent = casesData.reduce((sum, c) => sum + c.paidAmount, 0);
    
    // Calculate average case time (for completed cases)
    const completedCasesWithTime = casesData.filter(c => c.status === 'completed');
    const avgCaseTime = completedCasesWithTime.length > 0 
      ? completedCasesWithTime.reduce((sum, c) => {
          const start = new Date(c.createdAt);
          const end = new Date(c.lastUpdate);
          return sum + Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        }, 0) / completedCasesWithTime.length
      : 0;

    setStats({
      totalCases,
      activeCases,
      completedCases,
      pendingPayments,
      totalSpent,
      avgCaseTime: Math.round(avgCaseTime)
    });
  };

  const handleFileUpload = async (caseId, files) => {
    setUploadingFile(true);
    try {
      const formData = new FormData();
      Array.from(files).forEach(file => {
        formData.append('documents', file);
      });

      await axios.post(`/cases/${caseId}/documents`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      toast.success('Documents uploaded successfully');
      fetchClientData();
    } catch (error) {
      toast.error('Demo mode - file upload simulated');
      // Simulate file upload for demo
      setTimeout(() => {
        toast.success('Files uploaded successfully (Demo)');
      }, 1000);
    } finally {
      setUploadingFile(false);
    }
  };

  const handleContactLawyer = (lawyer) => {
    toast.success(`Contacting ${lawyer.name} - Message sent!`);
    // In real app, this would open messaging interface
  };

  if (!isClient()) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">This page is only accessible to clients.</p>
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

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Client Dashboard</h1>
        <p className="text-gray-600">Track your cases, communicate with lawyers, and manage documents</p>
        <p className="text-sm text-gray-500">Welcome back, {user?.name}! Here's your case overview.</p>
      </div>

      {/* Navigation Tabs */}
      <div className="mb-8">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: '📊' },
            { id: 'cases', label: 'My Cases', icon: '📁' },
            { id: 'documents', label: 'Documents', icon: '📄' },
            { id: 'lawyers', label: 'Find Lawyers', icon: '⚖️' },
            { id: 'billing', label: 'Billing', icon: '💳' }
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
                <div className="p-3 bg-blue-100 rounded-full">📁</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Active Cases</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.activeCases}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">⚡</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completedCases}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">✅</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pending Payment</p>
                  <p className="text-2xl font-bold text-gray-900">₹{stats.pendingPayments.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-red-100 rounded-full">💰</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Spent</p>
                  <p className="text-2xl font-bold text-gray-900">₹{stats.totalSpent.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-full">📊</div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Avg Case Time</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.avgCaseTime} days</p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-full">⏱️</div>
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Case Status Distribution</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Active', value: stats.activeCases },
                      { name: 'Completed', value: stats.completedCases }
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {[{ name: 'Active' }, { name: 'Completed' }].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">Case Progress Overview</h3>
              <div className="space-y-4">
                {cases.slice(0, 3).map((caseItem) => (
                  <div key={caseItem._id} className="border-b pb-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-medium text-gray-900">{caseItem.title}</h4>
                      <span className="text-sm text-gray-500">{caseItem.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${caseItem.progress}%` }}
                      ></div>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Lawyer: {caseItem.assignedLawyer?.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link
                to="/cases/create"
                className="bg-white rounded-lg p-4 text-center hover:shadow-md transition-shadow"
              >
                <div className="text-3xl mb-2">📝</div>
                <h4 className="font-medium text-gray-900">File New Case</h4>
                <p className="text-sm text-gray-600">Start a new legal consultation</p>
              </Link>
              <button className="bg-white rounded-lg p-4 text-center hover:shadow-md transition-shadow">
                <div className="text-3xl mb-2">💬</div>
                <h4 className="font-medium text-gray-900">Contact Lawyer</h4>
                <p className="text-sm text-gray-600">Message your assigned lawyer</p>
              </button>
              <button className="bg-white rounded-lg p-4 text-center hover:shadow-md transition-shadow">
                <div className="text-3xl mb-2">📄</div>
                <h4 className="font-medium text-gray-900">Upload Documents</h4>
                <p className="text-sm text-gray-600">Add case-related documents</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* My Cases Tab */}
      {activeTab === 'cases' && (
        <div className="space-y-6">
          {cases.map((caseItem) => (
            <div key={caseItem._id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900">{caseItem.title}</h3>
                    <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
                      caseItem.status === 'completed' ? 'bg-green-100 text-green-800' :
                      caseItem.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {caseItem.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-gray-600 mb-2">{caseItem.description}</p>
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <span>Case #: {caseItem.caseNumber}</span>
                    <span>Type: {caseItem.caseType}</span>
                    <span>Filed: {new Date(caseItem.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900 mb-1">{caseItem.progress}%</div>
                  <div className="text-sm text-gray-500">Progress</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Assigned Lawyer</h4>
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
                      <span className="text-sm font-medium text-white">
                        {caseItem.assignedLawyer?.name?.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{caseItem.assignedLawyer?.name}</p>
                      <p className="text-sm text-gray-500">{caseItem.assignedLawyer?.specialization}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Case Timeline</h4>
                  <div className="space-y-1">
                    {caseItem.timeline?.slice(-2).map((event, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className={`w-2 h-2 rounded-full ${
                          event.status === 'completed' ? 'bg-green-500' :
                          event.status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-300'
                        }`}></div>
                        <span className="text-sm text-gray-600">{event.event}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t">
                <div className="flex space-x-4">
                  <Link
                    to={`/cases/${caseItem._id}`}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    View Details
                  </Link>
                  <button
                    onClick={() => handleContactLawyer(caseItem.assignedLawyer)}
                    className="border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Contact Lawyer
                  </button>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">
                    Paid: ₹{caseItem.paidAmount.toLocaleString()} / ₹{caseItem.totalCost.toLocaleString()}
                  </div>
                  {caseItem.nextHearing && (
                    <div className="text-sm text-blue-600">
                      Next hearing: {new Date(caseItem.nextHearing).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Documents Tab */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b">
            <h2 className="text-xl font-semibold text-gray-900">Document Management</h2>
          </div>
          <div className="p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload New Documents
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.jpg,.png"
                  onChange={(e) => handleFileUpload('demo', e.target.files)}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <div className="text-4xl mb-2">📄</div>
                  <p className="text-gray-600">Click to upload or drag and drop</p>
                  <p className="text-sm text-gray-500 mt-1">PDF, DOC, DOCX, JPG, PNG up to 10MB</p>
                </label>
              </div>
            </div>

            <div className="space-y-4">
              {cases.flatMap(c => 
                c.documents?.map(doc => ({
                  ...doc,
                  caseTitle: c.title,
                  caseNumber: c.caseNumber
                })) || []
              ).map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">📄</div>
                    <div>
                      <h4 className="font-medium text-gray-900">{doc.name}</h4>
                      <p className="text-sm text-gray-500">
                        {doc.caseTitle} • Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-500">{doc.size}</span>
                    <button className="text-blue-600 hover:text-blue-800">Download</button>
                    <button className="text-red-600 hover:text-red-800">Delete</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Find Lawyers Tab */}
      {activeTab === 'lawyers' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Find Legal Experts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {lawyers.map((lawyer) => (
                <div key={lawyer._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center mb-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 flex items-center justify-center">
                      <span className="text-lg font-medium text-white">
                        {lawyer.name?.charAt(0)}
                      </span>
                    </div>
                    <div className="ml-3">
                      <h3 className="font-semibold text-gray-900">{lawyer.name}</h3>
                      <p className="text-sm text-gray-500">{lawyer.specialization}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Experience:</span>
                      <span className="font-medium">{lawyer.experience}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Rating:</span>
                      <span className="font-medium">⭐ {lawyer.rating}/5</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cases:</span>
                      <span className="font-medium">{lawyer.cases}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button className="flex-1 bg-blue-600 text-white py-2 px-4 rounded text-sm hover:bg-blue-700">
                      Consult
                    </button>
                    <button className="flex-1 border border-gray-300 py-2 px-4 rounded text-sm hover:bg-gray-50">
                      View Profile
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Billing Tab */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Billing & Payments</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-medium text-green-800">Total Paid</h3>
                <p className="text-2xl font-bold text-green-900">₹{stats.totalSpent.toLocaleString()}</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4">
                <h3 className="font-medium text-yellow-800">Pending Payment</h3>
                <p className="text-2xl font-bold text-yellow-900">₹{stats.pendingPayments.toLocaleString()}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-blue-800">Total Cases Value</h3>
                <p className="text-2xl font-bold text-blue-900">₹{(stats.totalSpent + stats.pendingPayments).toLocaleString()}</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Case</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Lawyer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cost</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Balance</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {cases.map((caseItem) => (
                    <tr key={caseItem._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{caseItem.title}</div>
                          <div className="text-sm text-gray-500">{caseItem.caseNumber}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{caseItem.assignedLawyer?.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">₹{caseItem.totalCost.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-green-600">₹{caseItem.paidAmount.toLocaleString()}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`text-sm ${
                          caseItem.totalCost - caseItem.paidAmount > 0 ? 'text-red-600' : 'text-green-600'
                        }`}>
                          ₹{(caseItem.totalCost - caseItem.paidAmount).toLocaleString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {caseItem.totalCost - caseItem.paidAmount > 0 ? (
                          <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                            Pay Now
                          </button>
                        ) : (
                          <span className="text-green-600 text-sm">Paid ✓</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientDashboard;
