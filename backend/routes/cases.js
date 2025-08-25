/**
 * Case Management Routes
 * 
 * Handles all case-related operations including creation, updates,
 * file uploads, AI analysis, and case scheduling.
 */

const express = require('express');
const Case = require('../models/Case');
const User = require('../models/User');
const fileService = require('../services/fileService');
const aiSchedulerService = require('../services/aiSchedulerService');
const { 
  authenticate, 
  authorize, 
  clientOrLawyer, 
  lawyerOrAdmin,
  adminOnly 
} = require('../middleware/auth');

const router = express.Router();

/**
 * @route   GET /api/cases
 * @desc    Get cases (filtered by user role and permissions)
 * @access  Private
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      caseType, 
      priority, 
      search,
      sortBy = 'priorityScore',
      sortOrder = 'desc'
    } = req.query;

    const skip = (page - 1) * limit;
    
    // Build filter based on user role
    let filter = {};
    
    if (req.user.role === 'client') {
      filter.client = req.user._id;
    } else if (req.user.role === 'lawyer') {
      filter.assignedLawyer = req.user._id;
    }
    // Admin can see all cases (no additional filter)

    // Apply additional filters
    if (status) filter.status = status;
    if (caseType) filter.caseType = caseType;
    if (priority) filter.priority = priority;
    
    // Search functionality
    if (search) {
      filter.$or = [
        { caseNumber: { $regex: search, $options: 'i' } },
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'opposingParty.name': { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Execute query
    const cases = await Case.find(filter)
      .populate('client', 'name email phone')
      .populate('assignedLawyer', 'name email specialization experience')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await Case.countDocuments(filter);

    res.json({
      success: true,
      data: {
        cases,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching cases:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching cases'
    });
  }
});

/**
 * @route   GET /api/cases/priority
 * @desc    Get cases sorted by AI priority score
 * @access  Private (Lawyer/Admin)
 */
router.get('/priority', authenticate, lawyerOrAdmin, async (req, res) => {
  try {
    const { limit = 20, minScore = 0 } = req.query;
    
    let filter = {
      priorityScore: { $gte: parseInt(minScore) },
      status: { $nin: ['completed', 'dismissed', 'settled'] }
    };

    // Lawyers see only their cases
    if (req.user.role === 'lawyer') {
      filter.assignedLawyer = req.user._id;
    }

    const cases = await Case.find(filter)
      .populate('client', 'name email phone')
      .populate('assignedLawyer', 'name email')
      .sort({ priorityScore: -1, hearingDate: 1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      data: { cases }
    });

  } catch (error) {
    console.error('Error fetching priority cases:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching priority cases'
    });
  }
});

/**
 * @route   GET /api/cases/urgent
 * @desc    Get urgent cases needing immediate attention
 * @access  Private (Lawyer/Admin)
 */
router.get('/urgent', authenticate, lawyerOrAdmin, async (req, res) => {
  try {
    const cases = await aiSchedulerService.getUrgentCases(20);
    
    // Filter by lawyer if not admin
    const filteredCases = req.user.role === 'admin' 
      ? cases 
      : cases.filter(c => c.assignedLawyer && c.assignedLawyer._id.equals(req.user._id));

    res.json({
      success: true,
      data: { cases: filteredCases }
    });

  } catch (error) {
    console.error('Error fetching urgent cases:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching urgent cases'
    });
  }
});

/**
 * @route   GET /api/cases/:id
 * @desc    Get single case by ID
 * @access  Private
 */
router.get('/:id', authenticate, async (req, res) => {
  try {
    const caseDoc = await Case.findById(req.params.id)
      .populate('client', 'name email phone address')
      .populate('assignedLawyer', 'name email specialization experience')
      .populate('notes.createdBy', 'name role')
      .populate('milestones.assignedTo', 'name');

    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    // Check permissions
    const hasAccess = 
      req.user.role === 'admin' ||
      caseDoc.client._id.equals(req.user._id) ||
      (caseDoc.assignedLawyer && caseDoc.assignedLawyer._id.equals(req.user._id));

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { case: caseDoc }
    });

  } catch (error) {
    console.error('Error fetching case:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching case'
    });
  }
});

/**
 * @route   POST /api/cases
 * @desc    Create new case
 * @access  Private (Client/Admin)
 */
