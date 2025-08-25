#!/bin/bash

# 🚀 Panchtatva Quick Deployment Script
# SIH Hackathon 2024 - Team Panchtatva

echo "🎯 PANCHTATVA DEPLOYMENT ASSISTANT"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_step() {
    echo -e "${BLUE}📋 $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_step "Starting Panchtatva deployment process..."
echo ""

# Check if required tools are installed
print_step "Checking required tools..."

if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    exit 1
fi

if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_success "Node.js and npm are installed"

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "Please run this script from the Panchtatva root directory"
    exit 1
fi

print_success "Found package.json - we're in the right directory"
echo ""

# Install dependencies
print_step "Installing dependencies..."
npm install
if [ $? -eq 0 ]; then
    print_success "Root dependencies installed"
else
    print_error "Failed to install root dependencies"
    exit 1
fi

cd frontend
npm install
if [ $? -eq 0 ]; then
    print_success "Frontend dependencies installed"
else
    print_error "Failed to install frontend dependencies"
    exit 1
fi
cd ..

echo ""
print_step "Building frontend for production..."
cd frontend
npm run build
if [ $? -eq 0 ]; then
    print_success "Frontend built successfully"
else
    print_error "Frontend build failed"
    exit 1
fi
cd ..

echo ""
print_success "🎉 LOCAL BUILD COMPLETED SUCCESSFULLY!"
echo ""

# Deployment options menu
echo "🚀 DEPLOYMENT OPTIONS:"
echo "====================="
echo ""
echo "1. 📖 View deployment guide (recommended first step)"
echo "2. 🌐 Quick deploy to Railway + Vercel (automated)"
echo "3. 🐳 Deploy with Docker"
echo "4. 📊 Generate environment variables template"
echo "5. 🧪 Test local deployment"
echo "6. ❌ Exit"
echo ""

read -p "Choose an option (1-6): " choice

case $choice in
    1)
        print_step "Opening deployment guide..."
        if command -v code &> /dev/null; then
            code DEPLOYMENT.md
        else
            cat DEPLOYMENT.md
        fi
        ;;
    2)
        print_step "Starting automated deployment..."
        echo ""
        print_warning "You'll need accounts on:"
        echo "- MongoDB Atlas (database)"
        echo "- Railway (backend hosting)"
        echo "- Vercel (frontend hosting)"
        echo "- OpenAI (AI features)"
        echo "- Cloudinary (file uploads)"
        echo ""
        read -p "Do you have all accounts ready? (y/n): " ready
        if [[ $ready == "y" || $ready == "Y" ]]; then
            print_step "Please follow the detailed steps in DEPLOYMENT.md"
            print_warning "Automated deployment requires manual setup of external services"
        else
            print_warning "Please create the required accounts first, then run this script again"
        fi
        ;;
    3)
        print_step "Docker deployment option selected"
        if command -v docker &> /dev/null; then
            print_step "Building Docker containers..."
            docker-compose build
            print_step "Starting services..."
            docker-compose up -d
            print_success "Docker deployment started!"
            print_step "Access your app at: http://localhost:3000"
        else
            print_error "Docker is not installed. Please install Docker first."
        fi
        ;;
    4)
        print_step "Generating environment variables template..."
        cat > .env.production.template << EOF
# 🌍 PRODUCTION ENVIRONMENT VARIABLES
# Copy this file to .env and fill in your actual values

# Database
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/panchtatva

# JWT Secret (generate a long random string)
JWT_SECRET=your_super_secret_jwt_key_make_it_very_long_and_random

# OpenAI API
OPENAI_API_KEY=sk-your_openai_api_key_here

# Server Configuration
NODE_ENV=production
PORT=5000
FRONTEND_URL=https://your-frontend-domain.vercel.app

# Cloudinary (for file uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email Configuration (optional)
EMAIL_FROM=noreply@panchtatva.com
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password

# React App (Frontend)
REACT_APP_API_URL=https://your-backend-domain.up.railway.app/api
REACT_APP_SOCKET_URL=https://your-backend-domain.up.railway.app
EOF
        print_success "Environment template created: .env.production.template"
        print_step "Fill in your actual values and rename to .env"
        ;;
    5)
        print_step "Testing local deployment..."
        print_step "Starting MongoDB (if not running)..."
        if command -v brew &> /dev/null; then
            brew services start mongodb/brew/mongodb-community@7.0 2>/dev/null || true
        fi
        
        print_step "Starting backend server..."
        PORT=5001 node backend/server.js &
        BACKEND_PID=$!
        sleep 3
        
        print_step "Starting frontend development server..."
        cd frontend
        npm start &
        FRONTEND_PID=$!
        cd ..
        
        print_success "🎉 LOCAL DEPLOYMENT STARTED!"
        echo ""
        echo "📱 Frontend: http://localhost:3000"
        echo "🔧 Backend:  http://localhost:5001"
        echo "📊 API:      http://localhost:5001/api"
        echo ""
        print_warning "Press Ctrl+C to stop both servers"
        
        # Wait for user to stop
        wait
        ;;
    6)
        print_step "Exiting deployment script..."
        exit 0
        ;;
    *)
        print_error "Invalid option. Please choose 1-6."
        ;;
esac

echo ""
print_success "🎯 DEPLOYMENT SCRIPT COMPLETED!"
echo ""
print_step "Next steps:"
echo "1. 📖 Read DEPLOYMENT.md for detailed instructions"
echo "2. 🌐 Set up your hosting accounts (MongoDB Atlas, Railway, Vercel)"
echo "3. 🔧 Configure environment variables"
echo "4. 🚀 Deploy using the hosting platforms"
echo "5. 🧪 Test your live deployment"
echo ""
print_success "🏆 Good luck with your SIH 2024 presentation!"
echo ""
