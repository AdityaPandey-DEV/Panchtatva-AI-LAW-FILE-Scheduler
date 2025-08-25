# 🚀 Panchtatva Deployment Guide

**Complete deployment instructions for SIH Hackathon 2024**

This guide will help you deploy Panchtatva to production with multiple hosting options. Perfect for hackathon demos and live presentations!

---

## 📋 **Pre-Deployment Checklist**

- [ ] GitHub repository is ready and updated
- [ ] All environment variables are identified
- [ ] MongoDB Atlas account created (or local MongoDB running)
- [ ] OpenAI API key obtained
- [ ] Cloudinary account set up (for file uploads)

---

## 🎯 **Quick Deploy (Recommended for Hackathon)**

### **Option A: Free Tier Deployment**
- **Frontend**: Vercel (Free)
- **Backend**: Railway/Render (Free)
- **Database**: MongoDB Atlas (Free)
- **File Storage**: Cloudinary (Free)

**Total Cost**: $0/month ✅
**Setup Time**: 30-45 minutes
**Perfect for**: Hackathon demos, presentations

---

## 🗄️ **Step 1: Database Setup (MongoDB Atlas)**

### **1.1 Create MongoDB Atlas Account**
```bash
# Go to: https://www.mongodb.com/atlas
# Sign up for free account
# Choose M0 Sandbox (FREE forever)
```

### **1.2 Create Cluster**
1. Click "Build a Database"
2. Choose "M0 FREE" tier
3. Select region closest to you
4. Name your cluster: `panchtatva-cluster`

### **1.3 Create Database User**
1. Go to "Database Access"
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Username: `panchtatva-admin`
5. Generate secure password
6. Grant "Atlas admin" privileges

### **1.4 Network Access**
1. Go to "Network Access"
2. Click "Add IP Address"
3. Choose "Allow access from anywhere" (0.0.0.0/0)
4. Or add specific IPs for better security

### **1.5 Get Connection String**
1. Go to "Database" → "Connect"
2. Choose "Connect your application"
3. Copy connection string:
```
mongodb+srv://panchtatva-admin:<password>@panchtatva-cluster.xxxxx.mongodb.net/panchtatva
```

### **1.6 Seed Database with Demo Data**
```bash
# Update connection string in create-demo-users.js
# Then run:
node create-demo-users.js
```

---

## 🌐 **Step 2: Backend Deployment**

### **Option 2A: Deploy to Railway (Recommended)**

#### **2A.1 Prepare for Railway**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login
```

#### **2A.2 Create Railway Project**
```bash
# Initialize Railway project
railway init

# Link to your GitHub repo
railway link
```

#### **2A.3 Set Environment Variables**
```bash
# Set all environment variables
railway variables set MONGODB_URI="your_mongodb_atlas_connection_string"
railway variables set JWT_SECRET="your_super_secret_jwt_key_here_make_it_long"
railway variables set OPENAI_API_KEY="your_openai_api_key"
railway variables set NODE_ENV="production"
railway variables set PORT="5000"
railway variables set FRONTEND_URL="https://your-frontend-domain.vercel.app"

# Cloudinary settings
railway variables set CLOUDINARY_CLOUD_NAME="your_cloud_name"
railway variables set CLOUDINARY_API_KEY="your_api_key"
railway variables set CLOUDINARY_API_SECRET="your_api_secret"

# Email settings (optional)
railway variables set EMAIL_FROM="noreply@panchtatva.com"
railway variables set EMAIL_HOST="smtp.gmail.com"
railway variables set EMAIL_PORT="587"
railway variables set EMAIL_USER="your_email@gmail.com"
railway variables set EMAIL_PASS="your_app_password"
```

#### **2A.4 Deploy Backend**
```bash
# Deploy to Railway
railway up

# Your backend will be available at:
# https://your-project-name.up.railway.app
```

### **Option 2B: Deploy to Render**

#### **2B.1 Create Render Account**
1. Go to https://render.com
2. Sign up with GitHub
3. Click "New" → "Web Service"
4. Connect your GitHub repository

#### **2B.2 Configure Render Service**
- **Name**: `panchtatva-backend`
- **Root Directory**: `./` (leave empty)
- **Environment**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm run server`

#### **2B.3 Set Environment Variables in Render**
Add all the same environment variables as listed in Railway section above.

---

## 💻 **Step 3: Frontend Deployment**

### **Deploy to Vercel (Recommended)**

#### **3.1 Prepare Frontend**
```bash
# Navigate to frontend directory
cd frontend

# Install Vercel CLI
npm install -g vercel

# Login to Vercel
vercel login
```

#### **3.2 Update Frontend Configuration**
```bash
# Create production environment file
echo "REACT_APP_API_URL=https://your-backend-domain.up.railway.app/api
REACT_APP_SOCKET_URL=https://your-backend-domain.up.railway.app
GENERATE_SOURCEMAP=false" > .env.production
```

#### **3.3 Deploy to Vercel**
```bash
# Deploy from frontend directory
vercel

# Follow prompts:
# - Set up and deploy? Yes
# - Which scope? Your account
# - Link to existing project? No
# - Project name: panchtatva-frontend
# - In which directory is your code located? ./
```