router.post('/', authenticate, authorize(['client', 'admin']), async (req, res) => {
  try {
    const {
      title,
      description,
      caseType,
      subCategory,
      filingDate,
      hearingDate,
      deadlineDate,
      court,
      opposingParty,
      estimatedValue,
      tags
    } = req.body;

    // Validation
    if (!title || !description || !caseType || !filingDate || !court) {
      return res.status(400).json({
        success: false,
        message: 'Title, description, case type, filing date, and court information are required'
      });
    }

    // Create case
    const caseData = {
      title: title.trim(),
      description: description.trim(),
      caseType,
      subCategory,
      client: req.user.role === 'admin' ? req.body.clientId : req.user._id,
      filingDate: new Date(filingDate),
      hearingDate: hearingDate ? new Date(hearingDate) : null,
      deadlineDate: deadlineDate ? new Date(deadlineDate) : null,
      court,
      opposingParty,
      estimatedValue: estimatedValue || 0,
      tags: tags || [],
      status: 'pending_assignment'
    };

    const newCase = new Case(caseData);
    await newCase.save();

    // Populate the created case
    const populatedCase = await Case.findById(newCase._id)
      .populate('client', 'name email phone');

    // Trigger AI analysis for the new case
    setTimeout(() => {
      aiSchedulerService.analyzeCaseManually(newCase._id).catch(console.error);
    }, 1000);

    res.status(201).json({
      success: true,
      message: 'Case created successfully',
      data: { case: populatedCase }
    });

  } catch (error) {
    console.error('Error creating case:', error);
    
    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: Object.values(error.errors).map(e => e.message)
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating case'
    });
  }
});

/**
 * @route   PUT /api/cases/:id
 * @desc    Update case
 * @access  Private
 */
router.put('/:id', authenticate, clientOrLawyer, async (req, res) => {
  try {
    const caseDoc = await Case.findById(req.params.id);

    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    // Check permissions
    const hasAccess = 
      req.user.role === 'admin' ||
      caseDoc.client.equals(req.user._id) ||
      (caseDoc.assignedLawyer && caseDoc.assignedLawyer.equals(req.user._id));

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    // Update allowed fields
    const allowedUpdates = [
      'title', 'description', 'subCategory', 'hearingDate', 
      'deadlineDate', 'court', 'opposingParty', 'estimatedValue', 
      'tags', 'expectedCompletionDate'
    ];

    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        if (field.includes('Date') && req.body[field]) {
          caseDoc[field] = new Date(req.body[field]);
        } else {
          caseDoc[field] = req.body[field];
        }
      }
    });

    await caseDoc.save();

    // Re-trigger AI analysis if significant changes
    const significantFields = ['description', 'caseType', 'estimatedValue', 'hearingDate'];
    const hasSignificantChanges = significantFields.some(field => req.body[field] !== undefined);
    
    if (hasSignificantChanges) {
      setTimeout(() => {
        aiSchedulerService.analyzeCaseManually(caseDoc._id).catch(console.error);
      }, 1000);
    }

    const updatedCase = await Case.findById(caseDoc._id)
      .populate('client', 'name email phone')
      .populate('assignedLawyer', 'name email specialization');

    res.json({
      success: true,
      message: 'Case updated successfully',
      data: { case: updatedCase }
    });

  } catch (error) {
    console.error('Error updating case:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating case'
    });
  }
});

/**
 * @route   PUT /api/cases/:id/assign
 * @desc    Assign lawyer to case
 * @access  Private (Admin/Lawyer)
 */
router.put('/:id/assign', authenticate, lawyerOrAdmin, async (req, res) => {
  try {
    const { lawyerId } = req.body;

    if (!lawyerId) {
      return res.status(400).json({
        success: false,
        message: 'Lawyer ID is required'
      });
    }

    // Verify lawyer exists
    const lawyer = await User.findById(lawyerId);
    if (!lawyer || lawyer.role !== 'lawyer') {
      return res.status(400).json({
        success: false,
        message: 'Invalid lawyer ID'
      });
    }

    const caseDoc = await Case.findById(req.params.id);
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    // Update case
    caseDoc.assignedLawyer = lawyerId;
    caseDoc.status = 'assigned';
    
    // Add note about assignment
    caseDoc.notes.push({
      content: `Case assigned to ${lawyer.name}`,
      createdBy: req.user._id,
      category: 'general'
    });

    await caseDoc.save();

    // Re-analyze with lawyer context
    setTimeout(() => {
      aiSchedulerService.analyzeCaseManually(caseDoc._id).catch(console.error);
    }, 1000);

    const updatedCase = await Case.findById(caseDoc._id)
      .populate('client', 'name email')
      .populate('assignedLawyer', 'name email specialization');

    res.json({
      success: true,
      message: 'Lawyer assigned successfully',
      data: { case: updatedCase }
    });

  } catch (error) {
    console.error('Error assigning lawyer:', error);
    res.status(500).json({
      success: false,
      message: 'Error assigning lawyer'
    });
  }
});

/**
 * @route   PUT /api/cases/:id/status
 * @desc    Update case status
 * @access  Private (Lawyer/Admin)
 */
router.put('/:id/status', authenticate, lawyerOrAdmin, async (req, res) => {
  try {
    const { status, note } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status is required'
      });
    }

    const caseDoc = await Case.findById(req.params.id);
    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    // Check if lawyer is assigned to this case
    if (req.user.role === 'lawyer' && !caseDoc.assignedLawyer?.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only update cases assigned to you'
      });
    }

    await caseDoc.updateStatus(status, req.user._id);

    // Add additional note if provided
    if (note) {
      await caseDoc.addNote(note, req.user._id, false, 'general');
    }

    const updatedCase = await Case.findById(caseDoc._id)
      .populate('client', 'name email')
      .populate('assignedLawyer', 'name email');

    res.json({
      success: true,
      message: 'Case status updated successfully',
      data: { case: updatedCase }
    });

  } catch (error) {
    console.error('Error updating case status:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating case status'
    });
  }
});

