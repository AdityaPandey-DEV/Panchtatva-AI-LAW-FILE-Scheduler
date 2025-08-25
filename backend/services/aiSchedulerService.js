/**
 * AI Scheduler - the brain of our app
 * 
 * This was the hardest part to implement. Took me 3 days to get
 * the OpenAI integration working properly with legal case analysis.
 * 
 * The priority scoring algorithm is based on research I did on
 * Indian legal system delays and court procedures.
 * 
 * Fun fact: GPT-4 is surprisingly good at understanding legal context!
 */

const OpenAI = require('openai');
const cron = require('node-cron');
const Case = require('../models/Case');
const User = require('../models/User');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

class AISchedulerService {
  constructor() {
    this.isProcessing = false;
    this.lastRunTime = null;
    this.processedCases = new Set();
  }

  /**
   * Initialize the scheduler with cron jobs
   */
  initializeScheduler() {
    console.log('🤖 Initializing AI Case Scheduler...');
    
    // Run analysis every hour - might be too frequent but let's see
    cron.schedule('0 * * * *', () => {
      this.runSchedulerAnalysis();
    });
    
    // Daily cleanup at 2 AM (when server load is low)
    cron.schedule('0 2 * * *', () => {
      this.runComprehensiveAnalysis();
    });
    
    console.log('✅ AI Scheduler initialized with cron jobs');
    // TODO: add monitoring for failed cron jobs
  }

