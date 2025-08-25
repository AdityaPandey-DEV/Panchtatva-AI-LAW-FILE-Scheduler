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
    search: ''
  });

  useEffect(() => {
    fetchCases();
  }, [filters]);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/cases', {
        params: {
          ...filters,
          page: 1,
          limit: 20
        }
      });
      setCases(response.data.data.cases || []);
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
