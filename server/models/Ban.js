/**
 * Ban Model
 * Stores active bans with hashed IP addresses.
 * Raw IP addresses are NEVER stored.
 */

import mongoose from 'mongoose';

const banSchema = new mongoose.Schema({
  ipHash: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  reason: {
    type: String,
    default: 'Accumulated multiple user reports'
  },
  reportCount: {
    type: Number,
    default: 3
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // TTL index removes expired bans automatically in Mongo
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

let MongooseBanModel = null;
try {
  MongooseBanModel = mongoose.model('Ban', banSchema);
} catch {
  MongooseBanModel = mongoose.models.Ban;
}

// In-memory fallback map for active bans
const inMemoryBans = new Map();

export const Ban = {
  /**
   * Creates or updates a ban for an IP hash
   */
  async createOrUpdate({ ipHash, reason, reportCount, durationMs }) {
    const expiresAt = new Date(Date.now() + durationMs);
    const banDoc = {
      ipHash,
      reason: reason || 'Multiple user reports',
      reportCount: reportCount || 3,
      expiresAt,
      createdAt: new Date()
    };

    if (mongoose.connection.readyState === 1 && MongooseBanModel) {
      try {
        return await MongooseBanModel.findOneAndUpdate(
          { ipHash },
          banDoc,
          { upsert: true, new: true }
        );
      } catch (err) {
        console.warn('MongoDB ban write failed, using in-memory store:', err.message);
      }
    }

    inMemoryBans.set(ipHash, banDoc);
    return banDoc;
  },

  /**
   * Checks if an IP hash is currently banned
   * @returns {Promise<{isBanned: boolean, ban?: object}>}
   */
  async isBanned(ipHash) {
    const now = new Date();

    if (mongoose.connection.readyState === 1 && MongooseBanModel) {
      try {
        const found = await MongooseBanModel.findOne({
          ipHash,
          expiresAt: { $gt: now }
        });
        if (found) {
          return { isBanned: true, ban: found };
        }
        return { isBanned: false };
      } catch (err) {
        console.warn('MongoDB ban lookup failed, checking in-memory store:', err.message);
      }
    }

    const memBan = inMemoryBans.get(ipHash);
    if (memBan) {
      if (new Date(memBan.expiresAt) > now) {
        return { isBanned: true, ban: memBan };
      } else {
        inMemoryBans.delete(ipHash);
      }
    }

    return { isBanned: false };
  }
};

export default Ban;
