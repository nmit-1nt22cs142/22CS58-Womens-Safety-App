const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  authorId: {
    type: String,
    required: true,
    // Note: We're using a simple string for now until the Auth module is built.
    // Eventually this will be a reference: ObjectIds -> ref: 'User'
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      // required: true, 
    },
    address: {
      type: String,
      required: true, // E.g., "Koramangala, Bangalore"
    }
  },
  description: {
    type: String,
    required: true,
  },
  harasserDetails: {
    type: String,
    // Optional description of the harasser
  },
  mediaUrl: {
    type: String,
    // Optional URL from Firebase Storage or Cloudinary
  },
  safetyRating: {
    type: Number,
    min: 1,
    max: 5
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Index for geolocation queries if we want to find "posts near me" later
postSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Post', postSchema);
