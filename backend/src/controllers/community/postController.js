const Post = require('../../models/community/Post');

// @desc    Create a new community post
// @route   POST /api/community/posts
// @access  Public (for now, will be Private once Auth is connected)
exports.createPost = async (req, res) => {
  try {
    const { authorId, address, longitude, latitude, description, harasserDetails, safetyRating } = req.body;
    let mediaUrl = null;

    if (req.file && req.file.path) {
        mediaUrl = req.file.path; // This is the Cloudinary URL
    }

    if (!authorId || !address || !description) {
      return res.status(400).json({ message: 'Please provide authorId, address, and description.' });
    }

    const postFields = {
      authorId,
      description,
      location: {
        type: 'Point',
        address,
      }
    };

    if (longitude && latitude) {
      postFields.location.coordinates = [longitude, latitude];
    }
    if (harasserDetails) postFields.harasserDetails = harasserDetails;
    if (mediaUrl) postFields.mediaUrl = mediaUrl;
    if (safetyRating) postFields.safetyRating = safetyRating;

    const post = new Post(postFields);
    await post.save();

    res.status(201).json({
      success: true,
      data: post
    });
  } catch (error) {
    console.error('Error in createPost:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};

// @desc    Get all community posts (latest first)
// @route   GET /api/community/posts
// @access  Public
exports.getPosts = async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });

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
