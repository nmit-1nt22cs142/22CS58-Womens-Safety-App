const express = require('express');
const router = express.Router();
const { createPost, getPosts } = require('../../controllers/community/postController');
const { upload } = require('../../config/cloudinary');

// Route: /api/community/posts
router.route('/posts')
  .get(getPosts)
  .post(upload.single('media'), createPost);

module.exports = router;
