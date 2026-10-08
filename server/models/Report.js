/**
 * Report Model
 * Stores anonymous user reports for moderation and auto-ban triggers.
 * Includes MongoDB Mongoose schema and an in-memory fallback layer.
 */

import mongoose from 'mongoose';

const reportSchema = new mongoose.Schema({
  reporterIpHash: {
    type: String,
    required: true,
    index: true
  },
  reportedIpHash: {
    type: String,
    required: true,
    index: true
  },
  reason: {
    type: String,
    enum: ['nudity', 'harassment', 'spam', 'other'],
    required: true
  },
  roomId: {
    type: String,
    default: ''
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 60 * 60 * 24 * 7 // Auto-expire reports after 7 days
  }
});

let MongooseReportModel = null;
try {
  MongooseReportModel = mongoose.model('Report', reportSchema);
} catch {
  // Model may already be compiled
  MongooseReportModel = mongoose.models.Report;
}

// In-memory fallback repository when MongoDB is not connected
const inMemoryReports = [];

export const Report = {
  /**
   * Saves a new report
   */
  async create({ reporterIpHash, reportedIpHash, reason, roomId }) {
    const reportDoc = {
      reporterIpHash,
      reportedIpHash,
      reason,
      roomId: roomId || '',
      createdAt: new Date()
    };

    if (mongoose.connection.readyState === 1 && MongooseReportModel) {
      try {
        return await MongooseReportModel.create(reportDoc);
      } catch (err) {
        console.warn('MongoDB write failed, saving to in-memory fallback:', err.message);
      }
    }

    inMemoryReports.push(reportDoc);
    return reportDoc;
  },

  /**
   * Counts recent reports for a reported IP hash within the last 24 hours
   */
  async countRecentForReported(reportedIpHash, windowMs = 24 * 60 * 60 * 1000) {
    const since = new Date(Date.now() - windowMs);

    if (mongoose.connection.readyState === 1 && MongooseReportModel) {
      try {
        return await MongooseReportModel.countDocuments({
          reportedIpHash,
          createdAt: { $gte: since }
        });
      } catch (err) {
        console.warn('MongoDB query failed, counting from in-memory fallback:', err.message);
      }
    }

    return inMemoryReports.filter(
      r => r.reportedIpHash === reportedIpHash && new Date(r.createdAt) >= since
    ).length;
  }
};

export default Report;