#### **3.4 Set Environment Variables in Vercel**
1. Go to Vercel Dashboard
2. Select your project
3. Go to "Settings" → "Environment Variables"
4. Add:
   - `REACT_APP_API_URL`: `https://your-backend-domain.up.railway.app/api`
   - `REACT_APP_SOCKET_URL`: `https://your-backend-domain.up.railway.app`

#### **3.5 Redeploy with Environment Variables**
```bash
vercel --prod
```

---

## 🔧 **Step 4: Configure CORS and Final Setup**

### **4.1 Update Backend CORS**
Update your backend's CORS configuration to include your frontend domain:

```javascript
// In backend/server.js
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://your-frontend-domain.vercel.app"
  ],
  credentials: true
}));
```

### **4.2 Update Frontend API URLs**
Make sure your frontend is pointing to the correct backend URL:

```javascript
// In frontend/src/contexts/AuthContext.js
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'https://your-backend-domain.up.railway.app/api';
```

---

## 🐳 **Alternative: Docker Deployment**

### **Docker Compose for VPS/Cloud**
```yaml
# docker-compose.prod.yml
version: '3.8'
services:
  backend:
    build: 
      context: .
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - JWT_SECRET=${JWT_SECRET}
      - OPENAI_API_KEY=${OPENAI_API_KEY}
    depends_on:
      - mongodb

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"
    environment:
      - REACT_APP_API_URL=http://your-domain.com:5000/api

  mongodb:
    image: mongo:7.0
    ports:
      - "27017:27017"
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=password
    volumes:
      - mongodb_data:/data/db

volumes:
  mongodb_data:
```

### **Deploy with Docker**
```bash
# Build and run
docker-compose -f docker-compose.prod.yml up -d

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

---

## 🌍 **Step 5: Domain and SSL (Optional)**

### **5.1 Custom Domain**
1. Buy domain from Namecheap/GoDaddy
2. Point DNS to Vercel/Railway
3. Configure SSL (automatic with Vercel/Railway)

### **5.2 Environment-Specific URLs**
```bash
# Production URLs
Frontend: https://panchtatva.vercel.app
Backend: https://panchtatva-backend.up.railway.app
API: https://panchtatva-backend.up.railway.app/api
```

---

## 🧪 **Step 6: Testing Production Deployment**

### **6.1 Health Checks**
```bash
# Test backend health
curl https://your-backend-domain.up.railway.app/api/health

# Test database connection
curl https://your-backend-domain.up.railway.app/api/demo/cases
```

### **6.2 Frontend Testing**
1. Visit your frontend URL
2. Test user registration/login
3. Upload a test case file
4. Check AI scheduling functionality
5. Test admin panel access

### **6.3 Demo Account Access**
- **Admin**: admin@panchtatva.com / admin123
- **Lawyer**: lawyer@panchtatva.com / lawyer123  
- **Client**: client@panchtatva.com / client123

---

## 📊 **Step 7: Monitoring and Analytics**

### **7.1 Set up Monitoring**
```javascript
// Add to backend/server.js
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

### **7.2 Error Tracking**
Consider adding Sentry for error tracking in production:
```bash
npm install @sentry/node @sentry/integrations
```

---

## 🚨 **Troubleshooting Common Issues**

### **Issue 1: CORS Errors**
```javascript
// Solution: Update CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

### **Issue 2: Environment Variables Not Loading**
```bash
# Check if variables are set correctly
echo $MONGODB_URI
echo $JWT_SECRET

# Restart service after setting variables
```

### **Issue 3: Database Connection Failed**
- Verify MongoDB Atlas IP whitelist
- Check connection string format
- Ensure database user has correct permissions

### **Issue 4: File Upload Issues**
- Verify Cloudinary credentials
- Check file size limits
- Test with small files first

---

## 🎯 **Quick Deployment Summary**

### **For Hackathon Demo (30 minutes):**
1. **MongoDB Atlas** (10 min) - Free database
2. **Railway Backend** (10 min) - Deploy backend
3. **Vercel Frontend** (10 min) - Deploy frontend
4. **Test Everything** (5 min) - Verify all works

### **Production URLs:**
```
Frontend: https://panchtatva.vercel.app
Backend:  https://panchtatva-backend.up.railway.app
API:      https://panchtatva-backend.up.railway.app/api
Admin:    https://panchtatva.vercel.app/admin
```

---

## 💡 **Pro Tips for Hackathon Presentation**

1. **Prepare Demo Accounts**: Have admin/lawyer/client accounts ready
2. **Sample Data**: Pre-populate with realistic legal cases
3. **Backup Plan**: Keep local version running as backup
4. **Performance**: Test with multiple users before demo
5. **Mobile Responsive**: Ensure it works on judges' phones/tablets

---

## 📞 **Support and Resources**

- **MongoDB Atlas**: https://docs.atlas.mongodb.com/
- **Railway**: https://docs.railway.app/
- **Vercel**: https://vercel.com/docs
- **OpenAI API**: https://platform.openai.com/docs
- **Cloudinary**: https://cloudinary.com/documentation

---

## 🏆 **Ready for SIH 2024!**

Your Panchtatva project is now production-ready and deployed! 

**Live Demo URLs:**
- 🌐 **Frontend**: https://your-app.vercel.app
- 🔧 **Backend**: https://your-api.railway.app
- 📊 **Admin Panel**: https://your-app.vercel.app/admin

**Good luck with your hackathon presentation! 🚀**

---

*Created with ❤️ by Team Panchtatva for SIH 2024*