  /**
   * Run scheduler analysis for new/updated cases
   */
  async runSchedulerAnalysis() {
    if (this.isProcessing) {
      console.log('⏳ Scheduler already processing, skipping...');
      return;
    }

    try {
      this.isProcessing = true;
      console.log('🔄 Running AI scheduler analysis...');

      // Get cases that need analysis
      const casesToAnalyze = await this.getCasesForAnalysis();
      
      if (casesToAnalyze.length === 0) {
        console.log('✅ No cases need analysis');
        return;
      }

      console.log(`📊 Analyzing ${casesToAnalyze.length} cases...`);

      // Process cases in batches to avoid API rate limits
      const batchSize = 5;
      for (let i = 0; i < casesToAnalyze.length; i += batchSize) {
        const batch = casesToAnalyze.slice(i, i + batchSize);
        await this.processCaseBatch(batch);
        
        // Small delay between batches
        if (i + batchSize < casesToAnalyze.length) {
          await this.delay(2000);
        }
      }

      this.lastRunTime = new Date();
      console.log('✅ Scheduler analysis completed');

    } catch (error) {
      console.error('❌ Error in scheduler analysis:', error);
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Get cases that need AI analysis
   */
  async getCasesForAnalysis() {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    return await Case.find({
      $or: [
        // New cases never analyzed
        { 'aiAnalysis.lastAnalyzed': { $exists: false } },
        
        // Cases not analyzed in last 24 hours
        { 'aiAnalysis.lastAnalyzed': { $lt: oneDayAgo } },
        
        // Cases with status changes
        { 
          status: { $in: ['assigned', 'in_progress', 'awaiting_hearing'] },
          'aiAnalysis.lastAnalyzed': { $lt: '$updatedAt' }
        }
      ],
      status: { $nin: ['completed', 'dismissed', 'settled'] }
    })
    .populate('client', 'name email role')
    .populate('assignedLawyer', 'name experience specialization')
    .limit(20); // Limit to prevent overwhelming the API
  }

  /**
   * Process a batch of cases for AI analysis
   */
  async processCaseBatch(cases) {
    const promises = cases.map(caseDoc => this.analyzeSingleCase(caseDoc));
    await Promise.allSettled(promises);
  }

  /**
   * Analyze a single case using AI
   */
  async analyzeSingleCase(caseDoc) {
    try {
      console.log(`🔍 Analyzing case: ${caseDoc.caseNumber}`);

      // Prepare case data for AI analysis
      const caseData = this.prepareCaseDataForAI(caseDoc);
      
      // Get AI analysis
      const aiResponse = await this.getAIAnalysis(caseData);
      
      // Parse and apply AI recommendations
      const analysis = this.parseAIResponse(aiResponse);
      
      // Update case with AI analysis
      await this.updateCaseWithAIAnalysis(caseDoc, analysis);
      
      console.log(`✅ Case ${caseDoc.caseNumber} analyzed - Priority: ${analysis.priorityScore}`);

    } catch (error) {
      console.error(`❌ Error analyzing case ${caseDoc.caseNumber}:`, error);
    }
  }

  /**
   * Prepare case data for AI analysis
   */
  prepareCaseDataForAI(caseDoc) {
    const caseAge = Math.floor((Date.now() - caseDoc.filingDate) / (1000 * 60 * 60 * 24));
    const daysUntilHearing = caseDoc.hearingDate ? 
      Math.floor((caseDoc.hearingDate - Date.now()) / (1000 * 60 * 60 * 24)) : null;

    return {
      caseNumber: caseDoc.caseNumber,
      title: caseDoc.title,
      description: caseDoc.description,
      caseType: caseDoc.caseType,
      subCategory: caseDoc.subCategory,
      status: caseDoc.status,
      caseAge: caseAge,
      estimatedValue: caseDoc.estimatedValue,
      courtLevel: caseDoc.court.level,
      daysUntilHearing: daysUntilHearing,
      hasDeadline: !!caseDoc.deadlineDate,
      lawyerExperience: caseDoc.assignedLawyer?.experience || 0,
      lawyerSpecialization: caseDoc.assignedLawyer?.specialization || [],
      currentDelayDays: caseDoc.delayInfo.delayDays,
      isDelayed: caseDoc.delayInfo.isDelayed,
      documentCount: caseDoc.documents.length,
      milestonesCount: caseDoc.milestones.length,
      completedMilestones: caseDoc.milestones.filter(m => m.status === 'completed').length
    };
  }

  /**
   * Get AI analysis from OpenAI
   */
  async getAIAnalysis(caseData) {
    const prompt = this.buildAnalysisPrompt(caseData);
    
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are an expert legal case analyst and scheduler for an Indian law firm. 
                   Your job is to analyze legal cases and provide priority scores, urgency assessments, 
                   and delay predictions to help optimize case scheduling and resource allocation.
                   
                   Always respond in valid JSON format with the specified structure.
                   Consider Indian legal system context, court procedures, and typical case timelines.`
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3,
      max_tokens: 1000
    });

    return response.choices[0].message.content;
  }

  /**
   * Build analysis prompt for AI
   */
  buildAnalysisPrompt(caseData) {
    return `Analyze this legal case and provide a comprehensive assessment:

CASE DETAILS:
- Case Number: ${caseData.caseNumber}
- Title: ${caseData.title}
- Type: ${caseData.caseType} ${caseData.subCategory ? `(${caseData.subCategory})` : ''}
- Description: ${caseData.description}
- Status: ${caseData.status}
- Case Age: ${caseData.caseAge} days
- Court Level: ${caseData.courtLevel}
- Estimated Value: ₹${caseData.estimatedValue.toLocaleString()}
- Days Until Hearing: ${caseData.daysUntilHearing || 'Not scheduled'}
- Current Delay: ${caseData.currentDelayDays} days
- Is Delayed: ${caseData.isDelayed}
- Documents: ${caseData.documentCount}
- Milestones: ${caseData.completedMilestones}/${caseData.milestonesCount} completed
- Lawyer Experience: ${caseData.lawyerExperience} years
- Lawyer Specialization: ${caseData.lawyerSpecialization.join(', ') || 'General'}

ANALYSIS REQUIRED:
1. Priority Score (0-100): Consider urgency, complexity, delays, deadlines
2. Complexity Score (0-100): Based on case type, value, court level
3. Urgency Factors: List specific factors making this case urgent
4. Delay Risk Factors: Identify potential causes of delays
5. Estimated Duration: Days to complete the case
6. Success Probability (0-100): Based on case type and lawyer match
7. Similar Cases Count: Estimate based on case type and characteristics

PRIORITY SCORING CRITERIA:
- High Priority (80-100): Critical deadlines, high-value cases, significant delays
- Medium-High Priority (60-79): Important cases with moderate urgency
- Medium Priority (40-59): Standard cases with normal timeline
- Low-Medium Priority (20-39): Routine cases, no immediate deadlines
- Low Priority (0-19): Non-urgent, preliminary matters

Respond ONLY with valid JSON in this exact format:
{
  "priorityScore": number,
  "complexityScore": number,
  "urgencyFactors": ["factor1", "factor2"],
  "delayRiskFactors": ["risk1", "risk2"],
  "estimatedDuration": number,
  "successProbability": number,
  "similarCasesCount": number,
  "reasoning": "Brief explanation of priority score"
}`;
  }

  /**
   * Parse AI response and extract analysis data
   */
  parseAIResponse(aiResponse) {
    try {
      // Clean the response to ensure valid JSON
      const cleanedResponse = aiResponse.replace(/```json\n?|\n?```/g, '').trim();
      const analysis = JSON.parse(cleanedResponse);
      
      // Validate and normalize the response
      return {
        priorityScore: Math.max(0, Math.min(100, analysis.priorityScore || 50)),
        complexityScore: Math.max(0, Math.min(100, analysis.complexityScore || 50)),
        urgencyFactors: Array.isArray(analysis.urgencyFactors) ? analysis.urgencyFactors : [],
        delayRiskFactors: Array.isArray(analysis.delayRiskFactors) ? analysis.delayRiskFactors : [],
        estimatedDuration: Math.max(1, analysis.estimatedDuration || 30),
        successProbability: Math.max(0, Math.min(100, analysis.successProbability || 50)),
        similarCasesCount: Math.max(0, analysis.similarCasesCount || 0),
        reasoning: analysis.reasoning || 'AI analysis completed'
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      console.error('Raw response:', aiResponse);
      
      // Return default analysis if parsing fails
      return {
        priorityScore: 50,
        complexityScore: 50,
        urgencyFactors: ['Analysis parsing failed'],
        delayRiskFactors: ['Unable to determine'],
        estimatedDuration: 30,
        successProbability: 50,
        similarCasesCount: 0,
        reasoning: 'Default analysis due to parsing error'
      };
    }
  }

  /**
   * Update case with AI analysis results
   */
  async updateCaseWithAIAnalysis(caseDoc, analysis) {
    // Update priority score and related fields
    caseDoc.priorityScore = analysis.priorityScore;
    
    // Update priority level based on score
    if (analysis.priorityScore >= 90) caseDoc.priority = 'critical';
    else if (analysis.priorityScore >= 75) caseDoc.priority = 'urgent';
    else if (analysis.priorityScore >= 60) caseDoc.priority = 'high';
    else if (analysis.priorityScore >= 40) caseDoc.priority = 'medium';
    else caseDoc.priority = 'low';

    // Update AI analysis data
    caseDoc.aiAnalysis = {
      complexityScore: analysis.complexityScore,
      urgencyFactors: analysis.urgencyFactors,
      delayRiskFactors: analysis.delayRiskFactors,
      estimatedDuration: analysis.estimatedDuration,
      similarCasesCount: analysis.similarCasesCount,
      successProbability: analysis.successProbability,
      lastAnalyzed: new Date()
    };

    // Update expected completion date based on AI estimation
    if (!caseDoc.expectedCompletionDate || caseDoc.status === 'assigned') {
      const completionDate = new Date();
      completionDate.setDate(completionDate.getDate() + analysis.estimatedDuration);
      caseDoc.expectedCompletionDate = completionDate;
    }

    // Add analysis note
    caseDoc.notes.push({
      content: `AI Analysis: Priority Score ${analysis.priorityScore}/100. ${analysis.reasoning}`,
      createdBy: null, // System-generated note
      category: 'general',
      isPrivate: false
    });

    await caseDoc.save();
  }

  /**
   * Run comprehensive analysis for all active cases
   */
  async runComprehensiveAnalysis() {
    console.log('🔄 Running comprehensive daily analysis...');
    
    try {
      // Get all active cases
      const activeCases = await Case.find({
        status: { $nin: ['completed', 'dismissed', 'settled'] }
      });

      // Update case statistics
      await this.updateCaseStatistics();
      
      // Rebalance lawyer workloads
      await this.rebalanceLawyerWorkloads();
      
      console.log(`✅ Comprehensive analysis completed for ${activeCases.length} cases`);
      
    } catch (error) {
      console.error('❌ Error in comprehensive analysis:', error);
    }
  }

  /**
   * Update case statistics for reporting
   */
  async updateCaseStatistics() {
    console.log('📊 Updating case statistics...');
    
    // This could include updating user case stats, generating reports, etc.
    const stats = await Case.getCaseStats();
    console.log('📈 Current case statistics:', stats);
  }

  /**
   * Rebalance lawyer workloads based on capacity and specialization
   */
  async rebalanceLawyerWorkloads() {
    console.log('⚖️ Analyzing lawyer workloads...');
    
    const lawyers = await User.find({ role: 'lawyer', isActive: true });
    
    for (const lawyer of lawyers) {
      const activeCases = await Case.countDocuments({
        assignedLawyer: lawyer._id,
        status: { $nin: ['completed', 'dismissed', 'settled'] }
      });
      
      // Update lawyer case stats
      lawyer.caseStats.activeCases = activeCases;
      await lawyer.save();
    }
  }

  /**
   * Get priority-ordered cases for a lawyer
   */
  async getPrioritizedCasesForLawyer(lawyerId, limit = 20) {
    return await Case.find({
      assignedLawyer: lawyerId,
      status: { $nin: ['completed', 'dismissed', 'settled'] }
    })
    .populate('client', 'name email phone')
    .sort({ priorityScore: -1, hearingDate: 1 })
    .limit(limit);
  }

  /**
   * Get cases needing immediate attention
   */
  async getUrgentCases(limit = 10) {
    return await Case.find({
      $or: [
        { priorityScore: { $gte: 80 } },
        { 'delayInfo.isDelayed': true, 'delayInfo.delayDays': { $gte: 30 } },
        { hearingDate: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } }
      ],
      status: { $nin: ['completed', 'dismissed', 'settled'] }
    })
    .populate('client', 'name email')
    .populate('assignedLawyer', 'name email')
    .sort({ priorityScore: -1 })
    .limit(limit);
  }

  /**
   * Utility function to add delay
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Manual trigger for case analysis (for testing/admin use)
   */
  async analyzeCaseManually(caseId) {
    try {
      const caseDoc = await Case.findById(caseId)
        .populate('client', 'name email role')
        .populate('assignedLawyer', 'name experience specialization');
      
      if (!caseDoc) {
        throw new Error('Case not found');
      }

      await this.analyzeSingleCase(caseDoc);
      
      return await Case.findById(caseId);
    } catch (error) {
      console.error('Error in manual case analysis:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const aiSchedulerService = new AISchedulerService();
module.exports = aiSchedulerService;
