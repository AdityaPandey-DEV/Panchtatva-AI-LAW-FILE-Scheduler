/**
 * Cases Page Component
 * 
 * Displays list of cases with filtering and search functionality
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import axios from 'axios';
import LoadingSpinner from '../../components/common/LoadingSpinner';

const CasesPage = () => {
  const { user, isClient } = useAuth();
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    caseType: '',
    priority: '',
    search: '',
    dateRange: '',
    lawyer: '',
    sortBy: 'priorityScore',
    sortOrder: 'desc'
  });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  useEffect(() => {
    fetchCases();
  }, [filters]);

  const fetchCases = async () => {
    try {
      setLoading(true);
      
      // Try to fetch real cases, fallback to demo data
      let casesData = [];
      
      try {
        const response = await axios.get('/cases', {
          params: {
            ...filters,
            page: 1,
            limit: 20
          }
        });
        casesData = response.data.data.cases || [];
      } catch (error) {
        // Demo cases data with comprehensive information
        casesData = [
          {
            _id: '1',
            title: 'Property Dispute - Sharma vs. Patel Real Estate',
            caseNumber: 'CASE-2024-001',
            status: 'pending',
            priorityScore: 9,
            caseType: 'Property',
            client: { name: 'Rajesh Sharma', email: 'rajesh@example.com' },
            assignedLawyer: { name: 'Adv. Priya Patel', email: 'priya@lawfirm.com' },
            createdAt: '2024-08-15',
            lastUpdate: '2024-08-24',
            nextHearing: '2024-08-30',
            deadline: '2024-08-28',
            description: 'Property boundary dispute requiring urgent court intervention',
            tags: ['urgent', 'property', 'boundary dispute'],
            estimatedValue: 2500000,
            location: 'Mumbai'
          },
          {
            _id: '2',
            title: 'Employment Termination - TechCorp vs. Employee Union',
            caseNumber: 'CASE-2024-002',
            status: 'in_progress',
            priorityScore: 7,
            caseType: 'Employment',
            client: { name: 'TechCorp Ltd', email: 'legal@techcorp.com' },
            assignedLawyer: { name: 'Adv. Amit Kumar', email: 'amit@lawfirm.com' },
            createdAt: '2024-08-10',
            lastUpdate: '2024-08-23',
            nextHearing: '2024-09-05',
            deadline: '2024-09-01',
            description: 'Wrongful termination case involving multiple employees',
            tags: ['employment', 'termination', 'union'],
            estimatedValue: 1200000,
            location: 'Delhi'
          },
          {
            _id: '3',
            title: 'Contract Breach - Software Licensing Agreement',
            caseNumber: 'CASE-2024-003',
            status: 'completed',
            priorityScore: 5,
            caseType: 'Contract',
            client: { name: 'Software Solutions Inc', email: 'legal@softsol.com' },
            assignedLawyer: { name: 'Adv. Sneha Singh', email: 'sneha@lawfirm.com' },
            createdAt: '2024-07-20',
            lastUpdate: '2024-08-20',
            nextHearing: null,
            deadline: null,
            description: 'Software licensing agreement breach - Successfully resolved',
            tags: ['contract', 'software', 'licensing', 'resolved'],
            estimatedValue: 800000,
            location: 'Bangalore'
          },
          {
            _id: '4',
            title: 'Family Dispute - Divorce and Child Custody',
            caseNumber: 'CASE-2024-004',
            status: 'pending',
            priorityScore: 8,
            caseType: 'Family',
            client: { name: 'Priya Kumar', email: 'priya.kumar@example.com' },
            assignedLawyer: { name: 'Adv. Rajesh Sharma', email: 'rajesh@lawfirm.com' },
            createdAt: '2024-08-18',
            lastUpdate: '2024-08-24',
            nextHearing: '2024-08-26',
            deadline: '2024-08-25',
            description: 'Mutual consent divorce with child custody arrangements',
            tags: ['family', 'divorce', 'custody', 'urgent'],
            estimatedValue: 500000,
            location: 'Chennai'
          },
          {
            _id: '5',
            title: 'Criminal Defense - Financial Fraud Investigation',
            caseNumber: 'CASE-2024-005',
            status: 'in_progress',
            priorityScore: 6,
            caseType: 'Criminal',
            client: { name: 'Rohit Gupta', email: 'rohit@example.com' },
            assignedLawyer: { name: 'Adv. Kavya Reddy', email: 'kavya@lawfirm.com' },
            createdAt: '2024-08-05',
            lastUpdate: '2024-08-22',
            nextHearing: '2024-09-10',
            deadline: '2024-09-08',
            description: 'Financial fraud defense case with multiple charges',
            tags: ['criminal', 'fraud', 'financial'],
            estimatedValue: 1500000,
            location: 'Hyderabad'
          },
          {
            _id: '6',
            title: 'Intellectual Property - Patent Infringement',
            caseNumber: 'CASE-2024-006',
            status: 'pending',
            priorityScore: 4,
            caseType: 'Intellectual Property',
            client: { name: 'InnoTech Pvt Ltd', email: 'ip@innotech.com' },
            assignedLawyer: { name: 'Adv. Arun Patel', email: 'arun@lawfirm.com' },
            createdAt: '2024-08-12',
            lastUpdate: '2024-08-21',
            nextHearing: '2024-09-15',
            deadline: '2024-09-12',
            description: 'Patent infringement case involving technology patents',
            tags: ['ip', 'patent', 'technology'],
            estimatedValue: 3000000,
            location: 'Pune'
          }
        ];
        console.log('Demo cases data loaded');
      }

      // Apply client-side filtering for demo
      let filteredCases = casesData;

      if (filters.search) {
        filteredCases = filteredCases.filter(c => 
          c.title.toLowerCase().includes(filters.search.toLowerCase()) ||
          c.description.toLowerCase().includes(filters.search.toLowerCase()) ||
          c.caseNumber.toLowerCase().includes(filters.search.toLowerCase()) ||
          c.tags?.some(tag => tag.toLowerCase().includes(filters.search.toLowerCase()))
        );
      }

      if (filters.status) {
        filteredCases = filteredCases.filter(c => c.status === filters.status);
      }

      if (filters.caseType) {
        filteredCases = filteredCases.filter(c => c.caseType === filters.caseType);
      }

      if (filters.priority) {
        if (filters.priority === 'high') {
          filteredCases = filteredCases.filter(c => c.priorityScore >= 8);
        } else if (filters.priority === 'medium') {
          filteredCases = filteredCases.filter(c => c.priorityScore >= 5 && c.priorityScore < 8);
        } else if (filters.priority === 'low') {
          filteredCases = filteredCases.filter(c => c.priorityScore < 5);
        }
      }

      if (filters.lawyer) {
        filteredCases = filteredCases.filter(c => 
          c.assignedLawyer?.name.toLowerCase().includes(filters.lawyer.toLowerCase())
        );
      }

      // Sort cases
      filteredCases.sort((a, b) => {
        let aValue = a[filters.sortBy];
        let bValue = b[filters.sortBy];

        if (filters.sortBy === 'createdAt' || filters.sortBy === 'lastUpdate') {
          aValue = new Date(aValue);
          bValue = new Date(bValue);
        }

        if (filters.sortOrder === 'desc') {
          return bValue > aValue ? 1 : -1;
        } else {
          return aValue > bValue ? 1 : -1;
        }
      });

      setCases(filteredCases);
      
    } catch (error) {
      console.error('Error fetching cases:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getPriorityColor = (priority) => {
    const colors = {
      critical: 'bg-red-100 text-red-800',
      urgent: 'bg-orange-100 text-orange-800',
      high: 'bg-yellow-100 text-yellow-800',
      medium: 'bg-blue-100 text-blue-800',
      low: 'bg-gray-100 text-gray-800'
    };
    return colors[priority] || colors.medium;
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending_assignment': 'bg-gray-100 text-gray-800',
      'assigned': 'bg-blue-100 text-blue-800',
      'in_progress': 'bg-yellow-100 text-yellow-800',
      'awaiting_hearing': 'bg-purple-100 text-purple-800',
      'completed': 'bg-green-100 text-green-800',
      'dismissed': 'bg-gray-100 text-gray-800'
    };
    return colors[status] || colors['in_progress'];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cases</h1>
          <p className="text-gray-600">
            {isClient() ? 'Manage your legal cases' : 'Review and manage cases'}
          </p>
        </div>
        {isClient() && (
          <Link
            to="/cases/new"
            className="btn btn-primary"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Case
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Search</label>
            <input
              type="text"
              name="search"
              className="input"
              placeholder="Search cases..."
              value={filters.search}
              onChange={handleFilterChange}
            />
          </div>
          <div>
            <label className="label">Status</label>
            <select
              name="status"
              className="input"
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="">All Statuses</option>
              <option value="pending_assignment">Pending Assignment</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="awaiting_hearing">Awaiting Hearing</option>
              <option value="completed">Completed</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
          <div>
            <label className="label">Case Type</label>
            <select
              name="caseType"
              className="input"
              value={filters.caseType}
              onChange={handleFilterChange}
            >
              <option value="">All Types</option>
              <option value="Criminal">Criminal</option>
              <option value="Civil">Civil</option>
              <option value="Corporate">Corporate</option>
              <option value="Family">Family</option>
              <option value="Property">Property</option>
            </select>
          </div>
          <div>
            <label className="label">Priority</label>
            <select
              name="priority"
              className="input"
              value={filters.priority}
              onChange={handleFilterChange}
            >
              <option value="">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="urgent">Urgent</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cases List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="lg" text="Loading cases..." />
          </div>
        ) : cases.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {cases.map((caseItem) => (
              <Link
                key={caseItem._id}
                to={`/cases/${caseItem._id}`}
                className="block p-6 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3">
                      <div className={`w-3 h-3 rounded-full ${
                        caseItem.priority === 'critical' ? 'bg-red-500 animate-pulse' :
                        caseItem.priority === 'urgent' ? 'bg-orange-500' :
                        caseItem.priority === 'high' ? 'bg-yellow-500' :
                        caseItem.priority === 'medium' ? 'bg-blue-500' : 'bg-gray-500'
                      }`} />
                      <h3 className="text-lg font-medium text-gray-900 truncate">
                        {caseItem.title}
                      </h3>
                    </div>
                    <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                      <span className="font-medium">{caseItem.caseNumber}</span>
                      <span>•</span>
                      <span className="capitalize">{caseItem.caseType}</span>
                      {caseItem.client && (
                        <>
                          <span>•</span>
                          <span>Client: {caseItem.client.name}</span>
                        </>
                      )}
                      {caseItem.assignedLawyer && (
                        <>
                          <span>•</span>
                          <span>Lawyer: {caseItem.assignedLawyer.name}</span>
                        </>
                      )}
                    </div>
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                      {caseItem.description}
                    </p>
                  </div>
                  <div className="flex flex-col items-end space-y-2 ml-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(caseItem.priority)}`}>
                      {caseItem.priority}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(caseItem.status)}`}>
                      {caseItem.status.replace('_', ' ')}
                    </span>
                    {caseItem.priorityScore && (
                      <div className="text-sm text-gray-500">
                        Score: {Math.round(caseItem.priorityScore)}/100
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No cases found</h3>
            <p className="mt-1 text-sm text-gray-500">
              {isClient() ? "You haven't created any cases yet." : "No cases match your filters."}
            </p>
            {isClient() && (
              <div className="mt-6">
                <Link
                  to="/cases/new"
                  className="btn btn-primary"
                >
                  Create your first case
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CasesPage;
