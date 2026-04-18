const Post = require('../../models/community/Post');

// @desc    Create a new community post
// @route   POST /api/community/posts
// @access  Public (for now, will be Private once Auth is connected)
exports.createPost = async (req, res) => {
  try {
    const { authorId, authorName, address, longitude: lon, latitude: lat, description, harasserDetails, safetyRating } = req.body;
    let mediaUrl = null;

    if (req.file && req.file.path) {
        mediaUrl = req.file.path; // This is the Cloudinary URL
    }

    if (!authorId || !authorName || !address || !description) {
      return res.status(400).json({ message: 'Please provide authorId, authorName, address, and description.' });
    }

    const postFields = {
      authorId,
      authorName,
      description,
      address
    };

    // Only add a location object if we have valid coordinates
    // This prevents 2dsphere index errors in MongoDB
    if (lon && lat) {
      postFields.location = {
        type: 'Point',
        coordinates: [Number(lon), Number(lat)]
      };
    }

    if (harasserDetails) postFields.harasserDetails = harasserDetails;
    if (mediaUrl) postFields.mediaUrl = mediaUrl;
    if (safetyRating) postFields.safetyRating = Number(safetyRating);

    const post = new Post(postFields);
    await post.save();

    res.status(201).json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Error in createPost:', error);
    res.status(500).json({ success: false, message: error.message || 'Server Error' });
  }
};

// @desc    Get all community posts (latest first)
// @route   GET /api/community/posts
// @access  Public
exports.getPosts = async (req, res) => {
  try {
    const { authorId } = req.query;
    const query = {};
    if (authorId) {
      query.authorId = authorId;
    }
    const posts = await Post.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: posts.length,
      data: posts
    });
  } catch (error) {
    console.error('Error in getPosts:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};
