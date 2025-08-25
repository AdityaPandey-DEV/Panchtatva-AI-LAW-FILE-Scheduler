/**
 * 404 Not Found Page Component
 * 
 * Displayed when user navigates to non-existent route
 */

import React from 'react';
import { Link } from 'react-router-dom';

const NotFoundPage = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 bg-primary-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-xl">P</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Page Not Found
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            The page you're looking for doesn't exist.
          </p>
        </div>

        <div className="mt-8 text-center">
          <div className="text-6xl font-bold text-gray-300 mb-4">404</div>
          <p className="text-gray-500 mb-8">
            Sorry, we couldn't find the page you're looking for.
          </p>
          
          <div className="space-y-3">
            <Link
              to="/dashboard"
              className="btn btn-primary w-full"
            >
              Go to Dashboard
            </Link>
            <button
              onClick={() => window.history.back()}
              className="btn btn-outline w-full"
            >
              Go Back
            </button>
          </div>
        </div>

        <div className="mt-8 text-center text-xs text-gray-500">
          <p>
            If you think this is an error, please contact support.
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
