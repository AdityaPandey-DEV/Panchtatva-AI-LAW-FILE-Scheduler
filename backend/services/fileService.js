/**
 * File Upload and Management Service
 * 
 * Handles secure file uploads to Cloudinary, document parsing,
 * and metadata extraction for legal case files.
 */

const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const path = require('path');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

class FileService {
  constructor() {
    this.allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/jpg'
    ];
    
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.setupMulter();
  }

  /**
   * Setup Multer for file upload handling
   */
  setupMulter() {
    // Configure multer for memory storage
    this.upload = multer({
      storage: multer.memoryStorage(),
      limits: {
        fileSize: this.maxFileSize,
        files: 5 // Max 5 files per upload
      },
      fileFilter: (req, file, cb) => {
        // Check file type
        if (!this.allowedMimeTypes.includes(file.mimetype)) {
          return cb(new Error(`File type ${file.mimetype} not allowed. Allowed types: PDF, DOC, DOCX, TXT, JPG, PNG`));
        }
        
        // Check file extension
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExtensions = ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.jpeg', '.png'];
        
        if (!allowedExtensions.includes(ext)) {
          return cb(new Error(`File extension ${ext} not allowed`));
        }
        
        cb(null, true);
      }
    });
  }

  /**
   * Upload file to Cloudinary
   */
  async uploadToCloudinary(fileBuffer, filename, folder = 'panchtatva/documents') {
    try {
      return new Promise((resolve, reject) => {
        const uploadOptions = {
          folder: folder,
          public_id: `${Date.now()}_${filename}`,
          resource_type: 'auto',
          use_filename: true,
          unique_filename: true
        };

        cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) {
              console.error('Cloudinary upload error:', error);
              reject(error);
            } else {
              resolve(result);
            }
          }
        ).end(fileBuffer);
      });
    } catch (error) {
      console.error('Error uploading to Cloudinary:', error);
      throw new Error('Failed to upload file to cloud storage');
    }
  }

  /**
   * Extract text content from uploaded document
   */
  async extractTextContent(fileBuffer, mimeType) {
    try {
      switch (mimeType) {
        case 'application/pdf':
          return await this.extractPDFText(fileBuffer);
        
        case 'application/msword':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await this.extractWordText(fileBuffer);
        
        case 'text/plain':
          return fileBuffer.toString('utf8');
        
        default:
          return null; // For image files or unsupported formats
      }
    } catch (error) {
      console.error('Error extracting text content:', error);
      return null;
    }
  }

  /**
   * Extract text from PDF file
   */
  async extractPDFText(pdfBuffer) {
    try {
      const data = await pdfParse(pdfBuffer);
      return {
        text: data.text,
        pages: data.numpages,
        metadata: data.metadata || {}
      };
    } catch (error) {
      console.error('Error parsing PDF:', error);
      throw new Error('Failed to extract text from PDF');
    }
  }

  /**
   * Extract text from Word document
   */
  async extractWordText(docBuffer) {
    try {
      const result = await mammoth.extractRawText({ buffer: docBuffer });
      return {
        text: result.value,
        warnings: result.messages
      };
    } catch (error) {
      console.error('Error parsing Word document:', error);
      throw new Error('Failed to extract text from Word document');
    }
  }

  /**
   * Analyze document content and extract metadata
   */
  async analyzeDocumentContent(textContent, filename) {
    if (!textContent || !textContent.text) {
      return {
        wordCount: 0,
        estimatedReadTime: 0,
        keywords: [],
        documentType: this.guessDocumentType(filename),
        language: 'unknown'
      };
    }

    const text = textContent.text.toLowerCase();
    const wordCount = text.split(/\s+/).length;
    const estimatedReadTime = Math.ceil(wordCount / 250); // 250 words per minute

    // Extract potential keywords (legal terms)
    const legalKeywords = this.extractLegalKeywords(text);
    
    // Guess document type from content and filename
    const documentType = this.guessDocumentTypeFromContent(text, filename);
    
    // Basic language detection (very simple)
    const language = this.detectLanguage(text);

    return {
      wordCount,
      estimatedReadTime,
      keywords: legalKeywords,
      documentType,
      language,
      hasSignature: text.includes('signature') || text.includes('signed'),
      hasDate: /\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/.test(text),
      pageCount: textContent.pages || 1
    };
  }

  /**
   * Extract legal keywords from text
   */
  extractLegalKeywords(text) {
    const legalTerms = [
      'plaintiff', 'defendant', 'petitioner', 'respondent',
      'contract', 'agreement', 'clause', 'breach',
      'evidence', 'testimony', 'witness', 'affidavit',
      'judgment', 'decree', 'order', 'injunction',
      'appeal', 'revision', 'writ', 'petition',
      'criminal', 'civil', 'constitutional', 'commercial',
      'property', 'divorce', 'custody', 'maintenance',
      'copyright', 'trademark', 'patent', 'intellectual property',
      'bail', 'custody', 'sentence', 'conviction',
      'arbitration', 'mediation', 'settlement', 'compensation'
    ];

    const foundKeywords = [];
    legalTerms.forEach(term => {
      if (text.includes(term)) {
        foundKeywords.push(term);
      }
    });

    return foundKeywords.slice(0, 10); // Return top 10 keywords
  }

  /**
   * Guess document type from content and filename
   */
  guessDocumentTypeFromContent(text, filename) {
    const filename_lower = filename.toLowerCase();
    
    // Check filename first
    if (filename_lower.includes('petition')) return 'petition';
    if (filename_lower.includes('contract') || filename_lower.includes('agreement')) return 'contract';
    if (filename_lower.includes('evidence')) return 'evidence';
    if (filename_lower.includes('judgment') || filename_lower.includes('order')) return 'court_order';
    if (filename_lower.includes('appeal')) return 'appeal';
    
    // Check content
    if (text.includes('petition') || text.includes('writ')) return 'petition';
    if (text.includes('contract') || text.includes('agreement')) return 'contract';
    if (text.includes('evidence') || text.includes('exhibit')) return 'evidence';
    if (text.includes('judgment') || text.includes('decree')) return 'judgment';
    if (text.includes('appeal') || text.includes('revision')) return 'appeal';
    if (text.includes('correspondence') || text.includes('letter')) return 'correspondence';
    
    return 'other';
  }

  /**
   * Simple document type guessing from filename
   */
  guessDocumentType(filename) {
    const filename_lower = filename.toLowerCase();
    
    if (filename_lower.includes('petition')) return 'petition';
    if (filename_lower.includes('contract') || filename_lower.includes('agreement')) return 'contract';
    if (filename_lower.includes('evidence')) return 'evidence';
    if (filename_lower.includes('judgment') || filename_lower.includes('order')) return 'court_order';
    if (filename_lower.includes('appeal')) return 'appeal';
    if (filename_lower.includes('correspondence') || filename_lower.includes('letter')) return 'correspondence';
    
    return 'other';
  }

  /**
   * Basic language detection
   */
  detectLanguage(text) {
    // Very basic language detection
    const hindiWords = ['और', 'का', 'की', 'के', 'में', 'से', 'पर', 'को', 'है', 'हैं'];
    const englishWords = ['the', 'and', 'or', 'of', 'in', 'to', 'for', 'with', 'by', 'from'];
    
    let hindiCount = 0;
    let englishCount = 0;
    
    hindiWords.forEach(word => {
      if (text.includes(word)) hindiCount++;
    });
    
    englishWords.forEach(word => {
      if (text.includes(word)) englishCount++;
    });
    
    if (hindiCount > englishCount) return 'hindi';
    if (englishCount > 0) return 'english';
    return 'unknown';
  }

  /**
   * Process uploaded file and return file information
   */
  async processUploadedFile(file, uploadedBy, caseId = null) {
    try {
      // Upload to Cloudinary
      const cloudinaryResult = await this.uploadToCloudinary(
        file.buffer,
        file.originalname,
        caseId ? `panchtatva/cases/${caseId}` : 'panchtatva/documents'
      );

      // Extract text content
      const textContent = await this.extractTextContent(file.buffer, file.mimetype);
      
      // Analyze document
      const analysis = await this.analyzeDocumentContent(textContent, file.originalname);

      // Create file record
      const fileRecord = {
        filename: cloudinaryResult.public_id,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        cloudinaryUrl: cloudinaryResult.secure_url,
        uploadedBy: uploadedBy,
        uploadDate: new Date(),
        documentType: analysis.documentType,
        metadata: {
          wordCount: analysis.wordCount,
          estimatedReadTime: analysis.estimatedReadTime,
          keywords: analysis.keywords,
          language: analysis.language,
          hasSignature: analysis.hasSignature,
          hasDate: analysis.hasDate,
          pageCount: analysis.pageCount
        },
        textContent: textContent ? textContent.text : null
      };

      return fileRecord;

    } catch (error) {
      console.error('Error processing uploaded file:', error);
      throw new Error(`Failed to process file: ${error.message}`);
    }
  }

  /**
   * Delete file from Cloudinary
   */
  async deleteFile(publicId) {
    try {
      const result = await cloudinary.uploader.destroy(publicId);
      return result;
    } catch (error) {
      console.error('Error deleting file from Cloudinary:', error);
      throw new Error('Failed to delete file from cloud storage');
    }
  }

  /**
   * Get file URL with optional transformations
   */
  getFileUrl(publicId, transformations = {}) {
    return cloudinary.url(publicId, transformations);
  }

  /**
   * Validate file before upload
   */
  validateFile(file) {
    const errors = [];

    // Check file size
    if (file.size > this.maxFileSize) {
      errors.push(`File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds limit of ${this.maxFileSize / 1024 / 1024}MB`);
    }

    // Check mime type
    if (!this.allowedMimeTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} not allowed`);
    }

    // Check filename
    if (!file.originalname || file.originalname.length > 255) {
      errors.push('Invalid filename');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get multer upload middleware
   */
  getUploadMiddleware() {
    return this.upload;
  }

  /**
   * Search documents by text content
   */
  async searchDocuments(query, caseId = null, limit = 20) {
    // This would typically use a search engine like Elasticsearch
    // For now, we'll implement basic text search in the Case model
    const Case = require('../models/Case');
    
    const searchCriteria = {
      'documents.textContent': { $regex: query, $options: 'i' }
    };
    
    if (caseId) {
      searchCriteria._id = caseId;
    }
    
    const cases = await Case.find(searchCriteria)
      .select('caseNumber title documents')
      .limit(limit);
    
    // Extract matching documents
    const matchingDocuments = [];
    cases.forEach(caseDoc => {
      caseDoc.documents.forEach(doc => {
        if (doc.textContent && doc.textContent.toLowerCase().includes(query.toLowerCase())) {
          matchingDocuments.push({
            caseId: caseDoc._id,
            caseNumber: caseDoc.caseNumber,
            document: doc
          });
        }
      });
    });
    
    return matchingDocuments;
  }
}

// Create and export singleton instance
const fileService = new FileService();
module.exports = fileService;