/**
 * @route   POST /api/cases/:id/upload
 * @desc    Upload documents to case
 * @access  Private
 */
router.post('/:id/upload', authenticate, clientOrLawyer, fileService.getUploadMiddleware().array('documents', 5), async (req, res) => {
  try {
    const caseDoc = await Case.findById(req.params.id);

    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    // Check permissions
    const hasAccess = 
      req.user.role === 'admin' ||
      caseDoc.client.equals(req.user._id) ||
      (caseDoc.assignedLawyer && caseDoc.assignedLawyer.equals(req.user._id));

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded'
      });
    }

    const uploadedDocuments = [];
    const errors = [];

    // Process each uploaded file
    for (const file of req.files) {
      try {
        // Validate file
        const validation = fileService.validateFile(file);
        if (!validation.isValid) {
          errors.push({
            filename: file.originalname,
            errors: validation.errors
          });
          continue;
        }

        // Process file
        const fileRecord = await fileService.processUploadedFile(file, req.user._id, caseDoc._id);
        
        // Add to case documents
        caseDoc.documents.push(fileRecord);
        uploadedDocuments.push(fileRecord);

      } catch (error) {
        console.error(`Error processing file ${file.originalname}:`, error);
        errors.push({
          filename: file.originalname,
          errors: [error.message]
        });
      }
    }

    // Save case with new documents
    if (uploadedDocuments.length > 0) {
      await caseDoc.save();
      
      // Add note about document upload
      await caseDoc.addNote(
        `${uploadedDocuments.length} document(s) uploaded: ${uploadedDocuments.map(d => d.originalName).join(', ')}`,
        req.user._id,
        false,
        'general'
      );
    }

    res.json({
      success: true,
      message: `${uploadedDocuments.length} document(s) uploaded successfully`,
      data: {
        uploadedDocuments,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error('Error uploading documents:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading documents'
    });
  }
});

/**
 * @route   POST /api/cases/:id/notes
 * @desc    Add note to case
 * @access  Private
 */
router.post('/:id/notes', authenticate, clientOrLawyer, async (req, res) => {
  try {
    const { content, isPrivate = false, category = 'general' } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Note content is required'
      });
    }

    const caseDoc = await Case.findById(req.params.id);

    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    // Check permissions
    const hasAccess = 
      req.user.role === 'admin' ||
      caseDoc.client.equals(req.user._id) ||
      (caseDoc.assignedLawyer && caseDoc.assignedLawyer.equals(req.user._id));

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    await caseDoc.addNote(content.trim(), req.user._id, isPrivate, category);

    const updatedCase = await Case.findById(caseDoc._id)
      .populate('notes.createdBy', 'name role');

    res.json({
      success: true,
      message: 'Note added successfully',
      data: { 
        case: updatedCase,
        newNote: updatedCase.notes[updatedCase.notes.length - 1]
      }
    });

  } catch (error) {
    console.error('Error adding note:', error);
    res.status(500).json({
      success: false,
      message: 'Error adding note'
    });
  }
});

/**
 * @route   POST /api/cases/:id/analyze
 * @desc    Trigger manual AI analysis for case
 * @access  Private (Lawyer/Admin)
 */
router.post('/:id/analyze', authenticate, lawyerOrAdmin, async (req, res) => {
  try {
    const caseDoc = await Case.findById(req.params.id);

    if (!caseDoc) {
      return res.status(404).json({
        success: false,
        message: 'Case not found'
      });
    }

    // Check if lawyer is assigned to this case
    if (req.user.role === 'lawyer' && !caseDoc.assignedLawyer?.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only analyze cases assigned to you'
      });
    }

    // Trigger AI analysis
    const analyzedCase = await aiSchedulerService.analyzeCaseManually(caseDoc._id);

    res.json({
      success: true,
      message: 'AI analysis completed',
      data: { case: analyzedCase }
    });

  } catch (error) {
    console.error('Error running AI analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Error running AI analysis'
    });
  }
});

/**
 * @route   GET /api/cases/stats/overview
 * @desc    Get case statistics overview
 * @access  Private (Admin)
 */
router.get('/stats/overview', authenticate, adminOnly, async (req, res) => {
  try {
    const stats = await Case.getCaseStats();
    
    // Get additional statistics
    const casesByType = await Case.aggregate([
      {
        $group: {
          _id: '$caseType',
          count: { $sum: 1 },
          avgPriority: { $avg: '$priorityScore' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const casesByStatus = await Case.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        overview: stats,
        byType: casesByType,
        byStatus: casesByStatus
      }
    });

  } catch (error) {
    console.error('Error fetching case statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching case statistics'
    });
  }
});

module.exports = router;
